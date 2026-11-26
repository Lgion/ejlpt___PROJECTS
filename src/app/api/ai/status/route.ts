import { NextResponse } from 'next/server';
import { getAiConfigStatus } from '@/lib/ai/geminiClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    ...getAiConfigStatus(),
  });
}
