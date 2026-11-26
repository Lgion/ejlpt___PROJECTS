import { NextResponse } from 'next/server';
import { extractJapaneseTextFromPdf } from '@/lib/ai/geminiClient';
import { containsJapaneseCharacters, extractBasicPdfText } from '@/lib/pdfExtractor';

export const dynamic = 'force-dynamic';

const MAX_BASE64_CHARS = 8_000_000;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const rawPdf =
      typeof body.base64Pdf === 'string'
        ? body.base64Pdf.replace(/^data:application\/pdf;base64,/i, '').trim()
        : '';

    if (!rawPdf) {
      return NextResponse.json(
        { ok: false, error: 'Aucun fichier PDF valide reçu.' },
        { status: 400 }
      );
    }

    if (rawPdf.length > MAX_BASE64_CHARS) {
      return NextResponse.json(
        { ok: false, error: 'Fichier PDF trop volumineux (limite 6 Mo).' },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(rawPdf, 'base64');
    const localText = extractBasicPdfText(buffer);

    if (containsJapaneseCharacters(localText) || localText.length >= 40) {
      return NextResponse.json({
        ok: true,
        text: localText,
        method: 'local_stream',
      });
    }

    const aiRes = await extractJapaneseTextFromPdf({ base64Pdf: rawPdf });
    if (!aiRes.ok || !aiRes.data) {
      return NextResponse.json(
        {
          ok: false,
          error:
            aiRes.userError ||
            'Impossible d’extraire le texte japonais de ce PDF actuellement.',
          usedFallback: aiRes.usedFallback,
          retriesCount: aiRes.retriesCount,
          events: aiRes.events,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      text: aiRes.data,
      method: 'gemini_pdf',
      usedFallback: aiRes.usedFallback,
      retriesCount: aiRes.retriesCount,
      events: aiRes.events,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Erreur lors du traitement du document PDF.' },
      { status: 500 }
    );
  }
}
