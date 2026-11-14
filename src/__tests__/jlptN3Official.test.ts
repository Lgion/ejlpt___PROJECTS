import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { JLPT_N3_OFFICIAL_2018 } from '@/data/jlptN3Official2018';
import { computeExamResult } from '@/lib/examScoring';
import { buildSimulatorStages, createDefaultSessionConfig, tk } from '@/lib/jlptTokens';

const EXPECTED_VOCAB_ANSWERS = [
  '4', '2', '1', '3', '2', '4', '3', '1', // 問題1 (1-8)
  '4', '3', '3', '2', '1', '4',           // 問題2 (9-14)
  '2', '4', '1', '3', '1', '3', '2', '4', '4', '1', '2', // 問題3 (15-25)
  '4', '1', '3', '1', '2',                // 問題4 (26-30)
  '3', '2', '2', '1', '3',                // 問題5 (31-35)
];

const EXPECTED_GRAMMAR_READING_ANSWERS = [
  '2', '4', '3', '1', '4', '2', '3', '2', '3', '1', '2', '4', '1', // 文法 問題1 (1-13)
  '2', '4', '2', '1', '3',                                         // 文法 問題2 ★ (14-18)
  '3', '4', '1', '3', '2',                                         // 文法 問題3 (19-23)
  '3', '2', '4', '1',                                              // 読解 問題4 (24-27)
  '2', '3', '4', '3', '4', '1',                                    // 読解 問題5 (28-33)
  '4', '4', '1', '3',                                              // 読解 問題6 (34-37)
  '2', '2',                                                        // 読解 問題7 (38-39)
];

const EXPECTED_LISTENING_ANSWERS = [
  '2', '3', '1', '2', '1', '2',           // 聴解 問題1 (1-6)
  '2', '4', '1', '1', '3', '4',           // 聴解 問題2 (1-6)
  '3', '4', '2',                          // 聴解 問題3 (1-3)
  '1', '2', '3', '3',                     // 聴解 問題4 (1-4)
  '1', '3', '2', '1', '1', '3', '2', '1', '2', // 聴解 問題5 (1-9)
];

