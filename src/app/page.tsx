'use client';

import React, { useEffect, useState } from 'react';
import { EXAM_CATALOG_MANIFEST } from '@/data/examCatalog';
import { ExamSessionConfig, JLPTExam, JLPTLevel } from '@/types/jlpt';
import { ExamRunner } from '@/components/ExamRunner';
import { HomeHero } from '@/components/home/HomeHero';
import { ExamCatalog } from '@/components/home/ExamCatalog';
import { RecentAttemptsList } from '@/components/home/RecentAttemptsList';
import type { ExamAttemptBadgeSummary } from '@/components/exam/ExamMixerModal';
import { localDb, LocalExamAttempt } from '@/lib/db';

function inferExamIdFromAttempt(att: LocalExamAttempt): string | undefined {
  if (att.examId) return att.examId;
  if (att.title.includes('Mixte') || att.title.includes('#2')) return undefined;
  const lvl = att.level?.toLowerCase() as Lowercase<JLPTLevel> | undefined;
  if (lvl) return `exam-${lvl}-official-2018`;
  return undefined;
}

export default function HomePage() {
  const [selectedExam, setSelectedExam] = useState<JLPTExam | null>(null);
  const [selectedMode, setSelectedMode] = useState<'FULL_MOCK' | 'SECTION_PRACTICE'>('FULL_MOCK');
  const [selectedSection, setSelectedSection] = useState<
    'moji_go' | 'bunpou_dokkai' | 'choukai' | undefined
  >(undefined);
  const [sessionConfig, setSessionConfig] = useState<ExamSessionConfig | undefined>(undefined);
  const [recentAttempts, setRecentAttempts] = useState<LocalExamAttempt[]>([]);
  const [attemptSummaries, setAttemptSummaries] = useState<
    Record<string, ExamAttemptBadgeSummary>
  >({});

  useEffect(() => {
    const loadDexieAttempts = async () => {
      try {
        const list = await localDb.attempts.orderBy('createdAt').reverse().limit(50).toArray();
        setRecentAttempts(list.slice(0, 5));

        const summaries: Record<string, ExamAttemptBadgeSummary> = {};
        for (const att of list) {
          const eid = inferExamIdFromAttempt(att);
          if (!eid) continue;
          const prev = summaries[eid];
          if (!prev) {
            summaries[eid] = {
              attempts: 1,
              bestScore: att.scoreTotal,
              maxScore: att.maxScoreTotal || 180,
              passed: att.passed,
            };
          } else {
            summaries[eid] = {
              attempts: prev.attempts + 1,
              bestScore: Math.max(prev.bestScore, att.scoreTotal),
              maxScore: att.maxScoreTotal || prev.maxScore,
              passed: prev.passed || att.passed,
            };
          }
        }
        setAttemptSummaries(summaries);
      } catch (err) {
        console.error('Dexie fetch error:', err);
      }
    };
    void loadDexieAttempts();
  }, [selectedExam]);

  const handleStartExam = (
    exam: JLPTExam,
    mode: 'FULL_MOCK' | 'SECTION_PRACTICE',
    section?: 'moji_go' | 'bunpou_dokkai' | 'choukai',
    config?: ExamSessionConfig
  ) => {
    setSelectedExam(exam);
    setSelectedMode(mode);
    setSelectedSection(section);
    setSessionConfig(config);
  };

  if (selectedExam) {
    return (
      <ExamRunner
        exam={selectedExam}
        mode={selectedMode}
        sectionFilter={selectedSection}
        sessionConfig={sessionConfig}
        onExit={() => {
          setSelectedExam(null);
          setSessionConfig(undefined);
        }}
      />
    );
  }

  return (
    <div className="home-page">
      <HomeHero />
      <ExamCatalog
        catalog={EXAM_CATALOG_MANIFEST}
        attemptSummaries={attemptSummaries}
        selectedMode={selectedMode}
        onModeChange={setSelectedMode}
        onStartExam={handleStartExam}
      />
      <RecentAttemptsList attempts={recentAttempts} />
    </div>
  );
}
