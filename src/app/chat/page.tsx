'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  MessageSquareText,
} from 'lucide-react';
import { AiStatusBanner, type AiBannerStatus } from '@/components/ai/AiStatusBanner';
import type { AiAttemptEvent } from '@/lib/ai/geminiClient';
import {
  createJapaneseVoiceSession,
  type VoiceSessionController,
} from '@/lib/speechRecognition';
import {
  CHAT_DISCUSSION_TOPICS,
  type ChatDiscussionTopic,
} from '@/data/chatTopics';

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  textJa: string;
  readingHira?: string;
  translationFr?: string;
  feedbackFr?: string;
}

export default function ChatPage() {
  const [level, setLevel] = useState<'N5' | 'N4' | 'N3' | 'N2' | 'N1'>('N4');
  const [topics, setTopics] = useState<ChatDiscussionTopic[]>(CHAT_DISCUSSION_TOPICS);
  const [selectedTopicId, setSelectedTopicId] = useState<string>(CHAT_DISCUSSION_TOPICS[2].id);
  const [customTheme, setCustomTheme] = useState('');

  const activeTopic =
    topics.find((t) => t.id === selectedTopicId) ||
    topics.find((t) => t.level === level) ||
    topics[0];

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init_0',
      role: 'ai',
      textJa: CHAT_DISCUSSION_TOPICS[2].starterJa,
      readingHira: CHAT_DISCUSSION_TOPICS[2].starterReading,
      translationFr: CHAT_DISCUSSION_TOPICS[2].starterFr,
    },
  ]);

  const [userInput, setUserInput] = useState('');
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'transcribing'>('idle');
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

  const selectTopic = (topic: ChatDiscussionTopic) => {
    setSelectedTopicId(topic.id);
    setLevel(topic.level);
    setMessages([
      {
        id: `init_${topic.id}`,
        role: 'ai',
        textJa: topic.starterJa,
        readingHira: topic.starterReading,
        translationFr: topic.starterFr,
      },
    ]);
  };

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  };

  const sendMessage = async (rawText: string) => {
    const clean = rawText.trim();
    if (!clean) return;

    setMessages((prev) => [...prev, { id: `u_${Date.now()}`, role: 'user', textJa: clean }]);
    setUserInput('');
    setAiStatus('loading');
    setAiError(null);

    try {
      const res = await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply',
          level,
          topicTitle: activeTopic.titleFr,
          vocabWords: activeTopic.vocabField.map((v) => v.word),
          userMessage: clean,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        turn?: {
          replyJa: string;
          readingHira: string;
          translationFr: string;
          feedbackFr: string;
          followUpJa: string;
        };
        usedFallback?: boolean;
        events?: AiAttemptEvent[];
        error?: string;
      };
      setAiEvents(data.events || []);
      setAiUsedFallback(Boolean(data.usedFallback));

      if (!res.ok || !data.ok || !data.turn) {
        setAiStatus('error');
        setAiError(data.error || 'Tuteur IA temporairement indisponible.');
        return;
      }

      setAiStatus('success');
      const fullJa = data.turn.followUpJa
        ? `${data.turn.replyJa} ${data.turn.followUpJa}`
        : data.turn.replyJa;

      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          role: 'ai',
          textJa: fullJa,
          readingHira: data.turn!.readingHira,
          translationFr: data.turn!.translationFr,
          feedbackFr: data.turn!.feedbackFr,
        },
      ]);
    } catch {
      setAiStatus('error');
      setAiError('Erreur réseau lors de l’envoi du message.');
    }
  };

  const handleGenerateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiStatus('loading');
    setAiError(null);
    try {
      const res = await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_topic',
          level,
          customTheme: customTheme || 'Vie quotidienne',
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        topic?: ChatDiscussionTopic;
        usedFallback?: boolean;
        events?: AiAttemptEvent[];
        error?: string;
      };
      setAiEvents(data.events || []);
      setAiUsedFallback(Boolean(data.usedFallback));
      if (!res.ok || !data.ok || !data.topic) {
        setAiStatus('error');
        setAiError(data.error || 'Génération de sujet indisponible.');
        return;
      }
      setAiStatus('success');
      setTopics((prev) => [data.topic!, ...prev]);
      selectTopic(data.topic);
      setCustomTheme('');
    } catch {
      setAiStatus('error');
      setAiError('Erreur réseau lors de la création du sujet.');
    }
  };

  const handleToggleVoice = () => {
    if (voiceState !== 'idle') {
      sessionRef.current?.stop();
      setVoiceState('idle');
      return;
    }
    setAiError(null);
    const session = createJapaneseVoiceSession({
      expectedHint: activeTopic.titleJa,
      onStatusChange: (status) => setVoiceState(status),
      onResult: (res) => {
        if (!res.ok || !res.transcript) {
          setAiStatus('error');
          setAiError(res.errorFr || 'Voix non reconnue.');
          return;
        }
        void sendMessage(res.transcript);
      },
    });
    sessionRef.current = session;
    void session.start();
  };

  const levelTopics = topics.filter((t) => t.level === level);

  return (
    <div className="phase8-page">
      <header className="phase8-header">
        <div>
          <div className="phase8-kicker phase8-kicker--emerald">
            <MessageSquareText className="w-4 h-4" />
            <span>Tchat Oral IA Borné • Web Speech + Fallback Gemini Audio</span>
          </div>
          <h1 className="phase8-title">Dialogue Guidé &amp; Sujets de Discussion</h1>
          <p className="phase8-subtitle">
            Sessions cadrées par niveau JLPT, champ lexical et points de grammaire pour pratiquer
            sans dispersion (à l’écrit ou à l’oral).
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: Bounded topic & topic generator */}
        <aside className="phase8-card space-y-4">
          <div>
            <label htmlFor="chat-level" className="text-xs font-bold text-slate-400 block mb-1">
              Niveau JLPT de la session
            </label>
            <select
              id="chat-level"
              value={level}
              onChange={(e) => {
                const nextLvl = e.target.value as ChatDiscussionTopic['level'];
                setLevel(nextLvl);
                const first = topics.find((t) => t.level === nextLvl);
                if (first) selectTopic(first);
              }}
              className="phase8-select w-full"
            >
              {(['N5', 'N4', 'N3', 'N2', 'N1'] as const).map((l) => (
                <option key={l} value={l}>
                  JLPT {l}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-bold text-slate-400">Sujets disponibles ({level}) :</div>
            {levelTopics.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTopic(t)}
                className={`w-full text-left rounded-xl border p-2.5 text-xs cursor-pointer transition-colors ${
                  activeTopic.id === t.id
                    ? 'border-emerald-500 bg-emerald-950/50 text-white font-bold'
                    : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div>{t.titleFr}</div>
                <div className="text-[11px] text-sky-400 mt-0.5" lang="ja">
                  {t.titleJa}
                </div>
              </button>
            ))}
          </div>

          <form onSubmit={(e) => void handleGenerateTopic(e)} className="space-y-2 pt-2 border-t border-slate-800">
            <div className="text-xs font-bold text-indigo-300">Générer un nouveau sujet IA</div>
            <input
              type="text"
              value={customTheme}
              onChange={(e) => setCustomTheme(e.target.value)}
              placeholder="Thème (ex: Commander un ramen, Entretien d’embauche…)"
              className="phase8-input w-full"
            />
            <button type="submit" disabled={aiStatus === 'loading'} className="phase8-ai-btn w-full justify-center">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Créer le brief de session</span>
            </button>
          </form>

          {activeTopic && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 space-y-2 text-xs">
              <div className="font-bold text-amber-300">Champ lexical ciblé</div>
              <div className="flex flex-wrap gap-1.5">
                {activeTopic.vocabField.map((v) => (
                  <span
                    key={v.word}
                    className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-700 text-slate-200"
                    title={v.meaningFr}
                    lang="ja"
                  >
                    {v.word} ({v.reading})
                  </span>
                ))}
              </div>
              <div className="font-bold text-sky-300 pt-1">Motifs à placer</div>
              <div className="flex flex-wrap gap-1">
                {activeTopic.grammarPatterns.map((gp) => (
                  <span key={gp} className="px-2 py-0.5 rounded bg-sky-950/60 text-sky-200" lang="ja">
                    {gp}
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Right: Chat stream & oral controls */}
        <section className="lg:col-span-2 phase8-card space-y-4">
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-2xl border p-3.5 space-y-1.5 ${
                  m.role === 'ai'
                    ? 'border-indigo-800/60 bg-slate-900'
                    : 'border-emerald-700/60 bg-emerald-950/30 ml-8'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase text-slate-400">
                    {m.role === 'ai' ? `Tuteur IA (${level})` : 'Vous'}
                  </span>
                  <button
                    type="button"
                    onClick={() => speak(m.textJa)}
                    aria-label="Écouter la réplique"
                    className="phase8-icon-btn"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-base font-bold text-white" lang="ja">
                  {m.textJa}
                </div>
                {m.readingHira && (
                  <div className="text-xs text-sky-400" lang="ja">
                    {m.readingHira}
                  </div>
                )}
                {m.translationFr && (
                  <div className="text-xs text-slate-300">{m.translationFr}</div>
                )}
                {m.feedbackFr && (
                  <div className="text-[11px] text-amber-300 bg-amber-950/20 border border-amber-700/40 rounded-lg p-2 mt-1">
                    <strong>Conseil :</strong> {m.feedbackFr}
                  </div>
                )}
              </div>
            ))}
          </div>

          <AiStatusBanner
            status={aiStatus}
            events={aiEvents}
            usedFallback={aiUsedFallback}
            errorMessage={aiError}
            compact
          />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(userInput);
            }}
            className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800"
          >
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={`Répondez en japonais (${level})…`}
              className="phase8-input flex-1 min-w-[200px]"
            />
            <button
              type="button"
              onClick={handleToggleVoice}
              disabled={voiceState === 'transcribing'}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer ${
                voiceState === 'listening'
                  ? 'bg-rose-600 hover:bg-rose-500 animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {voiceState === 'listening' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>
                {voiceState === 'listening'
                  ? 'Stop'
                  : voiceState === 'transcribing'
                    ? 'Audio…'
                    : 'Parler'}
              </span>
            </button>
            <button
              type="submit"
              disabled={!userInput.trim() || aiStatus === 'loading'}
              className="phase8-ai-btn"
            >
              <Send className="w-4 h-4" />
              <span>Envoyer</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
