'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { Search, X, BookOpen, Bookmark, Sparkles, ArrowRight } from 'lucide-react';
import { localDb } from '@/lib/db';
import { searchOffline, GlobalSearchHit, SearchResultKind } from '@/lib/search';
import { enqueueSyncAction } from '@/lib/sync';

const KIND_FILTERS: Array<{ id: 'ALL' | SearchResultKind; label: string }> = [
  { id: 'ALL', label: 'Tout' },
  { id: 'KANJI', label: 'Kanji' },
  { id: 'GRAMMAR', label: 'Grammaire' },
  { id: 'JUKUGO', label: 'Jukugo' },
  { id: 'SLANG', label: 'Slang' },
  { id: 'ONOMATOPOEIA', label: 'Onomatopées' },
];

export const HeaderSearch: React.FC = () => {
  const { isSignedIn } = useUser();
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<'ALL' | SearchResultKind>('ALL');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GlobalSearchHit[]>([]);
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

  // Shortcut Ctrl+K / Cmd+K + fallback light dismiss when closedby="any" is missing
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

  const handleSearch = async (searchTerm: string) => {
    setQuery(searchTerm);
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const hits = await searchOffline(searchTerm, 32);
      setResults(hits);
    } catch (err) {
      console.error('Offline search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      const top = filteredResults[0];
      if (top) {
        closeModal();
        window.location.href = top.href;
      }
    }
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

  const filteredResults =
    kindFilter === 'ALL' ? results : results.filter((r) => r.kind === kindFilter);

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
              onChange={(e) => void handleSearch(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Kanji (語), Romaji (taberu), Grammaire (くらい), Sens (eau)..."
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
                onClick={() => setKindFilter(f.id)}
                className={`search-modal__tab ${
                  kindFilter === f.id ? 'search-modal__tab--active' : ''
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

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
            ) : filteredResults.length > 0 ? (
              filteredResults.map((res) => (
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
                    onClick={() => void handleBookmarkItem(res)}
                    aria-label={`Sauvegarder ${res.title} dans le carnet`}
                    className="search-modal__bookmark-btn"
                  >
                    <Bookmark className="search-modal__bookmark-icon" />
                  </button>
                </div>
              ))
            ) : query ? (
              <div className="search-modal__empty">
                Aucun résultat local pour &quot;{query}&quot;.
              </div>
            ) : (
              <div className="search-modal__hint">
                <BookOpen className="search-modal__hint-icon" />
                <span>
                  Recherche 100 % offline sur 3 042 kanjis, 3 422 grammaires, 33 425 jukugos, slang et onomatopées.
                </span>
              </div>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
};
