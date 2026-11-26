export interface ScenarioVocabCard {
  id: string;
  itemKey: string;
  reading: string;
  meaningFr: string;
  jlpt: 'N5' | 'N4' | 'N3';
  emoji: string;
  noteFr: string;
}

export interface VisualScenario {
  id: string;
  title: string;
  titleJp: string;
  level: 'N5' | 'N4' | 'N3';
  sceneEmoji: string;
  narrativeJp: string;
  narrativeFr: string;
  items: ScenarioVocabCard[];
  quiz: {
    prompt: string;
    options: Array<{ id: string; text: string }>;
    correctId: string;
    explanation: string;
  };
}

export interface GairaigoOralItem {
  id: string;
  katakana: string;
  romajiHint: string;
  originHint: string;
  meaningFr: string;
  category: 'Café & Repas' | 'Tech & Quotidien' | 'Voyage & Hôtel' | 'Faux-amis (Wasei)';
  pronunciationTipFr: string;
  exampleJp: string;
}

export const VISUAL_SCENARIOS: VisualScenario[] = [
  {
    id: 'sc_station',
    title: 'À la gare — Prendre son billet & le quai',
    titleJp: '駅で',
    level: 'N5',
    sceneEmoji: '🚉',
    narrativeJp:
      'まず券売機で切符を買います。改札を通ってから、三番線のホームで電車を待ちます。発車時刻を確認しましょう。',
    narrativeFr:
      'D’abord, j’achète un billet au distributeur. Après avoir passé les portillons, j’attends le train sur le quai n° 3. Vérifions l’heure de départ.',
    items: [
      { id: 'st1', itemKey: '駅', reading: 'えき', meaningFr: 'gare', jlpt: 'N5', emoji: '🚉', noteFr: 'Centre névralgique des déplacements au Japon' },
      { id: 'st2', itemKey: '切符', reading: 'きっぷ', meaningFr: 'billet de train', jlpt: 'N5', emoji: '🎫', noteFr: 'Double consonne っ entre き et ぷ' },
      { id: 'st3', itemKey: '改札', reading: 'かいさつ', meaningFr: 'portillons / guichet d’accès', jlpt: 'N3', emoji: '🚧', noteFr: 'Là où l’on passe sa carte Suica/Pasmo' },
      { id: 'st4', itemKey: 'ホーム', reading: 'ほーむ', meaningFr: 'quai de gare', jlpt: 'N4', emoji: '🛤️', noteFr: 'Abréviation de platform (gairaigo)' },
      { id: 'st5', itemKey: '電車', reading: 'でんしゃ', meaningFr: 'train électrique', jlpt: 'N5', emoji: '🚆', noteFr: 'Moyen de transport urbain courant' },
      { id: 'st6', itemKey: '時刻', reading: 'じこく', meaningFr: 'horaire / heure exacte', jlpt: 'N4', emoji: '🕒', noteFr: '時刻表 = tableau des horaires' },
    ],
    quiz: {
      prompt: 'Dans le scénario à la gare, quel endroit franchit-on juste après avoir acheté le billet ?',
      options: [
        { id: 'a', text: '改札 (かいさつ)' },
        { id: 'b', text: '喫茶店 (きっさてん)' },
        { id: 'c', text: '冷蔵庫 (れいぞうこ)' },
        { id: 'd', text: '教室 (きょうしつ)' },
      ],
      correctId: 'a',
      explanation: 'On franchit 改札 (les portillons d’accès) avant d’atteindre le quai (ホーム).',
    },
  },
  {
    id: 'sc_cafe',
    title: 'Au café — Commander & régler',
    titleJp: 'カフェで',
    level: 'N5',
    sceneEmoji: '☕',
    narrativeJp:
      '窓の近くの席に座ります。メニューを見て、熱い紅茶とケーキを注文しました。食後にレジで会計をします。',
    narrativeFr:
      'Je m’assois près de la fenêtre. Je regarde le menu et commande un thé chaud avec un gâteau. Après le repas, je règle à la caisse.',
    items: [
      { id: 'cf1', itemKey: '席', reading: 'せき', meaningFr: 'place assise / siège', jlpt: 'N4', emoji: '🪑', noteFr: '自由席 = place libre ; 指定席 = place réservée' },
      { id: 'cf2', itemKey: '紅茶', reading: 'こうちゃ', meaningFr: 'thé noir / infusé', jlpt: 'N5', emoji: '🫖', noteFr: 'おちゃ = thé vert en général' },
      { id: 'cf3', itemKey: '注文', reading: 'ちゅうもん', meaningFr: 'commande', jlpt: 'N4', emoji: '📝', noteFr: '注文する = commander au restaurant' },
      { id: 'cf4', itemKey: '窓', reading: 'まど', meaningFr: 'fenêtre', jlpt: 'N5', emoji: '🪟', noteFr: '窓際 = côté fenêtre' },
      { id: 'cf5', itemKey: '会計', reading: 'かいけい', meaningFr: 'addition / caisse', jlpt: 'N3', emoji: '💳', noteFr: 'お会計お願いします = L’addition s’il vous plaît' },
      { id: 'cf6', itemKey: 'ケーキ', reading: 'けーき', meaningFr: 'gâteau', jlpt: 'N5', emoji: '🍰', noteFr: 'Voyelle longue ー dans ケ・ー・キ' },
    ],
    quiz: {
      prompt: 'Que demande-t-on au moment de payer au comptoir (レジ) ?',
      options: [
        { id: 'a', text: 'お会計 (かいけい)' },
        { id: 'b', text: '入場券 (にゅうじょうけん)' },
        { id: 'c', text: '宿題 (しゅくだい)' },
        { id: 'd', text: '会議 (かいぎ)' },
      ],
      correctId: 'a',
      explanation: 'お会計 (おかいけい) désigne le règlement / l’addition.',
    },
  },
  {
    id: 'sc_home',
    title: 'À la maison — Cuisine & routine',
    titleJp: '家の中で',
    level: 'N4',
    sceneEmoji: '🏠',
    narrativeJp:
      '台所で冷蔵庫から野菜を出して、晩ご飯を作ります。お風呂に入ったあと、布団を敷いてゆっくり眠ります。',
    narrativeFr:
      'Dans la cuisine, je sors les légumes du réfrigérateur et prépare le dîner. Après le bain, j’étends le futon et dors tranquillement.',
    items: [
      { id: 'hm1', itemKey: '台所', reading: 'だいどころ', meaningFr: 'cuisine (pièce)', jlpt: 'N5', emoji: '🍳', noteFr: 'Aussi dit キッチン en gairaigo' },
      { id: 'hm2', itemKey: '冷蔵庫', reading: 'れいぞうこ', meaningFr: 'réfrigérateur', jlpt: 'N5', emoji: '🧊', noteFr: '冷 (froid) + 蔵 (entrepôt) + 庫 (coffre)' },
      { id: 'hm3', itemKey: '野菜', reading: 'やさい', meaningFr: 'légumes', jlpt: 'N5', emoji: '🥬', noteFr: 'Vocabulaire du quotidien N5' },
      { id: 'hm4', itemKey: '風呂', reading: 'ふろ', meaningFr: 'bain japonais', jlpt: 'N5', emoji: '🛁', noteFr: 'Souvent avec お : お風呂に入る' },
      { id: 'hm5', itemKey: '布団', reading: 'ふとん', meaningFr: 'futon', jlpt: 'N4', emoji: '🛏️', noteFr: 'S’utilise avec le verbe 敷く (しく, étendre)' },
      { id: 'hm6', itemKey: '鍵', reading: 'かぎ', meaningFr: 'clé / serrure', jlpt: 'N5', emoji: '🔑', noteFr: '鍵をかける = fermer à clé' },
    ],
    quiz: {
      prompt: 'Quel verbe accompagne 布団 (ふとん) pour dire « préparer / étendre le futon » ?',
      options: [
        { id: 'a', text: '敷く (しく)' },
        { id: 'b', text: '履く (はく)' },
        { id: 'c', text: '飲む (のむ)' },
        { id: 'd', text: '磨く (みがく)' },
      ],
      correctId: 'a',
      explanation: 'En japonais, on étend le futon avec 布団を敷く (ふとんをしく).',
    },
  },
];

