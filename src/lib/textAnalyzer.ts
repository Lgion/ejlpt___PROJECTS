import { localDb, seedLocalDatabase, type UnifiedKanjiRecord, type JukugoRecord, type GrammarRecord } from '@/lib/db';

export type TargetJLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
export type ReaderFuriganaMode = 'ALWAYS' | 'ADAPTIVE' | 'OFF';

export interface TextToken {
  text: string;
  kind: 'jukugo' | 'kanji' | 'text' | 'newline';
  reading?: string;
  meaning?: string;
  jlpt?: string;
  isMastered?: boolean;
}

export interface AnalyzedKanjiEntry {
  kanji: string;
  reading: string;
  meaning: string;
  jlpt: string;
  strokes: number | null;
  count: number;
}

export interface AnalyzedVocabEntry {
  word: string;
  reading: string;
  meaning: string;
  jlpt: string;
  count: number;
}

export interface AnalyzedGrammarHit {
  term: string;
  reading: string;
  jlpt_level: string;
  meaning: string;
}

export interface TextAnalysisResult {
  tokens: TextToken[];
  kanjiList: AnalyzedKanjiEntry[];
  vocabList: AnalyzedVocabEntry[];
  grammarHits: AnalyzedGrammarHit[];
  stats: {
    totalChars: number;
    kanjiOccurrences: number;
    uniqueKanjiCount: number;
    uniqueVocabCount: number;
    coverageByLevel: Record<string, number>;
    readablePercent: number;
  };
}

export interface AnalysisDictionaries {
  kanjiMap: Map<string, Pick<UnifiedKanjiRecord, 'kanji' | 'jlpt' | 'strokes' | 'on_readings' | 'kun_readings' | 'meanings_fr' | 'meanings_en'>>;
  jukugoMap: Map<string, Pick<JukugoRecord, 'word' | 'reading' | 'meaning_en'>>;
  grammarList: Array<Pick<GrammarRecord, 'term' | 'reading' | 'jlpt_level' | 'meaning'>>;
}

const JLPT_DIFFICULTY_RANK: Record<string, number> = {
  N5: 1,
  N4: 2,
  N3: 3,
  N2: 4,
  N1: 5,
  N0: 6,
};

const KANJI_REGEX = /[\u4e00-\u9faf\u3400-\u4dbf]/;

function firstMeaning(k: Pick<UnifiedKanjiRecord, 'meanings_fr' | 'meanings_en'>): string {
  const fr = (k.meanings_fr || []).filter((m) => m && m !== '-');
  if (fr.length > 0) return fr.slice(0, 2).join(', ');
  const en = (k.meanings_en || []).filter((m) => m && m !== '-');
  return en.slice(0, 2).join(', ');
}

function primaryKanjiReading(k: Pick<UnifiedKanjiRecord, 'kun_readings' | 'on_readings'>): string {
  if (k.kun_readings && k.kun_readings.length > 0) return k.kun_readings[0];
  if (k.on_readings && k.on_readings.length > 0) return k.on_readings[0];
  return '';
}

/**
 * Determines whether a token should display furigana given the user's target JLPT level
 * and mastered SRS items.
 */
export function shouldShowAdaptiveFurigana(
  tokenJlpt: string | undefined,
  targetLevel: TargetJLPTLevel,
  masteredKeys: Set<string>,
  tokenText: string,
  mode: ReaderFuriganaMode
): boolean {
  if (mode === 'OFF') return false;
  if (mode === 'ALWAYS') return true;
  if (masteredKeys.has(tokenText)) return false;

  const tokenRank = JLPT_DIFFICULTY_RANK[tokenJlpt || 'N0'] ?? 6;
  const targetRank = JLPT_DIFFICULTY_RANK[targetLevel] ?? 3;
  // Adaptive: hide readings for levels strictly easier than target level
  return tokenRank >= targetRank;
}

/**
 * Pure segmentation & cross-referencing analyzer for Japanese text.
 * Uses longest-match-first up to 5 chars against Jukugo dictionary, falling back to single Kanji.
 */
