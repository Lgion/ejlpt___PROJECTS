'use client';

import React from 'react';
import { EzoeGrammarSegment } from '@/types/jlpt';

interface EzoeGrammarViewerProps {
  segments: EzoeGrammarSegment[];
}

export const EzoeGrammarViewer: React.FC<EzoeGrammarViewerProps> = ({ segments }) => {
  const getTypeModifier = (type: EzoeGrammarSegment['type']) => {
    switch (type) {
      case 'subject':
        return 'ezoe-viewer__segment--subject';
      case 'particle':
        return 'ezoe-viewer__segment--particle';
      case 'verb':
        return 'ezoe-viewer__segment--verb';
      case 'adjective':
        return 'ezoe-viewer__segment--adjective';
      case 'noun':
        return 'ezoe-viewer__segment--noun';
      case 'time':
        return 'ezoe-viewer__segment--time';
      default:
        return 'ezoe-viewer__segment--other';
    }
  };

  const getTypeNameFr = (type: EzoeGrammarSegment['type']) => {
    switch (type) {
      case 'subject':
        return 'Sujet / Thème';
      case 'particle':
        return 'Particule';
      case 'verb':
        return 'Verbe (動詞)';
      case 'adjective':
        return 'Adjectif';
      case 'noun':
        return 'Nom (名詞)';
      case 'time':
        return 'Temps / Lieu';
      default:
        return 'Connecteur';
    }
  };

  return (
    <div className="ezoe-viewer">
      <div className="ezoe-viewer__head">
        <span className="ezoe-viewer__title">
          <span className="ezoe-viewer__dot" />
          Structure Grammaticale Méthode Ezoe (江副文法)
        </span>
        <span className="ezoe-viewer__hint">Blocs par rôle grammatical</span>
      </div>

      <div className="ezoe-viewer__segments">
        {segments.map((seg, idx) => (
          <div key={idx} className={`ezoe-viewer__segment ${getTypeModifier(seg.type)}`}>
            {seg.reading && <span className="ezoe-viewer__seg-reading">{seg.reading}</span>}
            <span className="ezoe-viewer__seg-text">{seg.text}</span>
            <span className="ezoe-viewer__seg-role">
              {seg.frenchMeaning || getTypeNameFr(seg.type)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
