'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { Bookmark, X, CheckCircle, Tag } from 'lucide-react';
import { localDb } from '@/lib/db';
import { enqueueSyncAction } from '@/lib/sync';

type SelectionCategory = 'KANJI' | 'VOCAB' | 'GRAMMAR' | 'PHRASE' | 'OTHER';

function toBookmarkType(cat: SelectionCategory): 'KANJI' | 'VOCAB' | 'GRAMMAR' {
  if (cat === 'KANJI' || cat === 'VOCAB' || cat === 'GRAMMAR') return cat;
  return 'VOCAB';
}

export const SelectionBookmarkToolbar: React.FC = () => {
  const { isSignedIn } = useUser();
  const [selectedText, setSelectedText] = useState('');
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [category, setCategory] = useState<SelectionCategory>('VOCAB');
  const [notes, setNotes] = useState('');
  const [meaning, setMeaning] = useState('');
  const [savedStatus, setSavedStatus] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

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

  const closeModal = () => {
    if (dialogRef.current?.open) {
      dialogRef.current.close();
    }
  };

  const handleOpenBookmarkModal = () => {
    if (selectedText.length === 1 && /[\u4e00-\u9faf]/.test(selectedText)) {
      setCategory('KANJI');
    } else if (selectedText.includes('〜') || selectedText.includes('て') || selectedText.length > 15) {
      setCategory('PHRASE');
    } else {
      setCategory('VOCAB');
    }
    setToolbarPos(null);
    dialogRef.current?.showModal();
  };

  const handleSaveBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedText) return;
    try {
      const payload = {
        bookmarkId: `bm_${crypto.randomUUID()}`,
        type: toBookmarkType(category),
        kanjiOrWord: selectedText,
        meaning: meaning || notes || 'Note sauvegardée par sélection',
        level: 'N3',
        notes: `Catégorie: ${category} | ${notes}`.trim(),
        createdAt: new Date().toISOString(),
        isSynced: 0 as const,
      };
      await localDb.bookmarks.add(payload);
      await enqueueSyncAction('SAVE_BOOKMARK', payload, Boolean(isSignedIn));

      setSavedStatus(true);
      setTimeout(() => {
        setSavedStatus(false);
        closeModal();
        setNotes('');
        setMeaning('');
      }, 1200);
    } catch (err) {
      console.error('Error saving selection bookmark:', err);
    }
  };

  return (
    <>
      {toolbarPos && (
        <div
          style={{ top: `${toolbarPos.y}px`, left: `${toolbarPos.x}px` }}
          className="selection-toolbar"
        >
          <button
            type="button"
            onClick={handleOpenBookmarkModal}
            className="selection-toolbar__btn"
          >
            <Bookmark className="selection-toolbar__icon" />
            <span>Sauvegarder la sélection</span>
          </button>
        </div>
      )}

      <dialog
        ref={dialogRef}
        closedby="any"
        aria-labelledby="selection-bookmark-title"
        className="selection-modal"
      >
        <form onSubmit={(e) => void handleSaveBookmark(e)} className="selection-modal__form">
          <div className="selection-modal__header">
            <h2 id="selection-bookmark-title" className="selection-modal__title">
              <Bookmark className="selection-modal__icon" />
              Sauvegarder dans mes Notes &amp; Lexique
            </h2>
            <button
              type="button"
              onClick={closeModal}
              aria-label="Fermer la fenêtre de sauvegarde"
              className="selection-modal__close-btn"
            >
              <X className="selection-modal__icon" />
            </button>
          </div>

          <div className="selection-modal__preview">&quot;{selectedText}&quot;</div>

          <div className="selection-modal__categories">
            <span className="selection-modal__label">
              <Tag className="selection-modal__label-icon" />
              Choix de la Catégorie :
            </span>
            <div className="selection-modal__cat-grid">
              {[
                { id: 'KANJI', label: 'Kanji (漢字)' },
                { id: 'VOCAB', label: 'Vocabulaire' },
                { id: 'GRAMMAR', label: 'Grammaire' },
                { id: 'PHRASE', label: 'Phrase entière' },
                { id: 'OTHER', label: 'Autre groupe' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id as SelectionCategory)}
                  className={`selection-modal__cat-btn ${
                    category === cat.id ? 'selection-modal__cat-btn--active' : ''
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="selection-modal__fields">
            <div>
              <label htmlFor="selection-meaning-input" className="selection-modal__field-label">
                Traduction / Sens (optionnel) :
              </label>
              <input
                id="selection-meaning-input"
                type="text"
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                placeholder="ex: Étudier la langue japonaise..."
                className="selection-modal__input"
              />
            </div>

            <div>
              <label htmlFor="selection-notes-input" className="selection-modal__field-label">
                Notes personnelles :
              </label>
              <textarea
                id="selection-notes-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explications grammaticales, contexte d'utilisation..."
                rows={2}
                className="selection-modal__input"
              />
            </div>
          </div>

          {savedStatus && (
            <div aria-live="polite" className="selection-modal__toast">
              <CheckCircle className="selection-modal__toast-icon" />
              <span>Sélection enregistrée dans votre carnet Local-First !</span>
            </div>
          )}

          <div className="selection-modal__footer">
            <button type="button" onClick={closeModal} className="selection-modal__cancel-btn">
              Annuler
            </button>
            <button type="submit" className="selection-modal__save-btn">
              <Bookmark className="selection-modal__save-icon" />
              Enregistrer la note
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
};
