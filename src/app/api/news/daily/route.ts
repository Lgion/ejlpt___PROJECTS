import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { generateGeminiJson } from '@/lib/ai/geminiClient';
import {
  fetchNhkRssHeadlines,
  getOfflineDailyNewsForDate,
  getTodayUtcDateKey,
  NEWS_JLPT_LEVELS,
  type DailyNewsArticle,
  type NewsJLPTLevel,
  type RssHeadlineItem,
} from '@/lib/newsRss';

export const dynamic = 'force-dynamic';

interface GeminiNewsRaw {
  titleJa: string;
  titleFr: string;
  summaryFr: string;
  bodyJa: string;
  vocabHighlights?: Array<{ term: string; reading: string; meaningFr: string }>;
}

export async function generateAdaptedNewsArticle(input: {
  dateKey: string;
  level: NewsJLPTLevel;
  headline?: RssHeadlineItem;
}) {
  const baseTopic = input.headline
    ? `Titre original NHK : ${input.headline.title}\nRésumé : ${input.headline.description || input.headline.title}`
    : 'Actualité japonaise du jour (société, culture ou technologie au Japon).';

  const prompt = [
    `Rédige 1 article de presse japonais adapté exactement au niveau JLPT ${input.level} pour la date ${input.dateKey}.`,
    baseTopic,
    input.level === 'N5'
      ? 'Utilise uniquement des phrases très courtes, hiragana/katakana + kanjis N5 simples.'
      : input.level === 'N4'
        ? 'Utilise un japonais clair et naturel de niveau N4 (50–80 mots).'
        : 'Style journalistique japonais authentique calibré pour ce niveau JLPT (70–120 mots).',
    'Retourne STRICTEMENT un JSON : {"titleJa": string, "titleFr": string, "summaryFr": string, "bodyJa": string, "vocabHighlights": [{"term": string, "reading": string, "meaningFr": string}]} (3 mots clés).',
  ].join('\n');

  const aiRes = await generateGeminiJson<GeminiNewsRaw>(prompt, {
    temperature: 0.35,
    maxOutputTokens: 1200,
  });

  if (!aiRes.ok || !aiRes.data?.bodyJa || !aiRes.data?.titleJa) {
    return {
      ok: false as const,
      usedFallback: aiRes.usedFallback,
      retriesCount: aiRes.retriesCount,
      events: aiRes.events,
      userError: aiRes.userError,
    };
  }

  const article: DailyNewsArticle = {
    id: `news-${input.dateKey}-${input.level}`,
    dateKey: input.dateKey,
    level: input.level,
    titleJa: aiRes.data.titleJa.trim(),
    titleFr: (aiRes.data.titleFr || '').trim() || 'Actualité japonaise adaptée',
    summaryFr: (aiRes.data.summaryFr || '').trim(),
    bodyJa: aiRes.data.bodyJa.trim(),
    sourceName: input.headline ? 'NHK News + Adaptation IA' : 'Édition IA eJLPT',
    sourceUrl: input.headline?.link || 'https://www3.nhk.or.jp/news/',
    origin: input.headline ? 'rss_nhk' : 'ai_adapted',
    vocabHighlights: Array.isArray(aiRes.data.vocabHighlights)
      ? aiRes.data.vocabHighlights.slice(0, 4)
      : [],
    createdAt: new Date().toISOString(),
  };

  return {
    ok: true as const,
    article,
    usedFallback: aiRes.usedFallback,
    retriesCount: aiRes.retriesCount,
    events: aiRes.events,
  };
}

export async function GET() {
  const dateKey = getTodayUtcDateKey();
  const cachedByLevel = new Map<NewsJLPTLevel, DailyNewsArticle>();

  try {
    const client = await clientPromise;
    const db = client.db('ejlpt_db');
    const docs = await db
      .collection<DailyNewsArticle>('daily_news')
      .find({ dateKey })
      .toArray();
    for (const d of docs) {
      if (NEWS_JLPT_LEVELS.includes(d.level)) {
        cachedByLevel.set(d.level, d);
      }
    }
  } catch {
    // MongoDB offline: fallback seamlessly to RSS + seed
  }

  const headlines = cachedByLevel.size < 5 ? await fetchNhkRssHeadlines(3000) : [];
  const seeds = getOfflineDailyNewsForDate(dateKey);

  const articles: DailyNewsArticle[] = NEWS_JLPT_LEVELS.map((lvl, idx) => {
    const existing = cachedByLevel.get(lvl);
    if (existing) return existing;
    const seed = seeds.find((s) => s.level === lvl) || seeds[0];
    const headline = headlines[idx];
    if (headline && (lvl === 'N2' || lvl === 'N1')) {
      return {
        ...seed,
        titleJa: headline.title,
        sourceName: 'NHK RSS + Repères eJLPT',
        sourceUrl: headline.link || seed.sourceUrl,
        origin: 'rss_nhk',
      };
    }
    return seed;
  });

  return NextResponse.json({
    ok: true,
    dateKey,
    articles,
    rssHeadlines: headlines.slice(0, 5),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { level?: string };
    const lvlRaw = String(body.level || 'N4').toUpperCase() as NewsJLPTLevel;
    const level: NewsJLPTLevel = NEWS_JLPT_LEVELS.includes(lvlRaw) ? lvlRaw : 'N4';
    const dateKey = getTodayUtcDateKey();

    const headlines = await fetchNhkRssHeadlines(4000);
    const headline = headlines[0];
    const gen = await generateAdaptedNewsArticle({ dateKey, level, headline });

    if (!gen.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: gen.userError || 'Impossible d’adapter l’actualité IA actuellement.',
          usedFallback: gen.usedFallback,
          retriesCount: gen.retriesCount,
          events: gen.events,
        },
        { status: 503 }
      );
    }

    try {
      const client = await clientPromise;
      const db = client.db('ejlpt_db');
      await db
        .collection<DailyNewsArticle>('daily_news')
        .updateOne(
          { dateKey, level },
          { $set: gen.article },
          { upsert: true }
        );
    } catch {
      // Keep generated article usable even if MongoDB is temporarily unavailable
    }

    return NextResponse.json({
      ok: true,
      article: gen.article,
      usedFallback: gen.usedFallback,
      retriesCount: gen.retriesCount,
      events: gen.events,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Erreur serveur lors de l’adaptation du journal.' },
      { status: 500 }
    );
  }
}
