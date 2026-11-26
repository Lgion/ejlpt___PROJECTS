import type { UnifiedKanjiRecord } from '@/lib/db';

export type ScriptType =
  | 'hira_only'
  | 'kata_only'
  | 'mixed_hira_kata'
  | 'mixed_kanji'
  | 'mixed_romaji';

const KANJI_RE = /[\u4e00-\u9faf\u3400-\u4dbf]/;
const HIRA_RE = /[\u3040-\u309fー]/;
const KATA_RE = /[\u30a0-\u30ff]/;
const LATIN_RE = /[A-Za-z0-9]/;

export function computeKanjiFrequencyScore10(
  frequencies?: UnifiedKanjiRecord['frequencies']
): number {
  if (!frequencies) return 1;
  const ranks = [
    frequencies.news,
    frequencies.wikipedia,
    frequencies.twitter,
    frequencies.aozora,
    frequencies.innocent_rank,
  ].filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0);

  if (ranks.length === 0) return 1;
  const best = Math.min(...ranks);
  if (best <= 120) return 10;
  if (best <= 300) return 9;
  if (best <= 600) return 8;
  if (best <= 1000) return 7;
  if (best <= 1500) return 6;
  if (best <= 2200) return 5;
  if (best <= 3200) return 4;
  if (best <= 5000) return 3;
  if (best <= 9000) return 2;
  return 1;
}

export function computeJukugoFrequencyScore10(frequency?: number): number {
  const val = typeof frequency === 'number' && Number.isFinite(frequency) ? frequency : 0;
  if (val >= 250000) return 10;
  if (val >= 100000) return 9;
  if (val >= 40000) return 8;
  if (val >= 15000) return 7;
  if (val >= 6000) return 6;
  if (val >= 2500) return 5;
  if (val >= 1000) return 4;
  if (val >= 350) return 3;
  if (val >= 100) return 2;
  return 1;
}

export function classifyJapaneseScript(word: string): ScriptType {
  if (!word) return 'hira_only';
  if (LATIN_RE.test(word)) return 'mixed_romaji';
  if (KANJI_RE.test(word)) return 'mixed_kanji';
  const hasHira = HIRA_RE.test(word);
  const hasKata = KATA_RE.test(word);
  if (hasHira && hasKata) return 'mixed_hira_kata';
  if (hasKata) return 'kata_only';
  return 'hira_only';
}

export function computeSpriteCssStyle(params: {
  sheetUrl: string;
  index: number;
  cols: number;
  rows: number;
  displaySize: number;
}): {
  width: string;
  height: string;
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  backgroundRepeat: 'no-repeat';
} {
  const { sheetUrl, index, cols, rows, displaySize } = params;
  const safeCols = Math.max(1, cols);
  const safeRows = Math.max(1, rows);
  const col = index % safeCols;
  const row = Math.floor(index / safeCols);

  return {
    width: `${displaySize}px`,
    height: `${displaySize}px`,
    backgroundImage: `url(${sheetUrl})`,
    backgroundSize: `${safeCols * displaySize}px ${safeRows * displaySize}px`,
    backgroundPosition: `-${col * displaySize}px -${row * displaySize}px`,
    backgroundRepeat: 'no-repeat',
  };
}
