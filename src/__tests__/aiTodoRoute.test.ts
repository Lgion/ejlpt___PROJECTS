// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/tools/ai-todo/route';

describe('POST /api/tools/ai-todo', () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  const originalModels = process.env.GEMINI_MODEL;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.GEMINI_API_KEY = originalKey;
    process.env.GEMINI_MODEL = originalModels;
    vi.restoreAllMocks();
  });

  it('rejects moderated customNote with 400', async () => {
    const req = new Request('http://localhost:3000/api/tools/ai-todo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'N4',
        minutesPerDay: 30,
        customNote: 'Visit http://spam.example.com http://spam2.example.com now',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(false);
  });

  it('returns sanitized study todos with allowed internal hrefs and zero secret leaks', async () => {
    process.env.GEMINI_API_KEY = 'secret-todo-key-999';
    process.env.GEMINI_MODEL = 'gemini-3.5-flash-lite';

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
                        title: 'Revoir 10 verbes 自動詞 / 他動詞',
                        category: 'Grammaire',
                        estimatedMinutes: 15,
                        href: '/practice?tab=interactive',
                      },
                      {
                        title: 'Lien externe à bloquer',
                        category: 'Test',
                        estimatedMinutes: 10,
                        href: 'https://evil.example.com/phish',
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

    const req = new Request('http://localhost:3000/api/tools/ai-todo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'N4',
        minutesPerDay: 30,
        focusAreas: ['Kanji', 'Grammaire'],
        customNote: 'Je confonds souvent は et が.',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      items: Array<{ title: string; href: string }>;
    };
    expect(body.ok).toBe(true);
    expect(body.items).toHaveLength(2);
    expect(body.items[0].href).toBe('/practice?tab=interactive');
    expect(body.items[1].href).toBe('/practice');
    expect(JSON.stringify(body)).not.toContain('secret-todo-key-999');
  });
});
