'use client';

import React, { useState } from 'react';
import { useVisualSystem, type AdaptiveProfile } from '@/context/VisualSystemContext';
import { Eye, HelpCircle, Palette } from 'lucide-react';

interface VisualLegendBarProps {
  compact?: boolean;
}

const PROFILES: Array<{ id: AdaptiveProfile; label: string }> = [
  { id: 'beginner', label: 'Débutant' },
  { id: 'intermediate', label: 'Interm.' },
  { id: 'advanced', label: 'Avancé' },
];

export function VisualLegendBar({ compact = false }: VisualLegendBarProps) {
  const {
    adaptiveProfile,
    channels,
    setAdaptiveProfile,
    toggleChannel,
  } = useVisualSystem();
  const [showLegend, setShowLegend] = useState(false);

  return (
    <div className={`visual-legend-bar ${compact ? 'visual-legend-bar--compact' : ''}`}>
      <div className="visual-legend-bar__row">
        <div className="visual-legend-bar__toggles" role="group" aria-label="Canaux visuels simultanés">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 mr-1">
            <Palette className="w-3.5 h-3.5 text-sky-400" />
            Canaux :
          </span>

          <button
            type="button"
            aria-pressed={channels.masteryText}
            onClick={() => toggleChannel('masteryText')}
            className={`visual-legend-bar__chip ${
              channels.masteryText ? 'visual-legend-bar__chip--active' : ''
            }`}
          >
            <span>Texte = Maîtrise</span>
          </button>

          <button
            type="button"
            aria-pressed={channels.frequencyBg}
            onClick={() => toggleChannel('frequencyBg')}
            className={`visual-legend-bar__chip ${
              channels.frequencyBg ? 'visual-legend-bar__chip--active' : ''
            }`}
          >
            <span>Fond = Fréq. 1–10</span>
          </button>

          <button
            type="button"
            aria-pressed={channels.grammarUnderline}
            onClick={() => toggleChannel('grammarUnderline')}
            className={`visual-legend-bar__chip ${
              channels.grammarUnderline ? 'visual-legend-bar__chip--active' : ''
            }`}
          >
            <span>Soulign. = Grammaire</span>
          </button>

          <button
            type="button"
            aria-pressed={channels.jlptPill}
            onClick={() => toggleChannel('jlptPill')}
            className={`visual-legend-bar__chip ${
              channels.jlptPill ? 'visual-legend-bar__chip--active' : ''
            }`}
          >
            <span>Pastille = JLPT</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="visual-legend-bar__profiles"
            role="group"
            aria-label="Profil adaptatif Kanjiverse"
          >
            {PROFILES.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={adaptiveProfile === p.id}
                onClick={() => setAdaptiveProfile(p.id)}
                className={`visual-legend-bar__profile-btn ${
                  adaptiveProfile === p.id ? 'visual-legend-bar__profile-btn--active' : ''
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowLegend((v) => !v)}
            aria-expanded={showLegend}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-300 hover:text-white cursor-pointer"
          >
            {showLegend ? <Eye className="w-3.5 h-3.5" /> : <HelpCircle className="w-3.5 h-3.5" />}
            <span>Légende</span>
          </button>
        </div>
      </div>

      {showLegend && (
        <div className="visual-legend-bar__details">
          <div>
            <strong className="text-slate-100">Texte (Maîtrise SRS) :</strong>{' '}
            <span className="text-slate-100">Blanc = Jamais vu</span> ·{' '}
            <span className="text-amber-400">Ambre = Apprentissage</span> ·{' '}
            <span className="text-sky-400">Bleu = Consolidé</span> ·{' '}
            <span className="text-emerald-400">Vert = Maîtrisé</span>
          </div>
          <div>
            <strong className="text-slate-100">Fond (Fréquence 1–10) :</strong>{' '}
            <span className="px-1 rounded bg-sky-500/20">Bleu = Très courant (8–10)</span> ·{' '}
            <span className="px-1 rounded bg-violet-500/20">Violet = Moyen (4–7)</span> ·{' '}
            <span className="px-1 rounded bg-rose-500/20">Rose = Rare (1–3)</span>
          </div>
          <div>
            <strong className="text-slate-100">Soulignement (Nature) :</strong>{' '}
            Plein bleu = 1段 · Tireté cyan = 5段 · Pointillé vert = 自動 · Orange = 他動 · Ondulé ambre = Adj-い · Double violet = Keigo · Rose = Particule
          </div>
          <div>
            <strong className="text-slate-100">Profil Kanjiverse :</strong>{' '}
            Débutant (+Romaji &amp; RTK) · Intermédiaire (équilibré) · Avancé (+SKIP, encodage &amp; variantes)
          </div>
        </div>
      )}
    </div>
  );
}
