export interface SentenceOrderPuzzle {
  id: string;
  level: 'N5' | 'N4' | 'N3' | 'N2';
  translationFr: string;
  tokens: string[];
  correctOrder: string[];
  grammarNote: string;
}

export interface SortableQuizItem {
  id: string;
  text: string;
  reading: string;
  meaningFr: string;
  level: string;
  correctBucket: string;
  hintFr: string;
}

export const SENTENCE_ORDER_PUZZLES: SentenceOrderPuzzle[] = [
  {
    id: 'ord_n5_1',
    level: 'N5',
    translationFr: 'Je lis un livre japonais à la bibliothèque tous les jours.',
    tokens: ['本を', '毎日', '日本語の', '図書館で', '読みます。'],
    correctOrder: ['毎日', '図書館で', '日本語の', '本を', '読みます。'],
    grammarNote: 'Ordre canonique SOV : Temps (毎日) → Lieu action (図書館で) → Déterminant (日本語の) → COD (本を) → Verbe.',
  },
  {
    id: 'ord_n4_1',
    level: 'N4',
    translationFr: 'J’ai décidé d’aller au Japon l’année prochaine pour étudier.',
    tokens: ['勉強するために', '日本へ', '来年', '行くことに', 'しました。'],
    correctOrder: ['来年', '勉強するために', '日本へ', '行くことに', 'しました。'],
    grammarNote: 'ために (but) précède le déplacement へ ; 〜ことにする exprime une décision personnelle.',
  },
  {
    id: 'ord_n3_1',
    level: 'N3',
    translationFr: 'Bien qu’il ait plu, nous avons continué la réunion.',
    tokens: ['雨が', 'にもかかわらず、', '降った', '続けました。', '会議を'],
    correctOrder: ['雨が', '降った', 'にもかかわらず、', '会議を', '続けました。'],
    grammarNote: 'Forme neutre passée (雨が降った) directement suivie de にもかかわらず (« malgré que »).',
  },
  {
    id: 'ord_n2_1',
    level: 'N2',
    translationFr: 'Plus on lit, plus la compréhension s’approfondit.',
    tokens: ['理解が', '読めば', '深まる', '読むほど', 'ものだ。'],
    correctOrder: ['読めば', '読むほど', '理解が', '深まる', 'ものだ。'],
    grammarNote: 'Structure symétrique 〜ば〜ほど (« plus... plus... ») suivie de ものだ (vérité générale).',
  },
];

export const ICHIDAN_GODAN_ITEMS: SortableQuizItem[] = [
  {
    id: 'v_taberu',
    text: '食べる',
    reading: 'たべる',
    meaningFr: 'manger',
    level: 'N5',
    correctBucket: 'ichidan',
    hintFr: 'Se termine en -eru → 食べます / 食べない (1段)',
  },
  {
    id: 'v_miru',
    text: '見る',
    reading: 'みる',
    meaningFr: 'regarder',
    level: 'N5',
    correctBucket: 'ichidan',
    hintFr: 'Se termine en -iru → 見ます / 見ない (1段)',
  },
  {
    id: 'v_oshieru',
    text: '教える',
    reading: 'おしえる',
    meaningFr: 'enseigner',
    level: 'N5',
    correctBucket: 'ichidan',
    hintFr: 'Se termine en -eru → 教えます (1段)',
  },
  {
    id: 'v_kaeru',
    text: '帰る',
    reading: 'かえる',
    meaningFr: 'rentrer chez soi (PIÈGE)',
    level: 'N5',
    correctBucket: 'godan',
    hintFr: 'Piège classique en -eru mais Godan (5段) → 帰ります / 帰らない !',
  },
  {
    id: 'v_hashiru',
    text: '走る',
    reading: 'はしる',
    meaningFr: 'courir (PIÈGE)',
    level: 'N5',
    correctBucket: 'godan',
    hintFr: 'Piège en -iru mais Godan (5段) → 走ります / 走らない !',
  },
  {
    id: 'v_kaku',
    text: '書く',
    reading: 'かく',
    meaningFr: 'écrire',
    level: 'N5',
    correctBucket: 'godan',
    hintFr: 'Se termine en -ku → 書きます / 書かない (5段)',
  },
  {
    id: 'v_shiru',
    text: '知る',
    reading: 'しる',
    meaningFr: 'savoir (PIÈGE)',
    level: 'N5',
    correctBucket: 'godan',
    hintFr: 'Piège en -iru mais Godan (5段) → 知ります / 知らない !',
  },
  {
    id: 'v_suru',
    text: 'する',
    reading: 'する',
    meaningFr: 'faire',
    level: 'N5',
    correctBucket: 'irregular',
    hintFr: 'Verbe irrégulier (サ変) → します / しない',
  },
  {
    id: 'v_kuru',
    text: '来る',
    reading: 'くる',
    meaningFr: 'venir',
    level: 'N5',
    correctBucket: 'irregular',
    hintFr: 'Verbe irrégulier (カ変) → きます / こない',
  },
];

