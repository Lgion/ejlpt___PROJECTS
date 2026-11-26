'use client';

import React, { useState } from 'react';
import type { ExerciseDrillMode } from '@/lib/exerciseCollections';
import {
  CASUAL_ABBREVIATION_RULES,
  CONDITIONAL_IMPERATIVE_RULES,
  conjugateJapaneseVerb,
  KEIGO_VERB_TABLE,
  UKEMIKEI_RULES,
  type VerbGroup,
} from '@/lib/sentenceDrillsEngine';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

interface DrillReferenceSheetProps {
  mode: ExerciseDrillMode;
}

export function DrillReferenceSheet({ mode }: DrillReferenceSheetProps) {
  const [open, setOpen] = useState(false);
  const [verbInput, setVerbInput] = useState('食べる');
  const [verbGroup, setVerbGroup] = useState<VerbGroup>('ichidan');

  const conj = conjugateJapaneseVerb(verbInput || '食べる', verbGroup);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer"
      >
        <span className="inline-flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-sky-400" />
          Mémo &amp; Règles de l’atelier ({mode})
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="p-4 border-t border-slate-800 text-xs text-slate-300 space-y-4">
          {mode === 'polite_transform' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="py-1.5 pr-3">Neutre</th>
                    <th className="py-1.5 pr-3">Poli (丁寧語)</th>
                    <th className="py-1.5 pr-3 text-sky-300">Sonkeigo (尊敬語)</th>
                    <th className="py-1.5 pr-3 text-amber-300">Kenjougo (謙譲語)</th>
                    <th className="py-1.5">Sens</th>
                  </tr>
                </thead>
                <tbody>
                  {KEIGO_VERB_TABLE.map((row) => (
                    <tr key={row.plain} className="border-b border-slate-800/70">
                      <td className="py-1.5 pr-3 font-serif">{row.plain}</td>
                      <td className="py-1.5 pr-3 font-serif">{row.polite}</td>
                      <td className="py-1.5 pr-3 font-serif text-sky-200">{row.sonkeigo}</td>
                      <td className="py-1.5 pr-3 font-serif text-amber-200">{row.kenjougo}</td>
                      <td className="py-1.5 text-slate-400">{row.noteFr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {mode === 'ukemikei' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {UKEMIKEI_RULES.map((r) => (
                  <div
                    key={r.title}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1"
                  >
                    <div className="font-bold text-sky-300">{r.title}</div>
                    <div className="text-[11px] text-slate-400">{r.formula}</div>
                    <div className="font-serif text-slate-100">{r.exampleJp}</div>
                    <div className="text-[11px] text-slate-400">{r.exampleFr}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-200">Testeur de conjugaison rapide :</span>
                <input
                  type="text"
                  value={verbInput}
                  onChange={(e) => setVerbInput(e.target.value)}
                  aria-label="Verbe à conjuguer"
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-100 w-28"
                />
                <select
                  aria-label="Groupe du verbe"
                  value={verbGroup}
                  onChange={(e) => setVerbGroup(e.target.value as VerbGroup)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
                >
                  <option value="ichidan">Ichidan (1段)</option>
                  <option value="godan">Godan (5段)</option>
                  <option value="irregular">Irrégulier</option>
                </select>
                <span className="text-emerald-300 font-serif">
                  Passif : <strong>{conj.passive}</strong> · Poli : {conj.polite} · Impératif :{' '}
                  {conj.imperative}
                </span>
              </div>
            </div>
          )}

          {mode === 'conditional_imperative' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {CONDITIONAL_IMPERATIVE_RULES.map((c) => (
                <div
                  key={c.form}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1"
                >
                  <div className="font-bold text-amber-300">{c.form}</div>
                  <div className="text-[11px] font-mono text-sky-300">{c.connection}</div>
                  <div className="text-[11px] text-slate-300">{c.nuanceFr}</div>
                  <div className="font-serif text-slate-100">{c.exampleJp}</div>
                </div>
              ))}
            </div>
          )}

          {mode === 'polite_to_casual' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {CASUAL_ABBREVIATION_RULES.map((a) => (
                <div
                  key={a.polite}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1"
                >
                  <div className="font-serif text-slate-100">
                    {a.polite} <span className="text-sky-400">→</span>{' '}
                    <strong className="text-emerald-300">{a.casual}</strong>
                  </div>
                  <div className="text-[11px] text-slate-400">{a.noteFr}</div>
                </div>
              ))}
            </div>
          )}

          {(mode === 'particles' ||
            mode === 'double_particles' ||
            mode === 'error_correction' ||
            mode === 'sentence_builder') && (
            <p className="text-xs text-slate-300 leading-relaxed">
              Astuce : activez les collections <strong>Généré par IA</strong> et{' '}
              <strong>Communauté</strong> en plus du <strong>Socle</strong> pour combiner des
              dizaines de variantes, ou saisissez votre propre réponse clavier pour la faire évaluer
              en temps réel par Gemini.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
