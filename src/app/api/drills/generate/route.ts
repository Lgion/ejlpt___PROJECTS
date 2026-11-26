import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { generateGeminiJson } from '@/lib/ai/geminiClient';
import { moderateUserText } from '@/lib/ai/moderation';
import {
  computeExerciseFingerprint,
  VALID_LEVELS,
  VALID_MODES,
  type CollectionExerciseItem,
  type CollectionJLPTLevel,
  type ExerciseDrillMode,
} from '@/lib/exerciseCollections';

export const dynamic = 'force-dynamic';

interface AiGeneratedDrillRaw {
  prompt: string;
  targetWord?: string;
  reading?: string;
  expectedAnswers: string[];
  distractors?: string[];
  explanation: string;
  tags?: string[];
}

interface EvaluateFreeResult {
  isCorrect: boolean;
  score: number;
  correctedSentence: string;
  feedbackFr: string;
}

const MODE_LABELS_FR: Record<ExerciseDrillMode, string> = {
  polite_transform: 'Transformation de registre (丁寧語 / 尊敬語 / 謙譲語 / 普通形)',
  particles: 'Choix et priorité des particules japonaises',
  sentence_builder: 'Construction progressive ou assemblage syntaxique de phrase',
  error_correction: 'Détection et correction d’une phrase japonaise fautive',
  ukemikei: 'Forme passive japonaise (受身形, passif direct et subi)',
  conditional_imperative: 'Conditionnels (と/ば/たら/なら) et Impératif/Prohibitif',
  polite_to_casual: 'Passage forme polie complète ↔ forme familière et abrégée (てる/とく/ちゃう)',
  double_particles: 'Décomposition de doubles particules (とは/のを/では) ou phrase natale + particules',
  yomikata_z: 'Lecture et sens en contexte de phrase',
  quiz_custom: 'Quiz lexical ou grammatical ciblé',
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = body.action === 'evaluate_free' ? 'evaluate_free' : 'generate';

    if (action === 'evaluate_free') {
      const promptText = String(body.prompt || '');
      const userSentence = String(body.userSentence || '');
      const expectedAnswers = Array.isArray(body.expectedAnswers)
        ? body.expectedAnswers.map(String)
        : [];
      const level = String(body.level || 'N4');

      const mod = moderateUserText(userSentence, { minLength: 1, maxLength: 400 });
      if (!mod.allowed) {
        return NextResponse.json(
          { ok: false, error: mod.reasonFr || 'Phrase refusée par la modération.' },
          { status: 400 }
        );
      }

      const evalPrompt = [
        `Tu es un professeur de japonais expert (niveau cible JLPT ${level}).`,
        `Consigne de l'exercice : ${promptText}`,
        `Réponses de référence : ${JSON.stringify(expectedAnswers)}`,
        `Réponse libre de l'élève : ${mod.sanitizedText}`,
        'Évalue la réponse de l’élève avec bienveillance et rigueur grammaticale.',
        'Retourne STRICTEMENT un JSON : {"isCorrect": boolean, "score": number (0..100), "correctedSentence": string, "feedbackFr": string}.',
      ].join('\n');

      const aiRes = await generateGeminiJson<EvaluateFreeResult>(evalPrompt, {
        temperature: 0.2,
        maxOutputTokens: 700,
      });

      if (!aiRes.ok || !aiRes.data) {
        return NextResponse.json(
          {
            ok: false,
            error: aiRes.userError || 'Impossible d’évaluer votre phrase actuellement.',
            usedFallback: aiRes.usedFallback,
            retriesCount: aiRes.retriesCount,
            events: aiRes.events,
          },
          { status: 503 }
        );
      }

      return NextResponse.json({
        ok: true,
        evaluation: aiRes.data,
        usedFallback: aiRes.usedFallback,
        retriesCount: aiRes.retriesCount,
        events: aiRes.events,
      });
    }

    // Action: generate new drills and persist to ai_generated collection
    const mode = String(body.mode || 'polite_transform') as ExerciseDrillMode;
    const levelRaw = String(body.level || 'N4').toUpperCase();
    const level: CollectionJLPTLevel = VALID_LEVELS.has(levelRaw as CollectionJLPTLevel)
      ? (levelRaw as CollectionJLPTLevel)
      : 'N4';
    const count = Math.max(1, Math.min(5, Number(body.count) || 3));

    if (!VALID_MODES.has(mode)) {
      return NextResponse.json({ ok: false, error: 'Mode d’exercice invalide.' }, { status: 400 });
    }

    const genPrompt = [
      `Génère exactement ${count} exercice(s) originaux de japonais pour le niveau JLPT ${level}.`,
      `Type d'atelier : ${MODE_LABELS_FR[mode]}.`,
      'Chaque exercice doit contenir :',
      '- prompt : consigne claire en français + phrase japonaise à traiter',
      '- expectedAnswers : tableau de 1 à 2 réponses exactes attendues en japonais',
      '- distractors : tableau de exactement 3 distracteurs plausibles mais faux en japonais',
      '- explanation : explication grammaticale concise en français',
      '- tags : 1 à 2 mots-clés courts',
      'Retourne STRICTEMENT un tableau JSON d’objets.',
    ].join('\n');

    const aiRes = await generateGeminiJson<AiGeneratedDrillRaw[]>(genPrompt, {
      temperature: 0.5,
      maxOutputTokens: 1800,
    });

    if (!aiRes.ok || !Array.isArray(aiRes.data)) {
      return NextResponse.json(
        {
          ok: false,
          error: aiRes.userError || 'Impossible de générer de nouveaux exercices actuellement.',
          usedFallback: aiRes.usedFallback,
          retriesCount: aiRes.retriesCount,
          events: aiRes.events,
        },
        { status: 503 }
      );
    }

    const nowIso = new Date().toISOString();
    const letters = ['a', 'b', 'c', 'd'];
    const builtItems: CollectionExerciseItem[] = [];

    for (const rawItem of aiRes.data.slice(0, count)) {
      if (!rawItem?.prompt || !Array.isArray(rawItem.expectedAnswers) || rawItem.expectedAnswers.length === 0) {
        continue;
      }
      const correctText = String(rawItem.expectedAnswers[0]).trim();
      const distractors = Array.isArray(rawItem.distractors)
        ? rawItem.distractors.map((d) => String(d).trim()).filter((d) => d && d !== correctText).slice(0, 3)
        : [];
      const rawOptions = [correctText, ...distractors];
      // Deterministic lightweight rotation by prompt length so answer isn't always index 0
      const shift = rawItem.prompt.length % Math.max(1, rawOptions.length);
      const rotated = [...rawOptions.slice(shift), ...rawOptions.slice(0, shift)];
      const correctIdx = rotated.indexOf(correctText);

      const cleanAnswers = rawItem.expectedAnswers.map((a) => String(a).trim()).filter(Boolean);
      const fingerprint = computeExerciseFingerprint({
        mode,
        level,
        prompt: rawItem.prompt,
        expectedAnswers: cleanAnswers,
      });

      builtItems.push({
        id: `ai_${crypto.randomUUID()}`,
        fingerprint,
        source: 'ai_generated',
        mode,
        level,
        prompt: rawItem.prompt.trim(),
        targetWord: rawItem.targetWord?.trim() || undefined,
        reading: rawItem.reading?.trim() || undefined,
        expectedAnswers: cleanAnswers,
        options: rotated.map((text, idx) => ({ id: letters[idx] || String(idx), text })),
        correctOptionId: letters[correctIdx >= 0 ? correctIdx : 0],
        explanation: String(rawItem.explanation || 'Exercice généré par IA.').trim(),
        tags: Array.isArray(rawItem.tags) ? rawItem.tags.map(String).slice(0, 4) : ['ia'],
        status: 'active',
        authorType: 'ai',
        createdAt: nowIso,
      });
    }

    let savedToPool = 0;
    if (builtItems.length > 0) {
      try {
        const client = await clientPromise;
        const db = client.db('ejlpt_db');
        const col = db.collection<CollectionExerciseItem>('exercise_items');
        for (const item of builtItems) {
          const res = await col.updateOne(
            { fingerprint: item.fingerprint, source: 'ai_generated' },
            { $setOnInsert: item },
            { upsert: true }
          );
          if (res.upsertedCount > 0) savedToPool += 1;
        }
      } catch {
        // Keep generated items usable even if MongoDB is temporarily offline
      }
    }

    return NextResponse.json({
      ok: true,
      items: builtItems,
      savedToPool,
      usedFallback: aiRes.usedFallback,
      retriesCount: aiRes.retriesCount,
      events: aiRes.events,
    });
  } catch (error: unknown) {
    console.error('Error in /api/drills/generate:', error);
    return NextResponse.json(
      { ok: false, error: 'Erreur serveur lors de la génération ou correction.' },
      { status: 500 }
    );
  }
}
