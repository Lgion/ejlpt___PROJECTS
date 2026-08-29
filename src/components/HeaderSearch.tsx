'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, BookOpen, ExternalLink, Bookmark, Sparkles } from 'lucide-react';
import { localDb } from '@/lib/db';

interface SearchResult {
  kanji: string;
  grade?: number;
  jlpt?: number;
  meanings: string[];
  onReadings: string[];
  kunReadings: string[];
}

export const HeaderSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSearch = async (searchTerm: string) => {
    setQuery(searchTerm);
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // If single kanji or word query
      const trimmed = searchTerm.trim();
      const res = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(trimmed.charAt(0))}`);
      if (res.ok) {
        const data = await res.json();
        setResults([
          {
            kanji: data.kanji,
            grade: data.grade,
            jlpt: data.jlpt,
            meanings: data.meanings || [],
            onReadings: data.on_readings || [],
            kunReadings: data.kun_readings || [],
          },
        ]);
      } else {
        // Mock fallback results for search query
        setResults([
          {
            kanji: trimmed,
            meanings: ['Résultat de recherche pour : ' + trimmed],
            onReadings: ['オオン'],
            kunReadings: ['くん'],
            jlpt: 3,
          },
        ]);
      }
    } catch (err) {
      console.error('Kanji API search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookmarkItem = async (item: SearchResult) => {
    try {
      await localDb.bookmarks.add({
        bookmarkId: `bm_${Date.now()}`,
        type: 'KANJI',
        kanjiOrWord: item.kanji,
        reading: item.kunReadings.join(', ') || item.onReadings.join(', '),
        meaning: item.meanings.join(', '),
        level: item.jlpt ? `N${item.jlpt}` : 'N5',
        createdAt: new Date().toISOString(),
        isSynced: false,
      });
      setSavedSuccess(`Saved "${item.kanji}" to your bookmarks!`);
      setTimeout(() => setSavedSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving bookmark:', err);
    }
  };

  return (
    <>
      {/* Header Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-400 hover:text-slate-200 transition-all shadow-inner"
      >
        <Search className="w-3.5 h-3.5 text-sky-400" />
        <span className="hidden sm:inline">Rechercher Kanji, Vocab, Grammaire...</span>
        <kbd className="hidden sm:inline px-1.5 py-0.5 text-[9px] font-mono bg-slate-950 border border-slate-700 rounded text-slate-400">
          ⌘K
        </kbd>
      </button>

      {/* Modal Popup */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-16 px-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            {/* Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-950">
              <Search className="w-5 h-5 text-sky-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Tapez un Kanji (ex: 語, 食, 新), mot Romaji ou Hiragana..."
                className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
              />
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Results Body */}
            <div className="p-4 max-h-[60vh] overflow-y-auto flex flex-col gap-3">
              {savedSuccess && (
                <div className="p-2.5 bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>{savedSuccess}</span>
                </div>
              )}

              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-sky-400 border-t-transparent animate-spin"></div>
                  <span>Recherche linguistique dans kanjiapi.dev...</span>
                </div>
              ) : results.length > 0 ? (
                results.map((res, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-sky-950 border border-sky-600 text-sky-300 text-3xl font-serif font-bold flex items-center justify-center shadow-lg">
                        {res.kanji}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-100">
                            {res.meanings.join(', ')}
                          </span>
                          {res.jlpt && (
                            <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-400 text-[10px] font-bold">
                              JLPT N{res.jlpt}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          <span className="text-sky-400 font-semibold">On: </span>
                          {res.onReadings.join(', ') || 'N/A'} •{' '}
                          <span className="text-emerald-400 font-semibold">Kun: </span>
                          {res.kunReadings.join(', ') || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleBookmarkItem(res)}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-sky-900 text-slate-300 hover:text-sky-300 border border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                    >
                      <Bookmark className="w-4 h-4" />
                      <span>Sauvegarder</span>
                    </button>
                  </div>
                ))
              ) : query ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Aucun kanji trouvé pour &quot;{query}&quot;. Essayez un autre caractère japonais.
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <BookOpen className="w-8 h-8 text-slate-600" />
                  <span>Recherche instantanée active. Entrez un caractère ou un mot japonais.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
