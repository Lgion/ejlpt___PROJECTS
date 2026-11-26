import { NextResponse, type NextRequest } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';
import { isAdminEmail } from '@/lib/admin';
import {
  computeExerciseFingerprint,
  VALID_LEVELS,
  VALID_MODES,
  validateCollectionSubmission,
  type CollectionExerciseItem,
  type CollectionJLPTLevel,
  type ExerciseCollectionSource,
  type ExerciseDrillMode,
} from '@/lib/exerciseCollections';

export const dynamic = 'force-dynamic';

const QUERYABLE_SOURCES = new Set<ExerciseCollectionSource>(['ai_generated', 'community']);

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const rawSources = (params.get('sources') || 'ai_generated,community')
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is ExerciseCollectionSource =>
        QUERYABLE_SOURCES.has(s as ExerciseCollectionSource)
      );

    const sources: ExerciseCollectionSource[] =
      rawSources.length > 0 ? rawSources : ['ai_generated', 'community'];

    const modeParam = params.get('mode')?.trim();
    const levelParam = params.get('level')?.trim().toUpperCase();
    const rawLimit = Number(params.get('limit') || '30');
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, Math.round(rawLimit))) : 30;
    const wantHidden = params.get('includeHidden') === '1';

    let allowHidden = false;
    if (wantHidden) {
      const user = await currentUser();
      const email = user?.primaryEmailAddress?.emailAddress;
      allowHidden = Boolean(user && isAdminEmail(email));
    }

    const filter: Record<string, unknown> = {
      source: { $in: sources },
    };

    if (!allowHidden) {
      filter.status = 'active';
    }
    if (modeParam && VALID_MODES.has(modeParam as ExerciseDrillMode)) {
      filter.mode = modeParam;
    }
    if (levelParam && levelParam !== 'ALL' && VALID_LEVELS.has(levelParam as CollectionJLPTLevel)) {
      filter.level = levelParam;
    }

    const client = await clientPromise;
    const db = client.db('ejlpt_db');
    const docs = await db
      .collection<CollectionExerciseItem>('exercise_items')
      .find(filter, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      ok: true,
      items: docs,
      total: docs.length,
    });
  } catch (error: unknown) {
    console.error('Error fetching exercise collections:', error);
    return NextResponse.json(
      { ok: false, error: 'Impossible de charger les collections d’exercices.', items: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const validation = validateCollectionSubmission(body);

    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.errorFr }, { status: 400 });
    }

    const user = await currentUser().catch(() => null);
    const { item } = validation;
    const fingerprint = computeExerciseFingerprint({
      mode: item.mode,
      level: item.level,
      prompt: item.prompt,
      expectedAnswers: item.expectedAnswers,
    });

    const nowIso = new Date().toISOString();
    const newId = `col_${crypto.randomUUID()}`;
    const docToInsert: CollectionExerciseItem = {
      id: newId,
      fingerprint,
      ...item,
      status: 'active',
      authorType: item.source === 'ai_generated' ? 'ai' : user ? 'member' : 'anonymous',
      ...(user?.id ? { createdByUserId: user.id } : {}),
      createdAt: nowIso,
    };

    const client = await clientPromise;
    const db = client.db('ejlpt_db');
    const collection = db.collection<CollectionExerciseItem>('exercise_items');

    const result = await collection.updateOne(
      { fingerprint, source: item.source },
      { $setOnInsert: docToInsert },
      { upsert: true }
    );

    const existing = await collection.findOne(
      { fingerprint, source: item.source },
      { projection: { _id: 0 } }
    );

    const inserted = result.upsertedCount > 0;
    return NextResponse.json(
      {
        ok: true,
        id: existing?.id || newId,
        deduplicated: !inserted,
        item: existing || docToInsert,
      },
      { status: inserted ? 201 : 200 }
    );
  } catch (error: unknown) {
    console.error('Error saving exercise collection item:', error);
    return NextResponse.json(
      { ok: false, error: 'Impossible d’enregistrer cet exercice.' },
      { status: 500 }
    );
  }
}
