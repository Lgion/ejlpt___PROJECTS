import { describe, expect, it } from 'vitest';
import { computeNextSM2, recordErrorToSRS, gradeSRSCard, getDueSRSCards } from '@/lib/srs';
import { localDb } from '@/lib/db';

describe('SM-2 SRS engine', () => {
  it('computes initial intervals and resets on quality < 3', () => {
    const baseCard = {
      easeFactor: 2.5,
      intervalDays: 0,
      repetitions: 0,
      lapses: 0,
      errorCount: 0,
    };

    const first = computeNextSM2(baseCard, 3);
    expect(first.repetitions).toBe(1);
    expect(first.intervalDays).toBe(1);

    const second = computeNextSM2(first, 5);
    expect(second.repetitions).toBe(2);
    expect(second.intervalDays).toBe(6);

    const third = computeNextSM2(second, 5);
    expect(third.repetitions).toBe(3);
    expect(third.intervalDays).toBeGreaterThan(6);

    const lapsed = computeNextSM2(third, 0);
    expect(lapsed.repetitions).toBe(0);
    expect(lapsed.intervalDays).toBe(0);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.errorCount).toBe(1);
    expect(lapsed.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('records missed items into IndexedDB and schedules immediate due review', async () => {
    await recordErrorToSRS({
      cardId: 'kanji:語',
      itemType: 'KANJI',
      itemKey: '語',
      level: 'N5',
      prompt: 'Quelle est la lecture de 「語」 ?',
      reading: 'ゴ / かた.る',
      answer: 'mot, langue',
    });

    const stored = await localDb.srsCards.get('kanji:語');
    expect(stored).toBeDefined();
    expect(stored?.errorCount).toBe(1);

    // Record another error
    await recordErrorToSRS({
      cardId: 'kanji:語',
      itemType: 'KANJI',
      itemKey: '語',
      level: 'N5',
      prompt: 'Quelle est la lecture de 「語」 ?',
      answer: 'mot, langue',
    });
    const updated = await localDb.srsCards.get('kanji:語');
    expect(updated?.errorCount).toBe(2);
    expect(updated?.lapses).toBe(2);

    const due = await getDueSRSCards(10);
    expect(due.map((c) => c.cardId)).toContain('kanji:語');

    const graded = await gradeSRSCard('kanji:語', 5);
    expect(graded?.repetitions).toBe(1);
    expect(graded?.intervalDays).toBe(1);
  });
});