export function analyzeJapaneseTextPure(
  text: string,
  dicts: AnalysisDictionaries,
  options: { targetLevel: TargetJLPTLevel; masteredKeys?: Set<string> }
): TextAnalysisResult {
  const masteredKeys = options.masteredKeys || new Set<string>();
  const tokens: TextToken[] = [];
  const kanjiCounts = new Map<string, number>();
  const vocabCounts = new Map<string, AnalyzedVocabEntry>();
  const coverageByLevel: Record<string, number> = {
    N5: 0,
    N4: 0,
    N3: 0,
    N2: 0,
    N1: 0,
    N0: 0,
  };

  let plainBuffer = '';
  const flushPlain = () => {
    if (plainBuffer) {
      tokens.push({ text: plainBuffer, kind: 'text' });
      plainBuffer = '';
    }
  };

  const chars = Array.from(text);
  let i = 0;
  let kanjiOccurrences = 0;
  let readableKanjiOccurrences = 0;
  const targetRank = JLPT_DIFFICULTY_RANK[options.targetLevel] ?? 3;

  while (i < chars.length) {
    const ch = chars[i];
    if (ch === '\n') {
      flushPlain();
      tokens.push({ text: '\n', kind: 'newline' });
      i += 1;
      continue;
    }

    // Attempt longest Jukugo match (up to 5 chars) when current char is Kanji
    let matchedWord: Pick<JukugoRecord, 'word' | 'reading' | 'meaning_en'> | undefined;
    let matchedLen = 0;

    if (KANJI_REGEX.test(ch)) {
      const maxWin = Math.min(5, chars.length - i);
      for (let len = maxWin; len >= 2; len -= 1) {
        const slice = chars.slice(i, i + len).join('');
        const hit = dicts.jukugoMap.get(slice);
        if (hit) {
          matchedWord = hit;
          matchedLen = len;
          break;
        }
      }
    }

    if (matchedWord && matchedLen >= 2) {
      flushPlain();
      // Estimate JLPT level of the compound from its hardest constituent kanji
      let maxRank = 1;
      let wordJlpt = 'N5';
      for (const wc of Array.from(matchedWord.word)) {
        if (!KANJI_REGEX.test(wc)) continue;
        kanjiOccurrences += 1;
        kanjiCounts.set(wc, (kanjiCounts.get(wc) || 0) + 1);
        const kEntry = dicts.kanjiMap.get(wc);
        const lvl = kEntry?.jlpt || 'N0';
        coverageByLevel[lvl] = (coverageByLevel[lvl] || 0) + 1;
        const r = JLPT_DIFFICULTY_RANK[lvl] ?? 6;
        if (r > maxRank) {
          maxRank = r;
          wordJlpt = lvl;
        }
        if (r <= targetRank || masteredKeys.has(wc)) {
          readableKanjiOccurrences += 1;
        }
      }

      const prevVocab = vocabCounts.get(matchedWord.word);
      if (prevVocab) {
        prevVocab.count += 1;
      } else {
        vocabCounts.set(matchedWord.word, {
          word: matchedWord.word,
          reading: matchedWord.reading,
          meaning: matchedWord.meaning_en,
          jlpt: wordJlpt,
          count: 1,
        });
      }

      tokens.push({
        text: matchedWord.word,
        kind: 'jukugo',
        reading: matchedWord.reading,
        meaning: matchedWord.meaning_en,
        jlpt: wordJlpt,
        isMastered: masteredKeys.has(matchedWord.word),
      });
      i += matchedLen;
      continue;
    }

    if (KANJI_REGEX.test(ch)) {
      flushPlain();
      const kEntry = dicts.kanjiMap.get(ch);
      const lvl = kEntry?.jlpt || 'N0';
      const r = JLPT_DIFFICULTY_RANK[lvl] ?? 6;
      kanjiOccurrences += 1;
      kanjiCounts.set(ch, (kanjiCounts.get(ch) || 0) + 1);
      coverageByLevel[lvl] = (coverageByLevel[lvl] || 0) + 1;
      if (r <= targetRank || masteredKeys.has(ch)) {
        readableKanjiOccurrences += 1;
      }

      tokens.push({
        text: ch,
        kind: 'kanji',
        reading: kEntry ? primaryKanjiReading(kEntry) : undefined,
        meaning: kEntry ? firstMeaning(kEntry) : undefined,
        jlpt: lvl,
        isMastered: masteredKeys.has(ch),
      });
      i += 1;
      continue;
    }

    plainBuffer += ch;
    i += 1;
  }

  flushPlain();

  const kanjiList: AnalyzedKanjiEntry[] = Array.from(kanjiCounts.entries())
    .map(([kanji, count]) => {
      const k = dicts.kanjiMap.get(kanji);
      return {
        kanji,
        reading: k ? primaryKanjiReading(k) : '',
        meaning: k ? firstMeaning(k) : 'Kanji hors base JLPT',
        jlpt: k?.jlpt || 'N0',
        strokes: k?.strokes ?? null,
        count,
      };
    })
    .sort((a, b) => b.count - a.count);

  const vocabList = Array.from(vocabCounts.values()).sort((a, b) => b.count - a.count);

  // Detect grammar patterns appearing verbatim in text (length >= 2 to reduce false positives)
  const seenGrammar = new Set<string>();
  const grammarHits: AnalyzedGrammarHit[] = [];
  for (const g of dicts.grammarList) {
    const cleanTerm = g.term.replace(/[~〜()（）]/g, '').trim();
    if (cleanTerm.length < 2 || seenGrammar.has(cleanTerm)) continue;
    if (text.includes(cleanTerm)) {
      seenGrammar.add(cleanTerm);
      grammarHits.push({
        term: g.term,
        reading: g.reading,
        jlpt_level: g.jlpt_level,
        meaning: g.meaning,
      });
      if (grammarHits.length >= 25) break;
    }
  }

  const totalChars = chars.filter((c) => !/\s/.test(c)).length;
  const readablePercent =
    kanjiOccurrences > 0 ? Math.round((readableKanjiOccurrences / kanjiOccurrences) * 100) : 100;

  return {
    tokens,
    kanjiList,
    vocabList,
    grammarHits,
    stats: {
      totalChars,
      kanjiOccurrences,
      uniqueKanjiCount: kanjiList.length,
      uniqueVocabCount: vocabList.length,
      coverageByLevel,
      readablePercent,
    },
  };
}

