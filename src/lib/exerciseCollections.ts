import { moderateUserText, sanitizeTextInput } from './ai/moderation';

export type ExerciseCollectionSource = 'official' | 'ai_generated' | 'community';

export type ExerciseDrillMode =
  | 'polite_transform'
  | 'particles'
  | 'sentence_builder'
  | 'error_correction'
  | 'ukemikei'
  | 'conditional_imperative'
  | 'polite_to_casual'
  | 'double_particles'
  | 'yomikata_z'
  | 'quiz_custom';

export type CollectionJLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'N0';

export interface CollectionExerciseItem {
  id: string;
  fingerprint: string;
  source: ExerciseCollectionSource;
  mode: ExerciseDrillMode;
  level: CollectionJLPTLevel;
  prompt: string;
  targetWord?: string;
  reading?: string;
  expectedAnswers: string[];
  options?: Array<{ id: string; text: string }>;
  correctOptionId?: string;
  explanation: string;
  tags?: string[];
  status: 'active' | 'hidden';
  authorType?: 'system' | 'ai' | 'member' | 'anonymous';
  createdByUserId?: string;
  createdAt: string;
}

export const VALID_SOURCES = new Set<ExerciseCollectionSource>([
  'official',
  'ai_generated',
  'community',
]);

export const VALID_MODES = new Set<ExerciseDrillMode>([
  'polite_transform',
  'particles',
  'sentence_builder',
  'error_correction',
  'ukemikei',
  'conditional_imperative',
  'polite_to_casual',
  'double_particles',
  'yomikata_z',
  'quiz_custom',
]);

export const VALID_LEVELS = new Set<CollectionJLPTLevel>([
  'N5',
  'N4',
  'N3',
  'N2',
  'N1',
  'N0',
]);

const SOURCE_PRIORITY: Record<ExerciseCollectionSource, number> = {
  official: 0,
  ai_generated: 1,
  community: 2,
};

function defaultShuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

/**
 * Deterministic FNV-1a 32-bit hash usable in both browser and Node runtimes.
 */
