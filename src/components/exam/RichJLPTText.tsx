'use client';

import React from 'react';
import type { RichTextToken } from '@/types/jlpt';
import { useFurigana } from '@/context/FuriganaContext';

interface RichJLPTTextProps {
  tokens?: RichTextToken[];
  fallbackText?: string;
  furiganaPolicy?: 'official_booklet' | 'global_toggle';
  filledBlanks?: Record<number, { optionNumber: string; label: string }>;
  starSlotValues?: Record<number, { optionNumber: string; label: string }>;
  onStarSlotClick?: (slotIndex: number) => void;
  activeStarSlot?: number | null;
  className?: string;
  as?: 'span' | 'div' | 'p';
}

/**
 * Renders Japanese booklet text with official selective `<ruby>` annotations,
 * exam-authentic underlines (with optional ①/② badges), boxed cloze gaps [19],
 * and 問題2 ★ ordering slots.
 */
export const RichJLPTText: React.FC<RichJLPTTextProps> = ({
  tokens,
  fallbackText,
  furiganaPolicy = 'official_booklet',
  filledBlanks,
  starSlotValues,
  onStarSlotClick,
  activeStarSlot,
  className = '',
  as: Tag = 'span',
}) => {
  const { furiganaMode } = useFurigana();

  if (!tokens || tokens.length === 0) {
    return (
      <Tag className={className} lang="ja">
        {fallbackText ?? ''}
      </Tag>
    );
  }

  return (
    <Tag className={`jlpt-rich-text ${className}`.trim()} lang="ja">
      {tokens.map((tok, index) => {
        if (tok.isLineBreak) {
          return <br key={`br-${index}`} />;
        }

        if (tok.isBlank && tok.blankNumber !== undefined) {
          const filled = filledBlanks?.[tok.blankNumber];
          return (
            <span
              key={`blank-${tok.blankNumber}-${index}`}
              className={`jlpt-cloze-box ${filled ? 'jlpt-cloze-box--filled' : ''}`}
              title={`Question ${tok.blankNumber}`}
            >
              <span className="jlpt-cloze-num">{tok.blankNumber}</span>
              {filled && <span className="jlpt-cloze-preview">{filled.label}</span>}
            </span>
          );
        }

        if (tok.starSlotIndex !== undefined) {
          const idx = tok.starSlotIndex;
          const isStarSlot = tok.text === '★';
          const placed = starSlotValues?.[idx];
          const isTarget = activeStarSlot === idx;
          const slotContent = (
            <>
              <span className="jlpt-star-slot__top">
                {placed ? (
                  <span className="jlpt-star-slot__placed">
                    <span className="jlpt-star-slot__optnum">{placed.optionNumber}</span>
                    {placed.label}
                  </span>
                ) : isStarSlot ? (
                  <span className="jlpt-star-slot__star" aria-label="Position étoile ★">
                    ★
                  </span>
                ) : (
                  <span className="jlpt-star-slot__empty" aria-hidden="true">
                    &nbsp;
                  </span>
                )}
              </span>
              <span className="jlpt-star-slot__line" aria-hidden="true" />
            </>
          );

          if (onStarSlotClick) {
            return (
              <button
                key={`slot-${idx}-${index}`}
                type="button"
                onClick={() => onStarSlotClick(idx)}
                className={`jlpt-star-slot jlpt-star-slot--interactive ${
                  isStarSlot ? 'jlpt-star-slot--star' : ''
                } ${isTarget ? 'jlpt-star-slot--active' : ''}`}
                aria-label={`Emplacement ${idx + 1}${isStarSlot ? ' (étoile ★)' : ''}${
                  placed ? `: ${placed.label}` : ''
                }`}
              >
                {slotContent}
              </button>
            );
          }

          return (
            <span
              key={`slot-${idx}-${index}`}
              className={`jlpt-star-slot ${isStarSlot ? 'jlpt-star-slot--star' : ''}`}
            >
              {slotContent}
            </span>
          );
        }

        const shouldShowOfficial = Boolean(tok.reading);
        const shouldShowOptional =
          furiganaPolicy === 'global_toggle' &&
          Boolean(tok.optionalReading) &&
          furiganaMode !== 'OFF';

        const activeReading = shouldShowOfficial
          ? tok.reading
          : shouldShowOptional
          ? tok.optionalReading
          : undefined;

        const hoverOnly =
          furiganaPolicy === 'global_toggle' &&
          furiganaMode === 'HOVER' &&
          !shouldShowOfficial &&
          shouldShowOptional;

        const core = activeReading ? (
          <ruby className={hoverOnly ? 'jlpt-ruby jlpt-ruby--hover' : 'jlpt-ruby'}>
            {tok.text}
            <rp>(</rp>
            <rt>{activeReading}</rt>
            <rp>)</rp>
          </ruby>
        ) : (
          tok.text
        );

        if (tok.underline) {
          // Only render the superscript ①/② badge on the first underlined token in a contiguous group
          const prev = tokens[index - 1];
          const showBadge =
            tok.underlineMarker &&
            !(prev?.underline && prev?.underlineMarker === tok.underlineMarker);

          return (
            <span key={`u-${index}`} className="jlpt-underline">
              {showBadge && (
                <span className="jlpt-underline__badge">{tok.underlineMarker}</span>
              )}
              {core}
            </span>
          );
        }

        return <React.Fragment key={`t-${index}`}>{core}</React.Fragment>;
      })}
    </Tag>
  );
};

