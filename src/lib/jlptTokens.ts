import type {
  ExamPresetMode,
  ExamSessionConfig,
  ExamStageId,
  JLPTAudioTrackMeta,
  JLPTExam,
  JLPTExamStage,
  JLPTQuestion,
  ModularSubSectionId,
  RichTextToken,
} from '@/types/jlpt';

const TAG_REGEX =
  /(<br\s*\/>|<b:(\d+)\/>|<s:([0-3])(\*?)\/>|<u([12]?)>([\s\S]*?)<\/u\5>|\{([^|{}^\n]+)\|([^|{}^\n]+)\}|\{([^|{}^\n]+)\^([^|{}^\n]+)\})/g;

function parsePlainOrRuby(
  text: string,
  underline = false,
  underlineMarker?: string
): RichTextToken[] {
  const out: RichTextToken[] = [];
  const innerRegex = /(\{([^|{}^\n]+)\|([^|{}^\n]+)\}|\{([^|{}^\n]+)\^([^|{}^\n]+)\})/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = innerRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push({
        text: text.slice(lastIndex, match.index),
        ...(underline ? { underline: true } : {}),
        ...(underlineMarker ? { underlineMarker } : {}),
      });
    }
    if (match[2] !== undefined) {
      out.push({
        text: match[2],
        reading: match[3],
        ...(underline ? { underline: true } : {}),
        ...(underlineMarker ? { underlineMarker } : {}),
      });
    } else if (match[4] !== undefined) {
      out.push({
        text: match[4],
        optionalReading: match[5],
        ...(underline ? { underline: true } : {}),
        ...(underlineMarker ? { underlineMarker } : {}),
      });
    }
    lastIndex = innerRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    out.push({
      text: text.slice(lastIndex),
      ...(underline ? { underline: true } : {}),
      ...(underlineMarker ? { underlineMarker } : {}),
    });
  }

  return out;
}

/**
 * Parses compact inline booklet markup into typed RichTextToken[] arrays.
 * Supports `{漢字|かな}` official ruby, `{漢字^かな}` optional learner ruby,
 * `<u>...</u>`, `<u1>...</u1>` (①), `<u2>...</u2>` (②), `<b:N/>` cloze blanks,
 * `<s:0..3[*]/>` star-ordering slots, and `<br/>` line breaks.
 */
export function tk(markup: string): RichTextToken[] {
  const tokens: RichTextToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  TAG_REGEX.lastIndex = 0;

  while ((match = TAG_REGEX.exec(markup)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: markup.slice(lastIndex, match.index) });
    }

    const full = match[1];
    if (full.startsWith('<br')) {
      tokens.push({ text: '\n', isLineBreak: true });
    } else if (match[2] !== undefined) {
      const blankNum = Number(match[2]);
      tokens.push({
        text: String(blankNum),
        isBlank: true,
        blankNumber: blankNum,
      });
    } else if (match[3] !== undefined) {
      const slotIdx = Number(match[3]);
      const isStar = match[4] === '*';
      tokens.push({
        text: isStar ? '★' : '',
        starSlotIndex: slotIdx,
      });
    } else if (match[6] !== undefined) {
      const badge = match[5] === '1' ? '①' : match[5] === '2' ? '②' : undefined;
      tokens.push(...parsePlainOrRuby(match[6], true, badge));
    } else if (match[7] !== undefined) {
      tokens.push({ text: match[7], reading: match[8] });
    } else if (match[9] !== undefined) {
      tokens.push({ text: match[9], optionalReading: match[10] });
    }

    lastIndex = TAG_REGEX.lastIndex;
  }

  if (lastIndex < markup.length) {
    tokens.push({ text: markup.slice(lastIndex) });
  }

  return tokens;
}

