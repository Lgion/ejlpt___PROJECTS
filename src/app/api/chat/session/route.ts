import { NextResponse } from 'next/server';
import { generateGeminiJson } from '@/lib/ai/geminiClient';
import { moderateUserText } from '@/lib/ai/moderation';
import type { ChatDiscussionTopic } from '@/data/chatTopics';

export const dynamic = 'force-dynamic';

interface ChatReplyJson {
  replyJa: string;
  readingHira: string;
  translationFr: string;
  feedbackFr: string;
  followUpJa: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = body.action === 'generate_topic' ? 'generate_topic' : 'reply';
    const level = String(body.level || 'N4').toUpperCase();

    if (action === 'generate_topic') {
      const themeRaw = String(body.customTheme || 'Vie quotidienne au Japon');
      const mod = moderateUserText(themeRaw, { minLength: 2, maxLength: 140 });
      if (!mod.allowed) {
        return NextResponse.json(
          { ok: false, error: mod.reasonFr || 'Thème refusé par la modération.' },
          { status: 400 }
        );
      }

      const prompt = [
        `Crée 1 sujet de discussion oral structuré pour un apprenant de japonais niveau JLPT ${level}.`,
        `Thème demandé : ${mod.sanitizedText}`,
        'Contrainte : borne strictement le vocabulaire et la grammaire au niveau JLPT demandé sans dispersion hors niveau.',
        'Retourne STRICTEMENT un JSON : {"titleFr": string, "titleJa": string, "starterJa": string, "starterReading": string, "starterFr": string, "vocabField": [{"word": string, "reading": string, "meaningFr": string}], "grammarPatterns": [string], "exampleSentences": [string]}.',
      ].join('\n');

      const aiRes = await generateGeminiJson<Omit<ChatDiscussionTopic, 'id' | 'level'>>(prompt, {
        temperature: 0.4,
        maxOutputTokens: 1100,
      });

      if (!aiRes.ok || !aiRes.data?.starterJa) {
        return NextResponse.json(
          {
            ok: false,
            error: aiRes.userError || 'Impossible de générer un nouveau sujet actuellement.',
            usedFallback: aiRes.usedFallback,
            events: aiRes.events,
          },
          { status: 503 }
        );
      }

      const topic: ChatDiscussionTopic = {
        id: `topic_${crypto.randomUUID()}`,
        level: (['N5', 'N4', 'N3', 'N2', 'N1'].includes(level) ? level : 'N4') as ChatDiscussionTopic['level'],
        titleFr: aiRes.data.titleFr || mod.sanitizedText,
        titleJa: aiRes.data.titleJa || mod.sanitizedText,
        starterJa: aiRes.data.starterJa,
        starterReading: aiRes.data.starterReading || aiRes.data.starterJa,
        starterFr: aiRes.data.starterFr || '',
        vocabField: Array.isArray(aiRes.data.vocabField) ? aiRes.data.vocabField.slice(0, 5) : [],
        grammarPatterns: Array.isArray(aiRes.data.grammarPatterns)
          ? aiRes.data.grammarPatterns.slice(0, 4)
          : [],
        exampleSentences: Array.isArray(aiRes.data.exampleSentences)
          ? aiRes.data.exampleSentences.slice(0, 3)
          : [],
      };

      return NextResponse.json({
        ok: true,
        topic,
        usedFallback: aiRes.usedFallback,
        events: aiRes.events,
      });
    }

    // action === 'reply'
    const userMsgRaw = String(body.userMessage || '');
    const topicTitle = String(body.topicTitle || 'Conversation libre');
    const vocabHint = Array.isArray(body.vocabWords) ? body.vocabWords.map(String).slice(0, 6).join(', ') : '';

    const mod = moderateUserText(userMsgRaw, { minLength: 1, maxLength: 500 });
    if (!mod.allowed) {
      return NextResponse.json(
        { ok: false, error: mod.reasonFr || 'Message refusé par la modération.' },
        { status: 400 }
      );
    }

    const prompt = [
      `Tu es un partenaire de conversation IA patient pour un élève de niveau JLPT ${level}.`,
      `Sujet borné : ${topicTitle}${vocabHint ? ` (vocabulaire ciblé : ${vocabHint})` : ''}.`,
      `Réplique de l'élève : ${mod.sanitizedText}`,
      'Consignes strictes :',
      `1. Réponds en japonais naturel STRICTEMENT adapté au niveau JLPT ${level} (phrases courtes et claires).`,
      '2. Donne une brève rétroaction bienveillante en français (feedbackFr) sur la justesse des particules/registres.',
      '3. Pose une courte question de relance (followUpJa) pour maintenir le dialogue sur le thème.',
      'Retourne STRICTEMENT un JSON : {"replyJa": string, "readingHira": string, "translationFr": string, "feedbackFr": string, "followUpJa": string}.',
    ].join('\n');

    const aiRes = await generateGeminiJson<ChatReplyJson>(prompt, {
      temperature: 0.4,
      maxOutputTokens: 900,
    });

    if (!aiRes.ok || !aiRes.data?.replyJa) {
      return NextResponse.json(
        {
          ok: false,
          error: aiRes.userError || 'Le tuteur IA est momentanément indisponible.',
          usedFallback: aiRes.usedFallback,
          events: aiRes.events,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      turn: aiRes.data,
      usedFallback: aiRes.usedFallback,
      events: aiRes.events,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Erreur lors de l’échange avec le tuteur IA.' },
      { status: 500 }
    );
  }
}