let cachedDicts: AnalysisDictionaries | null = null;

async function getDictionaries(): Promise<AnalysisDictionaries> {
  if (cachedDicts) return cachedDicts;
  await seedLocalDatabase();

  const [kanjis, jukugo, grammar] = await Promise.all([
    localDb.kanjis.toArray(),
    localDb.jukugo.toArray(),
    localDb.grammar.toArray(),
  ]);

  const kanjiMap = new Map<string, UnifiedKanjiRecord>();
  for (const k of kanjis) {
    kanjiMap.set(k.kanji, k);
  }

  const jukugoMap = new Map<string, JukugoRecord>();
  for (const j of jukugo) {
    if (j.word.length >= 2) {
      jukugoMap.set(j.word, j);
    }
  }

  cachedDicts = {
    kanjiMap,
    jukugoMap,
    grammarList: grammar,
  };
  return cachedDicts;
}

export async function analyzeJapaneseText(
  text: string,
  targetLevel: TargetJLPTLevel
): Promise<TextAnalysisResult> {
  const [dicts, masteredCards] = await Promise.all([
    getDictionaries(),
    localDb.srsCards.filter((c) => c.repetitions >= 3 && c.intervalDays >= 6).toArray(),
  ]);

  const masteredKeys = new Set(masteredCards.map((c) => c.itemKey));
  return analyzeJapaneseTextPure(text, dicts, { targetLevel, masteredKeys });
}

