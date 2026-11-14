export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export type ExamSectionType = 'moji_go' | 'bunpou_dokkai' | 'choukai';

export interface QuestionOption {
  id: string; // "1", "2", "3", "4"
  label: string; // e.g. "たべます", "のみます", etc.
  reading?: string; // Furigana for option if needed
  tokens?: RichTextToken[]; // Selective furigana/underline tokens
}

export type JLPTQuestionArchetype =
  | 'vocab_reading'
  | 'vocab_kanji_write'
  | 'vocab_context'
  | 'vocab_synonym'
  | 'vocab_usage'
  | 'grammar_cloze'
  | 'grammar_star'
  | 'grammar_text_cloze'
  | 'reading_short'
  | 'reading_medium'
  | 'reading_long'
  | 'reading_info'
  | 'listening_task'
  | 'listening_point'
  | 'listening_overview'
  | 'listening_expression'
  | 'listening_response';

export type JLPTScoringDomain = 'vocab' | 'grammar' | 'reading' | 'listening';

export type ExamStageId = 'stage-vocab' | 'stage-grammar-reading' | 'stage-listening';

export type ExamPresetMode = 'OFFICIAL_STRICT' | 'CUSTOM_CONDITIONS' | 'MODULAR_SELECTION';

export type ModularSubSectionId =
  | 'vocab_m1'
  | 'vocab_m2'
  | 'vocab_m3'
  | 'vocab_m4'
  | 'vocab_m5'
  | 'grammar_m1'
  | 'grammar_m2'
  | 'grammar_m3'
  | 'reading_m4'
  | 'reading_m5'
  | 'reading_m6'
  | 'reading_m7'
  | 'listening_m1'
  | 'listening_m2'
  | 'listening_m3'
  | 'listening_m4'
  | 'listening_m5';

export interface RichTextToken {
  text: string;
  reading?: string; // Official furigana printed in exam booklet
  optionalReading?: string; // Extra learner furigana (revealed when global Furigana aid is on)
  underline?: boolean;
  underlineMarker?: string; // e.g., "①" or "②"
  isBlank?: boolean;
  blankNumber?: number; // e.g., 19..23 in cloze reading
  starSlotIndex?: number; // 0..3 for 問題2 ★ slots
  isLineBreak?: boolean;
}

export interface JLPTPassageParagraph {
  id: string;
  tokens: RichTextToken[];
  indent?: boolean;
}

export interface JLPTPassageBlock {
  id: string;
  mondaiNumber: number;
  pageRangeLabel?: string;
  title?: string;
  leadInstruction?: string;
  author?: string;
  layoutVariant?: 'prose' | 'email' | 'memo' | 'poster_zoo';
  metadata?: {
    to?: string;
    subject?: string;
    sentAt?: string;
    memoRecipient?: string;
    memoDate?: string;
    memoSender?: string;
  };
  paragraphs: JLPTPassageParagraph[];
  structuredPoster?: {
    mainTitle: string;
    subTitle: string;
    intro: string;
    events: {
      code: string;
      title: string;
      description: string;
      schedule: string[];
      note?: string;
    }[];
    footerNotes: string[];
    nightEvent: {
      title: string;
      tagline: string;
      rows: { label: string; value: string }[];
    };
  };
}

export interface JLPTAudioSegment {
  trackUrl: string;
  mondaiNumber: number;
  itemNumber: number; // 0 for 例, 1..9 for questions
  isExample?: boolean;
  startSec: number;
  endSec: number;
  readingPauseStartSec?: number;
  readingPauseEndSec?: number;
  answerPauseStartSec?: number;
}

export interface JLPTAudioTrackMeta {
  mondaiNumber: number;
  titleJp: string;
  instructionJp: string;
  instructionTokens?: RichTextToken[];
  trackUrl: string;
  durationSec: number;
  exampleAudio?: JLPTAudioSegment;
  exampleTitle?: string;
  exampleImageUrl?: string;
  exampleOptions?: QuestionOption[];
  exampleCorrectOptionId?: string;
  exampleScript?: string;
}

export interface JLPTExamStage {
  id: ExamStageId;
  order: 1 | 2 | 3;
  titleJp: string;
  titleReadingJp?: string;
  titleFr: string;
  durationMinutes: number;
  nominalMinutes?: number;
  pageCount: number;
  coverNotes: { jp: string; en: string }[];
  sectionsIncluded: ExamSectionType[];
  questionRangeLabel: string;
  hasNoteTakingPad?: boolean;
  audioTracks?: JLPTAudioTrackMeta[];
}

export interface ExamSessionConfig {
  presetMode: ExamPresetMode;
  timerMultiplier: 1 | 1.5 | 0; // 0 = unlimited
  customMinutesOverride?: number;
  audioControlMode: 'strict_stream' | 'segmented_free';
  furiganaPolicy: 'official_booklet' | 'global_toggle';
  showStarOrderingHelper: boolean;
  correctionTiming: 'end_only' | 'immediate_feedback';
  theme: 'paper_booklet' | 'dark_ejlpt';
  showOmrSheet: boolean;
  enableBookletCoverGate: boolean;
  selectedStages?: ExamStageId[];
  selectedModules?: ModularSubSectionId[];
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
  // Extended official booklet metadata
  questionNumber?: number;
  stageId?: ExamStageId;
  mondaiNumber?: number;
  mondaiTitle?: string;
  mondaiInstruction?: string;
  mondaiInstructionTokens?: RichTextToken[];
  archetype?: JLPTQuestionArchetype;
  scoringDomain?: JLPTScoringDomain;
  bookletPageLabel?: string;
  marginTab?: '文法' | '読解';
  promptTokens?: RichTextToken[];
  passageId?: string;
  imageUrl?: string;
  imageAlt?: string;
  starCorrectOrder?: string[];
  audioSegment?: JLPTAudioSegment;
  exampleSnippet?: {
    title: string;
    promptTokens: RichTextToken[];
    options: QuestionOption[];
    correctOrder?: string[];
    correctOptionId: string;
  };
}

export interface JLPTExam {
  id: string;
  level: JLPTLevel;
  title: string;
  description: string;
  totalTimeMinutes: number;
  scoringScale?: 'RAW' | 'JLPT_180';
  isOfficialSample?: boolean;
  sourceNote?: string;
  sections: {
    type: ExamSectionType;
    name: string;
    description: string;
    timeMinutes: number;
    maxScore: number;
    minPassScore: number;
  }[];
  stages?: JLPTExamStage[];
  passages?: JLPTPassageBlock[];
  questions: JLPTQuestion[];
}

export interface ExamResult {
  attemptId: string;
  level: JLPTLevel;
  mode: 'FULL_MOCK' | 'SECTION_PRACTICE';
  presetMode?: ExamPresetMode;
  scoringScale?: 'RAW' | 'JLPT_180';
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
  officialBreakdown?: {
    languageKnowledgeScore: number;
    languageKnowledgeMax: number;
    readingScore: number;
    readingMax: number;
    listeningScore: number;
    listeningMax: number;
    passedLanguageKnowledge: boolean;
    passedReading: boolean;
    passedListening: boolean;
    vocabCorrect: number;
    vocabTotal: number;
    grammarCorrect: number;
    grammarTotal: number;
    readingCorrect: number;
    readingTotal: number;
    listeningCorrect: number;
    listeningTotal: number;
  };
  timeSpentSeconds: number;
  answers: Record<string, string>;
  createdAt: string;
}
