'use client';

import React, { useMemo, useState } from 'react';
import { Volume2, Search } from 'lucide-react';
import type { VerbGroup } from '@/lib/sentenceDrillsEngine';
import {
  buildFullConjugationParadigm,
  PRESET_CONJUGATION_VERBS,
} from '@/lib/conjugationTable';

export function ConjugationTableTool() {
  const [verbInput, setVerbInput] = useState('食べる');
  const [groupOverride, setGroupOverride] = useState<'auto' | VerbGroup>('auto');
  const [rowFilter, setRowFilter] = useState('');

  const paradigm = useMemo(
    () => buildFullConjugationParadigm(verbInput || '食べる', groupOverride),
    [verbInput, groupOverride]
  );

  const visibleRows = useMemo(() => {
    const q = rowFilter.trim().toLowerCase();
    if (!q) return paradigm.rows;
    return paradigm.rows.filter(
      (r) =>
        r.labelFr.toLowerCase().includes(q) ||
        r.labelJa.toLowerCase().includes(q) ||
        r.form.toLowerCase().includes(q) ||
        r.noteFr.toLowerCase().includes(q)
    );
  }, [paradigm, rowFilter]);

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'ja-JP';
    utt.rate = 0.92;
    window.speechSynthesis.speak(utt);
  };

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <h2 className="tool-panel__title">Table Complète de Conjugaison Japonaise</h2>
          <p className="tool-panel__subtitle">
            15 formes générées instantanément (1段, 5段, Irréguliers) — entrez un verbe en japonais ou romaji.
          </p>
        </div>
        <span className="tool-panel__badge">
          Groupe détecté :{' '}
          {paradigm.group === 'ichidan'
            ? '1段 (Ichidan)'
            : paradigm.group === 'godan'
              ? '5段 (Godan)'
              : 'Irrégulier'}
        </span>
      </div>

      <div className="tool-panel__controls">
        <input
          type="text"
          aria-label="Verbe à conjuguer"
          value={verbInput}
          onChange={(e) => setVerbInput(e.target.value)}
          placeholder="Verbe (ex: 食べる, 帰る, taberu, kaku)…"
          className="tool-panel__input"
        />
        <select
          aria-label="Groupe verbal"
          value={groupOverride}
          onChange={(e) => setGroupOverride(e.target.value as 'auto' | VerbGroup)}
          className="tool-panel__select"
        >
          <option value="auto">Détection auto</option>
          <option value="ichidan">1段 (Ichidan)</option>
          <option value="godan">5段 (Godan)</option>
          <option value="irregular">Irrégulier (する/来る)</option>
        </select>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={rowFilter}
            onChange={(e) => setRowFilter(e.target.value)}
            placeholder="Filtrer une forme (passif, ば…)"
            className="tool-panel__input pl-8 w-full"
          />
        </div>
      </div>

      <div className="tool-panel__chips">
        {PRESET_CONJUGATION_VERBS.map((preset) => (
          <button
            key={preset.dict}
            type="button"
            onClick={() => {
              setVerbInput(preset.dict);
              setGroupOverride(preset.group);
            }}
            className={`tool-panel__chip ${
              verbInput === preset.dict ? 'tool-panel__chip--active' : ''
            }`}
            title={preset.meaningFr}
          >
            <span lang="ja">{preset.dict}</span>
            <span className="opacity-70 text-[10px]">({preset.meaningFr})</span>
          </button>
        ))}
      </div>

      <div className="tool-table-wrap">
        <table className="tool-table">
          <thead>
            <tr>
              <th>Temps / Mode</th>
              <th>Nom JA</th>
              <th>Forme conjuguée</th>
              <th>Usage</th>
              <th aria-label="Audio">Audio</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.key}>
                <td className="font-semibold text-slate-200">{row.labelFr}</td>
                <td className="text-xs text-sky-400 font-bold" lang="ja">
                  {row.labelJa}
                </td>
                <td className="text-base font-extrabold text-white" lang="ja">
                  {row.form}
                </td>
                <td className="text-xs text-slate-400">{row.noteFr}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => speak(row.form)}
                    aria-label={`Écouter ${row.form}`}
                    className="tool-table__audio-btn"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
