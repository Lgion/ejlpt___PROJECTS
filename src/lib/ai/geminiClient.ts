if (typeof window !== 'undefined') {
  throw new Error('geminiClient must run on the server');
}

export type AiAttemptPhase = 'retry' | 'fallback' | 'success' | 'failed';

export interface AiAttemptEvent {
  phase: AiAttemptPhase;
  attempt: number;
  messageFr: string;
}

export interface GeminiResult<T = string> {
  ok: boolean;
  data?: T;
  usedFallback: boolean;
  retriesCount: number;
  events: AiAttemptEvent[];
  userError?: string;
}

export interface GeminiCallOptions {
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: 'text/plain' | 'application/json';
  maxRetriesPerModel?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  apiKey?: string;
  models?: string[];
}

const DEFAULT_MODEL_CHAIN = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.1-pro-preview',
];

const TRANSIENT_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const AUTH_STATUS_CODES = new Set([401, 403]);

export function parseModelChain(raw?: string): string[] {
  const source = raw ?? process.env.GEMINI_MODEL ?? '';
  const parsed = source
    .split(/[\s,;]+/)
    .map((m) => m.trim())
    .filter(Boolean);

  const unique: string[] = [];
  for (const model of parsed) {
    if (!unique.includes(model)) {
      unique.push(model);
    }
  }

  return unique.length > 0 ? unique : [...DEFAULT_MODEL_CHAIN];
}

export function getAiConfigStatus(): { configured: boolean; fallbackChainLength: number } {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const chain = parseModelChain();
  return {
    configured: apiKey.length > 0,
    fallbackChainLength: chain.length,
  };
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type GeminiContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

interface GeminiApiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

function extractTextFromGeminiPayload(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const typed = payload as GeminiApiResponse;
  const parts = typed.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();
}

async function callGeminiWithParts(
  parts: GeminiContentPart[],
  options: GeminiCallOptions = {}
): Promise<GeminiResult<string>> {
  const apiKey = (options.apiKey ?? process.env.GEMINI_API_KEY ?? '').trim();
  const models = options.models && options.models.length > 0 ? options.models : parseModelChain();

  if (!apiKey) {
    return {
      ok: false,
      usedFallback: false,
      retriesCount: 0,
      events: [
        {
          phase: 'failed',
          attempt: 1,
          messageFr: 'Le service IA n’est pas configuré.',
        },
      ],
      userError: 'Le service IA est momentanément indisponible. Vous pouvez réessayer plus tard.',
    };
  }

  const fetchFn = options.fetchImpl ?? fetch;
  const maxRetriesPerModel = Math.max(0, options.maxRetriesPerModel ?? 2);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 400);
  const timeoutMs = Math.max(500, options.timeoutMs ?? 20000);

  const events: AiAttemptEvent[] = [];
  let retriesCount = 0;
  let totalAttempt = 0;
  let usedFallback = false;

  for (let modelIdx = 0; modelIdx < models.length; modelIdx += 1) {
    const model = models[modelIdx];
    if (modelIdx > 0) {
      usedFallback = true;
      events.push({
        phase: 'fallback',
        attempt: totalAttempt + 1,
        messageFr: 'Bascule sur un modèle de secours…',
      });
    }

    for (let retryIdx = 0; retryIdx <= maxRetriesPerModel; retryIdx += 1) {
      totalAttempt += 1;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

        const body: Record<string, unknown> = {
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: options.temperature ?? 0.4,
            maxOutputTokens: options.maxOutputTokens ?? 1500,
            ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
          },
        };

        if (options.systemInstruction && options.systemInstruction.trim()) {
          body.systemInstruction = {
            parts: [{ text: options.systemInstruction.trim() }],
          };
        }

        const res = await fetchFn(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (res.ok) {
          const json: unknown = await res.json();
          const text = extractTextFromGeminiPayload(json);
          if (text) {
            events.push({
              phase: 'success',
              attempt: totalAttempt,
              messageFr: usedFallback ? 'Modèle de secours activé.' : 'Réponse IA reçue.',
            });
            return {
              ok: true,
              data: text,
              usedFallback,
              retriesCount,
              events,
            };
          }

          // Empty output: treat as transient if retries remain
          if (retryIdx < maxRetriesPerModel) {
            retriesCount += 1;
            events.push({
              phase: 'retry',
              attempt: totalAttempt,
              messageFr: 'Serveur IA occupé, nouvel essai…',
            });
            await sleep(baseDelayMs * Math.pow(2, retryIdx));
            continue;
          }
          break;
        }

        if (AUTH_STATUS_CODES.has(res.status)) {
          events.push({
            phase: 'failed',
            attempt: totalAttempt,
            messageFr: 'Service IA indisponible.',
          });
          return {
            ok: false,
            usedFallback,
            retriesCount,
            events,
            userError: 'Service IA momentanément indisponible. Veuillez réessayer plus tard.',
          };
        }

        if (TRANSIENT_STATUS_CODES.has(res.status)) {
          if (retryIdx < maxRetriesPerModel) {
            retriesCount += 1;
            events.push({
              phase: 'retry',
              attempt: totalAttempt,
              messageFr: 'Serveur IA occupé, nouvel essai…',
            });
            await sleep(baseDelayMs * Math.pow(2, retryIdx));
            continue;
          }
          break;
        }

        // Non-transient status such as 404/400 (e.g. model unavailable): advance to next fallback model
        break;
      } catch {
        clearTimeout(timer);
        if (retryIdx < maxRetriesPerModel) {
          retriesCount += 1;
          events.push({
            phase: 'retry',
            attempt: totalAttempt,
            messageFr: 'Serveur IA occupé, nouvel essai…',
          });
          await sleep(baseDelayMs * Math.pow(2, retryIdx));
          continue;
        }
        break;
      }
    }
  }

  events.push({
    phase: 'failed',
    attempt: totalAttempt,
    messageFr: 'Le service IA est temporairement saturé.',
  });

  return {
    ok: false,
    usedFallback,
    retriesCount,
    events,
    userError: 'Le service IA est momentanément indisponible. Vous pouvez réessayer dans un instant.',
  };
}

