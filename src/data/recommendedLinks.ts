export type LinkCategory =
  | 'Dictionnaires'
  | 'Grammaire & Méthodes'
  | 'Lecture & Presse'
  | 'Audio & Immersion'
  | 'Données Open-Source';

export interface RecommendedLinkItem {
  id: string;
  title: string;
  url: string;
  category: LinkCategory;
  levels: string;
  descriptionFr: string;
}

export const RECOMMENDED_LINKS: RecommendedLinkItem[] = [
  {
    id: 'jisho',
    title: 'Jisho.org',
    url: 'https://jisho.org',
    category: 'Dictionnaires',
    levels: 'N5–N1',
    descriptionFr: 'Dictionnaire japono-anglais basé sur JMdict / KANJIDIC avec recherche par radical et ordre des traits.',
  },
  {
    id: 'takoboto',
    title: 'Takoboto',
    url: 'https://takoboto.jp',
    category: 'Dictionnaires',
    levels: 'N5–N1',
    descriptionFr: 'Dictionnaire rapide indiquant systématiquement le caractère 自動詞 / 他動詞 et les conjugaisons complètes.',
  },
  {
    id: 'goo-dict',
    title: 'goo 辞書 (Monolingue JA)',
    url: 'https://dictionary.goo.ne.jp',
    category: 'Dictionnaires',
    levels: 'N2–N1',
    descriptionFr: 'Dictionnaire japonais unilingue de référence pour vérifier les nuances fines entre synonymes.',
  },
  {
    id: 'tae-kim',
    title: 'Tae Kim — Guide de Grammaire Japonaise',
    url: 'https://guidetojapanese.org/french/',
    category: 'Grammaire & Méthodes',
    levels: 'N5–N3',
    descriptionFr: 'Référence pédagogique gratuite et logique en français expliquant le japonais sans calque grammatical occidental.',
  },
  {
    id: 'imabi',
    title: 'IMABI (Curriculum Linguistique)',
    url: 'https://imabi.org',
    category: 'Grammaire & Méthodes',
    levels: 'N5–N1',
    descriptionFr: 'Encyclopédie grammaticale ultra-détaillée couvrant le japonais moderne, formel et classique.',
  },
  {
    id: 'dojg',
    title: 'Dictionary of Japanese Grammar Series',
    url: 'https://core6000.neocities.org/dojg/',
    category: 'Grammaire & Méthodes',
    levels: 'N5–N1',
    descriptionFr: 'Index des 3 tomes (Basic, Intermediate, Advanced) avec schémas de connexion 【接続】.',
  },
  {
    id: 'nhk-easy',
    title: 'NHK NEWS WEB EASY',
    url: 'https://news.web.nhk/news/easy/',
    category: 'Lecture & Presse',
    levels: 'N4–N3',
    descriptionFr: 'Actualités quotidiennes japonaises réécrites en vocabulaire accessible avec furigana et audio officiel.',
  },
  {
    id: 'aozora',
    title: 'Aozora Bunko (青空文庫)',
    url: 'https://www.aozora.gr.jp',
    category: 'Lecture & Presse',
    levels: 'N2–N1',
    descriptionFr: 'Bibliothèque libre d’œuvres littéraires japonaises tombées dans le domaine public.',
  },
  {
    id: 'forvo-ja',
    title: 'Forvo — Prononciations Natives JA',
    url: 'https://forvo.com/languages/ja/',
    category: 'Audio & Immersion',
    levels: 'N5–N1',
    descriptionFr: 'Enregistrements audio de mots et expressions lus par des locuteurs natifs (avec accent de hauteur).',
  },
  {
    id: 'jlpt-official',
    title: 'JLPT Official Practice Workbooks',
    url: 'https://www.jlpt.jp/e/samples/sampleindex.html',
    category: 'Audio & Immersion',
    levels: 'N5–N1',
    descriptionFr: 'Sujets officiels d’entraînement publiés par Japan Educational Exchanges and Services (JEES).',
  },
  {
    id: 'kanjivg',
    title: 'KanjiVG (Tracés vectoriels SVG)',
    url: 'https://kanjivg.tagaini.net',
    category: 'Données Open-Source',
    levels: 'N5–N1',
    descriptionFr: 'Base vectorielle open-source fournissant l’ordre exact des traits utilisé dans eJLPT.',
  },
  {
    id: 'edict',
    title: 'EDRDG — JMdict & KANJIDIC2',
    url: 'https://www.edrdg.org',
    category: 'Données Open-Source',
    levels: 'N5–N1',
    descriptionFr: 'Données lexicales ouvertes servant de socle à de nombreux dictionnaires japonais.',
  },
  {
    id: 'kanjiapi',
    title: 'kanjiapi.dev',
    url: 'https://kanjiapi.dev',
    category: 'Données Open-Source',
    levels: 'N5–N1',
    descriptionFr: 'API REST ouverte et légère dédiée aux lectures, radicaux et traits des kanjis.',
  },
];
