export type FaqCategory =
  | 'grammaire'
  | 'vocabulaire'
  | 'kanji'
  | 'keigo'
  | 'jlpt_methode'
  | 'culture';

export interface FaqComment {
  id: string;
  body: string;
  authorLabel: string;
  authorUserId?: string;
  createdAt: string;
}

export interface FaqQuestion {
  id: string;
  title: string;
  body: string;
  category: FaqCategory;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'ALL';
  aiAnswer: string;
  authorLabel: string;
  authorUserId?: string;
  voterIds: string[];
  voteCount: number;
  comments: FaqComment[];
  status: 'active' | 'hidden';
  createdAt: string;
}

export const FAQ_CATEGORIES: Array<{ id: FaqCategory; label: string }> = [
  { id: 'grammaire', label: 'Grammaire' },
  { id: 'vocabulaire', label: 'Vocabulaire' },
  { id: 'kanji', label: 'Kanji' },
  { id: 'keigo', label: 'Keigo / Registres' },
  { id: 'jlpt_methode', label: 'Méthode JLPT' },
  { id: 'culture', label: 'Culture & Usages' },
];

function tokenizeForSimilarity(text: string): Set<string> {
  const clean = text.normalize('NFKC').toLowerCase();
  const words = clean
    .split(/[\s,.;:!?()/「」【】、。・〜~]+/)
    .filter((w) => w.length >= 2);
  const cjk = clean.match(/[\u3040-\u30ff\u4e00-\u9faf]/g) || [];
  return new Set([...words, ...cjk]);
}

