// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractBasicPdfText } from '@/lib/pdfExtractor';
import { POST as parsePdfPost } from '@/app/api/reader/parse-pdf/route';
import { POST as extractPromptPost } from '@/app/api/reader/extract/route';

describe('Phase 7 API routes: /api/reader/parse-pdf & /api/reader/extract', () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  const originalModels = process.env.GEMINI_MODEL;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.GEMINI_API_KEY = originalKey;
    process.env.GEMINI_MODEL = originalModels;
    vi.restoreAllMocks();
  });

  it('extracts literal text from uncompressed PDF stream and validates empty/huge payloads', async () => {
    const samplePdf = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Length 64 >>\nstream\nBT (日本語のテスト文です — N4 script sample) Tj ET\nendstream\nendobj',
      'utf8'
    );
    const extracted = extractBasicPdfText(samplePdf);
    expect(extracted).toContain('日本語のテスト文です');

    const emptyReq = new Request('http://localhost:3000/api/reader/parse-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Pdf: '' }),
    });
    expect((await parsePdfPost(emptyReq)).status).toBe(400);

    const localReq = new Request('http://localhost:3000/api/reader/parse-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Pdf: samplePdf.toString('base64') }),
    });
    const localRes = await parsePdfPost(localReq);
    expect(localRes.status).toBe(200);
    const localBody = (await localRes.json()) as { ok: boolean; method: string; text: string };
    expect(localBody.ok).toBe(true);
    expect(localBody.method).toBe('local_stream');
  });

  it('moderates prompt and returns extracted vocabulary JSON without secret leaks', async () => {
    process.env.GEMINI_API_KEY = 'secret-reader-key-777';
    process.env.GEMINI_MODEL = 'gemini-3.5-flash-lite';

    const badPromptReq = new Request('http://localhost:3000/api/reader/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '日本語の本', prompt: 'x' }),
    });
    expect((await extractPromptPost(badPromptReq)).status).toBe(400);

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify([
                      {
                        term: '図書館',
                        reading: 'としょかん',
                        meaningFr: 'bibliothèque',
                        jlpt: 'N5',
                        reasonFr: 'Lieu fréquent',
                      },
                    ]),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    ) as unknown as typeof fetch;

    const req = new Request('http://localhost:3000/api/reader/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '毎日図書館で本を読みます。',
        prompt: 'Extrais les lieux importants',
        targetLevel: 'N5',
      }),
    });

    const res = await extractPromptPost(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      items: Array<{ term: string; reading: string }>;
    };
    expect(body.ok).toBe(true);
    expect(body.items[0].term).toBe('図書館');
    expect(JSON.stringify(body)).not.toContain('secret-reader-key-777');
  });
});
