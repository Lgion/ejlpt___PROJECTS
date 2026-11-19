import type {
  ExamCatalogEntry,
  ExamComposablePart,
  ExamMixConfig,
  ExamStageId,
  JLPTAudioTrackMeta,
  JLPTExam,
  JLPTExamStage,
  JLPTLevel,
  JLPTPassageBlock,
  JLPTQuestion,
  JLPTScoringDomain,
  RichTextToken,
} from '@/types/jlpt';
import { getExamModularCatalog, getQuestionModuleId } from '@/lib/jlptTokens';

function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRng<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function inferSupportsFineShuffle(
  questions: JLPTQuestion[],
  domain: JLPTScoringDomain
): boolean {
  if (domain === 'vocab') return true;
  if (domain === 'listening') return false;
  if (domain === 'grammar') {
    // Only standalone sentence-level grammar (no shared cloze passage) can be item-shuffled
    return questions.every((q) => !q.passageId);
  }
  // Reading: sub-passages (short/medium with >= 2 distinct passages) can shuffle passage-units
  const passageIds = new Set(questions.map((q) => q.passageId).filter(Boolean));
  return passageIds.size > 1;
}

/**
 * Discovers every composable section (`問題`) across all available official exams of one level.
 */
export function describeComposableParts(sourceExams: JLPTExam[]): ExamComposablePart[] {
  const sortedExams = [...sourceExams].sort(
    (a, b) => (a.examNumber ?? 1) - (b.examNumber ?? 1)
  );
  const partMap = new Map<string, ExamComposablePart>();

  for (const exam of sortedExams) {
    const catalog = getExamModularCatalog(exam);
    const metaByMod = new Map(catalog.map((m) => [m.id, m]));
    const byMod = new Map<string, JLPTQuestion[]>();

    for (const q of exam.questions) {
      const modId = getQuestionModuleId(q);
      if (!modId) continue;
      const list = byMod.get(modId) ?? [];
      list.push(q);
      byMod.set(modId, list);
    }

    for (const [modId, qs] of byMod.entries()) {
      const meta = metaByMod.get(modId);
      const firstQ = qs[0];
      const domain: JLPTScoringDomain =
        meta?.domain ??
        firstQ.scoringDomain ??
        (firstQ.section === 'moji_go'
          ? 'vocab'
          : firstQ.section === 'choukai'
          ? 'listening'
          : 'reading');
      const stageId: ExamStageId =
        meta?.stageId ??
        firstQ.stageId ??
        (domain === 'listening' ? 'stage-listening' : 'stage-vocab');
      const mondaiNumber = meta?.mondaiNumber ?? firstQ.mondaiNumber ?? 1;
      const supportsFineShuffle = inferSupportsFineShuffle(qs, domain);

      let part = partMap.get(modId);
      if (!part) {
        part = {
          moduleId: modId,
          domain,
          stageId,
          mondaiNumber,
          titleJp: meta?.titleJp ?? firstQ.mondaiTitle ?? `問題 ${mondaiNumber}`,
          titleFr: meta?.titleFr ?? firstQ.subCategory ?? `${domain} 問題${mondaiNumber}`,
          supportsFineShuffle,
          availableSources: [],
        };
        partMap.set(modId, part);
      } else {
        part.supportsFineShuffle = part.supportsFineShuffle && supportsFineShuffle;
      }

      part.availableSources.push({
        examId: exam.id,
        examNumber: exam.examNumber ?? 1,
        questionCount: qs.length,
        recommendedMinutes:
          meta?.recommendedMinutes ?? Math.max(3, Math.round(qs.length * 1.2)),
      });
    }
  }

  const stageOrder: Record<ExamStageId, number> = {
    'stage-vocab': 1,
    'stage-combined-written': 1,
    'stage-grammar-reading': 2,
    'stage-listening': 3,
  };
  const domainOrder: Record<JLPTScoringDomain, number> = {
    vocab: 1,
    grammar: 2,
    reading: 3,
    listening: 4,
  };

  return Array.from(partMap.values()).sort((a, b) => {
    const sa = stageOrder[a.stageId] ?? 9;
    const sb = stageOrder[b.stageId] ?? 9;
    if (sa !== sb) return sa - sb;
    const da = domainOrder[a.domain] ?? 9;
    const db = domainOrder[b.domain] ?? 9;
    if (da !== db) return da - db;
    return a.mondaiNumber - b.mondaiNumber;
  });
}

