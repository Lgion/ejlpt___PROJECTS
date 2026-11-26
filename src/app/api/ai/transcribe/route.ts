import { NextResponse } from 'next/server';
import { transcribeJapaneseAudio } from '@/lib/ai/geminiClient';

export const dynamic = 'force-dynamic';

const MAX_BASE64_CHARS = 8_000_000;
const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
]);

function normalizeAudioMimeType(raw?: unknown): string {
  const cleaned = String(raw || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (ALLOWED_AUDIO_MIME_TYPES.has(cleaned)) {
    return cleaned;
  }
  return 'audio/webm';
}

function stripDataUriPrefix(raw: string): string {
  return raw.replace(/^data:[^;]+;base64,/i, '').trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const rawAudio = typeof body.base64Audio === 'string' ? stripDataUriPrefix(body.base64Audio) : '';

    if (!rawAudio) {
      return NextResponse.json(
        { ok: false, error: 'Aucun signal audio détecté.' },
        { status: 400 }
      );
    }

    if (rawAudio.length > MAX_BASE64_CHARS) {
      return NextResponse.json(
        { ok: false, error: 'Enregistrement audio trop volumineux (max 6 Mo).' },
        { status: 413 }
      );
    }

    const mimeType = normalizeAudioMimeType(body.mimeType);
    const expectedHint =
      typeof body.expectedHint === 'string' && body.expectedHint.trim()
        ? body.expectedHint.trim().slice(0, 160)
        : undefined;

    const aiRes = await transcribeJapaneseAudio({
      base64Audio: rawAudio,
      mimeType,
      expectedHint,
    });

    if (!aiRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: aiRes.userError || 'La transcription vocale IA est momentanément indisponible.',
          usedFallback: aiRes.usedFallback,
          retriesCount: aiRes.retriesCount,
          events: aiRes.events,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      transcript: aiRes.data || '',
      usedFallback: aiRes.usedFallback,
      retriesCount: aiRes.retriesCount,
      events: aiRes.events,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Erreur lors du traitement de l’enregistrement audio.' },
      { status: 500 }
    );
  }
}
