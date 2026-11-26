import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';
import { isAdminEmail } from '@/lib/admin';
import { generateGeminiJson } from '@/lib/ai/geminiClient';

export const dynamic = 'force-dynamic';

async function isAuthorizedCron(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get('authorization')?.trim();
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }
  const user = await currentUser().catch(() => null);
  const email = user?.primaryEmailAddress?.emailAddress;
  return Boolean(user && isAdminEmail(email));
}

async function handleRefresh(request: Request) {
  try {
    if (!(await isAuthorizedCron(request))) {
      return NextResponse.json(
        { ok: false, error: 'Accès réservé au cron ou à l’administrateur.' },
        { status: 401 }
      );
    }

    const currentYear = new Date().getUTCFullYear();
    const body = (await request.json().catch(() => ({}))) as {
      terms?: Array<{ term: string; meaning?: string }>;
    };
    const terms = Array.isArray(body.terms) ? body.terms.slice(0, 30) : [];

    let refreshedCount = 0;
    const client = await clientPromise;
    const db = client.db('ejlpt_db');
    const col = db.collection('slang_annual_stats');

    if (terms.length > 0) {
      const prompt = `Pour l'année ${currentYear}, estime la fréquence d'usage actuelle au Japon (1..100) et l'époque d'usage de ces termes d'argot japonais. Retourne un tableau JSON [{ "term": "...", "annualFrequency": 70, "era": "..." }]: ${JSON.stringify(terms)}`;
      const aiRes = await generateGeminiJson<
        Array<{ term: string; annualFrequency: number; era?: string }>
      >(prompt);

      if (!aiRes.ok || !Array.isArray(aiRes.data)) {
        return NextResponse.json(
          {
            ok: false,
            error: aiRes.userError || 'Impossible d’actualiser les fréquences slang.',
            events: aiRes.events,
          },
          { status: 503 }
        );
      }

      const nowIso = new Date().toISOString();
      for (const row of aiRes.data) {
        if (!row?.term) continue;
        await col.updateOne(
          { term: row.term, year: currentYear },
          {
            $set: {
              term: row.term,
              year: currentYear,
              annualFrequency: Math.max(1, Math.min(100, Math.round(row.annualFrequency || 50))),
              era: row.era || 'Contemporain / Courant',
              refreshedAt: nowIso,
            },
          },
          { upsert: true }
        );
        refreshedCount += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      year: currentYear,
      refreshedCount,
      scheduledPolicy: '0 0 1 1 * (1er janvier)',
    });
  } catch (error: unknown) {
    console.error('Error refreshing annual slang stats:', error);
    return NextResponse.json(
      { ok: false, error: 'Erreur serveur lors de l’actualisation annuelle.' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handleRefresh(request);
}

export async function POST(request: Request) {
  return handleRefresh(request);
}
