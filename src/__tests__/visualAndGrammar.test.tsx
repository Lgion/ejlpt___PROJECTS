import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  computeMasteryTier,
  getFrequencyBand,
  inferTokenGrammaticalTag,
} from '@/lib/mastery';
import {
  buildConnectionPatternIndex,
  formatGrammarConnection,
} from '@/lib/connectionFormatter';
import { AnnotatedJapaneseToken } from '@/components/visual/AnnotatedJapaneseToken';

describe('mastery, 4-channel visual system & connection formatter', () => {
  it('computes 4-tier SRS mastery, frequency bands, and grammatical tags accurately', () => {
    expect(computeMasteryTier(null)).toBe('unseen');
    expect(computeMasteryTier({ repetitions: 1, intervalDays: 1, lapses: 0 })).toBe('learning');
    expect(computeMasteryTier({ repetitions: 2, intervalDays: 6, lapses: 0 })).toBe('consolidated');
    expect(computeMasteryTier({ repetitions: 3, intervalDays: 21, lapses: 0 })).toBe('mastered');

    expect(getFrequencyBand(9)).toBe('high');
    expect(getFrequencyBand(5)).toBe('mid');
    expect(getFrequencyBand(2)).toBe('low');

    expect(inferTokenGrammaticalTag({ isKeigo: [true, false] })).toBe('keigo');
    expect(inferTokenGrammaticalTag({ transitivity: 'jidoushi' })).toBe('jidoushi');
    expect(inferTokenGrammaticalTag({ pos: 'verb_ichidan' })).toBe('verb_ichidan');
    expect(inferTokenGrammaticalTag({ isAdj: 'na' })).toBe('adj_na');
  });

  it('formats 【接続】 connections across all 6 textbook conventions and builds index', () => {
    const raw = '動詞辞書形 + 名詞';
    expect(formatGrammarConnection(raw, 'standard_ja')).toBe('動詞辞書形 + 名詞');
    expect(formatGrammarConnection(raw, 'hiragana')).toContain('どうし');
    expect(formatGrammarConnection(raw, 'romaji')).toContain('Doushi');
    expect(formatGrammarConnection(raw, 'manual_fr')).toContain('Verbe');
    expect(formatGrammarConnection(raw, 'manual_en')).toContain('V-dict');
    expect(formatGrammarConnection(raw, 'mixed_compact')).toContain('V辞書');

    const index = buildConnectionPatternIndex([
      { connections: ['名詞 + に限って'] },
      { connections: ['動詞普通形 + わけではない'] },
      { connections: ['名詞 + のことだ'] },
    ]);
    expect(index[0].id).toBe('noun');
    expect(index[0].count).toBe(2);
    expect(index.some((g) => g.id === 'v_plain' && g.count === 1)).toBe(true);
  });

  it('renders AnnotatedJapaneseToken with simultaneous 4 channels and respects toggles', () => {
    const { container, rerender } = render(
      <AnnotatedJapaneseToken
        text="食べる"
        reading="たべる"
        showFurigana
        jlpt="N5"
        masteryTier="mastered"
        frequencyScore10={9}
        grammaticalTag="verb_ichidan"
        showRomajiHint
      />
    );

    const span = container.querySelector('.vtok');
    expect(span).toHaveClass('vtok--m-mastered');
    expect(span).toHaveClass('vtok--f-high');
    expect(span).toHaveClass('vtok--g-verb_ichidan');
    expect(screen.getByText('N5')).toBeInTheDocument();
    expect(screen.getByText('(taberu)')).toBeInTheDocument();

    rerender(
      <AnnotatedJapaneseToken
        text="食べる"
        reading="たべる"
        jlpt="N5"
        masteryTier="mastered"
        frequencyScore10={9}
        grammaticalTag="verb_ichidan"
        channelsOverride={{
          masteryText: false,
          frequencyBg: false,
          grammarUnderline: false,
          jlptPill: false,
        }}
      />
    );

    const toggledSpan = container.querySelector('.vtok');
    expect(toggledSpan).not.toHaveClass('vtok--m-mastered');
    expect(toggledSpan).not.toHaveClass('vtok--f-high');
    expect(toggledSpan).not.toHaveClass('vtok--g-verb_ichidan');
    expect(screen.queryByText('N5')).not.toBeInTheDocument();
  });
});
