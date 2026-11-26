'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toHiragana } from 'wanakana';
import {
  Mic,
  MicOff,
  Keyboard,
  ListChecks,
  Volume2,
  ArrowRight,
  RotateCcw,
  Share2,
} from 'lucide-react';
import { localDb } from '@/lib/db';
import { computeMasteryTier, MASTERY_META } from '@/lib/mastery';
import { gradeSRSCard, recordErrorToSRS } from '@/lib/srs';
import type { AiAttemptEvent } from '@/lib/ai/geminiClient';
import { AiStatusBanner, type AiBannerStatus } from '@/components/ai/AiStatusBanner';
import { AnnotatedJapaneseToken } from '@/components/visual/AnnotatedJapaneseToken';
import { VisualLegendBar } from '@/components/visual/VisualLegendBar';
import { CollectionSourceSelector } from '@/components/practice/drills/CollectionSourceSelector';
import { MultimediaFeedbackCard } from '@/components/practice/MultimediaFeedbackCard';
import type { CollectionExerciseItem, ExerciseCollectionSource } from '@/lib/exerciseCollections';
import {
  createJapaneseVoiceSession,
  isBrowserSpeechRecognitionSupported,
  type VoiceSessionController,
} from '@/lib/speechRecognition';
import {
  checkYomikataAnswer,
  parseCollectionItemToYomikataZ,
  YOMIKATA_Z_OFFICIAL_SEED,
  type YomikataZAnswerMode,
  type YomikataZItem,
} from '@/data/yomikataZSeed';

const LEVELS = ['ALL', 'N5', 'N4', 'N3', 'N2', 'N1'] as const;

