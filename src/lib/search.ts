import { Document } from 'flexsearch';
import { toHiragana, toKatakana } from 'wanakana';
import { localDb, seedLocalDatabase } from '@/lib/db';

export type SearchResultKind = 'KANJI' | 'GRAMMAR' | 'SLANG' | 'ONOMATOPOEIA' | 'JUKUGO';

export interface GlobalSearchHit {
  id: string;
  kind: SearchResultKind;
  title: string;
  reading: string;
  meaning: string;
  level: string;
  href: string;
  bookmarkType: 'KANJI' | 'VOCAB' | 'GRAMMAR';
}

interface SearchIndexDoc extends GlobalSearchHit {
  keywords: string;
  [key: string]: string;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function japaneseTokenizer(text: string): string[] {
  const lower = text.toLowerCase();
  const latinWords = lower.split(/[\s,.;:!?()/「」【】、。・〜~]+/).filter(Boolean);
  const cjkChars = lower.match(/[\u3040-\u30ff\u4e00-\u9faf]/g) || [];
  return [...latinWords, ...cjkChars];
}

let cachedIndex: Document<SearchIndexDoc> | null = null;
let cachedDocMap = new Map<string, GlobalSearchHit>();
let activeBuildPromise: Promise<Document<SearchIndexDoc>> | null = null;

export function resetSearchIndex(): void {
  cachedIndex = null;
  cachedDocMap.clear();
  activeBuildPromise = null;
}

async function ensureSearchIndex(): Promise<Document<SearchIndexDoc>> {
  if (cachedIndex) return cachedIndex;
  if (activeBuildPromise) return activeBuildPromise;

  activeBuildPromise = (async () => {
    await seedLocalDatabase();

    const docMap = new Map<string, GlobalSearchHit>();
    const index = new Document<SearchIndexDoc>({
      tokenize: 'forward',
      encoder: japaneseTokenizer,
      document: {
        id: 'id',
        index: ['title', 'reading', 'meaning', 'keywords'],
      },
    });

    const [kanjis, grammar, slang, onomatopoeia, jukugo] = await Promise.all([
      localDb.kanjis.toArray(),
      localDb.grammar.toArray(),
      localDb.slang.toArray(),
      localDb.onomatopoeia.toArray(),
      localDb.jukugo.orderBy('frequency').reverse().limit(6000).toArray(),
    ]);

    for (const k of kanjis) {
      const id = `kanji:${k.kanji}`;
      const reading = [...k.kun_readings, ...k.on_readings].join(', ');
      const fr = k.meanings_fr.filter((m) => m && m !== '-');
      const en = k.meanings_en.filter((m) => m && m !== '-');
      const meaning = (fr.length > 0 ? fr : en).slice(0, 4).join(', ');
      const hit: GlobalSearchHit = {
        id,
        kind: 'KANJI',
        title: k.kanji,
        reading,
        meaning,
        level: k.jlpt,
        href: `/kanji?q=${encodeURIComponent(k.kanji)}`,
        bookmarkType: 'KANJI',
      };
      docMap.set(id, hit);
      index.add({
        ...hit,
        keywords: `${k.rtk_keyword_6th || ''} ${en.join(' ')} ${k.category} ${k.radical_name_en}`,
      });
    }

    for (const g of grammar) {
      const id = `grammar:${g.id ?? g.term}:${g.source || ''}`;
      const hit: GlobalSearchHit = {
        id,
        kind: 'GRAMMAR',
        title: g.term,
        reading: g.reading || '',
        meaning: g.meaning,
        level: g.jlpt_level,
        href: `/grammar?q=${encodeURIComponent(g.term)}`,
        bookmarkType: 'GRAMMAR',
      };
      docMap.set(id, hit);
      index.add({
        ...hit,
        keywords: `${g.connections.join(' ')} ${g.category} ${g.source || ''}`,
      });
    }

    for (const s of slang) {
      const id = `slang:${s.id ?? s.term}`;
      const readingsArr = asStringArray(s.readings);
      const meaningArr = asStringArray(s.meaning);
      const typeArr = asStringArray(s.type);
      const noteArr = asStringArray(s.note);
      const hit: GlobalSearchHit = {
        id,
        kind: 'SLANG',
        title: s.term,
        reading: readingsArr.join(', '),
        meaning: meaningArr.slice(0, 3).join('; '),
        level: 'Slang',
        href: `/slang?q=${encodeURIComponent(s.term)}`,
        bookmarkType: 'VOCAB',
      };
      docMap.set(id, hit);
      index.add({
        ...hit,
        keywords: `${typeArr.join(' ')} ${noteArr.join(' ')}`,
      });
    }

    for (const o of onomatopoeia) {
      const id = `ono:${o.id ?? o.term}`;
      const shortDefs = asStringArray(o.shortDefinitions);
      const examplesArr = asStringArray(o.examples);
      const hit: GlobalSearchHit = {
        id,
        kind: 'ONOMATOPOEIA',
        title: o.term,
        reading: o.term,
        meaning: shortDefs.slice(0, 2).join('; '),
        level: 'Mimétique',
        href: `/slang?tab=ono&q=${encodeURIComponent(o.term)}`,
        bookmarkType: 'VOCAB',
      };
      docMap.set(id, hit);
      index.add({
        ...hit,
        keywords: `${o.extendedDefinition || ''} ${examplesArr.join(' ')}`,
      });
    }

    for (const j of jukugo) {
      const id = `jukugo:${j.word}`;
      const hit: GlobalSearchHit = {
        id,
        kind: 'JUKUGO',
        title: j.word,
        reading: j.reading,
        meaning: j.meaning_en,
        level: 'Jukugo',
        href: `/kanji?q=${encodeURIComponent(j.word.charAt(0))}`,
        bookmarkType: 'VOCAB',
      };
      docMap.set(id, hit);
      index.add({
        ...hit,
        keywords: j.grammaticalFeature || '',
      });
    }

    cachedDocMap = docMap;
    cachedIndex = index;
    return index;
  })().finally(() => {
    activeBuildPromise = null;
  });

  return activeBuildPromise;
}

/**
 * Search across local Dexie dictionaries (Kanji, Grammar, Jukugo, Slang, Onomatopoeia)
 * using FlexSearch + WanaKana romaji-to-kana normalization.
 */
export async function searchOffline(rawQuery: string, limit = 24): Promise<GlobalSearchHit[]> {
  const trimmed = rawQuery.trim();
  if (!trimmed) return [];

  const index = await ensureSearchIndex();
  const queries = new Set<string>([trimmed, toHiragana(trimmed), toKatakana(trimmed)]);

  const scoredIds = new Map<string, number>();

  for (const q of queries) {
    const fieldResults = index.search(q, { limit });
    for (const fieldBucket of fieldResults) {
      const ids = fieldBucket.result;
      ids.forEach((id, rank) => {
        const key = String(id);
        const hit = cachedDocMap.get(key);
        if (!hit) return;

        // Boost exact prefix/character matches above partial hits
        let bonus = Math.max(1, limit - rank);
        if (hit.title === trimmed || hit.title === q) bonus += 100;
        else if (hit.title.includes(trimmed) || hit.reading.includes(q)) bonus += 35;

        const prev = scoredIds.get(key) || 0;
        if (bonus > prev) scoredIds.set(key, bonus);
      });
    }
  }

  return Array.from(scoredIds.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => cachedDocMap.get(id))
    .filter((item): item is GlobalSearchHit => Boolean(item));
}

