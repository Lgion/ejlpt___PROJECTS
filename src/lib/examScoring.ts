import type { ExamPresetMode, ExamResult, JLPTLevel, JLPTQuestion, JLPTScoringDomain } from '@/types/jlpt';

export const POINTS_PER_QUESTION = 20;
export const SECTION_PASS_RATIO = 0.31;
export const OVERALL_PASS_RATIO = 0.5;
export const JLPT_180_DOMAIN_MAX = 60;
export const JLPT_180_DOMAIN_PASS = 19;
export const JLPT_180_TOTAL_PASS = 95;

export interface ComputeExamResultInput {
  level: JLPTLevel;
  mode: 'FULL_MOCK' | 'SECTION_PRACTICE';
  questions: JLPTQuestion[];
  answers: Record<string, string>;
  timeSpentSeconds: number;
  attemptId?: string;
  createdAt?: string;
  scoringScale?: 'RAW' | 'JLPT_180';
  presetMode?: ExamPresetMode;
}

function resolveScoringDomain(question: JLPTQuestion): JLPTScoringDomain {
  if (question.scoringDomain) return question.scoringDomain;
  if (question.section === 'moji_go') return 'vocab';
  if (question.section === 'choukai') return 'listening';
  return 'reading';
}

/**
 * Pure JLPT scoring calculator supporting both legacy RAW scoring (20 pts/question)
 * and official scaled JLPT_180 scoring (Language Knowledge /60 + Reading /60 + Listening /60).
 */
