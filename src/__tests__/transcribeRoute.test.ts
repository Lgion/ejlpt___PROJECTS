// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/ai/transcribe/route';

describe('POST /api/ai/transcribe', () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  const originalModels = process.env.GEMINI_MODEL;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.GEMINI_API_KEY = originalKey;
    process.env.GEMINI_MODEL = originalModels;
    vi.restoreAllMocks();
  });

  it('rejects empty base64Audio with 400', async () => {
    const req = new Request('http://localhost:3000/api/ai/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Audio: '   ', mimeType: 'audio/webm' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toContain('Aucun signal audio');
  });

  it('rejects oversized payload with 413', async () => {
    const huge = 'a'.repeat(8_000_010);
    const req = new Request('http://localhost:3000/api/ai/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Audio: huge, mimeType: 'audio/webm' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it('returns transcript on Gemini audio success and never exposes API keys', async () => {
    process.env.GEMINI_API_KEY = 'secret-test-key-xyz';
    process.env.GEMINI_MODEL = 'gemini-3.5-flash-lite,gemini-3.6-flash';

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'がっこう' }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    ) as unknown as typeof fetch;

    const req = new Request('http://localhost:3000/api/ai/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Audio: 'data:audio/webm;base64,UklGRg==',
        mimeType: 'audio/webm;codecs=opus',
        expectedHint: '学校 (がっこう)',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; transcript: string };
    expect(body.ok).toBe(true);
    expect(body.transcript).toBe('がっこう');
    expect(JSON.stringify(body)).not.toContain('secret-test-key-xyz');
  });
});
