import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MOCK_EXAMS } from '@/data/mockExams';
import { JLPT_N5_OFFICIAL_2018 } from '@/data/jlptN5Official2018';
import { JLPT_N5_OFFICIAL_2012 } from '@/data/jlptN5Official2012';
import { JLPT_N4_OFFICIAL_2018 } from '@/data/jlptN4Official2018';
import { JLPT_N4_OFFICIAL_2012 } from '@/data/jlptN4Official2012';
import { JLPT_N3_OFFICIAL_2018 } from '@/data/jlptN3Official2018';
import { JLPT_N3_OFFICIAL_2012 } from '@/data/jlptN3Official2012';
import { JLPT_N2_OFFICIAL_2018 } from '@/data/jlptN2Official2018';
import { JLPT_N2_OFFICIAL_2012 } from '@/data/jlptN2Official2012';
import { JLPT_N1_OFFICIAL_2018 } from '@/data/jlptN1Official2018';
import { JLPT_N1_OFFICIAL_2012 } from '@/data/jlptN1Official2012';
import { computeExamResult } from '@/lib/examScoring';
import {
  buildSimulatorStages,
  createDefaultSessionConfig,
  getExamModularCatalog,
} from '@/lib/jlptTokens';
import type { JLPTExam, JLPTLevel, JLPTQuestion } from '@/types/jlpt';

const OFFICIAL_EXAMS: JLPTExam[] = [
  JLPT_N5_OFFICIAL_2018,
  JLPT_N5_OFFICIAL_2012,
  JLPT_N4_OFFICIAL_2018,
  JLPT_N4_OFFICIAL_2012,
  JLPT_N3_OFFICIAL_2018,
  JLPT_N3_OFFICIAL_2012,
  JLPT_N2_OFFICIAL_2018,
  JLPT_N2_OFFICIAL_2012,
  JLPT_N1_OFFICIAL_2018,
  JLPT_N1_OFFICIAL_2012,
];

const EXPECTED_SPECS: Array<{
  exam: JLPTExam;
  label: string;
  level: JLPTLevel;
  examNumber: number;
  totalQuestions: number;
  stages: number;
  vocab: number;
  grammar: number;
  reading: number;
  listening: number;
  starCount: number;
  passTotal180: number;
}> = [
  {
    exam: JLPT_N5_OFFICIAL_2018,
    label: 'N5 #1',
    level: 'N5',
    examNumber: 1,
    totalQuestions: 91,
    stages: 3,
    vocab: 35,
    grammar: 26,
    reading: 6,
    listening: 24,
    starCount: 5,
    passTotal180: 80,
  },
  {
    exam: JLPT_N5_OFFICIAL_2012,
    label: 'N5 #2',
    level: 'N5',
    examNumber: 2,
    totalQuestions: 89,
    stages: 3,
    vocab: 33,
    grammar: 26,
    reading: 6,
    listening: 24,
    starCount: 5,
    passTotal180: 80,
  },
  {
    exam: JLPT_N4_OFFICIAL_2018,
    label: 'N4 #1',
    level: 'N4',
    examNumber: 1,
    totalQuestions: 98,
    stages: 3,
    vocab: 35,
    grammar: 25,
    reading: 10,
    listening: 28,
    starCount: 5,
    passTotal180: 90,
  },
  {
    exam: JLPT_N4_OFFICIAL_2012,
    label: 'N4 #2',
    level: 'N4',
    examNumber: 2,
    totalQuestions: 97,
    stages: 3,
    vocab: 34,
    grammar: 25,
    reading: 10,
    listening: 28,
    starCount: 5,
    passTotal180: 90,
  },
  {
    exam: JLPT_N3_OFFICIAL_2018,
    label: 'N3 #1',
    level: 'N3',
    examNumber: 1,
    totalQuestions: 102,
    stages: 3,
    vocab: 35,
    grammar: 23,
    reading: 16,
    listening: 28,
    starCount: 5,
    passTotal180: 95,
  },
  {
    exam: JLPT_N3_OFFICIAL_2012,
    label: 'N3 #2',
    level: 'N3',
    examNumber: 2,
    totalQuestions: 99,
    stages: 3,
    vocab: 33,
    grammar: 23,
    reading: 16,
    listening: 27,
    starCount: 5,
    passTotal180: 95,
  },
  {
    exam: JLPT_N2_OFFICIAL_2018,
    label: 'N2 #1',
    level: 'N2',
    examNumber: 1,
    totalQuestions: 107,
    stages: 2,
    vocab: 32,
    grammar: 22,
    reading: 21,
    listening: 32,
    starCount: 5,
    passTotal180: 90,
  },
  {
    exam: JLPT_N2_OFFICIAL_2012,
    label: 'N2 #2',
    level: 'N2',
    examNumber: 2,
    totalQuestions: 106,
    stages: 2,
    vocab: 32,
    grammar: 22,
    reading: 21,
    listening: 31,
    starCount: 5,
    passTotal180: 90,
  },
  {
    exam: JLPT_N1_OFFICIAL_2018,
    label: 'N1 #1',
    level: 'N1',
    examNumber: 1,
    totalQuestions: 107,
    stages: 2,
    vocab: 25,
    grammar: 20,
    reading: 25,
    listening: 37,
    starCount: 5,
    passTotal180: 100,
  },
  {
    exam: JLPT_N1_OFFICIAL_2012,
    label: 'N1 #2',
    level: 'N1',
    examNumber: 2,
    totalQuestions: 105,
    stages: 2,
    vocab: 25,
    grammar: 20,
    reading: 24,
    listening: 36,
    starCount: 5,
    passTotal180: 100,
  },
];

