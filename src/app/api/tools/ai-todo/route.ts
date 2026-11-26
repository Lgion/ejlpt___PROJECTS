import { NextResponse } from 'next/server';
import { generateGeminiJson } from '@/lib/ai/geminiClient';
import { moderateUserText } from '@/lib/ai/moderation';

export const dynamic = 'force-dynamic';

export interface AiTodoSuggestion {
  id: string;
  title: string;
  category: string;
  estimatedMinutes: number;
  level: string;
  href: string;
}

const ALLOWED_INTERNAL_HREFS = new Set([
  '/',
  '/practice',
  '/practice?mode=srs_review',
  '/practice?tab=yomikata',
  '/practice?tab=drills',
  '/practice?tab=interactive',
  '/kanji',
  '/grammar',
  '/dictionary',
  '/reader',
  '/slang',
  '/tools',
  '/history',
]);

function sanitizeHref(raw: unknown): string {
  const s = String(raw || '').trim();
  if (ALLOWED_INTERNAL_HREFS.has(s)) return s;
  if (s.startsWith('/practice')) return '/practice';
  if (s.startsWith('/kanji')) return '/kanji';
  if (s.startsWith('/grammar')) return '/grammar';
  if (s.startsWith('/dictionary')) return '/dictionary';
  if (s.startsWith('/reader')) return '/reader';
  return '/practice';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const level = String(body.level || 'N4').toUpperCase();
    const minutesPerDay = Math.max(10, Math.min(180, Number(body.minutesPerDay) || 30));
    const focusAreas = Array.isArray(body.focusAreas)
      ? body.focusAreas.map(String).slice(0, 5)
      : ['Kanji', 'Grammaire', 'Écoute'];
    const customNote = String(body.customNote || '').trim();

    if (customNote) {
      const mod = moderateUserText(customNote, { minLength: 2, maxLength: 300 });
      if (!mod.allowed) {
        return NextResponse.json(
          { ok: false, error: mod.reasonFr || 'Votre objectif personnalisé a été refusé.' },
          { status: 400 }
        );
      }
    }

    const prompt = [
      `Tu es un coach de préparation au JLPT ${level}.`,
      `Construis une todo-list d'étude réaliste pour ${minutesPerDay} minutes/jour ciblant : ${focusAreas.join(', ')}.`,
      customNote ? `Contrainte ou objectif de l'élève : ${customNote}` : '',
      'Propose 4 à 6 tâches concrètes, mesurables et directement reliées aux modules de eJLPT.',
      `Routes autorisées pour href : ${Array.from(ALLOWED_INTERNAL_HREFS).join(', ')}.`,
      'Retourne STRICTEMENT un tableau JSON d’objets : [{"title": string, "category": string, "estimatedMinutes": number, "href": string}].',
    ]
      .filter(Boolean)
      .join('\n');

    const aiRes = await generateGeminiJson<
      Array<{ title?: string; category?: string; estimatedMinutes?: number; href?: string }>
    >(prompt, {
      temperature: 0.4,
      maxOutputTokens: 1200,
    });

    if (!aiRes.ok || !Array.isArray(aiRes.data)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            aiRes.userError ||
            'Le service IA n’a pas pu générer de programme actuellement. Vous pouvez ajouter vos tâches manuellement.',
          usedFallback: aiRes.usedFallback,
          retriesCount: aiRes.retriesCount,
          events: aiRes.events,
        },
        { status: 503 }
      );
    }

    const items: AiTodoSuggestion[] = aiRes.data
      .filter((row) => row && typeof row.title === 'string' && row.title.trim())
      .slice(0, 6)
      .map((row) => ({
        id: `aitodo_${crypto.randomUUID()}`,
        title: String(row.title).trim().slice(0, 140),
        category: String(row.category || 'Étude').trim().slice(0, 40),
        estimatedMinutes: Math.max(5, Math.min(90, Number(row.estimatedMinutes) || 10)),
        level,
        href: sanitizeHref(row.href),
      }));

    return NextResponse.json({
      ok: true,
      items,
      usedFallback: aiRes.usedFallback,
      retriesCount: aiRes.retriesCount,
      events: aiRes.events,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Erreur lors de la génération de la todo-list.' },
      { status: 500 }
    );
  }
}
