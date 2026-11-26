// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTodayUtcDateKey, parseRssXmlItems } from '@/lib/newsRss';
import { computeFaqSimilarity, findSimilarFaqQuestions, SEED_PUBLIC_FAQ } from '@/lib/faqModel';

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn().mockResolvedValue(null),
}));

import { GET as cronDailyNewsGet } from '@/app/api/cron/daily-news/route';
import { POST as chatSessionPost } from '@/app/api/chat/session/route';

describe('Phase 8 API routes & helpers', () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  const originalModels = process.env.GEMINI_MODEL;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.GEMINI_API_KEY = originalKey;
    process.env.GEMINI_MODEL = originalModels;
    vi.restoreAllMocks();
  });

  it('parses RSS XML items safely and formats UTC date keys', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" ?>
      <rss><channel>
        <item>
          <title><![CDATA[東京都内で新しい図書館が開館]]></title>
          <link>https://www3.nhk.or.jp/news/html/123.html</link>
          <description><![CDATA[市民向けの新しい施設がオープンしました。]]></description>
          <pubDate>Thu, 26 Nov 2026 05:00:00 +0900</pubDate>
        </item>
      </channel></rss>`;
    const items = parseRssXmlItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('東京都内で新しい図書館が開館');
    expect(getTodayUtcDateKey(new Date('2026-11-26T12:00:00Z'))).toBe('2026-11-26');
  });

  it('guards /api/cron/daily-news with 401 when unauthorized', async () => {
    const req = new Request('http://localhost:3000/api/cron/daily-news');
    const res = await cronDailyNewsGet(req);
    expect(res.status).toBe(401);
  });

  it('detects similar FAQ duplicates and handles bounded AI chat replies without secret leaks', async () => {
    expect(
      computeFaqSimilarity(
        'Quelle est la différence entre は et が ?',
        'Quelle est la vraie différence entre は (wa) et が (ga) ?'
      )
    ).toBeGreaterThan(0.5);

    const dupes = findSimilarFaqQuestions(
      'Différence entre は (wa) et が (ga) en japonais',
      SEED_PUBLIC_FAQ
    );
    expect(dupes.length).toBeGreaterThanOrEqual(1);

    const blockedReq = new Request('http://localhost:3000/api/chat/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reply', level: 'N5', userMessage: 'http://spam.com http://spam2.com' }),
    });
    expect((await chatSessionPost(blockedReq)).status).toBe(400);

    process.env.GEMINI_API_KEY = 'secret-chat-key-444';
    process.env.GEMINI_MODEL = 'gemini-3.5-flash-lite';
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      replyJa: 'いいですね！コーヒーを一つどうぞ。',
                      readingHira: 'いいですね！こーひーを ひとつ どうぞ。',
                      translationFr: 'Très bien ! Voici un café pour vous.',
                      feedbackFr: 'Excellente utilisation de を ください !',
                      followUpJa: 'お砂糖はいりますか。',
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    ) as unknown as typeof fetch;

    const okReq = new Request('http://localhost:3000/api/chat/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reply',
        level: 'N5',
        topicTitle: 'Commander au café',
        userMessage: 'コーヒーを一つください。',
      }),
    });
    const okRes = await chatSessionPost(okReq);
    expect(okRes.status).toBe(200);
    const body = (await okRes.json()) as { ok: boolean; turn: { replyJa: string } };
    expect(body.ok).toBe(true);
    expect(body.turn.replyJa).toContain('コーヒー');
    expect(JSON.stringify(body)).not.toContain('secret-chat-key-444');
  });
});
