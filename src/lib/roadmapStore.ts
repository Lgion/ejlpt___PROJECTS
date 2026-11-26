import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  createDefaultRoadmapState,
  type RoadmapCategory,
  type RoadmapState,
  type RoadmapSyncOp,
  type RoadmapTask,
  type TaskPriority,
  type TaskStatus,
} from './roadmapSeed';

const VALID_PRIORITIES = new Set<TaskPriority>(['high', 'medium', 'low']);
const VALID_STATUSES = new Set<TaskStatus>(['todo', 'in_progress', 'done']);

let writeChain: Promise<void> = Promise.resolve();
let memoryFallbackState: RoadmapState | null = null;

export function getDefaultRoadmapFilePath(): string {
  return process.env.EJLPT_ROADMAP_FILE
    ? path.resolve(process.env.EJLPT_ROADMAP_FILE)
    : path.join(process.cwd(), '_docs', 'roadmap-tasks.json');
}

export function clampProgress(value: unknown, fallback = 0): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

export function deriveStatus(progress: number, explicit?: unknown): TaskStatus {
  if (typeof explicit === 'string' && VALID_STATUSES.has(explicit as TaskStatus)) {
    // Keep explicit status aligned at strict boundaries when user sets 100 or 0
    if (progress === 100) return 'done';
    if (progress === 0 && explicit === 'done') return 'todo';
    return explicit as TaskStatus;
  }
  if (progress >= 100) return 'done';
  if (progress > 0) return 'in_progress';
  return 'todo';
}

export function normalizeCategory(
  raw: Partial<RoadmapCategory>,
  fallbackOrder = 1
): RoadmapCategory | null {
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;
  const id =
    typeof raw.id === 'string' && raw.id.trim().length > 0
      ? raw.id.trim()
      : `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const order =
    typeof raw.order === 'number' && Number.isFinite(raw.order) ? raw.order : fallbackOrder;
  return {
    id,
    name,
    description: typeof raw.description === 'string' ? raw.description.trim() : '',
    order,
  };
}

export function normalizeTask(
  raw: Partial<RoadmapTask>,
  validCategoryIds: Set<string>,
  fallbackCategoryId: string,
  nowIso = new Date().toISOString()
): RoadmapTask | null {
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!title) return null;

  const progress = clampProgress(raw.progress, 0);
  const status = deriveStatus(progress, raw.status);
  const priority: TaskPriority =
    typeof raw.priority === 'string' && VALID_PRIORITIES.has(raw.priority as TaskPriority)
      ? (raw.priority as TaskPriority)
      : 'medium';

  const categoryId =
    typeof raw.categoryId === 'string' && validCategoryIds.has(raw.categoryId.trim())
      ? raw.categoryId.trim()
      : fallbackCategoryId;

  const id =
    typeof raw.id === 'string' && raw.id.trim().length > 0
      ? raw.id.trim()
      : `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  return {
    id,
    categoryId,
    title,
    progress,
    status,
    priority,
    ref: typeof raw.ref === 'string' ? raw.ref.trim() : '',
    notes: typeof raw.notes === 'string' ? raw.notes.trim() : '',
    createdAt: typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : nowIso,
    updatedAt: typeof raw.updatedAt === 'string' && raw.updatedAt ? raw.updatedAt : nowIso,
  };
}

export function normalizeRoadmapState(input: unknown): RoadmapState {
  if (!input || typeof input !== 'object') {
    return createDefaultRoadmapState();
  }
  const raw = input as Partial<RoadmapState>;
  const nowIso = new Date().toISOString();

  const rawCategories = Array.isArray(raw.categories) ? raw.categories : [];
  const categories: RoadmapCategory[] = [];
  const seenCatIds = new Set<string>();

  rawCategories.forEach((c, idx) => {
    if (!c || typeof c !== 'object') return;
    const normalized = normalizeCategory(c, idx + 1);
    if (normalized && !seenCatIds.has(normalized.id)) {
      seenCatIds.add(normalized.id);
      categories.push(normalized);
    }
  });

  if (categories.length === 0) {
    categories.push({
      id: 'cat-general',
      name: 'Général',
      description: 'Tâches générales',
      order: 1,
    });
    seenCatIds.add('cat-general');
  }

  categories.sort((a, b) => a.order - b.order);
  const fallbackCategoryId = categories[0].id;

  const rawTasks = Array.isArray(raw.tasks) ? raw.tasks : [];
  const tasks: RoadmapTask[] = [];
  const seenTaskIds = new Set<string>();

  rawTasks.forEach((t) => {
    if (!t || typeof t !== 'object') return;
    const normalized = normalizeTask(t, seenCatIds, fallbackCategoryId, nowIso);
    if (normalized && !seenTaskIds.has(normalized.id)) {
      seenTaskIds.add(normalized.id);
      tasks.push(normalized);
    }
  });

  return {
    version: typeof raw.version === 'number' ? raw.version : 1,
    updatedAt: typeof raw.updatedAt === 'string' && raw.updatedAt ? raw.updatedAt : nowIso,
    categories,
    tasks,
  };
}

