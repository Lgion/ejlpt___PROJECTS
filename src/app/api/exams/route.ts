import { NextResponse } from 'next/server';
import {
  EXAM_CATALOG_MANIFEST,
  loadExamById,
  loadExamsByLevel,
} from '@/data/examCatalog';
import type { JLPTLevel } from '@/types/jlpt';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const level = searchParams.get('level');
  const full = searchParams.get('full') === '1';

  if (id) {
    const exam = await loadExamById(id);
    if (!exam) {
      return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, exam });
  }

  if (level) {
    const upperLevel = level.toUpperCase() as JLPTLevel;
    if (full) {
      const exams = await loadExamsByLevel(upperLevel);
      return NextResponse.json({ success: true, exams });
    }
    const entries = EXAM_CATALOG_MANIFEST.filter((e) => e.level === upperLevel);
    return NextResponse.json({ success: true, exams: entries });
  }

  return NextResponse.json({ success: true, exams: EXAM_CATALOG_MANIFEST });
}
