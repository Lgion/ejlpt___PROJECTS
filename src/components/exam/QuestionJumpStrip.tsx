'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Flag, LayoutGrid } from 'lucide-react';
import type { JLPTQuestion } from '@/types/jlpt';

interface QuestionJumpStripProps {
  questions: JLPTQuestion[];
  currentIndex: number;
  answers: Record<string, string>;
  flaggedIds: Set<string>;
  onJumpToQuestion: (index: number) => void;
  isListening?: boolean;
}

interface QuestionGroup {
  key: string;
  label: string;
  items: { q: JLPTQuestion; idx: number; displayNum: string }[];
}

export const QuestionJumpStrip: React.FC<QuestionJumpStripProps> = ({
  questions,
  currentIndex,
  answers,
  flaggedIds,
  onJumpToQuestion,
  isListening = false,
}) => {
  const [isGridOpen, setIsGridOpen] = useState(false);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);

  const groups = useMemo<QuestionGroup[]>(() => {
    const map = new Map<string, QuestionGroup>();
    questions.forEach((q, idx) => {
      const domainTag = q.scoringDomain ?? q.section;
      const mNum = q.mondaiNumber ?? 1;
      const key = `${domainTag}-m${mNum}`;
      const displayNum = isListening
        ? String(idx + 1)
        : String(q.questionNumber ?? idx + 1);

      let grp = map.get(key);
      if (!grp) {
        const prefix =
          q.scoringDomain === 'vocab'
            ? '語彙'
            : q.scoringDomain === 'grammar'
            ? '文法'
            : q.scoringDomain === 'reading'
            ? '読解'
            : isListening
            ? '聴解'
            : '';
        grp = {
          key,
          label: `${prefix ? `${prefix} ` : ''}問題${mNum}`,
          items: [],
        };
        map.set(key, grp);
      }
      grp.items.push({ q, idx, displayNum });
    });
    return Array.from(map.values());
  }, [questions, isListening]);

  // Keep the active question pill centered inside the horizontal strip without scrolling the viewport
  useEffect(() => {
    const strip = stripRef.current;
    const btn = activeBtnRef.current;
    if (!strip || !btn) return;
    const targetLeft = btn.offsetLeft - strip.clientWidth / 2 + btn.offsetWidth / 2;
    strip.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: 'smooth',
    });
  }, [currentIndex]);

  if (questions.length <= 1) return null;

  return (
    <div className="jlpt-q-jump" aria-label="Accès rapide par numéro de question">
      <div className="jlpt-q-jump__bar">
        <button
          type="button"
          onClick={() => setIsGridOpen((prev) => !prev)}
          className={`jlpt-q-jump__grid-btn ${isGridOpen ? 'is-open' : ''}`}
          aria-expanded={isGridOpen}
          aria-controls="jlpt-q-jump-drawer"
          title="Afficher ou masquer toutes les questions par 問題"
        >
          <LayoutGrid className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>
            {currentIndex + 1}/{questions.length}
          </span>
          {isGridOpen ? (
            <ChevronUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          )}
        </button>

        <div ref={stripRef} className="jlpt-q-jump__strip">
          {groups.map((grp, gIdx) => (
            <React.Fragment key={grp.key}>
              {gIdx > 0 && (
                <span className="jlpt-q-jump__sep" lang="ja" aria-hidden="true">
                  問{grp.items[0]?.q.mondaiNumber ?? 1}
                </span>
              )}
              {grp.items.map(({ q, idx, displayNum }) => {
                const isActive = idx === currentIndex;
                const isAnswered = Boolean(answers[q.id]);
                const isFlagged = flaggedIds.has(q.id);
                return (
                  <button
                    key={q.id}
                    ref={isActive ? activeBtnRef : undefined}
                    type="button"
                    onClick={() => {
                      onJumpToQuestion(idx);
                      setIsGridOpen(false);
                    }}
                    aria-current={isActive ? 'step' : undefined}
                    aria-label={`Question ${displayNum} (${grp.label})`}
                    className={`jlpt-q-jump__pill ${
                      isActive ? 'jlpt-q-jump__pill--active' : ''
                    } ${isAnswered ? 'jlpt-q-jump__pill--done' : ''} ${
                      isFlagged ? 'jlpt-q-jump__pill--flagged' : ''
                    }`}
                  >
                    <span>{displayNum}</span>
                    {isFlagged && (
                      <Flag className="w-2.5 h-2.5 jlpt-q-jump__flag-dot" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {isGridOpen && (
        <div id="jlpt-q-jump-drawer" className="jlpt-q-jump__drawer">
          {groups.map((grp) => (
            <div key={grp.key} className="jlpt-q-jump__group">
              <div className="jlpt-q-jump__group-title" lang="ja">
                {grp.label}
              </div>
              <div className="jlpt-q-jump__group-grid">
                {grp.items.map(({ q, idx, displayNum }) => {
                  const isActive = idx === currentIndex;
                  const isAnswered = Boolean(answers[q.id]);
                  const isFlagged = flaggedIds.has(q.id);
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        onJumpToQuestion(idx);
                        setIsGridOpen(false);
                      }}
                      aria-current={isActive ? 'step' : undefined}
                      className={`jlpt-q-jump__pill ${
                        isActive ? 'jlpt-q-jump__pill--active' : ''
                      } ${isAnswered ? 'jlpt-q-jump__pill--done' : ''} ${
                        isFlagged ? 'jlpt-q-jump__pill--flagged' : ''
                      }`}
                    >
                      <span>{displayNum}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
