import { describe, expect, it } from 'vitest';
import {
  analyzeJapaneseTextPure,
  shouldShowAdaptiveFurigana,
  type AnalysisDictionaries,
} from '@/lib/textAnalyzer';

const SAMPLE_DICTS: AnalysisDictionaries = {
  kanjiMap: new Map([
    [
      '日',
      {
        kanji: '日',
        jlpt: 'N5',
        strokes: 4,
        on_readings: ['ニチ', 'ジツ'],
        kun_readings: ['ひ', 'か'],
        meanings_fr: ['jour', 'soleil'],
        meanings_en: ['day', 'sun'],
      },
    ],
    [
      '本',
      {
        kanji: '本',
        jlpt: 'N5',
        strokes: 5,
        on_readings: ['ホン'],
        kun_readings: ['もと'],
        meanings_fr: ['livre', 'origine'],
        meanings_en: ['book'],
      },
    ],
    [
      '挑',
      {
        kanji: '挑',
        jlpt: 'N1',
        strokes: 9,
        on_readings: ['チョウ'],
        kun_readings: ['いど.む'],
        meanings_fr: ['défier'],
        meanings_en: ['challenge'],
      },
    ],
    [
      '戦',
      {
        kanji: '戦',
        jlpt: 'N3',
        strokes: 13,
        on_readings: ['セン'],
        kun_readings: ['いくさ', 'たたか.う'],
        meanings_fr: ['guerre', 'combat'],
        meanings_en: ['war', 'battle'],
      },
    ],
  ]),
  jukugoMap: new Map([
    [
      '日本語',
      {
        word: '日本語',
        reading: 'にほんご',
        meaning_en: 'Japanese language',
      },
    ],
    [
      '挑戦',
      {
        word: '挑戦',
        reading: 'ちょうせん',
        meaning_en: 'challenge',
      },
    ],
  ]),
  grammarList: [
    {
      term: 'つもりだ',
      reading: 'つもりだ',
      jlpt_level: 'N4',
      meaning: 'avoir l’intention de',
    },
  ],
};

describe('textAnalyzer', () => {
  it('segments Jukugo compounds greedily and detects grammar & JLPT distribution', () => {
    const result = analyzeJapaneseTextPure('私は日本語に挑戦するつもりだ。', SAMPLE_DICTS, {
      targetLevel: 'N3',
    });

    expect(result.vocabList.map((v) => v.word)).toEqual(['日本語', '挑戦']);
    expect(result.grammarHits.map((g) => g.term)).toContain('つもりだ');
    expect(result.stats.uniqueKanjiCount).toBe(6); // 私, 日, 本, 語, 挑, 戦
    expect(result.stats.coverageByLevel.N5).toBe(2);
    expect(result.stats.coverageByLevel.N1).toBe(1);
    expect(result.stats.coverageByLevel.N3).toBe(1);
  });

  it('controls adaptive furigana visibility based on target JLPT and SRS mastery', () => {
    const mastered = new Set(['挑戦']);

    expect(shouldShowAdaptiveFurigana('N5', 'N3', mastered, '本', 'ALWAYS')).toBe(true);
    expect(shouldShowAdaptiveFurigana('N1', 'N3', mastered, '挑', 'OFF')).toBe(false);

    // Below target level N3 -> hidden
    expect(shouldShowAdaptiveFurigana('N5', 'N3', mastered, '本', 'ADAPTIVE')).toBe(false);
    // Equal or harder than target level N3 -> shown
    expect(shouldShowAdaptiveFurigana('N3', 'N3', mastered, '戦', 'ADAPTIVE')).toBe(true);
    expect(shouldShowAdaptiveFurigana('N1', 'N3', mastered, '挑', 'ADAPTIVE')).toBe(true);
    // Mastered in SRS -> hidden even if above target level
    expect(shouldShowAdaptiveFurigana('N1', 'N3', mastered, '挑戦', 'ADAPTIVE')).toBe(false);
  });
});

