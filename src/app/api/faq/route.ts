import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';
import { generateGeminiText } from '@/lib/ai/geminiClient';
import { moderateUserText } from '@/lib/ai/moderation';
import {
  FAQ_CATEGORIES,
  findSimilarFaqQuestions,
  SEED_PUBLIC_FAQ,
  type FaqCategory,
  type FaqQuestion,
} from '@/lib/faqModel';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = new Set(FAQ_CATEGORIES.map((c) => c.id));
const VALID_LEVELS = new Set(['ALL', 'N5', 'N4', 'N3', 'N2', 'N1']);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'ALL';
  const level = searchParams.get('level') || 'ALL';
  const sort = searchParams.get('sort') === 'recent' ? 'recent' : 'votes';
  const q = (searchParams.get('q') || '').trim().toLowerCase();

  let dbItems: FaqQuestion[] = [];
  try {
    const client = await clientPromise;
    const db = client.db('ejlpt_db');
    dbItems = await db
      .collection<FaqQuestion>('faq_questions')
      .find({ status: 'active' })
      .toArray();
  } catch {
    // MongoDB offline: fallback to public seed
  }

  const byId = new Map<string, FaqQuestion>();
  for (const s of SEED_PUBLIC_FAQ) byId.set(s.id, s);
  for (const d of dbItems) byId.set(d.id, d);

  let items = Array.from(byId.values()).filter((item) => item.status === 'active');

  if (category !== 'ALL' && VALID_CATEGORIES.has(category as FaqCategory)) {
    items = items.filter((item) => item.category === category);
  }
  if (level !== 'ALL' && VALID_LEVELS.has(level.toUpperCase())) {
    items = items.filter((item) => item.level === level.toUpperCase() || item.level === 'ALL');
  }
  if (q) {
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q) ||
        item.aiAnswer.toLowerCase().includes(q)
    );
  }

  items.sort((a, b) => {
    if (sort === 'recent') {
      return b.createdAt.localeCompare(a.createdAt);
    }
    return b.voteCount - a.voteCount || b.createdAt.localeCompare(a.createdAt);
  });

  return NextResponse.json({
    ok: true,
    items,
    total: items.length,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const titleRaw = String(body.title || '');
    const detailsRaw = String(body.body || '');
    const catRaw = String(body.category || 'grammaire') as FaqCategory;
    const lvlRaw = String(body.level || 'N4').toUpperCase();
    const forceCreate = body.forceCreate === true;

    const category: FaqCategory = VALID_CATEGORIES.has(catRaw) ? catRaw : 'grammaire';
    const level = (VALID_LEVELS.has(lvlRaw) ? lvlRaw : 'N4') as FaqQuestion['level'];

    const modTitle = moderateUserText(titleRaw, { minLength: 8, maxLength: 180 });
    if (!modTitle.allowed) {
      return NextResponse.json(
        { ok: false, error: modTitle.reasonFr || 'Titre refusé par la modération.' },
        { status: 400 }
      );
    }

    const modBody = detailsRaw.trim()
      ? moderateUserText(detailsRaw, { minLength: 4, maxLength: 1500 })
      : { allowed: true, sanitizedText: modTitle.sanitizedText, reasonFr: undefined as string | undefined };
    if (!modBody.allowed) {
      return NextResponse.json(
        { ok: false, error: modBody.reasonFr || 'Contenu refusé par la modération.' },
        { status: 400 }
      );
    }

    let pool: FaqQuestion[] = [...SEED_PUBLIC_FAQ];
    try {
      const client = await clientPromise;
      const db = client.db('ejlpt_db');
      const existing = await db
        .collection<FaqQuestion>('faq_questions')
        .find({ status: 'active' })
        .limit(200)
        .toArray();
      pool = [...existing, ...SEED_PUBLIC_FAQ];
    } catch {
      // ignore if offline
    }

    if (!forceCreate) {
      const duplicates = findSimilarFaqQuestions(modTitle.sanitizedText, pool);
      if (duplicates.length > 0) {
        return NextResponse.json({
          ok: true,
          duplicateFound: true,
          duplicates,
        });
      }
    }

    let user = null;
    try {
      user = await currentUser();
    } catch {
      user = null;
    }
    const authorUserId = user?.id;
    const authorLabel = user
      ? user.firstName || user.username || 'Membre eJLPT'
      : 'Visiteur anonyme';

    const prompt = [
      `Tu es un professeur expert de japonais (niveau JLPT ${level}, catégorie ${category}).`,
      `Question publique d'un apprenant : ${modTitle.sanitizedText}`,
      modBody.sanitizedText !== modTitle.sanitizedText ? `Précisions : ${modBody.sanitizedText}` : '',
      'Rédige une réponse claire, structurée en français avec 1 ou 2 exemples japonais + lecture kana et une astuce pratique pour le JLPT.',
    ]
      .filter(Boolean)
      .join('\n');

    const aiRes = await generateGeminiText(prompt, {
      temperature: 0.35,
      maxOutputTokens: 900,
    });

    const newQuestion: FaqQuestion = {
      id: `faq_${crypto.randomUUID()}`,
      title: modTitle.sanitizedText,
      body: modBody.sanitizedText,
      category,
      level,
      aiAnswer:
        aiRes.ok && aiRes.data
          ? aiRes.data
          : 'Question enregistrée publiquement. L’assistant IA étant temporairement occupé, la communauté pourra également y répondre en commentaire.',
      authorLabel,
      authorUserId,
      voterIds: [],
      voteCount: 0,
      comments: [],
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    try {
      const client = await clientPromise;
      const db = client.db('ejlpt_db');
      await db.collection<FaqQuestion>('faq_questions').insertOne(newQuestion);
    } catch {
      // Keep returnable even if MongoDB is temporarily offline
    }

    return NextResponse.json(
      {
        ok: true,
        duplicateFound: false,
        question: newQuestion,
        usedFallback: aiRes.usedFallback,
        events: aiRes.events,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Erreur lors de la publication sur la FAQ.' },
      { status: 500 }
    );
  }
}