export const GAIRAIGO_ORAL_ITEMS: GairaigoOralItem[] = [
  {
    id: 'g1',
    katakana: 'コーヒー',
    romajiHint: 'koohii',
    originHint: 'Coffee / Koffie',
    meaningFr: 'Café',
    category: 'Café & Repas',
    pronunciationTipFr: 'Allongez bien les deux voyelles (コー et ヒー) et prononcez ハ行/ヒ doucement.',
    exampleJp: 'ホットコーヒーをください。',
  },
  {
    id: 'g2',
    katakana: 'メニュー',
    romajiHint: 'menyuu',
    originHint: 'Menu',
    meaningFr: 'Menu / carte',
    category: 'Café & Repas',
    pronunciationTipFr: 'Glissez sur ニュ suivi d’un u long (ュー).',
    exampleJp: 'メニューを見せてもらえますか。',
  },
  {
    id: 'g3',
    katakana: 'レストラン',
    romajiHint: 'resutoran',
    originHint: 'Restaurant',
    meaningFr: 'Restaurant',
    category: 'Café & Repas',
    pronunciationTipFr: 'Insérez une voyelle brève u/o entre chaque consonne (re-su-to-ra-n).',
    exampleJp: '駅前のレストランで食べよう。',
  },
  {
    id: 'g4',
    katakana: 'アイスクリーム',
    romajiHint: 'aisukuriimu',
    originHint: 'Ice cream',
    meaningFr: 'Glace / crème glacée',
    category: 'Café & Repas',
    pronunciationTipFr: 'Allongez リー en fin de mot (クリー・ム).',
    exampleJp: '抹茶のアイスクリームが好きです。',
  },
  {
    id: 'g5',
    katakana: 'パソコン',
    romajiHint: 'pasokon',
    originHint: 'Personal computer (abrégé)',
    meaningFr: 'Ordinateur personnel',
    category: 'Tech & Quotidien',
    pronunciationTipFr: 'Mot-valise japonais de パーソナル + コンピューター (4 mores sèches).',
    exampleJp: '毎日パソコンで仕事をします。',
  },
  {
    id: 'g6',
    katakana: 'スマホ',
    romajiHint: 'sumaho',
    originHint: 'Smartphone (abrégé)',
    meaningFr: 'Smartphone',
    category: 'Tech & Quotidien',
    pronunciationTipFr: 'Contraction quotidienne de スマートフォン (す・ま・ほ).',
    exampleJp: 'スマホの地図を見て歩きます。',
  },
  {
    id: 'g7',
    katakana: 'エアコン',
    romajiHint: 'eakon',
    originHint: 'Air conditioner (abrégé)',
    meaningFr: 'Climatisation',
    category: 'Tech & Quotidien',
    pronunciationTipFr: 'Détachez bien エ + ア avant コン.',
    exampleJp: '暑いのでエアコンをつけましょう。',
  },
  {
    id: 'g8',
    katakana: 'エレベーター',
    romajiHint: 'erebeetaa',
    originHint: 'Elevator',
    meaningFr: 'Ascenseur',
    category: 'Voyage & Hôtel',
    pronunciationTipFr: 'Attention à bien allonger ベー et ター (le v anglais devient b).',
    exampleJp: 'エレベーターで五階へ上がります。',
  },
  {
    id: 'g9',
    katakana: 'タクシー',
    romajiHint: 'takushii',
    originHint: 'Taxi',
    meaningFr: 'Taxi',
    category: 'Voyage & Hôtel',
    pronunciationTipFr: 'Allongez bien la finale シー.',
    exampleJp: '空港までタクシーで行きます。',
  },
  {
    id: 'g10',
    katakana: 'パスポート',
    romajiHint: 'pasupooto',
    originHint: 'Passport',
    meaningFr: 'Passeport',
    category: 'Voyage & Hôtel',
    pronunciationTipFr: 'Pas de s final nu : ポー + ト bien articulés.',
    exampleJp: 'パスポートを忘れないでください。',
  },
  {
    id: 'g11',
    katakana: 'マンション',
    romajiHint: 'manshon',
    originHint: 'Wasei-eigo (Mansion)',
    meaningFr: 'Immeuble résidentiel moderne (≠ château !)',
    category: 'Faux-amis (Wasei)',
    pronunciationTipFr: 'マ・ン・ショ・ン (4 mores égales).',
    exampleJp: '駅の近くのマンションに住んでいます。',
  },
  {
    id: 'g12',
    katakana: 'コンセント',
    romajiHint: 'konsento',
    originHint: 'Wasei-eigo (Concentric plug)',
    meaningFr: 'Prise électrique murale',
    category: 'Faux-amis (Wasei)',
    pronunciationTipFr: 'Prononcer コ・ン・セ・ン・ト (ne veut pas dire « consentement » !).',
    exampleJp: '部屋にコンセントが二つあります。',
  },
  {
    id: 'g13',
    katakana: 'アルバイト',
    romajiHint: 'arubaito',
    originHint: 'Allemand Arbeit',
    meaningFr: 'Petit boulot / emploi étudiant à temps partiel',
    category: 'Faux-amis (Wasei)',
    pronunciationTipFr: 'Souvent abrégé à l’oral en バイト (baito).',
    exampleJp: '週末にカフェでアルバイトをしています。',
  },
  {
    id: 'g14',
    katakana: 'バイキング',
    romajiHint: 'baikingu',
    originHint: 'Wasei-eigo (Viking)',
    meaningFr: 'Buffet à volonté (restaurant / hôtel)',
    category: 'Faux-amis (Wasei)',
    pronunciationTipFr: 'Le v initial passe en バ : バ・イ・キ・ン・グ.',
    exampleJp: 'ホテルの朝食はバイキング形式です。',
  },
];
