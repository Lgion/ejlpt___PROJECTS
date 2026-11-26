import React from 'react';
import { Search } from 'lucide-react';

interface SlangFilterBarProps {
  query: string;
  tab: 'all' | 'slang' | 'ono';
  eraFilter?: string;
  onlyOppositePairs?: boolean;
  onQueryChange: (val: string) => void;
  onTabChange: (tab: 'all' | 'slang' | 'ono') => void;
  onEraFilterChange?: (era: string) => void;
  onOnlyOppositePairsChange?: (only: boolean) => void;
}

const SLANG_TABS = [
  { id: 'all', label: 'Tout' },
  { id: 'slang', label: 'Slang (851)' },
  { id: 'ono', label: 'Onomatopées (1 422)' },
] as const;

const ERA_OPTIONS = [
  'ALL',
  'Années 2020 (SNS / Gen Z)',
  'Années 2010 (Web / SNS)',
  'Ère Heisei (1989–2019)',
  'Ère Shōwa (1926–1989)',
  'Contemporain / Courant',
];

export function SlangFilterBar({
  query,
  tab,
  eraFilter = 'ALL',
  onlyOppositePairs = false,
  onQueryChange,
  onTabChange,
  onEraFilterChange,
  onOnlyOppositePairsChange,
}: SlangFilterBarProps) {
  return (
    <div className="slang-filters flex-wrap">
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

      {onEraFilterChange && tab !== 'ono' && (
        <select
          aria-label="Filtrer par époque"
          value={eraFilter}
          onChange={(e) => onEraFilterChange(e.target.value)}
          className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
        >
          {ERA_OPTIONS.map((era) => (
            <option key={era} value={era}>
              {era === 'ALL' ? 'Toutes époques' : era}
            </option>
          ))}
        </select>
      )}

      {onOnlyOppositePairsChange && tab !== 'slang' && (
        <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none px-2">
          <input
            type="checkbox"
            checked={onlyOppositePairs}
            onChange={(e) => onOnlyOppositePairsChange(e.target.checked)}
            className="rounded border-slate-700 bg-slate-950 text-amber-500"
          />
          <span>Paires opposées uniquement</span>
        </label>
      )}
    </div>
  );
}
