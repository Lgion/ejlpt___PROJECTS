'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import {
  Search,
  X,
  BookOpen,
  Bookmark,
  Sparkles,
  ArrowRight,
  GitCompareArrows,
} from 'lucide-react';
import { localDb } from '@/lib/db';
import {
  searchOfflineAdvanced,
  type GlobalSearchHit,
  type SearchResultKind,
  type SearchSortMode,
} from '@/lib/search';
import { enqueueSyncAction } from '@/lib/sync';

const KIND_FILTERS: Array<{ id: 'ALL' | SearchResultKind; label: string }> = [
  { id: 'ALL', label: 'Tout' },
  { id: 'KANJI', label: 'Kanji' },
  { id: 'GRAMMAR', label: 'Grammaire' },
  { id: 'JUKUGO', label: 'Jukugo' },
  { id: 'SLANG', label: 'Slang' },
  { id: 'ONOMATOPOEIA', label: 'Onomatopées' },
];

const QUICK_OPERATORS = [
  'only:kanji',
  'only:n5',
  'skip:1-',
  'trans:jidoushi',
  'reg:soto',
  'comparer 語 言',
];

export const HeaderSearch: React.FC = () => {
  const { isSignedIn } = useUser();
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<'ALL' | SearchResultKind>('ALL');
  const [sortBy, setSortBy] = useState<SearchSortMode>('relevance');
  const [sotoFilter, setSotoFilter] = useState<'ALL' | 'soto' | 'uchi'>('ALL');
  const [transFilter, setTransFilter] = useState<'ALL' | 'jidoushi' | 'tadoushi'>('ALL');

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GlobalSearchHit[]>([]);
  const [relatedQueries, setRelatedQueries] = useState<string[]>([]);
  const [comparePair, setComparePair] = useState<[GlobalSearchHit | null, GlobalSearchHit | null] | null>(
    null
  );
  const [pinnedCompare, setPinnedCompare] = useState<GlobalSearchHit[]>([]);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openModal = () => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const closeModal = () => {
    const dialog = dialogRef.current;
    if (dialog && dialog.open) {
      dialog.close();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const dialog = dialogRef.current;
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) {
      return () => window.removeEventListener('keydown', handleKeyDown);
    }

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) dialog.close();
      pressedOutside = false;
    };
    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const executeSearch = async (
    searchTerm: string,
    opts?: {
      kind?: 'ALL' | SearchResultKind;
      sort?: SearchSortMode;
      soto?: 'ALL' | 'soto' | 'uchi';
      trans?: 'ALL' | 'jidoushi' | 'tadoushi';
    }
  ) => {
    setQuery(searchTerm);
    const activeSoto = opts?.soto ?? sotoFilter;
    const activeTrans = opts?.trans ?? transFilter;
    if (!searchTerm.trim() && activeSoto === 'ALL' && activeTrans === 'ALL') {
      setResults([]);
      setRelatedQueries([]);
      setComparePair(null);
      return;
    }

    setLoading(true);
    try {
      const res = await searchOfflineAdvanced(searchTerm, {
        limit: 32,
        kindFilter: opts?.kind ?? kindFilter,
        sortBy: opts?.sort ?? sortBy,
        sotoUchi: activeSoto,
        transitivity: activeTrans,
      });
      setResults(res.hits);
      setRelatedQueries(res.relatedQueries);
      setComparePair(res.comparePair ?? null);
    } catch (err) {
      console.error('Offline search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      const top = results[0];
      if (top) {
        closeModal();
        window.location.href = top.href;
      }
    }
  };

  const handleTogglePinCompare = (hit: GlobalSearchHit) => {
    setPinnedCompare((prev) => {
      if (prev.some((item) => item.id === hit.id)) {
        return prev.filter((item) => item.id !== hit.id);
      }
      if (prev.length >= 2) {
        return [prev[1], hit];
      }
      return [...prev, hit];
    });
  };

  const handleBookmarkItem = async (item: GlobalSearchHit) => {
    try {
      const bookmarkPayload = {
        bookmarkId: `bm_${crypto.randomUUID()}`,
        type: item.bookmarkType,
        kanjiOrWord: item.title,
        reading: item.reading,
        meaning: item.meaning || item.title,
        level: item.level || 'N5',
        createdAt: new Date().toISOString(),
        isSynced: 0 as const,
      };
      await localDb.bookmarks.add(bookmarkPayload);
      await enqueueSyncAction('SAVE_BOOKMARK', bookmarkPayload, Boolean(isSignedIn));
      setSavedSuccess(`« ${item.title} » enregistré dans votre carnet !`);
      setTimeout(() => setSavedSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving bookmark:', err);
    }
  };

  const effectiveCompare: [GlobalSearchHit | null, GlobalSearchHit | null] | null =
    comparePair || (pinnedCompare.length === 2 ? [pinnedCompare[0], pinnedCompare[1]] : null);

  const kindBadgeClass = (kind: SearchResultKind) => {
    switch (kind) {
      case 'KANJI':
        return 'search-modal__kind-badge--kanji';
      case 'GRAMMAR':
        return 'search-modal__kind-badge--grammar';
      case 'JUKUGO':
        return 'search-modal__kind-badge--jukugo';
      case 'SLANG':
        return 'search-modal__kind-badge--slang';
      default:
        return 'search-modal__kind-badge--ono';
    }
  };

  return (
    <>
      <button type="button" onClick={openModal} className="search-trigger">
        <Search className="search-trigger__icon" />
        <span className="search-trigger__text">Rechercher (Offline)...</span>
        <kbd className="search-trigger__kbd">⌘K</kbd>
      </button>

      <dialog
        ref={dialogRef}
        closedby="any"
        aria-labelledby="global-search-title"
        className="search-modal"
      >
        <div className="search-modal__body">
          <div className="search-modal__bar">
            <Search className="search-modal__search-icon" />
            <label htmlFor="global-search-input" id="global-search-title" className="sr-only-label">
              Recherche globale hors-ligne eJLPT
            </label>
            <input
              ref={inputRef}
              id="global-search-input"
              type="search"
              value={query}
              onChange={(e) => void executeSearch(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Kanji, romaji, only:kanji, -N1, skip:1-7, reg:soto, comparer A B…"
              className="search-modal__input"
            />
            <button
              type="button"
              onClick={closeModal}
              aria-label="Fermer la recherche"
              className="search-modal__close-btn"
            >
              <X className="search-modal__close-icon" />
            </button>
          </div>

          <div className="search-modal__tabs">
            {KIND_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setKindFilter(f.id);
                  void executeSearch(query, { kind: f.id });
                }}
                className={`search-modal__tab ${
                  kindFilter === f.id ? 'search-modal__tab--active' : ''
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="search-advanced__toolbar">
            <div className="search-advanced__operators">
              {QUICK_OPERATORS.map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => {
                    const next = op.startsWith('comparer')
                      ? op
                      : `${query.trim()} ${op}`.trim();
                    void executeSearch(next);
                  }}
                  className="search-advanced__op-chip"
                >
                  {op}
                </button>
              ))}
            </div>

            <div className="search-advanced__selects">
              <select
                aria-label="Tri des résultats"
                value={sortBy}
                onChange={(e) => {
                  const next = e.target.value as SearchSortMode;
                  setSortBy(next);
                  void executeSearch(query, { sort: next });
                }}
                className="search-advanced__select"
              >
                <option value="relevance">Tri : Pertinence</option>
                <option value="freq_desc">Tri : Fréquence ↓</option>
                <option value="strokes_asc">Tri : Traits ↑</option>
                <option value="dualisme_pos">Tri : Nuance (+)</option>
                <option value="dualisme_neg">Tri : Nuance (−)</option>
              </select>

              <select
                aria-label="Registre Soto ou Uchi"
                value={sotoFilter}
                onChange={(e) => {
                  const next = e.target.value as 'ALL' | 'soto' | 'uchi';
                  setSotoFilter(next);
                  void executeSearch(query, { soto: next });
                }}
                className="search-advanced__select"
              >
                <option value="ALL">Soto/Uchi : Tous</option>
                <option value="soto">Soto (外)</option>
                <option value="uchi">Uchi (内)</option>
              </select>

              <select
                aria-label="Transitivité verbes"
                value={transFilter}
                onChange={(e) => {
                  const next = e.target.value as 'ALL' | 'jidoushi' | 'tadoushi';
                  setTransFilter(next);
                  void executeSearch(query, { trans: next });
                }}
                className="search-advanced__select"
              >
                <option value="ALL">自動 / 他動 : Tous</option>
                <option value="jidoushi">自動詞 (Intransitif)</option>
                <option value="tadoushi">他動詞 (Transitif)</option>
              </select>
            </div>
          </div>

          {relatedQueries.length > 0 && (
            <div className="search-advanced__related">
              <span className="search-advanced__related-label">Recherches associées :</span>
              {relatedQueries.map((rq) => (
                <button
                  key={rq}
                  type="button"
                  onClick={() => void executeSearch(rq)}
                  className="search-advanced__related-chip"
                >
                  {rq}
                </button>
              ))}
            </div>
          )}

          {effectiveCompare && (
            <div className="search-advanced__compare">
              <div className="search-advanced__compare-head">
                <span>
                  <GitCompareArrows className="w-3.5 h-3.5 inline mr-1.5" />
                  Comparaison côte à côte
                </span>
                {pinnedCompare.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPinnedCompare([])}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    Effacer sélection
                  </button>
                )}
              </div>
              <div className="search-advanced__compare-grid">
                {effectiveCompare.map((item, i) => (
                  <div key={i} className="search-advanced__compare-col">
                    {item ? (
                      <>
                        <div className="text-2xl font-serif font-black text-sky-300">{item.title}</div>
                        <div className="text-xs text-slate-200 font-semibold">{item.meaning}</div>
                        <div className="text-[11px] text-slate-400">
                          {item.level} • {item.strokes ?? '?'} traits • Fréq.{' '}
                          {item.frequencyScore10 ?? '?'}/10
                        </div>
                        {item.reading && (
                          <div className="text-[11px] text-indigo-300" lang="ja">
                            {item.reading}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-slate-500">Item introuvable dans l’index.</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="search-modal__results">
            {savedSuccess && (
              <div aria-live="polite" className="search-modal__toast">
                <Sparkles className="search-modal__toast-icon" />
                <span>{savedSuccess}</span>
              </div>
            )}

            {loading ? (
              <div className="search-modal__loading">
                <div className="search-modal__spinner" />
                <span>Indexation &amp; recherche locale FlexSearch...</span>
              </div>
            ) : results.length > 0 ? (
              results.map((res) => {
                const isPinned = pinnedCompare.some((p) => p.id === res.id);
                return (
                  <div key={res.id} className="search-modal__item">
                    <Link
                      href={res.href}
                      onClick={closeModal}
                      className="search-modal__item-link"
                    >
                      <div className={`search-modal__kind-badge ${kindBadgeClass(res.kind)}`}>
                        {res.title}
                      </div>
                      <div className="search-modal__item-info">
                        <div className="search-modal__item-head">
                          <span className="search-modal__item-meaning">
                            {res.meaning || res.title}
                          </span>
                          <span className="search-modal__item-meta">
                            {res.kind} • {res.level}
                            {res.skipCode ? ` • SKIP ${res.skipCode}` : ''}
                            {res.sotoUchi ? ` • ${res.sotoUchi}` : ''}
                          </span>
                        </div>
                        {res.reading && (
                          <div className="search-modal__item-reading">{res.reading}</div>
                        )}
                      </div>
                      <ArrowRight className="search-modal__item-arrow" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleTogglePinCompare(res)}
                      title="Comparer côte à côte"
                      aria-pressed={isPinned}
                      className={`search-advanced__pin-btn ${
                        isPinned ? 'search-advanced__pin-btn--active' : ''
                      }`}
                    >
                      <GitCompareArrows className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleBookmarkItem(res)}
                      aria-label={`Sauvegarder ${res.title} dans le carnet`}
                      className="search-modal__bookmark-btn"
                    >
                      <Bookmark className="search-modal__bookmark-icon" />
                    </button>
                  </div>
                );
              })
            ) : query || sotoFilter !== 'ALL' || transFilter !== 'ALL' ? (
              <div className="search-modal__empty">
                Aucun résultat local pour cette requête filtrée.
              </div>
            ) : (
              <div className="search-modal__hint">
                <BookOpen className="search-modal__hint-icon" />
                <span>
                  Astuce : combinez <code className="text-sky-300">only:kanji</code>,{' '}
                  <code className="text-sky-300">-N1</code>,{' '}
                  <code className="text-sky-300">skip:1-</code>,{' '}
                  <code className="text-sky-300">trans:jidoushi</code> ou{' '}
                  <code className="text-sky-300">comparer 語 言</code>.
                </span>
              </div>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
};
