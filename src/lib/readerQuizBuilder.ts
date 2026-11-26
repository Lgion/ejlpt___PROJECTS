import type { DynamicQuizQuestion } from '@/lib/quizGenerator';
import type { TextAnalysisResult } from '@/lib/textAnalyzer';

function deterministicRotate<T>(arr: T[], seed: number): T[] {
  if (arr.length === 0) return [];
  const shift = seed % arr.length;
  return [...arr.slice(shift), ...arr.slice(0, shift)];
}

export function buildQuizFromAnalysis(
  analysis: TextAnalysisResult,
  maxQuestions = 8
): DynamicQuizQuestion[] {
  const letters = ['a', 'b', 'c', 'd'];
  const questions: DynamicQuizQuestion[] = [];

  const vocabPool = analysis.vocabList.filter((v) => v.word && v.reading && v.meaning);
  const kanjiPool = analysis.kanjiList.filter((k) => k.kanji && k.meaning);

  const fallbackMeanings = [
    'communication / parole',
    'temps / moment',
    'préparation / organisation',
    'voyage / déplacement',
  ];

  for (let i = 0; i < vocabPool.length && questions.length < maxQuestions; i += 1) {
    const target = vocabPool[i];
    const correctLabel = `${target.reading} — ${target.meaning.slice(0, 55)}`;

    const distractors = vocabPool
      .filter((v) => v.word !== target.word)
      .slice(0, 8)
      .map((v) => `${v.reading} — ${v.meaning.slice(0, 55)}`);

    while (distractors.length < 3) {
      distractors.push(fallbackMeanings[distractors.length % fallbackMeanings.length]);
    }

    const rotated = deterministicRotate([correctLabel, ...distractors.slice(0, 3)], i + target.word.length);
    const correctIdx = rotated.indexOf(correctLabel);

    questions.push({
      id: `reader_vocab_${i}_${target.word}`,
      srsCardId: `jukugo:${target.word}`,
      itemType: 'JUKUGO',
      itemKey: target.word,
      level: target.jlpt || 'N0',
      prompt: `Dans ce passage, quelle est la lecture et le sens de « ${target.word} » ?`,
      hint: `Apparu ${target.count} fois dans le texte`,
      options: rotated.map((text, idx) => ({ id: letters[idx], text })),
      correctOptionId: letters[correctIdx >= 0 ? correctIdx : 0],
      explanation: `${target.word} [${target.reading}] : ${target.meaning} (JLPT ${target.jlpt})`,
      itemMeta: {
        audioText: target.reading || target.word,
        jlpt: target.jlpt,
      },
    });
  }

  for (let i = 0; i < kanjiPool.length && questions.length < maxQuestions; i += 1) {
    const target = kanjiPool[i];
    const correctLabel = target.meaning.slice(0, 65);
    const distractors = kanjiPool
      .filter((k) => k.kanji !== target.kanji)
      .slice(0, 8)
      .map((k) => k.meaning.slice(0, 65));

    while (distractors.length < 3) {
      distractors.push(fallbackMeanings[distractors.length % fallbackMeanings.length]);
    }

    const rotated = deterministicRotate([correctLabel, ...distractors.slice(0, 3)], i + 2);
    const correctIdx = rotated.indexOf(correctLabel);

    questions.push({
      id: `reader_kanji_${i}_${target.kanji}`,
      srsCardId: `kanji:${target.kanji}`,
      itemType: 'KANJI',
      itemKey: target.kanji,
      level: target.jlpt || 'N0',
      prompt: `Quel est le sens du kanji « ${target.kanji} » extrait de ce texte ?`,
      reading: target.reading,
      hint: `${target.strokes ?? '?'} traits • JLPT ${target.jlpt}`,
      options: rotated.map((text, idx) => ({ id: letters[idx], text })),
      correctOptionId: letters[correctIdx >= 0 ? correctIdx : 0],
      explanation: `${target.kanji} [${target.reading || '—'}] : ${target.meaning}`,
      itemMeta: {
        kanji: target.kanji,
        audioText: target.reading || target.kanji,
        strokes: target.strokes,
        jlpt: target.jlpt,
      },
    });
  }

  return questions;
}