export function computeFaqSimilarity(a: string, b: string): number {
  const setA = tokenizeForSimilarity(a);
  const setB = tokenizeForSimilarity(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const tok of setA) {
    if (setB.has(tok)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export function findSimilarFaqQuestions(
  title: string,
  pool: FaqQuestion[],
  threshold = 0.42
): FaqQuestion[] {
  return pool
    .filter((q) => q.status === 'active')
    .map((q) => ({ q, score: computeFaqSimilarity(title, q.title) }))
    .filter((entry) => entry.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.q);
}

export const SEED_PUBLIC_FAQ: FaqQuestion[] = [
  {
    id: 'faq_wa_ga',
    title: 'Quelle est la vraie différence entre は (wa) et が (ga) ?',
    body: 'Je confonds toujours は et が dans une phrase simple. Quand utiliser l’un plutôt que l’autre ?',
    category: 'grammaire',
    level: 'N5',
    aiAnswer:
      '• **は (wa)** pose le **thème** connu dont on va parler (« À propos de X… ») et met l’accent sur ce qui vient *après*.\n• **が (ga)** identifie le **sujet grammatical** ou une information **nouvelle** (« C’est X qui… »), indispensable avec les mots interrogatifs (誰が), les préférences (〜が好き), les capacités (〜ができる) et l’existence (〜がある/いる).',
    authorLabel: 'Socle eJLPT',
    voterIds: [],
    voteCount: 24,
    comments: [
      {
        id: 'c_seed_1',
        body: 'Pensez à l’analogie : « Quant à X (は), ... » vs « C’est X (が) qui ... ».',
        authorLabel: 'Communauté',
        createdAt: '2026-11-01T10:00:00.000Z',
      },
    ],
    status: 'active',
    createdAt: '2026-11-01T09:00:00.000Z',
  },
  {
    id: 'faq_jidoushi_tadoushi',
    title: 'Comment retenir les paires 自動詞 (intransitif) vs 他動詞 (transitif) ?',
    body: '開く / 開ける, 閉まる / 閉める… Existe-t-il des terminaisons fiables pour ne pas les inverser ?',
    category: 'grammaire',
    level: 'N4',
    aiAnswer:
      'Oui ! 3 règles couvrent ~75 % des paires :\n1. **-aru → 自動詞** vs **-eru → 他動詞** (閉まる/閉める, 上がる/上げる, 始まる/始める).\n2. **-su → quasi toujours 他動詞** (消す, 出す, 起こす, 直す).\n3. **Particule clé** : **が + 自動詞** (ドアが開く, la porte s’ouvre seule) vs **を + 他動詞** (ドアを開ける, j’ouvre la porte).',
    authorLabel: 'Socle eJLPT',
    voterIds: [],
    voteCount: 19,
    comments: [],
    status: 'active',
    createdAt: '2026-11-02T09:00:00.000Z',
  },
  {
    id: 'faq_sonkei_kenjou',
    title: 'Quand utiliser 尊敬語 (Sonkeigo) vs 謙譲語 (Kenjōgo) avec Soto / Uchi ?',
    body: 'Devant un client externe, quel registre dois-je employer pour parler de mon propre directeur ?',
    category: 'keigo',
    level: 'N3',
    aiAnswer:
      'En japonais, votre entreprise forme le groupe interne (**Uchi 内**) face au client externe (**Soto 外**). Même si votre directeur est votre supérieur en interne, devant un client vous **abaissez son action avec du Kenjōgo (謙譲語)** ou du **Teineigo** : « 部長の田中はただいま席を外しております (おる = humble) » et jamais « いらっしゃいます ».',
    authorLabel: 'Socle eJLPT',
    voterIds: [],
    voteCount: 17,
    comments: [],
    status: 'active',
    createdAt: '2026-11-03T09:00:00.000Z',
  },
  {
    id: 'faq_teoku_toku',
    title: 'Différence entre 〜ておく, 〜とく et 〜てみる ?',
    body: 'On entend souvent やっとく ou 食べてみる à l’oral. Que changent ces auxiliaires ?',
    category: 'vocabulaire',
    level: 'N4',
    aiAnswer:
      '• **〜ておく** (contracté en **〜とく**) = faire quelque chose **à l’avance / en prévision** ou laisser en état (窓を開けておく).\n• **〜てみる** = **essayer de** faire quelque chose pour voir ce que ça donne (食べてみる = goûter pour essayer).',
    authorLabel: 'Socle eJLPT',
    voterIds: [],
    voteCount: 14,
    comments: [],
    status: 'active',
    createdAt: '2026-11-04T09:00:00.000Z',
  },
  {
    id: 'faq_skip_code',
    title: 'Comment lire un code SKIP (1-7-7) sur un kanji inconnu ?',
    body: 'À quoi correspondent les trois chiffres du code SKIP affiché dans le dictionnaire Kanji ?',
    category: 'kanji',
    level: 'N2',
    aiAnswer:
      'Le code **SKIP** (System of Kanji Indexing by Patterns) comporte 3 nombres :\n• **1er chiffre (1..4)** : structure géométrique (`1` Gauche/Droite, `2` Haut/Bas, `3` Enclos/Enveloppe, `4` Solitaire).\n• **2e & 3e chiffres** : nombre de traits de la 1re puis de la 2e partie (ex. `語` = `1-7-7` : `言` 7 traits à gauche + `吾` 7 traits à droite).',
    authorLabel: 'Socle eJLPT',
    voterIds: [],
    voteCount: 11,
    comments: [],
    status: 'active',
    createdAt: '2026-11-05T09:00:00.000Z',
  },
  {
    id: 'faq_jlpt_timing',
    title: 'Comment gérer son chronomètre en Dokkai (compréhension écrite) JLPT ?',
    body: 'Je manque souvent de temps sur les textes longs du JLPT N3/N2. Quelle stratégie recommandez-vous ?',
    category: 'jlpt_methode',
    level: 'N3',
    aiAnswer:
      '1. Lisez d’abord **la question et les 4 options** avant le passage.\n2. Surveillez les connecteurs logiques (**しかし**, **ところが**, **つまり**, **したがって**) : la thèse de l’auteur se trouve presque toujours juste après une opposition ou conclusion.\n3. Ne dépassez pas 2 minutes sur les textes courts et gardez 15 minutes pour les comparaisons d’opinion.',
    authorLabel: 'Socle eJLPT',
    voterIds: [],
    voteCount: 16,
    comments: [],
    status: 'active',
    createdAt: '2026-11-06T09:00:00.000Z',
  },
];
