import React from 'react';
import { type ReaderFuriganaMode, type TargetJLPTLevel } from '@/lib/textAnalyzer';
import { Eye } from 'lucide-react';

interface ReaderControlsProps {
  targetLevel: TargetJLPTLevel;
  furiganaMode: ReaderFuriganaMode;
  inputText: string;
  onTargetLevelChange: (lvl: TargetJLPTLevel) => void;
  onFuriganaModeChange: (mode: ReaderFuriganaMode) => void;
  onInputTextChange: (txt: string) => void;
}

const TARGET_LEVELS: TargetJLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const FURIGANA_OPTIONS: Array<{ id: ReaderFuriganaMode; label: string }> = [
  { id: 'ADAPTIVE', label: 'Adaptatifs' },
  { id: 'ALWAYS', label: 'Toujours' },
  { id: 'OFF', label: 'Masqués' },
];

export function ReaderControls({
  targetLevel,
  furiganaMode,
  inputText,
  onTargetLevelChange,
  onFuriganaModeChange,
  onInputTextChange,
}: ReaderControlsProps) {
  return (
    <section className="reader-controls">
      <div className="reader-controls__bar">
        <div className="reader-controls__target-row">
          <label htmlFor="reader-target-level" className="reader-controls__target-label">
            Niveau acquis cible :
          </label>
          <select
            id="reader-target-level"
            value={targetLevel}
            onChange={(e) => onTargetLevelChange(e.target.value as TargetJLPTLevel)}
            className="reader-controls__select"
          >
            {TARGET_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </div>

        <div
          role="group"
          aria-label="Mode d'affichage des furigana"
          className="reader-controls__furi-group"
        >
          <span className="reader-controls__furi-label">
            <Eye className="reader-controls__furi-icon" /> Furigana :
          </span>
          {FURIGANA_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onFuriganaModeChange(opt.id)}
              className={`reader-controls__furi-btn ${
                furiganaMode === opt.id ? 'reader-controls__furi-btn--active' : ''
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="reader-source-textarea" className="sr-only-label">
          Texte ou script japonais à analyser
        </label>
        <textarea
          id="reader-source-textarea"
          rows={4}
          value={inputText}
          onChange={(e) => onInputTextChange(e.target.value)}
          placeholder="Collez un passage de manga, sous-titre ou article japonais..."
          className="reader-controls__textarea"
        />
      </div>
    </section>
  );
}