export function computeExamResult({
  level,
  mode,
  questions,
  answers,
  timeSpentSeconds,
  attemptId,
  createdAt,
  scoringScale = 'RAW',
  presetMode,
}: ComputeExamResultInput): ExamResult {
  if (scoringScale === 'JLPT_180') {
    let vocabCorrect = 0;
    let vocabTotal = 0;
    let grammarCorrect = 0;
    let grammarTotal = 0;
    let readingCorrect = 0;
    let readingTotal = 0;
    let listeningCorrect = 0;
    let listeningTotal = 0;

    for (const q of questions) {
      const domain = resolveScoringDomain(q);
      const isCorrect = answers[q.id] === q.correctOptionId;
      if (domain === 'vocab') {
        vocabTotal += 1;
        if (isCorrect) vocabCorrect += 1;
      } else if (domain === 'grammar') {
        grammarTotal += 1;
        if (isCorrect) grammarCorrect += 1;
      } else if (domain === 'reading') {
        readingTotal += 1;
        if (isCorrect) readingCorrect += 1;
      } else {
        listeningTotal += 1;
        if (isCorrect) listeningCorrect += 1;
      }
    }

    const langTotal = vocabTotal + grammarTotal;
    const langCorrect = vocabCorrect + grammarCorrect;

    const languageKnowledgeMax = langTotal > 0 ? JLPT_180_DOMAIN_MAX : 0;
    const languageKnowledgeScore =
      langTotal > 0 ? Math.round((langCorrect / langTotal) * JLPT_180_DOMAIN_MAX) : 0;
    const readingMax = readingTotal > 0 ? JLPT_180_DOMAIN_MAX : 0;
    const readingScore =
      readingTotal > 0 ? Math.round((readingCorrect / readingTotal) * JLPT_180_DOMAIN_MAX) : 0;
    const listeningMax = listeningTotal > 0 ? JLPT_180_DOMAIN_MAX : 0;
    const listeningScore =
      listeningTotal > 0 ? Math.round((listeningCorrect / listeningTotal) * JLPT_180_DOMAIN_MAX) : 0;

    const passedLanguageKnowledge =
      languageKnowledgeMax === 0 || languageKnowledgeScore >= JLPT_180_DOMAIN_PASS;
    const passedReading = readingMax === 0 || readingScore >= JLPT_180_DOMAIN_PASS;
    const passedListening = listeningMax === 0 || listeningScore >= JLPT_180_DOMAIN_PASS;

    const scoreTotal = languageKnowledgeScore + readingScore + listeningScore;
    const maxScoreTotal = languageKnowledgeMax + readingMax + listeningMax;
    const requiredTotal =
      maxScoreTotal === 180
        ? JLPT_180_TOTAL_PASS
        : Math.ceil((JLPT_180_TOTAL_PASS / 180) * maxScoreTotal);

    const passed =
      maxScoreTotal > 0 &&
      scoreTotal >= requiredTotal &&
      passedLanguageKnowledge &&
      passedReading &&
      passedListening;

    return {
      attemptId: attemptId || `attempt_${Date.now()}`,
      level,
      mode,
      presetMode,
      scoringScale: 'JLPT_180',
      passed,
      scoreTotal,
      maxScoreTotal,
      scoreMojiGo: languageKnowledgeScore,
      maxScoreMojiGo: languageKnowledgeMax,
      scoreBunpouDokkai: readingScore,
      maxScoreBunpouDokkai: readingMax,
      scoreChoukai: listeningScore,
      maxScoreChoukai: listeningMax,
      passedMojiGo: passedLanguageKnowledge,
      passedBunpouDokkai: passedReading,
      passedChoukai: passedListening,
      officialBreakdown: {
        languageKnowledgeScore,
        languageKnowledgeMax,
        readingScore,
        readingMax,
        listeningScore,
        listeningMax,
        passedLanguageKnowledge,
        passedReading,
        passedListening,
        vocabCorrect,
        vocabTotal,
        grammarCorrect,
        grammarTotal,
        readingCorrect,
        readingTotal,
        listeningCorrect,
        listeningTotal,
      },
      timeSpentSeconds: Math.max(0, timeSpentSeconds),
      answers,
      createdAt: createdAt || new Date().toISOString(),
    };
  }

  let scoreMojiGo = 0;
  let maxMojiGo = 0;
  let scoreBunpouDokkai = 0;
  let maxBunpouDokkai = 0;
  let scoreChoukai = 0;
  let maxChoukai = 0;

  for (const q of questions) {
    const isCorrect = answers[q.id] === q.correctOptionId;
    if (q.section === 'moji_go') {
      maxMojiGo += POINTS_PER_QUESTION;
      if (isCorrect) scoreMojiGo += POINTS_PER_QUESTION;
    } else if (q.section === 'bunpou_dokkai') {
      maxBunpouDokkai += POINTS_PER_QUESTION;
      if (isCorrect) scoreBunpouDokkai += POINTS_PER_QUESTION;
    } else if (q.section === 'choukai') {
      maxChoukai += POINTS_PER_QUESTION;
      if (isCorrect) scoreChoukai += POINTS_PER_QUESTION;
    }
  }

  const totalScore = scoreMojiGo + scoreBunpouDokkai + scoreChoukai;
  const maxTotalScore = maxMojiGo + maxBunpouDokkai + maxChoukai;

  const passedMojiGo = maxMojiGo === 0 || scoreMojiGo / maxMojiGo >= SECTION_PASS_RATIO;
  const passedBunpouDokkai =
    maxBunpouDokkai === 0 || scoreBunpouDokkai / maxBunpouDokkai >= SECTION_PASS_RATIO;
  const passedChoukai = maxChoukai === 0 || scoreChoukai / maxChoukai >= SECTION_PASS_RATIO;

  const overallRatio = maxTotalScore > 0 ? totalScore / maxTotalScore : 0;
  const passedOverall =
    maxTotalScore > 0 &&
    overallRatio >= OVERALL_PASS_RATIO &&
    passedMojiGo &&
    passedBunpouDokkai &&
    passedChoukai;

  return {
    attemptId: attemptId || `attempt_${Date.now()}`,
    level,
    mode,
    passed: passedOverall,
    scoreTotal: Math.round(totalScore),
    maxScoreTotal: maxTotalScore,
    scoreMojiGo: Math.round(scoreMojiGo),
    maxScoreMojiGo: maxMojiGo,
    scoreBunpouDokkai: Math.round(scoreBunpouDokkai),
    maxScoreBunpouDokkai: maxBunpouDokkai,
    scoreChoukai: Math.round(scoreChoukai),
    maxScoreChoukai: maxChoukai,
    passedMojiGo,
    passedBunpouDokkai,
    passedChoukai,
    timeSpentSeconds: Math.max(0, timeSpentSeconds),
    answers,
    createdAt: createdAt || new Date().toISOString(),
  };
}