function remapBlankTokens(
  tokens: RichTextToken[],
  blankMap: Map<number, number>
): RichTextToken[] {
  return tokens.map((tok) => {
    if (!tok.isBlank || tok.blankNumber === undefined) return tok;
    const nextNum = blankMap.get(tok.blankNumber);
    if (nextNum === undefined) return tok;
    return {
      ...tok,
      blankNumber: nextNum,
      text: String(nextNum),
    };
  });
}

function pickSubPassageUnits(
  part: ExamComposablePart,
  sourceExams: JLPTExam[],
  targetCount: number,
  rng: () => number
): { questions: JLPTQuestion[]; passages: JLPTPassageBlock[] } {
  interface Unit {
    passage: JLPTPassageBlock;
    questions: JLPTQuestion[];
  }
  const units: Unit[] = [];

  for (const exam of sourceExams) {
    const passageById = new Map((exam.passages ?? []).map((p) => [p.id, p]));
    const partQs = exam.questions.filter((q) => getQuestionModuleId(q) === part.moduleId);
    const grouped = new Map<string, JLPTQuestion[]>();

    for (const q of partQs) {
      if (!q.passageId) continue;
      const arr = grouped.get(q.passageId) ?? [];
      arr.push(q);
      grouped.set(q.passageId, arr);
    }

    for (const [pid, qs] of grouped.entries()) {
      const passage = passageById.get(pid);
      if (passage) units.push({ passage, questions: qs });
    }
  }

  const shuffled = shuffleWithRng(units, rng);
  const chosen: Unit[] = [];
  let sum = 0;

  // Greedily pick passage units without overshooting targetCount when possible
  for (const unit of shuffled) {
    if (sum >= targetCount) break;
    if (sum + unit.questions.length <= targetCount || chosen.length === 0) {
      chosen.push(unit);
      sum += unit.questions.length;
    }
  }

  const normalizedPassages: JLPTPassageBlock[] = [];
  const normalizedQuestions: JLPTQuestion[] = [];

  chosen.forEach((unit, idx) => {
    const clonedPassageId = `${unit.passage.id}-mix${idx + 1}`;
    const cleanedLead = unit.passage.leadInstruction
      ? unit.passage.leadInstruction.replace(/^\(\d+\)\s*/, `(${idx + 1}) `)
      : undefined;
    normalizedPassages.push({
      ...unit.passage,
      id: clonedPassageId,
      ...(cleanedLead ? { leadInstruction: cleanedLead } : {}),
    });
    for (const q of unit.questions) {
      normalizedQuestions.push({
        ...q,
        passageId: clonedPassageId,
      });
    }
  });

  return { questions: normalizedQuestions, passages: normalizedPassages };
}

/**
 * Generates an executable dynamic JLPT exam by picking each part (`問題`) from available
 * exams (randomly or explicitly), while keeping passages, cloze blanks, OMR numbering,
 * and listening audio tracks strictly consistent.
 */
