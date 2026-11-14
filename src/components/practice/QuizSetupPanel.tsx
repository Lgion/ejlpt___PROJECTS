import React from 'react';
import { type DynamicQuizMode } from '@/lib/quizGenerator';
import { Play } from 'lucide-react';

export interface QuizModeOption {
  id: DynamicQuizMode;
  label: string;
  description: string;
}

const LEVELS = ['ALL', 'N5', 'N4', 'N3', 'N2', 'N1'] as const;
const COUNTS = [5, 10, 20] as const;

interface QuizSetupPanelProps {
  modes: QuizModeOption[];
  mode: DynamicQuizMode;
  level: string;
  count: number;
  timedMode: boolean;
  secondsPerQuestion: number;
  dueCount: number;
  isGenerating: boolean;
  emptyWarning: string | null;
  onModeChange: (mode: DynamicQuizMode) => void;
  onLevelChange: (level: string) => void;
  onCountChange: (count: number) => void;
  onTimedModeChange: (timed: boolean) => void;
  onSecondsChange: (seconds: number) => void;
  onStart: () => void;
}

export function QuizSetupPanel({
  modes,
  mode,
  level,
  count,
  timedMode,
  secondsPerQuestion,
  dueCount,
  isGenerating,
  emptyWarning,
  onModeChange,
  onLevelChange,
  onCountChange,
  onTimedModeChange,
  onSecondsChange,
  onStart,
}: QuizSetupPanelProps) {
  return (
    <section className="quiz-setup">
      <div>
        <h2 className="quiz-setup__step-title">1. Choisissez un mode d&apos;entraînement</h2>
        <div className="quiz-setup__modes-grid">
          {modes.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onModeChange(m.id)}
                className={`quiz-setup__mode-card ${
                  active ? 'quiz-setup__mode-card--active' : ''
                }`}
              >
                <div className="quiz-setup__mode-head">
                  <span>{m.label}</span>
                  {m.id === 'srs_review' && dueCount > 0 && (
                    <span className="quiz-setup__due-badge">{dueCount}</span>
                  )}
                </div>
                <p className="quiz-setup__mode-desc">{m.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="quiz-setup__options-grid">
        <div>
          <label htmlFor="practice-level-select" className="quiz-setup__field-label">
            2. Niveau JLPT
          </label>
          <select
            id="practice-level-select"
            value={level}
            onChange={(e) => onLevelChange(e.target.value)}
            className="quiz-setup__select"
          >
            {LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl === 'ALL' ? 'Tous niveaux (N5 → N1)' : `Niveau ${lvl}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="quiz-setup__field-label">3. Nombre de questions</span>
          <div className="quiz-setup__counts-grid">
            {COUNTS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onCountChange(c)}
                className={`quiz-setup__count-btn ${
                  count === c ? 'quiz-setup__count-btn--active' : ''
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="quiz-setup__field-label">4. Contre-la-montre</span>
          <div className="quiz-setup__timer-row">
            <label htmlFor="practice-timer-toggle" className="quiz-setup__checkbox-label">
              <input
                id="practice-timer-toggle"
                type="checkbox"
                checked={timedMode}
                onChange={(e) => onTimedModeChange(e.target.checked)}
                className="quiz-setup__checkbox"
              />
              Chrono
            </label>
            {timedMode && (
              <select
                aria-label="Secondes par question"
                value={secondsPerQuestion}
                onChange={(e) => onSecondsChange(Number(e.target.value))}
                className="quiz-setup__timer-select"
              >
                <option value={10}>10s / q</option>
                <option value={20}>20s / q</option>
                <option value={30}>30s / q</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {emptyWarning && (
        <div role="alert" className="quiz-setup__warning">
          {emptyWarning}
        </div>
      )}

      <div className="quiz-setup__footer">
        <button
          type="button"
          disabled={isGenerating}
          onClick={onStart}
          className="quiz-setup__start-btn"
        >
          <Play className="quiz-setup__start-icon" />
          {isGenerating ? 'Génération en cours...' : 'Lancer la session'}
        </button>
      </div>
    </section>
  );
}

