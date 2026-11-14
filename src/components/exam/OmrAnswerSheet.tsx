'use client';

import React from 'react';
import { HelpCircle } from 'lucide-react';
import type { JLPTQuestion, JLPTLevel } from '@/types/jlpt';

interface OmrAnswerSheetProps {
  level: JLPTLevel;
  stageTitleJp: string;
  questions: JLPTQuestion[];
  currentIndex: number;
  answers: Record<string, string>;
  flaggedIds: Set<string>;
  examineeName: string;
  examineeNumber: string;
  onSelectAnswer: (questionId: string, optionId: string) => void;
  onJumpToQuestion: (index: number) => void;
  onToggleFlag: (questionId: string) => void;
  isDisabled?: boolean;
  includeListeningExampleRows?: boolean;
}

/**
 * Digital OMR mark sheet modeled directly on the official JLPT N3sheet.pdf,
 * supporting both 4-bubble rows (①②③④) and 3-bubble rows (①②③ for 聴解 問題4 & 5),
 * accessible radio fieldsets, and pre-filled れい (example) rows.
 */
export const OmrAnswerSheet: React.FC<OmrAnswerSheetProps> = ({
  level,
  stageTitleJp,
  questions,
  currentIndex,
  answers,
  flaggedIds,
  examineeName,
  examineeNumber,
  onSelectAnswer,
  onJumpToQuestion,
  onToggleFlag,
  isDisabled = false,
  includeListeningExampleRows = false,
}) => {
  const answeredCount = questions.filter((q) => Boolean(answers[q.id])).length;

  // Group questions sequentially by mondaiNumber to preserve booklet sub-blocks
  const groups: { mondaiNumber: number; items: { q: JLPTQuestion; globalIndex: number }[] }[] = [];
  questions.forEach((q, idx) => {
    const m = q.mondaiNumber ?? 1;
    const last = groups[groups.length - 1];
    if (!last || last.mondaiNumber !== m) {
      groups.push({ mondaiNumber: m, items: [{ q, globalIndex: idx }] });
    } else {
      last.items.push({ q, globalIndex: idx });
    }
  });

  const exampleAnswers: Record<number, { bubbles: number; chosen: number }> = {
    1: { bubbles: 4, chosen: 1 },
    2: { bubbles: 4, chosen: 4 },
    3: { bubbles: 4, chosen: 1 },
    4: { bubbles: 3, chosen: 1 },
    5: { bubbles: 3, chosen: 2 },
  };

  return (
    <aside className="jlpt-omr-sheet" aria-label="Feuille de réponses officielle OMR">
      <div className="jlpt-omr-sheet__header">
        <div>
          <p className="jlpt-omr-sheet__title" lang="ja">
            {level} 解答用紙（マークシート）
          </p>
          <p className="jlpt-omr-sheet__subtitle" lang="ja">
            {stageTitleJp}
          </p>
        </div>
        <div className="jlpt-omr-sheet__counter">
          <span>
            {answeredCount} / {questions.length}
          </span>
        </div>
      </div>

      <div className="jlpt-omr-sheet__candidate">
        <span className="jlpt-omr-sheet__cand-num">{examineeNumber}</span>
        <span className="jlpt-omr-sheet__cand-name">{examineeName}</span>
      </div>

      <div className="jlpt-omr-sheet__instruction" lang="ja">
        <span>良い例</span>
        <span className="jlpt-omr-dot-sample">●</span>
        <span className="jlpt-omr-hint">（クリックで直接マーク・移動）</span>
      </div>

      <div className="jlpt-omr-sheet__groups">
        {groups.map((group) => {
          const exInfo = includeListeningExampleRows
            ? exampleAnswers[group.mondaiNumber]
            : undefined;
          return (
            <div key={`omr-g-${group.mondaiNumber}`} className="jlpt-omr-group">
              <div className="jlpt-omr-group__title" lang="ja">
                問題 {group.mondaiNumber}
              </div>

              {exInfo && (
                <div className="jlpt-omr-row jlpt-omr-row--example" aria-hidden="true">
                  <span className="jlpt-omr-row__num" lang="ja">
                    れい
                  </span>
                  <div className="jlpt-omr-row__bubbles">
                    {Array.from({ length: exInfo.bubbles }, (_, bIdx) => bIdx + 1).map((n) => (
                      <span
                        key={n}
                        className={`jlpt-omr-bubble jlpt-omr-bubble--static ${
                          exInfo.chosen === n ? 'jlpt-omr-bubble--marked' : ''
                        }`}
                      >
                        {exInfo.chosen === n ? '' : n}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {group.items.map(({ q, globalIndex }) => {
                const rowNum =
                  q.scoringDomain === 'listening'
                    ? q.audioSegment?.itemNumber ?? q.questionNumber ?? globalIndex + 1
                    : q.questionNumber ?? globalIndex + 1;
                const chosen = answers[q.id];
                const isActive = globalIndex === currentIndex;
                const isFlagged = flaggedIds.has(q.id);
                const bubbleCount = q.options.length === 3 ? 3 : 4;

                return (
                  <fieldset
                    key={q.id}
                    className={`jlpt-omr-row ${isActive ? 'jlpt-omr-row--active' : ''}`}
                  >
                    <legend className="visually-hidden">
                      Question {rowNum} (問題 {group.mondaiNumber})
                    </legend>

                    <button
                      type="button"
                      onClick={() => onJumpToQuestion(globalIndex)}
                      className="jlpt-omr-row__num"
                      title={`Aller à la question ${rowNum}`}
                    >
                      {rowNum}
                    </button>

                    <div className="jlpt-omr-row__bubbles">
                      {Array.from({ length: bubbleCount }, (_, idx) => String(idx + 1)).map(
                        (optId) => {
                          const inputId = `omr-${q.id}-${optId}`;
                          const isChecked = chosen === optId;
                          return (
                            <div key={optId} className="jlpt-omr-cell">
                              <input
                                id={inputId}
                                type="radio"
                                name={`omr-q-${q.id}`}
                                value={optId}
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={() => {
                                  onSelectAnswer(q.id, optId);
                                  onJumpToQuestion(globalIndex);
                                }}
                                className="visually-hidden jlpt-omr-radio"
                              />
                              <label
                                htmlFor={inputId}
                                className={`jlpt-omr-bubble ${
                                  isChecked ? 'jlpt-omr-bubble--marked' : ''
                                }`}
                              >
                                <span className="visually-hidden">
                                  Question {rowNum} choix {optId}
                                </span>
                                {isChecked ? '' : optId}
                              </label>
                            </div>
                          );
                        }
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleFlag(q.id)}
                      className={`jlpt-omr-row__flag ${
                        isFlagged ? 'jlpt-omr-row__flag--on' : ''
                      }`}
                      aria-label={`Marquer la question ${rowNum} pour relecture`}
                      aria-pressed={isFlagged}
                      title="Marquer pour relecture"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </fieldset>
                );
              })}
            </div>
          );
        })}
      </div>
    </aside>
  );
};

