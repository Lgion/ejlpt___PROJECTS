'use client';

import React from 'react';
import { UnifiedKanjiRecord } from '@/lib/db';
import { useVisualSystem } from '@/context/VisualSystemContext';
import { computeKanjiFrequencyScore10 } from '@/lib/frequencyScale';
import { getFrequencyBand } from '@/lib/mastery';

interface KanjiResultsStripProps {
  kanjiList: UnifiedKanjiRecord[] | undefined;
  selectedKanjiChar: string;
  fontClass: string;
  onSelectKanji: (char: string) => void;
}

export function KanjiResultsStrip({
  kanjiList,
  selectedKanjiChar,
  fontClass,
  onSelectKanji,
}: KanjiResultsStripProps) {
  const { channels } = useVisualSystem();

  return (
    <div className="kanji-strip">
      <span className="kanji-strip__count">Résultats ({kanjiList?.length || 0}) :</span>
      {kanjiList && kanjiList.length > 0 ? (
        kanjiList.map((k) => {
          const score10 = k.frequencyScore10 ?? computeKanjiFrequencyScore10(k.frequencies);
          const band = getFrequencyBand(score10);
          const freqClass = channels.frequencyBg ? `kanji-strip__btn--freq-${band}` : '';
          return (
            <button
              key={k.kanji}
              type="button"
              onClick={() => onSelectKanji(k.kanji)}
              title={`${k.kanji} (${k.jlpt}) • Fréquence ${score10}/10`}
              className={`kanji-strip__btn ${fontClass} ${freqClass} ${
                selectedKanjiChar === k.kanji ? 'kanji-strip__btn--active' : ''
              }`}
            >
              <span>{k.kanji}</span>
            </button>
          );
        })
      ) : (
        <span className="kanji-strip__empty">Chargement ou aucun résultat...</span>
      )}
    </div>
  );
}
