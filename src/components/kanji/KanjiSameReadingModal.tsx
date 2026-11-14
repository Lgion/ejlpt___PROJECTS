'use client';

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/lib/db';

interface KanjiSameReadingModalProps {
  mode: 'on' | 'kun';
  reading: string;
  currentChar: string;
  fontClass: string;
  onSelectKanji: (char: string) => void;
}

function normalizeKunForCompare(val: string): string {
  return val.replace(/[-.]/g, '').trim();
}

export function KanjiSameReadingModal({
  mode,
  reading,
  currentChar,
  fontClass,
  onSelectKanji,
}: KanjiSameReadingModalProps) {
  const matches = useLiveQuery(async () => {
    const cleanTarget = normalizeKunForCompare(reading);
    const items = await localDb.kanjis
      .filter((k) => {
        if (mode === 'on') {
          return k.on_readings.some((r) => r === reading);
        }
        return k.kun_readings.some(
          (r) => r === reading || (cleanTarget.length > 0 && normalizeKunForCompare(r) === cleanTarget)
        );
      })
      .toArray();

    items.sort((a, b) => {
      if (a.kanji === currentChar) return -1;
      if (b.kanji === currentChar) return 1;
      const fa = a.frequencies?.wikipedia ?? Number.MAX_SAFE_INTEGER;
      const fb = b.frequencies?.wikipedia ?? Number.MAX_SAFE_INTEGER;
      return fa - fb;
    });

    return items;
  }, [mode, reading, currentChar]);

  if (!matches) {
    return (
      <div className="kanji-modal__loading">
        Recherche des kanjis avec la lecture {mode === 'on' ? 'On' : 'Kun'} « {reading} »...
      </div>
    );
  }

  return (
    <div className="kanji-modal__reading-wrap">
      <div className="kanji-modal__reading-meta">
        <span
          className={`kanji-modal__reading-pill ${
            mode === 'on' ? 'kanji-modal__reading-pill--on' : 'kanji-modal__reading-pill--kun'
          }`}
        >
          {reading}
        </span>
        <span className="kanji-modal__reading-count">
          {matches.length} kanji{matches.length > 1 ? 's' : ''} trouvé{matches.length > 1 ? 's' : ''}
        </span>
      </div>

      {matches.length === 0 ? (
        <div className="kanji-modal__empty">Aucun autre kanji trouvé dans la base locale.</div>
      ) : (
        <div className="kanji-modal__reading-grid">
          {matches.map((item) => {
            const meanings = item.meanings_fr?.filter((m) => m && m !== '-').length
              ? item.meanings_fr.filter((m) => m && m !== '-')
              : item.meanings_en?.filter((m) => m && m !== '-') || [];
            const isCurrent = item.kanji === currentChar;

            return (
              <button
                key={item.kanji}
                type="button"
                onClick={() => onSelectKanji(item.kanji)}
                className={`kanji-modal__kanji-card ${
                  isCurrent ? 'kanji-modal__kanji-card--current' : ''
                }`}
              >
                <div className="kanji-modal__kanji-card-top">
                  <span className={`kanji-modal__kanji-char ${fontClass}`}>{item.kanji}</span>
                  <span className="kanji-modal__kanji-lvl">{item.jlpt}</span>
                </div>
                <div className="kanji-modal__kanji-meaning">
                  {meanings.slice(0, 2).join(', ') || item.rtk_keyword_6th || '—'}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