// 2018 (#1) answer keys
const N5_2018_WRITTEN_KEYS = [
  '4','1','3','1','3','4','1','4','2','3','2','2',
  '4','3','2','1','1','4','3','2',
  '4','4','3','1','2','1','2','3','4','1',
  '2','1','3','2','4',
  '2','4','1','4','2','3','1','3','1','2','4','3','2','4','3','1',
  '4','2','3','2','1',
  '2','1','4','3','3',
  '3','2','1',
  '2','3',
  '4',
];
const N5_2018_LISTENING_KEYS = [
  '3','1','4','2','1','4','3',
  '4','1','3','1','2','2',
  '3','3','1','2','2',
  '1','3','3','2','1','2',
];

const N4_2018_WRITTEN_KEYS = [
  '3','4','1','2','4','3','4','2','1',
  '2','3','4','1','3','4',
  '1','2','2','3','2','1','4','3','4','1',
  '2','2','4','1','3',
  '3','1','3','2','4',
  '3','4','2','1','4','1','3','4','2','4','3','2','3','1','2',
  '1','2','3','1','4',
  '3','1','4','2','3',
  '4','2','3','4',
  '3','1','2','3',
  '4','1',
];
const N4_2018_LISTENING_KEYS = [
  '1','3','2','4','3','3','3','1',
  '1','2','4','2','2','4','3',
  '2','2','1','3','2',
  '1','3','3','1','2','3','2','1',
];

const N2_2018_WRITTEN_KEYS = [
  '2','4','2','3','1',
  '2','3','2','1','4',
  '1','3','3','4','1',
  '2','1','3','2','3','1','4',
  '1','4','3','4','2',
  '3','4','1','4','2',
  '1','1','2','3','1','4','2','2','3','4','3','4',
  '3','4','1','2','3',
  '2','2','4','1','3',
  '2','3','4','2','1',
  '1','3','1','4','1','2','2','3','1',
  '4','3',
  '2','4','3',
  '4','3',
];
const N2_2018_LISTENING_KEYS = [
  '1','2','2','4','3',
  '3','2','1','2','4','1',
  '2','1','3','1','2',
  '2','3','2','1','3','1','2','2','2','1','1','3',
  '3','1','3','1',
];

const N1_2018_WRITTEN_KEYS = [
  '1','2','3','1','4','2',
  '2','1','3','1','2','4','4',
  '4','1','4','3','2','3',
  '1','4','3','2','1','3',
  '4','2','3','1','3','3','4','2','1','4',
  '2','1','4','3','2',
  '2','1','1','3','4',
  '3','2','3','1',
  '3','4','2','2','1','4','2','3','3',
  '4','2','1','2',
  '3','3',
  '2','1','4','4',
  '1','4',
];
const N1_2018_LISTENING_KEYS = [
  '1','4','2','1','2','2',
  '2','4','4','3','4','1','2',
  '2','4','3','3','1','2',
  '2','3','2','3','1','3','3','2','1','2','3','1','2','3',
  '2','2','1','2',
];

