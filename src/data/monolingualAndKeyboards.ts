export interface MonolingualGloss {
  term: string;
  reading: string;
  posJa: string;
  jaDef: string;
  frHint: string;
}

export interface MonolingualPassage {
  id: string;
  kind: 'text' | 'press';
  level: 'N4' | 'N3' | 'N2' | 'N1';
  title: string;
  headlineJa?: string;
  body: string;
  pressTipsFr?: string;
  glosses: MonolingualGloss[];
}

export interface KeyboardOsGuide {
  id: 'linux' | 'windows' | 'ios';
  osLabel: string;
  engineName: string;
  summaryFr: string;
  steps: string[];
  shortcuts: Array<{ keys: string; actionFr: string }>;
}

export const MONOLINGUAL_TEXTS: MonolingualPassage[] = [
  {
    id: 'mono_n4_dict',
    kind: 'text',
    level: 'N4',
    title: '日本の四季と食文化 (Lire un texte court + 国語辞典)',
    body: '日本には春・夏・秋・冬の四季がある。季節によって気温や景色が変わるだけでなく、その時期に一番美味しい食べ物である「旬」の食材を楽しむ文化が大切にされている。',
    glosses: [
      {
        term: '四季',
        reading: 'しき',
        posJa: '名詞',
        jaDef: '春・夏・秋・冬の四つの季節のこと。',
        frHint: 'Les quatre saisons (printemps, été, automne, hiver).',
      },
      {
        term: '気温',
        reading: 'きおん',
        posJa: '名詞',
        jaDef: '大気の温度。天気予報などで使うことば。',
        frHint: 'La température atmosphérique.',
      },
      {
        term: '旬',
        reading: 'しゅん',
        posJa: '名詞',
        jaDef: '魚・野菜・果物などが、一年の中で一番おいしくて栄養がある時期。',
        frHint: 'La pleine saison (d’un aliment à son meilleur goût).',
      },
      {
        term: '文化',
        reading: 'ぶんか',
        posJa: '名詞',
        jaDef: '人間が長い時間をかけて作り出した生活のしかた・芸術・学問など。',
        frHint: 'La culture.',
      },
    ],
  },
  {
    id: 'mono_n3_press',
    kind: 'press',
    level: 'N3',
    title: 'Déchiffrer un article de presse japonais (5W1H)',
    headlineJa: '図書館の夜間利用、来月から拡大へ — 駅前の新施設で',
    body: '市は１日、市民からの要望を受け、駅前にある中央図書館の利用時間を来月から午後１０時まで延長すると発表した。仕事や学校帰りの利用者が増えており、静かに自習できる場所を増やす狙いがある。',
    pressTipsFr:
      'En presse japonaise, le titre (見出し) omet souvent les verbes auxiliaires (拡大へ = « vers un élargissement »). Le premier paragraphe résume Qui (市は), Quand (来月から), Où (中央図書館), Quoi (利用時間延長) et Pourquoi (自習場所を増やす狙い).',
    glosses: [
      {
        term: '要望',
        reading: 'ようぼう',
        posJa: '名詞・スル',
        jaDef: 'あることを実現してほしいと強く願って求めること。',
        frHint: 'Requête, demande formulée (par les citoyens).',
      },
      {
        term: '延長',
        reading: 'えんちょう',
        posJa: '名詞・スル',
        jaDef: '決められていた時間や期間などを、さらに長くのばすこと。',
        frHint: 'Prolongation (horaires, durée).',
      },
      {
        term: '自習',
        reading: 'じしゅう',
        posJa: '名詞・スル',
        jaDef: '先生に教わらずに、自分ひとりで勉強すること。',
        frHint: 'Étude autonome / révision individuelle.',
      },
      {
        term: '狙い',
        reading: 'ねらい',
        posJa: '名詞',
        jaDef: 'ある行動をするときに目指している目的。意図。',
        frHint: 'L’objectif visé, l’intention (dans la presse).',
      },
    ],
  },
  {
    id: 'mono_n2_press',
    kind: 'press',
    level: 'N2',
    title: 'Brève économique : télétravail & régions',
    headlineJa: '地方移住とリモートワーク、若年層で定着傾向',
    body: '情報通信技術の発達に伴い、都市部の企業に勤めたまま地方で暮らす働き方が広がっている。生活費を抑えられる利点がある一方、地域の交通網や医療体制の整備が今後の課題とされている。',
    pressTipsFr:
      'Repérez la structure journalistique classique « 〜利点がある一方、〜が課題とされている » (D’un côté l’avantage X, de l’autre le défi Y considéré comme tel).',
    glosses: [
      {
        term: '移住',
        reading: 'いじゅう',
        posJa: '名詞・スル',
        jaDef: 'それまで住んでいた場所を離れ、別の土地へ移って住むこと。',
        frHint: 'Déménagement / installation durable dans une autre région.',
      },
      {
        term: '抑える',
        reading: 'おさえる',
        posJa: '他動詞（1段）',
        jaDef: 'ある範囲を超えないように制限する。少なく保つ。',
        frHint: 'Contenir, limiter (ici réduire le coût de la vie).',
      },
      {
        term: '整備',
        reading: 'せいび',
        posJa: '名詞・スル',
        jaDef: '施設や制度などを整えて、いつでも使える状態にすること。',
        frHint: 'Aménagement, mise à niveau (infrastructures).',
      },
      {
        term: '課題',
        reading: 'かだい',
        posJa: '名詞',
        jaDef: 'これから解決しなければならない問題や目標。',
        frHint: 'Enjeu, défi à résoudre.',
      },
    ],
  },
];

