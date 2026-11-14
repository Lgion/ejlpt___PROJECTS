import { describe, expect, it } from 'vitest';
import { localDb, type UnifiedKanjiRecord } from '@/lib/db';
import { generateDynamicQuiz } from '@/lib/quizGenerator';
import { recordErrorToSRS } from '@/lib/srs';

function makeKanji(
  kanji: string,
  jlpt: UnifiedKanjiRecord['jlpt'],
  on: string[],
  kun: string[],
  meaningFr: string,
  synonyms: string[] = [],
  similar: string[] = []
): UnifiedKanjiRecord {
  return {
    kanji,
    uuid: `u-${kanji}`,
    jlpt,
    grade: 1,
    strokes: 5,
    radical: kanji,
    radical_name_en: 'test',
    category: 'test',
    subCategory: 'test',
    classification: 'test',
    skipCode: '1-2-3',
    compositionsSKIP: [],
    on_readings: on,
    kun_readings: kun,
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
    synonyms,
    antonyms: [],
    homonyms: [],
    startingW: [],
    endingW: [],
    encodage: { unicode: '0000', utf8: '00' },
    kanjidb_extra: {},
    similar,
    variants: [],
  };
}

describe('generateDynamicQuiz', () => {
  it('generates kanji_reading, grammar_cloze, synonyms_intruder, jukugo_compound, and srs_review questions', async () => {
    await localDb.meta.put({ key: 'datasetVersion', value: '2026-11-lot3-v2' });
    await localDb.kanjis.bulkPut([
      makeKanji('語', 'N5', ['ゴ'], ['かた.る'], 'mot, langue', ['言', '話'], ['悟']),
      makeKanji('言', 'N5', ['ゲン', 'ゴン'], ['い.う'], 'dire', ['語']),
      makeKanji('話', 'N5', ['ワ'], ['はな.す'], 'parler', ['語']),
      makeKanji('悟', 'N1', ['ゴ'], ['さと.る'], 'comprendre'),
      makeKanji('食', 'N5', ['ショク'], ['た.べる'], 'manger'),
      makeKanji('飲', 'N5', ['イン'], ['の.む'], 'boire'),
      makeKanji('山', 'N5', ['サン'], ['やま'], 'montagne'),
      makeKanji('川', 'N5', ['セン'], ['かわ'], 'rivière'),
    ]);

    await localDb.grammar.bulkPut([
      { term: 'ながら', reading: 'ながら', category: 'bunpou', jlpt_level: 'N5', connections: ['Vます + ながら'], meaning: 'tout en faisant', explanation: 'simultanéité', examples: [] },
      { term: 'たい', reading: 'たい', category: 'bunpou', jlpt_level: 'N5', connections: ['Vます + たい'], meaning: 'vouloir faire', explanation: 'désir', examples: [] },
      { term: 'ている', reading: 'ている', category: 'bunpou', jlpt_level: 'N5', connections: ['Vて + いる'], meaning: 'action en cours', explanation: 'aspect', examples: [] },
      { term: 'てから', reading: 'てから', category: 'bunpou', jlpt_level: 'N5', connections: ['Vて + から'], meaning: 'après avoir fait', explanation: 'séquence', examples: [] },
    ]);

    await localDb.jukugo.bulkPut([
      { word: '言語', reading: 'げんご', meaning_en: 'language', frequency: 500, grammaticalFeature: 'noun' },
      { word: '会話', reading: 'かいわ', meaning_en: 'conversation', frequency: 450, grammaticalFeature: 'noun' },
      { word: '食事', reading: 'しょくじ', meaning_en: 'meal', frequency: 400, grammaticalFeature: 'noun' },
      { word: '山川', reading: 'やまかわ', meaning_en: 'mountains and rivers', frequency: 300, grammaticalFeature: 'noun' },
    ]);

    await localDb.slang.put({
      term: '草',
      readings: ['くさ'],
      type: ['noun'],
      meaning: ['lol'],
      example: [],
      note: [],
    });

    await localDb.onomatopoeia.put({
      term: 'どきどき',
      shortDefinitions: ['heart pounding'],
      extendedDefinition: '',
      examples: [],
      category: 'onomatopoeia',
    });

    const kanjiQuiz = await generateDynamicQuiz({ mode: 'kanji_reading', level: 'N5', count: 4 });
    expect(kanjiQuiz.length).toBeGreaterThanOrEqual(4);
    expect(kanjiQuiz[0].options).toHaveLength(4);

    const grammarQuiz = await generateDynamicQuiz({ mode: 'grammar_cloze', level: 'N5', count: 3 });
    expect(grammarQuiz).toHaveLength(3);
    expect(grammarQuiz[0].itemType).toBe('GRAMMAR');

    const synonymQuiz = await generateDynamicQuiz({ mode: 'synonyms_intruder', level: 'N5', count: 2 });
    expect(synonymQuiz.length).toBeGreaterThanOrEqual(1);
    expect(synonymQuiz[0].options).toHaveLength(4);

    const jukugoQuiz = await generateDynamicQuiz({ mode: 'jukugo_compound', level: 'N5', count: 3 });
    expect(jukugoQuiz.length).toBeGreaterThanOrEqual(3);
    expect(jukugoQuiz[0].itemType).toBe('JUKUGO');

    await recordErrorToSRS({
      cardId: 'kanji:語',
      itemType: 'KANJI',
      itemKey: '語',
      level: 'N5',
      prompt: 'Quelle est la signification de 「語」 ?',
      reading: 'ゴ',
      answer: 'mot, langue',
    });

    const srsQuiz = await generateDynamicQuiz({ mode: 'srs_review', level: 'ALL', count: 5 });
    expect(srsQuiz.length).toBeGreaterThanOrEqual(1);
    expect(srsQuiz[0].srsCardId).toBe('kanji:語');
  });
});

