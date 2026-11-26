import type { JukugoRecord, SRSCardRecord } from '@/lib/db';

export interface JukugoGlobalStats {
  totalJukugo: number;
  studiedCount: number;
  masteredCount: number;
  byLength: {
    len2: number;
    len3: number;
    len4Plus: number;
  };
  byLevel: Record<'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'N0', number>;
  transitivity: {
    jidoushi: number;
    tadoushi: number;
  };
}

export interface PostQuizSmartGoal {
  title: string;
  specificFr: string;
  measurableFr: string;
  achievableFr: string;
  timeboundFr: string;
  href: string;
  cta: string;
  tier: 'consolidate' | 'improve' | 'advance';
}

export function computeJukugoGlobalStats(
  jukugoRows: JukugoRecord[],
  srsCards: SRSCardRecord[]
): JukugoGlobalStats {
  const cardByKey = new Map<string, SRSCardRecord>();
  for (const c of srsCards) {
    if (c.itemType === 'JUKUGO' || c.cardId.startsWith('jukugo:')) {
      cardByKey.set(c.itemKey, c);
    }
  }

  let studiedCount = 0;
  let masteredCount = 0;
  let len2 = 0;
  let len3 = 0;
  let len4Plus = 0;
  let jidoushi = 0;
  let tadoushi = 0;

  const byLevel: Record<'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'N0', number> = {
    N5: 0,
    N4: 0,
    N3: 0,
    N2: 0,
    N1: 0,
    N0: 0,
  };

  for (const j of jukugoRows) {
    const count = j.kanjiCount ?? Array.from(j.word).length;
    if (count === 2) len2 += 1;
    else if (count === 3) len3 += 1;
    else if (count >= 4) len4Plus += 1;

    if (j.jlpt && j.jlpt in byLevel) {
      byLevel[j.jlpt] += 1;
    }

    if (j.transitivity === 'jidoushi') jidoushi += 1;
    else if (j.transitivity === 'tadoushi') tadoushi += 1;

    const card = cardByKey.get(j.word);
    if (card) {
      studiedCount += 1;
      if (card.repetitions >= 3 && card.intervalDays >= 6) {
        masteredCount += 1;
      }
    }
  }

  return {
    totalJukugo: jukugoRows.length,
    studiedCount,
    masteredCount,
    byLength: { len2, len3, len4Plus },
    byLevel,
    transitivity: { jidoushi, tadoushi },
  };
}

export function buildPostQuizSmartGoal(input: {
  contextLabel: string;
  level: string;
  accuracyPct: number;
  missedCount: number;
  dueCount?: number;
}): PostQuizSmartGoal {
  const safeLevel = input.level && input.level !== 'ALL' ? input.level : 'N4–N3';
  const pct = Math.max(0, Math.min(100, Math.round(input.accuracyPct)));

  if (pct < 60) {
    const targetReview = Math.max(5, Math.min(20, input.missedCount + (input.dueCount || 0)));
    return {
      title: `Objectif SMART : consolider vos bases (${pct}% sur ${input.contextLabel})`,
      specificFr: `Revoir les ${input.missedCount || 'principales'} erreurs injectées en file SM-2 (${safeLevel}).`,
      measurableFr: `Atteindre ≥ 75 % de réussite sur la session de rattrapage (${targetReview} cartes).`,
      achievableFr: 'Révision ciblée avec feedback multimédia + indices morphologiques.',
      timeboundFr: 'D’ici les prochaines 24 heures (10–15 min).',
      href: '/practice?mode=srs_review',
      cta: 'Réviser en SRS maintenant',
      tier: 'consolidate',
    };
  }

  if (pct < 85) {
    return {
      title: `Objectif SMART : viser la maîtrise fluide (${pct}% → ≥ 90%)`,
      specificFr: `Renforcer les nuances en contexte (${input.contextLabel}) au niveau ${safeLevel}.`,
      measurableFr: 'Enchaîner une série de 10 questions avec ≤ 1 erreur et bonus chrono.',
      achievableFr: 'Alterner Yomikata Z (clavier/oral) et ateliers phrases.',
      timeboundFr: 'Sous 48 heures (1 session de 15 min).',
      href: '/practice?tab=yomikata',
      cta: 'Passer à Yomikata Z',
      tier: 'improve',
    };
  }

  return {
    title: `Objectif SMART : passer au palier supérieur (${pct}% acquis !)`,
    specificFr: `Réinvestir les acquis ${safeLevel} dans la lecture de textes authentiques.`,
    measurableFr: 'Lire 1 texte complet et extraire 5 nouveaux jukugo vers le carnet.',
    achievableFr: 'Mode Furigana Adaptatif activé pour ne masquer que les mots maîtrisés.',
    timeboundFr: 'Aujourd’hui ou cette semaine (15 min).',
    href: '/reader',
    cta: 'Ouvrir Script 2 List',
    tier: 'advance',
  };
}