export const KEYBOARD_TUTORIALS: KeyboardOsGuide[] = [
  {
    id: 'linux',
    osLabel: 'Linux (Ubuntu / Fedora / Arch)',
    engineName: 'Fcitx5 + Mozc (recommandé sur Wayland & X11)',
    summaryFr:
      'Mozc est la version open-source du moteur Google Japanese Input. Fcitx5 assure une compatibilité fluide avec Chrome, Firefox et les applications Electron.',
    steps: [
      'Installer le moteur : sudo apt install fcitx5 fcitx5-mozc (Ubuntu/Debian) ou sudo pacman -S fcitx5-im fcitx5-mozc (Arch).',
      'Dans les variables de session (/etc/environment), définir XMODIFIERS=@im=fcitx puis redémarrer la session.',
      'Ouvrir Fcitx5 Configuration → Ajouter la méthode « Mozc ».',
      'Basculer FR ↔ JP avec Ctrl + Espace (ou Super + Espace selon le bureau GNOME/KDE).',
    ],
    shortcuts: [
      { keys: 'Ctrl + Espace', actionFr: 'Basculer entre clavier FR/EN et IME japonais' },
      { keys: 'F7', actionFr: 'Convertir le mot saisi directement en カタカナ' },
      { keys: 'F6', actionFr: 'Forcer la conversion en ひらがな' },
      { keys: 'xtu / ltsu', actionFr: 'Taper un petit っ seul (ou doubler la consonne : kitte → きって)' },
      { keys: "n' / nn", actionFr: 'Écrire ん sans ambiguïté avant une voyelle (kin’youbi → きんようび)' },
    ],
  },
  {
    id: 'windows',
    osLabel: 'Windows 10 / 11',
    engineName: 'Microsoft IME (intégré nativement)',
    summaryFr:
      'Aucun logiciel tiers requis : l’IME japonais de Microsoft gère la saisie Romaji → Hiragana/Kanji avec apprentissage contextuel.',
    steps: [
      'Ouvrir Paramètres → Heure et langue → Langue et région → « Ajouter une langue ».',
      'Rechercher « 日本語 (Japonais) » et installer uniquement le module linguistique / clavier (la voix est optionnelle).',
      'Utiliser Win + Espace pour passer en mode Japonais (icône あ ou A dans la barre des tâches).',
      'Basculer entre saisie directe (A) et hiragana (あ) avec Alt + ~ (ou Alt + ² sur clavier AZERTY).',
    ],
    shortcuts: [
      { keys: 'Win + Espace', actionFr: 'Changer de langue clavier (FR ↔ JP)' },
      { keys: 'Alt + ~ / Alt + ²', actionFr: 'Alterner saisie alphanumérique (A) ↔ Hiragana (あ)' },
      { keys: 'Espace', actionFr: 'Convertir le bloc hiragana en Kanji (+ menu candidats)' },
      { keys: 'F7 / F8', actionFr: 'Convertir en Katakana pleine largeur / demi-largeur' },
      { keys: 'F10', actionFr: 'Convertir en caractères Romaji demi-largeur' },
    ],
  },
  {
    id: 'ios',
    osLabel: 'iOS / iPadOS (iPhone & iPad)',
    engineName: 'Clavier Kana 12-touches (Flick) & Romaji',
    summaryFr:
      'Sur mobile, le clavier 12-touches (« Kana Flick ») est 2× plus rapide que le Romaji une fois la croix directionnelle mémorisée.',
    steps: [
      'Réglages → Général → Clavier → Claviers → Ajouter un clavier → Japonais.',
      'Choisir « Kana » (grille 12 touches あかさたな) et/ou « Romaji » (AZERTY/QWERTY).',
      'Appuyer sur l’icône 🌐 en bas à gauche pour basculer vers le clavier japonais.',
      'Sur Kana Flick : toucher la touche pour -a (か), glisser à gauche pour -i (き), en haut pour -u (く), à droite pour -e (け), en bas pour -o (こ).',
    ],
    shortcuts: [
      { keys: 'Touche ^^ / ゛゜', actionFr: 'Ajouter dakuten (か→が) ou petit caractère (つ→っ, や→ゃ)' },
      { keys: 'Glissé directionnel (Flick)', actionFr: '5 voyelles en 1 seul geste (a=centre, i=gauche, u=haut, e=droite, o=bas)' },
      { keys: 'Barre d’espace (変換)', actionFr: 'Choisir les kanjis ou émojis/katakana suggérés' },
    ],
  },
];
