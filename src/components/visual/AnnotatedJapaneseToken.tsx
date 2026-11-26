'use client';

import React from 'react';
import { toRomaji } from 'wanakana';
import { useVisualSystem, type VisualChannelsState } from '@/context/VisualSystemContext';
import {
  getFrequencyBand,
  GRAMMATICAL_TAG_LABELS,
  MASTERY_META,
  type GrammaticalVisualTag,
  type MasteryTier,
} from '@/lib/mastery';

export interface AnnotatedJapaneseTokenProps {
  text: string;
  reading?: string;
  showFurigana?: boolean;
  jlpt?: string;
  masteryTier?: MasteryTier;
  frequencyScore10?: number;
  grammaticalTag?: GrammaticalVisualTag;
  channelsOverride?: Partial<VisualChannelsState>;
  showRomajiHint?: boolean;
  className?: string;
}

function normalizeJlptSlug(jlpt?: string): 'n5' | 'n4' | 'n3' | 'n2' | 'n1' | 'n0' {
  const low = (jlpt || 'N0').toLowerCase();
  if (low === 'n5' || low === 'n4' || low === 'n3' || low === 'n2' || low === 'n1') {
    return low;
  }
  return 'n0';
}

export function AnnotatedJapaneseToken({
  text,
  reading,
  showFurigana = false,
  jlpt,
  masteryTier = 'unseen',
  frequencyScore10,
  grammaticalTag = 'other',
  channelsOverride,
  showRomajiHint,
  className = '',
}: AnnotatedJapaneseTokenProps) {
  const { channels: ctxChannels, adaptiveProfile } = useVisualSystem();
  const channels: VisualChannelsState = {
    ...ctxChannels,
    ...channelsOverride,
  };

  const freqBand = getFrequencyBand(frequencyScore10);
  const jlptSlug = normalizeJlptSlug(jlpt);

  const classes = ['vtok'];
  if (channels.masteryText) {
    classes.push(`vtok--m-${masteryTier}`);
  }
  if (channels.frequencyBg && typeof frequencyScore10 === 'number') {
    classes.push(`vtok--f-${freqBand}`);
  }
  if (channels.grammarUnderline && grammaticalTag !== 'other') {
    classes.push(`vtok--g-${grammaticalTag}`);
  }
  if (className) {
    classes.push(className);
  }

  const tooltipParts = [
    `Maîtrise : ${MASTERY_META[masteryTier].labelFr}`,
    typeof frequencyScore10 === 'number' ? `Fréquence : ${frequencyScore10}/10` : null,
    grammaticalTag !== 'other' ? `Nature : ${GRAMMATICAL_TAG_LABELS[grammaticalTag]}` : null,
    jlpt ? `JLPT : ${jlpt}` : null,
  ].filter(Boolean);

  const shouldShowRomaji =
    (showRomajiHint ?? adaptiveProfile === 'beginner') && Boolean(reading);

  return (
    <span className={classes.join(' ')} title={tooltipParts.join(' • ')}>
      {showFurigana && reading ? (
        <ruby>
          {text}
          <rt className="reader-passage__rt">{reading}</rt>
        </ruby>
      ) : (
        <span>{text}</span>
      )}
      {shouldShowRomaji && reading && (
        <span className="vtok__romaji">({toRomaji(reading)})</span>
      )}
      {channels.jlptPill && jlpt && (
        <span className={`vtok__jlpt vtok__jlpt--${jlptSlug}`}>{jlpt}</span>
      )}
    </span>
  );
}
