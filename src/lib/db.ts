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
  kanjidb_extra: Record<string, any>;
}

export interface GrammarRecord {
  id?: number;
  term: string;
  reading: string;
  category: string;
  jlpt_level: string;
  meaning: string;
  explanation: string;
  examples: { jp: string; en: string }[];
  source?: string;
}

export interface SlangRecord {
  id?: number;
  term: string;
  readings: string[];
  type: string[];
  meaning: string[];
  example: string[];
  note?: string;
  link?: string;
}

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
  isSynced: boolean;
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
  isSynced: boolean;
}

export interface LocalSyncItem {
  id?: number;
  action: 'SAVE_ATTEMPT' | 'SAVE_BOOKMARK';
  payload: any;
  createdAt: string;
}

export class EJLPTDatabase extends Dexie {
  kanjis!: Table<UnifiedKanjiRecord, string>;
  grammar!: Table<GrammarRecord, number>;
  slang!: Table<SlangRecord, number>;
  attempts!: Table<LocalExamAttempt>;
  bookmarks!: Table<LocalBookmark>;
  syncQueue!: Table<LocalSyncItem>;

  constructor() {
    super('eJLPT_LocalDB');
    this.version(2).stores({
      kanjis: '&kanji, jlpt, radical, category, subCategory, rtk_6th, wanikani_level',
      grammar: '++id, term, jlpt_level, category',
      slang: '++id, term',
      attempts: '++id, attemptId, userId, level, mode, passed, isSynced, createdAt',
      bookmarks: '++id, bookmarkId, userId, type, level, kanjiOrWord, isSynced, createdAt',
      syncQueue: '++id, action, createdAt',
    });
  }
}

export const localDb = new EJLPTDatabase();

/**
 * Hydrates IndexedDB with unified local datasets on app initialization.
 */
export async function seedLocalDatabase(): Promise<void> {
  if (typeof window === 'undefined') return;

  const countKanjis = await localDb.kanjis.count();
  if (countKanjis === 0) {
    try {
      const res = await fetch('/data/kanjiDatabase_unified.json');
      if (res.ok) {
        const json = await res.json();
        const schemaKeys: string[] = Array.isArray(json.schema) ? json.schema : Object.keys(json.schema);
        const dataRows: any[][] = json.data;

        const kanjiObjects: UnifiedKanjiRecord[] = dataRows.map((row) => {
          const obj: any = {};
          schemaKeys.forEach((key, idx) => {
            obj[key] = row[idx];
          });
          return obj as UnifiedKanjiRecord;
        });

        await localDb.kanjis.bulkPut(kanjiObjects);
        console.log(`[Dexie] Successfully seeded ${kanjiObjects.length} Kanjis to IndexedDB.`);
      }
    } catch (err) {
      console.error('[Dexie] Failed to seed Kanji database:', err);
    }
  }

  const countGrammar = await localDb.grammar.count();
  if (countGrammar === 0) {
    try {
      const res = await fetch('/data/grammar_unified.json');
      if (res.ok) {
        const json = await res.json();
        const schemaKeys: string[] = Array.isArray(json.schema) ? json.schema : Object.keys(json.schema);
        const dataRows: any[][] = json.data;
        const grammarObjects: GrammarRecord[] = dataRows.map((row) => {
          const obj: any = {};
          schemaKeys.forEach((key, idx) => {
            obj[key] = row[idx];
          });
          return obj as GrammarRecord;
        });

        await localDb.grammar.bulkPut(grammarObjects);
        console.log(`[Dexie] Successfully seeded ${grammarObjects.length} Grammar entries.`);
      }
    } catch (err) {
      console.error('[Dexie] Failed to seed Grammar database:', err);
    }
  }

  const countSlang = await localDb.slang.count();
  if (countSlang === 0) {
    try {
      const res = await fetch('/data/slang_unified.json');
      if (res.ok) {
        const json = await res.json();
        const schemaKeys: string[] = Array.isArray(json.schema) ? json.schema : Object.keys(json.schema);
        const dataRows: any[][] = json.data;
        const slangObjects: SlangRecord[] = dataRows.map((row) => {
          const obj: any = {};
          schemaKeys.forEach((key, idx) => {
            obj[key] = row[idx];
          });
          return obj as SlangRecord;
        });

        await localDb.slang.bulkPut(slangObjects);
        console.log(`[Dexie] Successfully seeded ${slangObjects.length} Slang terms.`);
      }
    } catch (err) {
      console.error('[Dexie] Failed to seed Slang database:', err);
    }
  }
}
