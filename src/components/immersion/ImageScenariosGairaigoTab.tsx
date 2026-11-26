'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Mic, MicOff, Volume2, CheckCircle2, XCircle } from 'lucide-react';
import { SpriteThumbnail } from '@/components/media/SpriteThumbnail';
import { AiStatusBanner, type AiBannerStatus } from '@/components/ai/AiStatusBanner';
import type { AiAttemptEvent } from '@/lib/ai/geminiClient';
import { recordErrorToSRS } from '@/lib/srs';
import {
  createJapaneseVoiceSession,
  matchesJapaneseSpeech,
  type VoiceSessionController,
} from '@/lib/speechRecognition';
import {
  GAIRAIGO_ORAL_ITEMS,
  VISUAL_SCENARIOS,
  type GairaigoOralItem,
} from '@/data/imageScenariosAndGairaigo';

const GAIRAIGO_CATEGORIES: Array<'ALL' | GairaigoOralItem['category']> = [
  'ALL',
  'Café & Repas',
  'Tech & Quotidien',
  'Voyage & Hôtel',
  'Faux-amis (Wasei)',
];

export function ImageScenariosGairaigoTab() {
  const [scenarioId, setScenarioId] = useState(VISUAL_SCENARIOS[0].id);
  const [scenarioAnswer, setScenarioAnswer] = useState<string | null>(null);

  const [gairaigoCat, setGairaigoCat] = useState<'ALL' | GairaigoOralItem['category']>('ALL');
  const [activeOralId, setActiveOralId] = useState<string>(GAIRAIGO_ORAL_ITEMS[0].id);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'transcribing'>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [oralVerdict, setOralVerdict] = useState<boolean | null>(null);
  const [aiStatus, setAiStatus] = useState<AiBannerStatus>('idle');
  const [aiEvents, setAiEvents] = useState<AiAttemptEvent[]>([]);
  const [aiUsedFallback, setAiUsedFallback] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const sessionRef = useRef<VoiceSessionController | null>(null);

  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
    };
  }, []);

  const scenario =
    VISUAL_SCENARIOS.find((s) => s.id === scenarioId) || VISUAL_SCENARIOS[0];

  const filteredGairaigo = useMemo(() => {
    if (gairaigoCat === 'ALL') return GAIRAIGO_ORAL_ITEMS;
    return GAIRAIGO_ORAL_ITEMS.filter((g) => g.category === gairaigoCat);
  }, [gairaigoCat]);

  const activeOral =
    filteredGairaigo.find((g) => g.id === activeOralId) ||
    filteredGairaigo[0] ||
    GAIRAIGO_ORAL_ITEMS[0];

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  };

  const handleSelectScenarioOption = async (optId: string) => {
    if (scenarioAnswer !== null) return;
    setScenarioAnswer(optId);
    if (optId !== scenario.quiz.correctId) {
      await recordErrorToSRS({
        cardId: `jukugo:${scenario.items[0].itemKey}`,
        itemType: 'JUKUGO',
        itemKey: scenario.items[0].itemKey,
        level: scenario.level,
        prompt: scenario.quiz.prompt,
        answer: scenario.quiz.explanation,
      });
    }
  };

  const handleToggleOralPractice = () => {
    if (voiceState !== 'idle') {
      sessionRef.current?.stop();
      setVoiceState('idle');
      return;
    }

    setAiError(null);
    setAiStatus('idle');
    setOralVerdict(null);
    setTranscript('');

    const session = createJapaneseVoiceSession({
      expectedHint: `${activeOral.katakana} (${activeOral.romajiHint})`,
      onStatusChange: (status) => {
        setVoiceState(status);
        if (status === 'transcribing') setAiStatus('loading');
      },
      onResult: (res) => {
        if (res.events) setAiEvents(res.events);
        if (res.usedFallback) setAiUsedFallback(true);

        if (!res.ok || !res.transcript) {
          setAiStatus('error');
          setAiError(res.errorFr || 'Prononciation non reconnue. Réessayez.');
          return;
        }

        setAiStatus(res.usedFallback ? 'success' : 'idle');
        setTranscript(res.transcript);
        const ok = matchesJapaneseSpeech(res.transcript, [
          activeOral.katakana,
          activeOral.romajiHint,
        ]);
        setOralVerdict(ok);
      },
    });
    sessionRef.current = session;
    void session.start();
  };

  return (
    <div className="space-y-6">
      {/* Visual Vocabulary by Scenario */}
      <section className="imm-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-amber-400" />
              <span>Vocabulaire par Image &amp; Scénario Narratif</span>
            </h3>
            <p className="text-xs text-slate-400">
              Mémorisez des groupes lexicaux reliés dans un récit concret illustré par sprites WebP.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {VISUAL_SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => {
                  setScenarioId(sc.id);
                  setScenarioAnswer(null);
                }}
                className={`imm-chip ${scenarioId === sc.id ? 'imm-chip--active' : ''}`}
              >
                {sc.sceneEmoji} {sc.titleJp} ({sc.level})
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-amber-300">
              {scenario.sceneEmoji} {scenario.title}
            </span>
            <button
              type="button"
              onClick={() => speak(scenario.narrativeJp)}
              className="imm-icon-btn"
              title="Écouter le scénario"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-base font-bold text-slate-100" lang="ja">
            {scenario.narrativeJp}
          </p>
          <p className="text-xs text-slate-400">{scenario.narrativeFr}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {scenario.items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3"
            >
              <SpriteThumbnail itemKey={item.itemKey} fallbackLabel={item.emoji} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-black text-white" lang="ja">
                    {item.itemKey}
                  </span>
                  <button
                    type="button"
                    onClick={() => speak(item.reading)}
                    aria-label={`Écouter ${item.itemKey}`}
                    className="text-sky-400 hover:text-sky-300 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-[11px] text-sky-400" lang="ja">
                  {item.reading} • {item.jlpt}
                </div>
                <div className="text-xs font-bold text-slate-200">{item.meaningFr}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{item.noteFr}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-amber-800/40 bg-slate-900 p-4 space-y-3">
          <div className="text-xs font-bold text-amber-300">Mini-quiz du scénario :</div>
          <div className="text-sm font-bold text-white">{scenario.quiz.prompt}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {scenario.quiz.options.map((opt) => {
              const answered = scenarioAnswer !== null;
              const isRight = opt.id === scenario.quiz.correctId;
              const isPicked = scenarioAnswer === opt.id;
              let mod = '';
              if (answered) {
                if (isRight) mod = 'border-emerald-500 bg-emerald-950/60 text-emerald-200';
                else if (isPicked) mod = 'border-rose-500 bg-rose-950/60 text-rose-200';
              }
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={answered}
                  onClick={() => void handleSelectScenarioOption(opt.id)}
                  className={`flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-left text-xs font-bold text-slate-100 cursor-pointer ${mod}`}
                  lang="ja"
                >
                  <span>{opt.text}</span>
                  {answered && isRight && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {answered && isPicked && !isRight && <XCircle className="w-4 h-4 text-rose-400" />}
                </button>
              );
            })}
          </div>
          {scenarioAnswer !== null && (
            <p className="text-xs text-slate-300">{scenario.quiz.explanation}</p>
          )}
        </div>
      </section>

      {/* Gairaigo Beginner Oral Program */}
      <section className="imm-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Mic className="w-4 h-4 text-indigo-400" />
              <span>Programme Oral Gairaigo pour Débutants (カタカナ)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Débloquez l’expression orale dès la semaine 1 en prononçant à la japonaise les mots internationaux et wasei-eigo.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {GAIRAIGO_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setGairaigoCat(cat);
                  setOralVerdict(null);
                  setTranscript('');
                }}
                className={`imm-chip ${gairaigoCat === cat ? 'imm-chip--active' : ''}`}
              >
                {cat === 'ALL' ? 'Tout' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filteredGairaigo.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveOralId(item.id);
                setOralVerdict(null);
                setTranscript('');
              }}
              className={`imm-chip ${activeOral.id === item.id ? 'imm-chip--active' : ''}`}
              lang="ja"
            >
              {item.katakana}
            </button>
          ))}
        </div>

        {activeOral && (
          <div className="rounded-xl border border-indigo-800/50 bg-slate-900 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-2xl font-black text-white mr-2" lang="ja">
                  {activeOral.katakana}
                </span>
                <span className="text-xs font-mono text-sky-400">[{activeOral.romajiHint}]</span>
                <div className="text-xs text-slate-300 mt-0.5">
                  <strong>{activeOral.meaningFr}</strong> • Origine : {activeOral.originHint}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => speak(activeOral.katakana)}
                  className="imm-toggle-btn"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Modèle audio</span>
                </button>
                <button
                  type="button"
                  disabled={voiceState === 'transcribing'}
                  onClick={handleToggleOralPractice}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer ${
                    voiceState === 'listening'
                      ? 'bg-rose-600 hover:bg-rose-500 animate-pulse'
                      : 'bg-indigo-600 hover:bg-indigo-500'
                  }`}
                >
                  {voiceState === 'listening' ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>
                    {voiceState === 'listening'
                      ? 'Stop écoute'
                      : voiceState === 'transcribing'
                        ? 'Analyse audio…'
                        : 'Répéter à l’oral'}
                  </span>
                </button>
              </div>
            </div>

            <div className="text-xs text-amber-300 bg-amber-950/20 border border-amber-700/40 rounded-lg p-2.5">
              <strong>Conseil diction :</strong> {activeOral.pronunciationTipFr}
            </div>
            <div className="text-xs text-slate-300" lang="ja">
              Exemple : <strong>{activeOral.exampleJp}</strong>
            </div>

            <AiStatusBanner
              status={aiStatus}
              events={aiEvents}
              usedFallback={aiUsedFallback}
              errorMessage={aiError}
              compact
            />

            {transcript && (
              <div
                className={`rounded-xl border p-2.5 text-xs font-bold ${
                  oralVerdict
                    ? 'border-emerald-600 bg-emerald-950/60 text-emerald-200'
                    : 'border-amber-600 bg-amber-950/60 text-amber-200'
                }`}
              >
                Capté : « {transcript} » —{' '}
                {oralVerdict
                  ? 'Prononciation reconnue avec succès !'
                  : `Attendu proche de ${activeOral.katakana}`}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
