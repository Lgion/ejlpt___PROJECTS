import Dexie, { Table } from 'dexie';

export type JLPTLevelNormalized = 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'N0';

export interface UnifiedKanjiRecord {
  kanji: string;
  uuid: string;
  jlpt: JLPTLevelNormalized;
  grade: number | string;
  strokes: number | null;
  radical: string; // Kangxi character U+2F00..U+2FD5
  radical_name_en: string;
  category: string;
  subCategory: string;
  classification: string;
  skipCode: string;
  compositionsSKIP: string[];
  nelson?: number | null;
  on_readings: string[];
  kun_readings: string[];
  nanori: string[];
  meanings_fr: string[];
  meanings_en: string[];
  rtk_5th?: number | null;
  rtk_6th?: number | null;
  rtk_keyword_5th?: string;
  rtk_keyword_6th?: string;
  rtk_components?: string;
  wanikani_level?: number | null;
  frequencies: {
    aozora?: number;
    news?: number;
    twitter?: number;
    wikipedia?: number;
    innocent_rank?: number;
    innocent_count?: number;
  };
  isVerbe: 'false' | 'irregulier' | 'ichidan' | 'godan';
  isAdj: 'false' | 'i' | 'na' | 'no';
  dualisme: -1 | 0 | 1;
  isKeigo: [boolean, boolean];
  isProperName: boolean;
  isSetsuzokushi: boolean;
  isKandoushi: boolean;
  isPronoun: string;
  type: string;
  synonyms: string[];
  antonyms: string[];
  homonyms: string[];
  startingW: string[];
  endingW: string[];
  encodage: {
    unicode: string;
    utf8: string;
    jis?: string;
    euc?: string;
    sjis?: string;
  };
  kanjidb_extra: Record<string, unknown>;
  similar: string[];
  variants: string[];
}

export interface GrammarExample {
  jp: string;
  translation: string;
}

export interface GrammarRecord {
  id?: number;
  term: string;
  reading: string;
  category: string;
  jlpt_level: string;
  connections: string[];
  meaning: string;
  explanation: string;
  examples: GrammarExample[];
  source?: string;
}

export interface SlangRecord {
  id?: number;
  term: string;
  readings: string[];
  type: string[];
  meaning: string[];
  example: string[];
  note: string[];
  link?: string;
  category?: string;
}

export interface OnomatopoeiaRecord {
  id?: number;
  term: string;
  shortDefinitions: string[];
  extendedDefinition: string;
  examples: string[];
  sourceUrl?: string;
  category: string;
}

export interface JukugoRecord {
  id?: number;
  word: string;
  reading: string;
  meaning_en: string;
  frequency: number;
  grammaticalFeature: string;
}

export interface MetaRecord {
  key: string;
  value: string;
}

export type SyncFlag = 0 | 1;

export interface LocalExamAttempt {
  id?: number;
  attemptId: string;
  userId?: string;
  userEmail?: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  mode: 'FULL_MOCK' | 'SECTION_PRACTICE';
  sectionFilter?: 'moji_go' | 'bunpou_dokkai' | 'choukai';
  title: string;
  scoreTotal: number;
  maxScoreTotal: number;
  scoreMojiGo: number;
  scoreBunpouDokkai: number;
  scoreChoukai: number;
  passed: boolean;
  userAnswers: Record<string, string>;
  timeSpentSeconds: number;
  createdAt: string;
  isSynced: SyncFlag;
}

export interface LocalBookmark {
  id?: number;
  bookmarkId: string;
  userId?: string;
  type: 'KANJI' | 'VOCAB' | 'GRAMMAR' | 'QUESTION';
  kanjiOrWord: string;
  reading?: string;
  meaning: string;
  level: string;
  notes?: string;
  createdAt: string;
  isSynced: SyncFlag;
}

export interface LocalSyncItem {
  id?: number;
  action: 'SAVE_ATTEMPT' | 'SAVE_BOOKMARK' | 'DELETE_BOOKMARK';
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface SRSCardRecord {
  cardId: string;
  itemType: 'KANJI' | 'GRAMMAR' | 'JUKUGO' | 'QUESTION';
  itemKey: string;
  level: string;
  prompt: string;
  reading?: string;
  answer: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  errorCount: number;
  dueAt: string;
  lastReviewedAt?: string;
}

interface RawSchemaDataset {
  schema: string[] | Record<string, string>;
  data: unknown[][];
}

const CURRENT_DATASET_VERSION = '2026-11-lot3-v2';

export class EJLPTDatabase extends Dexie {
  kanjis!: Table<UnifiedKanjiRecord, string>;
  grammar!: Table<GrammarRecord, number>;
  slang!: Table<SlangRecord, number>;
  onomatopoeia!: Table<OnomatopoeiaRecord, number>;
  jukugo!: Table<JukugoRecord, number>;
  meta!: Table<MetaRecord, string>;
  attempts!: Table<LocalExamAttempt>;
  bookmarks!: Table<LocalBookmark>;
  syncQueue!: Table<LocalSyncItem>;
  srsCards!: Table<SRSCardRecord, string>;

