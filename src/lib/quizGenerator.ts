import {
  localDb,
  seedLocalDatabase,
  type JLPTLevelNormalized,
  type SpriteImageRef,
  type UnifiedKanjiRecord,
} from '@/lib/db';
import { YOMIKATA_Z_OFFICIAL_SEED } from '@/data/yomikataZSeed';

export type DynamicQuizMode =
  | 'kanji_reading'
  | 'grammar_cloze'
  | 'synonyms_intruder'
  | 'jukugo_compound'
  | 'srs_review'
  | 'intruder_set'
  | 'speed_reading'
  | 'translation_fr_ja'
  | 'jukugo_builder'
  | 'grammar_relations_connectors';

export interface QuizItemMetadata {
  kanji?: string;
  audioText?: string;
  frequencyScore10?: number;
  isKeigo?: [boolean, boolean];
  sotoUchi?: string;
  dualisme?: number;
  isVerbe?: string;
  isAdj?: string;
  transitivity?: string;
  pos?: string;
  strokes?: number | null;
  strokeSvgCode?: string;
  images?: SpriteImageRef[];
  jlpt?: string;
  relationType?: 'synonym' | 'antonym' | 'homonym' | 'paronym' | 'connector';
}

export interface DynamicQuizQuestion {
  id: string;
  srsCardId: string;
  itemType: 'KANJI' | 'GRAMMAR' | 'JUKUGO';
  itemKey: string;
  level: string;
  prompt: string;
  reading?: string;
  hint?: string;
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
  explanation: string;
  itemMeta?: QuizItemMetadata;
}

export interface DexterityScoreSummary {
  accuracyPct: number;
  basePoints: number;
  speedBonus: number;
  streakBonus: number;
  totalPoints: number;
  rankLabelFr: string;
}

