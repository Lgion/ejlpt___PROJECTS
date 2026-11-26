import React from 'react';
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { localDb, type UnifiedKanjiRecord } from '@/lib/db';
import {
  parseAdvancedSearchQuery,
  resetSearchIndex,
  searchOfflineAdvanced,
} from '@/lib/search';
import {
  buildPostQuizSmartGoal,
  computeJukugoGlobalStats,
} from '@/lib/smartGoals';
import { buildFullConjugationParadigm } from '@/lib/conjugationTable';
import { PostQuizSmartGoalCard } from '@/components/practice/PostQuizSmartGoalCard';
import { RecommendedLinksTool } from '@/components/tools/RecommendedLinksTool';

function makeKanjiForSearch(
  kanji: string,
  jlpt: UnifiedKanjiRecord['jlpt'],
  meaningFr: string,
  extra: Partial<UnifiedKanjiRecord> = {}
): UnifiedKanjiRecord {
  return {
    kanji,
    uuid: `u-${kanji}`,
    jlpt,
    grade: 2,
    strokes: 8,
    radical: kanji,
    radical_name_en: 'test',
    category: 'test',
    subCategory: 'test',
    classification: 'test',
    skipCode: '1-2-6',
    compositionsSKIP: [],
    on_readings: ['ゴ'],
    kun_readings: ['かた.る'],
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
    frequencyScore10: 7,
    ...extra,
  };
}

