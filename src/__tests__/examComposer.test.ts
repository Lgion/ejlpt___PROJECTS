import { describe, expect, it } from 'vitest';
import {
  EXAM_CATALOG_MANIFEST,
  getCatalogEntriesByLevel,
  loadExamById,
  loadExamsByLevel,
} from '@/data/examCatalog';
import { JLPT_N3_OFFICIAL_2018 } from '@/data/jlptN3Official2018';
import { JLPT_N3_OFFICIAL_2012 } from '@/data/jlptN3Official2012';
import { JLPT_N5_OFFICIAL_2018 } from '@/data/jlptN5Official2018';
import { JLPT_N5_OFFICIAL_2012 } from '@/data/jlptN5Official2012';
import {
  composeMixedExam,
  describeComposableParts,
  formatAnonymousExamLabel,
  sanitizeAttemptTitle,
} from '@/lib/examComposer';
import { computeExamResult } from '@/lib/examScoring';
import { buildSimulatorStages, createDefaultSessionConfig } from '@/lib/jlptTokens';

describe('Exam Catalog Anonymization & Lazy Loading', () => {
  it('exposes anonymized sequential titles and zero origin years in learner-facing fields', () => {
    expect(EXAM_CATALOG_MANIFEST).toHaveLength(10);

    for (const entry of EXAM_CATALOG_MANIFEST) {
      expect(entry.title).toMatch(/^JLPT N[1-5] — Examen #\d+$/);
      expect(entry.title).not.toMatch(/2018|2012|Officiel\s+20/i);
      expect(entry.description).not.toMatch(/2018|2012/);
    }

    for (const level of ['N5', 'N4', 'N3', 'N2', 'N1'] as const) {
      expect(getCatalogEntriesByLevel(level).map((e) => e.examNumber)).toEqual([1, 2]);
    }
  });

  it('loads full exams asynchronously on demand and matches manifest counts', async () => {
    const n3Exams = await loadExamsByLevel('N3');
    expect(n3Exams).toHaveLength(2);
    expect(n3Exams.map((e) => e.id)).toEqual([
      'exam-n3-official-2018',
      'exam-n3-official-2012',
    ]);

    for (const entry of EXAM_CATALOG_MANIFEST) {
      const loaded = await loadExamById(entry.id);
      expect(loaded).not.toBeNull();
      expect(loaded!.questions).toHaveLength(entry.questionCount);
      expect(loaded!.title).toBe(entry.title);
      expect(loaded!.examNumber).toBe(entry.examNumber);
    }

    expect(await loadExamById('non-existent-exam')).toBeNull();
  });

  it('formats anonymous labels and scrubs legacy attempt titles', () => {
    expect(formatAnonymousExamLabel(JLPT_N3_OFFICIAL_2018)).toBe('N3 · Examen #1');
    expect(formatAnonymousExamLabel(JLPT_N3_OFFICIAL_2012)).toBe('N3 · Examen #2');
    expect(sanitizeAttemptTitle('JLPT N3 — Examen Officiel 2018 (Cahier Intégral)')).toBe(
      'JLPT N3 — Examen #1'
    );
    expect(sanitizeAttemptTitle('JLPT N4 — Examen Officiel 2012 (Mode Strict)')).toBe(
      'JLPT N4 — Examen #2 (Mode Strict)'
    );
  });
});

describe('Dynamic Mixed Exam Composer (examComposer)', () => {
  it('describes all composable Mondai parts across multiple N3 exams', () => {
    const parts = describeComposableParts([JLPT_N3_OFFICIAL_2018, JLPT_N3_OFFICIAL_2012]);
    expect(parts.length).toBeGreaterThanOrEqual(17);

    const vocabM1 = parts.find((p) => p.moduleId === 'vocab_m1');
    expect(vocabM1?.availableSources).toHaveLength(2);
    expect(vocabM1?.supportsFineShuffle).toBe(true);

    const vocabM3 = parts.find((p) => p.moduleId === 'vocab_m3');
    expect(vocabM3?.availableSources.map((s) => s.questionCount)).toEqual([11, 9]);

    const listeningM5 = parts.find((p) => p.moduleId === 'listening_m5');
    expect(listeningM5?.supportsFineShuffle).toBe(false);
    expect(listeningM5?.availableSources.map((s) => s.questionCount)).toEqual([9, 8]);
  });

  it('composes an explicit mixed N3 exam across #1 and #2, remapping cloze blanks & tracks cleanly', () => {
    const sources = [JLPT_N3_OFFICIAL_2018, JLPT_N3_OFFICIAL_2012];
    const parts = describeComposableParts(sources);
    const partSources = Object.fromEntries(
      parts.map((p, idx) => [
        p.moduleId,
        idx % 2 === 0 ? 'exam-n3-official-2012' : 'exam-n3-official-2018',
      ])
    );

    const mixed = composeMixedExam('N3', sources, {
      level: 'N3',
      granularity: 'by_mondai',
      partSources,
      seed: 4242,
    });

    expect(mixed.isDynamicMix).toBe(true);
    expect(mixed.candidateCodePrefix).toBe('MIX');
    expect(mixed.title).toContain('JLPT N3 — Examen Mixte');
    expect(mixed.title).not.toMatch(/2018|2012/);
    expect(mixed.sourceExamIds).toEqual(
      expect.arrayContaining(['exam-n3-official-2018', 'exam-n3-official-2012'])
    );

    // Written stage renumbering starts at 1 cleanly and listening tracks match Mondai 1..5
    const vocabQs = mixed.questions.filter((q) => q.stageId === 'stage-vocab');
    expect(vocabQs.map((q) => q.questionNumber)).toEqual(
      Array.from({ length: vocabQs.length }, (_, i) => i + 1)
    );

    const grQs = mixed.questions.filter((q) => q.stageId === 'stage-grammar-reading');
    expect(grQs.map((q) => q.questionNumber)).toEqual(
      Array.from({ length: grQs.length }, (_, i) => i + 1)
    );

    // Verify all passageId references & cloze blanks remain valid after mixing
    const passageById = new Map((mixed.passages ?? []).map((p) => [p.id, p]));
    for (const q of mixed.questions) {
      if (q.passageId) {
        expect(passageById.has(q.passageId)).toBe(true);
      }
      if (q.archetype === 'grammar_text_cloze' && q.passageId && q.questionNumber !== undefined) {
        const passage = passageById.get(q.passageId)!;
        const blankNums = passage.paragraphs
          .flatMap((para) => para.tokens)
          .filter((tok) => tok.isBlank && tok.blankNumber !== undefined)
          .map((tok) => tok.blankNumber);
        expect(blankNums).toContain(q.questionNumber);
      }
    }

    // Listening tracks 1..5 are populated for stage-listening
    const listeningStage = mixed.stages?.find((s) => s.id === 'stage-listening');
    expect(listeningStage?.audioTracks?.map((t) => t.mondaiNumber)).toEqual([1, 2, 3, 4, 5]);

    // Simulator stages & /180 scoring work end-to-end on the mixed exam
    const stages = buildSimulatorStages(mixed, createDefaultSessionConfig('OFFICIAL_STRICT', mixed));
    expect(stages).toHaveLength(3);

    const perfectAnswers = Object.fromEntries(
      mixed.questions.map((q) => [q.id, q.correctOptionId])
    );
    const result = computeExamResult({
      level: 'N3',
      mode: 'FULL_MOCK',
      scoringScale: 'JLPT_180',
      questions: mixed.questions,
      answers: perfectAnswers,
      timeSpentSeconds: 3600,
    });
    expect(result.scoreTotal).toBe(180);
    expect(result.passed).toBe(true);
  });

  it('supports fine_shuffle item and sub-passage mixing across N5 #1 and #2', () => {
    const sources = [JLPT_N5_OFFICIAL_2018, JLPT_N5_OFFICIAL_2012];
    const parts = describeComposableParts(sources);
    const partSources = Object.fromEntries(parts.map((p) => [p.moduleId, 'random']));

    const mixed = composeMixedExam('N5', sources, {
      level: 'N5',
      granularity: 'fine_shuffle',
      partSources,
      seed: 1337,
    });

    expect(mixed.sourceExamIds).toEqual(
      expect.arrayContaining(['exam-n5-official-2018', 'exam-n5-official-2012'])
    );
    expect(mixed.questions.length).toBeGreaterThanOrEqual(85);

    const passageIds = new Set((mixed.passages ?? []).map((p) => p.id));
    for (const q of mixed.questions) {
      if (q.passageId) expect(passageIds.has(q.passageId)).toBe(true);
      expect(q.options.some((o) => o.id === q.correctOptionId)).toBe(true);
    }

    const perfect = computeExamResult({
      level: 'N5',
      mode: 'FULL_MOCK',
      scoringScale: 'JLPT_180',
      questions: mixed.questions,
      answers: Object.fromEntries(mixed.questions.map((q) => [q.id, q.correctOptionId])),
      timeSpentSeconds: 2400,
    });
    expect(perfect.scoreTotal).toBe(180);
    expect(perfect.passed).toBe(true);
  });
});