export function YomikataZPlayer() {
  const [level, setLevel] = useState<string>('ALL');
  const [answerMode, setAnswerMode] = useState<YomikataZAnswerMode>('qcm');
  const [enabledSources, setEnabledSources] = useState<ExerciseCollectionSource[]>([
    'official',
    'ai_generated',
    'community',
  ]);
  const [remoteItems, setRemoteItems] = useState<YomikataZItem[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const [aiStatus, setAiStatus] = useState<AiBannerStatus>('idle');
  const [aiEvents, setAiEvents] = useState<AiAttemptEvent[]>([]);
  const [aiUsedFallback, setAiUsedFallback] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [submittedValue, setSubmittedValue] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [keyboardInput, setKeyboardInput] = useState('');
  const [autoHiragana, setAutoHiragana] = useState(true);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'transcribing'>('idle');
  const [voiceEngineLabel, setVoiceEngineLabel] = useState<'browser' | 'gemini_audio'>('browser');
  const [sessionScore, setSessionScore] = useState(0);
  const [answeredTotal, setAnsweredTotal] = useState(0);

  const [showShareForm, setShowShareForm] = useState(false);
  const [shareSentence, setShareSentence] = useState('');
  const [shareTargetWord, setShareTargetWord] = useState('');
  const [shareReading, setShareReading] = useState('');
  const [shareExplanation, setShareExplanation] = useState('');
  const [shareConsent, setShareConsent] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const voiceSessionRef = useRef<VoiceSessionController | null>(null);

  const srsCards = useLiveQuery(() => localDb.srsCards.toArray(), []);
  const srsMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof srsCards>[number]>();
    for (const card of srsCards || []) {
      map.set(card.cardId, card);
    }
    return map;
  }, [srsCards]);

  useEffect(() => {
    let active = true;
    const loadCollections = async () => {
      try {
        const res = await fetch('/api/collections?mode=yomikata_z&sources=ai_generated,community');
        if (!res.ok) return;
        const data = (await res.json()) as { ok?: boolean; items?: CollectionExerciseItem[] };
        if (active && data.ok && Array.isArray(data.items)) {
          const parsed = data.items
            .map(parseCollectionItemToYomikataZ)
            .filter((x): x is YomikataZItem => Boolean(x));
          setRemoteItems(parsed);
        }
      } catch {
        // keep offline seed smoothly
      }
    };
    void loadCollections();
    return () => {
      active = false;
      voiceSessionRef.current?.stop();
    };
  }, []);

  const allMergedPool = useMemo(() => {
    return [...YOMIKATA_Z_OFFICIAL_SEED, ...remoteItems];
  }, [remoteItems]);

  const sourceCounts = useMemo<Record<ExerciseCollectionSource, number>>(() => {
    const counts: Record<ExerciseCollectionSource, number> = {
      official: 0,
      ai_generated: 0,
      community: 0,
    };
    for (const item of allMergedPool) {
      if (level !== 'ALL' && item.level !== level) continue;
      counts[item.source] += 1;
    }
    return counts;
  }, [allMergedPool, level]);

  const activeItems = useMemo(() => {
    const filtered = allMergedPool.filter(
      (item) => enabledSources.includes(item.source) && (level === 'ALL' || item.level === level)
    );
    return filtered.length > 0 ? filtered : YOMIKATA_Z_OFFICIAL_SEED;
  }, [allMergedPool, enabledSources, level]);

  const currentItem = activeItems[currentIndex % activeItems.length] || activeItems[0];

  const currentMasteryTier = useMemo(() => {
    if (!currentItem) return 'unseen';
    const card =
      srsMap.get(`yomikata:${currentItem.targetWord}`) ||
      srsMap.get(`jukugo:${currentItem.targetWord}`) ||
      srsMap.get(`kanji:${currentItem.targetWord}`);
    return computeMasteryTier(card);
  }, [currentItem, srsMap]);

  const handleToggleSource = (src: ExerciseCollectionSource) => {
    setEnabledSources((prev) => {
      if (prev.includes(src)) {
        if (prev.length === 1) return prev;
        return prev.filter((s) => s !== src);
      }
      return [...prev, src];
    });
    setCurrentIndex(0);
    setSubmittedValue(null);
    setIsCorrect(null);
  };

  const handleGenerateAiBatch = async () => {
    setIsGeneratingAi(true);
    setAiStatus('loading');
    setAiError(null);
    try {
      const targetLevel = level === 'ALL' ? 'N4' : level;
      const res = await fetch('/api/drills/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          mode: 'yomikata_z',
          level: targetLevel,
          count: 3,
        }),
      });
      const payload = (await res.json()) as {
        ok?: boolean;
        items?: CollectionExerciseItem[];
        usedFallback?: boolean;
        events?: AiAttemptEvent[];
        error?: string;
      };
      setAiEvents(payload.events || []);
      setAiUsedFallback(Boolean(payload.usedFallback));
      if (!res.ok || !payload.ok) {
        setAiStatus('error');
        setAiError(payload.error || 'Génération IA momentanément indisponible.');
        return;
      }
      setAiStatus('success');
      if (Array.isArray(payload.items)) {
        const converted = payload.items
          .map(parseCollectionItemToYomikataZ)
          .filter((x): x is YomikataZItem => Boolean(x));
        if (converted.length > 0) {
          setRemoteItems((prev) => [...converted, ...prev]);
          setEnabledSources((prev) =>
            prev.includes('ai_generated') ? prev : [...prev, 'ai_generated']
          );
        }
      }
    } catch {
      setAiStatus('error');
      setAiError('Impossible de joindre le générateur IA.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const evaluateAndRecordAnswer = async (value: string, modeUsed: YomikataZAnswerMode) => {
    if (!currentItem || submittedValue !== null) return;
    const rawVal = value.trim();
    if (!rawVal) return;

    const ok = checkYomikataAnswer(currentItem, modeUsed, rawVal);
    setSubmittedValue(rawVal);
    setIsCorrect(ok);
    setAnsweredTotal((t) => t + 1);

    const cardId = `yomikata:${currentItem.targetWord}`;
    if (ok) {
      setSessionScore((s) => s + 1);
      const existing = await localDb.srsCards.get(cardId);
      if (!existing) {
        await localDb.srsCards.put({
          cardId,
          itemType: 'JUKUGO',
          itemKey: currentItem.targetWord,
          level: currentItem.level,
          prompt: `${currentItem.sentenceBefore}${currentItem.targetWord}${currentItem.sentenceAfter}`,
          reading: currentItem.reading,
          answer: currentItem.meaningFr,
          easeFactor: 2.5,
          intervalDays: 0,
          repetitions: 0,
          lapses: 0,
          errorCount: 0,
          dueAt: new Date().toISOString(),
        });
      }
      await gradeSRSCard(cardId, 3);
    } else {
      await recordErrorToSRS({
        cardId,
        itemType: 'JUKUGO',
        itemKey: currentItem.targetWord,
        level: currentItem.level,
        prompt: `${currentItem.sentenceBefore}${currentItem.targetWord}${currentItem.sentenceAfter}`,
        reading: currentItem.reading,
        answer: `${currentItem.reading} — ${currentItem.meaningFr}`,
      });
    }
  };

  const handleToggleVoice = () => {
    if (voiceState !== 'idle') {
      voiceSessionRef.current?.stop();
      setVoiceState('idle');
      return;
    }
    if (!currentItem || submittedValue !== null) return;

    setAiError(null);
    setAiStatus('idle');
    const session = createJapaneseVoiceSession({
      expectedHint: `${currentItem.targetWord} (${currentItem.reading})`,
      onStatusChange: (status) => {
        setVoiceState(status);
        if (status === 'transcribing') {
          setAiStatus('loading');
        }
      },
      onResult: (result) => {
        setVoiceEngineLabel(result.engine);
        if (result.events) setAiEvents(result.events);
        if (result.usedFallback) setAiUsedFallback(true);

        if (!result.ok || !result.transcript) {
          setAiStatus('error');
          setAiError(result.errorFr || 'Transcription vocale non reconnue.');
          return;
        }

        setAiStatus(result.usedFallback ? 'success' : 'idle');
        setVoiceTranscript(result.transcript);
        void evaluateAndRecordAnswer(result.transcript, 'voice');
      },
    });
    voiceSessionRef.current = session;
    setVoiceEngineLabel(session.engine);
    void session.start();
  };

  const handleNext = () => {
    voiceSessionRef.current?.stop();
    setVoiceState('idle');
    setSubmittedValue(null);
    setIsCorrect(null);
    setKeyboardInput('');
    setVoiceTranscript('');
    setCurrentIndex((i) => i + 1);
  };

  const handlePlaySentenceTts = () => {
    if (!currentItem || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `${currentItem.sentenceBefore}${currentItem.targetWord}${currentItem.sentenceAfter}`
    );
    utterance.lang = 'ja-JP';
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
  };

  const handleSubmitCommunityPhrase = async (e: React.FormEvent) => {
    e.preventDefault();
    setShareNotice(null);
    if (!shareConsent) {
      setShareNotice('Cochez la case de consentement public avant de publier.');
      return;
    }
    try {
      const targetLevel = level === 'ALL' ? 'N4' : level;
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'yomikata_z',
          level: targetLevel,
          prompt: shareSentence,
          targetWord: shareTargetWord,
          reading: shareReading,
          expectedAnswers: [shareReading],
          explanation: shareExplanation || `Lecture de ${shareTargetWord} : ${shareReading}`,
          consentPublic: true,
        }),
      });
      const payload = (await res.json()) as {
        ok?: boolean;
        item?: CollectionExerciseItem;
        error?: string;
      };
      if (!res.ok || !payload.ok || !payload.item) {
        setShareNotice(payload.error || 'Publication refusée.');
        return;
      }
      const parsed = parseCollectionItemToYomikataZ(payload.item);
      if (parsed) {
        setRemoteItems((prev) => [parsed, ...prev]);
        setEnabledSources((prev) => (prev.includes('community') ? prev : [...prev, 'community']));
      }
      setShareSentence('');
      setShareTargetWord('');
      setShareReading('');
      setShareExplanation('');
      setShareConsent(false);
      setShowShareForm(false);
      setShareNotice('Phrase ajoutée au pool communautaire Yomikata Z.');
    } catch {
      setShareNotice('Erreur réseau lors de la publication.');
    }
  };

  return (
    <section className="yomikata">
      <div className="yomikata__topbar">
        <div>
          <h2 className="yomikata__title">Yomikata Z — Lecture contextuelle &amp; Maîtrise SRS</h2>
          <p className="yomikata__subtitle">
            Le mot cible change automatiquement de couleur selon vos 4 paliers SM-2 (Nouveau →
            Apprentissage → Consolidé → Maîtrisé).
          </p>
        </div>

        <div className="yomikata__score-pill">
          Score session : <strong>{sessionScore}</strong> / {answeredTotal}
        </div>
      </div>

      <CollectionSourceSelector
        enabledSources={enabledSources}
        counts={sourceCounts}
        isGeneratingAi={isGeneratingAi}
        onToggleSource={handleToggleSource}
        onGenerateAiBatch={() => void handleGenerateAiBatch()}
      />

      <AiStatusBanner
        status={aiStatus}
        events={aiEvents}
        usedFallback={aiUsedFallback}
        errorMessage={aiError}
        onRetry={() => void handleGenerateAiBatch()}
        compact
      />

      <div className="yomikata__controls">
        <div className="yomikata__control-group">
          <label htmlFor="yomikata-level" className="yomikata__label">
            Niveau JLPT
          </label>
          <select
            id="yomikata-level"
            value={level}
            onChange={(e) => {
              setLevel(e.target.value);
              setCurrentIndex(0);
              setSubmittedValue(null);
              setIsCorrect(null);
            }}
            className="yomikata__select"
          >
            {LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl === 'ALL' ? 'Tous niveaux (N5 → N1)' : lvl}
              </option>
            ))}
          </select>
        </div>

        <div className="yomikata__control-group">
          <span className="yomikata__label">Mode de réponse</span>
          <div className="yomikata__mode-tabs" role="group" aria-label="Mode de réponse Yomikata Z">
            <button
              type="button"
              onClick={() => setAnswerMode('qcm')}
              className={`yomikata__mode-tab ${
                answerMode === 'qcm' ? 'yomikata__mode-tab--active' : ''
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>QCM</span>
            </button>
            <button
              type="button"
              onClick={() => setAnswerMode('keyboard')}
              className={`yomikata__mode-tab ${
                answerMode === 'keyboard' ? 'yomikata__mode-tab--active' : ''
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Clavier</span>
            </button>
            <button
              type="button"
              onClick={() => setAnswerMode('voice')}
              className={`yomikata__mode-tab ${
                answerMode === 'voice' ? 'yomikata__mode-tab--active' : ''
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Oral</span>
            </button>
          </div>
        </div>
      </div>

      <VisualLegendBar compact />

      {currentItem && (
        <div className="yomikata__stage">
          <div className="yomikata__stage-meta">
            <span className="yomikata__pill">
              {currentItem.level} • {currentItem.source === 'official' ? 'Officiel' : currentItem.source}
            </span>
            <span className={`yomikata__mastery yomikata__mastery--${currentMasteryTier}`}>
              Palier SRS : {MASTERY_META[currentMasteryTier].labelFr}
            </span>
            <button
              type="button"
              onClick={handlePlaySentenceTts}
              className="yomikata__tts-btn"
              title="Écouter la phrase complète"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Écouter la phrase</span>
            </button>
          </div>

          <p className="yomikata__instruction">
            Donnez la lecture (en hiragana) du mot mis en évidence :
          </p>

          <div className="yomikata__sentence" lang="ja">
            <span>{currentItem.sentenceBefore}</span>
            <AnnotatedJapaneseToken
              text={currentItem.targetWord}
              reading={currentItem.reading}
              showFurigana={submittedValue !== null}
              jlpt={currentItem.level}
              masteryTier={currentMasteryTier}
              frequencyScore10={currentItem.frequencyScore10}
              grammaticalTag={currentItem.grammaticalTag}
              className="yomikata__target-token"
            />
            <span>{currentItem.sentenceAfter}</span>
          </div>

          {answerMode === 'qcm' && (
            <div className="yomikata__options-grid">
              {currentItem.options.map((opt, idx) => {
                const answered = submittedValue !== null;
                const isRightOpt = opt.id === currentItem.correctOptionId;
                const isSelected = submittedValue === opt.id;
                let mod = '';
                if (answered) {
                  if (isRightOpt) mod = 'yomikata__option--correct';
                  else if (isSelected) mod = 'yomikata__option--wrong';
                }
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={answered}
                    onClick={() => void evaluateAndRecordAnswer(opt.id, 'qcm')}
                    className={`yomikata__option ${mod}`}
                    lang="ja"
                  >
                    <span className="yomikata__option-num">{idx + 1}</span>
                    <span>{opt.text}</span>
                  </button>
                );
              })}
            </div>
          )}

          {answerMode === 'keyboard' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const val = autoHiragana ? toHiragana(keyboardInput) : keyboardInput;
                void evaluateAndRecordAnswer(val, 'keyboard');
              }}
              className="yomikata__keyboard-form"
            >
              <input
                type="text"
                value={keyboardInput}
                disabled={submittedValue !== null}
                onChange={(e) =>
                  setKeyboardInput(autoHiragana ? toHiragana(e.target.value, { IMEMode: true }) : e.target.value)
                }
                placeholder="Tapez la lecture en romaji ou hiragana (ex: gakkou)…"
                className="yomikata__input"
              />
              <label className="yomikata__ime-toggle">
                <input
                  type="checkbox"
                  checked={autoHiragana}
                  onChange={(e) => setAutoHiragana(e.target.checked)}
                />
                <span>WanaKana IME</span>
              </label>
              <button
                type="submit"
                disabled={submittedValue !== null || !keyboardInput.trim()}
                className="yomikata__submit-btn"
              >
                Valider
              </button>
            </form>
          )}

          {answerMode === 'voice' && (
            <div className="yomikata__voice-box">
              <div className="yomikata__voice-engine">
                Moteur :{' '}
                <strong>
                  {isBrowserSpeechRecognitionSupported() && voiceEngineLabel === 'browser'
                    ? 'Web Speech API (ja-JP)'
                    : 'Gemini Audio Fallback (Firefox / universel)'}
                </strong>
              </div>
              <button
                type="button"
                disabled={submittedValue !== null || voiceState === 'transcribing'}
                onClick={handleToggleVoice}
                className={`yomikata__mic-btn ${
                  voiceState === 'listening' ? 'yomikata__mic-btn--listening' : ''
                }`}
              >
                {voiceState === 'listening' ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Écoute en cours… (cliquer pour arrêter)</span>
                  </>
                ) : voiceState === 'transcribing' ? (
                  <span>Transcription audio IA…</span>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Répondre à l’oral en japonais</span>
                  </>
                )}
              </button>
              {voiceTranscript && (
                <p className="yomikata__transcript">
                  Transcription captée : <strong lang="ja">{voiceTranscript}</strong>
                </p>
              )}
            </div>
          )}

          {submittedValue !== null && (
            <div aria-live="polite" className="yomikata__feedback">
              <div
                className={`yomikata__verdict ${
                  isCorrect ? 'yomikata__verdict--ok' : 'yomikata__verdict--wrong'
                }`}
              >
                {isCorrect
                  ? `Exact ! ${currentItem.targetWord} [${currentItem.reading}] — « ${currentItem.meaningFr} »`
                  : `Lecture attendue : ${currentItem.reading} (${currentItem.targetWord}) — « ${currentItem.meaningFr} »`}
              </div>

              <MultimediaFeedbackCard
                itemKey={currentItem.targetWord}
                itemType="JUKUGO"
                reading={currentItem.reading}
                meta={{
                  audioText: currentItem.reading,
                  frequencyScore10: currentItem.frequencyScore10,
                  jlpt: currentItem.level,
                }}
                compact
              />

              <p className="yomikata__explanation">{currentItem.explanation}</p>

              <div className="yomikata__next-row">
                <button type="button" onClick={handleNext} className="yomikata__next-btn">
                  <span>Phrase suivante</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="yomikata__community-bar">
        <button
          type="button"
          onClick={() => setShowShareForm((v) => !v)}
          className="yomikata__share-toggle"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{showShareForm ? 'Fermer le partage' : 'Proposer une phrase (Communauté)'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setCurrentIndex(0);
            setSessionScore(0);
            setAnsweredTotal(0);
            setSubmittedValue(null);
            setIsCorrect(null);
          }}
          className="yomikata__reset-btn"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Réinitialiser série</span>
        </button>
      </div>

      {shareNotice && <p className="yomikata__share-notice">{shareNotice}</p>}

      {showShareForm && (
        <form onSubmit={(e) => void handleSubmitCommunityPhrase(e)} className="yomikata__share-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={shareSentence}
              onChange={(e) => setShareSentence(e.target.value)}
              placeholder="Phrase japonaise complète (ex: 駅で切符を買う。)"
              className="yomikata__input"
            />
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={shareTargetWord}
                onChange={(e) => setShareTargetWord(e.target.value)}
                placeholder="Mot cible (ex: 切符)"
                className="yomikata__input"
              />
              <input
                type="text"
                required
                value={shareReading}
                onChange={(e) => setShareReading(e.target.value)}
                placeholder="Lecture (ex: きっぷ)"
                className="yomikata__input"
              />
            </div>
          </div>
          <input
            type="text"
            value={shareExplanation}
            onChange={(e) => setShareExplanation(e.target.value)}
            placeholder="Sens en français / explication courte"
            className="yomikata__input"
          />
          <label className="yomikata__consent-label">
            <input
              type="checkbox"
              checked={shareConsent}
              onChange={(e) => setShareConsent(e.target.checked)}
            />
            <span>
              J’accepte de publier cet exercice publiquement dans la collection Communauté (modération automatique active).
            </span>
          </label>
          <button type="submit" className="yomikata__submit-btn">
            Publier dans Communauté
          </button>
        </form>
      )}
    </section>
  );
}
