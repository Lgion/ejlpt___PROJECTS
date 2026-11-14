'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Flag,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  XCircle,
} from 'lucide-react';
import type {
  ExamSessionConfig,
  JLPTAudioTrackMeta,
  JLPTQuestion,
} from '@/types/jlpt';
import { RichJLPTText } from './RichJLPTText';

interface ListeningExamStageProps {
  questions: JLPTQuestion[];
  audioTracks: JLPTAudioTrackMeta[];
  currentIndex: number;
  answers: Record<string, string>;
  flaggedIds: Set<string>;
  config: ExamSessionConfig;
  autoStartSignal: boolean;
  onSelectAnswer: (questionId: string, optionId: string) => void;
  onJumpToQuestion: (index: number) => void;
  onToggleFlag: (questionId: string) => void;
  onRequestSubmitStage: () => void;
  stageSubmitLabel: string;
}

interface StrictAudioStatus {
  phase: 'intro' | 'reading_pause' | 'example' | 'question' | 'answer_pause';
  mondaiNumber: number;
  label: string;
  itemNumber: number;
  questionId?: string;
  pauseRemaining?: number;
}

function computeStrictAudioStatus(
  isStrictStream: boolean,
  track: JLPTAudioTrackMeta | undefined,
  currentTimeSec: number,
  questions: JLPTQuestion[]
): StrictAudioStatus | null {
  if (!isStrictStream || !track) return null;
  const mNum = track.mondaiNumber;
  const exSeg = track.exampleAudio;

  if (exSeg && currentTimeSec < exSeg.startSec) {
    return { phase: 'intro', mondaiNumber: mNum, label: `問題 ${mNum} 説明`, itemNumber: 0 };
  }
  if (exSeg && currentTimeSec >= exSeg.startSec && currentTimeSec < exSeg.endSec) {
    const readStart = exSeg.readingPauseStartSec;
    const readEnd = exSeg.readingPauseEndSec;
    const inReadPause =
      readStart !== undefined &&
      readEnd !== undefined &&
      currentTimeSec >= readStart &&
      currentTimeSec < readEnd;
    return {
      phase: inReadPause ? 'reading_pause' : 'example',
      mondaiNumber: mNum,
      label: `例（れい）`,
      itemNumber: 0,
      pauseRemaining:
        inReadPause && readEnd !== undefined ? Math.ceil(readEnd - currentTimeSec) : 0,
    };
  }

  for (const q of questions) {
    const qSeg = q.audioSegment;
    if (!qSeg || qSeg.mondaiNumber !== mNum) continue;
    if (currentTimeSec >= qSeg.startSec && currentTimeSec < qSeg.endSec) {
      const readStart = qSeg.readingPauseStartSec;
      const readEnd = qSeg.readingPauseEndSec;
      const inReadPause =
        readStart !== undefined &&
        readEnd !== undefined &&
        currentTimeSec >= readStart &&
        currentTimeSec < readEnd;
      const inAnswerPause =
        qSeg.answerPauseStartSec !== undefined && currentTimeSec >= qSeg.answerPauseStartSec;
      return {
        phase: inReadPause ? 'reading_pause' : inAnswerPause ? 'answer_pause' : 'question',
        mondaiNumber: mNum,
        label: `${qSeg.itemNumber}番`,
        itemNumber: qSeg.itemNumber,
        questionId: q.id,
        pauseRemaining:
          inReadPause && readEnd !== undefined
            ? Math.ceil(readEnd - currentTimeSec)
            : inAnswerPause
            ? Math.ceil(qSeg.endSec - currentTimeSec)
            : 0,
      };
    }
  }

  return { phase: 'intro', mondaiNumber: mNum, label: `問題 ${mNum}`, itemNumber: 0 };
}

