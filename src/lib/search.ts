import { Document } from 'flexsearch';
import { toHiragana, toKatakana } from 'wanakana';
import { localDb, seedLocalDatabase } from '@/lib/db';

export type SearchResultKind = 'KANJI' | 'GRAMMAR' | 'SLANG' | 'ONOMATOPOEIA' | 'JUKUGO';

export type SearchSortMode =
  | 'relevance'
  | 'freq_desc'
  | 'strokes_asc'
  | 'dualisme_pos'
  | 'dualisme_neg';

export interface GlobalSearchHit {
  id: string;
  kind: SearchResultKind;
  title: string;
  reading: string;
  meaning: string;
  level: string;
  href: string;
  bookmarkType: 'KANJI' | 'VOCAB' | 'GRAMMAR';
  frequencyScore10?: number;
  strokes?: number | null;
  skipCode?: string;
  radical?: string;
  sotoUchi?: string;
  transitivity?: string;
  dualisme?: number;
  isKeigo?: [boolean, boolean];
  relatedTerms?: string[];
}

export interface ParsedSearchQuery {
  raw: string;
  textQuery: string;
  onlyKinds: SearchResultKind[];
  onlyLevels: string[];
  excludeTerms: string[];
  skipPrefix?: string;
  radicalFilter?: string;
  sotoUchi?: 'soto' | 'uchi';
  transitivity?: 'jidoushi' | 'tadoushi';
  sortBy?: SearchSortMode;
  compareTerms?: [string, string];
}

export interface AdvancedSearchResponse {
  hits: GlobalSearchHit[];
  parsed: ParsedSearchQuery;
  comparePair?: [GlobalSearchHit | null, GlobalSearchHit | null];
  relatedQueries: string[];
}

