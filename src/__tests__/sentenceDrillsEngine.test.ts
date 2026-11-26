import { describe, expect, it } from 'vitest';
import {
  checkDrillAnswer,
  conjugateJapaneseVerb,
  normalizeJapaneseAnswer,
} from '@/lib/sentenceDrillsEngine';
import {
  INCREMENTAL_BUILDER_EXERCISES,
  OFFICIAL_SENTENCE_DRILLS,
} from '@/data/sentenceDrillsSeed';
import {
  mergeExerciseCollections,
  type CollectionExerciseItem,
  type ExerciseDrillMode,
} from '@/lib/exerciseCollections';

describe('sentenceDrillsEngine & Category 1 drills seed', () => {
  it('conjugates Ichidan, Godan (including 行く and -う), and Irregular verbs accurately', () => {
    const taberu = conjugateJapaneseVerb('食べる', 'ichidan');
    expect(taberu.polite).toBe('食べます');
    expect(taberu.passive).toBe('食べられる');
    expect(taberu.ba).toBe('食べれば');
    expect(taberu.tara).toBe('食べたら');
    expect(taberu.imperative).toBe('食べろ');
    expect(taberu.prohibitive).toBe('食べるな');
    expect(taberu.casualTeIru).toBe('食べてる');

    const kau = conjugateJapaneseVerb('買う', 'godan');
    expect(kau.negative).toBe('買わない');
    expect(kau.passive).toBe('買われる');
    expect(kau.te).toBe('買って');

    const kaku = conjugateJapaneseVerb('書く', 'godan');
    expect(kaku.passive).toBe('書かれる');
    expect(kaku.imperative).toBe('書け');

    const iku = conjugateJapaneseVerb('行く', 'godan');
    expect(iku.te).toBe('行って');
    expect(iku.tara).toBe('行ったら');

    const suru = conjugateJapaneseVerb('招待する', 'irregular');
    expect(suru.passive).toBe('招待される');
    expect(suru.polite).toBe('招待します');

    const kuru = conjugateJapaneseVerb('来る', 'irregular');
    expect(kuru.passive).toBe('来られる');
    expect(kuru.imperative).toBe('来い');
  });

  it('normalizes Japanese and romaji answers cleanly', () => {
    expect(normalizeJapaneseAnswer(' 毎日 水を飲みます。 ')).toBe('毎日水を飲みます');
    expect(checkDrillAnswer('nomimasu', ['のみます'])).toBe(true);
    expect(checkDrillAnswer('食べられた！', ['食べられた'])).toBe(true);
    expect(checkDrillAnswer('wrong', ['食べられた'])).toBe(false);
  });

  it('covers all 8 Category 1 modes in OFFICIAL_SENTENCE_DRILLS and 5 levels in INCREMENTAL_BUILDER_EXERCISES', () => {
    const expectedModes: ExerciseDrillMode[] = [
      'polite_transform',
      'particles',
      'sentence_builder',
      'error_correction',
      'ukemikei',
      'conditional_imperative',
      'polite_to_casual',
      'double_particles',
    ];

    for (const m of expectedModes) {
      const items = OFFICIAL_SENTENCE_DRILLS.filter((d) => d.mode === m);
      expect(items.length).toBeGreaterThanOrEqual(5);
    }

    expect(INCREMENTAL_BUILDER_EXERCISES.map((e) => e.level)).toEqual([
      'N5',
      'N4',
      'N3',
      'N2',
      'N1',
    ]);
    for (const ex of INCREMENTAL_BUILDER_EXERCISES) {
      expect(ex.steps).toHaveLength(4);
    }
  });

  it('merges official drills with ai_generated and community pools cleanly', () => {
    const mockAi: CollectionExerciseItem = {
      id: 'ai-uk-1',
      fingerprint: 'fp-ai-uk-1',
      source: 'ai_generated',
      mode: 'ukemikei',
      level: 'N4',
      prompt: 'Mettez 飲む au passif',
      expectedAnswers: ['飲まれる'],
      explanation: 'Godan en -む → 飲まれる.',
      status: 'active',
      createdAt: '2026-11-26T12:00:00.000Z',
    };

    const merged = mergeExerciseCollections({
      pools: {
        official: OFFICIAL_SENTENCE_DRILLS,
        ai_generated: [mockAi],
        community: [],
      },
      enabledSources: ['official', 'ai_generated', 'community'],
      mode: 'ukemikei',
      level: 'N4',
      shuffleFn: (arr) => arr,
    });

    expect(merged.some((m) => m.id === 'ai-uk-1')).toBe(true);
    expect(merged.some((m) => m.source === 'official')).toBe(true);
  });
});
