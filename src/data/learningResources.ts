export interface LearningOrderStep {
  step: number;
  slug: string;
  titleFr: string;
  titleJp: string;
  durationHint: string;
  rationaleFr: string;
  appHref: string;
  appCta: string;
}

export interface PopularizedMethod {
  id: string;
  name: string;
  origin: string;
  bestFor: string;
  summaryFr: string;
  howInEjlptFr: string;
}

export interface OpenDataCredit {
  id: string;
  name: string;
  roleFr: string;
  licenseOrType: string;
  url: string;
}

export const LEARNING_ORDER_STEPS: LearningOrderStep[] = [
  {
    step: 1,
    slug: 'katakana',
    titleFr: 'Katakana (カタカナ) en premier',
    titleJp: 'カタカナ',
    durationHint: 'Jours 1–4',
    rationaleFr:
      'En commençant par les Katakana et les mots d’emprunt (Gairaigo : コーヒー, スマホ, ホテル), vous pouvez déjà lire des menus, enseignes et parler avec des mots connus dès la première semaine.',
    appHref: '/immersion?tab=scenarios',
    appCta: 'Parcours oral Gairaigo',
  },
  {
    step: 2,
    slug: 'hiragana',
    titleFr: 'Hiragana (ひらがな)',
    titleJp: 'ひらがな',
    durationHint: 'Jours 5–10',
    rationaleFr:
      'Indispensables pour toutes les terminaisons verbales, adjectivales, particules grammaticales et furigana qui soutiendront ensuite tous les kanjis.',
    appHref: '/practice?tab=yomikata',
    appCta: 'S’entraîner au clavier WanaKana',
  },
  {
    step: 3,
    slug: 'radicaux',
    titleFr: 'Clés / Radicaux (部首)',
    titleJp: '部首',
    durationHint: 'Semaine 2–3',
    rationaleFr:
      'Apprendre les 50 à 100 clés sémantiques majeures (言 parole, 水 eau, 心 cœur, 手 main…) transforme les kanjis en assemblages logiques plutôt qu’en dessins aléatoires.',
    appHref: '/tools?tab=tree',
    appCta: 'Explorer l’Arbre des Radicaux',
  },
  {
    step: 4,
    slug: 'particules',
    titleFr: 'Particules (助詞) & Priorité Syntaxique',
    titleJp: '助詞',
    durationHint: 'Semaine 3–5',
    rationaleFr:
      'Les particules (は, が, を, に, で, へ, と, から, まで, の) jouent le rôle d’opérateurs logiques : les comprendre avec leur priorité débloque la structure de toute phrase.',
    appHref: '/grammar',
    appCta: 'Guide Priorité des Particules',
  },
  {
    step: 5,
    slug: 'kanji',
    titleFr: 'Kanjis & Jukugo par fréquence (JLPT N5 → N1 + N0)',
    titleJp: '漢字・熟語',
    durationHint: 'Continu (SRS SM-2)',
    rationaleFr:
      'Acquérir les kanjis en contexte dans des jukugo fréquents (échelle 1–10) grâce à la répétition espacée SM-2 et à la lecture graduée.',
    appHref: '/kanji',
    appCta: 'Dictionnaire Kanji & N0',
  },
];

export const POPULARIZED_METHODS: PopularizedMethod[] = [
  {
    id: 'ezoe',
    name: 'Méthode Ezoe (江副文法)',
    origin: 'Shinjuku Japanese Language Institute',
    bestFor: 'Visualiser instantanément les rôles grammaticaux',
    summaryFr:
      'Associe une forme et une couleur à chaque fonction (sujet, particule, temps, verbe, registre) pour lever toute ambiguïté structurelle.',
    howInEjlptFr:
      'Intégrée dans /tools (EzoeGrammarViewer) et généralisée dans nos 4 canaux visuels simultanés.',
  },
  {
    id: 'genki',
    name: 'Genki (げんき I & II)',
    origin: 'The Japan Times',
    bestFor: 'Progression universitaire guidée N5 → N4',
    summaryFr:
      'Manuel progressif combinant dialogues du quotidien, fiches de grammaire claires, exercices de transformation et cahiers d’écriture.',
    howInEjlptFr:
      'Retrouvez une progression équivalente N5–N1 structurée dans /lessons et les ateliers de transformation de /practice.',
  },
  {
    id: 'rtk',
    name: 'Heisig (Remembering the Kanji / RTK)',
    origin: 'James W. Heisig',
    bestFor: 'Mémorisation structurelle par composants & histoires',
    summaryFr:
      'Sépare l’apprentissage de la forme/sens (via primitives et mnémotechniques) avant d’associer les lectures dans des mots composés.',
    howInEjlptFr:
      'Les champs rtk_keyword_5th / 6th et composants sont affichés dans /kanji selon votre profil adaptatif.',
  },
  {
    id: 'immersion',
    name: 'Comprehensible Input & Script 2 List',
    origin: 'Stephen Krashen / AJATT / Immersion graduelle',
    bestFor: 'Passer des manuels aux médias authentiques sans saturation',
    summaryFr:
      'Consommer des vidéos sous-titrées, brèves de presse et récits à ~80–90 % compréhensibles (« i+1 ») en extrayant uniquement les mots utiles.',
    howInEjlptFr:
      'Disponible dans /reader (import PDF/SRT + lecteur vidéo), /news (Todai hybride) et /immersion.',
  },
];