export function composeMixedExam(
  level: JLPTLevel,
  sourceExams: JLPTExam[],
  mixConfig: ExamMixConfig
): JLPTExam {
  if (sourceExams.length === 0) {
    throw new Error(`Aucun examen source disponible pour le niveau ${level}`);
  }

  const sortedSources = [...sourceExams].sort(
    (a, b) => (a.examNumber ?? 1) - (b.examNumber ?? 1)
  );
  const seed = mixConfig.seed ?? Math.floor(Date.now() % 1000000);
  const rng = createSeededRng(seed);
  const parts = describeComposableParts(sortedSources);
  const sourceById = new Map(sortedSources.map((e) => [e.id, e]));
  const primaryTemplate = sortedSources[0];

  const pickedQuestions: JLPTQuestion[] = [];
  const pickedPassageMap = new Map<string, JLPTPassageBlock>();
  const pickedAudioTracks: JLPTAudioTrackMeta[] = [];
  const usedSourceIds = new Set<string>();

  for (const part of parts) {
    const rule = mixConfig.partSources[part.moduleId] ?? 'random';
    const eligibleSources = part.availableSources
      .map((s) => sourceById.get(s.examId))
      .filter((e): e is JLPTExam => Boolean(e));

    const chosenExam =
      rule !== 'random' && sourceById.has(rule)
        ? sourceById.get(rule)!
        : eligibleSources[Math.floor(rng() * eligibleSources.length)] ?? sortedSources[0];

    const targetCount =
      part.availableSources.find((s) => s.examId === chosenExam.id)?.questionCount ??
      part.availableSources[0]?.questionCount ??
      0;

    if (
      mixConfig.granularity === 'fine_shuffle' &&
      rule === 'random' &&
      part.supportsFineShuffle &&
      sortedSources.length > 1
    ) {
      if (part.domain === 'reading') {
        const sub = pickSubPassageUnits(part, sortedSources, targetCount, rng);
        for (const p of sub.passages) pickedPassageMap.set(p.id, p);
        for (const q of sub.questions) pickedQuestions.push(q);
        sortedSources.forEach((s) => usedSourceIds.add(s.id));
        continue;
      }

      const pool = sortedSources.flatMap((src) =>
        src.questions
          .filter((q) => getQuestionModuleId(q) === part.moduleId)
          .map((q) => ({ q, examId: src.id }))
      );
      const selected = shuffleWithRng(pool, rng).slice(0, targetCount);
      for (const item of selected) {
        pickedQuestions.push({ ...item.q });
        usedSourceIds.add(item.examId);
      }
      continue;
    }

    usedSourceIds.add(chosenExam.id);
    const partQs = chosenExam.questions
      .filter((q) => getQuestionModuleId(q) === part.moduleId)
      .map((q) => ({ ...q }));

    const passageById = new Map((chosenExam.passages ?? []).map((p) => [p.id, p]));
    for (const q of partQs) {
      if (q.passageId && !pickedPassageMap.has(q.passageId)) {
        const p = passageById.get(q.passageId);
        if (p) pickedPassageMap.set(p.id, { ...p });
      }
    }

    if (part.domain === 'listening') {
      const listeningStage = chosenExam.stages?.find((s) => s.id === 'stage-listening');
      const matchingTrack = listeningStage?.audioTracks?.find(
        (tr) => tr.mondaiNumber === part.mondaiNumber
      );
      if (matchingTrack) {
        pickedAudioTracks.push({ ...matchingTrack });
      }
    }

    pickedQuestions.push(...partQs);
  }

  // Renumber questions sequentially per stage (resetting at grammar-reading for N3–N5,
  // staying continuous for N1/N2 combined written, and preserving listening sub-labels)
  const stageCounters = new Map<ExamStageId, number>();
  const passageBlankMaps = new Map<string, Map<number, number>>();

  const finalQuestions: JLPTQuestion[] = pickedQuestions.map((q) => {
    const sid = q.stageId ?? 'stage-vocab';
    const nextNum = (stageCounters.get(sid) ?? 0) + 1;
    stageCounters.set(sid, nextNum);

    if (q.passageId && q.archetype === 'grammar_text_cloze' && q.questionNumber !== undefined) {
      const map = passageBlankMaps.get(q.passageId) ?? new Map<number, number>();
      map.set(q.questionNumber, nextNum);
      passageBlankMaps.set(q.passageId, map);

      const remappedTokens = q.promptTokens
        ? remapBlankTokens(q.promptTokens, map)
        : undefined;
      return {
        ...q,
        questionNumber: nextNum,
        prompt: q.prompt.replace(/\[\s*\d+\s*\]/, `[ ${nextNum} ]`),
        ...(remappedTokens ? { promptTokens: remappedTokens } : {}),
        subCategory: q.subCategory.replace(/\[\s*\d+\s*\]/, `[${nextNum}]`),
      };
    }

    return {
      ...q,
      questionNumber: nextNum,
    };
  });

  const finalPassages: JLPTPassageBlock[] = Array.from(pickedPassageMap.values()).map((p) => {
    const bMap = passageBlankMaps.get(p.id);
    if (!bMap || bMap.size === 0) return p;
    return {
      ...p,
      paragraphs: p.paragraphs.map((para) => ({
        ...para,
        tokens: remapBlankTokens(para.tokens, bMap),
      })),
    };
  });

  const finalStages: JLPTExamStage[] = (primaryTemplate.stages ?? []).map((st) => {
    const stageQs = finalQuestions.filter((q) => q.stageId === st.id);
    const mondais = stageQs.map((q) => q.mondaiNumber).filter((n): n is number => Boolean(n));
    const minM = mondais.length > 0 ? Math.min(...mondais) : 1;
    const maxM = mondais.length > 0 ? Math.max(...mondais) : 1;
    return {
      ...st,
      questionRangeLabel: `問題 ${minM} 〜 問題 ${maxM}（全 ${stageQs.length} 問）`,
      ...(st.id === 'stage-listening'
        ? {
            audioTracks: [...pickedAudioTracks].sort(
              (a, b) => a.mondaiNumber - b.mondaiNumber
            ),
          }
        : {}),
    };
  });

  const seedTag = String(seed).padStart(4, '0').slice(-4);
  return {
    id: `exam-${level.toLowerCase()}-mix-${seedTag}`,
    level,
    candidateCodePrefix: 'MIX',
    isDynamicMix: true,
    sourceExamIds: Array.from(usedSourceIds),
    title: `JLPT ${level} — Examen Mixte #${seedTag}`,
    description: `Examen dynamique composé par tirage de parties parmi ${sortedSources.length} examens disponibles (${finalQuestions.length} questions, chronométrage et barème officiels).`,
    totalTimeMinutes: primaryTemplate.totalTimeMinutes,
    scoringScale: primaryTemplate.scoringScale ?? 'JLPT_180',
    isOfficialSample: true,
    sections: primaryTemplate.sections,
    stages: finalStages,
    passages: finalPassages,
    questions: finalQuestions,
  };
}

/**
 * Formats an anonymized learner-facing label from an exam or catalog entry without revealing origin year.
 */
export function formatAnonymousExamLabel(
  exam: Pick<JLPTExam | ExamCatalogEntry, 'level' | 'examNumber' | 'title'> & {
    isDynamicMix?: boolean;
  }
): string {
  if ('isDynamicMix' in exam && exam.isDynamicMix) {
    return `${exam.level} · Examen Mixte`;
  }
  if (exam.examNumber !== undefined) {
    return `${exam.level} · Examen #${exam.examNumber}`;
  }
  return exam.level;
}

/**
 * Masque d'éventuelles mentions historiques de millésime (ex. anciennes tentatives locales/BDD)
 * pour garantir une numérotation séquentielle anonyme dans les vues apprenant.
 */
export function sanitizeAttemptTitle(title: string): string {
  return title
    .replace(/\s*\(Cahier Intégral\)/gi, '')
    .replace(/Examen Officiel 2018/gi, 'Examen #1')
    .replace(/Examen Officiel 2012/gi, 'Examen #2')
    .replace(/\b(?:2018|2012)\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