// 2012 (#2) answer keys
const N5_2012_WRITTEN_KEYS = [
  '2','4','1','2','2','3','4','2','2','3',
  '1','2','3','4','4','1','3','1',
  '4','3','1','1','3','2','1','4','2','4',
  '3','1','2','3','4',
  '2','3','2','4','3','2','3','1','3','3','1','1','4','2','4','1',
  '4','1','4','2','2',
  '4','2','4','3','1',
  '2','3','4',
  '4','1',
  '2',
];
const N5_2012_LISTENING_KEYS = [
  '2','2','3','3','1','4','4',
  '4','3','2','4','1','3',
  '1','3','2','3','2',
  '1','1','2','3','3','1',
];

const N4_2012_WRITTEN_KEYS = [
  '1','1','4','2','2','3','1','2','4',
  '1','4','3','4','4','1',
  '4','3','2','2','4','3','1','2','3',
  '3','2','1','3','2',
  '4','3','4','1','2',
  '3','4','1','2','4','2','3','1','2','4','1','1','3','4','2',
  '3','2','4','3','3',
  '2','3','2','1','4',
  '4','3','2','3',
  '2','4','4','1',
  '3','2',
];
const N4_2012_LISTENING_KEYS = [
  '1','4','3','4','3','2','2','1',
  '4','2','3','3','1','2','3',
  '1','2','1','2','1',
  '2','3','2','1','2','3','3','1',
];

const N3_2012_WRITTEN_KEYS = [
  '3','2','2','3','1','4','2','4',
  '3','4','1','2','2','3',
  '2','4','3','3','1','2','3','2','1',
  '1','4','3','2','3',
  '4','1','4','1','1',
  '2','2','4','3','4','1','2','3','4','4','2','3','1',
  '2','4','2','1','3',
  '3','4','3','2','1',
  '3','3','3','4',
  '3','4','1','3','2','1',
  '1','4','4','2',
  '2','3',
];
const N3_2012_LISTENING_KEYS = [
  '2','4','1','2','3','2',
  '3','1','4','2','4','4',
  '2','2','4',
  '2','3','2','1',
  '3','1','3','2','2','1','3','2',
];

const N2_2012_WRITTEN_KEYS = [
  '2','3','1','4','3',
  '3','2','1','4','2',
  '1','2','1','4','2',
  '4','4','1','2','1','1','2',
  '3','4','1','3','3',
  '4','3','3','2','4',
  '3','2','4','4','1','3','3','3','1','2','2','1',
  '2','1','4','3','3',
  '2','4','1','3','1',
  '3','2','2','1','2',
  '3','4','4','3','1','4','3','2','1',
  '1','3',
  '2','4','4',
  '4','1',
];
const N2_2012_LISTENING_KEYS = [
  '2','3','3','2','1',
  '2','3','4','2','3','2',
  '1','4','3','1','2',
  '3','1','3','1','1','3','3','2','3','1','2',
  '3','4','1','3',
];

const N1_2012_WRITTEN_KEYS = [
  '3','1','2','2','3','4',
  '3','2','1','4','3','2','2',
  '4','1','4','1','4','2',
  '1','3','4','1','2','3',
  '4','1','2','4','2','3','2','4','4','1',
  '1','1','4','2','3',
  '3','2','4','1','1',
  '2','4','3',
  '4','1','3','2','1','2','3','3','4',
  '1','1','2','2',
  '3','2',
  '4','1','4','1',
  '4','1',
];
const N1_2012_LISTENING_KEYS = [
  '3','4','4','1','3','3',
  '4','2','3','3','1','3','2',
  '2','1','3','2','2','3',
  '3','2','2','3','2','3','1','3','1','2','2','1','3',
  '2','2','1','4',
];

function isThreeChoiceListening(q: JLPTQuestion): boolean {
  if (q.section !== 'choukai') return false;
  return q.archetype === 'listening_expression' || q.archetype === 'listening_response';
}

