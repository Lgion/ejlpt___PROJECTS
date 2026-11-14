'use client';

import React, { useState, useEffect } from 'react';
import { MOCK_EXAMS } from '@/data/mockExams';
import { ExamSessionConfig, JLPTExam } from '@/types/jlpt';
import { ExamRunner } from '@/components/ExamRunner';
import { HomeHero } from '@/components/home/HomeHero';
import { ExamCatalog } from '@/components/home/ExamCatalog';
import { RecentAttemptsList } from '@/components/home/RecentAttemptsList';
import { localDb, LocalExamAttempt } from '@/lib/db';

export default function HomePage() {
  const [selectedExam, setSelectedExam] = useState<JLPTExam | null>(null);
  const [selectedMode, setSelectedMode] = useState<'FULL_MOCK' | 'SECTION_PRACTICE'>('FULL_MOCK');
  const [selectedSection, setSelectedSection] = useState<
    'moji_go' | 'bunpou_dokkai' | 'choukai' | undefined
  >(undefined);
  const [sessionConfig, setSessionConfig] = useState<ExamSessionConfig | undefined>(undefined);
  const [recentAttempts, setRecentAttempts] = useState<LocalExamAttempt[]>([]);

  useEffect(() => {
    const loadDexieAttempts = async () => {
      try {
        const list = await localDb.attempts.orderBy('createdAt').reverse().limit(5).toArray();
        setRecentAttempts(list);
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
        exams={MOCK_EXAMS}
        selectedMode={selectedMode}
        onModeChange={setSelectedMode}
        onStartExam={handleStartExam}
      />
      <RecentAttemptsList attempts={recentAttempts} />
    </div>
  );
}
