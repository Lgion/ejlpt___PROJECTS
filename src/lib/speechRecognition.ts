'use client';

import { toHiragana } from 'wanakana';
import type { AiAttemptEvent } from '@/lib/ai/geminiClient';

export interface VoiceRecognitionResult {
  ok: boolean;
  transcript: string;
  engine: 'browser' | 'gemini_audio';
  usedFallback?: boolean;
  events?: AiAttemptEvent[];
  errorFr?: string;
}

export interface CreateVoiceSessionOptions {
  expectedHint?: string;
  forceGeminiFallback?: boolean;
  maxDurationMs?: number;
  onStatusChange?: (status: 'listening' | 'transcribing' | 'idle') => void;
  onResult: (result: VoiceRecognitionResult) => void;
}

export interface VoiceSessionController {
  start: () => Promise<void>;
  stop: () => void;
  engine: 'browser' | 'gemini_audio';
}

interface BrowserSpeechRecognitionAlternative {
  transcript?: string;
}

interface BrowserSpeechRecognitionResult {
  0?: BrowserSpeechRecognitionAlternative;
}

interface BrowserSpeechRecognitionEvent {
  results?: ArrayLike<BrowserSpeechRecognitionResult>;
}

interface BrowserSpeechRecognitionErrorEvent {
  error?: string;
}

interface BrowserSpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type BrowserSpeechCtor = new () => BrowserSpeechRecognitionInstance;

function getBrowserSpeechCtor(): BrowserSpeechCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: BrowserSpeechCtor;
    webkitSpeechRecognition?: BrowserSpeechCtor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

export function isBrowserSpeechRecognitionSupported(): boolean {
  return getBrowserSpeechCtor() !== null;
}

export function isMediaRecorderSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';
}

export function normalizeJapaneseTranscript(raw: string): string {
  return raw
    .normalize('NFKC')
    .replace(/[\s\u3000。、！？.,!?「」『』・ー〜~()（）]/g, '')
    .toLowerCase();
}

export function matchesJapaneseSpeech(transcript: string, expectedAnswers: string[]): boolean {
  const cleanTranscript = normalizeJapaneseTranscript(transcript);
  if (!cleanTranscript) return false;

  const hiraTranscript = normalizeJapaneseTranscript(toHiragana(cleanTranscript));

  return expectedAnswers.some((candidate) => {
    const cleanExpected = normalizeJapaneseTranscript(candidate);
    if (!cleanExpected) return false;
    const hiraExpected = normalizeJapaneseTranscript(toHiragana(cleanExpected));
    return (
      cleanTranscript === cleanExpected ||
      hiraTranscript === hiraExpected ||
      cleanTranscript === hiraExpected ||
      hiraTranscript === cleanExpected
    );
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const raw = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = raw.indexOf(',');
      resolve(commaIdx >= 0 ? raw.slice(commaIdx + 1) : raw);
    };
    reader.onerror = () => reject(new Error('Impossible de lire le flux audio.'));
    reader.readAsDataURL(blob);
  });
}