describe('All Official JLPT Exams (Examen #1 & Examen #2 across N5–N1)', () => {
  it('registers all 10 official simulators in MOCK_EXAMS in N5→N1 progression', () => {
    expect(MOCK_EXAMS.map((e) => e.id)).toEqual([
      'exam-n5-official-2018',
      'exam-n5-official-2012',
      'exam-n4-official-2018',
      'exam-n4-official-2012',
      'exam-n3-official-2018',
      'exam-n3-official-2012',
      'exam-n2-official-2018',
      'exam-n2-official-2012',
      'exam-n1-official-2018',
      'exam-n1-official-2012',
    ]);
  });

  it.each(EXPECTED_SPECS)(
    '$label dataset has anonymized metadata, complete domain counts, linked passages, valid ★ items, and real media files',
    (spec) => {
      const { exam } = spec;
      expect(exam.examNumber).toBe(spec.examNumber);
      expect(exam.title).toBe(`JLPT ${spec.level} — Examen #${spec.examNumber}`);
      expect(exam.title).not.toMatch(/2018|2012/);
      expect(exam.description).not.toMatch(/2018|2012/);
      expect(exam.questions).toHaveLength(spec.totalQuestions);
      expect(exam.stages).toHaveLength(spec.stages);
      expect(exam.scoringScale).toBe('JLPT_180');

      const byDomain = {
        vocab: exam.questions.filter((q) => q.scoringDomain === 'vocab'),
        grammar: exam.questions.filter((q) => q.scoringDomain === 'grammar'),
        reading: exam.questions.filter((q) => q.scoringDomain === 'reading'),
        listening: exam.questions.filter((q) => q.scoringDomain === 'listening'),
      };

      expect(byDomain.vocab).toHaveLength(spec.vocab);
      expect(byDomain.grammar).toHaveLength(spec.grammar);
      expect(byDomain.reading).toHaveLength(spec.reading);
      expect(byDomain.listening).toHaveLength(spec.listening);

      const passageIds = new Set((exam.passages ?? []).map((p) => p.id));
      const publicRoot = path.join(process.cwd(), 'public');
      let starCount = 0;

      for (const p of exam.passages ?? []) {
        if (p.imageUrl) {
          const imgPath = path.join(publicRoot, p.imageUrl.replace(/^\//, ''));
          expect(fs.existsSync(imgPath)).toBe(true);
        }
      }

      for (const q of exam.questions) {
        const expectedOpts = isThreeChoiceListening(q) ? 3 : 4;
        expect(q.options).toHaveLength(expectedOpts);
        expect(q.options.some((o) => o.id === q.correctOptionId)).toBe(true);
        expect(q.explanationFr.trim().length).toBeGreaterThan(0);

        if (q.passageId) {
          expect(passageIds.has(q.passageId)).toBe(true);
        }

        if (q.archetype === 'grammar_star') {
          starCount += 1;
          expect(q.starCorrectOrder).toHaveLength(4);
          const starTok = q.promptTokens?.find(
            (t) => t.starSlotIndex !== undefined && t.text === '★'
          );
          expect(starTok?.starSlotIndex).toBeDefined();
          expect(q.starCorrectOrder?.[starTok!.starSlotIndex!]).toBe(q.correctOptionId);
        }

        if (q.imageUrl) {
          const imgPath = path.join(publicRoot, q.imageUrl.replace(/^\//, ''));
          expect(fs.existsSync(imgPath)).toBe(true);
        }
        if (q.audioUrl) {
          const mp3Path = path.join(publicRoot, q.audioUrl.replace(/^\//, ''));
          expect(fs.existsSync(mp3Path)).toBe(true);
        }
      }

      expect(starCount).toBe(spec.starCount);

      const listeningStage = exam.stages?.find((s) => s.id === 'stage-listening');
      for (const track of listeningStage?.audioTracks ?? []) {
        const mp3Path = path.join(publicRoot, track.trackUrl.replace(/^\//, ''));
        expect(fs.existsSync(mp3Path)).toBe(true);
        if (track.exampleImageUrl) {
          const imgPath = path.join(publicRoot, track.exampleImageUrl.replace(/^\//, ''));
          expect(fs.existsSync(imgPath)).toBe(true);
        }
      }
    }
  );

  it('matches official answer keys verbatim across Examen #1 and Examen #2 datasets', () => {
    const suites = [
      { exam: JLPT_N5_OFFICIAL_2018, written: N5_2018_WRITTEN_KEYS, listening: N5_2018_LISTENING_KEYS },
      { exam: JLPT_N4_OFFICIAL_2018, written: N4_2018_WRITTEN_KEYS, listening: N4_2018_LISTENING_KEYS },
      { exam: JLPT_N2_OFFICIAL_2018, written: N2_2018_WRITTEN_KEYS, listening: N2_2018_LISTENING_KEYS },
      { exam: JLPT_N1_OFFICIAL_2018, written: N1_2018_WRITTEN_KEYS, listening: N1_2018_LISTENING_KEYS },
      { exam: JLPT_N5_OFFICIAL_2012, written: N5_2012_WRITTEN_KEYS, listening: N5_2012_LISTENING_KEYS },
      { exam: JLPT_N4_OFFICIAL_2012, written: N4_2012_WRITTEN_KEYS, listening: N4_2012_LISTENING_KEYS },
      { exam: JLPT_N3_OFFICIAL_2012, written: N3_2012_WRITTEN_KEYS, listening: N3_2012_LISTENING_KEYS },
      { exam: JLPT_N2_OFFICIAL_2012, written: N2_2012_WRITTEN_KEYS, listening: N2_2012_LISTENING_KEYS },
      { exam: JLPT_N1_OFFICIAL_2012, written: N1_2012_WRITTEN_KEYS, listening: N1_2012_LISTENING_KEYS },
    ];

    for (const s of suites) {
      const writtenQs = s.exam.questions.filter((q) => q.section !== 'choukai');
      const listeningQs = s.exam.questions.filter((q) => q.section === 'choukai');
      expect(writtenQs.map((q) => q.correctOptionId)).toEqual(s.written);
      expect(listeningQs.map((q) => q.correctOptionId)).toEqual(s.listening);
    }
  });

  it('enforces level-specific /180 thresholds and builds 2-stage & 3-stage simulators cleanly for all 10 exams', () => {
    for (const spec of EXPECTED_SPECS) {
      const perfectAnswers = Object.fromEntries(
        spec.exam.questions.map((q) => [q.id, q.correctOptionId])
      );
      const perfect = computeExamResult({
        level: spec.level,
        mode: 'FULL_MOCK',
        scoringScale: 'JLPT_180',
        questions: spec.exam.questions,
        answers: perfectAnswers,
        timeSpentSeconds: 3600,
      });
      expect(perfect.scoreTotal).toBe(180);
      expect(perfect.passed).toBe(true);

      const strictStages = buildSimulatorStages(
        spec.exam,
        createDefaultSessionConfig('OFFICIAL_STRICT', spec.exam)
      );
      expect(strictStages).toHaveLength(spec.stages);

      const customStages = buildSimulatorStages(
        spec.exam,
        createDefaultSessionConfig('CUSTOM_CONDITIONS', spec.exam)
      );
      expect(customStages).toHaveLength(spec.stages);

      const catalog = getExamModularCatalog(spec.exam);
      expect(catalog.length).toBeGreaterThanOrEqual(8);
      const modularStages = buildSimulatorStages(
        spec.exam,
        createDefaultSessionConfig('MODULAR_SELECTION', spec.exam)
      );
      expect(modularStages.length).toBeGreaterThan(0);
    }

    const n5HalfAnswers = Object.fromEntries(
      JLPT_N5_OFFICIAL_2018.questions.map((q, i) => [
        q.id,
        i % 2 === 0 ? q.correctOptionId : 'invalid',
      ])
    );
    const n5Half = computeExamResult({
      level: 'N5',
      mode: 'FULL_MOCK',
      scoringScale: 'JLPT_180',
      questions: JLPT_N5_OFFICIAL_2018.questions,
      answers: n5HalfAnswers,
      timeSpentSeconds: 3600,
    });
    expect(n5Half.scoreTotal).toBe(90);
    expect(n5Half.passed).toBe(true);

    const n1HalfAnswers = Object.fromEntries(
      JLPT_N1_OFFICIAL_2018.questions.map((q, i) => [
        q.id,
        i % 2 === 0 ? q.correctOptionId : 'invalid',
      ])
    );
    const n1Half = computeExamResult({
      level: 'N1',
      mode: 'FULL_MOCK',
      scoringScale: 'JLPT_180',
      questions: JLPT_N1_OFFICIAL_2018.questions,
      answers: n1HalfAnswers,
      timeSpentSeconds: 3600,
    });
    expect(n1Half.scoreTotal).toBeLessThan(100);
    expect(n1Half.passed).toBe(false);
  });

  it('keeps official datasets completely non-empty with globally unique passage and question IDs', () => {
    const allQuestionIds = new Set<string>();
    const allPassageIds = new Set<string>();

    for (const exam of OFFICIAL_EXAMS) {
      expect(exam.id).toMatch(/^exam-n[1-5]-official-(?:2018|2012)$/);
      for (const q of exam.questions) {
        expect(allQuestionIds.has(q.id)).toBe(false);
        allQuestionIds.add(q.id);
      }
      for (const p of exam.passages ?? []) {
        expect(allPassageIds.has(p.id)).toBe(false);
        allPassageIds.add(p.id);
      }
    }
  });
});