export function computeDexterityScore(input: {
  correctCount: number;
  totalCount: number;
  totalTimeRemainingSec: number;
  secondsPerQuestion: number;
  maxStreak: number;
}): DexterityScoreSummary {
  const safeTotal = Math.max(1, input.totalCount);
  const accuracyPct = Math.round((Math.max(0, input.correctCount) / safeTotal) * 100);
  const basePoints = Math.max(0, input.correctCount) * 100;
  const speedBonus = Math.max(0, Math.round(input.totalTimeRemainingSec * 10));
  const streakBonus = Math.max(0, input.maxStreak) * 25;
  const totalPoints = basePoints + speedBonus + streakBonus;

  let rankLabelFr = 'C — En progression';
  if (accuracyPct >= 90 && speedBonus >= safeTotal * 40) {
    rankLabelFr = 'S — Éclair JLPT';
  } else if (accuracyPct >= 75 && totalPoints >= safeTotal * 90) {
    rankLabelFr = 'A — Rapide & Précis';
  } else if (accuracyPct >= 55) {
    rankLabelFr = 'B — Solide';
  }

  return {
    accuracyPct,
    basePoints,
    speedBonus,
    streakBonus,
    totalPoints,
    rankLabelFr,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function buildOptions(
  correctText: string,
  distractorPool: string[],
  fallbackPool: string[] = ['自然', '努力', '感情', '約束']
): {
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
} {
  const combined = [...distractorPool, ...fallbackPool];
  const uniqueDistractors = Array.from(
    new Set(combined.map((d) => d.trim()).filter((d) => d && d !== correctText))
  ).slice(0, 3);

  const rawChoices = shuffle([
    { text: correctText, isCorrect: true },
    ...uniqueDistractors.map((text) => ({ text, isCorrect: false })),
  ]);

  const letters = ['a', 'b', 'c', 'd'];
  let correctOptionId = 'a';
  const options = rawChoices.map((choice, idx) => {
    const id = letters[idx] || String(idx);
    if (choice.isCorrect) correctOptionId = id;
    return { id, text: choice.text };
  });

  return { options, correctOptionId };
}

function extractKanjiMeta(k: UnifiedKanjiRecord, relationType?: QuizItemMetadata['relationType']): QuizItemMetadata {
  return {
    kanji: k.kanji,
    audioText: k.kun_readings[0]?.replace(/\./g, '') || k.on_readings[0] || k.kanji,
    frequencyScore10: k.frequencyScore10,
    isKeigo: k.isKeigo,
    sotoUchi: k.sotoUchi,
    dualisme: k.dualisme,
    isVerbe: k.isVerbe,
    isAdj: k.isAdj,
    strokes: k.strokes,
    strokeSvgCode: k.strokeSvgCode,
    images: k.images,
    jlpt: k.jlpt,
    relationType,
  };
}

const GRAMMAR_RELATIONS_SEED = [
  {
    term: '〜てしまう',
    level: 'N4',
    reading: 'てしまう',
    prompt: 'Quelle forme abrégée familière correspond à « 〜てしまう » (action achevée / regret) ?',
    answer: '〜ちゃう / 〜じゃう',
    distractors: ['〜とく / 〜どく', '〜なきゃ', '〜てる'],
    explanation: 'À l’oral familier, 〜てしまう se contracte en 〜ちゃう (et 〜でしまう en 〜じゃう).',
  },
  {
    term: '〜ておく',
    level: 'N4',
    reading: 'ておく',
    prompt: 'Quelle forme abrégée familière remplace « 〜ておく » (faire à l’avance) ?',
    answer: '〜とく',
    distractors: ['〜ちゃう', '〜てる', '〜なくちゃ'],
    explanation: '〜ておく se contracte couramment en 〜とく à l’oral.',
  },
  {
    term: '〜おかげで',
    level: 'N4',
    reading: 'おかげで',
    prompt: 'Quel connecteur exprime l’opposé (cause négative / faute de) par rapport à « 〜おかげで » ?',
    answer: '〜せいで',
    distractors: ['〜ために', '〜ように', '〜ばかりに'],
    explanation: 'おかげで exprime une reconnaissance (nuance +), tandis que せいで impute un résultat négatif (−).',
  },
  {
    term: 'いらっしゃる',
    level: 'N4',
    reading: 'いらっしゃる',
    prompt: 'Quel équivalent keigo humble (謙譲語) est l’opposé de « いらっしゃる » (尊敬語) pour 行く / 来る ?',
    answer: 'まいる / うかがう',
    distractors: ['おっしゃる', '召し上がる', 'ご覧になる'],
    explanation: 'いらっしゃる élève l’interlocuteur (尊敬語) ; まいる / うかがう abaisse sa propre action (謙譲語).',
  },
  {
    term: '〜にもかかわらず',
    level: 'N2',
    reading: 'にもかかわらず',
    prompt: 'Quelle tournure de registre plus courant a un sens proche de « 〜にもかかわらず » ?',
    answer: '〜のに / 〜けれども',
    distractors: ['〜したがって', '〜うえに', '〜ついでに'],
    explanation: '〜にもかかわらず (« malgré / bien que ») est l’équivalent formel de 〜のに.',
  },
];

export async function generateDynamicQuiz(options: {
  mode: DynamicQuizMode;
  level: string;
  count: number;
}): Promise<DynamicQuizQuestion[]> {
  await seedLocalDatabase();
  const { mode, level, count } = options;

  if (mode === 'srs_review') {
    const nowIso = new Date().toISOString();
    let cards = await localDb.srsCards.where('dueAt').belowOrEqual(nowIso).toArray();
    if (cards.length === 0) {
      cards = await localDb.srsCards.orderBy('errorCount').reverse().limit(count).toArray();
    }
    if (cards.length === 0) return [];

    const allKanjis = await localDb.kanjis.limit(150).toArray();
    const kanjiMap = new Map(allKanjis.map((k) => [k.kanji, k]));
    const distractorMeanings = allKanjis
      .map((k) => k.meanings_fr[0] || k.meanings_en[0] || '')
      .filter(Boolean);

    return cards.slice(0, count).map((c, idx) => {
      const { options: builtOpts, correctOptionId } = buildOptions(
        c.answer,
        shuffle(distractorMeanings)
      );
      const linkedKanji = kanjiMap.get(c.itemKey);
      return {
        id: `srs_${idx}_${c.cardId}`,
        srsCardId: c.cardId,
        itemType: c.itemType === 'QUESTION' ? 'KANJI' : c.itemType,
        itemKey: c.itemKey,
        level: c.level,
        prompt: c.prompt,
        reading: c.reading,
        hint: `Révision SRS (${c.errorCount} erreur${c.errorCount > 1 ? 's' : ''})`,
        options: builtOpts,
        correctOptionId,
        explanation: `${c.itemKey} (${c.reading || '—'}) → ${c.answer}`,
        itemMeta: linkedKanji
          ? extractKanjiMeta(linkedKanji)
          : { audioText: c.reading || c.itemKey, jlpt: c.level },
      };
    });
  }

  if (mode === 'kanji_reading') {
    const pool =
      level !== 'ALL'
        ? await localDb.kanjis.where('jlpt').equals(level as JLPTLevelNormalized).toArray()
        : await localDb.kanjis.filter((k) => k.jlpt !== 'N0').toArray();

    const valid = pool.filter(
      (k) =>
        (k.meanings_fr.length > 0 || k.meanings_en.length > 0) &&
        (k.kun_readings.length > 0 || k.on_readings.length > 0)
    );
    const chosen = shuffle(valid).slice(0, count);
    const allByChar = new Map(valid.map((k) => [k.kanji, k]));

    return chosen.map((target, idx) => {
      const targetMeaning =
        target.meanings_fr.slice(0, 2).join(', ') || target.meanings_en.slice(0, 2).join(', ');
      const similarDistractors = target.similar
        .map((s) => allByChar.get(s))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .map(
          (item) =>
            item.meanings_fr.slice(0, 2).join(', ') || item.meanings_en.slice(0, 2).join(', ')
        );

      const randomDistractors = shuffle(valid)
        .slice(0, 12)
        .map(
          (item) =>
            item.meanings_fr.slice(0, 2).join(', ') || item.meanings_en.slice(0, 2).join(', ')
        );

      const { options: builtOpts, correctOptionId } = buildOptions(targetMeaning, [
        ...similarDistractors,
        ...randomDistractors,
      ]);

      return {
        id: `kanji_quiz_${idx}_${target.kanji}`,
        srsCardId: `kanji:${target.kanji}`,
        itemType: 'KANJI',
        itemKey: target.kanji,
        level: target.jlpt,
        prompt: `Quelle est la signification principale du kanji « ${target.kanji} » ?`,
        reading: [...target.on_readings.slice(0, 2), ...target.kun_readings.slice(0, 2)].join(
          ' • '
        ),
        hint: `Radical ${target.radical} • ${target.strokes ?? '?'} traits`,
        options: builtOpts,
        correctOptionId,
        explanation: `On: ${target.on_readings.join(', ') || '—'} | Kun: ${target.kun_readings.join(', ') || '—'} | Sens: ${targetMeaning}`,
        itemMeta: extractKanjiMeta(target),
      };
    });
  }

  if (mode === 'grammar_cloze') {
    const pool =
      level !== 'ALL'
        ? await localDb.grammar.where('jlpt_level').equals(level).toArray()
        : await localDb.grammar.filter((g) => g.jlpt_level !== 'Unknown').toArray();

    const valid = pool.filter((g) => g.meaning && g.meaning.length >= 3);
    const chosen = shuffle(valid).slice(0, count);

    return chosen.map((target, idx) => {
      const cleanMeaning = target.meaning.split('\n')[0].slice(0, 110);
      const distractors = shuffle(valid)
        .slice(0, 12)
        .map((g) => g.meaning.split('\n')[0].slice(0, 110));
      const { options: builtOpts, correctOptionId } = buildOptions(cleanMeaning, distractors);

      return {
        id: `grammar_quiz_${idx}_${target.term}`,
        srsCardId: `grammar:${target.term}`,
        itemType: 'GRAMMAR',
        itemKey: target.term,
        level: target.jlpt_level,
        prompt: `Que signifie le point de grammaire « ${target.term} » ?`,
        reading: target.reading,
        hint:
          target.connections.length > 0
            ? `接続 : ${target.connections[0]}`
            : `Catégorie : ${target.category}`,
        options: builtOpts,
        correctOptionId,
        explanation: `${target.term} (${target.jlpt_level})${target.connections[0] ? ` — 接続: ${target.connections[0]}` : ''} : ${cleanMeaning}`,
        itemMeta: {
          audioText: target.term,
          jlpt: target.jlpt_level,
          isKeigo: target.category.toLowerCase().includes('keigo') ? [true, false] : undefined,
        },
      };
    });
  }

  if (mode === 'synonyms_intruder') {
    const candidates = await localDb.kanjis
      .filter((k) => k.similar.length > 0 || k.synonyms.length > 0)
      .toArray();
    const chosen = shuffle(candidates).slice(0, count);
    const allMap = new Map((await localDb.kanjis.toArray()).map((k) => [k.kanji, k]));
    const fallbackChars = shuffle(Array.from(allMap.keys()));

    return chosen.map((target, idx) => {
      const related = [...target.synonyms, ...target.similar].filter(
        (c) => c && c !== target.kanji
      );
      const correct = related[0] || target.variants[0] || target.kanji;
      const distractors = fallbackChars
        .filter((c) => c !== target.kanji && !related.includes(c))
        .slice(0, 8);
      const { options: builtOpts, correctOptionId } = buildOptions(correct, distractors);
      const targetMeaning = target.meanings_fr[0] || target.meanings_en[0] || '';

      return {
        id: `syn_quiz_${idx}_${target.kanji}`,
        srsCardId: `kanji:${target.kanji}`,
        itemType: 'KANJI',
        itemKey: target.kanji,
        level: target.jlpt,
        prompt: `Quel kanji est proche ou synonyme/visuellement lié à « ${target.kanji} » (${targetMeaning}) ?`,
        reading: target.kun_readings[0] || target.on_readings[0],
        hint: target.synonyms.length > 0 ? 'Proximité sémantique' : 'Ressemblance graphique / usage',
        options: builtOpts,
        correctOptionId,
        explanation: `Kanji associé : ${correct}. ${related.length > 1 ? `Autres liés : ${related.slice(1, 4).join(', ')}` : ''}`,
        itemMeta: extractKanjiMeta(target, target.synonyms.length > 0 ? 'synonym' : 'paronym'),
      };
    });
  }

  if (mode === 'intruder_set') {
    const allKanjis = await localDb.kanjis.toArray();
    const pool =
      level !== 'ALL'
        ? allKanjis.filter((k) => k.jlpt === level)
        : allKanjis.filter((k) => k.jlpt !== 'N0');
    const relationCandidates = (pool.length >= 4 ? pool : allKanjis).filter(
      (k) =>
        k.antonyms.length > 0 ||
        k.synonyms.length > 0 ||
        k.homonyms.length > 0 ||
        k.similar.length >= 2
    );
    const chosen = shuffle(relationCandidates).slice(0, count);
    const allChars = shuffle(allKanjis.map((k) => k.kanji));

    return chosen.map((target, idx) => {
      const targetMeaning = target.meanings_fr[0] || target.meanings_en[0] || '';

      // True intruder question when >= 2 same-family kanjis exist
      if (target.synonyms.length >= 2) {
        const family = [target.kanji, ...target.synonyms.slice(0, 2)];
        const intruder =
          allChars.find(
            (c) =>
              c !== target.kanji &&
              !target.synonyms.includes(c) &&
              !target.similar.includes(c)
          ) || '無';
        const { options: builtOpts, correctOptionId } = buildOptions(intruder, family);
        return {
          id: `intruder_${idx}_${target.kanji}`,
          srsCardId: `kanji:${target.kanji}`,
          itemType: 'KANJI',
          itemKey: target.kanji,
          level: target.jlpt,
          prompt: `Trouvez l’intrus sémantique (hors famille de sens « ${targetMeaning} ») :`,
          reading: target.on_readings[0] || target.kun_readings[0],
          hint: '3 synonymes + 1 intrus',
          options: builtOpts,
          correctOptionId,
          explanation: `Intrus : ${intruder}. Famille synonyme autour de ${target.kanji} : ${family.join(' / ')}.`,
          itemMeta: extractKanjiMeta(target, 'synonym'),
        };
      }

      if (target.antonyms.length > 0) {
        const antonym = target.antonyms[0];
        const distractors = allChars
          .filter((c) => c !== target.kanji && c !== antonym && !target.antonyms.includes(c))
          .slice(0, 8);
        const { options: builtOpts, correctOptionId } = buildOptions(antonym, distractors);
        return {
          id: `antonym_${idx}_${target.kanji}`,
          srsCardId: `kanji:${target.kanji}`,
          itemType: 'KANJI',
          itemKey: target.kanji,
          level: target.jlpt,
          prompt: `Quel kanji est l’antonyme (sens opposé) de « ${target.kanji} » (${targetMeaning}) ?`,
          reading: target.kun_readings[0] || target.on_readings[0],
          hint: 'Relation d’antonymie',
          options: builtOpts,
          correctOptionId,
          explanation: `${target.kanji} (${targetMeaning}) ↔ ${antonym} (opposé).`,
          itemMeta: extractKanjiMeta(target, 'antonym'),
        };
      }

      if (target.homonyms.length > 0) {
        const homonym = target.homonyms[0];
        const distractors = allChars
          .filter((c) => c !== target.kanji && c !== homonym && !target.homonyms.includes(c))
          .slice(0, 8);
        const { options: builtOpts, correctOptionId } = buildOptions(homonym, distractors);
        return {
          id: `homonym_${idx}_${target.kanji}`,
          srsCardId: `kanji:${target.kanji}`,
          itemType: 'KANJI',
          itemKey: target.kanji,
          level: target.jlpt,
          prompt: `Quel kanji partage la même lecture (homophone) que « ${target.kanji} » (${target.on_readings[0] || target.kun_readings[0] || '—'}) ?`,
          reading: target.on_readings[0] || target.kun_readings[0],
          hint: 'Homophonie kanji',
          options: builtOpts,
          correctOptionId,
          explanation: `${target.kanji} et ${homonym} partagent une lecture commune.`,
          itemMeta: extractKanjiMeta(target, 'homonym'),
        };
      }

      // Paronym / visual intruder set
      const paronymFamily = [target.kanji, ...target.similar.slice(0, 2)];
      const intruder =
        allChars.find((c) => c !== target.kanji && !target.similar.includes(c)) || '犬';
      const { options: builtOpts, correctOptionId } = buildOptions(intruder, paronymFamily);
      return {
        id: `paronym_${idx}_${target.kanji}`,
        srsCardId: `kanji:${target.kanji}`,
        itemType: 'KANJI',
        itemKey: target.kanji,
        level: target.jlpt,
        prompt: `Trouvez l’intrus visuel (n’est pas un paronyme graphique de « ${target.kanji} ») :`,
        reading: target.on_readings[0] || target.kun_readings[0],
        hint: 'Paronymes / sosies visuels',
        options: builtOpts,
        correctOptionId,
        explanation: `${intruder} n’appartient pas au groupe visuel ${paronymFamily.join(' / ')}.`,
        itemMeta: extractKanjiMeta(target, 'paronym'),
      };
    });
  }

  if (mode === 'speed_reading') {
    const filteredSeeds = YOMIKATA_Z_OFFICIAL_SEED.filter(
      (item) => level === 'ALL' || item.level === level
    );
    const pool = filteredSeeds.length > 0 ? filteredSeeds : YOMIKATA_Z_OFFICIAL_SEED;
    const chosen = shuffle(pool).slice(0, count);
    const distractorMeanings = YOMIKATA_Z_OFFICIAL_SEED.map((s) => `${s.reading} (${s.meaningFr})`);

    return chosen.map((item, idx) => {
      const answerLabel = `${item.reading} (${item.meaningFr})`;
      const { options: builtOpts, correctOptionId } = buildOptions(
        answerLabel,
        shuffle(distractorMeanings)
      );
      return {
        id: `speed_${idx}_${item.id}`,
        srsCardId: `yomikata:${item.targetWord}`,
        itemType: 'JUKUGO',
        itemKey: item.targetWord,
        level: item.level,
        prompt: `Lecture rapide — ${item.sentenceBefore}【${item.targetWord}】${item.sentenceAfter}`,
        hint: 'Identifiez vite lecture + sens en contexte',
        options: builtOpts,
        correctOptionId,
        explanation: item.explanation,
        itemMeta: {
          audioText: `${item.sentenceBefore}${item.targetWord}${item.sentenceAfter}`,
          frequencyScore10: item.frequencyScore10,
          jlpt: item.level,
        },
      };
    });
  }

  if (mode === 'translation_fr_ja') {
    const pool =
      level !== 'ALL'
        ? await localDb.kanjis.where('jlpt').equals(level as JLPTLevelNormalized).toArray()
        : await localDb.kanjis.filter((k) => k.jlpt !== 'N0').toArray();
    const valid = pool.filter((k) => k.meanings_fr.length > 0 || k.meanings_en.length > 0);
    const chosen = shuffle(valid).slice(0, count);

    return chosen.map((target, idx) => {
      const meaning =
        target.meanings_fr.slice(0, 2).join(', ') || target.meanings_en.slice(0, 2).join(', ');
      const toJapanese = idx % 2 === 0;

      if (toJapanese) {
        const distractors = shuffle(valid)
          .filter((k) => k.kanji !== target.kanji)
          .slice(0, 8)
          .map((k) => k.kanji);
        const { options: builtOpts, correctOptionId } = buildOptions(target.kanji, distractors);
        return {
          id: `tr_fr_ja_${idx}_${target.kanji}`,
          srsCardId: `kanji:${target.kanji}`,
          itemType: 'KANJI',
          itemKey: target.kanji,
          level: target.jlpt,
          prompt: `Traduction FR → JA : quel kanji correspond à « ${meaning} » ?`,
          hint: `Fréquence ${target.frequencyScore10 ?? '?'}/10`,
          options: builtOpts,
          correctOptionId,
          explanation: `« ${meaning} » → ${target.kanji} [${target.kun_readings[0] || target.on_readings[0] || '—'}]`,
          itemMeta: extractKanjiMeta(target),
        };
      }

      const distractors = shuffle(valid)
        .filter((k) => k.kanji !== target.kanji)
        .slice(0, 8)
        .map((k) => k.meanings_fr.slice(0, 2).join(', ') || k.meanings_en.slice(0, 2).join(', '));
      const { options: builtOpts, correctOptionId } = buildOptions(meaning, distractors);
      return {
        id: `tr_ja_fr_${idx}_${target.kanji}`,
        srsCardId: `kanji:${target.kanji}`,
        itemType: 'KANJI',
        itemKey: target.kanji,
        level: target.jlpt,
        prompt: `Traduction JA → FR : traduisez « ${target.kanji} »`,
        reading: target.kun_readings[0] || target.on_readings[0],
        hint: `Radical ${target.radical}`,
        options: builtOpts,
        correctOptionId,
        explanation: `${target.kanji} = « ${meaning} »`,
        itemMeta: extractKanjiMeta(target),
      };
    });
  }

  if (mode === 'jukugo_builder') {
    const jukugoAll = await localDb.jukugo
      .filter((j) => Boolean(j.word && j.reading && j.meaning_en && Array.from(j.word).length >= 2))
      .limit(500)
      .toArray();
    const levelPool =
      level !== 'ALL' ? jukugoAll.filter((j) => j.jlpt === level) : jukugoAll;
    const pool = levelPool.length >= 4 ? levelPool : jukugoAll;
    const chosen = shuffle(pool).slice(0, count);

    return chosen.map((target, idx) => {
      const chars = Array.from(target.word);
      const baseKanji = chars[0] || target.word;
      const sameRootDistractors = pool
        .filter((j) => j.word !== target.word && j.word.includes(baseKanji))
        .slice(0, 3)
        .map((j) => `${j.word} (${j.reading})`);
      const otherDistractors = shuffle(pool)
        .filter((j) => j.word !== target.word)
        .slice(0, 8)
        .map((j) => `${j.word} (${j.reading})`);

      const correctLabel = `${target.word} (${target.reading})`;
      const { options: builtOpts, correctOptionId } = buildOptions(correctLabel, [
        ...sameRootDistractors,
        ...otherDistractors,
      ]);

      return {
        id: `jbuilder_${idx}_${target.word}`,
        srsCardId: `jukugo:${target.word}`,
        itemType: 'JUKUGO',
        itemKey: target.word,
        level: target.jlpt || level || 'Jukugo',
        prompt: `Construction Jukugo (${chars.length} caractères) depuis « ${baseKanji} » : quel composé signifie « ${target.meaning_en.slice(0, 70)} » ?`,
        hint: `${chars.length} kanjis/caractères • racine ${baseKanji}`,
        options: builtOpts,
        correctOptionId,
        explanation: `${target.word} [${target.reading}] = ${target.meaning_en}`,
        itemMeta: {
          audioText: target.reading || target.word,
          frequencyScore10: target.frequencyScore10,
          transitivity: target.transitivity,
          pos: target.pos,
          images: target.images,
          jlpt: target.jlpt,
        },
      };
    });
  }

  if (mode === 'grammar_relations_connectors') {
    const dbPool =
      level !== 'ALL'
        ? await localDb.grammar.where('jlpt_level').equals(level).toArray()
        : await localDb.grammar.filter((g) => g.jlpt_level !== 'Unknown').toArray();
    const withConn = dbPool.filter((g) => Array.isArray(g.connections) && g.connections.length > 0);
    const chosenDb = shuffle(withConn).slice(0, Math.max(0, count - 2));

    const questions: DynamicQuizQuestion[] = [];
    const relSlice = shuffle(GRAMMAR_RELATIONS_SEED).slice(0, Math.min(count, 2));
    for (let i = 0; i < relSlice.length; i += 1) {
      const rel = relSlice[i];
      const { options: builtOpts, correctOptionId } = buildOptions(rel.answer, rel.distractors);
      questions.push({
        id: `grel_${i}_${rel.term}`,
        srsCardId: `grammar:${rel.term}`,
        itemType: 'GRAMMAR',
        itemKey: rel.term,
        level: rel.level,
        prompt: rel.prompt,
        reading: rel.reading,
        hint: 'Équivalent / opposé / registre grammatical',
        options: builtOpts,
        correctOptionId,
        explanation: rel.explanation,
        itemMeta: {
          audioText: rel.term,
          jlpt: rel.level,
          relationType: 'connector',
        },
      });
    }

    chosenDb.forEach((target, idx) => {
      const correctConn = target.connections[0];
      const distractors = shuffle(withConn)
        .filter((g) => g.term !== target.term && g.connections[0])
        .slice(0, 8)
        .map((g) => g.connections[0]);
      const { options: builtOpts, correctOptionId } = buildOptions(correctConn, distractors, [
        'N + ばかりに',
        'Vます + ながら',
        'Vた + とおりに',
        'いA + くて',
      ]);

      questions.push({
        id: `gconn_${idx}_${target.term}`,
        srsCardId: `grammar:${target.term}`,
        itemType: 'GRAMMAR',
        itemKey: target.term,
        level: target.jlpt_level,
        prompt: `Quelle règle de connexion 【接続】 s’applique devant « ${target.term} » ?`,
        reading: target.reading,
        hint: `Sens : ${target.meaning.split('\n')[0].slice(0, 60)}`,
        options: builtOpts,
        correctOptionId,
        explanation: `${target.term} se construit avec 【接続】 ${correctConn} — ${target.meaning.split('\n')[0]}`,
        itemMeta: {
          audioText: target.term,
          jlpt: target.jlpt_level,
          relationType: 'connector',
        },
      });
    });

    return questions.slice(0, count);
  }

  // jukugo_compound (original mode)
  const jukugoPool = await localDb.jukugo
    .orderBy('frequency')
    .reverse()
    .filter((j) => Boolean(j.reading && j.meaning_en))
    .limit(400)
    .toArray();
  const chosen = shuffle(jukugoPool).slice(0, count);

  return chosen.map((target, idx) => {
    const distractors = shuffle(jukugoPool)
      .slice(0, 12)
      .map((j) => `${j.reading} — ${j.meaning_en.slice(0, 50)}`);
    const answerLabel = `${target.reading} — ${target.meaning_en.slice(0, 50)}`;
    const { options: builtOpts, correctOptionId } = buildOptions(answerLabel, distractors);

    return {
      id: `jukugo_quiz_${idx}_${target.word}`,
      srsCardId: `jukugo:${target.word}`,
      itemType: 'JUKUGO',
      itemKey: target.word,
      level: target.jlpt || 'Jukugo',
      prompt: `Quelle est la lecture et le sens du composé « ${target.word} » ?`,
      hint: target.grammaticalFeature || 'Mot composé Jukugo haute fréquence',
      options: builtOpts,
      correctOptionId,
      explanation: `${target.word} [${target.reading}] : ${target.meaning_en}`,
      itemMeta: {
        audioText: target.reading || target.word,
        frequencyScore10: target.frequencyScore10,
        transitivity: target.transitivity,
        pos: target.pos,
        images: target.images,
        jlpt: target.jlpt,
      },
    };
  });
}
