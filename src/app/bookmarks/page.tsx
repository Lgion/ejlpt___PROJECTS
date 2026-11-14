'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUser } from '@clerk/nextjs';
import { localDb, LocalBookmark } from '@/lib/db';
import { enqueueSyncAction, flushSyncQueue } from '@/lib/sync';
import { BookmarkCreateForm } from '@/components/bookmarks/BookmarkCreateForm';
import { BookmarkFilterBar } from '@/components/bookmarks/BookmarkFilterBar';
import { BookmarkCard } from '@/components/bookmarks/BookmarkCard';
import { Bookmark, RefreshCw, Plus, X } from 'lucide-react';

export default function BookmarksPage() {
  const { isSignedIn } = useUser();
  const [filterType, setFilterType] = useState<'ALL' | LocalBookmark['type']>('ALL');
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newReading, setNewReading] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newType, setNewType] = useState<LocalBookmark['type']>('VOCAB');
  const [newLevel, setNewLevel] = useState('N5');
  const [newNotes, setNewNotes] = useState('');

  const bookmarks = useLiveQuery(async () => {
    const all = await localDb.bookmarks.orderBy('createdAt').reverse().toArray();
    const q = query.trim().toLowerCase();
    return all.filter((b) => {
      if (filterType !== 'ALL' && b.type !== filterType) return false;
      if (!q) return true;
      return (
        b.kanjiOrWord.toLowerCase().includes(q) ||
        b.meaning.toLowerCase().includes(q) ||
        Boolean(b.reading && b.reading.toLowerCase().includes(q)) ||
        Boolean(b.notes && b.notes.toLowerCase().includes(q))
      );
    });
  }, [filterType, query]);

  const handleSaveNotes = async (bm: LocalBookmark) => {
    await localDb.bookmarks
      .where('bookmarkId')
      .equals(bm.bookmarkId)
      .modify({ notes: editNotes, isSynced: 0 });
    await enqueueSyncAction('SAVE_BOOKMARK', { ...bm, notes: editNotes }, Boolean(isSignedIn));
    setEditingId(null);
  };

  const handleDelete = async (bookmarkId: string) => {
    await localDb.bookmarks.where('bookmarkId').equals(bookmarkId).delete();
    await enqueueSyncAction('DELETE_BOOKMARK', { bookmarkId }, Boolean(isSignedIn));
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await flushSyncQueue(Boolean(isSignedIn));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedWord = newWord.trim();
    const trimmedMeaning = newMeaning.trim();
    if (!trimmedWord || !trimmedMeaning) return;

    const payload = {
      bookmarkId: `bm_${crypto.randomUUID()}`,
      type: newType,
      kanjiOrWord: trimmedWord,
      reading: newReading.trim() || undefined,
      meaning: trimmedMeaning,
      level: newLevel,
      notes: newNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
      isSynced: 0 as const,
    };
    await localDb.bookmarks.add(payload);
    await enqueueSyncAction('SAVE_BOOKMARK', payload, Boolean(isSignedIn));
    setNewWord('');
    setNewReading('');
    setNewMeaning('');
    setNewNotes('');
    setShowAddForm(false);
  };

  const rows = bookmarks || [];
  const unsyncedCount = rows.filter((r) => r.isSynced === 0).length;

  return (
    <div className="bookmarks-page">
      <div className="bookmarks-page__header">
        <div>
          <div className="bookmarks-page__badge">
            <Bookmark className="bookmarks-page__badge-icon" />
            <span>Mon Carnet d&apos;Étude Personnel (Local-First + Cloud)</span>
          </div>
          <h1 className="bookmarks-page__title">Notes, Favoris &amp; Lexique</h1>
          <p className="bookmarks-page__subtitle">
            Retrouvez ici toutes vos sélections sauvegardées depuis le texte, la recherche ⌘K et
            les fiches d&apos;étude.
          </p>
        </div>

        <div className="bookmarks-page__actions">
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="bookmarks-page__add-btn"
          >
            {showAddForm ? (
              <X className="bookmarks-page__action-icon" />
            ) : (
              <Plus className="bookmarks-page__action-icon" />
            )}
            <span>{showAddForm ? 'Fermer' : 'Ajouter'}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleManualSync()}
            disabled={isSyncing}
            className="bookmarks-page__sync-btn"
          >
            <RefreshCw
              className={`bookmarks-page__action-icon ${
                isSyncing ? 'bookmarks-page__action-icon--spin' : ''
              }`}
            />
            <span>Synchroniser ({unsyncedCount} en attente)</span>
          </button>
        </div>
      </div>

      {showAddForm && (
        <BookmarkCreateForm
          newWord={newWord}
          newReading={newReading}
          newMeaning={newMeaning}
          newType={newType}
          newLevel={newLevel}
          newNotes={newNotes}
          onWordChange={setNewWord}
          onReadingChange={setNewReading}
          onMeaningChange={setNewMeaning}
          onTypeChange={setNewType}
          onLevelChange={setNewLevel}
          onNotesChange={setNewNotes}
          onSubmit={(e) => void handleAddBookmark(e)}
        />
      )}

      <BookmarkFilterBar
        query={query}
        filterType={filterType}
        onQueryChange={setQuery}
        onTypeChange={setFilterType}
      />

      {rows.length === 0 ? (
        <div className="bookmarks-page__empty">
          <Bookmark className="bookmarks-page__empty-icon" />
          <p>
            Votre carnet est vide pour ce filtre. Sélectionnez du texte sur n&apos;importe quelle
            page ou ajoutez des fiches Kanji/Grammaire.
          </p>
          <div className="bookmarks-page__empty-links">
            <Link
              href="/kanji"
              className="bookmarks-page__empty-btn bookmarks-page__empty-btn--primary"
            >
              Explorer les Kanjis
            </Link>
            <Link
              href="/grammar"
              className="bookmarks-page__empty-btn bookmarks-page__empty-btn--secondary"
            >
              Explorer la Grammaire
            </Link>
          </div>
        </div>
      ) : (
        <div className="bookmarks-page__grid">
          {rows.map((bm) => (
            <BookmarkCard
              key={bm.bookmarkId}
              bookmark={bm}
              isEditing={editingId === bm.bookmarkId}
              editNotes={editNotes}
              onStartEdit={(item) => {
                setEditingId(item.bookmarkId);
                setEditNotes(item.notes || '');
              }}
              onCancelEdit={() => setEditingId(null)}
              onEditNotesChange={setEditNotes}
              onSaveNotes={(item) => void handleSaveNotes(item)}
              onDelete={(id) => void handleDelete(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