export const ListeningExamStage: React.FC<ListeningExamStageProps> = ({
  questions,
  audioTracks,
  currentIndex,
  answers,
  flaggedIds,
  config,
  autoStartSignal,
  onSelectAnswer,
  onJumpToQuestion,
  onToggleFlag,
  onRequestSubmitStage,
  stageSubmitLabel,
}) => {
  const isStrictStream = config.audioControlMode === 'strict_stream';
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const segmentEndRef = useRef<number | null>(null);

  const [trackIdx, setTrackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [streamFinished, setStreamFinished] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [needsManualPlay, setNeedsManualPlay] = useState(false);
  const [followAudio, setFollowAudio] = useState(true);
  const [memoNotes, setMemoNotes] = useState<Record<number, string>>({});
  const [revealedScripts, setRevealedScripts] = useState<Set<string>>(new Set());

  const currentQ = questions[currentIndex];
  const isFlagged = currentQ ? flaggedIds.has(currentQ.id) : false;
  const selectedOptId = currentQ ? answers[currentQ.id] : undefined;
  const showImmediateFeedback =
    config.correctionTiming === 'immediate_feedback' && Boolean(selectedOptId);

  const activeStrictTrack = audioTracks[trackIdx];
  const activeUrl = isStrictStream
    ? activeStrictTrack?.trackUrl ?? ''
    : currentQ?.audioSegment?.trackUrl ?? currentQ?.audioUrl ?? '';

  // Map (active track + currentTimeSec) to live item state in strict mode
  const strictAudioStatus = computeStrictAudioStatus(
    isStrictStream,
    activeStrictTrack,
    currentTimeSec,
    questions
  );

  // Synchronize displayed booklet question while strict stream plays
  useEffect(() => {
    if (!isStrictStream || !followAudio || !strictAudioStatus?.questionId) return;
    const matchIdx = questions.findIndex((q) => q.id === strictAudioStatus.questionId);
    if (matchIdx !== -1 && matchIdx !== currentIndex) {
      onJumpToQuestion(matchIdx);
    }
  }, [currentIndex, followAudio, isStrictStream, onJumpToQuestion, questions, strictAudioStatus]);

  // Auto-start continuous stream when user clicks "Open Booklet" on CoverGate
  useEffect(() => {
    if (!isStrictStream || !autoStartSignal || streamFinished) return;
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
    const playPromise = el.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        setNeedsManualPlay(true);
      });
    }
  }, [autoStartSignal, isStrictStream, streamFinished, trackIdx, volume]);

  const handleStrictStart = () => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
    el.play()
      .then(() => {
        setNeedsManualPlay(false);
        setIsPlaying(true);
      })
      .catch(() => setNeedsManualPlay(true));
  };

  const playSegment = useCallback(
    (startSec: number, endSec: number, url: string) => {
      const el = audioRef.current;
      if (!el) return;
      segmentEndRef.current = endSec;
      const sameSrc = el.getAttribute('src') === url;
      if (sameSrc && el.readyState >= 1) {
        el.currentTime = startSec;
        el.playbackRate = playbackRate;
        el.volume = volume;
        void el.play();
      } else {
        pendingSeekRef.current = startSec;
        el.src = url;
        el.load();
      }
    },
    [playbackRate, volume]
  );

  const handleTogglePlayPauseSegmented = () => {
    const el = audioRef.current;
    if (!el || !currentQ?.audioSegment) return;
    if (isPlaying) {
      el.pause();
    } else {
      const seg = currentQ.audioSegment;
      const cur = el.currentTime;
      const startAt = cur >= seg.startSec && cur < seg.endSec ? cur : seg.startSec;
      playSegment(startAt, seg.endSec, seg.trackUrl);
    }
  };

  // Stop active segment automatically when track switching in free mode
  useEffect(() => {
    if (isStrictStream) return;
    const el = audioRef.current;
    if (el && !el.paused) {
      el.pause();
    }
    segmentEndRef.current = currentQ?.audioSegment?.endSec ?? null;
    if (currentQ?.audioSegment) {
      const start = currentQ.audioSegment.startSec;
      queueMicrotask(() => setCurrentTimeSec(start));
    }
  }, [currentIndex, currentQ, isStrictStream]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = isStrictStream ? 1 : playbackRate;
  }, [isStrictStream, playbackRate]);

  if (!currentQ) return null;

  const activeMondaiNum = currentQ.mondaiNumber ?? 1;
  const activeTrackMeta = audioTracks.find((t) => t.mondaiNumber === activeMondaiNum);
  const seg = currentQ.audioSegment;
  const showQuestionExampleView =
    isStrictStream && strictAudioStatus?.phase === 'example' && Boolean(activeTrackMeta);

  const isBlankPrintMondai = activeMondaiNum === 3 || activeMondaiNum === 5;
  const isPromptHiddenInBooklet =
    config.presetMode === 'OFFICIAL_STRICT' || config.audioControlMode === 'strict_stream';

  const currentScriptRevealed =
    !isStrictStream && (revealedScripts.has(currentQ.id) || showImmediateFeedback);

  const toggleScriptReveal = () => {
    if (isStrictStream) return;
    setRevealedScripts((prev) => {
      const next = new Set(prev);
      if (next.has(currentQ.id)) next.delete(currentQ.id);
      else next.add(currentQ.id);
      return next;
    });
  };

  // Segment relative timestamps for free mode UI
  const segDuration = seg ? Math.max(1, seg.endSec - seg.startSec) : 1;
  const segElapsed = seg
    ? Math.max(0, Math.min(segDuration, currentTimeSec - seg.startSec))
    : 0;
  const segProgressPct = Math.round((segElapsed / segDuration) * 100);

  return (
    <div className="jlpt-booklet-page">
      {/* Hidden/controlled audio element — NEVER set loading="lazy" on active audio */}
      <audio
        ref={audioRef}
        src={activeUrl || undefined}
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={() => {
          const el = audioRef.current;
          if (!el) return;
          if (pendingSeekRef.current !== null) {
            el.currentTime = pendingSeekRef.current;
            pendingSeekRef.current = null;
            el.playbackRate = isStrictStream ? 1 : playbackRate;
            el.volume = volume;
            void el.play();
          }
        }}
        onTimeUpdate={() => {
          const el = audioRef.current;
          if (!el) return;
          setCurrentTimeSec(el.currentTime);
          if (!isStrictStream && segmentEndRef.current !== null && el.currentTime >= segmentEndRef.current) {
            el.pause();
            el.currentTime = segmentEndRef.current;
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          if (isStrictStream) {
            if (trackIdx < audioTracks.length - 1) {
              const nextTrackIdx = trackIdx + 1;
              setTrackIdx(nextTrackIdx);
              setCurrentTimeSec(0);
              const nextMondai = audioTracks[nextTrackIdx].mondaiNumber;
              const qIdx = questions.findIndex((q) => q.mondaiNumber === nextMondai);
              if (qIdx !== -1) onJumpToQuestion(qIdx);
            } else {
              setStreamFinished(true);
            }
          }
        }}
      />

      {/* Audio Deck Banner */}
      <div className={`jlpt-audio-deck ${isStrictStream ? 'jlpt-audio-deck--strict' : ''}`}>
        {isStrictStream ? (
          <div className="jlpt-audio-deck__strict-row">
            <div className="jlpt-audio-deck__badge-group">
              <span className="jlpt-audio-deck__lock-pill">
                <Lock className="w-3.5 h-3.5" /> Flux Audio Officiel Verrouillé
              </span>
              <span className="jlpt-audio-deck__track-name" lang="ja">
                {streamFinished
                  ? '全音声終了（聴解完了）'
                  : `Piste ${trackIdx + 1}/5 · ${activeStrictTrack?.titleJp ?? ''} ${
                      strictAudioStatus?.label ? `· ${strictAudioStatus.label}` : ''
                    }`}
              </span>
            </div>

            {strictAudioStatus?.phase === 'reading_pause' && (
              <div className="jlpt-audio-deck__phase-alert" role="status">
                Temps de lecture des choix : ~{strictAudioStatus.pauseRemaining}s
              </div>
            )}
            {strictAudioStatus?.phase === 'answer_pause' && (
              <div className="jlpt-audio-deck__phase-alert jlpt-audio-deck__phase-alert--mark" role="status">
                Marquez votre réponse OMR (~{strictAudioStatus.pauseRemaining}s)
              </div>
            )}

            <div className="jlpt-audio-deck__controls-right">
              {(!isPlaying && !streamFinished) || needsManualPlay ? (
                <button
                  type="button"
                  onClick={handleStrictStart}
                  className="jlpt-audio-deck__play-btn"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Lancer l’audio (N3Q{trackIdx + 1})</span>
                </button>
              ) : (
                <span className="jlpt-audio-deck__live-dot">
                  {streamFinished ? 'Pistes terminées' : '● Lecture continue'}
                </span>
              )}

              <label className="jlpt-audio-deck__follow">
                <input
                  type="checkbox"
                  checked={followAudio}
                  onChange={(e) => setFollowAudio(e.target.checked)}
                />
                <span>Synchro page auto</span>
              </label>

              <div className="jlpt-audio-deck__vol">
                <Volume2 className="w-4 h-4" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  aria-label="Volume audio"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="jlpt-audio-deck__free-row">
            <div className="jlpt-audio-deck__free-left">
              <button
                type="button"
                onClick={handleTogglePlayPauseSegmented}
                disabled={!seg}
                className="jlpt-audio-deck__play-btn"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Écouter 問題{activeMondaiNum} · {seg?.itemNumber}番</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={!seg}
                onClick={() => seg && playSegment(seg.startSec, seg.endSec, seg.trackUrl)}
                className="jlpt-audio-deck__sec-btn"
                title="Rejouer la question depuis le début"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Rejouer
              </button>

              {activeTrackMeta?.exampleAudio && (
                <button
                  type="button"
                  onClick={() => {
                    const ex = activeTrackMeta.exampleAudio!;
                    playSegment(ex.startSec, ex.endSec, ex.trackUrl);
                  }}
                  className="jlpt-audio-deck__sec-btn"
                >
                  Écouter 例 (Exemple)
                </button>
              )}
            </div>

            <div className="jlpt-audio-deck__free-progress">
              <div className="jlpt-audio-deck__bar">
                <div
                  className="jlpt-audio-deck__bar-fill"
                  style={{ width: `${segProgressPct}%` }}
                />
              </div>
              <span className="jlpt-audio-deck__time">
                {Math.floor(segElapsed)}s / {Math.round(segDuration)}s
              </span>
            </div>

            <div className="jlpt-audio-deck__free-right">
              <div className="jlpt-audio-deck__speed" role="group" aria-label="Vitesse audio">
                {[0.85, 1, 1.15].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setPlaybackRate(rate)}
                    className={playbackRate === rate ? 'is-active' : ''}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={toggleScriptReveal}
                className="jlpt-audio-deck__sec-btn"
              >
                {currentScriptRevealed ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" /> Masquer script
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" /> Script
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Listening Mondai Quick Switch Tabs (Hidden switch lock warning in strict mode only prevents moving past current stream if desired; actually paper booklet is open once listening starts so flipping listening pages is allowed just like on paper!) */}
      <nav className="jlpt-mondai-ribbon" aria-label="Parties de compréhension orale">
        {Array.from(new Set(questions.map((q) => q.mondaiNumber ?? 1))).map((mNum) => {
          const firstIdx = questions.findIndex((q) => (q.mondaiNumber ?? 1) === mNum);
          const count = questions.filter((q) => (q.mondaiNumber ?? 1) === mNum).length;
          const ansCount = questions.filter(
            (q) => (q.mondaiNumber ?? 1) === mNum && Boolean(answers[q.id])
          ).length;
          return (
            <button
              key={mNum}
              type="button"
              onClick={() => onJumpToQuestion(firstIdx)}
              className={`jlpt-mondai-ribbon__tab ${
                activeMondaiNum === mNum ? 'jlpt-mondai-ribbon__tab--active' : ''
              }`}
              lang="ja"
            >
              <span>問題 {mNum}</span>
              <span className="jlpt-mondai-ribbon__count">
                {ansCount}/{count}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="jlpt-booklet-sheet">
        <div className="jlpt-booklet-sheet__running-head">
          <span lang="ja">{currentQ.bookletPageLabel || '聴解'}</span>
          <span>
            {currentQ.subCategory} · Item {currentIndex + 1}/{questions.length}
          </span>
        </div>

        {/* Mondai Header */}
        <div className="jlpt-mondai-rubric jlpt-mondai-rubric--lead" lang="ja">
          <span className="jlpt-mondai-rubric__title">問題 {activeMondaiNum}</span>
          <span className="jlpt-mondai-rubric__instr">
            {activeTrackMeta?.instructionTokens ? (
              <RichJLPTText
                tokens={activeTrackMeta.instructionTokens}
                furiganaPolicy={config.furiganaPolicy}
              />
            ) : (
              currentQ.mondaiInstruction
            )}
          </span>
        </div>

        {/* Example banner while 例 is playing in strict stream */}
        {showQuestionExampleView && activeTrackMeta && (
          <div className="jlpt-listening-example-card" lang="ja">
            <div className="jlpt-listening-example-card__head">
              <strong>れい（Exemple officiel — en cours d’écoute）</strong>
              <span>Ne rien cocher pour れい (pré-rempli sur OMR)</span>
            </div>
            {activeTrackMeta.exampleImageUrl && (
              <div className="jlpt-listening-img-frame">
                <Image
                  src={activeTrackMeta.exampleImageUrl}
                  alt="Illustration exemple 問題4"
                  width={1136}
                  height={884}
                  className="jlpt-listening-illustration"
                />
              </div>
            )}
            {activeTrackMeta.exampleOptions && (
              <div className="jlpt-listening-ex-options">
                {activeTrackMeta.exampleOptions.map((o) => (
                  <div key={o.id} className="jlpt-listening-ex-opt">
                    <span>{o.id}</span>
                    <RichJLPTText
                      tokens={o.tokens}
                      fallbackText={o.label}
                      furiganaPolicy={config.furiganaPolicy}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active Question Block */}
        <div className="jlpt-listening-qcard">
          <div className="jlpt-question-pane__top">
            <div className="jlpt-listening-qtitle" lang="ja">
              <span className="jlpt-qbox-num">
                {seg?.itemNumber ?? currentQ.questionNumber ?? currentIndex + 1}番
              </span>
              {!isPromptHiddenInBooklet && (
                <p className="jlpt-listening-spoken-hint">{currentQ.prompt}</p>
              )}
              {isPromptHiddenInBooklet && (
                <p className="jlpt-listening-strict-note">
                  {activeMondaiNum === 3 || activeMondaiNum === 5
                    ? 'このページには問題文・選択肢は印刷されていません（音声を聞いて解答してください）。'
                    : activeMondaiNum === 4
                    ? '絵を見ながら質問と選択肢（１〜３）を聞いてください。'
                    : '音声を聞いて、下の１〜４から最もよいものを一つえらんでください。'}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onToggleFlag(currentQ.id)}
              className={`jlpt-flag-btn ${isFlagged ? 'jlpt-flag-btn--active' : ''}`}
              aria-pressed={isFlagged}
            >
              <Flag className="w-3.5 h-3.5" />
              {isFlagged ? 'À revoir' : 'Marquer'}
            </button>
          </div>

          {/* Printed Illustration (問題1 1番 / 問題4 1-4番) */}
          {currentQ.imageUrl && (
            <div className="jlpt-listening-img-frame">
              <Image
                src={currentQ.imageUrl}
                alt={currentQ.imageAlt || `Illustration ${currentQ.subCategory}`}
                width={activeMondaiNum === 1 ? 1137 : 1136}
                height={activeMondaiNum === 1 ? 1437 : 884}
                className={`jlpt-listening-illustration ${
                  activeMondaiNum === 1 ? 'jlpt-listening-illustration--tall' : ''
                }`}
              />
            </div>
          )}

          {/* Printed − メモ − area on 問題3 & 問題5 */}
          {isBlankPrintMondai && (
            <div className="jlpt-memo-pad" lang="ja">
              <label htmlFor={`memo-mondai-${activeMondaiNum}`} className="jlpt-memo-pad__label">
                − メモ −（Notes libres pendant l’écoute — 問題{activeMondaiNum}）
              </label>
              <textarea
                id={`memo-mondai-${activeMondaiNum}`}
                value={memoNotes[activeMondaiNum] ?? ''}
                onChange={(e) =>
                  setMemoNotes((prev) => ({ ...prev, [activeMondaiNum]: e.target.value }))
                }
                placeholder="Prenez vos notes ici librement..."
                rows={4}
                className="jlpt-memo-pad__textarea"
              />
            </div>
          )}

          {/* Choices */}
          <fieldset className="jlpt-options-fieldset">
            <legend className="visually-hidden">
              Choix pour 問題 {activeMondaiNum} question {seg?.itemNumber ?? currentIndex + 1}
            </legend>
            <div
              className={`jlpt-options-grid ${
                activeMondaiNum === 3 || activeMondaiNum === 4 || activeMondaiNum === 5
                  ? 'jlpt-options-grid--three-numerals'
                  : 'jlpt-options-grid--vertical'
              }`}
            >
              {currentQ.options.map((opt) => {
                const inputId = `l-opt-${currentQ.id}-${opt.id}`;
                const isSelected = selectedOptId === opt.id;
                const isCorrect = opt.id === currentQ.correctOptionId;

                // In strict booklet or hidden-text blank 問題3/問題5, show ONLY the spoken numbers unless revealed in free mode!
                const hideChoiceText =
                  activeMondaiNum === 4 || (isBlankPrintMondai && !currentScriptRevealed);

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
                      name={`lq-${currentQ.id}`}
                      value={opt.id}
                      checked={isSelected}
                      onChange={() => onSelectAnswer(currentQ.id, opt.id)}
                      className="visually-hidden jlpt-option-radio"
                    />
                    <label htmlFor={inputId} className={`jlpt-option-card ${stateClass}`} lang="ja">
                      <span className="jlpt-option-card__num">{opt.id}</span>
                      <span className="jlpt-option-card__text">
                        {hideChoiceText ? (
                          <span className="jlpt-option-card__audio-only">
                            選択肢 {opt.id}（音声のみ）
                          </span>
                        ) : (
                          <RichJLPTText
                            tokens={opt.tokens}
                            fallbackText={opt.label}
                            furiganaPolicy={config.furiganaPolicy}
                          />
                        )}
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
          </fieldset>

          {/* Optional revealed script & explanation in configurable/modular mode */}
          {currentScriptRevealed && currentQ.audioScript && (
            <div className="jlpt-script-box" lang="ja">
              <p className="jlpt-script-box__title">聴解スクリプト（Transcription）</p>
              <p className="jlpt-script-box__body">{currentQ.audioScript}</p>
            </div>
          )}

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

        {/* Footer nav */}
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
            ― 聴解 {currentIndex + 1} / {questions.length} ―
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
