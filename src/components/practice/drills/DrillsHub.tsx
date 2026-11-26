'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  mergeExerciseCollections,
  type CollectionExerciseItem,
  type CollectionJLPTLevel,
  type ExerciseCollectionSource,
  type ExerciseDrillMode,
} from '@/lib/exerciseCollections';
import { OFFICIAL_SENTENCE_DRILLS } from '@/data/sentenceDrillsSeed';
import { checkDrillAnswer } from '@/lib/sentenceDrillsEngine';
import { recordErrorToSRS } from '@/lib/srs';
import type { AiAttemptEvent } from '@/lib/ai/geminiClient';
import { AiStatusBanner, type AiBannerStatus } from '@/components/ai/AiStatusBanner';
import { CollectionSourceSelector } from './CollectionSourceSelector';
import { IncrementalSentenceBuilder } from './IncrementalSentenceBuilder';
import { DrillReferenceSheet } from './DrillReferenceSheet';
import { CheckCircle2, Keyboard, ListChecks, Send, Sparkles, XCircle } from 'lucide-react';

const WORKSHOP_MODES: Array<{
  id: ExerciseDrillMode;
  label: string;
  shortDesc: string;
}> = [
  { id: 'polite_transform', label: 'Poli / Keigo', shortDesc: '丁寧語・尊敬語・謙譲語・普通形' },
  { id: 'particles', label: 'Particules', shortDesc: 'は/が/を/に/で/しか/だけ' },
  { id: 'sentence_builder', label: 'Par étapes', shortDesc: 'Basique → Complexe' },
  { id: 'error_correction', label: 'Corriger phrase', shortDesc: 'Particule, grammaire, kanji, keigo' },
  { id: 'ukemikei', label: 'Passif (Ukemikei)', shortDesc: '受身形 direct & subi' },
  { id: 'conditional_imperative', label: 'Condit. & Impératif', shortDesc: 'と・ば・たら・なら・命令形' },
  { id: 'polite_to_casual', label: 'Poli ↔ Familier', shortDesc: 'てる・とく・ちゃう・なきゃ' },
  { id: 'double_particles', label: 'Doubles & Natales', shortDesc: 'とは・のを + phrase FR+part.' },
];

interface DrillsHubProps {
  initialMode?: ExerciseDrillMode;
}

