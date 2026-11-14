import React from 'react';
import { LocalBookmark } from '@/lib/db';

interface BookmarkCreateFormProps {
  newWord: string;
  newReading: string;
  newMeaning: string;
  newType: LocalBookmark['type'];
  newLevel: string;
  newNotes: string;
  onWordChange: (val: string) => void;
  onReadingChange: (val: string) => void;
  onMeaningChange: (val: string) => void;
  onTypeChange: (type: LocalBookmark['type']) => void;
  onLevelChange: (lvl: string) => void;
  onNotesChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function BookmarkCreateForm({
  newWord,
  newReading,
  newMeaning,
  newType,
  newLevel,
  newNotes,
  onWordChange,
  onReadingChange,
  onMeaningChange,
  onTypeChange,
  onLevelChange,
  onNotesChange,
  onSubmit,
}: BookmarkCreateFormProps) {
  return (
    <form onSubmit={onSubmit} className="bookmark-form">
      <div>
        <label htmlFor="bm-add-word" className="bookmark-form__label">
          Mot / Kanji *
        </label>
        <input
          id="bm-add-word"
          type="text"
          required
          value={newWord}
          onChange={(e) => onWordChange(e.target.value)}
          placeholder="例: 勉強"
          className="bookmark-form__input"
        />
      </div>
      <div>
        <label htmlFor="bm-add-reading" className="bookmark-form__label">
          Lecture
        </label>
        <input
          id="bm-add-reading"
          type="text"
          value={newReading}
          onChange={(e) => onReadingChange(e.target.value)}
          placeholder="べんきょう"
          className="bookmark-form__input"
        />
      </div>
      <div className="bookmark-form__meaning-col">
        <label htmlFor="bm-add-meaning" className="bookmark-form__label">
          Sens / Traduction *
        </label>
        <input
          id="bm-add-meaning"
          type="text"
          required
          value={newMeaning}
          onChange={(e) => onMeaningChange(e.target.value)}
          placeholder="Étudier, réviser"
          className="bookmark-form__input"
        />
      </div>
      <div>
        <label htmlFor="bm-add-type" className="bookmark-form__label">
          Catégorie &amp; Niveau
        </label>
        <div className="bookmark-form__select-row">
          <select
            id="bm-add-type"
            value={newType}
            onChange={(e) => onTypeChange(e.target.value as LocalBookmark['type'])}
            className="bookmark-form__select bookmark-form__select--flex"
          >
            <option value="VOCAB">VOCAB</option>
            <option value="KANJI">KANJI</option>
            <option value="GRAMMAR">GRAMMAR</option>
            <option value="QUESTION">QUESTION</option>
          </select>
          <select
            aria-label="Niveau JLPT"
            value={newLevel}
            onChange={(e) => onLevelChange(e.target.value)}
            className="bookmark-form__select"
          >
            <option value="N5">N5</option>
            <option value="N4">N4</option>
            <option value="N3">N3</option>
            <option value="N2">N2</option>
            <option value="N1">N1</option>
          </select>
        </div>
      </div>
      <div className="bookmark-form__note-submit">
        <div className="bookmark-form__note-wrap">
          <label htmlFor="bm-add-notes" className="bookmark-form__label">
            Note
          </label>
          <input
            id="bm-add-notes"
            type="text"
            value={newNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Contexte..."
            className="bookmark-form__input"
          />
        </div>
        <button type="submit" className="bookmark-form__submit-btn">
          Créer
        </button>
      </div>
    </form>
  );
}