describe('JLPT_N3_OFFICIAL_2018 dataset integrity', () => {
  it('contains all 102 questions with accurate domain distribution', () => {
    const qs = JLPT_N3_OFFICIAL_2018.questions;
    expect(qs).toHaveLength(102);

    const vocab = qs.filter((q) => q.scoringDomain === 'vocab');
    const grammar = qs.filter((q) => q.scoringDomain === 'grammar');
    const reading = qs.filter((q) => q.scoringDomain === 'reading');
    const listening = qs.filter((q) => q.scoringDomain === 'listening');

    expect(vocab).toHaveLength(35);
    expect(grammar).toHaveLength(23);
    expect(reading).toHaveLength(16);
    expect(listening).toHaveLength(28);
  });

  it('matches the official N3answer.pdf key on every single question', () => {
    const qs = JLPT_N3_OFFICIAL_2018.questions;
    const vocab = qs.filter((q) => q.scoringDomain === 'vocab');
    const grammarAndReading = qs.filter(
      (q) => q.scoringDomain === 'grammar' || q.scoringDomain === 'reading'
    );
    const listening = qs.filter((q) => q.scoringDomain === 'listening');

    expect(vocab.map((q) => q.correctOptionId)).toEqual(EXPECTED_VOCAB_ANSWERS);
    expect(grammarAndReading.map((q) => q.correctOptionId)).toEqual(EXPECTED_GRAMMAR_READING_ANSWERS);
    expect(listening.map((q) => q.correctOptionId)).toEqual(EXPECTED_LISTENING_ANSWERS);
  });

  it('validates ★ ordering consistency and option counts (3 for 問題4/5 listening, 4 otherwise)', () => {
    for (const q of JLPT_N3_OFFICIAL_2018.questions) {
      if (q.scoringDomain === 'listening' && (q.mondaiNumber === 4 || q.mondaiNumber === 5)) {
        expect(q.options).toHaveLength(3);
      } else {
        expect(q.options).toHaveLength(4);
      }

      if (q.archetype === 'grammar_star') {
        expect(q.starCorrectOrder).toHaveLength(4);
        const starToken = q.promptTokens?.find((t) => t.text === '★' && typeof t.starSlotIndex === 'number');
        expect(starToken).toBeDefined();
        expect(q.starCorrectOrder![starToken!.starSlotIndex!]).toBe(q.correctOptionId);
      }
    }
  });

  it('links all passage references, images, and MP3 audio segments to existing files', () => {
    const publicRoot = path.resolve(process.cwd(), 'public');
    const passageIds = new Set((JLPT_N3_OFFICIAL_2018.passages ?? []).map((p) => p.id));

    for (const q of JLPT_N3_OFFICIAL_2018.questions) {
      if (q.passageId) {
        expect(passageIds.has(q.passageId)).toBe(true);
      }
      if (q.imageUrl) {
        const assetPath = path.join(publicRoot, q.imageUrl.replace(/^\//, ''));
        expect(fs.existsSync(assetPath)).toBe(true);
      }
      if (q.audioSegment) {
        const mp3Path = path.join(publicRoot, q.audioSegment.trackUrl.replace(/^\//, ''));
        expect(fs.existsSync(mp3Path)).toBe(true);
        expect(q.audioSegment.startSec).toBeLessThan(q.audioSegment.endSec);
      }
    }

    const listeningStage = JLPT_N3_OFFICIAL_2018.stages?.find((s) => s.id === 'stage-listening');
    expect(listeningStage?.audioTracks).toHaveLength(5);
    for (const track of listeningStage?.audioTracks ?? []) {
      const mp3Path = path.join(publicRoot, track.trackUrl.replace(/^\//, ''));
      expect(fs.existsSync(mp3Path)).toBe(true);
      if (track.exampleImageUrl) {
        const imgPath = path.join(publicRoot, track.exampleImageUrl.replace(/^\//, ''));
        expect(fs.existsSync(imgPath)).toBe(true);
      }
    }
  });

  it('scores 180/180 on official key and parses rich tokens accurately', () => {
    const answers = Object.fromEntries(
      JLPT_N3_OFFICIAL_2018.questions.map((q) => [q.id, q.correctOptionId])
    );
    const perfect = computeExamResult({
      level: 'N3',
      mode: 'FULL_MOCK',
      scoringScale: 'JLPT_180',
      questions: JLPT_N3_OFFICIAL_2018.questions,
      answers,
      timeSpentSeconds: 7000,
    });
    expect(perfect.scoreTotal).toBe(180);
    expect(perfect.passed).toBe(true);

    const parsed = tk('会場には{大勢|おおぜい}の<u>観客</u>が<b:19/><s:2*/>');
    expect(parsed).toEqual([
      { text: '会場には' },
      { text: '大勢', reading: 'おおぜい' },
      { text: 'の' },
      { text: '観客', underline: true },
      { text: 'が' },
      { text: '19', isBlank: true, blankNumber: 19 },
      { text: '★', starSlotIndex: 2 },
    ]);
  });

  it('builds simulator stages accurately across Strict, Custom, and Modular presets', () => {
    const strictStages = buildSimulatorStages(
      JLPT_N3_OFFICIAL_2018,
      createDefaultSessionConfig('OFFICIAL_STRICT')
    );
    expect(strictStages).toHaveLength(3);
    expect(strictStages.map((s) => s.questions.length)).toEqual([35, 39, 28]);
    expect(strictStages.map((s) => s.effectiveMinutes)).toEqual([30, 70, 44]);

    const customStages = buildSimulatorStages(JLPT_N3_OFFICIAL_2018, {
      ...createDefaultSessionConfig('CUSTOM_CONDITIONS'),
      timerMultiplier: 1.5,
      selectedStages: ['stage-vocab', 'stage-listening'],
    });
    expect(customStages).toHaveLength(2);
    expect(customStages.map((s) => s.effectiveMinutes)).toEqual([45, 66]);
    expect(customStages[1].audioTracks).toHaveLength(5);

    const modularStages = buildSimulatorStages(JLPT_N3_OFFICIAL_2018, {
      ...createDefaultSessionConfig('MODULAR_SELECTION'),
      timerMultiplier: 0,
      selectedModules: ['vocab_m1', 'reading_m7', 'listening_m4'],
    });
    expect(modularStages).toHaveLength(2);
    expect(modularStages[0].isListening).toBe(false);
    expect(modularStages[0].questions).toHaveLength(10); // 8 + 2
    expect(modularStages[0].durationSeconds).toBe(0);
    expect(modularStages[1].isListening).toBe(true);
    expect(modularStages[1].questions).toHaveLength(4);
    expect(modularStages[1].audioTracks.map((t) => t.mondaiNumber)).toEqual([4]);
  });
});
