export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export type ExamSectionType = 'moji_go' | 'bunpou_dokkai' | 'choukai';

export interface QuestionOption {
  id: string; // "1", "2", "3", "4"
  label: string; // e.g. "たべます", "のみます", etc.
  reading?: string; // Furigana for option if needed
}

export interface EzoeGrammarSegment {
  text: string;
  type: 'subject' | 'particle' | 'verb' | 'adjective' | 'noun' | 'connector' | 'time';
  reading?: string;
  frenchMeaning?: string;
}

export interface JLPTQuestion {
  id: string;
  section: ExamSectionType;
  subCategory: string; // e.g. "Kanji Reading", "Contextual Usage", "Sentence Structure", "Listening Comprehension"
  prompt: string; // e.g. "きのう 図書館で ほんを ______。" or passage context
  readingPassage?: string; // For Dokkai reading comprehension
  audioUrl?: string; // For Choukai listening comprehension
  audioScript?: string; // Japanese transcript for Choukai correction
  options: QuestionOption[];
  correctOptionId: string;
  explanationFr: string; // French explanation of why this answer is correct
  furiganaPrompt?: string; // Prompt formatted with ruby annotations or furigana tags
  ezoeBreakdown?: EzoeGrammarSegment[]; // Ezoe grammar structure breakdown
}

export interface JLPTExam {
  id: string;
  level: JLPTLevel;
  title: string;
  description: string;
  totalTimeMinutes: number;
  sections: {
    type: ExamSectionType;
    name: string;
    description: string;
    timeMinutes: number;
    maxScore: number;
    minPassScore: number;
  }[];
  questions: JLPTQuestion[];
}

export interface ExamResult {
  attemptId: string;
  level: JLPTLevel;
  mode: 'FULL_MOCK' | 'SECTION_PRACTICE';
  passed: boolean;
  scoreTotal: number;
  maxScoreTotal: number;
  scoreMojiGo: number;
  maxScoreMojiGo: number;
  scoreBunpouDokkai: number;
  maxScoreBunpouDokkai: number;
  scoreChoukai: number;
  maxScoreChoukai: number;
  passedMojiGo: boolean;
  passedBunpouDokkai: boolean;
  passedChoukai: boolean;
  timeSpentSeconds: number;
  answers: Record<string, string>;
  createdAt: string;
}
