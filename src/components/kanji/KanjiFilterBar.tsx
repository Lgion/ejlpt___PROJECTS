import React from 'react';
import { JLPTLevelNormalized } from '@/lib/db';
import { normalizeRadicalGlyph } from '@/lib/kanjiRadicals';
import { Search, Filter, ArrowUpDown } from 'lucide-react';

export type StrokeFilter = 'ALL' | '1-5' | '6-10' | '11-15' | '16+';
export type RelationGroupFilter = 'ALL' | 'similar' | 'synonyms' | 'antonyms' | 'homonyms';
export type FrequencySort =
  | 'default'
  | 'score10'
  | 'news'
  | 'aozora'
  | 'wikipedia'
  | 'twitter'
  | 'innocent_rank';

export const KANJI_THEME_OPTIONS = [
  { id: 'ALL', label: 'Tous thèmes' },
  { id: 'quotidien', label: 'Quotidien (N0/courant)' },
  { id: 'grammaire', label: 'Grammaire' },
  { id: 'verbe', label: 'Verbes' },
  { id: 'nom', label: 'Noms' },
  { id: 'adjectif', label: 'Adjectifs' },
  { id: 'adverbe', label: 'Adverbes' },
  { id: 'pronom', label: 'Pronoms' },
  { id: 'numeral', label: 'Numéraux' },
  { id: 'preposition', label: 'Prépositions' },
  { id: 'conjonction', label: 'Conjonctions' },
  { id: 'keigo', label: 'Keigo' },
  { id: 'setsuzokushi', label: '接続詞' },
  { id: 'gairaigo', label: 'Gairaigo' },
  { id: 'ateji', label: 'Ateji' },
  { id: 'expressions', label: 'Expressions' },
] as const;

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
  selectedTheme?: string;
  selectedRelationGroup?: RelationGroupFilter;
  selectedRadical: string;
  selectedStrokes: StrokeFilter;
  sortBy: FrequencySort;
  categories: string[];
  radicalOptions: [string, RadicalEntry][];
  onSearchChange: (val: string) => void;
  onJlptChange: (lvl: string) => void;
  onCategoryChange: (cat: string) => void;
  onThemeChange?: (theme: string) => void;
  onRelationGroupChange?: (grp: RelationGroupFilter) => void;
  onRadicalChange: (rad: string) => void;
  onStrokesChange: (strokes: StrokeFilter) => void;
  onSortChange: (sort: FrequencySort) => void;
  onReset: () => void;
}

export function KanjiFilterBar({
  searchQuery,
  selectedJlpt,
  selectedCategory,
  selectedTheme = 'ALL',
  selectedRelationGroup = 'ALL',
  selectedRadical,
  selectedStrokes,
  sortBy,
  categories,
  radicalOptions,
  onSearchChange,
  onJlptChange,
  onCategoryChange,
  onThemeChange,
  onRelationGroupChange,
  onRadicalChange,
  onStrokesChange,
  onSortChange,
  onReset,
}: KanjiFilterBarProps) {
  const hasActiveFilter =
    Boolean(searchQuery) ||
    selectedJlpt !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    selectedTheme !== 'ALL' ||
    selectedRelationGroup !== 'ALL' ||
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
              <option value="score10">Échelle 10 → 1 (Popularité)</option>
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

        {onThemeChange && (
          <div>
            <label htmlFor="kanji-theme-select" className="kanji-filters__label">
              Thème grammatical / lexical
            </label>
            <select
              id="kanji-theme-select"
              value={selectedTheme}
              onChange={(e) => onThemeChange(e.target.value)}
              className="kanji-filters__select"
            >
              {KANJI_THEME_OPTIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {onRelationGroupChange && (
          <div>
            <label htmlFor="kanji-group-select" className="kanji-filters__label">
              Groupes relationnels
            </label>
            <select
              id="kanji-group-select"
              value={selectedRelationGroup}
              onChange={(e) => onRelationGroupChange(e.target.value as RelationGroupFilter)}
              className="kanji-filters__select"
            >
              <option value="ALL">Tous les kanjis</option>
              <option value="similar">Visuels proches</option>
              <option value="synonyms">Avec synonymes</option>
              <option value="antonyms">Avec antonymes</option>
              <option value="homonyms">Avec homophones</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

