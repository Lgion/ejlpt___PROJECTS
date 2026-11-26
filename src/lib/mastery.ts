import type { SRSCardRecord } from '@/lib/db';

export type MasteryTier = 'unseen' | 'learning' | 'consolidated' | 'mastered';

export type FrequencyBand = 'high' | 'mid' | 'low';

export type GrammaticalVisualTag =
  | 'verb_ichidan'
  | 'verb_godan'
  | 'verb_irregular'
  | 'jidoushi'
  | 'tadoushi'
  | 'adj_i'
  | 'adj_na'
  | 'particle'
  | 'keigo'
  | 'setsuzokushi'
  | 'soto'
  | 'uchi'
  | 'positive'
  | 'negative'
  | 'noun'
  | 'other';

export const MASTERY_META: Record<
  MasteryTier,
  { labelFr: string; shortFr: string; descriptionFr: string }
> = {
  unseen: {
    labelFr: 'Jamais vu',
    shortFr: 'Nouveau',
    descriptionFr: 'Aucune révision SRS enregistrée pour cet item.',
  },
  learning: {
    labelFr: 'En apprentissage',
    shortFr: 'Apprentissage',
    descriptionFr: 'Carte SRS active avec moins de 2 répétitions ou erreur récente.',
  },
  consolidated: {
    labelFr: 'Consolidé',
    shortFr: 'Consolidé',
    descriptionFr: 'Au moins 2 répétitions réussies et intervalle ≥ 6 jours.',
  },
  mastered: {
    labelFr: 'Maîtrisé',
    shortFr: 'Maîtrisé',
    descriptionFr: 'Au moins 3 répétitions réussies et intervalle ≥ 21 jours.',
  },
};

export const GRAMMATICAL_TAG_LABELS: Record<GrammaticalVisualTag, string> = {
  verb_ichidan: 'Verbe Ichidan (1段)',
  verb_godan: 'Verbe Godan (5段)',
  verb_irregular: 'Verbe Irrégulier',
  jidoushi: 'Verbe Intransitif (自動詞)',
  tadoushi: 'Verbe Transitif (他動詞)',
  adj_i: 'Adjectif -い',
  adj_na: 'Adjectif -な',
  particle: 'Particule (助詞)',
  keigo: 'Keigo (尊敬・謙譲)',
  setsuzokushi: 'Connexion (接続詞)',
  soto: 'Registre Soto (外)',
  uchi: 'Registre Uchi (内)',
  positive: 'Nuance positive (+)',
  negative: 'Nuance négative (−)',
  noun: 'Nom / Concept',
  other: 'Général',
};

export function computeMasteryTier(
  card?: Pick<SRSCardRecord, 'repetitions' | 'intervalDays' | 'lapses'> | null
): MasteryTier {
  if (!card) return 'unseen';
  if (card.repetitions >= 3 && card.intervalDays >= 21) return 'mastered';
  if (card.repetitions >= 2 && card.intervalDays >= 6) return 'consolidated';
  return 'learning';
}

export function getFrequencyBand(score10?: number): FrequencyBand {
  const safe = typeof score10 === 'number' && Number.isFinite(score10) ? score10 : 1;
  if (safe >= 8) return 'high';
  if (safe >= 4) return 'mid';
  return 'low';
}

export function inferTokenGrammaticalTag(input: {
  pos?: string;
  transitivity?: string;
  isVerbe?: string;
  isAdj?: string;
  isKeigo?: [boolean, boolean];
  isSetsuzokushi?: boolean;
  sotoUchi?: string;
  dualisme?: number;
}): GrammaticalVisualTag {
  if (input.isKeigo && (input.isKeigo[0] || input.isKeigo[1])) return 'keigo';
  if (input.isSetsuzokushi || input.pos === 'conjunction') return 'setsuzokushi';
  if (input.pos === 'preposition') return 'particle';
  if (input.transitivity === 'jidoushi') return 'jidoushi';
  if (input.transitivity === 'tadoushi') return 'tadoushi';

  if (input.pos === 'verb_ichidan' || input.isVerbe === 'ichidan') return 'verb_ichidan';
  if (input.pos === 'verb_godan' || input.isVerbe === 'godan') return 'verb_godan';
  if (input.pos === 'verb_irregular' || input.isVerbe === 'irregulier') return 'verb_irregular';
  if (input.pos === 'adj_i' || input.isAdj === 'i') return 'adj_i';
  if (input.pos === 'adj_na' || input.isAdj === 'na') return 'adj_na';

  if (input.sotoUchi === 'soto') return 'soto';
  if (input.sotoUchi === 'uchi') return 'uchi';
  if (input.dualisme === 1) return 'positive';
  if (input.dualisme === -1) return 'negative';
  if (input.pos === 'noun') return 'noun';
  return 'other';
}
