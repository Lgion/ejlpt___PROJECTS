import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { localDb, type UnifiedKanjiRecord } from '@/lib/db';
import { computeDexterityScore, generateDynamicQuiz } from '@/lib/quizGenerator';
import { normalizeJapaneseTranscript, matchesJapaneseSpeech } from '@/lib/speechRecognition';
import {
  checkYomikataAnswer,
  parseCollectionItemToYomikataZ,
  YOMIKATA_Z_OFFICIAL_SEED,
} from '@/data/yomikataZSeed';
import {
  evaluateBucketSort,
  evaluateSentenceOrder,
  ICHIDAN_GODAN_ITEMS,
  SENTENCE_ORDER_PUZZLES,
  TRANSITIVITY_ITEMS,
} from '@/data/dragDropQuizSeed';
import { MultimediaFeedbackCard } from '@/components/practice/MultimediaFeedbackCard';

function makeRichKanji(
  kanji: string,
  jlpt: UnifiedKanjiRecord['jlpt'],
  meaningFr: string,
  extra: Partial<UnifiedKanjiRecord> = {}
): UnifiedKanjiRecord {
  return {
    kanji,
    uuid: `u-${kanji}`,
    jlpt,
    grade: 1,
    strokes: 8,
    radical: kanji,
    radical_name_en: 'test',
    category: 'test',
    subCategory: 'test',
    classification: 'test',
    skipCode: '1-2-6',
    compositionsSKIP: [],
    on_readings: ['オン'],
    kun_readings: ['くん'],
    nanori: [],
    meanings_fr: [meaningFr],
    meanings_en: [meaningFr],
    frequencies: {},
    isVerbe: 'false',
    isAdj: 'false',
    dualisme: 0,
    isKeigo: [false, false],
    isProperName: false,
    isSetsuzokushi: false,
    isKandoushi: false,
    isPronoun: '',
    type: '',
    synonyms: [],
    antonyms: [],
    homonyms: [],
    startingW: [],
    endingW: [],
    encodage: { unicode: '0000', utf8: '00' },
    kanjidb_extra: {},
    similar: [],
    variants: [],
    frequencyScore10: 8,
    ...extra,
  };
}

