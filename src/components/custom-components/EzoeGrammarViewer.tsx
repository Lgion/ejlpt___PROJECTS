'use client';

import React from 'react';
import { EzoeGrammarSegment } from '@/types/jlpt';

interface EzoeGrammarViewerProps {
  segments: EzoeGrammarSegment[];
}

export const EzoeGrammarViewer: React.FC<EzoeGrammarViewerProps> = ({ segments }) => {
  const getTypeBadgeStyle = (type: EzoeGrammarSegment['type']) => {
    switch (type) {
      case 'subject':
        return 'bg-blue-950/80 border-blue-600/60 text-blue-300';
      case 'particle':
        return 'bg-purple-950/80 border-purple-600/60 text-purple-300';
      case 'verb':
        return 'bg-rose-950/80 border-rose-600/60 text-rose-300';
      case 'adjective':
        return 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300';
      case 'noun':
        return 'bg-amber-950/80 border-amber-600/60 text-amber-300';
      case 'time':
        return 'bg-cyan-950/80 border-cyan-600/60 text-cyan-300';
      default:
        return 'bg-slate-800 border-slate-700 text-slate-300';
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
    <div className="w-full p-4 bg-slate-900/90 border border-slate-800 rounded-xl shadow-lg flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-400"></span>
          Structure Grammaticale Méthode Ezoe (江副文法)
        </span>
        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
          Blocs par rôle grammatical
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {segments.map((seg, idx) => (
          <div
            key={idx}
            className={`flex flex-col items-center px-3 py-2 rounded-lg border shadow-sm transition-all hover:scale-105 ${getTypeBadgeStyle(
              seg.type
            )}`}
          >
            {seg.reading && <span className="text-[10px] opacity-80 font-normal">{seg.reading}</span>}
            <span className="text-base font-bold tracking-wide">{seg.text}</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-70 mt-0.5">
              {seg.frenchMeaning || getTypeNameFr(seg.type)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
