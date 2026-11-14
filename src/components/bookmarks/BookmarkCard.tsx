import React from 'react';
import { LocalBookmark } from '@/lib/db';
import { Wifi, Edit3, Trash2, Check } from 'lucide-react';

interface BookmarkCardProps {
  bookmark: LocalBookmark;
  isEditing: boolean;
  editNotes: string;
  onStartEdit: (bm: LocalBookmark) => void;
  onCancelEdit: () => void;
  onEditNotesChange: (val: string) => void;
  onSaveNotes: (bm: LocalBookmark) => void;
  onDelete: (bookmarkId: string) => void;
}

export function BookmarkCard({
  bookmark,
  isEditing,
  editNotes,
  onStartEdit,
  onCancelEdit,
  onEditNotesChange,
  onSaveNotes,
  onDelete,
}: BookmarkCardProps) {
  return (
    <article className="bookmark-card">
      <div className="bookmark-card__head">
        <div>
          <div className="bookmark-card__title-row">
            <span className="bookmark-card__word">{bookmark.kanjiOrWord}</span>
            <span className="bookmark-card__type-badge">{bookmark.type}</span>
            <span className="bookmark-card__level-badge">{bookmark.level}</span>
          </div>
          {bookmark.reading && (
            <div className="bookmark-card__reading">{bookmark.reading}</div>
          )}
        </div>

        <div className="bookmark-card__actions">
          <span
            className={`bookmark-card__sync-pill ${
              bookmark.isSynced === 1
                ? 'bookmark-card__sync-pill--synced'
                : 'bookmark-card__sync-pill--local'
            }`}
          >
            <Wifi className="bookmark-card__sync-icon" />
            {bookmark.isSynced === 1 ? 'Synced' : 'Local'}
          </span>
          <button
            type="button"
            onClick={() => onStartEdit(bookmark)}
            aria-label={`Modifier les notes de ${bookmark.kanjiOrWord}`}
            className="bookmark-card__icon-btn bookmark-card__icon-btn--edit"
          >
            <Edit3 className="bookmark-card__action-icon" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(bookmark.bookmarkId)}
            aria-label={`Supprimer ${bookmark.kanjiOrWord}`}
            className="bookmark-card__icon-btn bookmark-card__icon-btn--delete"
          >
            <Trash2 className="bookmark-card__action-icon" />
          </button>
        </div>
      </div>

      <div className="bookmark-card__meaning">{bookmark.meaning}</div>

      {isEditing ? (
        <div className="bookmark-card__edit-box">
          <textarea
            value={editNotes}
            onChange={(e) => onEditNotesChange(e.target.value)}
            rows={2}
            className="bookmark-card__edit-textarea"
          />
          <div className="bookmark-card__edit-actions">
            <button
              type="button"
              onClick={onCancelEdit}
              className="bookmark-card__cancel-btn"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => onSaveNotes(bookmark)}
              className="bookmark-card__save-btn"
            >
              <Check className="bookmark-card__action-icon" />
              Enregistrer
            </button>
          </div>
        </div>
      ) : (
        bookmark.notes && <div className="bookmark-card__notes">{bookmark.notes}</div>
      )}
    </article>
  );
}

