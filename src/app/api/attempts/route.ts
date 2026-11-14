import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { currentUser } from '@clerk/nextjs/server';

interface AttemptPayload {
  attemptId?: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  mode: 'FULL_MOCK' | 'SECTION_PRACTICE';
  sectionFilter?: 'moji_go' | 'bunpou_dokkai' | 'choukai';
  title: string;
  scoreTotal: number;
  maxScoreTotal: number;
  scoreMojiGo?: number;
  scoreBunpouDokkai?: number;
  scoreChoukai?: number;
  passed: boolean;
  userAnswers?: Record<string, string>;
  timeSpentSeconds?: number;
  createdAt?: string;
}

const VALID_LEVELS = new Set(['N5', 'N4', 'N3', 'N2', 'N1']);
const VALID_MODES = new Set(['FULL_MOCK', 'SECTION_PRACTICE']);

function isValidAttemptPayload(body: unknown): body is AttemptPayload {
  if (!body || typeof body !== 'object') return false;
  const record = body as Record<string, unknown>;
  return (
    typeof record.level === 'string' &&
    VALID_LEVELS.has(record.level) &&
    typeof record.mode === 'string' &&
    VALID_MODES.has(record.mode) &&
    typeof record.title === 'string' &&
    record.title.trim().length > 0 &&
    typeof record.scoreTotal === 'number' &&
    Number.isFinite(record.scoreTotal) &&
    typeof record.maxScoreTotal === 'number' &&
    Number.isFinite(record.maxScoreTotal) &&
    typeof record.passed === 'boolean'
  );
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentification requise pour enregistrer une tentative.' },
        { status: 401 }
      );
    }

    const body: unknown = await request.json();
    if (!isValidAttemptPayload(body)) {
      return NextResponse.json(
        { success: false, error: 'Payload de tentative invalide ou incomplet.' },
        { status: 400 }
      );
    }

    const attemptId = body.attemptId?.trim() || `attempt_${Date.now()}`;
    const document = {
      attemptId,
      clerkUserId: user.id,
      userEmail: user.primaryEmailAddress?.emailAddress || 'unknown@ejlpt.local',
      userName: user.fullName || 'Apprenant eJLPT',
      level: body.level,
      mode: body.mode,
      sectionFilter: body.sectionFilter,
      title: body.title,
      scoreTotal: body.scoreTotal,
      maxScoreTotal: body.maxScoreTotal,
      scoreMojiGo: body.scoreMojiGo ?? 0,
      scoreBunpouDokkai: body.scoreBunpouDokkai ?? 0,
      scoreChoukai: body.scoreChoukai ?? 0,
      passed: body.passed,
      userAnswers: body.userAnswers ?? {},
      timeSpentSeconds: body.timeSpentSeconds ?? 0,
      createdAt: body.createdAt || new Date().toISOString(),
      syncedAt: new Date().toISOString(),
    };

    const client = await clientPromise;
    const db = client.db('ejlpt_db');
    const result = await db.collection('attempts').updateOne(
      { attemptId, clerkUserId: user.id },
      { $setOnInsert: document },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      insertedId: result.upsertedId,
      alreadyExists: result.upsertedCount === 0,
      message: 'Résultat d’examen enregistré avec succès dans MongoDB Atlas!',
    });
  } catch (error: unknown) {
    console.error('Error saving attempt to MongoDB Atlas:', error);
    const message = error instanceof Error ? error.message : 'Erreur lors de la sauvegarde MongoDB';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentification requise.', attempts: [] },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db('ejlpt_db');

    const attempts = await db
      .collection('attempts')
      .find({ clerkUserId: user.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    return NextResponse.json({ success: true, attempts });
  } catch (error: unknown) {
    console.error('Error fetching attempts from MongoDB Atlas:', error);
    const message = error instanceof Error ? error.message : 'Erreur serveur MongoDB';
    return NextResponse.json({ success: false, error: message, attempts: [] }, { status: 500 });
  }
}