describe('Phase 6: Advanced search, SMART goals, Jukugo stats & /tools', () => {
  beforeEach(() => {
    resetSearchIndex();
  });

  it('parses all advanced search operators correctly', () => {
    const q1 = parseAdvancedSearchQuery(
      'only:kanji only:n5 skip:1-7 radical:言 reg:soto trans:jidoushi sort:dualisme+ -N1 parler'
    );
    expect(q1.onlyKinds).toEqual(['KANJI']);
    expect(q1.onlyLevels).toEqual(['N5']);
    expect(q1.skipPrefix).toBe('1-7');
    expect(q1.radicalFilter).toBe('言');
    expect(q1.sotoUchi).toBe('soto');
    expect(q1.transitivity).toBe('jidoushi');
    expect(q1.sortBy).toBe('dualisme_pos');
    expect(q1.excludeTerms).toEqual(['n1']);
    expect(q1.textQuery).toBe('parler');

    const cmp = parseAdvancedSearchQuery('comparer 語 言');
    expect(cmp.compareTerms).toEqual(['語', '言']);

    const vs = parseAdvancedSearchQuery('開く vs 開ける');
    expect(vs.compareTerms).toEqual(['開く', '開ける']);
  });

  it('executes searchOfflineAdvanced with exclusions, sotoUchi, transitivity, comparePair, and relatedQueries', async () => {
    await localDb.meta.put({ key: 'datasetVersion', value: '2026-11-phase2-v3' });
    await localDb.kanjis.bulkPut([
      makeKanjiForSearch('語', 'N5', 'mot, langue', {
        radical: '言',
        skipCode: '1-7-7',
        strokes: 14,
        sotoUchi: 'soto',
        synonyms: ['言', '話'],
        frequencyScore10: 9,
      }),
      makeKanjiForSearch('言', 'N5', 'dire, parole', {
        radical: '言',
        skipCode: '4-7-1',
        strokes: 7,
        sotoUchi: 'uchi',
        frequencyScore10: 10,
      }),
    ]);

    await localDb.jukugo.bulkPut([
      {
        word: '閉まる',
        reading: 'しまる',
        meaning_en: 'to close (intransitive)',
        frequency: 500,
        grammaticalFeature: 'verb',
        jlpt: 'N4',
        transitivity: 'jidoushi',
        kanjiCount: 1,
        frequencyScore10: 8,
      },
      {
        word: '閉める',
        reading: 'しめる',
        meaning_en: 'to close something (transitive)',
        frequency: 520,
        grammaticalFeature: 'verb',
        jlpt: 'N5',
        transitivity: 'tadoushi',
        kanjiCount: 1,
        frequencyScore10: 9,
      },
    ]);

    const sotoRes = await searchOfflineAdvanced('only:kanji reg:soto');
    expect(sotoRes.hits.map((h) => h.title)).toEqual(['語']);
    expect(sotoRes.relatedQueries.length).toBeGreaterThan(0);

    const excludedRes = await searchOfflineAdvanced('only:kanji -語');
    expect(excludedRes.hits.some((h) => h.title === '語')).toBe(false);
    expect(excludedRes.hits.some((h) => h.title === '言')).toBe(true);

    const jidoushiRes = await searchOfflineAdvanced('trans:jidoushi');
    expect(jidoushiRes.hits.some((h) => h.title === '閉まる')).toBe(true);
    expect(jidoushiRes.hits.some((h) => h.title === '閉める')).toBe(false);

    const compareRes = await searchOfflineAdvanced('comparer 語 言');
    expect(compareRes.comparePair?.[0]?.title).toBe('語');
    expect(compareRes.comparePair?.[1]?.title).toBe('言');
  });

  it('computes global Jukugo stats and post-quiz SMART goals & renders UI cards', () => {
    const jStats = computeJukugoGlobalStats(
      [
        {
          word: '言語',
          reading: 'げんご',
          meaning_en: 'language',
          frequency: 900,
          grammaticalFeature: 'noun',
          jlpt: 'N4',
          kanjiCount: 2,
          transitivity: 'none',
        },
        {
          word: '大学生',
          reading: 'だいがくせい',
          meaning_en: 'student',
          frequency: 850,
          grammaticalFeature: 'noun',
          jlpt: 'N5',
          kanjiCount: 3,
          transitivity: 'jidoushi',
        },
        {
          word: '国際会議',
          reading: 'こくさいかいぎ',
          meaning_en: 'conference',
          frequency: 400,
          grammaticalFeature: 'noun',
          jlpt: 'N0',
          kanjiCount: 4,
          transitivity: 'tadoushi',
        },
      ],
      [
        {
          cardId: 'jukugo:言語',
          itemType: 'JUKUGO',
          itemKey: '言語',
          level: 'N4',
          prompt: '言語',
          reading: 'げんご',
          answer: 'language',
          easeFactor: 2.5,
          intervalDays: 10,
          repetitions: 4,
          lapses: 0,
          errorCount: 0,
          dueAt: new Date().toISOString(),
        },
      ]
    );

    expect(jStats.totalJukugo).toBe(3);
    expect(jStats.studiedCount).toBe(1);
    expect(jStats.masteredCount).toBe(1);
    expect(jStats.byLength).toEqual({ len2: 1, len3: 1, len4Plus: 1 });
    expect(jStats.byLevel.N0).toBe(1);
    expect(jStats.transitivity).toEqual({ jidoushi: 1, tadoushi: 1 });

    const weakGoal = buildPostQuizSmartGoal({
      contextLabel: 'Lectures Kanji',
      level: 'N4',
      accuracyPct: 40,
      missedCount: 6,
    });
    expect(weakGoal.tier).toBe('consolidate');
    expect(weakGoal.href).toBe('/practice?mode=srs_review');

    const strongGoal = buildPostQuizSmartGoal({
      contextLabel: 'Lectures Kanji',
      level: 'N3',
      accuracyPct: 92,
      missedCount: 1,
    });
    expect(strongGoal.tier).toBe('advance');
    expect(strongGoal.href).toBe('/reader');

    render(<PostQuizSmartGoalCard goal={weakGoal} />);
    expect(screen.getByText(weakGoal.title)).toBeTruthy();

    render(<RecommendedLinksTool />);
    expect(screen.getByText('Jisho.org')).toBeTruthy();
    expect(screen.getByText('KanjiVG (Tracés vectoriels SVG)')).toBeTruthy();
  });

  it('builds complete 15-form conjugation paradigms across Ichidan, Godan, and Irregular', () => {
    const ichidan = buildFullConjugationParadigm('食べる', 'ichidan');
    expect(ichidan.rows).toHaveLength(15);
    expect(ichidan.rows.find((r) => r.key === 'potential')?.form).toBe('食べられる');
    expect(ichidan.rows.find((r) => r.key === 'causative')?.form).toBe('食べさせる');
    expect(ichidan.rows.find((r) => r.key === 'volitional')?.form).toBe('食べよう');

    const iku = buildFullConjugationParadigm('行く', 'godan');
    expect(iku.rows.find((r) => r.key === 'te')?.form).toBe('行って');
    expect(iku.rows.find((r) => r.key === 'potential')?.form).toBe('行ける');
    expect(iku.rows.find((r) => r.key === 'volitional')?.form).toBe('行こう');

    const kaeru = buildFullConjugationParadigm('帰る');
    expect(kaeru.group).toBe('godan');
    expect(kaeru.rows.find((r) => r.key === 'polite')?.form).toBe('帰ります');

    const suru = buildFullConjugationParadigm('する', 'irregular');
    expect(suru.rows.find((r) => r.key === 'potential')?.form).toBe('できる');
    expect(suru.rows.find((r) => r.key === 'volitional')?.form).toBe('しよう');
  });
});