export const EXTERNAL_MEDIA_CATALOG: Array<{
  kind: 'Presse' | 'YouTube' | 'Radio / Podcast' | 'PDF & Livres';
  title: string;
  level: string;
  descriptionFr: string;
  url: string;
}> = [
  {
    kind: 'Presse',
    title: 'NHK NEWS WEB EASY',
    level: 'N4–N3',
    descriptionFr: 'Articles quotidiens simplifiés avec furigana et lecture audio officielle.',
    url: 'https://news.web.nhk/news/easy/',
  },
  {
    kind: 'YouTube',
    title: 'Comprehensible Japanese (Ciaran / Yuki)',
    level: 'N5–N3',
    descriptionFr: 'Vidéos 100 % en japonais lent avec appui visuel pour acquérir l’écoute naturellement.',
    url: 'https://www.youtube.com/@cijapanese',
  },
  {
    kind: 'YouTube',
    title: 'Sambon Juku (三本塾)',
    level: 'N3–N1',
    descriptionFr: 'Explications claires de grammaire et nuances JLPT expliquées en japonais accessible.',
    url: 'https://www.youtube.com/@sambonjuku',
  },
  {
    kind: 'Radio / Podcast',
    title: 'NHK ラジオニュース',
    level: 'N2–N1',
    descriptionFr: 'Journaux radio nationaux clairs pour s’entraîner à l’écoute Choukai avancée.',
    url: 'https://www.nhk.or.jp/radionews/',
  },
  {
    kind: 'PDF & Livres',
    title: 'Aozora Bunko (青空文庫)',
    level: 'N2–N1',
    descriptionFr: 'Œuvres littéraires japonaises libres de droits importables dans /reader.',
    url: 'https://www.aozora.gr.jp',
  },
  {
    kind: 'PDF & Livres',
    title: 'Tadoku — Graded Readers Gratuits',
    level: 'N5–N3',
    descriptionFr: 'Livres PDF gratuits très illustrés pour débuter la lecture sans dictionnaire.',
    url: 'https://tadoku.org/japanese/en/free-books-en/',
  },
];

export const OPEN_DATA_CREDITS: OpenDataCredit[] = [
  {
    id: 'edict_database',
    name: 'edict_database (EDRDG JMdict / KANJIDIC2)',
    roleFr: 'Socle lexical bilingue et données kanjis fondamentales (33 425 Jukugo & lectures).',
    licenseOrType: 'CC BY-SA 4.0 (EDRDG)',
    url: 'https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project',
  },
  {
    id: 'japanese-toolkit',
    name: 'japanese-toolkit',
    roleFr: 'Extraction morphologique, segmentation et métadonnées de fréquence / scripts.',
    licenseOrType: 'Open-Source Toolkit',
    url: 'https://github.com/topics/japanese-nlp',
  },
  {
    id: 'kanjium',
    name: 'kanjium',
    roleFr: 'Décompositions radicalaires, variantes et relations visuelles / phonétiques.',
    licenseOrType: 'Open-Source Dataset (MIT / CC)',
    url: 'https://github.com/mifunetoshiro/kanjium',
  },
  {
    id: 'kanjiapi.dev',
    name: 'kanjiapi.dev',
    roleFr: 'Référentiel léger de traits, grades scolaires, JLPT et lectures On/Kun.',
    licenseOrType: 'MIT / KANJIDIC',
    url: 'https://kanjiapi.dev',
  },
  {
    id: 'kanjivg',
    name: 'KanjiVG',
    roleFr: 'Tracés vectoriels SVG utilisés pour l’animation de l’ordre des traits.',
    licenseOrType: 'CC BY-SA 3.0',
    url: 'https://kanjivg.tagaini.net',
  },
  {
    id: 'wanakana',
    name: 'WanaKana',
    roleFr: 'Conversion temps réel Romaji ↔ Hiragana ↔ Katakana pour recherche et saisie.',
    licenseOrType: 'MIT',
    url: 'https://wanakana.com',
  },
];
