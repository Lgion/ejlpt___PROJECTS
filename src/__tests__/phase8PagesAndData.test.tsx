import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getOfflineDailyNewsForDate, NEWS_JLPT_LEVELS } from '@/lib/newsRss';
import { SEED_PUBLIC_FAQ } from '@/lib/faqModel';
import { CHAT_DISCUSSION_TOPICS } from '@/data/chatTopics';
import { JA_SENSEI_LESSONS } from '@/data/jaSenseiLessons';
import { LEARNING_ORDER_STEPS, OPEN_DATA_CREDITS } from '@/data/learningResources';
import ResourcesPage from '@/app/resources/page';

describe('Phase 8: Todai news, FAQ, AI chat topics, JA Sensei lessons & Resources', () => {
  it('covers N5-N1 across Todai offline seed, chat topics, and JA Sensei lessons', () => {
    const seedNews = getOfflineDailyNewsForDate('2026-11-26');
    for (const lvl of NEWS_JLPT_LEVELS) {
      expect(seedNews.some((a) => a.level === lvl)).toBe(true);
      expect(CHAT_DISCUSSION_TOPICS.some((t) => t.level === lvl)).toBe(true);
      expect(JA_SENSEI_LESSONS.some((l) => l.level === lvl)).toBe(true);
    }

    expect(SEED_PUBLIC_FAQ.length).toBeGreaterThanOrEqual(6);
    expect(LEARNING_ORDER_STEPS.map((s) => s.slug)).toEqual([
      'katakana',
      'hiragana',
      'radicaux',
      'particules',
      'kanji',
    ]);
    const creditIds = OPEN_DATA_CREDITS.map((c) => c.id);
    expect(creditIds).toContain('edict_database');
    expect(creditIds).toContain('japanese-toolkit');
    expect(creditIds).toContain('kanjium');
    expect(creditIds).toContain('kanjiapi.dev');
  });

  it('renders /resources page with recommended 5-step order and runtime open-data credits', () => {
    render(<ResourcesPage />);
    expect(screen.getByText(/Katakana \(カタカナ\) en premier/)).toBeTruthy();
    expect(screen.getByText(/edict_database/)).toBeTruthy();
    expect(screen.getByText(/kanjium/)).toBeTruthy();
    expect(screen.getByText(/japanese-toolkit/)).toBeTruthy();
    expect(screen.getByText(/kanjiapi\.dev/)).toBeTruthy();
  });
});
