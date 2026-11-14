'use client';

import React, { useState } from 'react';
import { BookOpen, Clock, FileText, Lock, ShieldCheck } from 'lucide-react';
import type { JLPTExamStage, JLPTLevel } from '@/types/jlpt';

interface BookletCoverGateProps {
  level: JLPTLevel;
  stage: JLPTExamStage;
  totalStages: number;
  effectiveMinutes: number;
  isStrictOfficial: boolean;
  previousStageMessage?: string;
  examineeName: string;
  examineeNumber: string;
  onUpdateExaminee: (name: string, number: string) => void;
  onOpenBooklet: () => void;
  theme: 'paper_booklet' | 'dark_ejlpt';
}

export const BookletCoverGate: React.FC<BookletCoverGateProps> = ({
  level,
  stage,
  totalStages,
  effectiveMinutes,
  isStrictOfficial,
  previousStageMessage,
  examineeName,
  examineeNumber,
  onUpdateExaminee,
  onOpenBooklet,
  theme,
}) => {
  const [nameInput, setNameInput] = useState(examineeName);
  const [numberInput, setNumberInput] = useState(examineeNumber);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateExaminee(
      nameInput.trim() || '受験者 (Candidat)',
      numberInput.trim() || 'N3-2018-0001'
    );
    onOpenBooklet();
  };

  const englishSub =
    stage.id === 'stage-vocab'
      ? 'Language Knowledge (Vocabulary)'
      : stage.id === 'stage-grammar-reading'
      ? 'Language Knowledge (Grammar) · Reading'
      : 'Listening';

  const durationDisplay =
    effectiveMinutes === 0
      ? '時間無制限 (Illimité)'
      : stage.nominalMinutes && isStrictOfficial && stage.id === 'stage-listening'
      ? `（${stage.nominalMinutes}分 / piste réelle ~${effectiveMinutes}分）`
      : stage.id === 'stage-vocab'
      ? `（${effectiveMinutes}ぷん）`
      : `（${effectiveMinutes}分）`;

  return (
    <section
      className={`jlpt-cover-gate ${
        theme === 'paper_booklet' ? 'jlpt-theme-paper' : 'jlpt-theme-dark'
      }`}
      aria-labelledby="cover-stage-title"
    >
      {previousStageMessage && (
        <div className="jlpt-cover-gate__intermission" role="status">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <div>
            <strong>Pause entre les épreuves</strong> — {previousStageMessage}
          </div>
        </div>
      )}

      <form onSubmit={handleStart} className="jlpt-booklet-cover">
        <div className="jlpt-booklet-cover__toprow">
          <span className="jlpt-booklet-cover__eng">{englishSub}</span>
          <span className="jlpt-booklet-cover__paperlabel" lang="ja">
            {stage.id === 'stage-vocab' ? 'もんだいようし' : '問題用紙'}
          </span>
        </div>

        <div className="jlpt-booklet-cover__badge-row">
          <span className="jlpt-booklet-cover__step">
            Épreuve {stage.order} / {totalStages}
          </span>
          {isStrictOfficial && (
            <span className="jlpt-booklet-cover__strict-pill">
              <Lock className="w-3.5 h-3.5" /> Conditions Officielles Strictes
            </span>
          )}
        </div>

        <div className="jlpt-booklet-cover__hero" lang="ja">
          <div className="jlpt-booklet-cover__level-circle">{level}</div>
          {stage.titleReadingJp && (
            <p className="jlpt-booklet-cover__ruby-line">{stage.titleReadingJp}</p>
          )}
          <h1 id="cover-stage-title" className="jlpt-booklet-cover__title">
            {stage.titleJp}
          </h1>
          <p className="jlpt-booklet-cover__subtitle-fr">{stage.titleFr}</p>
          <p className="jlpt-booklet-cover__duration">
            <Clock className="w-4 h-4 inline mr-1.5" />
            {durationDisplay}
          </p>
          <p className="jlpt-booklet-cover__meta">
            <FileText className="w-3.5 h-3.5 inline mr-1" />
            {stage.questionRangeLabel} · {stage.pageCount} pages officielles
          </p>
        </div>

        <div className="jlpt-booklet-cover__notes">
          <div className="jlpt-booklet-cover__notes-heading" lang="ja">
            <span>{stage.id === 'stage-vocab' ? 'ちゅうい' : '注意'}</span>
            <span className="jlpt-booklet-cover__notes-eng">Notes</span>
          </div>
          <ol className="jlpt-booklet-cover__notes-list">
            {stage.coverNotes.map((note, idx) => (
              <li key={idx}>
                <p className="jlpt-booklet-cover__note-jp" lang="ja">
                  {note.jp}
                </p>
                <p className="jlpt-booklet-cover__note-en">{note.en}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="jlpt-booklet-cover__candidate-grid">
          <div className="jlpt-booklet-cover__field">
            <label htmlFor="jlpt-reg-number">
              <span lang="ja">受験番号</span> · Examinee Registration Number
            </label>
            <input
              id="jlpt-reg-number"
              type="text"
              value={numberInput}
              onChange={(e) => setNumberInput(e.target.value)}
              maxLength={24}
              className="jlpt-booklet-cover__input"
            />
          </div>
          <div className="jlpt-booklet-cover__field">
            <label htmlFor="jlpt-candidate-name">
              <span lang="ja">名前</span> · Name
            </label>
            <input
              id="jlpt-candidate-name"
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={40}
              className="jlpt-booklet-cover__input"
            />
          </div>
        </div>

        <div className="jlpt-booklet-cover__actions">
          <button type="submit" className="jlpt-booklet-cover__open-btn">
            <BookOpen className="w-5 h-5" />
            <span>
              <span lang="ja">問題用紙を開く（試験開始）</span>
              <span className="jlpt-booklet-cover__btn-sub">
                Ouvrir le cahier d’examen &amp; lancer le chronomètre
                {stage.id === 'stage-listening' ? ' + piste audio' : ''}
              </span>
            </span>
          </button>
        </div>
      </form>
    </section>
  );
};