export const MODULAR_SUBSECTION_CATALOG: {
  id: ModularSubSectionId;
  stageId: ExamStageId;
  domain: 'vocab' | 'grammar' | 'reading' | 'listening';
  mondaiNumber: number;
  titleJp: string;
  titleFr: string;
  questionCount: number;
  recommendedMinutes: number;
}[] = [
  {
    id: 'vocab_m1',
    stageId: 'stage-vocab',
    domain: 'vocab',
    mondaiNumber: 1,
    titleJp: '文字・語彙 問題1（漢字読み）',
    titleFr: 'Lecture de Kanji (Q1–8)',
    questionCount: 8,
    recommendedMinutes: 6,
  },
  {
    id: 'vocab_m2',
    stageId: 'stage-vocab',
    domain: 'vocab',
    mondaiNumber: 2,
    titleJp: '文字・語彙 問題2（表記）',
    titleFr: 'Écriture en Kanji (Q9–14)',
    questionCount: 6,
    recommendedMinutes: 5,
  },
  {
    id: 'vocab_m3',
    stageId: 'stage-vocab',
    domain: 'vocab',
    mondaiNumber: 3,
    titleJp: '文字・語彙 問題3（文脈規定）',
    titleFr: 'Vocabulaire en contexte (Q15–25)',
    questionCount: 11,
    recommendedMinutes: 8,
  },
  {
    id: 'vocab_m4',
    stageId: 'stage-vocab',
    domain: 'vocab',
    mondaiNumber: 4,
    titleJp: '文字・語彙 問題4（言い換え類義）',
    titleFr: 'Synonymes (Q26–30)',
    questionCount: 5,
    recommendedMinutes: 5,
  },
  {
    id: 'vocab_m5',
    stageId: 'stage-vocab',
    domain: 'vocab',
    mondaiNumber: 5,
    titleJp: '文字・語彙 問題5（用法）',
    titleFr: 'Usage correct des mots (Q31–35)',
    questionCount: 5,
    recommendedMinutes: 6,
  },
  {
    id: 'grammar_m1',
    stageId: 'stage-grammar-reading',
    domain: 'grammar',
    mondaiNumber: 1,
    titleJp: '文法 問題1（文の文法1）',
    titleFr: 'Grammaire à trous (Q1–13)',
    questionCount: 13,
    recommendedMinutes: 11,
  },
  {
    id: 'grammar_m2',
    stageId: 'stage-grammar-reading',
    domain: 'grammar',
    mondaiNumber: 2,
    titleJp: '文法 問題2（★ 文の組み立て）',
    titleFr: 'Construction de phrases ★ (Q14–18)',
    questionCount: 5,
    recommendedMinutes: 7,
  },
  {
    id: 'grammar_m3',
    stageId: 'stage-grammar-reading',
    domain: 'grammar',
    mondaiNumber: 3,
    titleJp: '文法 問題3（文章の文法）',
    titleFr: 'Grammaire dans un texte (Q19–23)',
    questionCount: 5,
    recommendedMinutes: 7,
  },
  {
    id: 'reading_m4',
    stageId: 'stage-grammar-reading',
    domain: 'reading',
    mondaiNumber: 4,
    titleJp: '読解 問題4（内容理解・短文）',
    titleFr: 'Textes courts — e-mail & mémo (Q24–27)',
    questionCount: 4,
    recommendedMinutes: 10,
  },
  {
    id: 'reading_m5',
    stageId: 'stage-grammar-reading',
    domain: 'reading',
    mondaiNumber: 5,
    titleJp: '読解 問題5（内容理解・中文）',
    titleFr: 'Textes moyens (Q28–33)',
    questionCount: 6,
    recommendedMinutes: 16,
  },
  {
    id: 'reading_m6',
    stageId: 'stage-grammar-reading',
    domain: 'reading',
    mondaiNumber: 6,
    titleJp: '読解 問題6（内容理解・長文）',
    titleFr: 'Texte long — compagnie de taxi (Q34–37)',
    questionCount: 4,
    recommendedMinutes: 12,
  },
  {
    id: 'reading_m7',
    stageId: 'stage-grammar-reading',
    domain: 'reading',
    mondaiNumber: 7,
    titleJp: '読解 問題7（情報検索・動物園）',
    titleFr: 'Recherche d’info — Zoo Ōhara (Q38–39)',
    questionCount: 2,
    recommendedMinutes: 7,
  },
  {
    id: 'listening_m1',
    stageId: 'stage-listening',
    domain: 'listening',
    mondaiNumber: 1,
    titleJp: '聴解 問題1（課題理解）',
    titleFr: 'Compréhension de tâche (Q1–6)',
    questionCount: 6,
    recommendedMinutes: 11,
  },
  {
    id: 'listening_m2',
    stageId: 'stage-listening',
    domain: 'listening',
    mondaiNumber: 2,
    titleJp: '聴解 問題2（ポイント理解）',
    titleFr: 'Compréhension de points clés (Q1–6)',
    questionCount: 6,
    recommendedMinutes: 14,
  },
  {
    id: 'listening_m3',
    stageId: 'stage-listening',
    domain: 'listening',
    mondaiNumber: 3,
    titleJp: '聴解 問題3（概要理解）',
    titleFr: 'Compréhension globale (Q1–3)',
    questionCount: 3,
    recommendedMinutes: 8,
  },
  {
    id: 'listening_m4',
    stageId: 'stage-listening',
    domain: 'listening',
    mondaiNumber: 4,
    titleJp: '聴解 問題4（発話表現）',
    titleFr: 'Expressions illustrées 3 choix (Q1–4)',
    questionCount: 4,
    recommendedMinutes: 4,
  },
  {
    id: 'listening_m5',
    stageId: 'stage-listening',
    domain: 'listening',
    mondaiNumber: 5,
    titleJp: '聴解 問題5（即時応答）',
    titleFr: 'Réponses immédiates 3 choix (Q1–9)',
    questionCount: 9,
    recommendedMinutes: 7,
  },
];

