import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    const body = await request.json();

    const {
      attemptId,
      level,
      mode,
      sectionFilter,
      title,
      scoreTotal,
      maxScoreTotal,
      scoreMojiGo,
      scoreBunpouDokkai,
      scoreChoukai,
      passed,
      userAnswers,
      timeSpentSeconds,
      createdAt,
    } = body;

    const document = {
      attemptId: attemptId || `attempt_${Date.now()}`,
      clerkUserId: user?.id || 'anonymous',
      userEmail: user?.primaryEmailAddress?.emailAddress || body.userEmail || 'anonymous@ejlpt.local',
      userName: user?.fullName || 'Apprenant eJLPT',
      level,
      mode,
      sectionFilter,
      title,
      scoreTotal,
      maxScoreTotal,
      scoreMojiGo,
      scoreBunpouDokkai,
      scoreChoukai,
      passed,
      userAnswers,
      timeSpentSeconds,
      createdAt: createdAt || new Date().toISOString(),
      syncedAt: new Date().toISOString(),
    };

    // Save to MongoDB Atlas database
    const client = await clientPromise;
    const db = client.db('ejlpt_db');
    const result = await db.collection('attempts').insertOne(document);

    return NextResponse.json({
      success: true,
      insertedId: result.insertedId,
      message: 'Résultat d’examen enregistré avec succès dans MongoDB Atlas!',
    });
  } catch (error: any) {
    console.error('Error saving attempt to MongoDB Atlas:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la sauvegarde MongoDB' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    const client = await clientPromise;
    const db = client.db('ejlpt_db');

    const query = user?.id ? { clerkUserId: user.id } : {};
    const attempts = await db.collection('attempts').find(query).sort({ createdAt: -1 }).limit(20).toArray();

    return NextResponse.json({ success: true, attempts });
  } catch (error: any) {
    console.error('Error fetching attempts from MongoDB Atlas:', error);
    return NextResponse.json({ success: false, attempts: [] });
  }
}
