import React from 'react';
import { Search } from 'lucide-react';

interface SlangFilterBarProps {
  query: string;
  tab: 'all' | 'slang' | 'ono';
  onQueryChange: (val: string) => void;
  onTabChange: (tab: 'all' | 'slang' | 'ono') => void;
}

const SLANG_TABS = [
  { id: 'all', label: 'Tout' },
  { id: 'slang', label: 'Slang (851)' },
  { id: 'ono', label: 'Onomatopées (1 422)' },
] as const;

export function SlangFilterBar({
  query,
  tab,
  onQueryChange,
  onTabChange,
}: SlangFilterBarProps) {
  return (
    <div className="slang-filters">
      <div className="slang-filters__search-wrap">
        <label htmlFor="slang-search" className="sr-only-label">
          Rechercher du slang ou une onomatopée
        </label>
        <Search className="slang-filters__search-icon" />
        <input
          id="slang-search"
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Rechercher en japonais, romaji (pikuri, maji) ou anglais..."
          className="slang-filters__search-input"
        />
      </div>

      <div className="slang-filters__tabs">
        {SLANG_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className={`slang-filters__tab ${
              tab === t.id ? 'slang-filters__tab--active' : ''
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
