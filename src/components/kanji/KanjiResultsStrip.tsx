import React from 'react';
import { UnifiedKanjiRecord } from '@/lib/db';

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
  return (
    <div className="kanji-strip">
      <span className="kanji-strip__count">Résultats ({kanjiList?.length || 0}) :</span>
      {kanjiList && kanjiList.length > 0 ? (
        kanjiList.map((k) => (
          <button
            key={k.kanji}
            type="button"
            onClick={() => onSelectKanji(k.kanji)}
            className={`kanji-strip__btn ${fontClass} ${
              selectedKanjiChar === k.kanji ? 'kanji-strip__btn--active' : ''
            }`}
          >
            <span>{k.kanji}</span>
          </button>
        ))
      ) : (
        <span className="kanji-strip__empty">Chargement ou aucun résultat...</span>
      )}
    </div>
  );
}

