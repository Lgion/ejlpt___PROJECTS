import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  DEMO_SUBTITLE_VTT,
  extractPlainTextFromSubtitles,
  extractYouTubeVideoId,
  findActiveCueIndex,
  parseSubtitleFile,
} from '@/lib/subtitleParser';
import { buildQuizFromAnalysis } from '@/lib/readerQuizBuilder';
import { OPEN_SCRIPTS_LIBRARY } from '@/data/openScriptsLibrary';
import { MEMORIZE_SENTENCES, SHORT_STORIES_AND_SONGS } from '@/data/immersionCorpus';
import { KEYBOARD_TUTORIALS, MONOLINGUAL_TEXTS } from '@/data/monolingualAndKeyboards';
import { GAIRAIGO_ORAL_ITEMS, VISUAL_SCENARIOS } from '@/data/imageScenariosAndGairaigo';
import { MonolingualPressKeyboardTab } from '@/components/immersion/MonolingualPressKeyboardTab';

describe('Phase 7: Subtitle parser, Reader Quiz Builder & Immersion Hub', () => {
  it('parses SRT and VTT subtitles, tracks active cues, and extracts YouTube IDs', () => {
    const srt = `1
00:00:01,500 --> 00:00:04,000
駅で友達を待ちます。

2
00:00:05,000 --> 00:00:09,000
<i>切符</i>を買いました。`;

    const cues = parseSubtitleFile(srt);
    expect(cues).toHaveLength(2);
    expect(cues[0].startSec).toBe(1.5);
    expect(cues[1].text).toBe('切符を買いました。');
    expect(findActiveCueIndex(cues, 2.0)).toBe(0);
    expect(findActiveCueIndex(cues, 6.0)).toBe(1);
    expect(findActiveCueIndex(cues, 15.0)).toBe(-1);
    expect(extractPlainTextFromSubtitles(cues)).toContain('駅で友達を待ちます。');

    const demoCues = parseSubtitleFile(DEMO_SUBTITLE_VTT);
    expect(demoCues.length).toBeGreaterThanOrEqual(4);

    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeVideoId('https://example.com/not-youtube')).toBeNull();
    expect(extractYouTubeVideoId('invalid')).toBeNull();
  });

  it('builds quiz questions from TextAnalysisResult and validates open scripts & immersion corpora', () => {
    const quiz = buildQuizFromAnalysis(
      {
        tokens: [],
        vocabList: [
          { word: '図書館', reading: 'としょかん', meaning: 'bibliothèque', jlpt: 'N5', count: 2 },
          { word: '電車', reading: 'でんしゃ', meaning: 'train', jlpt: 'N5', count: 1 },
        ],
        kanjiList: [
          { kanji: '駅', reading: 'エキ', meaning: 'gare', jlpt: 'N5', strokes: 14, count: 1 },
        ],
        grammarHits: [],
        stats: {
          totalChars: 20,
          kanjiOccurrences: 5,
          uniqueKanjiCount: 1,
          uniqueVocabCount: 2,
          coverageByLevel: { N5: 100 },
          readablePercent: 100,
        },
      },
      5
    );
    expect(quiz).toHaveLength(3);
    expect(quiz[0].options).toHaveLength(4);
    expect(quiz[0].itemMeta?.jlpt).toBe('N5');

    expect(OPEN_SCRIPTS_LIBRARY.length).toBeGreaterThanOrEqual(8);
    for (const lvl of ['N5', 'N4', 'N3', 'N2', 'N1'] as const) {
      expect(MEMORIZE_SENTENCES.some((m) => m.level === lvl)).toBe(true);
    }
    expect(SHORT_STORIES_AND_SONGS.length).toBeGreaterThanOrEqual(4);
    expect(MONOLINGUAL_TEXTS.length).toBeGreaterThanOrEqual(3);
    expect(KEYBOARD_TUTORIALS.map((k) => k.id)).toEqual(['linux', 'windows', 'ios']);
    expect(VISUAL_SCENARIOS.length).toBeGreaterThanOrEqual(3);
    expect(GAIRAIGO_ORAL_ITEMS.length).toBeGreaterThanOrEqual(14);
  });

  it('renders MonolingualPressKeyboardTab with JA definitions and OS keyboard guides', () => {
    render(<MonolingualPressKeyboardTab />);
    expect(screen.getByText(/日本の四季と食文化/)).toBeTruthy();
    expect(screen.getByText(/Fcitx5 \+ Mozc/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Windows' }));
    expect(screen.getByText(/Microsoft IME/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'iOS' }));
    expect(screen.getByText(/Kana 12-touches/)).toBeTruthy();
  });
});
