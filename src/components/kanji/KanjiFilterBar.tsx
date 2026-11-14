import React from 'react';
import { JLPTLevelNormalized } from '@/lib/db';
import { normalizeRadicalGlyph } from '@/lib/kanjiRadicals';
import { Search, Filter, ArrowUpDown } from 'lucide-react';

export type StrokeFilter = 'ALL' | '1-5' | '6-10' | '11-15' | '16+';
export type FrequencySort =
  | 'default'
  | 'aozora'
  | 'news'
  | 'twitter'
  | 'wikipedia'
  | 'innocent_rank';

export interface RadicalEntry {
  strokes: number | null;
  meaning: string;
  reading_j: string;
  reading_r: string;
  position_j: string;
}

const JLPT_LEVELS: JLPTLevelNormalized[] = ['N5', 'N4', 'N3', 'N2', 'N1', 'N0'];

interface KanjiFilterBarProps {
  searchQuery: string;
  selectedJlpt: string;
  selectedCategory: string;
  selectedRadical: string;
  selectedStrokes: StrokeFilter;
  sortBy: FrequencySort;
  categories: string[];
  radicalOptions: [string, RadicalEntry][];
  onSearchChange: (val: string) => void;
  onJlptChange: (lvl: string) => void;
  onCategoryChange: (cat: string) => void;
  onRadicalChange: (rad: string) => void;
  onStrokesChange: (strokes: StrokeFilter) => void;
  onSortChange: (sort: FrequencySort) => void;
  onReset: () => void;
}

export function KanjiFilterBar({
  searchQuery,
  selectedJlpt,
  selectedCategory,
  selectedRadical,
  selectedStrokes,
  sortBy,
  categories,
  radicalOptions,
  onSearchChange,
  onJlptChange,
  onCategoryChange,
  onRadicalChange,
  onStrokesChange,
  onSortChange,
  onReset,
}: KanjiFilterBarProps) {
  const hasActiveFilter =
    Boolean(searchQuery) ||
    selectedJlpt !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    selectedRadical !== 'ALL' ||
    selectedStrokes !== 'ALL' ||
    sortBy !== 'default';

  return (
    <div className="kanji-filters">
      <div className="kanji-filters__primary-row">
        <div className="kanji-filters__search-wrap">
          <label htmlFor="kanji-search-input" className="sr-only-label">
            Rechercher un Kanji
          </label>
          <Search className="kanji-filters__search-icon" />
          <input
            id="kanji-search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher par Kanji, lecture (ON/KUN/Nanori), sens (FR/EN) ou keyword Heisig..."
            className="kanji-filters__search-input"
          />
        </div>

        <div className="kanji-filters__jlpt-group">
          <button
            type="button"
            onClick={() => onJlptChange('ALL')}
            className={`kanji-filters__jlpt-btn ${selectedJlpt === 'ALL' ? 'kanji-filters__jlpt-btn--active' : ''
              }`}
          >
            Tous
          </button>
          {JLPT_LEVELS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => onJlptChange(lvl)}
              className={`kanji-filters__jlpt-btn ${selectedJlpt === lvl ? 'kanji-filters__jlpt-btn--active' : ''
                }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      <div className="kanji-filters__secondary-grid">
        <div>
          <label htmlFor="kanji-category-select" className="kanji-filters__label">
            <Filter className="kanji-filters__label-icon" />
            Catégorie sémantique
          </label>
          <select
            id="kanji-category-select"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="kanji-filters__select"
          >
            <option value="ALL">Toutes catégories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="kanji-radical-select" className="kanji-filters__label">
            Radical Kangxi
          </label>
          <select
            id="kanji-radical-select"
            value={selectedRadical}
            onChange={(e) => onRadicalChange(e.target.value)}
            className="kanji-filters__select"
          >
            <option value="ALL">Tous radicaux ({radicalOptions.length || '214+'})</option>
            {radicalOptions.map(([rad, info]) => (
              <option key={rad} value={rad}>
                {normalizeRadicalGlyph(rad)} — {info.meaning} ({info.strokes ?? '?'} traits)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="kanji-strokes-select" className="kanji-filters__label">
            Nombre de traits
          </label>
          <select
            id="kanji-strokes-select"
            value={selectedStrokes}
            onChange={(e) => onStrokesChange(e.target.value as StrokeFilter)}
            className="kanji-filters__select"
          >
            <option value="ALL">Tous les traits</option>
            <option value="1-5">1 à 5 traits (Simples)</option>
            <option value="6-10">6 à 10 traits (Intermédiaires)</option>
            <option value="11-15">11 à 15 traits (Avancés)</option>
            <option value="16+">16+ traits (Complexes)</option>
          </select>
        </div>

        <div>
          <label htmlFor="kanji-sort-select" className="kanji-filters__label">
            <ArrowUpDown className="kanji-filters__label-icon" />
            Tri par fréquence corpus
          </label>
          <div className="kanji-filters__sort-row">
            <select
              id="kanji-sort-select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as FrequencySort)}
              className="kanji-filters__select kanji-filters__select--flex"
            >
              <option value="default">Ordre par défaut</option>
              <option value="news">Presse (News)</option>
              <option value="aozora">Littérature (Aozora)</option>
              <option value="wikipedia">Encyclopédie (Wikipedia)</option>
              <option value="twitter">Web / Social (Twitter)</option>
              <option value="innocent_rank">Fiction (Innocent)</option>
            </select>
            {hasActiveFilter && (
              <button type="button" onClick={onReset} className="kanji-filters__reset-btn">
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