  constructor() {
    super('eJLPT_LocalDB');
    const storesSchemaV2V3 = {
      kanjis: '&kanji, jlpt, radical, category, subCategory, rtk_6th, wanikani_level',
      grammar: '++id, term, jlpt_level, category',
      slang: '++id, term',
      attempts: '++id, attemptId, userId, level, mode, passed, isSynced, createdAt',
      bookmarks: '++id, bookmarkId, userId, type, level, kanjiOrWord, isSynced, createdAt',
      syncQueue: '++id, action, createdAt',
    };

    const storesSchemaV4 = {
      ...storesSchemaV2V3,
      grammar: '++id, term, jlpt_level, category, source',
      onomatopoeia: '++id, term',
      jukugo: '++id, &word, frequency',
      meta: '&key',
    };

    const storesSchemaV5 = {
      ...storesSchemaV4,
      srsCards: '&cardId, itemType, itemKey, level, dueAt, errorCount',
    };

    this.version(2).stores(storesSchemaV2V3);

    // IndexedDB cannot index booleans; normalize legacy boolean isSynced flags to 0 | 1.
    this.version(3)
      .stores(storesSchemaV2V3)
      .upgrade(async (tx) => {
        const normalizeSyncFlag = (item: { isSynced?: boolean | number }) => {
          item.isSynced = item.isSynced === true || item.isSynced === 1 ? 1 : 0;
        };
        await tx.table('attempts').toCollection().modify(normalizeSyncFlag);
        await tx.table('bookmarks').toCollection().modify(normalizeSyncFlag);
      });

    this.version(4).stores(storesSchemaV4);
    this.version(5).stores(storesSchemaV5);
  }
}

export const localDb = new EJLPTDatabase();

async function seedTableFromUrl<T, TKey>(
  table: Table<T, TKey>,
  url: string,
  label: string,
  forceRefresh = false
): Promise<boolean> {
  if (!forceRefresh) {
    const existingCount = await table.count();
    if (existingCount > 0) return true;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) return false;

    const json = (await res.json()) as RawSchemaDataset;
    const schemaKeys: string[] = Array.isArray(json.schema)
      ? json.schema
      : Object.keys(json.schema);

    const schemaTypes = Array.isArray(json.schema) ? null : json.schema;

    const records = json.data.map((row) => {
      const obj: Record<string, unknown> = {};
      schemaKeys.forEach((key, idx) => {
        const raw = row[idx];
        if (schemaTypes?.[key] === 'array') {
          obj[key] = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
        } else {
          obj[key] = raw;
        }
      });
      return obj as T;
    });

    if (forceRefresh) {
      await table.clear();
    }
    await table.bulkPut(records);
    console.log(`[Dexie] Successfully seeded ${records.length} ${label} entries.`);
    return true;
  } catch (err) {
    console.error(`[Dexie] Failed to seed ${label} database:`, err);
    return false;
  }
}

let activeSeedPromise: Promise<void> | null = null;

/**
 * Hydrates IndexedDB with unified local datasets on app initialization.
 * Refreshes reference tables automatically when CURRENT_DATASET_VERSION changes,
 * without touching user attempts, bookmarks, or syncQueue.
 */
export async function seedLocalDatabase(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (activeSeedPromise) return activeSeedPromise;

  activeSeedPromise = (async () => {
    try {
      const currentMeta = await localDb.meta.get('datasetVersion');
      const needsRefresh = currentMeta?.value !== CURRENT_DATASET_VERSION;

      const results = await Promise.all([
        seedTableFromUrl(localDb.kanjis, '/data/kanjiDatabase_unified.json', 'Kanji', needsRefresh),
        seedTableFromUrl(localDb.grammar, '/data/grammar_unified.json', 'Grammar', needsRefresh),
        seedTableFromUrl(localDb.slang, '/data/slang_unified.json', 'Slang', needsRefresh),
        seedTableFromUrl(
          localDb.onomatopoeia,
          '/data/onomatopoeia_unified.json',
          'Onomatopoeia',
          needsRefresh
        ),
        seedTableFromUrl(localDb.jukugo, '/data/jukugo_unified.json', 'Jukugo', needsRefresh),
      ]);

      if (needsRefresh && results.every(Boolean)) {
        await localDb.meta.put({ key: 'datasetVersion', value: CURRENT_DATASET_VERSION });
      }
    } finally {
      activeSeedPromise = null;
    }
  })();

  return activeSeedPromise;
}