export function getQuestionModuleId(question: JLPTQuestion): ModularSubSectionId | null {
  const m = question.mondaiNumber ?? 1;
  if (question.scoringDomain === 'vocab' || question.section === 'moji_go') {
    if (m >= 1 && m <= 5) return `vocab_m${m}` as ModularSubSectionId;
  }
  if (question.scoringDomain === 'grammar') {
    if (m >= 1 && m <= 3) return `grammar_m${m}` as ModularSubSectionId;
  }
  if (question.scoringDomain === 'reading') {
    if (m >= 4 && m <= 7) return `reading_m${m}` as ModularSubSectionId;
  }
  if (question.scoringDomain === 'listening' || question.section === 'choukai') {
    if (m >= 1 && m <= 5) return `listening_m${m}` as ModularSubSectionId;
  }
  return null;
}

export function createDefaultSessionConfig(presetMode: ExamPresetMode): ExamSessionConfig {
  if (presetMode === 'OFFICIAL_STRICT') {
    return {
      presetMode: 'OFFICIAL_STRICT',
      timerMultiplier: 1,
      audioControlMode: 'strict_stream',
      furiganaPolicy: 'official_booklet',
      showStarOrderingHelper: false,
      correctionTiming: 'end_only',
      theme: 'paper_booklet',
      showOmrSheet: true,
      enableBookletCoverGate: true,
    };
  }
  if (presetMode === 'CUSTOM_CONDITIONS') {
    return {
      presetMode: 'CUSTOM_CONDITIONS',
      timerMultiplier: 1,
      audioControlMode: 'segmented_free',
      furiganaPolicy: 'global_toggle',
      showStarOrderingHelper: true,
      correctionTiming: 'end_only',
      theme: 'paper_booklet',
      showOmrSheet: true,
      enableBookletCoverGate: false,
      selectedStages: ['stage-vocab', 'stage-grammar-reading', 'stage-listening'],
    };
  }
  return {
    presetMode: 'MODULAR_SELECTION',
    timerMultiplier: 1,
    audioControlMode: 'segmented_free',
    furiganaPolicy: 'global_toggle',
    showStarOrderingHelper: true,
    correctionTiming: 'immediate_feedback',
    theme: 'paper_booklet',
    showOmrSheet: true,
    enableBookletCoverGate: false,
    selectedModules: ['vocab_m1', 'grammar_m1', 'reading_m4'],
  };
}

export interface ActiveSimulatorStage {
  stageMeta: JLPTExamStage;
  questions: JLPTQuestion[];
  durationSeconds: number;
  effectiveMinutes: number;
  isListening: boolean;
  audioTracks: JLPTAudioTrackMeta[];
}

