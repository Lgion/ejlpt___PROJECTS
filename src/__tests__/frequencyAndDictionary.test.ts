import { describe, expect, it } from 'vitest';
import { localDb } from '@/lib/db';
import {
  classifyJapaneseScript,
  computeJukugoFrequencyScore10,
  computeKanjiFrequencyScore10,
  computeSpriteCssStyle,
} from '@/lib/frequencyScale';

describe('frequencyScale & Dexie v6 enriched queries', () => {
  it('computes normalized 1..10 frequency scores and classifies Japanese scripts', () => {
    expect(computeKanjiFrequencyScore10({ news: 42 })).toBe(10);
    expect(computeKanjiFrequencyScore10({ twitter: 2000 })).toBe(5);
    expect(computeKanjiFrequencyScore10({})).toBe(1);

    expect(computeJukugoFrequencyScore10(260000)).toBe(10);
    expect(computeJukugoFrequencyScore10(3000)).toBe(5);
    expect(computeJukugoFrequencyScore10(0)).toBe(1);

    expect(classifyJapaneseScript('ひらがな')).toBe('hira_only');
    expect(classifyJapaneseScript('カタカナ')).toBe('kata_only');
    expect(classifyJapaneseScript('あいうアイウ')).toBe('mixed_hira_kata');
    expect(classifyJapaneseScript('日本語')).toBe('mixed_kanji');
    expect(classifyJapaneseScript('AI臭い')).toBe('mixed_romaji');
  });

  it('computes accurate CSS coordinates for WebP sprite sheets', () => {
    const style = computeSpriteCssStyle({
      sheetUrl: '/sprites/kanji-0.webp',
      index: 18, // col 2, row 1 on a 16x16 grid
      cols: 16,
      rows: 16,
      displaySize: 48,
    });

    expect(style.backgroundImage).toBe('url(/sprites/kanji-0.webp)');
    expect(style.backgroundSize).toBe('768px 768px');
    expect(style.backgroundPosition).toBe('-96px -48px');
  });

  it('stores and queries Dexie v6 enriched kanjis (*themes) and N0 jukugo records', async () => {
    await localDb.kanjis.put({
      kanji: '猫',
      uuid: 'k-neko',
      jlpt: 'N3',
      grade: 8,
      strokes: 11,
      radical: '⽝',
      radical_name_en: 'Dog',
      category: 'animauxEtNature',
      subCategory: '-',
      classification: '形声',
      skipCode: '1-3-8',
      compositionsSKIP: ['hen+tsukuri (gauche-droite)'],
      on_readings: ['ビョウ'],
      kun_readings: ['ねこ'],
      nanori: [],
      meanings_fr: ['chat'],
      meanings_en: ['cat'],
      frequencies: { news: 900 },
      isVerbe: 'false',
      isAdj: 'false',
      dualisme: 1,
      isKeigo: [false, false],
      isProperName: false,
      isSetsuzokushi: false,
      isKandoushi: false,
      isPronoun: 'false',
      type: 'nom',
      synonyms: [],
      antonyms: [],
      homonyms: [],
      startingW: ['猫舌'],
      endingW: ['子猫'],
      encodage: { unicode: 'U+732B', utf8: 'E78CAB' },
      kanjidb_extra: {},
      similar: [],
      variants: [],
      frequencyScore10: 7,
      themes: ['quotidien', 'nom'],
      sotoUchi: 'neutral',
      images: [{ sheet: 'kanji-0', index: 0, source: 'cdn' }],
    });

    await localDb.jukugo.bulkPut([
      {
        word: '子猫',
        reading: 'こねこ',
        meaning_en: 'kitten',
        frequency: 4200,
        grammaticalFeature: 'noun',
        jlpt: 'N0',
        scriptType: 'mixed_kanji',
        pos: 'noun',
        kanjiCount: 2,
        frequencyScore10: 5,
      },
      {
        word: '猫舌',
        reading: 'ねこじた',
        meaning_en: 'aversion to hot food',
        frequency: 1200,
        grammaticalFeature: 'noun',
        jlpt: 'N0',
        scriptType: 'mixed_kanji',
        pos: 'noun',
        kanjiCount: 2,
        frequencyScore10: 4,
      },
    ]);

    const dailyThemeKanjis = await localDb.kanjis.where('themes').equals('quotidien').toArray();
    expect(dailyThemeKanjis).toHaveLength(1);
    expect(dailyThemeKanjis[0].kanji).toBe('猫');

    const n0Jukugo = await localDb.jukugo.where('jlpt').equals('N0').toArray();
    expect(n0Jukugo.map((j) => j.word).sort()).toEqual(['子猫', '猫舌']);
  });
});
