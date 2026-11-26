'use client';

import React, { useMemo, useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { RECOMMENDED_LINKS, type LinkCategory } from '@/data/recommendedLinks';

const CATEGORIES: Array<'ALL' | LinkCategory> = [
  'ALL',
  'Dictionnaires',
  'Grammaire & Méthodes',
  'Lecture & Presse',
  'Audio & Immersion',
  'Données Open-Source',
];

export function RecommendedLinksTool() {
  const [category, setCategory] = useState<'ALL' | LinkCategory>('ALL');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RECOMMENDED_LINKS.filter((item) => {
      if (category !== 'ALL' && item.category !== category) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.descriptionFr.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [category, query]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <h2 className="tool-panel__title">おすすめのリンクス — Ressources Sélectionnées</h2>
          <p className="tool-panel__subtitle">
            Sélection vérifiée de dictionnaires, guides grammaticaux, médias japonais et jeux de données libres.
          </p>
        </div>
        <span className="tool-panel__badge">{filtered.length} liens</span>
      </div>

      <div className="tool-panel__controls">
        <div className="tool-panel__chips">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`tool-panel__chip ${category === cat ? 'tool-panel__chip--active' : ''}`}
            >
              {cat === 'ALL' ? 'Tout' : cat}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un site…"
            className="tool-panel__input pl-8 w-full"
          />
        </div>
      </div>

      <div className="links-grid">
        {filtered.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="links-card"
          >
            <div className="links-card__head">
              <span className="links-card__cat">{item.category}</span>
              <span className="links-card__lvl">{item.levels}</span>
            </div>
            <div className="links-card__title">
              <span>{item.title}</span>
              <ExternalLink className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            </div>
            <p className="links-card__desc">{item.descriptionFr}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
