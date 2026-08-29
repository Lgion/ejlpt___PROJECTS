import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { currentUser } from '@clerk/nextjs/server';
import { isAdminEmail } from '@/lib/admin';

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress;

    if (!isAdminEmail(userEmail)) {
      return NextResponse.json(
        { success: false, error: 'Accès refusé : Droits administrateur (EMAIL_ADMIN) requis.' },
        { status: 403 }
      );
    }

    const client = await clientPromise;
    const db = client.db('ejlpt_db');

    const attemptsCollection = db.collection('attempts');
    const totalAttempts = await attemptsCollection.countDocuments();
    const passedAttempts = await attemptsCollection.countDocuments({ passed: true });
    
    // Group by level stats
    const levelStats = await attemptsCollection.aggregate([
      {
        $group: {
          _id: '$level',
          count: { $sum: 1 },
          passedCount: { $sum: { $cond: ['$passed', 1, 0] } },
          avgScore: { $avg: '$scoreTotal' },
        },
      },
    ]).toArray();

    const recentAttempts = await attemptsCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    return NextResponse.json({
      success: true,
      userEmail,
      stats: {
        totalAttempts,
        passedAttempts,
        passRate: totalAttempts > 0 ? ((passedAttempts / totalAttempts) * 100).toFixed(1) + '%' : '0%',
        levelStats,
        recentAttempts,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur serveur MongoDB' },
      { status: 500 }
    );
  }
}