interface SearchIndexDoc {
  id: string;
  kind: SearchResultKind;
  title: string;
  reading: string;
  meaning: string;
  level: string;
  href: string;
  bookmarkType: 'KANJI' | 'VOCAB' | 'GRAMMAR';
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

export function parseAdvancedSearchQuery(raw: string): ParsedSearchQuery {
  const trimmed = raw.trim();
  const parsed: ParsedSearchQuery = {
    raw,
    textQuery: '',
    onlyKinds: [],
    onlyLevels: [],
    excludeTerms: [],
  };

  if (!trimmed) return parsed;

  const compareMatch = trimmed.match(/^comparer\s+(\S+)\s+(\S+)$/i);
  if (compareMatch) {
    parsed.compareTerms = [compareMatch[1].trim(), compareMatch[2].trim()];
    return parsed;
  }

  const vsMatch = trimmed.match(/^(\S+)\s+vs\s+(\S+)$/i);
  if (vsMatch) {
    parsed.compareTerms = [vsMatch[1].trim(), vsMatch[2].trim()];
    return parsed;
  }

  const freeTokens: string[] = [];
  for (const tok of trimmed.split(/\s+/)) {
    const lower = tok.toLowerCase();

    if (lower.startsWith('only:')) {
      const val = lower.slice(5);
      if (val === 'kanji' || val === 'kanjis') parsed.onlyKinds.push('KANJI');
      else if (val === 'grammar' || val === 'grammaire') parsed.onlyKinds.push('GRAMMAR');
      else if (val === 'jukugo' || val === 'vocab') parsed.onlyKinds.push('JUKUGO');
      else if (val === 'slang') parsed.onlyKinds.push('SLANG');
      else if (val === 'ono' || val === 'onomatopoeia' || val === 'onomatopee') {
        parsed.onlyKinds.push('ONOMATOPOEIA');
      } else if (/^n[0-5]$/.test(val)) {
        parsed.onlyLevels.push(val.toUpperCase());
      }
      continue;
    }

    if (lower.startsWith('skip:')) {
      const val = tok.slice(5).trim();
      if (val) parsed.skipPrefix = val;
      continue;
    }

    if (lower.startsWith('radical:')) {
      const val = tok.slice(8).trim();
      if (val) parsed.radicalFilter = val.toLowerCase();
      continue;
    }

    if (lower === 'reg:soto' || lower === 'soto:') {
      parsed.sotoUchi = 'soto';
      continue;
    }
    if (lower === 'reg:uchi' || lower === 'uchi:') {
      parsed.sotoUchi = 'uchi';
      continue;
    }

    if (lower === 'trans:jidoushi' || tok === '自動' || tok === '自動詞') {
      parsed.transitivity = 'jidoushi';
      continue;
    }
    if (lower === 'trans:tadoushi' || tok === '他動' || tok === '他動詞') {
      parsed.transitivity = 'tadoushi';
      continue;
    }

    if (lower === 'sort:freq') {
      parsed.sortBy = 'freq_desc';
      continue;
    }
    if (lower === 'sort:strokes') {
      parsed.sortBy = 'strokes_asc';
      continue;
    }
    if (lower === 'sort:dualisme+') {
      parsed.sortBy = 'dualisme_pos';
      continue;
    }
    if (lower === 'sort:dualisme-') {
      parsed.sortBy = 'dualisme_neg';
      continue;
    }

    if (tok.startsWith('-') && tok.length > 1) {
      parsed.excludeTerms.push(tok.slice(1).toLowerCase());
      continue;
    }

    freeTokens.push(tok);
  }

  parsed.textQuery = freeTokens.join(' ').trim();
  return parsed;
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
      const relatedTerms = Array.from(
        new Set([...k.synonyms, ...k.antonyms, ...k.similar].filter(Boolean))
      ).slice(0, 6);

      const hit: GlobalSearchHit = {
        id,
        kind: 'KANJI',
        title: k.kanji,
        reading,
        meaning,
        level: k.jlpt,
        href: `/kanji?q=${encodeURIComponent(k.kanji)}`,
        bookmarkType: 'KANJI',
        frequencyScore10: k.frequencyScore10,
        strokes: k.strokes,
        skipCode: k.skipCode,
        radical: k.radical,
        sotoUchi: k.sotoUchi,
        dualisme: k.dualisme,
        isKeigo: k.isKeigo,
        relatedTerms,
      };
      docMap.set(id, hit);
      index.add({
        id,
        kind: hit.kind,
        title: hit.title,
        reading: hit.reading,
        meaning: hit.meaning,
        level: hit.level,
        href: hit.href,
        bookmarkType: hit.bookmarkType,
        keywords: `${k.rtk_keyword_6th || ''} ${en.join(' ')} ${k.category} ${k.radical_name_en} ${k.skipCode || ''} ${(k.themes || []).join(' ')}`,
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
        id,
        kind: hit.kind,
        title: hit.title,
        reading: hit.reading,
        meaning: hit.meaning,
        level: hit.level,
        href: hit.href,
        bookmarkType: hit.bookmarkType,
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
        id,
        kind: hit.kind,
        title: hit.title,
        reading: hit.reading,
        meaning: hit.meaning,
        level: hit.level,
        href: hit.href,
        bookmarkType: hit.bookmarkType,
        keywords: `${typeArr.join(' ')} ${noteArr.join(' ')} ${s.era || ''}`,
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
        relatedTerms: o.oppositeTerms?.slice(0, 3),
      };
      docMap.set(id, hit);
      index.add({
        id,
        kind: hit.kind,
        title: hit.title,
        reading: hit.reading,
        meaning: hit.meaning,
        level: hit.level,
        href: hit.href,
        bookmarkType: hit.bookmarkType,
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
        level: j.jlpt || 'Jukugo',
        href: `/kanji?q=${encodeURIComponent(j.word.charAt(0))}`,
        bookmarkType: 'VOCAB',
        frequencyScore10: j.frequencyScore10,
        transitivity: j.transitivity,
      };
      docMap.set(id, hit);
      index.add({
        id,
        kind: hit.kind,
        title: hit.title,
        reading: hit.reading,
        meaning: hit.meaning,
        level: hit.level,
        href: hit.href,
        bookmarkType: hit.bookmarkType,
        keywords: `${j.grammaticalFeature || ''} ${j.pos || ''} ${j.transitivity || ''}`,
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

function findSingleCompareHit(term: string): GlobalSearchHit | null {
  const clean = term.trim();
  if (!clean) return null;
  const direct =
    cachedDocMap.get(`kanji:${clean}`) ||
    cachedDocMap.get(`jukugo:${clean}`) ||
    Array.from(cachedDocMap.values()).find(
      (doc) => doc.title === clean || doc.reading === clean
    );
  if (direct) return direct;

  return (
    Array.from(cachedDocMap.values()).find(
      (doc) => doc.title.includes(clean) || doc.meaning.toLowerCase().includes(clean.toLowerCase())
    ) || null
  );
}

function matchesFilterPredicates(
  hit: GlobalSearchHit,
  parsed: ParsedSearchQuery,
  options: {
    kindFilter?: 'ALL' | SearchResultKind;
    sotoUchi?: 'ALL' | 'soto' | 'uchi';
    transitivity?: 'ALL' | 'jidoushi' | 'tadoushi';
  }
): boolean {
  if (options.kindFilter && options.kindFilter !== 'ALL' && hit.kind !== options.kindFilter) {
    return false;
  }
  if (parsed.onlyKinds.length > 0 && !parsed.onlyKinds.includes(hit.kind)) {
    return false;
  }
  if (parsed.onlyLevels.length > 0 && !parsed.onlyLevels.includes(hit.level.toUpperCase())) {
    return false;
  }
  if (parsed.skipPrefix && !(hit.skipCode || '').startsWith(parsed.skipPrefix)) {
    return false;
  }
  if (parsed.radicalFilter) {
    const r = (hit.radical || '').toLowerCase();
    if (!r || !r.includes(parsed.radicalFilter)) return false;
  }

  const effectiveSoto = parsed.sotoUchi || (options.sotoUchi && options.sotoUchi !== 'ALL' ? options.sotoUchi : undefined);
  if (effectiveSoto && hit.sotoUchi !== effectiveSoto) {
    return false;
  }

  const effectiveTrans =
    parsed.transitivity ||
    (options.transitivity && options.transitivity !== 'ALL' ? options.transitivity : undefined);
  if (effectiveTrans && hit.transitivity !== effectiveTrans) {
    return false;
  }

  if (parsed.excludeTerms.length > 0) {
    const blob = `${hit.title} ${hit.reading} ${hit.meaning} ${hit.level} ${hit.kind}`.toLowerCase();
    for (const ex of parsed.excludeTerms) {
      if (blob.includes(ex)) return false;
    }
  }

  return true;
}

export async function searchOfflineAdvanced(
  rawQuery: string,
  options: {
    limit?: number;
    kindFilter?: 'ALL' | SearchResultKind;
    sortBy?: SearchSortMode;
    sotoUchi?: 'ALL' | 'soto' | 'uchi';
    transitivity?: 'ALL' | 'jidoushi' | 'tadoushi';
  } = {}
): Promise<AdvancedSearchResponse> {
  const parsed = parseAdvancedSearchQuery(rawQuery);
  const limit = options.limit ?? 24;
  const hasOperators =
    parsed.onlyKinds.length > 0 ||
    parsed.onlyLevels.length > 0 ||
    Boolean(parsed.skipPrefix) ||
    Boolean(parsed.radicalFilter) ||
    Boolean(parsed.sotoUchi) ||
    Boolean(parsed.transitivity) ||
    Boolean(parsed.compareTerms) ||
    (options.sotoUchi && options.sotoUchi !== 'ALL') ||
    (options.transitivity && options.transitivity !== 'ALL');

  if (!parsed.textQuery && !hasOperators) {
    return { hits: [], parsed, relatedQueries: [] };
  }

  const index = await ensureSearchIndex();
  let comparePair: [GlobalSearchHit | null, GlobalSearchHit | null] | undefined;

  if (parsed.compareTerms) {
    const left = findSingleCompareHit(parsed.compareTerms[0]);
    const right = findSingleCompareHit(parsed.compareTerms[1]);
    comparePair = [left, right];
  }

  const scoredIds = new Map<string, number>();

  if (parsed.textQuery) {
    const queries = new Set<string>([
      parsed.textQuery,
      toHiragana(parsed.textQuery),
      toKatakana(parsed.textQuery),
    ]);
    const fetchPoolLimit = Math.max(limit * 3, 60);

    for (const q of queries) {
      const fieldResults = index.search(q, { limit: fetchPoolLimit });
      for (const fieldBucket of fieldResults) {
        const ids = fieldBucket.result;
        ids.forEach((id, rank) => {
          const key = String(id);
          const hit = cachedDocMap.get(key);
          if (!hit) return;

          let bonus = Math.max(1, fetchPoolLimit - rank);
          if (hit.title === parsed.textQuery || hit.title === q) bonus += 100;
          else if (hit.title.includes(parsed.textQuery) || hit.reading.includes(q)) bonus += 35;

          const prev = scoredIds.get(key) || 0;
          if (bonus > prev) scoredIds.set(key, bonus);
        });
      }
    }
  } else {
    // Structured operator scan
    for (const [id, hit] of cachedDocMap.entries()) {
      scoredIds.set(id, hit.frequencyScore10 ?? 5);
    }
  }

  const candidates = Array.from(scoredIds.entries())
    .map(([id, score]) => ({ hit: cachedDocMap.get(id), score }))
    .filter((entry): entry is { hit: GlobalSearchHit; score: number } =>
      Boolean(entry.hit && matchesFilterPredicates(entry.hit, parsed, options))
    );

  const effectiveSort: SearchSortMode = parsed.sortBy || options.sortBy || 'relevance';
  candidates.sort((a, b) => {
    if (effectiveSort === 'freq_desc') {
      return (b.hit.frequencyScore10 ?? 0) - (a.hit.frequencyScore10 ?? 0) || b.score - a.score;
    }
    if (effectiveSort === 'strokes_asc') {
      const sa = typeof a.hit.strokes === 'number' ? a.hit.strokes : 99;
      const sb = typeof b.hit.strokes === 'number' ? b.hit.strokes : 99;
      return sa - sb || b.score - a.score;
    }
    if (effectiveSort === 'dualisme_pos') {
      return (b.hit.dualisme ?? 0) - (a.hit.dualisme ?? 0) || b.score - a.score;
    }
    if (effectiveSort === 'dualisme_neg') {
      return (a.hit.dualisme ?? 0) - (b.hit.dualisme ?? 0) || b.score - a.score;
    }
    return b.score - a.score;
  });

  const hits = candidates.slice(0, limit).map((c) => c.hit);

  const relatedSet = new Set<string>();
  for (const h of hits.slice(0, 5)) {
    for (const rel of h.relatedTerms || []) {
      if (rel && rel !== h.title) relatedSet.add(rel);
    }
    if (h.radical && h.radical !== h.title) {
      relatedSet.add(`radical:${h.radical}`);
    }
  }

  return {
    hits,
    parsed,
    comparePair,
    relatedQueries: Array.from(relatedSet).slice(0, 8),
  };
}

/**
 * Search across local Dexie dictionaries (Kanji, Grammar, Jukugo, Slang, Onomatopoeia)
 * using FlexSearch + WanaKana romaji-to-kana normalization.
 */
export async function searchOffline(rawQuery: string, limit = 24): Promise<GlobalSearchHit[]> {
  const res = await searchOfflineAdvanced(rawQuery, { limit });
  return res.hits;
}
