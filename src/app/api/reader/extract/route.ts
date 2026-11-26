import { NextResponse } from 'next/server';
import { generateGeminiJson } from '@/lib/ai/geminiClient';
import { moderateUserText } from '@/lib/ai/moderation';

export const dynamic = 'force-dynamic';

export interface PromptExtractedItem {
  term: string;
  reading: string;
  meaningFr: string;
  jlpt: string;
  reasonFr: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const text = String(body.text || '').trim().slice(0, 6000);
    const prompt = String(body.prompt || '').trim();
    const targetLevel = String(body.targetLevel || 'N4').toUpperCase();

    if (!text) {
      return NextResponse.json(
        { ok: false, error: 'Veuillez d’abord saisir ou importer un texte japonais.' },
        { status: 400 }
      );
    }

    const mod = moderateUserText(prompt, { minLength: 3, maxLength: 300 });
    if (!mod.allowed) {
      return NextResponse.json(
        { ok: false, error: mod.reasonFr || 'Consigne d’extraction refusée par la modération.' },
        { status: 400 }
      );
    }

    const aiPrompt = [
      `Tu es un assistant d'analyse lexicale japonaise (Script 2 List, niveau élève JLPT ${targetLevel}).`,
      `Consigne utilisateur : ${mod.sanitizedText}`,
      `Texte source :\n${text}`,
      'Extrais jusqu’à 12 termes/expressions japonais pertinents présents dans ce texte.',
      'Retourne STRICTEMENT un tableau JSON : [{"term": string, "reading": string, "meaningFr": string, "jlpt": string, "reasonFr": string}].',
    ].join('\n\n');

    const aiRes = await generateGeminiJson<PromptExtractedItem[]>(aiPrompt, {
      temperature: 0.25,
      maxOutputTokens: 1500,
    });

    if (!aiRes.ok || !Array.isArray(aiRes.data)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            aiRes.userError ||
            'Extraction par prompt IA momentanément indisponible. Utilisez les listes locales ci-dessous.',
          usedFallback: aiRes.usedFallback,
          retriesCount: aiRes.retriesCount,
          events: aiRes.events,
        },
        { status: 503 }
      );
    }

    const items: PromptExtractedItem[] = aiRes.data
      .filter((x) => x && typeof x.term === 'string' && x.term.trim())
      .slice(0, 12)
      .map((x) => ({
        term: String(x.term).trim().slice(0, 60),
        reading: String(x.reading || '').trim().slice(0, 80),
        meaningFr: String(x.meaningFr || '').trim().slice(0, 140),
        jlpt: /^N[0-5]$/i.test(String(x.jlpt || '')) ? String(x.jlpt).toUpperCase() : targetLevel,
        reasonFr: String(x.reasonFr || '').trim().slice(0, 140),
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
      { ok: false, error: 'Erreur lors de l’extraction personnalisée.' },
      { status: 500 }
    );
  }
}
