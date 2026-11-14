import React from 'react';
import { Search } from 'lucide-react';

const JLPT_LEVELS = ['ALL', 'N5', 'N4', 'N3', 'N2', 'N1', 'Unknown'] as const;
const SOURCES = [
  { id: 'ALL', label: 'Toutes sources' },
  { id: 'DOJG', label: 'DOJG' },
  { id: 'edewakaru', label: 'Edewakaru' },
  { id: 'nihongo_kyoushi', label: 'Nihongo Kyoushi' },
  { id: 'nihongo_no_sensei', label: 'Nihongo no Sensei' },
] as const;

interface GrammarFilterBarProps {
  query: string;
  selectedLevel: string;
  selectedCategory: 'ALL' | 'particule' | 'bunpou';
  selectedSource: string;
  onQueryChange: (val: string) => void;
  onLevelChange: (lvl: string) => void;
  onCategoryChange: (cat: 'ALL' | 'particule' | 'bunpou') => void;
  onSourceChange: (src: string) => void;
}

export function GrammarFilterBar({
  query,
  selectedLevel,
  selectedCategory,
  selectedSource,
  onQueryChange,
  onLevelChange,
  onCategoryChange,
  onSourceChange,
}: GrammarFilterBarProps) {
  return (
    <div className="grammar-filters">
      <div className="grammar-filters__row">
        <div className="grammar-filters__search-wrap">
          <label htmlFor="grammar-search" className="sr-only-label">
            Rechercher un point de grammaire
          </label>
          <Search className="grammar-filters__search-icon" />
          <input
            id="grammar-search"
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Rechercher par forme (くらい, てばかり), romaji (bakari) ou sens..."
            className="grammar-filters__search-input"
          />
        </div>

        <div className="grammar-filters__selects">
          <label htmlFor="grammar-category" className="sr-only-label">
            Catégorie grammaticale
          </label>
          <select
            id="grammar-category"
            value={selectedCategory}
            onChange={(e) =>
              onCategoryChange(e.target.value as 'ALL' | 'particule' | 'bunpou')
            }
            className="grammar-filters__select"
          >
            <option value="ALL">Toutes catégories</option>
            <option value="particule">Particules (助詞)</option>
            <option value="bunpou">Structures Bunpou (文型)</option>
          </select>

          <label htmlFor="grammar-source" className="sr-only-label">
            Source documentaire
          </label>
          <select
            id="grammar-source"
            value={selectedSource}
            onChange={(e) => onSourceChange(e.target.value)}
            className="grammar-filters__select"
          >
            {SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grammar-filters__levels">
        {JLPT_LEVELS.map((lvl) => (
          <button
            key={lvl}
            type="button"
            onClick={() => onLevelChange(lvl)}
            className={`grammar-filters__level-btn ${
              selectedLevel === lvl ? 'grammar-filters__level-btn--active' : ''
            }`}
          >
            {lvl === 'ALL' ? 'Tous niveaux' : lvl}
          </button>
        ))}
      </div>
    </div>
  );
}