export async function generateGeminiText(
  prompt: string,
  options: GeminiCallOptions = {}
): Promise<GeminiResult<string>> {
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) {
    return {
      ok: false,
      usedFallback: false,
      retriesCount: 0,
      events: [{ phase: 'failed', attempt: 0, messageFr: 'Requête vide.' }],
      userError: 'Veuillez saisir un message avant de lancer la requête.',
    };
  }
  return callGeminiWithParts([{ text: cleanPrompt }], options);
}

function stripJsonCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}

export async function generateGeminiJson<T>(
  prompt: string,
  options: GeminiCallOptions = {}
): Promise<GeminiResult<T>> {
  const res = await generateGeminiText(prompt, {
    ...options,
    responseMimeType: 'application/json',
  });

  if (!res.ok || !res.data) {
    return {
      ok: false,
      usedFallback: res.usedFallback,
      retriesCount: res.retriesCount,
      events: res.events,
      userError: res.userError,
    };
  }

  try {
    const cleaned = stripJsonCodeFences(res.data);
    const parsed = JSON.parse(cleaned) as T;
    return {
      ok: true,
      data: parsed,
      usedFallback: res.usedFallback,
      retriesCount: res.retriesCount,
      events: res.events,
    };
  } catch {
    return {
      ok: false,
      usedFallback: res.usedFallback,
      retriesCount: res.retriesCount,
      events: [
        ...res.events,
        {
          phase: 'failed',
          attempt: res.events.length,
          messageFr: 'Réponse IA illisible, veuillez réessayer.',
        },
      ],
      userError: 'La réponse structurée de l’IA n’a pas pu être interprétée. Veuillez réessayer.',
    };
  }
}

export async function transcribeJapaneseAudio(
  input: { base64Audio: string; mimeType: string; expectedHint?: string },
  options: GeminiCallOptions = {}
): Promise<GeminiResult<string>> {
  const cleanAudio = input.base64Audio.trim();
  if (!cleanAudio) {
    return {
      ok: false,
      usedFallback: false,
      retriesCount: 0,
      events: [{ phase: 'failed', attempt: 0, messageFr: 'Audio vide.' }],
      userError: 'Aucun signal audio détecté.',
    };
  }

  const instructionParts = [
    'Transcris exactement ce qui est prononcé en japonais dans cet enregistrement audio.',
    'Retourne uniquement la transcription japonaise brute (kana/kanji), sans explication ni ponctuation superflue.',
  ];
  if (input.expectedHint) {
    instructionParts.push(`Contexte attendu (indice) : ${input.expectedHint}`);
  }

  return callGeminiWithParts(
    [
      { text: instructionParts.join(' ') },
      {
        inlineData: {
          mimeType: input.mimeType || 'audio/webm',
          data: cleanAudio,
        },
      },
    ],
    {
      ...options,
      temperature: options.temperature ?? 0.1,
      maxOutputTokens: options.maxOutputTokens ?? 200,
    }
  );
}
