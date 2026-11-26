// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  generateGeminiJson,
  generateGeminiText,
  parseModelChain,
  transcribeJapaneseAudio,
} from '@/lib/ai/geminiClient';

describe('geminiClient', () => {
  it('parses model chain from env string and falls back to default chain when empty', () => {
    expect(parseModelChain('m1, m2 , m1; m3')).toEqual(['m1', 'm2', 'm3']);
    expect(parseModelChain('')).toEqual([
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash',
      'gemini-3.1-pro-preview',
    ]);
  });

  it('succeeds on the first model without retries or fallback events', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'こんにちは' }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const res = await generateGeminiText('Dis bonjour en japonais', {
      apiKey: 'TEST_KEY_123',
      models: ['gemini-primary', 'gemini-backup'],
      fetchImpl: fetchMock as unknown as typeof fetch,
      baseDelayMs: 0,
    });

    expect(res.ok).toBe(true);
    expect(res.data).toBe('こんにちは');
    expect(res.usedFallback).toBe(false);
    expect(res.retriesCount).toBe(0);
    expect(res.events.some((e) => e.phase === 'success')).toBe(true);

    // Ensure key is passed in header, never in URL query string
    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(String(calledUrl)).not.toContain('TEST_KEY_123');
    expect((calledInit?.headers as Record<string, string>)['x-goog-api-key']).toBe('TEST_KEY_123');
  });

  it('retries transient 429/503 errors and falls back to second model with sanitized events', async () => {
    const fetchMock = vi
      .fn()
      // 1st model: initial + 1 retry -> both 429
      .mockResolvedValueOnce(new Response('rate limited SECRET_UPSTREAM_BODY', { status: 429 }))
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      // 2nd model: succeeds
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'Réponse secours OK' }] } }],
          }),
          { status: 200 }
        )
      );

    const res = await generateGeminiText('Explique は vs が', {
      apiKey: 'SECRET_KEY_SHOULD_NOT_LEAK',
      models: ['model-a', 'model-b'],
      maxRetriesPerModel: 1,
      baseDelayMs: 0,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(res.ok).toBe(true);
    expect(res.data).toBe('Réponse secours OK');
    expect(res.usedFallback).toBe(true);
    expect(res.retriesCount).toBe(1);
    expect(res.events.some((e) => e.phase === 'retry')).toBe(true);
    expect(res.events.some((e) => e.phase === 'fallback')).toBe(true);

    const serialized = JSON.stringify(res);
    expect(serialized).not.toContain('SECRET_KEY_SHOULD_NOT_LEAK');
    expect(serialized).not.toContain('SECRET_UPSTREAM_BODY');
  });

  it('fails cleanly when all models fail without leaking key or raw error bodies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('internal raw trace SECRET_KEY_SHOULD_NOT_LEAK', { status: 500 })
    );

    const res = await generateGeminiText('Test saturation', {
      apiKey: 'SECRET_KEY_SHOULD_NOT_LEAK',
      models: ['m1', 'm2'],
      maxRetriesPerModel: 1,
      baseDelayMs: 0,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(res.ok).toBe(false);
    expect(res.usedFallback).toBe(true);
    expect(res.userError).toBeTruthy();
    expect(res.events[res.events.length - 1]?.phase).toBe('failed');

    const serialized = JSON.stringify(res);
    expect(serialized).not.toContain('SECRET_KEY_SHOULD_NOT_LEAK');
    expect(serialized).not.toContain('internal raw trace');
  });

  it('parses JSON wrapped in markdown fences and rejects malformed JSON cleanly', async () => {
    const okFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: '```json\n{"word":"猫","reading":"ねこ"}\n```' }],
              },
            },
          ],
        }),
        { status: 200 }
      )
    );

    const okRes = await generateGeminiJson<{ word: string; reading: string }>('JSON?', {
      apiKey: 'KEY',
      models: ['m1'],
      fetchImpl: okFetch as unknown as typeof fetch,
      baseDelayMs: 0,
    });
    expect(okRes.ok).toBe(true);
    expect(okRes.data).toEqual({ word: '猫', reading: 'ねこ' });

    const badFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'not valid json {' }] } }],
        }),
        { status: 200 }
      )
    );
    const badRes = await generateGeminiJson('JSON?', {
      apiKey: 'KEY',
      models: ['m1'],
      fetchImpl: badFetch as unknown as typeof fetch,
      baseDelayMs: 0,
    });
    expect(badRes.ok).toBe(false);
    expect(badRes.userError).toBeTruthy();
  });

  it('sends inline audio payload for Japanese audio transcription fallback', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '日本語を勉強しています' }] } }],
        }),
        { status: 200 }
      )
    );

    const res = await transcribeJapaneseAudio(
      { base64Audio: 'UklGRg==', mimeType: 'audio/webm', expectedHint: 'N4' },
      {
        apiKey: 'KEY',
        models: ['m1'],
        fetchImpl: fetchMock as unknown as typeof fetch,
        baseDelayMs: 0,
      }
    );

    expect(res.ok).toBe(true);
    expect(res.data).toBe('日本語を勉強しています');
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.contents[0].parts[1]).toEqual({
      inlineData: { mimeType: 'audio/webm', data: 'UklGRg==' },
    });
  });
});