export function buildSimulatorStages(
  exam: JLPTExam,
  config: ExamSessionConfig
): ActiveSimulatorStage[] {
  const baseStages = [...(exam.stages ?? [])].sort((a, b) => a.order - b.order);
  if (baseStages.length === 0) return [];

  if (config.presetMode === 'MODULAR_SELECTION') {
    const selectedSet = new Set(config.selectedModules ?? []);
    const matched = exam.questions.filter((q) => {
      const m = getQuestionModuleId(q);
      return m !== null && selectedSet.has(m);
    });

    const writtenQuestions = matched.filter((q) => q.stageId !== 'stage-listening');
    const listeningQuestions = matched.filter((q) => q.stageId === 'stage-listening');
    const pickedModules = MODULAR_SUBSECTION_CATALOG.filter((m) => selectedSet.has(m.id));
    const stages: ActiveSimulatorStage[] = [];

    if (writtenQuestions.length > 0) {
      const baseMinutes = Math.max(
        1,
        pickedModules
          .filter((m) => m.stageId !== 'stage-listening')
          .reduce((sum, m) => sum + m.recommendedMinutes, 0)
      );
      const effectiveMinutes =
        config.timerMultiplier === 0
          ? 0
          : Math.max(1, Math.round(baseMinutes * config.timerMultiplier));
      const baseWrittenStage = baseStages[0];
      stages.push({
        stageMeta: {
          ...baseWrittenStage,
          id: writtenQuestions.every((q) => q.stageId === 'stage-grammar-reading')
            ? 'stage-grammar-reading'
            : 'stage-vocab',
          order: 1,
          titleJp: 'もんだいようし（選択モジュール）',
          titleReadingJp: 'せんたくもじゅーる',
          titleFr: `Modules écrits sélectionnés (${writtenQuestions.length} Q)`,
          durationMinutes: effectiveMinutes,
          pageCount: 1,
          sectionsIncluded: Array.from(new Set(writtenQuestions.map((q) => q.section))),
          questionRangeLabel: `${writtenQuestions.length} questions sélectionnées`,
        },
        questions: writtenQuestions,
        durationSeconds: effectiveMinutes * 60,
        effectiveMinutes,
        isListening: false,
        audioTracks: [],
      });
    }

    if (listeningQuestions.length > 0) {
      const baseListeningStage =
        baseStages.find((s) => s.id === 'stage-listening') ?? baseStages[baseStages.length - 1];
      const baseMinutes = Math.max(
        1,
        pickedModules
          .filter((m) => m.stageId === 'stage-listening')
          .reduce((sum, m) => sum + m.recommendedMinutes, 0)
      );
      const effectiveMinutes =
        config.timerMultiplier === 0
          ? 0
          : Math.max(1, Math.round(baseMinutes * config.timerMultiplier));
      const allowedMondais = new Set(
        listeningQuestions.map((q) => q.mondaiNumber).filter((n): n is number => Boolean(n))
      );
      const filteredTracks = (baseListeningStage.audioTracks ?? []).filter((t) =>
        allowedMondais.has(t.mondaiNumber)
      );
      stages.push({
        stageMeta: {
          ...baseListeningStage,
          order: stages.length === 0 ? 1 : 2,
          titleFr: `Modules d’écoute sélectionnés (${listeningQuestions.length} Q)`,
          durationMinutes: effectiveMinutes,
          questionRangeLabel: `${listeningQuestions.length} questions audio`,
          audioTracks: filteredTracks,
        },
        questions: listeningQuestions,
        durationSeconds: effectiveMinutes * 60,
        effectiveMinutes,
        isListening: true,
        audioTracks: filteredTracks,
      });
    }

    return stages;
  }

  const allowedStageIds =
    config.presetMode === 'OFFICIAL_STRICT'
      ? new Set(baseStages.map((s) => s.id))
      : new Set(
          config.selectedStages && config.selectedStages.length > 0
            ? config.selectedStages
            : baseStages.map((s) => s.id)
        );

  return baseStages
    .filter((s) => allowedStageIds.has(s.id))
    .map((stageMeta) => {
      const stageQuestions = exam.questions.filter((q) => q.stageId === stageMeta.id);
      const effectiveMinutes =
        config.presetMode === 'OFFICIAL_STRICT'
          ? stageMeta.durationMinutes
          : config.timerMultiplier === 0
          ? 0
          : Math.max(1, Math.round(stageMeta.durationMinutes * config.timerMultiplier));

      return {
        stageMeta,
        questions: stageQuestions,
        durationSeconds: effectiveMinutes * 60,
        effectiveMinutes,
        isListening: stageMeta.id === 'stage-listening',
        audioTracks: stageMeta.audioTracks ?? [],
      };
    })
    .filter((s) => s.questions.length > 0);
}
