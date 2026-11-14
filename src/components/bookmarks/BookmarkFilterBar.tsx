import React from 'react';
import { LocalBookmark } from '@/lib/db';
import { Search } from 'lucide-react';

const BOOKMARK_TYPES = ['ALL', 'KANJI', 'VOCAB', 'GRAMMAR', 'QUESTION'] as const;

interface BookmarkFilterBarProps {
  query: string;
  filterType: 'ALL' | LocalBookmark['type'];
  onQueryChange: (val: string) => void;
  onTypeChange: (t: 'ALL' | LocalBookmark['type']) => void;
}

export function BookmarkFilterBar({
  query,
  filterType,
  onQueryChange,
  onTypeChange,
}: BookmarkFilterBarProps) {
  return (
    <div className="bookmark-filters">
      <div className="bookmark-filters__search-wrap">
        <label htmlFor="bookmarks-search" className="sr-only-label">
          Filtrer mes favoris
        </label>
        <Search className="bookmark-filters__search-icon" />
        <input
          id="bookmarks-search"
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Filtrer par mot, traduction ou note..."
          className="bookmark-filters__search-input"
        />
      </div>

      <div className="bookmark-filters__types">
        {BOOKMARK_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTypeChange(t)}
            className={`bookmark-filters__type-btn ${
              filterType === t ? 'bookmark-filters__type-btn--active' : ''
            }`}
          >
            {t === 'ALL' ? 'Tous' : t}
          </button>
        ))}
      </div>
    </div>
  );
}

