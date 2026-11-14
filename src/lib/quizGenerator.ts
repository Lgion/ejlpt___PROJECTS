import { localDb, seedLocalDatabase, JLPTLevelNormalized } from '@/lib/db';

export type DynamicQuizMode =
  | 'kanji_reading'
  | 'grammar_cloze'
  | 'synonyms_intruder'
  | 'jukugo_compound'
  | 'srs_review';

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

function buildOptions(correctText: string, distractorPool: string[]): {
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
} {
  const uniqueDistractors = Array.from(
    new Set(distractorPool.map((d) => d.trim()).filter((d) => d && d !== correctText))
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
    const distractorMeanings = allKanjis
      .map((k) => k.meanings_fr[0] || k.meanings_en[0] || '')
      .filter(Boolean);

    return cards.slice(0, count).map((c, idx) => {
      const { options: builtOpts, correctOptionId } = buildOptions(c.answer, shuffle(distractorMeanings));
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
      };
    });
  }

  if (mode === 'kanji_reading') {
    const pool =
      level !== 'ALL'
        ? await localDb.kanjis.where('jlpt').equals(level as JLPTLevelNormalized).toArray()
        : await localDb.kanjis.filter((k) => k.jlpt !== 'N0').toArray();

    const valid = pool.filter(
      (k) => (k.meanings_fr.length > 0 || k.meanings_en.length > 0) && (k.kun_readings.length > 0 || k.on_readings.length > 0)
    );
    const chosen = shuffle(valid).slice(0, count);
    const allByChar = new Map(valid.map((k) => [k.kanji, k]));

    return chosen.map((target, idx) => {
      const targetMeaning = target.meanings_fr.slice(0, 2).join(', ') || target.meanings_en.slice(0, 2).join(', ');
      const similarDistractors = target.similar
        .map((s) => allByChar.get(s))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .map((item) => item.meanings_fr.slice(0, 2).join(', ') || item.meanings_en.slice(0, 2).join(', '));

      const randomDistractors = shuffle(valid)
        .slice(0, 12)
        .map((item) => item.meanings_fr.slice(0, 2).join(', ') || item.meanings_en.slice(0, 2).join(', '));

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
        reading: [...target.on_readings.slice(0, 2), ...target.kun_readings.slice(0, 2)].join(' • '),
        hint: `Radical ${target.radical} • ${target.strokes ?? '?'} traits`,
        options: builtOpts,
        correctOptionId,
        explanation: `On: ${target.on_readings.join(', ') || '—'} | Kun: ${target.kun_readings.join(', ') || '—'} | Sens: ${targetMeaning}`,
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
        hint: target.connections.length > 0 ? `接続 : ${target.connections[0]}` : `Catégorie : ${target.category}`,
        options: builtOpts,
        correctOptionId,
        explanation: `${target.term} (${target.jlpt_level})${target.connections[0] ? ` — 接続: ${target.connections[0]}` : ''} : ${cleanMeaning}`,
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
      const related = [...target.synonyms, ...target.similar].filter((c) => c && c !== target.kanji);
      const correct = related[0] || target.variants[0] || target.kanji;
      const distractors = fallbackChars.filter((c) => c !== target.kanji && !related.includes(c)).slice(0, 8);
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
      };
    });
  }

  // jukugo_compound
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
      level: 'Jukugo',
      prompt: `Quelle est la lecture et le sens du composé « ${target.word} » ?`,
      hint: target.grammaticalFeature || 'Mot composé Jukugo haute fréquence',
      options: builtOpts,
      correctOptionId,
      explanation: `${target.word} [${target.reading}] : ${target.meaning_en}`,
    };
  });
}

