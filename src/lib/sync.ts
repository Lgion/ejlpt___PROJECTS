import { localDb, LocalSyncItem } from '@/lib/db';

let activeFlushPromise: Promise<{ synced: number; remaining: number }> | null = null;

/**
 * Enqueue an offline-first mutation into Dexie `syncQueue` and flush immediately if online.
 */
export async function enqueueSyncAction(
  action: LocalSyncItem['action'],
  payload: Record<string, unknown>,
  isSignedIn = true
): Promise<void> {
  await localDb.syncQueue.add({
    action,
    payload,
    createdAt: new Date().toISOString(),
  });

  if (typeof window !== 'undefined' && navigator.onLine && isSignedIn) {
    await flushSyncQueue(isSignedIn);
  }
}

async function processQueueItem(item: LocalSyncItem): Promise<'done' | 'retry' | 'unauth'> {
  if (item.action === 'SAVE_ATTEMPT') {
    const res = await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.payload),
    });
    if (res.status === 401) return 'unauth';
    if (!res.ok) return 'retry';

    const attemptId = typeof item.payload.attemptId === 'string' ? item.payload.attemptId : '';
    if (attemptId) {
      await localDb.attempts.where('attemptId').equals(attemptId).modify({ isSynced: 1 });
    }
    return 'done';
  }

  if (item.action === 'SAVE_BOOKMARK') {
    const res = await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.payload),
    });
    if (res.status === 401) return 'unauth';
    if (!res.ok) return 'retry';

    const bookmarkId = typeof item.payload.bookmarkId === 'string' ? item.payload.bookmarkId : '';
    if (bookmarkId) {
      await localDb.bookmarks.where('bookmarkId').equals(bookmarkId).modify({ isSynced: 1 });
    }
    return 'done';
  }

  if (item.action === 'DELETE_BOOKMARK') {
    const bookmarkId = typeof item.payload.bookmarkId === 'string' ? item.payload.bookmarkId : '';
    if (!bookmarkId) return 'done';
    const res = await fetch(`/api/bookmarks?bookmarkId=${encodeURIComponent(bookmarkId)}`, {
      method: 'DELETE',
    });
    if (res.status === 401) return 'unauth';
    if (!res.ok) return 'retry';
    return 'done';
  }

  return 'done';
}

/**
 * Flush pending items from `localDb.syncQueue` + backfill any unsynced attempts/bookmarks.
 */
export async function flushSyncQueue(
  isSignedIn = true
): Promise<{ synced: number; remaining: number }> {
  if (typeof window === 'undefined' || !navigator.onLine || !isSignedIn) {
    const remaining = await localDb.syncQueue.count();
    return { synced: 0, remaining };
  }

  if (activeFlushPromise) {
    return activeFlushPromise;
  }

  activeFlushPromise = (async () => {
    let synced = 0;

    try {
      // Backfill any unqueued local records (e.g. created while offline before queue hooks)
      const [unsyncedAttempts, unsyncedBookmarks, existingQueue] = await Promise.all([
        localDb.attempts.where('isSynced').equals(0).toArray(),
        localDb.bookmarks.where('isSynced').equals(0).toArray(),
        localDb.syncQueue.toArray(),
      ]);

      const queuedAttemptIds = new Set(
        existingQueue
          .filter((q) => q.action === 'SAVE_ATTEMPT' && typeof q.payload.attemptId === 'string')
          .map((q) => String(q.payload.attemptId))
      );
      const queuedBookmarkIds = new Set(
        existingQueue
          .filter((q) => q.action === 'SAVE_BOOKMARK' && typeof q.payload.bookmarkId === 'string')
          .map((q) => String(q.payload.bookmarkId))
      );

      for (const att of unsyncedAttempts) {
        if (!queuedAttemptIds.has(att.attemptId)) {
          await localDb.syncQueue.add({
            action: 'SAVE_ATTEMPT',
            payload: att as unknown as Record<string, unknown>,
            createdAt: att.createdAt,
          });
        }
      }

      for (const bm of unsyncedBookmarks) {
        if (!queuedBookmarkIds.has(bm.bookmarkId)) {
          await localDb.syncQueue.add({
            action: 'SAVE_BOOKMARK',
            payload: bm as unknown as Record<string, unknown>,
            createdAt: bm.createdAt,
          });
        }
      }

      const items = await localDb.syncQueue.orderBy('createdAt').toArray();
      for (const item of items) {
        try {
          const outcome = await processQueueItem(item);
          if (outcome === 'done') {
            if (typeof item.id === 'number') {
              await localDb.syncQueue.delete(item.id);
            }
            synced += 1;
          } else if (outcome === 'unauth') {
            break;
          }
        } catch (err) {
          console.error('[Sync] Error processing queue item:', err);
        }
      }

      const remaining = await localDb.syncQueue.count();
      return { synced, remaining };
    } finally {
      activeFlushPromise = null;
    }
  })();

  return activeFlushPromise;
}

