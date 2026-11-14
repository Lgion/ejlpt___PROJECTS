import { describe, expect, it, vi, afterEach } from 'vitest';
import { localDb, seedLocalDatabase } from '@/lib/db';
import { resetSearchIndex, searchOffline } from '@/lib/search';

describe('seedLocalDatabase & searchOffline', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetSearchIndex();
  });

  it('normalizes mixed array columns during hydration and indexes FlexSearch + WanaKana', async () => {
    const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('kanjiDatabase_unified.json')) {
        return new Response(
          JSON.stringify({
            schema: [
              'kanji',
              'uuid',
              'jlpt',
              'grade',
              'strokes',
              'radical',
              'radical_name_en',
              'category',
              'subCategory',
              'classification',
              'skipCode',
              'compositionsSKIP',
              'on_readings',
              'kun_readings',
              'nanori',
              'meanings_fr',
              'meanings_en',
              'rtk_keyword_6th',
              'frequencies',
              'synonyms',
              'antonyms',
              'homonyms',
              'startingW',
              'endingW',
              'encodage',
              'kanjidb_extra',
              'similar',
              'variants',
            ],
            data: [
              [
                '語',
                'u1',
                'N5',
                2,
                14,
                '言',
                'speech',
                'communication',
                'langue',
                'keisei',
                '1-7-7',
                [],
                ['ゴ'],
                ['かた.る'],
                [],
                ['mot', 'langue'],
                ['word', 'language'],
                'word',
                {},
                [],
                [],
                [],
                ['語学'],
                ['日本語'],
                { unicode: '8a9e', utf8: 'e8aa9e' },
                {},
                [],
                [],
              ],
            ],
          })
        );
      }
      if (url.includes('grammar_unified.json')) {
        return new Response(
          JSON.stringify({
            schema: {
              term: 'string',
              reading: 'string',
              category: 'string',
              jlpt_level: 'string',
              connections: 'array',
              meaning: 'string',
              explanation: 'string',
              examples: 'array',
              source: 'string',
            },
            data: [
              ['食べるな', 'たべるな', 'bunpou', 'N4', ['V辞書形 + な'], 'ne pas manger', 'interdiction', [], 'DOJG'],
            ],
          })
        );
      }
      if (url.includes('slang_unified.json')) {
        return new Response(
          JSON.stringify({
            schema: {
              term: 'string',
              readings: 'array',
              type: 'array',
              meaning: 'array',
              example: 'array',
              note: 'array',
              link: 'string',
              category: 'string',
            },
            // Intentionally store a raw string for readings on row 0 to validate normalization
            data: [['草', 'くさ', ['noun'], ['lol / hilarious'], [], [], '', 'slang']],
          })
        );
      }
      if (url.includes('onomatopoeia_unified.json')) {
        return new Response(
          JSON.stringify({
            schema: {
              term: 'string',
              shortDefinitions: 'array',
              extendedDefinition: 'string',
              examples: 'array',
              sourceUrl: 'string',
              category: 'string',
            },
            data: [['どきどき', ['cœur qui bat fort'], 'battement rapide', [], '', 'onomatopoeia']],
          })
        );
      }
      if (url.includes('jukugo_unified.json')) {
        return new Response(
          JSON.stringify({
            schema: ['word', 'reading', 'meaning_en', 'frequency', 'grammaticalFeature'],
            data: [['日本語', 'にほんご', 'Japanese language', 999, 'noun']],
          })
        );
      }
      return new Response('{}', { status: 404 });
    });

    vi.stubGlobal('fetch', mockFetch);
    resetSearchIndex();

    await seedLocalDatabase();

    const slangRows = await localDb.slang.toArray();
    expect(slangRows).toHaveLength(1);
    expect(Array.isArray(slangRows[0].readings)).toBe(true);
    expect(slangRows[0].readings).toEqual(['くさ']);

    const kanjiHits = await searchOffline('語', 10);
    expect(kanjiHits.some((h) => h.kind === 'KANJI' && h.title === '語')).toBe(true);

    // Cross-kana lookup: Katakana "ドキ" -> Hiragana "どきどき"
    const onoHits = await searchOffline('ドキ', 10);
    expect(onoHits.some((h) => h.kind === 'ONOMATOPOEIA' && h.title === 'どきどき')).toBe(true);

    // Romaji -> Kana lookup via WanaKana
    const slangHits = await searchOffline('kusa', 10);
    expect(slangHits.some((h) => h.kind === 'SLANG' && h.title === '草')).toBe(true);
  });
});

