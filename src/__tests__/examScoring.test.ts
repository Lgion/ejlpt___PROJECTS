import { describe, expect, it } from 'vitest';
import { computeExamResult, POINTS_PER_QUESTION } from '@/lib/examScoring';
import type { JLPTQuestion } from '@/types/jlpt';

function makeQuestions(): JLPTQuestion[] {
  const make = (id: string, section: JLPTQuestion['section'], correctOptionId = '1'): JLPTQuestion => ({
    id,
    section,
    subCategory: 'Test',
    prompt: `Question ${id}`,
    options: [
      { id: '1', label: 'A' },
      { id: '2', label: 'B' },
    ],
    correctOptionId,
    explanationFr: 'Explication',
  });

  return [
    make('m1', 'moji_go'),
    make('m2', 'moji_go'),
    make('m3', 'moji_go'),
    make('m4', 'moji_go'),
    make('b1', 'bunpou_dokkai'),
    make('b2', 'bunpou_dokkai'),
    make('b3', 'bunpou_dokkai'),
    make('b4', 'bunpou_dokkai'),
    make('c1', 'choukai'),
    make('c2', 'choukai'),
    make('c3', 'choukai'),
    make('c4', 'choukai'),
  ];
}

describe('computeExamResult', () => {
  it('passes when total >= 50% and every section >= 31%', () => {
    const questions = makeQuestions();
    const answers = {
      m1: '1',
      m2: '1', // 2/4 = 50%
      b1: '1',
      b2: '1', // 2/4 = 50%
      c1: '1',
      c2: '1', // 2/4 = 50%
    };

    const res = computeExamResult({
      level: 'N5',
      mode: 'FULL_MOCK',
      questions,
      answers,
      timeSpentSeconds: 320,
    });

    expect(res.scoreTotal).toBe(6 * POINTS_PER_QUESTION);
    expect(res.maxScoreTotal).toBe(12 * POINTS_PER_QUESTION);
    expect(res.passedMojiGo).toBe(true);
    expect(res.passedBunpouDokkai).toBe(true);
    expect(res.passedChoukai).toBe(true);
    expect(res.passed).toBe(true);
  });

  it('fails due to sectional cutoff (< 31%) even when overall score >= 50%', () => {
    const questions = makeQuestions();
    // 4/4 moji_go, 4/4 bunpou_dokkai, 1/4 choukai (25% < 31%) -> total 9/12 (75% >= 50%)
    const answers = {
      m1: '1',
      m2: '1',
      m3: '1',
      m4: '1',
      b1: '1',
      b2: '1',
      b3: '1',
      b4: '1',
      c1: '1',
    };

    const res = computeExamResult({
      level: 'N4',
      mode: 'FULL_MOCK',
      questions,
      answers,
      timeSpentSeconds: 400,
    });

    expect(res.scoreTotal).toBe(9 * POINTS_PER_QUESTION);
    expect(res.passedChoukai).toBe(false);
    expect(res.passed).toBe(false);
  });

  it('fails when overall score is < 50% even if empty sections are trivially passed', () => {
    const questions = makeQuestions().slice(0, 4); // only moji_go
    const answers = { m1: '1' }; // 1/4 = 25%

    const res = computeExamResult({
      level: 'N5',
      mode: 'SECTION_PRACTICE',
      questions,
      answers,
      timeSpentSeconds: -10, // clamped to 0
    });

    expect(res.timeSpentSeconds).toBe(0);
    expect(res.passedMojiGo).toBe(false);
    expect(res.passed).toBe(false);
  });

  it('never passes an empty question set', () => {
    const res = computeExamResult({
      level: 'N3',
      mode: 'FULL_MOCK',
      questions: [],
      answers: {},
      timeSpentSeconds: 0,
    });

    expect(res.maxScoreTotal).toBe(0);
    expect(res.passed).toBe(false);
  });

  describe('JLPT_180 official N3 scaled scoring', () => {
    const makeDomainQuestions = () => [
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `v-${i}`,
        section: 'moji_go' as const,
        scoringDomain: 'vocab' as const,
        subCategory: 'Vocab',
        prompt: 'V',
        options: [
          { id: '1', label: 'A' },
          { id: '2', label: 'B' },
        ],
        correctOptionId: '1',
        explanationFr: 'OK',
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `g-${i}`,
        section: 'bunpou_dokkai' as const,
        scoringDomain: 'grammar' as const,
        subCategory: 'Grammar',
        prompt: 'G',
        options: [
          { id: '1', label: 'A' },
          { id: '2', label: 'B' },
        ],
        correctOptionId: '1',
        explanationFr: 'OK',
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `r-${i}`,
        section: 'bunpou_dokkai' as const,
        scoringDomain: 'reading' as const,
        subCategory: 'Reading',
        prompt: 'R',
        options: [
          { id: '1', label: 'A' },
          { id: '2', label: 'B' },
        ],
        correctOptionId: '1',
        explanationFr: 'OK',
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `l-${i}`,
        section: 'choukai' as const,
        scoringDomain: 'listening' as const,
        subCategory: 'Listening',
        prompt: 'L',
        options: [
          { id: '1', label: 'A' },
          { id: '2', label: 'B' },
        ],
        correctOptionId: '1',
        explanationFr: 'OK',
      })),
    ];

    it('passes when total >= 95/180 and every bucket >= 19/60', () => {
      const qs = makeDomainQuestions();
      const answers: Record<string, string> = {};
      // 7/10 vocab + 6/10 grammar => 13/20 = 39/60 LangKnowledge
      for (let i = 0; i < 7; i++) answers[`v-${i}`] = '1';
      for (let i = 0; i < 6; i++) answers[`g-${i}`] = '1';
      // 6/10 reading => 36/60
      for (let i = 0; i < 6; i++) answers[`r-${i}`] = '1';
      // 5/10 listening => 30/60 => total 105/180
      for (let i = 0; i < 5; i++) answers[`l-${i}`] = '1';

      const res = computeExamResult({
        level: 'N3',
        mode: 'FULL_MOCK',
        scoringScale: 'JLPT_180',
        questions: qs,
        answers,
        timeSpentSeconds: 3600,
      });

      expect(res.maxScoreTotal).toBe(180);
      expect(res.scoreTotal).toBe(105);
      expect(res.officialBreakdown?.languageKnowledgeScore).toBe(39);
      expect(res.officialBreakdown?.readingScore).toBe(36);
      expect(res.officialBreakdown?.listeningScore).toBe(30);
      expect(res.passed).toBe(true);
    });

    it('fails when total >= 95/180 but listening < 19/60', () => {
      const qs = makeDomainQuestions();
      const answers: Record<string, string> = {};
      for (let i = 0; i < 10; i++) answers[`v-${i}`] = '1';
      for (let i = 0; i < 10; i++) answers[`g-${i}`] = '1'; // 60/60
      for (let i = 0; i < 10; i++) answers[`r-${i}`] = '1'; // 60/60
      for (let i = 0; i < 2; i++) answers[`l-${i}`] = '1';  // 12/60 (<19)

      const res = computeExamResult({
        level: 'N3',
        mode: 'FULL_MOCK',
        scoringScale: 'JLPT_180',
        questions: qs,
        answers,
        timeSpentSeconds: 3600,
      });

      expect(res.scoreTotal).toBe(132);
      expect(res.passedChoukai).toBe(false);
      expect(res.passed).toBe(false);
    });

    it('fails when every bucket >= 19/60 but total < 95/180', () => {
      const qs = makeDomainQuestions();
      const answers: Record<string, string> = {};
      // 4/10 each bucket => 24/60 x 3 = 72/180
      for (let i = 0; i < 4; i++) {
        answers[`v-${i}`] = '1';
        answers[`g-${i}`] = '1';
        answers[`r-${i}`] = '1';
        answers[`l-${i}`] = '1';
      }

      const res = computeExamResult({
        level: 'N3',
        mode: 'FULL_MOCK',
        scoringScale: 'JLPT_180',
        questions: qs,
        answers,
        timeSpentSeconds: 3600,
      });

      expect(res.passedMojiGo).toBe(true);
      expect(res.passedBunpouDokkai).toBe(true);
      expect(res.passedChoukai).toBe(true);
      expect(res.scoreTotal).toBe(72);
      expect(res.passed).toBe(false);
    });
  });
});

