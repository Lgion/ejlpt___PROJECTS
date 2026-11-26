'use client';

import React from 'react';
import {
  formatGrammarConnection,
  type ConnectionDisplayFormat,
  type ConnectionPatternGroup,
} from '@/lib/connectionFormatter';
import { Layers, X } from 'lucide-react';

interface ConnectionsIndexModalProps {
  open: boolean;
  groups: ConnectionPatternGroup[];
  format: ConnectionDisplayFormat;
  onSelectPattern: (queryToken: string) => void;
  onClose: () => void;
}

export function ConnectionsIndexModal({
  open,
  groups,
  format,
  onSelectPattern,
  onClose,
}: ConnectionsIndexModalProps) {
  if (!open) return null;

  return (
    <section
      aria-label="Index global des types de connexion grammaticale"
      className="rounded-2xl border border-sky-700/50 bg-slate-900/95 p-5 shadow-xl flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            Index Global des Connexions 【接続】
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cliquez sur un schéma de connexion pour filtrer instantanément les fiches de grammaire.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer l'index des connexions"
          className="p-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {groups.map((grp) => (
          <button
            key={grp.id}
            type="button"
            onClick={() => {
              if (grp.queryToken) onSelectPattern(grp.queryToken);
              onClose();
            }}
            className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-950/90 p-3 text-left hover:border-sky-500/70 hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-100">{grp.label}</span>
              <span className="rounded-full bg-sky-950 border border-sky-800 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                {grp.count}
              </span>
            </div>
            <span className="text-[11px] font-mono text-amber-300">
              {formatGrammarConnection(grp.sampleNotation, format)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
