'use client';

import React, { useState, useEffect } from 'react';
import { Bookmark, Sparkles, X, CheckCircle, Tag, FileText } from 'lucide-react';
import { localDb } from '@/lib/db';

export const SelectionBookmarkToolbar: React.FC = () => {
  const [selectedText, setSelectedText] = useState('');
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState<'KANJI' | 'VOCAB' | 'GRAMMAR' | 'PHRASE' | 'OTHER'>('VOCAB');
  const [notes, setNotes] = useState('');
  const [meaning, setMeaning] = useState('');
  const [savedStatus, setSavedStatus] = useState(false);

  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setToolbarPos(null);
        return;
      }

      const text = selection.toString().trim();
      if (text.length > 0 && text.length < 300) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectedText(text);
        setToolbarPos({
          x: rect.left + rect.width / 2,
          y: rect.top - 40 + window.scrollY,
        });
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleOpenBookmarkModal = () => {
    // Auto-detect category based on selectedText length & Japanese char type
    if (selectedText.length === 1 && /[\u4e00-\u9faf]/.test(selectedText)) {
      setCategory('KANJI');
    } else if (selectedText.includes('〜') || selectedText.includes('て') || selectedText.length > 15) {
      setCategory('PHRASE');
    } else {
      setCategory('VOCAB');
    }
    setIsModalOpen(true);
    setToolbarPos(null);
  };

  const handleSaveBookmark = async () => {
    if (!selectedText) return;
    try {
      await localDb.bookmarks.add({
        bookmarkId: `bm_${Date.now()}`,
        type: category === 'PHRASE' || category === 'OTHER' ? 'VOCAB' : (category as any),
        kanjiOrWord: selectedText,
        meaning: meaning || notes || 'Note sauvegardée par sélection',
        level: 'N3',
        notes: `Catégorie: ${category} | ${notes}`,
        createdAt: new Date().toISOString(),
        isSynced: false,
      });

      setSavedStatus(true);
      setTimeout(() => {
        setSavedStatus(false);
        setIsModalOpen(false);
        setNotes('');
        setMeaning('');
      }, 1500);
    } catch (err) {
      console.error('Error saving selection bookmark:', err);
    }
  };

  return (
    <>
      {/* Floating Pill button on Text Selection */}
      {toolbarPos && !isModalOpen && (
        <div
          style={{ top: `${toolbarPos.y}px`, left: `${toolbarPos.x}px` }}
          className="absolute z-50 -translate-x-1/2 animate-in fade-in zoom-in-95 pointer-events-auto"
        >
          <button
            onClick={handleOpenBookmarkModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-2xl shadow-sky-600/50 border border-sky-400 transition-all hover:scale-105"
          >
            <Bookmark className="w-3.5 h-3.5 fill-current" />
            <span>Sauvegarder la sélection</span>
          </button>
        </div>
      )}

      {/* Category selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Bookmark className="w-4 h-4" />
                Sauvegarder dans mes Notes & Lexique
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selected Text Preview */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-lg font-bold text-slate-100 font-serif text-center">
              &quot;{selectedText}&quot;
            </div>

            {/* Category Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-sky-400" />
                Choix de la Catégorie :
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'KANJI', label: 'Kanji (漢字)' },
                  { id: 'VOCAB', label: 'Vocabulaire' },
                  { id: 'GRAMMAR', label: 'Grammaire' },
                  { id: 'PHRASE', label: 'Phrase entière' },
                  { id: 'OTHER', label: 'Autre groupe' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id as any)}
                    className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition-all text-center truncate ${
                      category === cat.id
                        ? 'bg-sky-950 border-sky-500 text-sky-300 ring-2 ring-sky-500/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Meaning & Notes input */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Traduction / Sens (optionnel) :</label>
                <input
                  type="text"
                  value={meaning}
                  onChange={e => setMeaning(e.target.value)}
                  placeholder="ex: Étudier la langue japonaise..."
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Notes personnelles :</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Explications grammaticales, contexte d'utilisation..."
                  rows={2}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {savedStatus && (
              <div className="p-2.5 bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Sélection enregistrée dans votre base Dexie.js !</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveBookmark}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/30 flex items-center gap-1.5"
              >
                <Bookmark className="w-4 h-4 fill-current" />
                Enregistrer la note
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
