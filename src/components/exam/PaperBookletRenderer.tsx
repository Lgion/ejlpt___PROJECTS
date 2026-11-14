'use client';

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flag,
  Highlighter,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import type {
  ExamSessionConfig,
  JLPTExam,
  JLPTPassageBlock,
  JLPTQuestion,
} from '@/types/jlpt';
import { RichJLPTText } from './RichJLPTText';

interface PaperBookletRendererProps {
  exam: JLPTExam;
  questions: JLPTQuestion[];
  currentIndex: number;
  answers: Record<string, string>;
  flaggedIds: Set<string>;
  config: ExamSessionConfig;
  onSelectAnswer: (questionId: string, optionId: string) => void;
  onJumpToQuestion: (index: number) => void;
  onToggleFlag: (questionId: string) => void;
  onRequestSubmitStage: () => void;
  stageSubmitLabel: string;
}

export const PaperBookletRenderer: React.FC<PaperBookletRendererProps> = ({
  exam,
  questions,
  currentIndex,
  answers,
  flaggedIds,
  config,
  onSelectAnswer,
  onJumpToQuestion,
  onToggleFlag,
  onRequestSubmitStage,
  stageSubmitLabel,
}) => {
  const currentQ = questions[currentIndex];
  const [highlighterEnabled, setHighlighterEnabled] = useState(false);
  const [highlightedParagraphs, setHighlightedParagraphs] = useState<Set<string>>(new Set());
  const [starPlacements, setStarPlacements] = useState<Record<string, (string | null)[]>>({});
  const [activeStarSlot, setActiveStarSlot] = useState<Record<string, number>>({});

  const passageMap = useMemo(() => {
    const map = new Map<string, JLPTPassageBlock>();
    for (const p of exam.passages ?? []) {
      map.set(p.id, p);
    }
    return map;
  }, [exam.passages]);

  const currentPassage = currentQ?.passageId ? passageMap.get(currentQ.passageId) : undefined;

  // Build filled cloze previews for 問題3 (`日本人の天気の話`)
  const filledClozeBlanks = useMemo(() => {
    if (!currentPassage || currentPassage.mondaiNumber !== 3) return undefined;
    const out: Record<number, { optionNumber: string; label: string }> = {};
    for (const q of questions) {
      if (q.passageId === currentPassage.id && q.questionNumber && answers[q.id]) {
        const chosenOpt = q.options.find((o) => o.id === answers[q.id]);
        if (chosenOpt) {
          out[q.questionNumber] = {
            optionNumber: chosenOpt.id,
            label: chosenOpt.label,
          };
        }
      }
    }
    return out;
  }, [answers, currentPassage, questions]);

  // Sibling questions tied to the same passage (for quick switching inside split view)
  const passageQuestionIndices = useMemo(() => {
    if (!currentPassage) return [];
    return questions
      .map((q, idx) => (q.passageId === currentPassage.id ? { q, idx } : null))
      .filter((x): x is { q: JLPTQuestion; idx: number } => x !== null);
  }, [currentPassage, questions]);

  // First appearance of a mondai header or page header
  const isFirstInMondai = useMemo(() => {
    if (!currentQ) return false;
    if (currentIndex === 0) return true;
    const prev = questions[currentIndex - 1];
    return prev.mondaiNumber !== currentQ.mondaiNumber || prev.scoringDomain !== currentQ.scoringDomain;
  }, [currentIndex, currentQ, questions]);

  const currentPlacements = useMemo(
    () => (currentQ ? starPlacements[currentQ.id] ?? [null, null, null, null] : [null, null, null, null]),
    [currentQ, starPlacements]
  );

  const starSlotValues = useMemo(() => {
    if (!currentQ || currentQ.archetype !== 'grammar_star') return undefined;
    const map: Record<number, { optionNumber: string; label: string }> = {};
    currentPlacements.forEach((optId, idx) => {
      if (optId) {
        const opt = currentQ.options.find((o) => o.id === optId);
        if (opt) map[idx] = { optionNumber: opt.id, label: opt.label };
      }
    });
    return map;
  }, [currentPlacements, currentQ]);

  // Unique Mondai jumps within the current paper
  const mondaiNav = useMemo(() => {
    const seen = new Map<string, { label: string; firstIndex: number; count: number; answered: number }>();
    questions.forEach((q, idx) => {
      const domainTag = q.scoringDomain ?? q.section;
      const key = `${domainTag}-m${q.mondaiNumber ?? 1}`;
      const existing = seen.get(key);
      const isAns = Boolean(answers[q.id]);
      if (!existing) {
        const prefix =
          q.scoringDomain === 'vocab'
            ? '語彙'
            : q.scoringDomain === 'grammar'
            ? '文法'
            : q.scoringDomain === 'reading'
            ? '読解'
            : '';
        seen.set(key, {
          label: `${prefix ? `${prefix} ` : ''}問題${q.mondaiNumber ?? 1}`,
          firstIndex: idx,
          count: 1,
          answered: isAns ? 1 : 0,
        });
      } else {
        existing.count += 1;
        if (isAns) existing.answered += 1;
      }
    });
    return Array.from(seen.entries());
  }, [answers, questions]);

  if (!currentQ) return null;

  const selectedOptId = answers[currentQ.id];
  const isFlagged = flaggedIds.has(currentQ.id);
  const showImmediateFeedback =
    config.correctionTiming === 'immediate_feedback' && Boolean(selectedOptId);

  const starSlotIdx =
    currentQ.promptTokens?.find((t) => t.text === '★')?.starSlotIndex ?? 2;
  const currentActiveSlot = activeStarSlot[currentQ.id] ?? 0;

  const handleToggleHighlightParagraph = (pid: string) => {
    if (!highlighterEnabled) return;
    setHighlightedParagraphs((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const handleStarChipClick = (optId: string) => {
    const qId = currentQ.id;
    const slots = [...(starPlacements[qId] ?? [null, null, null, null])];
    const existingIdx = slots.indexOf(optId);
    if (existingIdx !== -1) {
      slots[existingIdx] = null;
      setStarPlacements((prev) => ({ ...prev, [qId]: slots }));
      setActiveStarSlot((prev) => ({ ...prev, [qId]: existingIdx }));
      return;
    }

    let targetSlot = currentActiveSlot;
    if (slots[targetSlot] !== null) {
      const firstEmpty = slots.findIndex((s) => s === null);
      if (firstEmpty !== -1) targetSlot = firstEmpty;
    }
    slots[targetSlot] = optId;
    setStarPlacements((prev) => ({ ...prev, [qId]: slots }));

    const nextEmpty = slots.findIndex((s) => s === null);
    if (nextEmpty !== -1) {
      setActiveStarSlot((prev) => ({ ...prev, [qId]: nextEmpty }));
    }

    // Auto-select answer once all 4 fragments are placed into slots
    if (slots.every((s) => s !== null)) {
      const chosenForStar = slots[starSlotIdx];
      if (chosenForStar) {
        onSelectAnswer(qId, chosenForStar);
      }
    }
  };

  const handleStarSlotClick = (slotIdx: number) => {
    const qId = currentQ.id;
    const slots = [...(starPlacements[qId] ?? [null, null, null, null])];
    if (slots[slotIdx] !== null) {
      slots[slotIdx] = null;
      setStarPlacements((prev) => ({ ...prev, [qId]: slots }));
    }
    setActiveStarSlot((prev) => ({ ...prev, [qId]: slotIdx }));
  };

  const resetStarSlots = () => {
    setStarPlacements((prev) => ({ ...prev, [currentQ.id]: [null, null, null, null] }));
    setActiveStarSlot((prev) => ({ ...prev, [currentQ.id]: 0 }));
  };

  const renderPassagePane = (passage: JLPTPassageBlock) => (
    <article className="jlpt-passage-pane" aria-label={passage.title || 'Texte de lecture'}>
      <div className="jlpt-passage-pane__toolbar">
        <span className="jlpt-passage-pane__page-tag" lang="ja">
          {passage.pageRangeLabel || currentQ.bookletPageLabel}
        </span>

        {config.presetMode !== 'OFFICIAL_STRICT' && (
          <button
            type="button"
            onClick={() => setHighlighterEnabled((v) => !v)}
            className={`jlpt-passage-pane__hl-btn ${
              highlighterEnabled ? 'jlpt-passage-pane__hl-btn--active' : ''
            }`}
            aria-pressed={highlighterEnabled}
          >
            <Highlighter className="w-3.5 h-3.5" />
            {highlighterEnabled ? 'Marqueur actif' : 'Surligner un paragraphe'}
          </button>
        )}
      </div>

      {passage.leadInstruction && (
        <p className="jlpt-passage-pane__lead" lang="ja">
          <RichJLPTText
            tokens={[{ text: passage.leadInstruction }]}
            fallbackText={passage.leadInstruction}
            furiganaPolicy={config.furiganaPolicy}
          />
        </p>
      )}

      {/* Email format (問題4 (1)) */}
      {passage.layoutVariant === 'email' && passage.metadata && (
        <div className="jlpt-email-frame" lang="ja">
          <div className="jlpt-email-frame__meta">
            <div>
              <span>あて先：</span>
              <span className="font-mono">{passage.metadata.to}</span>
            </div>
            <div>
              <span>件　名：</span>
              <strong>{passage.metadata.subject}</strong>
            </div>
            <div>
              <span>送信日時：</span>
              <span>{passage.metadata.sentAt}</span>
            </div>
          </div>
          <div className="jlpt-email-frame__body">
            {passage.paragraphs.map((p) => (
              <p
                key={p.id}
                onClick={() => handleToggleHighlightParagraph(p.id)}
                className={`jlpt-passage-para ${p.indent ? 'jlpt-passage-para--indent' : ''} ${
                  highlightedParagraphs.has(p.id) ? 'jlpt-passage-para--highlighted' : ''
                } ${highlighterEnabled ? 'jlpt-passage-para--hl-hover' : ''}`}
              >
                <RichJLPTText tokens={p.tokens} furiganaPolicy={config.furiganaPolicy} />
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Paper memo format with folded bottom-right corner (問題4 (4)) */}
      {passage.layoutVariant === 'memo' && passage.metadata && (
        <div className="jlpt-memo-frame" lang="ja">
          <p className="jlpt-memo-frame__recipient">{passage.metadata.memoRecipient}</p>
          <div className="jlpt-memo-frame__body">
            {passage.paragraphs.map((p) => (
              <p
                key={p.id}
                onClick={() => handleToggleHighlightParagraph(p.id)}
                className={`jlpt-passage-para ${p.indent ? 'jlpt-passage-para--indent' : ''} ${
                  highlightedParagraphs.has(p.id) ? 'jlpt-passage-para--highlighted' : ''
                } ${highlighterEnabled ? 'jlpt-passage-para--hl-hover' : ''}`}
              >
                <RichJLPTText tokens={p.tokens} furiganaPolicy={config.furiganaPolicy} />
              </p>
            ))}
          </div>
          <div className="jlpt-memo-frame__signature">
            <span>{passage.metadata.memoDate}</span>
            <span>{passage.metadata.memoSender}</span>
          </div>
        </div>
      )}

      {/* Structured poster format (問題7 大原動物園) */}
      {passage.layoutVariant === 'poster_zoo' && passage.structuredPoster && (
        <div className="jlpt-poster-frame" lang="ja">
          <h3 className="jlpt-poster-frame__main-title">
            {passage.structuredPoster.mainTitle}
          </h3>
          <div className="jlpt-poster-frame__subbanner">
            {passage.structuredPoster.subTitle}
          </div>
          <p className="jlpt-poster-frame__intro">{passage.structuredPoster.intro}</p>

          <div className="jlpt-poster-frame__events-grid">
            {passage.structuredPoster.events.map((ev) => (
              <div key={ev.code} className="jlpt-poster-event">
                <div className="jlpt-poster-event__head">
                  <span className="jlpt-poster-event__code">{ev.code}</span>
                  <span>{ev.title}</span>
                </div>
                <p className="jlpt-poster-event__desc">{ev.description}</p>
                <div className="jlpt-poster-event__schedule">
                  {ev.schedule.map((line, idx) => (
                    <p key={idx}>{line}</p>
                  ))}
                  {ev.note && <p className="jlpt-poster-event__note">{ev.note}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="jlpt-poster-frame__footnotes">
            {passage.structuredPoster.footerNotes.map((fn, i) => (
              <p key={i}>{fn}</p>
            ))}
          </div>

          <div className="jlpt-poster-frame__night">
            <div className="jlpt-poster-frame__subbanner jlpt-poster-frame__subbanner--night">
              {passage.structuredPoster.nightEvent.title}
            </div>
            <p className="jlpt-poster-frame__night-tagline">
              {passage.structuredPoster.nightEvent.tagline}
            </p>
            <table className="jlpt-poster-table">
              <tbody>
                {passage.structuredPoster.nightEvent.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Standard prose & 問題3 Cloze */}
      {(!passage.layoutVariant || passage.layoutVariant === 'prose') && (
        <div className="jlpt-prose-frame" lang="ja">
          {passage.title && (
            <div className="jlpt-prose-frame__header">
              <h3 className="jlpt-prose-frame__title">{passage.title}</h3>
              {passage.author && <p className="jlpt-prose-frame__author">{passage.author}</p>}
            </div>
          )}
          <div className="jlpt-prose-frame__body">
            {passage.paragraphs.map((p) => (
              <p
                key={p.id}
                onClick={() => handleToggleHighlightParagraph(p.id)}
                className={`jlpt-passage-para ${p.indent ? 'jlpt-passage-para--indent' : ''} ${
                  highlightedParagraphs.has(p.id) ? 'jlpt-passage-para--highlighted' : ''
                } ${highlighterEnabled ? 'jlpt-passage-para--hl-hover' : ''}`}
              >
                <RichJLPTText
                  tokens={p.tokens}
                  furiganaPolicy={config.furiganaPolicy}
                  filledBlanks={filledClozeBlanks}
                />
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Quick switch among questions tied to this passage */}
      {passageQuestionIndices.length > 1 && (
        <div className="jlpt-passage-pane__linked-qs">
          <span>Questions liées à ce texte :</span>
          <div className="jlpt-passage-pane__linked-pills">
            {passageQuestionIndices.map(({ q, idx }) => (
              <button
                key={q.id}
                type="button"
                onClick={() => onJumpToQuestion(idx)}
                className={`jlpt-linked-pill ${
                  idx === currentIndex ? 'jlpt-linked-pill--active' : ''
                } ${answers[q.id] ? 'jlpt-linked-pill--done' : ''}`}
              >
                Q{q.questionNumber ?? idx + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );

  return (
    <div className="jlpt-booklet-page">
      {/* Mondai quick nav ribbon */}
      <nav className="jlpt-mondai-ribbon" aria-label="Navigation par 問題">
        {mondaiNav.map(([key, info]) => {
          const isCurrent =
            currentQ.scoringDomain
              ? `${currentQ.scoringDomain}-m${currentQ.mondaiNumber ?? 1}` === key
              : `${currentQ.section}-m${currentQ.mondaiNumber ?? 1}` === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onJumpToQuestion(info.firstIndex)}
              className={`jlpt-mondai-ribbon__tab ${
                isCurrent ? 'jlpt-mondai-ribbon__tab--active' : ''
              }`}
              lang="ja"
            >
              <span>{info.label}</span>
              <span className="jlpt-mondai-ribbon__count">
                {info.answered}/{info.count}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Authentic booklet running head + margin vertical tab */}
      <div className="jlpt-booklet-sheet">
        {currentQ.marginTab && (
          <div
            className={`jlpt-margin-tab ${
              currentQ.marginTab === '読解' ? 'jlpt-margin-tab--reading' : 'jlpt-margin-tab--grammar'
            }`}
            lang="ja"
            aria-hidden="true"
          >
            {currentQ.marginTab.split('').map((ch, idx) => (
              <span key={idx}>{ch}</span>
            ))}
          </div>
        )}

        <div className="jlpt-booklet-sheet__running-head">
          <span lang="ja">{currentQ.bookletPageLabel || currentQ.subCategory}</span>
          <span>
            Item {currentIndex + 1} / {questions.length}
          </span>
        </div>

        {/* Mondai Rubric */}
        <div
          className={`jlpt-mondai-rubric ${isFirstInMondai ? 'jlpt-mondai-rubric--lead' : ''}`}
          lang="ja"
        >
          <span className="jlpt-mondai-rubric__title">{currentQ.mondaiTitle || `問題`}</span>
          <span className="jlpt-mondai-rubric__instr">{currentQ.mondaiInstruction}</span>
        </div>

        {/* Authentic (問題例) illustration box when entering 問題2 ★ */}
        {currentQ.exampleSnippet && (
          <div className="jlpt-star-example-box" lang="ja">
            <p className="jlpt-star-example-box__title">{currentQ.exampleSnippet.title}</p>
            <div className="jlpt-star-example-box__sentence">
              <RichJLPTText
                tokens={currentQ.exampleSnippet.promptTokens}
                furiganaPolicy={config.furiganaPolicy}
              />
            </div>
            <div className="jlpt-star-example-box__choices">
              {currentQ.exampleSnippet.options.map((opt) => (
                <span key={opt.id}>
                  <strong>{opt.id}</strong> {opt.label}
                </span>
              ))}
            </div>
            <p className="jlpt-star-example-box__answer-hint">
              正しい並び順：3 上 ・ 2 に ・ <strong>★ 4 ペン</strong> ・ 1 が　→　解答用紙（例）① ② ③ <strong>●</strong>
            </p>
          </div>
        )}

        {/* Main Content: Split View when passage exists, single column otherwise */}
        <div
          className={`jlpt-booklet-body ${
            currentPassage ? 'jlpt-booklet-body--split' : 'jlpt-booklet-body--single'
          }`}
        >
          {currentPassage && renderPassagePane(currentPassage)}

          <div className="jlpt-question-pane">
            <div className="jlpt-question-pane__top">
              <div className="jlpt-question-pane__qrow" lang="ja">
                <span className="jlpt-qbox-num">
                  {currentQ.questionNumber ?? currentIndex + 1}
                </span>
                <div className="jlpt-qprompt">
                  {config.showStarOrderingHelper && currentQ.archetype === 'grammar_star' ? (
                    <RichJLPTText
                      tokens={currentQ.promptTokens}
                      fallbackText={currentQ.prompt}
                      furiganaPolicy={config.furiganaPolicy}
                      starSlotValues={starSlotValues}
                      onStarSlotClick={handleStarSlotClick}
                      activeStarSlot={currentActiveSlot}
                    />
                  ) : (
                    <RichJLPTText
                      tokens={currentQ.promptTokens}
                      fallbackText={currentQ.prompt}
                      furiganaPolicy={config.furiganaPolicy}
                    />
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onToggleFlag(currentQ.id)}
                className={`jlpt-flag-btn ${isFlagged ? 'jlpt-flag-btn--active' : ''}`}
                aria-pressed={isFlagged}
                title="Marquer cette question pour relecture"
              >
                <Flag className="w-3.5 h-3.5" />
                {isFlagged ? 'À revoir' : 'Marquer'}
              </button>
            </div>

            {/* Interactive ★ sentence builder aid (only when enabled) */}
            {config.showStarOrderingHelper && currentQ.archetype === 'grammar_star' && (
              <div className="jlpt-star-helper">
                <div className="jlpt-star-helper__head">
                  <span>
                    <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                    Atelier d’assemblage ★ (cliquez les 4 segments dans l’ordre)
                  </span>
                  <button
                    type="button"
                    onClick={resetStarSlots}
                    className="jlpt-star-helper__reset"
                  >
                    <RotateCcw className="w-3 h-3" /> Réinitialiser
                  </button>
                </div>
                <div className="jlpt-star-helper__chips" lang="ja">
                  {currentQ.options.map((opt) => {
                    const placedSlot = currentPlacements.indexOf(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleStarChipClick(opt.id)}
                        className={`jlpt-star-chip ${
                          placedSlot !== -1 ? 'jlpt-star-chip--used' : ''
                        }`}
                      >
                        <span className="jlpt-star-chip__id">{opt.id}</span>
                        <RichJLPTText
                          tokens={opt.tokens}
                          fallbackText={opt.label}
                          furiganaPolicy={config.furiganaPolicy}
                        />
                        {placedSlot !== -1 && (
                          <span className="jlpt-star-chip__badge">
                            {placedSlot === starSlotIdx ? '★' : `#${placedSlot + 1}`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Legacy readingPassage fallback when a N5/N4/N2/N1 mock exam has plain readingPassage */}
            {!currentPassage && currentQ.readingPassage && (
              <div className="jlpt-prose-frame mb-4" lang="ja">
                <p className="whitespace-pre-line">{currentQ.readingPassage}</p>
              </div>
            )}

            {/* Accessible Option Radio Group */}
            <fieldset className="jlpt-options-fieldset">
              <legend className="visually-hidden">
                Choix de réponse pour la question {currentQ.questionNumber ?? currentIndex + 1}
              </legend>
              <div
                className={`jlpt-options-grid ${
                  currentQ.archetype === 'vocab_usage' ||
                  currentQ.archetype === 'reading_short' ||
                  currentQ.archetype === 'reading_medium' ||
                  currentQ.archetype === 'reading_long' ||
                  currentQ.archetype === 'grammar_cloze'
                    ? 'jlpt-options-grid--vertical'
                    : 'jlpt-options-grid--two-col'
                }`}
              >
                {currentQ.options.map((opt) => {
                  const inputId = `q-opt-${currentQ.id}-${opt.id}`;
                  const isSelected = selectedOptId === opt.id;
                  const isCorrect = opt.id === currentQ.correctOptionId;

                  let stateClass = '';
                  if (showImmediateFeedback) {
                    if (isCorrect) stateClass = 'jlpt-option-card--correct';
                    else if (isSelected) stateClass = 'jlpt-option-card--wrong';
                  } else if (isSelected) {
                    stateClass = 'jlpt-option-card--selected';
                  }

                  return (
                    <div key={opt.id} className="jlpt-option-wrap">
                      <input
                        id={inputId}
                        type="radio"
                        name={`q-${currentQ.id}`}
                        value={opt.id}
                        checked={isSelected}
                        onChange={() => onSelectAnswer(currentQ.id, opt.id)}
                        className="visually-hidden jlpt-option-radio"
                      />
                      <label htmlFor={inputId} className={`jlpt-option-card ${stateClass}`} lang="ja">
                        <span className="jlpt-option-card__num">{opt.id}</span>
                        <span className="jlpt-option-card__text">
                          <RichJLPTText
                            tokens={opt.tokens}
                            fallbackText={opt.label}
                            furiganaPolicy={config.furiganaPolicy}
                          />
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </fieldset>

            {/* Immediate pedagogical feedback (Custom / Modular mode only) */}
            {showImmediateFeedback && (
              <div
                className={`jlpt-immediate-feedback ${
                  selectedOptId === currentQ.correctOptionId
                    ? 'jlpt-immediate-feedback--ok'
                    : 'jlpt-immediate-feedback--ko'
                }`}
                role="status"
              >
                <div className="jlpt-immediate-feedback__head">
                  {selectedOptId === currentQ.correctOptionId ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Bonne réponse ({currentQ.correctOptionId})</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>Réponse attendue : {currentQ.correctOptionId}</span>
                    </>
                  )}
                </div>
                <p className="jlpt-immediate-feedback__body">{currentQ.explanationFr}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Page Turn & Submit */}
        <div className="jlpt-booklet-footer">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => onJumpToQuestion(Math.max(0, currentIndex - 1))}
            className="jlpt-booklet-nav-btn"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>前へ · Précédent</span>
          </button>

          <span className="jlpt-booklet-folio" lang="ja">
            ― {currentIndex + 1} / {questions.length} ―
          </span>

          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => onJumpToQuestion(Math.min(questions.length - 1, currentIndex + 1))}
              className="jlpt-booklet-nav-btn jlpt-booklet-nav-btn--primary"
            >
              <span>次へ · Suivant</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onRequestSubmitStage}
              className="jlpt-booklet-nav-btn jlpt-booklet-nav-btn--submit"
            >
              {stageSubmitLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
