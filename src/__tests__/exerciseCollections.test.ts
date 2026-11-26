import { describe, expect, it } from 'vitest';
import {
  computeExerciseFingerprint,
  mergeExerciseCollections,
  validateCollectionSubmission,
  type CollectionExerciseItem,
} from '@/lib/exerciseCollections';

function makeItem(overrides: Partial<CollectionExerciseItem>): CollectionExerciseItem {
  const mode = overrides.mode || 'particles';
  const level = overrides.level || 'N4';
  const prompt = overrides.prompt || '学校（　）行きます。';
  const expectedAnswers = overrides.expectedAnswers || ['へ'];
  return {
    id: overrides.id || 'id-1',
    fingerprint:
      overrides.fingerprint ||
      computeExerciseFingerprint({ mode, level, prompt, expectedAnswers }),
    source: overrides.source || 'official',
    mode,
    level,
    prompt,
    expectedAnswers,
    explanation: overrides.explanation || 'La particule へ indique la direction.',
    status: overrides.status || 'active',
    createdAt: '2026-11-26T10:00:00.000Z',
    ...overrides,
  };
}

describe('exerciseCollections', () => {
  it('merges 1, 2 or 3 collections, filters by level/mode/status, and deduplicates keeping official priority', () => {
    const sharedPrompt = '毎日電車（　）乗ります。';
    const sharedAnswers = ['に'];

    const officialItem = makeItem({
      id: 'off-1',
      source: 'official',
      prompt: sharedPrompt,
      expectedAnswers: sharedAnswers,
    });
    const aiDupItem = makeItem({
      id: 'ai-dup',
      source: 'ai_generated',
      prompt: sharedPrompt,
      expectedAnswers: sharedAnswers,
    });
    const aiUniqueItem = makeItem({
      id: 'ai-2',
      source: 'ai_generated',
      level: 'N4',
      prompt: '友達（　）会います。',
      expectedAnswers: ['に'],
    });
    const communityActive = makeItem({
      id: 'com-1',
      source: 'community',
      level: 'N4',
      prompt: '図書館（　）勉強します。',
      expectedAnswers: ['で'],
    });
    const communityHidden = makeItem({
      id: 'com-hidden',
      source: 'community',
      level: 'N4',
      prompt: 'これは隠された問題です。',
      expectedAnswers: ['は'],
      status: 'hidden',
    });
    const otherLevel = makeItem({
      id: 'com-n1',
      source: 'community',
      level: 'N1',
      prompt: '彼（　）限ってそんなことはしない。',
      expectedAnswers: ['に'],
    });

    const merged = mergeExerciseCollections({
      pools: {
        official: [officialItem],
        ai_generated: [aiDupItem, aiUniqueItem],
        community: [communityActive, communityHidden, otherLevel],
      },
      enabledSources: ['community', 'ai_generated', 'official'],
      level: 'N4',
      mode: 'particles',
      shuffleFn: (arr) => arr,
    });

    expect(merged.map((m) => m.id)).toEqual(['off-1', 'ai-2', 'com-1']);

    const aiOnly = mergeExerciseCollections({
      pools: {
        official: [officialItem],
        ai_generated: [aiDupItem, aiUniqueItem],
        community: [communityActive],
      },
      enabledSources: ['ai_generated'],
      level: 'ALL',
      shuffleFn: (arr) => arr,
    });
    expect(aiOnly.map((m) => m.id)).toEqual(['ai-dup', 'ai-2']);
  });

  it('enforces opt-in consent and moderation on community submissions', () => {
    const noConsent = validateCollectionSubmission({
      source: 'community',
      mode: 'polite_transform',
      level: 'N5',
      prompt: '水を飲む -> poli',
      expectedAnswers: ['水を飲みます'],
      explanation: 'Forme en -masu.',
      consentPublic: false,
    });
    expect(noConsent.ok).toBe(false);

    const officialRejected = validateCollectionSubmission({
      source: 'official',
      mode: 'polite_transform',
      level: 'N5',
      prompt: '水を飲む',
      expectedAnswers: ['水を飲みます'],
      explanation: 'Forme polie.',
    });
    expect(officialRejected.ok).toBe(false);

    const spamRejected = validateCollectionSubmission({
      source: 'community',
      mode: 'particles',
      level: 'N5',
      prompt: 'Achetez sur https://spam.example.com',
      expectedAnswers: ['は'],
      explanation: 'Spam link test.',
      consentPublic: true,
    });
    expect(spamRejected.ok).toBe(false);

    const validCommunity = validateCollectionSubmission({
      source: 'community',
      mode: 'polite_transform',
      level: 'N5',
      prompt: '本を読む（丁寧語にしてください）',
      expectedAnswers: ['本を読みます'],
      explanation: 'Remplacer le suffixe godan -u par -imasu.',
      consentPublic: true,
    });
    expect(validCommunity.ok).toBe(true);
  });
});