export function computeExerciseFingerprint(input: {
  mode: string;
  level: string;
  prompt: string;
  expectedAnswers: string[];
}): string {
  const normalizedAnswers = input.expectedAnswers
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('|');
  const canonical = `${input.mode.trim().toLowerCase()}::${input.level.trim().toUpperCase()}::${input.prompt.trim().toLowerCase()}::${normalizedAnswers}`;

  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i += 1) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `ex_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function mergeExerciseCollections(params: {
  pools: Partial<Record<ExerciseCollectionSource, CollectionExerciseItem[]>>;
  enabledSources: ExerciseCollectionSource[];
  level?: string;
  mode?: ExerciseDrillMode;
  limit?: number;
  shuffleFn?: <T>(arr: T[]) => T[];
}): CollectionExerciseItem[] {
  const orderedSources = [...new Set(params.enabledSources)].sort(
    (a, b) => SOURCE_PRIORITY[a] - SOURCE_PRIORITY[b]
  );

  const seenFingerprints = new Set<string>();
  const collected: CollectionExerciseItem[] = [];

  for (const src of orderedSources) {
    const pool = params.pools[src] || [];
    for (const item of pool) {
      if (item.status !== 'active') continue;
      if (params.mode && item.mode !== params.mode) continue;
      if (params.level && params.level !== 'ALL' && item.level !== params.level) continue;

      const fp =
        item.fingerprint ||
        computeExerciseFingerprint({
          mode: item.mode,
          level: item.level,
          prompt: item.prompt,
          expectedAnswers: item.expectedAnswers,
        });

      if (seenFingerprints.has(fp)) continue;
      seenFingerprints.add(fp);
      collected.push({ ...item, fingerprint: fp });
    }
  }

  const shuffler = params.shuffleFn ?? defaultShuffle;
  const shuffled = shuffler(collected);
  return typeof params.limit === 'number' && params.limit > 0
    ? shuffled.slice(0, params.limit)
    : shuffled;
}

export type ValidatedSubmissionItem = Omit<
  CollectionExerciseItem,
  'id' | 'fingerprint' | 'status' | 'createdAt'
>;

export function validateCollectionSubmission(
  body: unknown
): { ok: true; item: ValidatedSubmissionItem } | { ok: false; errorFr: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, errorFr: 'Corps de requête invalide.' };
  }

  const raw = body as Record<string, unknown>;
  const source = raw.source;
  const mode = raw.mode;
  const level = raw.level;

  if (typeof source !== 'string' || !VALID_SOURCES.has(source as ExerciseCollectionSource)) {
    return { ok: false, errorFr: 'Source de collection invalide.' };
  }
  if (source === 'official') {
    return {
      ok: false,
      errorFr: 'La collection officielle Socle est en lecture seule.',
    };
  }
  if (typeof mode !== 'string' || !VALID_MODES.has(mode as ExerciseDrillMode)) {
    return { ok: false, errorFr: 'Mode d’exercice invalide.' };
  }
  if (typeof level !== 'string' || !VALID_LEVELS.has(level as CollectionJLPTLevel)) {
    return { ok: false, errorFr: 'Niveau JLPT invalide.' };
  }

  if (source === 'community' && raw.consentPublic !== true) {
    return {
      ok: false,
      errorFr: 'Le consentement explicite de partage communautaire est requis.',
    };
  }

  if (typeof raw.prompt !== 'string') {
    return { ok: false, errorFr: 'L’énoncé de l’exercice est requis.' };
  }
  const promptMod = moderateUserText(raw.prompt, { minLength: 3, maxLength: 600 });
  if (!promptMod.allowed) {
    return { ok: false, errorFr: promptMod.reasonFr || 'Énoncé refusé par la modération.' };
  }

  const rawAnswers = Array.isArray(raw.expectedAnswers)
    ? raw.expectedAnswers.filter((a): a is string => typeof a === 'string')
    : [];
  if (rawAnswers.length === 0) {
    return { ok: false, errorFr: 'Au moins une réponse attendue est requise.' };
  }

  const cleanAnswers: string[] = [];
  for (const ans of rawAnswers.slice(0, 6)) {
    const ansMod = moderateUserText(ans, { minLength: 1, maxLength: 300 });
    if (!ansMod.allowed) {
      return {
        ok: false,
        errorFr: ansMod.reasonFr || 'Réponse attendue refusée par la modération.',
      };
    }
    cleanAnswers.push(ansMod.sanitizedText);
  }

  const rawExplanation = typeof raw.explanation === 'string' ? raw.explanation : '';
  const expMod = moderateUserText(rawExplanation, { minLength: 3, maxLength: 1000 });
  if (!expMod.allowed) {
    return { ok: false, errorFr: expMod.reasonFr || 'Explication refusée par la modération.' };
  }

  let cleanOptions: Array<{ id: string; text: string }> | undefined;
  let cleanCorrectOptionId: string | undefined;
  if (Array.isArray(raw.options) && raw.options.length > 0) {
    cleanOptions = [];
    for (const opt of raw.options.slice(0, 6)) {
      if (!opt || typeof opt !== 'object') continue;
      const optObj = opt as Record<string, unknown>;
      if (typeof optObj.id !== 'string' || typeof optObj.text !== 'string') continue;
      const optMod = moderateUserText(optObj.text, { minLength: 1, maxLength: 200 });
      if (!optMod.allowed) {
        return { ok: false, errorFr: optMod.reasonFr || 'Option QCM refusée par la modération.' };
      }
      cleanOptions.push({ id: sanitizeTextInput(optObj.id), text: optMod.sanitizedText });
    }
    if (typeof raw.correctOptionId === 'string' && raw.correctOptionId.trim()) {
      cleanCorrectOptionId = raw.correctOptionId.trim();
    }
  }

  const tags = Array.isArray(raw.tags)
    ? raw.tags
        .filter((t): t is string => typeof t === 'string')
        .map((t) => sanitizeTextInput(t))
        .filter(Boolean)
        .slice(0, 8)
    : undefined;

  return {
    ok: true,
    item: {
      source: source as ExerciseCollectionSource,
      mode: mode as ExerciseDrillMode,
      level: level as CollectionJLPTLevel,
      prompt: promptMod.sanitizedText,
      targetWord:
        typeof raw.targetWord === 'string' && raw.targetWord.trim()
          ? sanitizeTextInput(raw.targetWord)
          : undefined,
      reading:
        typeof raw.reading === 'string' && raw.reading.trim()
          ? sanitizeTextInput(raw.reading)
          : undefined,
      expectedAnswers: cleanAnswers,
      options: cleanOptions && cleanOptions.length > 0 ? cleanOptions : undefined,
      correctOptionId: cleanCorrectOptionId,
      explanation: expMod.sanitizedText,
      tags,
    },
  };
}
