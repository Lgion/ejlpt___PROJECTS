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
    <ruby className={`group relative inline-flex flex-col items-center leading-none cursor-pointer ${className}`}>
      <span className="text-current font-medium group-hover:text-sky-300 transition-colors">{text}</span>
      <rt
        className={`text-[0.65em] font-normal text-sky-400 select-none leading-none -mt-0.5 transition-all duration-200 ${
          isHoverMode
            ? 'opacity-0 group-hover:opacity-100 group-hover:-translate-y-0.5'
            : 'opacity-100'
        }`}
      >
        {reading}
      </rt>
    </ruby>
  );
};
