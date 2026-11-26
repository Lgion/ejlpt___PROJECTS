'use client';

import React from 'react';
import type { ExerciseCollectionSource } from '@/lib/exerciseCollections';
import { BookCheck, Sparkles, Users, PlusCircle } from 'lucide-react';

interface CollectionSourceSelectorProps {
  enabledSources: ExerciseCollectionSource[];
  counts: Record<ExerciseCollectionSource, number>;
  isGeneratingAi: boolean;
  onToggleSource: (source: ExerciseCollectionSource) => void;
  onGenerateAiBatch: () => void;
}

const SOURCE_DEFS: Array<{
  id: ExerciseCollectionSource;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'official',
    label: 'Socle (Officiel)',
    hint: 'Banque vérifiée N5–N1 hors-ligne',
    icon: BookCheck,
  },
  {
    id: 'ai_generated',
    label: 'Généré par IA',
    hint: 'Auto-alimenté par les générations Gemini',
    icon: Sparkles,
  },
  {
    id: 'community',
    label: 'Communauté',
    hint: 'Phrases partagées et modérées',
    icon: Users,
  },
];

export function CollectionSourceSelector({
  enabledSources,
  counts,
  isGeneratingAi,
  onToggleSource,
  onGenerateAiBatch,
}: CollectionSourceSelectorProps) {
  return (
    <div className="drills-sources">
      <div className="drills-sources__list" role="group" aria-label="Collections d'exercices à fusionner">
        {SOURCE_DEFS.map((src) => {
          const Icon = src.icon;
          const active = enabledSources.includes(src.id);
          return (
            <button
              key={src.id}
              type="button"
              aria-pressed={active}
              title={src.hint}
              onClick={() => onToggleSource(src.id)}
              className={`drills-sources__chip ${active ? 'drills-sources__chip--active' : ''}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{src.label}</span>
              <span className="drills-sources__count">{counts[src.id] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={isGeneratingAi}
        onClick={onGenerateAiBatch}
        className="drills-sources__gen-btn"
      >
        <PlusCircle className="w-3.5 h-3.5" />
        <span>{isGeneratingAi ? 'Génération IA…' : '+ Générer IA (auto-sauvé)'}</span>
      </button>
    </div>
  );
}