export async function readRoadmapState(filePath = getDefaultRoadmapFilePath()): Promise<RoadmapState> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    const normalized = normalizeRoadmapState(parsed);
    memoryFallbackState = normalized;
    return normalized;
  } catch {
    const fallback = memoryFallbackState ?? createDefaultRoadmapState();
    await writeRoadmapState(fallback, filePath).catch(() => {
      memoryFallbackState = fallback;
    });
    return fallback;
  }
}

export async function writeRoadmapState(
  state: RoadmapState,
  filePath = getDefaultRoadmapFilePath()
): Promise<RoadmapState> {
  const normalized: RoadmapState = {
    ...normalizeRoadmapState(state),
    updatedAt: new Date().toISOString(),
  };

  memoryFallbackState = normalized;

  writeChain = writeChain.then(async () => {
    try {
      await mkdir(path.dirname(filePath), { recursive: true });
      const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(tmpPath, JSON.stringify(normalized, null, 2) + '\n', 'utf8');
      await rename(tmpPath, filePath);
    } catch (err) {
      // On read-only hosts, preserve in-memory state instead of failing hard
      console.warn('[roadmapStore] Disk persistence skipped:', err);
    }
  });

  await writeChain;
  return normalized;
}

export function applyUpsertTask(
  state: RoadmapState,
  payload: Partial<RoadmapTask>,
  nowIso = new Date().toISOString()
): RoadmapState {
  const catIds = new Set(state.categories.map((c) => c.id));
  const fallbackCat = state.categories[0]?.id || 'cat-general';
  const existingIdx = payload.id ? state.tasks.findIndex((t) => t.id === payload.id) : -1;
  const existing = existingIdx >= 0 ? state.tasks[existingIdx] : undefined;

  const merged: Partial<RoadmapTask> = existing
    ? {
        ...existing,
        ...payload,
        createdAt: existing.createdAt,
        updatedAt: nowIso,
      }
    : {
        ...payload,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

  const normalized = normalizeTask(merged, catIds, fallbackCat, nowIso);
  if (!normalized) {
    throw new Error('Titre de tâche requis.');
  }

  const nextTasks = [...state.tasks];
  if (existingIdx >= 0) {
    nextTasks[existingIdx] = normalized;
  } else {
    nextTasks.unshift(normalized);
  }

  return {
    ...state,
    updatedAt: nowIso,
    tasks: nextTasks,
  };
}

export function applyDeleteTask(
  state: RoadmapState,
  taskId: string,
  nowIso = new Date().toISOString()
): RoadmapState {
  const filtered = state.tasks.filter((t) => t.id !== taskId);
  return {
    ...state,
    updatedAt: nowIso,
    tasks: filtered,
  };
}

export function applyUpsertCategory(
  state: RoadmapState,
  payload: Partial<RoadmapCategory>,
  nowIso = new Date().toISOString()
): RoadmapState {
  const existingIdx = payload.id ? state.categories.findIndex((c) => c.id === payload.id) : -1;
  const existing = existingIdx >= 0 ? state.categories[existingIdx] : undefined;
  const maxOrder = state.categories.reduce((max, c) => Math.max(max, c.order), 0);

  const normalized = normalizeCategory(
    existing ? { ...existing, ...payload } : { ...payload, order: payload.order ?? maxOrder + 1 },
    maxOrder + 1
  );
  if (!normalized) {
    throw new Error('Nom de catégorie requis.');
  }

  const nextCategories = [...state.categories];
  if (existingIdx >= 0) {
    nextCategories[existingIdx] = normalized;
  } else {
    nextCategories.push(normalized);
  }
  nextCategories.sort((a, b) => a.order - b.order);

  return {
    ...state,
    updatedAt: nowIso,
    categories: nextCategories,
  };
}

export function applyDeleteCategory(
  state: RoadmapState,
  categoryId: string,
  nowIso = new Date().toISOString()
): RoadmapState {
  const nextCategories = state.categories.filter((c) => c.id !== categoryId);
  const nextTasks = state.tasks.filter((t) => t.categoryId !== categoryId);
  return normalizeRoadmapState({
    ...state,
    updatedAt: nowIso,
    categories: nextCategories,
    tasks: nextTasks,
  });
}

export function applySyncOpsToState(
  initialState: RoadmapState,
  ops: RoadmapSyncOp[]
): { state: RoadmapState; appliedCount: number } {
  let current = normalizeRoadmapState(initialState);
  let appliedCount = 0;

  for (const op of ops) {
    if (!op || typeof op !== 'object') continue;
    const ts = typeof op.ts === 'string' && op.ts ? op.ts : new Date().toISOString();
    if (op.type === 'replace_all' && op.payload) {
      current = normalizeRoadmapState({
        version: current.version,
        updatedAt: ts,
        categories: op.payload.categories,
        tasks: op.payload.tasks,
      });
      appliedCount++;
    } else if (op.type === 'upsert_category' && op.payload) {
      current = applyUpsertCategory(current, op.payload, ts);
      appliedCount++;
    } else if (op.type === 'delete_category' && op.payload?.id) {
      current = applyDeleteCategory(current, op.payload.id, ts);
      appliedCount++;
    } else if (op.type === 'upsert_task' && op.payload) {
      current = applyUpsertTask(current, op.payload, ts);
      appliedCount++;
    } else if (op.type === 'delete_task' && op.payload?.id) {
      current = applyDeleteTask(current, op.payload.id, ts);
      appliedCount++;
    }
  }

  return { state: current, appliedCount };
}
