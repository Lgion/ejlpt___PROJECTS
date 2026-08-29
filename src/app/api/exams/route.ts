import { NextResponse } from 'next/server';
import { MOCK_EXAMS } from '@/data/mockExams';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get('level');

  if (level) {
    const filtered = MOCK_EXAMS.filter(e => e.level.toUpperCase() === level.toUpperCase());
    return NextResponse.json({ success: true, exams: filtered });
  }

  return NextResponse.json({ success: true, exams: MOCK_EXAMS });
}
