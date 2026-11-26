import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { createDefaultRoadmapState } from '@/lib/roadmapSeed';
import {
  applyDeleteCategory,
  applyDeleteTask,
  applySyncOpsToState,
  applyUpsertCategory,
  applyUpsertTask,
  readRoadmapState,
  writeRoadmapState,
} from '@/lib/roadmapStore';
import { DELETE, GET, OPTIONS, PATCH, POST, PUT } from '@/app/api/roadmap/route';

describe('roadmapStore & /api/roadmap', () => {
  const tempDirs: string[] = [];

  function makeTempRoadmapFile() {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'ejlpt-roadmap-'));
    tempDirs.push(dir);
    return path.join(dir, 'roadmap-tasks.json');
  }

  afterEach(() => {
    delete process.env.EJLPT_ROADMAP_FILE;
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('seeds default README roadmap state with valid percentages and categories', async () => {
    const file = makeTempRoadmapFile();
    const state = await readRoadmapState(file);
    expect(state.categories.length).toBeGreaterThanOrEqual(7);
    expect(state.tasks.length).toBeGreaterThanOrEqual(30);
    expect(state.tasks.every((t) => t.progress >= 0 && t.progress <= 100)).toBe(true);
  });

  it('supports full CRUD and offline sync_ops replay on disk', async () => {
    const file = makeTempRoadmapFile();
    let state = createDefaultRoadmapState();

    state = applyUpsertCategory(state, { id: 'cat-custom', name: 'Nouvelle Catégorie' });
    state = applyUpsertTask(state, {
      id: 'task-custom-1',
      categoryId: 'cat-custom',
      title: 'Ajouter module Ukemikei',
      progress: 40,
      priority: 'high',
    });

    const added = state.tasks.find((t) => t.id === 'task-custom-1');
    expect(added).toBeDefined();
    expect(added?.status).toBe('in_progress');

    state = applyUpsertTask(state, { id: 'task-custom-1', progress: 100 });
    expect(state.tasks.find((t) => t.id === 'task-custom-1')?.status).toBe('done');

    const { state: synced, appliedCount } = applySyncOpsToState(state, [
      {
        opId: 'op-1',
        type: 'upsert_task',
        payload: { id: 'task-custom-2', categoryId: 'cat-custom', title: 'Offline task', progress: 0 },
        ts: '2026-11-26T09:00:00.000Z',
      },
      {
        opId: 'op-2',
        type: 'delete_task',
        payload: { id: 'task-custom-1' },
        ts: '2026-11-26T09:01:00.000Z',
      },
    ]);

    expect(appliedCount).toBe(2);
    expect(synced.tasks.some((t) => t.id === 'task-custom-1')).toBe(false);
    expect(synced.tasks.some((t) => t.id === 'task-custom-2')).toBe(true);

    const saved = await writeRoadmapState(synced, file);
    const reloaded = await readRoadmapState(file);
    expect(reloaded.tasks.length).toBe(saved.tasks.length);

    const afterCatDelete = applyDeleteCategory(reloaded, 'cat-custom');
    expect(afterCatDelete.categories.some((c) => c.id === 'cat-custom')).toBe(false);
    expect(afterCatDelete.tasks.some((t) => t.id === 'task-custom-2')).toBe(false);

    const afterTaskDelete = applyDeleteTask(afterCatDelete, afterCatDelete.tasks[0].id);
    expect(afterTaskDelete.tasks.length).toBe(afterCatDelete.tasks.length - 1);
  });

  it('serves CORS headers and CRUD HTTP endpoints via /api/roadmap', async () => {
    const file = makeTempRoadmapFile();
    process.env.EJLPT_ROADMAP_FILE = file;

    const optRes = await OPTIONS();
    expect(optRes.status).toBe(204);
    expect(optRes.headers.get('Access-Control-Allow-Origin')).toBe('*');

    const pingRes = await GET(new NextRequest('http://localhost:3000/api/roadmap?ping=1'));
    const pingJson = await pingRes.json();
    expect(pingRes.status).toBe(200);
    expect(pingJson.ok).toBe(true);
    expect(pingJson.pong).toBe(true);
    expect(pingRes.headers.get('Access-Control-Allow-Origin')).toBe('*');

    const postRes = await POST(
      new Request('http://localhost:3000/api/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_task',
          task: {
            id: 'http-task-1',
            categoryId: 'cat-grammar-drills',
            title: 'Tester API CRUD',
            progress: 50,
            priority: 'high',
          },
        }),
      })
    );
    expect(postRes.status).toBe(201);
    const postJson = await postRes.json();
    expect(postJson.state.tasks.some((t: { id: string }) => t.id === 'http-task-1')).toBe(true);

    const patchRes = await PATCH(
      new Request('http://localhost:3000/api/roadmap', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'task', id: 'http-task-1', patch: { progress: 100 } }),
      })
    );
    const patchJson = await patchRes.json();
    expect(patchRes.status).toBe(200);
    expect(
      patchJson.state.tasks.find((t: { id: string }) => t.id === 'http-task-1')?.status
    ).toBe('done');

    const delRes = await DELETE(
      new NextRequest('http://localhost:3000/api/roadmap?kind=task&id=http-task-1', {
        method: 'DELETE',
      })
    );
    const delJson = await delRes.json();
    expect(delRes.status).toBe(200);
    expect(delJson.state.tasks.some((t: { id: string }) => t.id === 'http-task-1')).toBe(false);

    const putRes = await PUT(
      new Request('http://localhost:3000/api/roadmap', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: [{ id: 'cat-1', name: 'Unique', order: 1 }],
          tasks: [{ id: 't-1', categoryId: 'cat-1', title: 'Imported', progress: 80 }],
        }),
      })
    );
    const putJson = await putRes.json();
    expect(putRes.status).toBe(200);
    expect(putJson.state.tasks).toHaveLength(1);
    expect(putJson.state.tasks[0].status).toBe('in_progress');
  });
});
