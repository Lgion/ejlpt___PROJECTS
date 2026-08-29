'use client';

import React, { useState, useEffect } from 'react';
import { MOCK_EXAMS } from '@/data/mockExams';
import { JLPTExam } from '@/types/jlpt';
import { ExamRunner } from '@/components/ExamRunner';
import { localDb, LocalExamAttempt } from '@/lib/db';
import { GraduationCap, Play, Target, Clock, Award, Flame, Layers, Sparkles, Volume2, BookOpen, FileText } from 'lucide-react';

export default function HomePage() {
  const [selectedExam, setSelectedExam] = useState<JLPTExam | null>(null);
  const [selectedMode, setSelectedMode] = useState<'FULL_MOCK' | 'SECTION_PRACTICE'>('FULL_MOCK');
  const [selectedSection, setSelectedSection] = useState<'moji_go' | 'bunpou_dokkai' | 'choukai' | undefined>(undefined);
  const [recentAttempts, setRecentAttempts] = useState<LocalExamAttempt[]>([]);

  useEffect(() => {
    // Load recent attempts from Dexie.js
    const loadDexieAttempts = async () => {
      try {
        const list = await localDb.attempts.orderBy('createdAt').reverse().limit(5).toArray();
        setRecentAttempts(list);
      } catch (err) {
        console.error('Dexie fetch error:', err);
      }
    };
    loadDexieAttempts();
  }, [selectedExam]);

  const handleStartExam = (exam: JLPTExam, mode: 'FULL_MOCK' | 'SECTION_PRACTICE', section?: 'moji_go' | 'bunpou_dokkai' | 'choukai') => {
    setSelectedExam(exam);
    setSelectedMode(mode);
    setSelectedSection(section);
  };

  if (selectedExam) {
    return (
      <ExamRunner
        exam={selectedExam}
        mode={selectedMode}
        sectionFilter={selectedSection}
        onExit={() => setSelectedExam(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950 to-slate-950 border border-slate-800 p-8 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col items-start gap-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-800/80 text-sky-400 text-xs font-bold tracking-wide">
            <Sparkles className="w-4 h-4" />
            <span>Simulations d&apos;Examens JLPT N5 〜 N1</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Passez vos simulations du <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">JLPT en conditions réelles</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Évaluez votre niveau d&apos;examen complet avec chronomètre strict et barème officiel, ou entraînez-vous par épreuve spécifique (Vocabulaire, Grammaire, Écoute Choukai).
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {['N5', 'N4', 'N3', 'N2', 'N1'].map(lvl => (
              <span key={lvl} className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-xs font-bold text-slate-200">
                JLPT {lvl}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Mode Selection Tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-sky-400" />
              Choisissez votre Epreuve & Niveau
            </h2>
            <p className="text-xs text-slate-400">Sélectionnez le mode d&apos;examen qui correspond à vos objectifs de révision</p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setSelectedMode('FULL_MOCK')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                selectedMode === 'FULL_MOCK'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Examen Blanc Complet
            </button>
            <button
              onClick={() => setSelectedMode('SECTION_PRACTICE')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                selectedMode === 'SECTION_PRACTICE'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Entraînement Modulaire
            </button>
          </div>
        </div>

        {/* JLPT Exam Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_EXAMS.map(exam => (
            <div
              key={exam.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-6 shadow-xl flex flex-col justify-between gap-6 transition-all hover:shadow-2xl hover:shadow-sky-950/40 group"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shadow-lg shadow-sky-600/20 group-hover:scale-110 transition-transform">
                    {exam.level}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800 font-mono">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>{exam.totalTimeMinutes} min</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-100 group-hover:text-sky-300 transition-colors">
                    {exam.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                    {exam.description}
                  </p>
                </div>

                {/* Section pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {exam.sections.map(sec => (
                    <span
                      key={sec.type}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800"
                    >
                      {sec.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-4 border-t border-slate-800/80">
                {selectedMode === 'FULL_MOCK' ? (
                  <button
                    onClick={() => handleStartExam(exam, 'FULL_MOCK')}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/30 transition-all"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Lancer la Simulation ({exam.level})
                  </button>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => handleStartExam(exam, 'SECTION_PRACTICE', 'moji_go')}
                      className="py-2 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors text-center truncate border border-slate-700"
                      title="Vocabulaire (文字・語彙)"
                    >
                      Vocab
                    </button>
                    <button
                      onClick={() => handleStartExam(exam, 'SECTION_PRACTICE', 'bunpou_dokkai')}
                      className="py-2 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors text-center truncate border border-slate-700"
                      title="Grammaire / Lecture (文法・読解)"
                    >
                      Gramm.
                    </button>
                    <button
                      onClick={() => handleStartExam(exam, 'SECTION_PRACTICE', 'choukai')}
                      className="py-2 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors text-center truncate border border-slate-700"
                      title="Écoute (聴解)"
                    >
                      Écoute
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Attempts list from Dexie IndexedDB */}
      {recentAttempts.length > 0 && (
        <section className="flex flex-col gap-4 pt-4 border-t border-slate-800">
          <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-400" />
            Dernières Simulations Passées (Dexie LocalDB)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentAttempts.map(att => (
              <div key={att.attemptId} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs ${att.passed ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
                    {att.level}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{att.title}</h4>
                    <p className="text-[10px] text-slate-400">
                      {new Date(att.createdAt).toLocaleDateString('fr-FR')} • {att.mode === 'FULL_MOCK' ? 'Examen Blanc' : 'Partiel'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-sm font-bold ${att.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {att.scoreTotal} / {att.maxScoreTotal} pts
                  </div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500">
                    {att.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
