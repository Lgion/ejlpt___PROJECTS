import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import { localDb } from '@/lib/db';

beforeEach(async () => {
  await Promise.all([
    localDb.kanjis.clear(),
    localDb.grammar.clear(),
    localDb.slang.clear(),
    localDb.onomatopoeia.clear(),
    localDb.jukugo.clear(),
    localDb.meta.clear(),
    localDb.attempts.clear(),
    localDb.bookmarks.clear(),
    localDb.syncQueue.clear(),
    localDb.srsCards.clear(),
  ]);
});