export function DrillsHub({ initialMode }: DrillsHubProps) {
  const [mode, setMode] = useState<ExerciseDrillMode>(
    initialMode && WORKSHOP_MODES.some((w) => w.id === initialMode)
      ? initialMode
      : 'polite_transform'
  );
  const [level, setLevel] = useState<string>('ALL');
  const [answerInputMode, setAnswerInputMode] = useState<'qcm' | 'keyboard'>('qcm');
  const [enabledSources, setEnabledSources] = useState<ExerciseCollectionSource[]>([
    'official',
    'ai_generated',
    'community',
  ]);

  const [aiPool, setAiPool] = useState<CollectionExerciseItem[]>([]);
  const [communityPool, setCommunityPool] = useState<CollectionExerciseItem[]>([]);
  const [cursor, setCursor] = useState(0);
  const [selectedOptId, setSelectedOptId] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [typedResult, setTypedResult] = useState<'correct' | 'wrong' | null>(null);

  const [aiStatus, setAiStatus] = useState<AiBannerStatus>('idle');
  const [aiEvents, setAiEvents] = useState<AiAttemptEvent[]>([]);
  const [aiUsedFallback, setAiUsedFallback] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [freeEvalFeedback, setFreeEvalFeedback] = useState<{
    isCorrect: boolean;
    score: number;
    correctedSentence: string;
    feedbackFr: string;
  } | null>(null);

  // Community opt-in submission form
  const [showContribute, setShowContribute] = useState(false);
  const [contribPrompt, setContribPrompt] = useState('');
  const [contribAnswer, setContribAnswer] = useState('');
  const [contribExplanation, setContribExplanation] = useState('');
  const [contribLevel, setContribLevel] = useState<CollectionJLPTLevel>('N4');
  const [contribConsent, setContribConsent] = useState(false);
  const [contribStatus, setContribStatus] = useState<string | null>(null);

  const refreshRemoteCollections = useCallback(async () => {
    try {
      const res = await fetch('/api/collections?sources=ai_generated,community&limit=100');
      if (!res.ok) return;
      const json = (await res.json()) as { ok: boolean; items?: CollectionExerciseItem[] };
      if (json.ok && Array.isArray(json.items)) {
        setAiPool(json.items.filter((i) => i.source === 'ai_generated'));
        setCommunityPool(json.items.filter((i) => i.source === 'community'));
      }
    } catch {
      // Offline-first: silently rely on official seed
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshRemoteCollections();
    });
  }, [refreshRemoteCollections]);

  const officialForMode = useMemo(
    () =>
      OFFICIAL_SENTENCE_DRILLS.filter(
        (i) => i.mode === mode && (level === 'ALL' || i.level === level)
      ),
    [mode, level]
  );

  const aiForMode = useMemo(
    () => aiPool.filter((i) => i.mode === mode && (level === 'ALL' || i.level === level)),
    [aiPool, mode, level]
  );

  const communityForMode = useMemo(
    () => communityPool.filter((i) => i.mode === mode && (level === 'ALL' || i.level === level)),
    [communityPool, mode, level]
  );

  const mergedItems = useMemo(
    () =>
      mergeExerciseCollections({
        pools: {
          official: officialForMode,
          ai_generated: aiForMode,
          community: communityForMode,
        },
        enabledSources,
        level,
        mode,
        shuffleFn: (arr) => arr, // stable order during session
      }),
    [officialForMode, aiForMode, communityForMode, enabledSources, level, mode]
  );

  const activeItem = mergedItems[cursor % Math.max(1, mergedItems.length)] || null;

  const resetQuestionState = () => {
    setSelectedOptId(null);
    setTypedAnswer('');
    setTypedResult(null);
    setFreeEvalFeedback(null);
  };

  const handleToggleSource = (src: ExerciseCollectionSource) => {
    setEnabledSources((prev) => {
      if (prev.includes(src)) {
        if (prev.length === 1) return prev; // Keep at least 1 active
        return prev.filter((s) => s !== src);
      }
      return [...prev, src];
    });
    setCursor(0);
    resetQuestionState();
  };

  const handleGenerateAiBatch = async () => {
    setAiStatus('loading');
    setAiError(null);
    setAiEvents([]);
    try {
      const res = await fetch('/api/drills/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          mode,
          level: level === 'ALL' ? 'N4' : level,
          count: 3,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        items?: CollectionExerciseItem[];
        error?: string;
        usedFallback?: boolean;
        events?: AiAttemptEvent[];
      };

      setAiEvents(data.events || []);
      setAiUsedFallback(Boolean(data.usedFallback));

      if (!res.ok || !data.ok || !data.items) {
        setAiStatus('error');
        setAiError(data.error || 'Échec de génération IA.');
        return;
      }

      setAiPool((prev) => [...(data.items || []), ...prev]);
      if (!enabledSources.includes('ai_generated')) {
        setEnabledSources((prev) => [...prev, 'ai_generated']);
      }
      setAiStatus('success');
    } catch {
      setAiStatus('error');
      setAiError('Connexion impossible pour générer des exercices IA.');
    }
  };

  const handlePickQcm = (optId: string) => {
    if (!activeItem || selectedOptId !== null) return;
    setSelectedOptId(optId);
    if (optId !== activeItem.correctOptionId) {
      void recordErrorToSRS({
        cardId: `drill:${activeItem.fingerprint}`,
        itemType: 'QUESTION',
        itemKey: activeItem.targetWord || activeItem.mode,
        level: activeItem.level,
        prompt: activeItem.prompt,
        answer: activeItem.expectedAnswers[0] || '',
      });
    }
  };

  const handleCheckTyped = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem || !typedAnswer.trim()) return;
    const ok = checkDrillAnswer(typedAnswer, activeItem.expectedAnswers);
    setTypedResult(ok ? 'correct' : 'wrong');
    if (!ok) {
      void recordErrorToSRS({
        cardId: `drill:${activeItem.fingerprint}`,
        itemType: 'QUESTION',
        itemKey: activeItem.targetWord || activeItem.mode,
        level: activeItem.level,
        prompt: activeItem.prompt,
        answer: activeItem.expectedAnswers[0] || '',
      });
    }
  };

  const handleEvaluateFreeAi = async () => {
    if (!activeItem || !typedAnswer.trim()) return;
    setAiStatus('loading');
    setAiError(null);
    try {
      const res = await fetch('/api/drills/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate_free',
          prompt: activeItem.prompt,
          expectedAnswers: activeItem.expectedAnswers,
          userSentence: typedAnswer,
          level: activeItem.level,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        evaluation?: {
          isCorrect: boolean;
          score: number;
          correctedSentence: string;
          feedbackFr: string;
        };
        error?: string;
        usedFallback?: boolean;
        events?: AiAttemptEvent[];
      };
      setAiEvents(data.events || []);
      setAiUsedFallback(Boolean(data.usedFallback));
      if (!res.ok || !data.ok || !data.evaluation) {
        setAiStatus('error');
        setAiError(data.error || 'Échec de correction IA.');
        return;
      }
      setFreeEvalFeedback(data.evaluation);
      setTypedResult(data.evaluation.isCorrect ? 'correct' : 'wrong');
      setAiStatus('success');
    } catch {
      setAiStatus('error');
      setAiError('Connexion impossible pour la correction IA.');
    }
  };

  const handleSubmitCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setContribStatus(null);
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'community',
          mode,
          level: contribLevel,
          prompt: contribPrompt,
          expectedAnswers: [contribAnswer],
          explanation: contribExplanation,
          consentPublic: contribConsent,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        item?: CollectionExerciseItem;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.item) {
        setContribStatus(data.error || 'Soumission refusée.');
        return;
      }
      setCommunityPool((prev) => [data.item!, ...prev]);
      setContribPrompt('');
      setContribAnswer('');
      setContribExplanation('');
      setContribConsent(false);
      setContribStatus('Merci ! Votre exercice a été ajouté à la collection Communauté.');
    } catch {
      setContribStatus('Erreur réseau lors de la soumission.');
    }
  };

  return (
    <div className="drills-hub">
      {/* 8 Workshops selector */}
      <div className="drills-hub__modes" role="tablist" aria-label="Ateliers Phrases et Registres">
        {WORKSHOP_MODES.map((w) => (
          <button
            key={w.id}
            type="button"
            role="tab"
            aria-selected={mode === w.id}
            onClick={() => {
              setMode(w.id);
              setCursor(0);
              resetQuestionState();
            }}
            className={`drills-hub__mode-btn ${
              mode === w.id ? 'drills-hub__mode-btn--active' : ''
            }`}
          >
            <span className="drills-hub__mode-title">{w.label}</span>
            <span className="drills-hub__mode-desc">{w.shortDesc}</span>
          </button>
        ))}
      </div>

      {/* Filters & 3 collections merger */}
      <div className="drills-hub__controls">
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filtrer les ateliers par niveau JLPT"
            value={level}
            onChange={(e) => {
              setLevel(e.target.value);
              setCursor(0);
              resetQuestionState();
            }}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-200"
          >
            <option value="ALL">Tous niveaux (N5–N1)</option>
            <option value="N5">N5</option>
            <option value="N4">N4</option>
            <option value="N3">N3</option>
            <option value="N2">N2</option>
            <option value="N1">N1</option>
          </select>

          <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950 p-0.5">
            <button
              type="button"
              onClick={() => {
                setAnswerInputMode('qcm');
                resetQuestionState();
              }}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer ${
                answerInputMode === 'qcm' ? 'bg-sky-600 text-white' : 'text-slate-400'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>QCM</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAnswerInputMode('keyboard');
                resetQuestionState();
              }}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer ${
                answerInputMode === 'keyboard' ? 'bg-sky-600 text-white' : 'text-slate-400'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Clavier / Libre IA</span>
            </button>
          </div>
        </div>

        <CollectionSourceSelector
          enabledSources={enabledSources}
          counts={{
            official: officialForMode.length,
            ai_generated: aiForMode.length,
            community: communityForMode.length,
          }}
          isGeneratingAi={aiStatus === 'loading'}
          onToggleSource={handleToggleSource}
          onGenerateAiBatch={() => void handleGenerateAiBatch()}
        />
      </div>

      <AiStatusBanner
        status={aiStatus}
        events={aiEvents}
        usedFallback={aiUsedFallback}
        errorMessage={aiError}
        onRetry={() => void handleGenerateAiBatch()}
        compact
      />

      <DrillReferenceSheet mode={mode} />

      {mode === 'sentence_builder' && <IncrementalSentenceBuilder />}

      {/* Active Drill Card */}
      {activeItem ? (
        <article className="drills-card">
          <div className="drills-card__meta">
            <div className="flex items-center gap-2">
              <span className="rounded bg-sky-950 border border-sky-800 px-2 py-0.5 text-[11px] font-bold text-sky-300">
                {activeItem.level}
              </span>
              <span className="rounded bg-slate-950 border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300">
                {activeItem.source === 'official'
                  ? 'Socle Officiel'
                  : activeItem.source === 'ai_generated'
                    ? 'Collection IA'
                    : 'Communauté'}
              </span>
              {(activeItem.tags || []).map((t) => (
                <span
                  key={t}
                  className="rounded bg-slate-950 border border-slate-800 px-2 py-0.5 text-[10px] text-slate-400"
                >
                  #{t}
                </span>
              ))}
            </div>
            <span className="text-xs text-slate-400">
              Exercice {(cursor % mergedItems.length) + 1} / {mergedItems.length}
            </span>
          </div>

          <h2 className="drills-card__prompt">{activeItem.prompt}</h2>

          {answerInputMode === 'qcm' && activeItem.options && activeItem.options.length > 0 ? (
            <div className="drills-card__options">
              {activeItem.options.map((opt) => {
                const picked = selectedOptId === opt.id;
                const revealed = selectedOptId !== null;
                const isRight = opt.id === activeItem.correctOptionId;
                let stateCls = '';
                if (revealed) {
                  if (isRight) stateCls = 'drills-card__option--correct';
                  else if (picked) stateCls = 'drills-card__option--wrong';
                }
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={revealed}
                    onClick={() => handlePickQcm(opt.id)}
                    className={`drills-card__option ${stateCls}`}
                  >
                    <span>{opt.text}</span>
                    {revealed && isRight && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {revealed && picked && !isRight && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleCheckTyped} className="flex flex-col gap-2.5">
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  placeholder="Tapez votre réponse en japonais (ou romaji)…"
                  aria-label="Votre réponse en japonais"
                  className="flex-1 min-w-[220px] rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  Vérifier
                </button>
                <button
                  type="button"
                  onClick={() => void handleEvaluateFreeAi()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-600/60 bg-indigo-950/60 hover:bg-indigo-900/70 px-3.5 py-2 text-xs font-bold text-indigo-200 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Corriger phrase libre (IA)</span>
                </button>
              </div>
            </form>
          )}

          {(selectedOptId !== null || typedResult !== null) && (
            <div className="drills-card__feedback">
              <div className="text-xs font-bold text-emerald-300">
                Réponse attendue : <span className="font-serif text-sm">{activeItem.expectedAnswers.join(' / ')}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{activeItem.explanation}</p>
              {freeEvalFeedback && (
                <div className="rounded-lg border border-indigo-700/50 bg-indigo-950/40 p-2.5 text-xs text-indigo-200 space-y-1">
                  <div>
                    <strong>Correction IA ({freeEvalFeedback.score}/100) :</strong>{' '}
                    <span className="font-serif">{freeEvalFeedback.correctedSentence}</span>
                  </div>
                  <p>{freeEvalFeedback.feedbackFr}</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setCursor((c) => c + 1);
                  resetQuestionState();
                }}
                className="self-end rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2 text-xs font-bold text-white cursor-pointer"
              >
                Exercice suivant →
              </button>
            </div>
          )}
        </article>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center text-xs text-slate-400">
          Aucun exercice trouvé pour ces filtres. Essayez « Tous niveaux » ou cliquez sur « + Générer IA ».
        </div>
      )}

      {/* Opt-in Community Submission */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-200">
            Partager une phrase / exercice avec la Communauté (opt-in modéré)
          </span>
          <button
            type="button"
            onClick={() => setShowContribute((v) => !v)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-semibold text-sky-300 hover:text-white cursor-pointer"
          >
            {showContribute ? 'Fermer' : 'Proposer un exercice'}
          </button>
        </div>

        {showContribute && (
          <form onSubmit={(e) => void handleSubmitCommunity(e)} className="mt-3 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                value={contribPrompt}
                onChange={(e) => setContribPrompt(e.target.value)}
                placeholder="Consigne + phrase (ex: Mettre au passif : ...)"
                className="sm:col-span-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
              />
              <select
                value={contribLevel}
                onChange={(e) => setContribLevel(e.target.value as CollectionJLPTLevel)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200"
              >
                <option value="N5">N5</option>
                <option value="N4">N4</option>
                <option value="N3">N3</option>
                <option value="N2">N2</option>
                <option value="N1">N1</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={contribAnswer}
                onChange={(e) => setContribAnswer(e.target.value)}
                placeholder="Réponse attendue en japonais"
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
              />
              <input
                type="text"
                required
                value={contribExplanation}
                onChange={(e) => setContribExplanation(e.target.value)}
                placeholder="Explication courte en français"
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={contribConsent}
                onChange={(e) => setContribConsent(e.target.checked)}
                required
              />
              <span>
                J’accepte de publier cet exercice dans la collection publique Communauté (soumis à
                modération automatique et admin).
              </span>
            </label>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-amber-300">{contribStatus || ''}</span>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publier dans Communauté</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