export const TRANSITIVITY_ITEMS: SortableQuizItem[] = [
  {
    id: 'tr_aku',
    text: '開く',
    reading: 'あく',
    meaningFr: 's’ouvrir (la porte s’ouvre)',
    level: 'N5',
    correctBucket: 'jidoushi',
    hintFr: 'ドアが開く (sujet + が) → intransitif (自動詞)',
  },
  {
    id: 'tr_akeru',
    text: '開ける',
    reading: 'あける',
    meaningFr: 'ouvrir (qqch)',
    level: 'N5',
    correctBucket: 'tadoushi',
    hintFr: 'ドアを開ける (COD + を) → transitif (他動詞)',
  },
  {
    id: 'tr_shimaru',
    text: '閉まる',
    reading: 'しまる',
    meaningFr: 'se fermer',
    level: 'N5',
    correctBucket: 'jidoushi',
    hintFr: 'Terminaison en -aru → presque toujours 自動詞',
  },
  {
    id: 'tr_shimeru',
    text: '閉める',
    reading: 'しめる',
    meaningFr: 'fermer (qqch)',
    level: 'N5',
    correctBucket: 'tadoushi',
    hintFr: 'Terminaison en -eru en paire avec -aru → 他動詞',
  },
  {
    id: 'tr_tsuku',
    text: 'つく',
    reading: 'つく',
    meaningFr: 's’allumer (lumière)',
    level: 'N4',
    correctBucket: 'jidoushi',
    hintFr: '電気がつく → 自動詞',
  },
  {
    id: 'tr_tsukeru',
    text: 'つける',
    reading: 'つける',
    meaningFr: 'allumer (la lumière)',
    level: 'N4',
    correctBucket: 'tadoushi',
    hintFr: '電気をつける → 他動詞',
  },
  {
    id: 'tr_kieru',
    text: '消える',
    reading: 'きえる',
    meaningFr: 's’éteindre / disparaître',
    level: 'N4',
    correctBucket: 'jidoushi',
    hintFr: '火が消える → 自動詞',
  },
  {
    id: 'tr_kesu',
    text: '消す',
    reading: 'けす',
    meaningFr: 'éteindre / effacer',
    level: 'N5',
    correctBucket: 'tadoushi',
    hintFr: 'Terminaison en -su → presque toujours 他動詞 (電気を消す)',
  },
];

export function evaluateSentenceOrder(
  placed: string[],
  expected: string[]
): { isCorrect: boolean; correctPositions: number; total: number } {
  const total = expected.length;
  let correctPositions = 0;
  for (let i = 0; i < total; i += 1) {
    if (placed[i] === expected[i]) {
      correctPositions += 1;
    }
  }
  return {
    isCorrect: placed.length === total && correctPositions === total,
    correctPositions,
    total,
  };
}

export function evaluateBucketSort(
  placements: Record<string, string>,
  items: SortableQuizItem[]
): { correctCount: number; total: number; perItem: Record<string, boolean> } {
  const perItem: Record<string, boolean> = {};
  let correctCount = 0;
  for (const item of items) {
    const ok = placements[item.id] === item.correctBucket;
    perItem[item.id] = ok;
    if (ok) correctCount += 1;
  }
  return {
    correctCount,
    total: items.length,
    perItem,
  };
}