export function createJapaneseVoiceSession(options: CreateVoiceSessionOptions): VoiceSessionController {
  const maxDurationMs = Math.max(1500, options.maxDurationMs ?? 7000);
  const SpeechCtor = options.forceGeminiFallback ? null : getBrowserSpeechCtor();
  const initialEngine: 'browser' | 'gemini_audio' = SpeechCtor ? 'browser' : 'gemini_audio';

  let activeRecognition: BrowserSpeechRecognitionInstance | null = null;
  let activeRecorder: MediaRecorder | null = null;
  let activeStream: MediaStream | null = null;
  let stopTimer: ReturnType<typeof setTimeout> | null = null;
  let settled = false;

  const clearStopTimer = () => {
    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
  };

  const cleanupStream = () => {
    if (activeStream) {
      for (const track of activeStream.getTracks()) {
        track.stop();
      }
      activeStream = null;
    }
  };

  const startGeminiFallback = async () => {
    if (!isMediaRecorderSupported()) {
      options.onStatusChange?.('idle');
      options.onResult({
        ok: false,
        transcript: '',
        engine: 'gemini_audio',
        errorFr:
          'Votre navigateur ne supporte ni Web Speech API ni l’enregistrement micro. Utilisez le mode Clavier ou QCM.',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activeStream = stream;
      const preferredMime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);
      activeRecorder = recorder;

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data && ev.data.size > 0) {
          chunks.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        clearStopTimer();
        cleanupStream();
        activeRecorder = null;

        if (chunks.length === 0) {
          options.onStatusChange?.('idle');
          options.onResult({
            ok: false,
            transcript: '',
            engine: 'gemini_audio',
            errorFr: 'Aucun son capturé. Parlez près du microphone puis réessayez.',
          });
          return;
        }

        options.onStatusChange?.('transcribing');
        try {
          const mimeType = recorder.mimeType || 'audio/webm';
          const blob = new Blob(chunks, { type: mimeType });
          const base64Audio = await blobToBase64(blob);

          const res = await fetch('/api/ai/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64Audio,
              mimeType,
              expectedHint: options.expectedHint,
            }),
          });

          const payload = (await res.json()) as {
            ok?: boolean;
            transcript?: string;
            usedFallback?: boolean;
            events?: AiAttemptEvent[];
            error?: string;
          };

          options.onStatusChange?.('idle');
          if (!res.ok || !payload.ok) {
            options.onResult({
              ok: false,
              transcript: '',
              engine: 'gemini_audio',
              usedFallback: payload.usedFallback,
              events: payload.events,
              errorFr: payload.error || 'La transcription vocale IA a échoué.',
            });
            return;
          }

          options.onResult({
            ok: true,
            transcript: (payload.transcript || '').trim(),
            engine: 'gemini_audio',
            usedFallback: payload.usedFallback,
            events: payload.events,
          });
        } catch {
          options.onStatusChange?.('idle');
          options.onResult({
            ok: false,
            transcript: '',
            engine: 'gemini_audio',
            errorFr: 'Erreur réseau lors de l’envoi audio pour transcription.',
          });
        }
      };

      options.onStatusChange?.('listening');
      recorder.start();
      stopTimer = setTimeout(() => {
        if (activeRecorder && activeRecorder.state === 'recording') {
          activeRecorder.stop();
        }
      }, maxDurationMs);
    } catch {
      cleanupStream();
      options.onStatusChange?.('idle');
      options.onResult({
        ok: false,
        transcript: '',
        engine: 'gemini_audio',
        errorFr: 'Accès au microphone refusé ou indisponible.',
      });
    }
  };

  const stop = () => {
    clearStopTimer();
    if (activeRecognition) {
      try {
        activeRecognition.stop();
      } catch {
        // ignore stop race
      }
      activeRecognition = null;
    }
    if (activeRecorder && activeRecorder.state === 'recording') {
      try {
        activeRecorder.stop();
      } catch {
        cleanupStream();
      }
      return;
    }
    cleanupStream();
    options.onStatusChange?.('idle');
  };

  const start = async () => {
    settled = false;
    if (!SpeechCtor) {
      await startGeminiFallback();
      return;
    }

    try {
      const recognition = new SpeechCtor();
      activeRecognition = recognition;
      recognition.lang = 'ja-JP';
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;

      recognition.onresult = (event) => {
        if (settled) return;
        settled = true;
        clearStopTimer();
        activeRecognition = null;
        const transcript = event.results?.[0]?.[0]?.transcript?.trim() || '';
        options.onStatusChange?.('idle');
        if (!transcript) {
          options.onResult({
            ok: false,
            transcript: '',
            engine: 'browser',
            errorFr: 'Aucune parole japonaise reconnue. Réessayez plus distinctement.',
          });
          return;
        }
        options.onResult({
          ok: true,
          transcript,
          engine: 'browser',
        });
      };

      recognition.onerror = (event) => {
        if (settled) return;
        const code = event?.error || '';
        clearStopTimer();
        activeRecognition = null;

        if ((code === 'service-not-allowed' || code === 'network') && isMediaRecorderSupported()) {
          settled = true;
          void startGeminiFallback();
          return;
        }

        settled = true;
        options.onStatusChange?.('idle');
        options.onResult({
          ok: false,
          transcript: '',
          engine: 'browser',
          errorFr:
            code === 'not-allowed'
              ? 'Permission micro refusée par le navigateur.'
              : 'Reconnaissance vocale interrompue. Réessayez ou utilisez le fallback IA.',
        });
      };

      recognition.onend = () => {
        if (!settled) {
          settled = true;
          clearStopTimer();
          activeRecognition = null;
          options.onStatusChange?.('idle');
          options.onResult({
            ok: false,
            transcript: '',
            engine: 'browser',
            errorFr: 'Fin d’écoute sans transcription.',
          });
        }
      };

      options.onStatusChange?.('listening');
      recognition.start();
      stopTimer = setTimeout(() => {
        if (activeRecognition) {
          try {
            activeRecognition.stop();
          } catch {
            // ignore
          }
        }
      }, maxDurationMs);
    } catch {
      await startGeminiFallback();
    }
  };

  return {
    start,
    stop,
    engine: initialEngine,
  };
}
