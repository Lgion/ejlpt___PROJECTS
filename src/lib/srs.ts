import { localDb, SRSCardRecord } from '@/lib/db';

export type SRSQuality = 0 | 2 | 3 | 5; // Again (0), Hard (2), Good (3), Easy (5)

/**
 * Compute next SM-2 interval & ease factor for a spaced-repetition card.
 */
export function computeNextSM2(
  card: Pick<SRSCardRecord, 'easeFactor' | 'intervalDays' | 'repetitions' | 'lapses' | 'errorCount'>,
  quality: SRSQuality,
  now = new Date()
): Pick<SRSCardRecord, 'easeFactor' | 'intervalDays' | 'repetitions' | 'lapses' | 'errorCount' | 'dueAt' | 'lastReviewedAt'> {
  let { easeFactor, intervalDays, repetitions, lapses, errorCount } = card;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = quality === 0 ? 0 : 1;
    lapses += 1;
    if (quality === 0) errorCount += 1;
  } else {
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetitions += 1;
  }

  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  easeFactor = Math.max(1.3, Number((easeFactor + delta).toFixed(2)));

  const dueDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  return {
    easeFactor,
    intervalDays,
    repetitions,
    lapses,
    errorCount,
    dueAt: dueDate.toISOString(),
    lastReviewedAt: now.toISOString(),
  };
}

export async function gradeSRSCard(cardId: string, quality: SRSQuality): Promise<SRSCardRecord | null> {
  const existing = await localDb.srsCards.get(cardId);
  if (!existing) return null;

  const updatedFields = computeNextSM2(existing, quality);
  const updated: SRSCardRecord = { ...existing, ...updatedFields };
  await localDb.srsCards.put(updated);
  return updated;
}

export async function recordErrorToSRS(input: {
  cardId: string;
  itemType: SRSCardRecord['itemType'];
  itemKey: string;
  level: string;
  prompt: string;
  reading?: string;
  answer: string;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  const existing = await localDb.srsCards.get(input.cardId);

  if (existing) {
    await localDb.srsCards.put({
      ...existing,
      prompt: input.prompt,
      reading: input.reading ?? existing.reading,
      answer: input.answer,
      repetitions: 0,
      intervalDays: 0,
      lapses: existing.lapses + 1,
      errorCount: existing.errorCount + 1,
      dueAt: nowIso,
      lastReviewedAt: nowIso,
    });
    return;
  }

  await localDb.srsCards.put({
    cardId: input.cardId,
    itemType: input.itemType,
    itemKey: input.itemKey,
    level: input.level,
    prompt: input.prompt,
    reading: input.reading,
    answer: input.answer,
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    lapses: 1,
    errorCount: 1,
    dueAt: nowIso,
    lastReviewedAt: nowIso,
  });
}

export async function getDueSRSCards(limit = 20): Promise<SRSCardRecord[]> {
  const nowIso = new Date().toISOString();
  return localDb.srsCards.where('dueAt').belowOrEqual(nowIso).limit(limit).toArray();
}

