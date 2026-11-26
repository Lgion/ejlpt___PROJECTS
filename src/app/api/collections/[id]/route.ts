import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';
import { isAdminEmail } from '@/lib/admin';
import type { CollectionExerciseItem } from '@/lib/exerciseCollections';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const user = await currentUser();
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: 'Authentification requise.' },
        { status: 401 }
      ),
    };
  }
  const email = user.primaryEmailAddress?.emailAddress;
  if (!isAdminEmail(email)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: 'Droits administrateur requis.' },
        { status: 403 }
      ),
    };
  }
  return { ok: true as const };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const body: unknown = await request.json();
    const status = (body as Record<string, unknown>)?.status;

    if (status !== 'active' && status !== 'hidden') {
      return NextResponse.json(
        { ok: false, error: 'Statut invalide (attendu : active ou hidden).' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('ejlpt_db');
    const res = await db
      .collection<CollectionExerciseItem>('exercise_items')
      .updateOne({ id }, { $set: { status } });

    if (res.matchedCount === 0) {
      return NextResponse.json({ ok: false, error: 'Exercice introuvable.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id, status });
  } catch (error: unknown) {
    console.error('Error moderating exercise collection item:', error);
    return NextResponse.json(
      { ok: false, error: 'Erreur serveur lors de la modération.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const client = await clientPromise;
    const db = client.db('ejlpt_db');
    const res = await db
      .collection<CollectionExerciseItem>('exercise_items')
      .deleteOne({ id });

    if (res.deletedCount === 0) {
      return NextResponse.json({ ok: false, error: 'Exercice introuvable.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id, deleted: true });
  } catch (error: unknown) {
    console.error('Error deleting exercise collection item:', error);
    return NextResponse.json(
      { ok: false, error: 'Erreur serveur lors de la suppression.' },
      { status: 500 }
    );
  }
}