describe('Phase 5: Extended dynamic quizzes, Yomikata Z, drag-drop & multimedia feedback', () => {
  it('computes dexterity score and rank labels accurately', () => {
    const sRank = computeDexterityScore({
      correctCount: 10,
      totalCount: 10,
      totalTimeRemainingSec: 120,
      secondsPerQuestion: 20,
      maxStreak: 10,
    });
    expect(sRank.accuracyPct).toBe(100);
    expect(sRank.totalPoints).toBe(1000 + 1200 + 250);
    expect(sRank.rankLabelFr).toContain('S');

    const cRank = computeDexterityScore({
      correctCount: 2,
      totalCount: 10,
      totalTimeRemainingSec: 0,
      secondsPerQuestion: 20,
      maxStreak: 1,
    });
    expect(cRank.accuracyPct).toBe(20);
    expect(cRank.rankLabelFr).toContain('C');
  });

  it('generates intruder_set, speed_reading, translation_fr_ja, jukugo_builder, and grammar_relations_connectors', async () => {
    await localDb.meta.put({ key: 'datasetVersion', value: '2026-11-phase2-v3' });
    await localDb.kanjis.bulkPut([
      makeRichKanji('大', 'N5', 'grand', {
        synonyms: ['巨', '広'],
        antonyms: ['小'],
        similar: ['犬', '太'],
        frequencyScore10: 10,
        dualisme: 1,
      }),
      makeRichKanji('小', 'N5', 'petit', { antonyms: ['大'], dualisme: -1, frequencyScore10: 9 }),
      makeRichKanji('巨', 'N1', 'géant', { synonyms: ['大'] }),
      makeRichKanji('広', 'N4', 'large', { synonyms: ['大'], isAdj: 'i' }),
      makeRichKanji('尊', 'N2', 'respecter', { isKeigo: [true, false], isVerbe: 'godan' }),
      makeRichKanji('見', 'N5', 'voir', { homonyms: ['観'], isVerbe: 'ichidan', sotoUchi: 'neutral' }),
      makeRichKanji('観', 'N3', 'observer', { homonyms: ['見'] }),
      makeRichKanji('食', 'N5', 'manger', { isVerbe: 'ichidan', frequencyScore10: 10 }),
    ]);

    await localDb.grammar.bulkPut([
      {
        term: 'ながら',
        reading: 'ながら',
        category: 'bunpou',
        jlpt_level: 'N5',
        connections: ['Vます + ながら'],
        meaning: 'tout en faisant',
        explanation: 'simultanéité',
        examples: [],
      },
      {
        term: 'てから',
        reading: 'てから',
        category: 'bunpou',
        jlpt_level: 'N5',
        connections: ['Vて + から'],
        meaning: 'après avoir fait',
        explanation: 'succession',
        examples: [],
      },
    ]);

    await localDb.jukugo.bulkPut([
      { word: '大学', reading: 'だいがく', meaning_en: 'university', frequency: 900, grammaticalFeature: 'noun', jlpt: 'N5', kanjiCount: 2 },
      { word: '大学生', reading: 'だいがくせい', meaning_en: 'university student', frequency: 800, grammaticalFeature: 'noun', jlpt: 'N5', kanjiCount: 3 },
      { word: '小学校', reading: 'しょうがっこう', meaning_en: 'elementary school', frequency: 750, grammaticalFeature: 'noun', jlpt: 'N5', kanjiCount: 3 },
      { word: '国際会議', reading: 'こくさいかいぎ', meaning_en: 'international conference', frequency: 400, grammaticalFeature: 'noun', jlpt: 'N3', kanjiCount: 4 },
    ]);

    const intruder = await generateDynamicQuiz({ mode: 'intruder_set', level: 'ALL', count: 4 });
    expect(intruder.length).toBeGreaterThanOrEqual(3);
    expect(intruder[0].options).toHaveLength(4);
    expect(intruder[0].itemMeta).toBeDefined();

    const speed = await generateDynamicQuiz({ mode: 'speed_reading', level: 'ALL', count: 4 });
    expect(speed).toHaveLength(4);
    expect(speed[0].options).toHaveLength(4);

    const tr = await generateDynamicQuiz({ mode: 'translation_fr_ja', level: 'ALL', count: 4 });
    expect(tr).toHaveLength(4);
    expect(tr[0].options).toHaveLength(4);

    const jb = await generateDynamicQuiz({ mode: 'jukugo_builder', level: 'ALL', count: 4 });
    expect(jb).toHaveLength(4);
    expect(jb[0].options).toHaveLength(4);

    const gr = await generateDynamicQuiz({ mode: 'grammar_relations_connectors', level: 'ALL', count: 4 });
    expect(gr).toHaveLength(4);
    expect(gr[0].options).toHaveLength(4);
  });

  it('validates Yomikata Z seeds across N5-N1, speech normalization, and collection conversion', () => {
    for (const lvl of ['N5', 'N4', 'N3', 'N2', 'N1'] as const) {
      expect(YOMIKATA_Z_OFFICIAL_SEED.filter((i) => i.level === lvl).length).toBeGreaterThanOrEqual(5);
    }

    expect(normalizeJapaneseTranscript(' がっこう。 ')).toBe('がっこう');
    expect(matchesJapaneseSpeech('Gakkou!', ['がっこう'])).toBe(true);
    expect(matchesJapaneseSpeech('間違った', ['がっこう'])).toBe(false);

    const sample = YOMIKATA_Z_OFFICIAL_SEED[0];
    expect(checkYomikataAnswer(sample, 'qcm', sample.correctOptionId)).toBe(true);
    expect(checkYomikataAnswer(sample, 'keyboard', 'gakkou')).toBe(true);
    expect(checkYomikataAnswer(sample, 'voice', `${sample.reading}。`)).toBe(true);

    const converted = parseCollectionItemToYomikataZ({
      id: 'col_1',
      fingerprint: 'fp_1',
      source: 'community',
      mode: 'yomikata_z',
      level: 'N4',
      prompt: '駅で切符を買います。',
      targetWord: '切符',
      reading: 'きっぷ',
      expectedAnswers: ['きっぷ'],
      options: [{ id: 'a', text: 'きっぷ' }],
      correctOptionId: 'a',
      explanation: 'ticket de train',
      tags: ['test'],
      status: 'active',
      authorType: 'member',
      createdAt: new Date().toISOString(),
    });
    expect(converted?.sentenceBefore).toBe('駅で');
    expect(converted?.targetWord).toBe('切符');
    expect(converted?.sentenceAfter).toBe('を買います。');
  });

  it('evaluates Drag-Drop sentence order and 1dan/5dan + transitivity bucket sorting', () => {
    const puzzle = SENTENCE_ORDER_PUZZLES[0];
    expect(evaluateSentenceOrder(puzzle.correctOrder, puzzle.correctOrder).isCorrect).toBe(true);
    expect(evaluateSentenceOrder(puzzle.tokens, puzzle.correctOrder).isCorrect).toBe(false);

    const godanPlacements = Object.fromEntries(
      ICHIDAN_GODAN_ITEMS.map((item) => [item.id, item.correctBucket])
    );
    const res1 = evaluateBucketSort(godanPlacements, ICHIDAN_GODAN_ITEMS);
    expect(res1.correctCount).toBe(ICHIDAN_GODAN_ITEMS.length);

    const transPlacements = Object.fromEntries(
      TRANSITIVITY_ITEMS.map((item) => [item.id, item.correctBucket])
    );
    const res2 = evaluateBucketSort(transPlacements, TRANSITIVITY_ITEMS);
    expect(res2.correctCount).toBe(TRANSITIVITY_ITEMS.length);
  });

  it('renders MultimediaFeedbackCard with grammatical & statistical badges', () => {
    render(
      <MultimediaFeedbackCard
        itemKey="尊"
        itemType="KANJI"
        reading="そん"
        meta={{
          kanji: '尊',
          frequencyScore10: 7,
          jlpt: 'N2',
          isVerbe: 'godan',
          isKeigo: [true, false],
          sotoUchi: 'soto',
          dualisme: 1,
          strokes: 12,
        }}
      />
    );

    expect(screen.getByText('Fréq. 7/10')).toBeTruthy();
    expect(screen.getByText('Verbe 5段')).toBeTruthy();
    expect(screen.getByText('Keigo 尊敬語')).toBeTruthy();
    expect(screen.getByText('Soto (外)')).toBeTruthy();
    expect(screen.getByText('Nuance +')).toBeTruthy();
    expect(screen.getByText('Audio JA')).toBeTruthy();
  });
});
