import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';
import { isAdminEmail } from '@/lib/admin';
import {
  fetchNhkRssHeadlines,
  getOfflineDailyNewsForDate,
  getTodayUtcDateKey,
  NEWS_JLPT_LEVELS,
  type DailyNewsArticle,
} from '@/lib/newsRss';
import { generateAdaptedNewsArticle } from '@/app/api/news/daily/route';

export const dynamic = 'force-dynamic';

async function isAuthorizedCron(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get('authorization')?.trim();
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }
  let user = null;
  try {
    user = await currentUser();
  } catch {
    user = null;
  }
  const email = user?.primaryEmailAddress?.emailAddress;
  return Boolean(user && isAdminEmail(email));
}

async function handleDailyNewsCron(request: Request) {
  try {
    if (!(await isAuthorizedCron(request))) {
      return NextResponse.json(
        { ok: false, error: 'Accès réservé au cron quotidien ou à l’administrateur.' },
        { status: 401 }
      );
    }

    const dateKey = getTodayUtcDateKey();
    const headlines = await fetchNhkRssHeadlines(4500);
    const offlineFallback = getOfflineDailyNewsForDate(dateKey);
    const generated: DailyNewsArticle[] = [];

    for (let i = 0; i < NEWS_JLPT_LEVELS.length; i += 1) {
      const level = NEWS_JLPT_LEVELS[i];
      const gen = await generateAdaptedNewsArticle({
        dateKey,
        level,
        headline: headlines[i % Math.max(1, headlines.length)],
      });
      if (gen.ok) {
        generated.push(gen.article);
      } else {
        const seed = offlineFallback.find((s) => s.level === level);
        if (seed) generated.push(seed);
      }
    }

    const client = await clientPromise;
    const db = client.db('ejlpt_db');
    const col = db.collection<DailyNewsArticle>('daily_news');
    for (const art of generated) {
      await col.updateOne(
        { dateKey: art.dateKey, level: art.level },
        { $set: art },
        { upsert: true }
      );
    }

    return NextResponse.json({
      ok: true,
      dateKey,
      generatedCount: generated.length,
      scheduledPolicy: '0 5 * * * (quotidien 05h00 UTC)',
    });
  } catch (error: unknown) {
    console.error('Error in /api/cron/daily-news:', error);
    return NextResponse.json(
      { ok: false, error: 'Erreur lors de la génération quotidienne des articles.' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handleDailyNewsCron(request);
}

export async function POST(request: Request) {
  return handleDailyNewsCron(request);
}
