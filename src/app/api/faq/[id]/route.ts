import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';
import { isAdminEmail } from '@/lib/admin';
import { moderateUserText } from '@/lib/ai/moderation';
import type { FaqComment, FaqQuestion } from '@/lib/faqModel';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action || '');

    const client = await clientPromise;
    const db = client.db('ejlpt_db');
    const col = db.collection<FaqQuestion>('faq_questions');
    const existing = await col.findOne({ id });

    if (action === 'vote') {
      let user = null;
      try {
        user = await currentUser();
      } catch {
        user = null;
      }
      if (!user) {
        return NextResponse.json(
          { ok: false, error: 'Connectez-vous pour voter « utile » sur la FAQ.' },
          { status: 401 }
        );
      }
      if (!existing) {
        return NextResponse.json({ ok: false, error: 'Question introuvable en base.' }, { status: 404 });
      }
      const voters = new Set(existing.voterIds || []);
      if (voters.has(user.id)) voters.delete(user.id);
      else voters.add(user.id);
      const nextVoterIds = Array.from(voters);
      const voteCount = nextVoterIds.length;
      await col.updateOne({ id }, { $set: { voterIds: nextVoterIds, voteCount } });
      return NextResponse.json({ ok: true, id, voteCount, hasVoted: voters.has(user.id) });
    }

    if (action === 'comment') {
      const mod = moderateUserText(String(body.body || ''), { minLength: 3, maxLength: 600 });
      if (!mod.allowed) {
        return NextResponse.json(
          { ok: false, error: mod.reasonFr || 'Commentaire refusé par la modération.' },
          { status: 400 }
        );
      }
      if (!existing) {
        return NextResponse.json({ ok: false, error: 'Question introuvable en base.' }, { status: 404 });
      }
      let user = null;
      try {
        user = await currentUser();
      } catch {
        user = null;
      }
      const comment: FaqComment = {
        id: `c_${crypto.randomUUID()}`,
        body: mod.sanitizedText,
        authorLabel: user ? user.firstName || user.username || 'Membre' : 'Visiteur anonyme',
        authorUserId: user?.id,
        createdAt: new Date().toISOString(),
      };
      await col.updateOne({ id }, { $push: { comments: comment } });
      return NextResponse.json({ ok: true, id, comment });
    }

    if (action === 'moderate') {
      let user = null;
      try {
        user = await currentUser();
      } catch {
        user = null;
      }
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!user || !isAdminEmail(email)) {
        return NextResponse.json(
          { ok: false, error: 'Modération réservée à l’administrateur.' },
          { status: 403 }
        );
      }
      const status = body.status === 'hidden' ? 'hidden' : 'active';
      const res = await col.updateOne({ id }, { $set: { status } });
      if (res.matchedCount === 0) {
        return NextResponse.json({ ok: false, error: 'Question introuvable.' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, id, status });
    }

    return NextResponse.json({ ok: false, error: 'Action FAQ inconnue.' }, { status: 400 });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Erreur serveur lors de la mise à jour FAQ.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    let user = null;
    try {
      user = await currentUser();
    } catch {
      user = null;
    }
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Connexion requise.' }, { status: 401 });
    }

    const { id } = await context.params;
    const client = await clientPromise;
    const db = client.db('ejlpt_db');
    const col = db.collection<FaqQuestion>('faq_questions');
    const existing = await col.findOne({ id });
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Question introuvable.' }, { status: 404 });
    }

    const email = user.primaryEmailAddress?.emailAddress;
    if (!isAdminEmail(email) && existing.authorUserId !== user.id) {
      return NextResponse.json(
        { ok: false, error: 'Seul l’auteur ou un administrateur peut supprimer cette question.' },
        { status: 403 }
      );
    }

    await col.deleteOne({ id });
    return NextResponse.json({ ok: true, id, deleted: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Erreur lors de la suppression FAQ.' },
      { status: 500 }
    );
  }
}
