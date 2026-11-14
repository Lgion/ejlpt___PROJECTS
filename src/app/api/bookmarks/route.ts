import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';

interface BookmarkPayload {
  bookmarkId?: string;
  type: 'KANJI' | 'VOCAB' | 'GRAMMAR' | 'QUESTION';
  kanjiOrWord: string;
  reading?: string;
  meaning: string;
  level: string;
  notes?: string;
  createdAt?: string;
}

const VALID_TYPES = new Set(['KANJI', 'VOCAB', 'GRAMMAR', 'QUESTION']);

function isValidBookmarkPayload(body: unknown): body is BookmarkPayload {
  if (!body || typeof body !== 'object') return false;
  const record = body as Record<string, unknown>;
  return (
    typeof record.type === 'string' &&
    VALID_TYPES.has(record.type) &&
    typeof record.kanjiOrWord === 'string' &&
    record.kanjiOrWord.trim().length > 0 &&
    typeof record.meaning === 'string' &&
    typeof record.level === 'string'
  );
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentification requise.', bookmarks: [] },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db('ejlpt_db');
    const bookmarks = await db
      .collection('bookmarks')
      .find({ clerkUserId: user.id })
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    return NextResponse.json({ success: true, bookmarks });
  } catch (error: unknown) {
    console.error('Error fetching bookmarks from MongoDB:', error);
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ success: false, error: message, bookmarks: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentification requise pour sauvegarder un favori.' },
        { status: 401 }
      );
    }

    const body: unknown = await request.json();
    if (!isValidBookmarkPayload(body)) {
      return NextResponse.json(
        { success: false, error: 'Payload de favori invalide.' },
        { status: 400 }
      );
    }

    const bookmarkId = body.bookmarkId?.trim() || `bm_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const client = await clientPromise;
    const db = client.db('ejlpt_db');
    await db.collection('bookmarks').updateOne(
      { clerkUserId: user.id, bookmarkId },
      {
        $set: {
          type: body.type,
          kanjiOrWord: body.kanjiOrWord.trim(),
          reading: body.reading?.trim() || '',
          meaning: body.meaning.trim(),
          level: body.level.trim() || 'N5',
          notes: body.notes?.trim() || '',
          syncedAt: nowIso,
        },
        $setOnInsert: {
          bookmarkId,
          clerkUserId: user.id,
          createdAt: body.createdAt || nowIso,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      bookmarkId,
      message: 'Favori synchronisé dans MongoDB Atlas.',
    });
  } catch (error: unknown) {
    console.error('Error saving bookmark to MongoDB:', error);
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentification requise.' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    let bookmarkId = url.searchParams.get('bookmarkId')?.trim() || '';

    if (!bookmarkId) {
      try {
        const body = (await request.json()) as { bookmarkId?: string };
        bookmarkId = body.bookmarkId?.trim() || '';
      } catch {
        // empty body is allowed when query param is missing
      }
    }

    if (!bookmarkId) {
      return NextResponse.json(
        { success: false, error: 'Paramètre bookmarkId manquant.' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('ejlpt_db');
    await db.collection('bookmarks').deleteOne({ clerkUserId: user.id, bookmarkId });

    return NextResponse.json({ success: true, bookmarkId });
  } catch (error: unknown) {
    console.error('Error deleting bookmark from MongoDB:', error);
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

