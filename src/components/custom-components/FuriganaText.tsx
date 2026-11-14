'use client';

import React from 'react';
import { useFurigana } from '@/context/FuriganaContext';

interface FuriganaTextProps {
  text: string;
  reading?: string;
  className?: string;
}

export const FuriganaText: React.FC<FuriganaTextProps> = ({
  text,
  reading,
  className = '',
}) => {
  const { furiganaMode } = useFurigana();

  if (furiganaMode === 'OFF' || !reading) {
    return <span className={className}>{text}</span>;
  }

  const isHoverMode = furiganaMode === 'HOVER';

  return (
    <ruby
      className={`furi-word ${isHoverMode ? 'furi-word--hover' : ''} ${className}`.trim()}
    >
      <span className="furi-word__base">{text}</span>
      <rt
        className={`furi-word__reading ${
          isHoverMode ? 'furi-word__reading--hidden-until-hover' : ''
        }`}
      >
        {reading}
      </rt>
    </ruby>
  );
};
