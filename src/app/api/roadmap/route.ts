import { NextResponse, type NextRequest } from 'next/server';
import {
  createDefaultRoadmapState,
  type RoadmapCategory,
  type RoadmapSyncOp,
  type RoadmapTask,
} from '@/lib/roadmapSeed';
import {
  applyDeleteCategory,
  applyDeleteTask,
  applySyncOpsToState,
  applyUpsertCategory,
  applyUpsertTask,
  normalizeRoadmapState,
  readRoadmapState,
  writeRoadmapState,
} from '@/lib/roadmapStore';

export const dynamic = 'force-dynamic';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Cache-Control': 'no-store',
};

function jsonCors(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  try {
    const pingOnly = request.nextUrl.searchParams.get('ping') === '1';
    const state = await readRoadmapState();
    if (pingOnly) {
      return jsonCors({
        ok: true,
        pong: true,
        source: 'ejlpt-nextjs-server',
        updatedAt: state.updatedAt,
      });
    }
    return jsonCors({
      ok: true,
      source: 'ejlpt-nextjs-server',
      state,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lecture roadmap';
    return jsonCors({ ok: false, error: message }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = typeof body?.action === 'string' ? body.action : '';

    if (action === 'reset_seed') {
      const resetState = await writeRoadmapState(createDefaultRoadmapState());
      return jsonCors({ ok: true, state: resetState });
    }

    const current = await readRoadmapState();

    if (action === 'sync_ops' && Array.isArray(body.ops)) {
      const { state: synced, appliedCount } = applySyncOpsToState(
        current,
        body.ops as RoadmapSyncOp[]
      );
      const saved = await writeRoadmapState(synced);
      return jsonCors({ ok: true, appliedCount, state: saved });
    }

    if ((action === 'upsert_task' || action === 'create_task') && body.task) {
      const next = applyUpsertTask(current, body.task as Partial<RoadmapTask>);
      const saved = await writeRoadmapState(next);
      return jsonCors({ ok: true, state: saved }, 201);
    }

    if ((action === 'upsert_category' || action === 'create_category') && body.category) {
      const next = applyUpsertCategory(current, body.category as Partial<RoadmapCategory>);
      const saved = await writeRoadmapState(next);
      return jsonCors({ ok: true, state: saved }, 201);
    }

    return jsonCors({ ok: false, error: 'Action POST non reconnue.' }, 400);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur POST roadmap';
    return jsonCors({ ok: false, error: message }, 400);
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const candidate = body?.state && typeof body.state === 'object' ? body.state : body;
    const normalized = normalizeRoadmapState(candidate);
    const saved = await writeRoadmapState(normalized);
    return jsonCors({ ok: true, state: saved });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Payload PUT invalide';
    return jsonCors({ ok: false, error: message }, 400);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      kind?: 'task' | 'category';
      id?: string;
      patch?: Record<string, unknown>;
    };

    if (!body?.id || !body?.patch) {
      return jsonCors({ ok: false, error: 'Paramètres id et patch requis.' }, 400);
    }

    const current = await readRoadmapState();
    const next =
      body.kind === 'category'
        ? applyUpsertCategory(current, {
            ...(body.patch as Partial<RoadmapCategory>),
            id: body.id,
          })
        : applyUpsertTask(current, {
            ...(body.patch as Partial<RoadmapTask>),
            id: body.id,
          });

    const saved = await writeRoadmapState(next);
    return jsonCors({ ok: true, state: saved });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur PATCH roadmap';
    return jsonCors({ ok: false, error: message }, 400);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    let kind = request.nextUrl.searchParams.get('kind') || '';
    let id = request.nextUrl.searchParams.get('id') || '';

    if (!id) {
      try {
        const body = (await request.json()) as { kind?: string; id?: string };
        kind = kind || body.kind || 'task';
        id = body.id || '';
      } catch {
        // query params only
      }
    }

    if (!id.trim()) {
      return jsonCors({ ok: false, error: 'Paramètre id manquant.' }, 400);
    }

    const current = await readRoadmapState();
    const next =
      kind === 'category'
        ? applyDeleteCategory(current, id.trim())
        : applyDeleteTask(current, id.trim());

    const saved = await writeRoadmapState(next);
    return jsonCors({ ok: true, state: saved });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur DELETE roadmap';
    return jsonCors({ ok: false, error: message }, 400);
  }
}
