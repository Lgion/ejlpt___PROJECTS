'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, Compass, X } from 'lucide-react';

interface PriorityTier {
  tier: number;
  name: string;
  jpName: string;
  operatorAnalogy: string;
  particles: string[];
  rule: string;
}

interface ParticleGuideEntry {
  particle: string;
  tier: number;
  level: string;
  roleFr: string;
  operatorAnalogy: string;
  rules: string[];
  combinations: string[];
  exampleJp: string;
  exampleFr: string;
}

interface ParticlesPriorityData {
  priorityTiers: PriorityTier[];
  particles: ParticleGuideEntry[];
}

interface ParticlesPriorityGuideProps {
  open: boolean;
  onSelectParticle: (particle: string) => void;
  onClose: () => void;
}

export function ParticlesPriorityGuide({
  open,
  onSelectParticle,
  onClose,
}: ParticlesPriorityGuideProps) {
  const [data, setData] = useState<ParticlesPriorityData | null>(null);
  const [selectedTier, setSelectedTier] = useState<number | 'ALL'>('ALL');

  useEffect(() => {
    if (!open || data) return;
    let active = true;
    fetch('/data/particles_priority.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((json: ParticlesPriorityData | null) => {
        if (active && json) setData(json);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [open, data]);

  if (!open) return null;

  const tiers = data?.priorityTiers || [];
  const particles = (data?.particles || []).filter(
    (p) => selectedTier === 'ALL' || p.tier === selectedTier
  );

  return (
    <section
      aria-label="Guide et priorité des particules japonaises"
      className="rounded-2xl border border-amber-700/50 bg-slate-900/95 p-5 shadow-xl flex flex-col gap-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400" />
            Rôle, Valeur &amp; Priorité des Particules (助詞の優先順位)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Comprendre la hiérarchie syntaxique des particules (analogie avec la précédence des
            opérateurs arithmétiques ou CSS).
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le guide des particules"
          className="p-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Precedence table */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
        {tiers.map((t) => {
          const isSelected = selectedTier === t.tier;
          return (
            <button
              key={t.tier}
              type="button"
              onClick={() => setSelectedTier(isSelected ? 'ALL' : t.tier)}
              className={`rounded-xl border p-3 text-left transition-colors cursor-pointer flex flex-col gap-1.5 ${
                isSelected
                  ? 'border-amber-400 bg-amber-950/40'
                  : 'border-slate-800 bg-slate-950/90 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-amber-300">
                  Priorité #{t.tier}
                </span>
                <span className="text-[10px] text-slate-400">{t.jpName}</span>
              </div>
              <div className="text-xs font-bold text-slate-100">{t.name}</div>
              <div className="text-[11px] text-sky-300">{t.operatorAnalogy}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {t.particles.map((pt) => (
                  <span
                    key={pt}
                    className="rounded bg-slate-900 border border-slate-700 px-1.5 py-0.5 text-[10px] font-bold text-slate-200"
                  >
                    {pt}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 leading-snug mt-1">{t.rule}</p>
            </button>
          );
        })}
      </div>

      {/* Detailed particles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {particles.map((p) => (
          <article
            key={p.particle}
            className="rounded-xl border border-slate-800 bg-slate-950/90 p-3.5 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl font-serif font-extrabold text-amber-300">
                  {p.particle}
                </span>
                <span className="rounded bg-sky-950 border border-sky-800 px-1.5 py-0.5 text-[10px] font-bold text-sky-300">
                  {p.level}
                </span>
                <span className="rounded bg-slate-900 border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300">
                  Tier #{p.tier}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSelectParticle(p.particle.split('/')[0].trim());
                  onClose();
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300 cursor-pointer"
              >
                <span>Fiches</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="text-xs font-semibold text-slate-100">{p.roleFr}</div>
            <div className="text-[11px] text-sky-300/90">{p.operatorAnalogy}</div>

            <ul className="text-[11px] text-slate-300 list-disc pl-4 space-y-0.5">
              {p.rules.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>

            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2 text-[11px]">
              <div className="text-slate-100 font-serif">{p.exampleJp}</div>
              <div className="text-slate-400 mt-0.5">{p.exampleFr}</div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
