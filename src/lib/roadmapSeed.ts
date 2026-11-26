export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface RoadmapCategory {
  id: string;
  name: string;
  description?: string;
  order: number;
}

export interface RoadmapTask {
  id: string;
  categoryId: string;
  title: string;
  progress: number;
  status: TaskStatus;
  priority: TaskPriority;
  ref?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapState {
  version: number;
  updatedAt: string;
  categories: RoadmapCategory[];
  tasks: RoadmapTask[];
}

export type RoadmapSyncOp =
  | {
      opId: string;
      type: 'upsert_task';
      payload: Partial<RoadmapTask> & { id: string };
      ts: string;
    }
  | {
      opId: string;
      type: 'delete_task';
      payload: { id: string };
      ts: string;
    }
  | {
      opId: string;
      type: 'upsert_category';
      payload: Partial<RoadmapCategory> & { id: string };
      ts: string;
    }
  | {
      opId: string;
      type: 'delete_category';
      payload: { id: string };
      ts: string;
    }
  | {
      opId: string;
      type: 'replace_all';
      payload: { categories: RoadmapCategory[]; tasks: RoadmapTask[] };
      ts: string;
    };

const SEED_TS = '2026-11-26T08:30:00.000Z';

function statusFromProgress(progress: number): TaskStatus {
  if (progress >= 100) return 'done';
  if (progress > 0) return 'in_progress';
  return 'todo';
}

function seedTask(
  id: string,
  categoryId: string,
  title: string,
  progress: number,
  priority: TaskPriority,
  ref: string,
  notes: string
): RoadmapTask {
  return {
    id,
    categoryId,
    title,
    progress,
    status: statusFromProgress(progress),
    priority,
    ref,
    notes,
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  };
}

export function createDefaultRoadmapState(): RoadmapState {
  const categories: RoadmapCategory[] = [
    {
      id: 'cat-grammar-drills',
      name: 'Exercices, Phrases & Registres',
      description: 'Transformation de phrases, particules, passif (ukemikei), politesse et syntaxe.',
      order: 1,
    },
    {
      id: 'cat-jlpt-quizzes',
      name: 'Simulateur JLPT & Quiz Dynamiques',
      description: 'Cahiers officiels N5–N1, Choukai audio, SRS SM-2 et modes de quiz interactifs.',
      order: 2,
    },
    {
      id: 'cat-dictionaries-kanji',
      name: 'Dictionnaires, Kanji N0 & Données',
      description: 'Bases unifiées, slang, onomatopées, schémas à 38 champs, thèmes et groupes.',
      order: 3,
    },
    {
      id: 'cat-connections-colors',
      name: 'Grammaire, Couleurs & Connexions',
      description: 'Types de connexion 【接続】, codes couleurs syntaxiques et particules.',
      order: 4,
    },
    {
      id: 'cat-reader-immersion',
      name: 'Lecteur, Scripts Manga & Immersion',
      description: 'Script 2 List, furigana adaptatifs, sous-titres vidéo, textes courts et presse.',
      order: 5,
    },
    {
      id: 'cat-tools-search-stats',
      name: 'Outils Pédagogiques, Filtres & Stats',
      description: 'Hub /tools, recherche avancée, objectifs SMART, heatmaps et outils manquants.',
      order: 6,
    },
    {
      id: 'cat-apps-community',
      name: 'Inspirations Apps, IA & Ressources',
      description: 'Kanjiverse 3D, Yomikata Z, JA Sensei, Todai Japan, FAQ, chat IA et sources.',
      order: 7,
    },
  ];

  const tasks: RoadmapTask[] = [
    // Cat 1 — Exercices, Phrases & Registres
    seedTask(
      't-polite-transform',
      'cat-grammar-drills',
      'Transformer une phrase en forme polie / keigo / futsuugo',
      100,
      'high',
      'L2, L52',
      'Atelier interactif Poli/Keigo (丁寧語/尊敬語/謙譲語/普通形) + table Keigo + 3 collections fusionnables & correction libre IA dans /practice.'
    ),
    seedTask(
      't-particles-practice',
      'cat-grammar-drills',
      'Exercice dédié : mettre la ou les bonnes particules',
      100,
      'high',
      'L3, L24',
      'Atelier Particules dédié dans /practice (QCM + clavier + 3 collections) + guide priorité des particules sur /grammar.'
    ),
    seedTask(
      't-sentence-builder-steps',
      'cat-grammar-drills',
      'Construire par étapes une phrase très basique vers complexe',
      100,
      'medium',
      'L4',
      'IncrementalSentenceBuilder : 5 parcours complets en 4 étapes (N5→N1) du noyau verbal à la phrase nuancée + exercices d’expansion.'
    ),
    seedTask(
      't-error-correction',
      'cat-grammar-drills',
      'Corriger une phrase fautive (particule, grammaire, kanji, syntaxe)',
      100,
      'medium',
      'L6',
      'Atelier dédié error_correction dans /practice (particule, grammaire, politesse, syntaxe, kanji) + évaluation libre IA.'
    ),
    seedTask(
      't-ukemikei',
      'cat-grammar-drills',
      'Règles et exercices sur la forme passive (Ukemikei)',
      100,
      'medium',
      'L8, L75',
      'Conjugateur déterministe Ukemikei + fiche de règles passif direct/迷惑の受身 + atelier dédié dans /practice.'
    ),
    seedTask(
      't-conditional-imperative',
      'cat-grammar-drills',
      'Modules dédiés au conditionnel et à l’impératif',
      100,
      'low',
      'L15',
      'Atelier dédiéと/ば/たら/なら & 命令形/禁止形 + conjugateur + mémo comparatif dans /practice.'
    ),
    seedTask(
      't-polite-to-casual',
      'cat-grammar-drills',
      'Passer des formes polies complètes aux formes familières / abrégées',
      100,
      'medium',
      'L16',
      'Atelier poli ↔ familier/abrégé (〜てる, 〜とく, 〜ちゃう, 〜なきゃ, 〜じゃない) + mémo contractions dans /practice.'
    ),
    seedTask(
      't-double-particles-native',
      'cat-grammar-drills',
      'Décomposer doubles particules (とは, のを) & phrase natale + particules',
      100,
      'low',
      'L32, L57',
      'Atelier dédié décomposition doubles particules (とは, のを, では) + exercices phrase française avec particules japonaises.'
    ),

    // Cat 2 — Simulateur JLPT & Quiz Dynamiques
    seedTask(
      't-jlpt-full-exams',
      'cat-jlpt-quizzes',
      'Simulateur JLPT complet N5 → N1 (10 examens officiels, OMR, barème /180)',
      95,
      'high',
      'L92, L174',
      '10 cahiers officiels complets anonymisés (Examen #1 et #2 par niveau, 1 001 questions) + compositeur modulaire par mondai.'
    ),
    seedTask(
      't-jlpt-audio-choukai',
      'cat-jlpt-quizzes',
      'Exercices audio type JLPT (MP3, script, illustrations, explications FR)',
      95,
      'high',
      'L35',
      'Pistes MP3 réelles, scripts complets (audioScript) et explanationFr sur toutes les épreuves Choukai (N5–N1) + ChoukaiAudioPlayer.'
    ),
    seedTask(
      't-srs-error-loop',
      'cat-jlpt-quizzes',
      'Alimenter les prochains quiz avec les erreurs récentes (SM-2)',
      90,
      'high',
      'L53',
      'recordErrorToSRS() remonte les erreurs d’examens et de /practice dans localDb.srsCards pour alimenter srs_review.'
    ),
    seedTask(
      't-dynamic-quiz-modes',
      'cat-jlpt-quizzes',
      'Quiz dynamiques QCM multi-modes + chrono (dextérité)',
      55,
      'high',
      'L5, L167, L169, L171, L176',
      '5 modes QCM texte (kanji, grammaire, intrus, jukugo, SRS) + chrono 10s/20s/30s. Manquent : lecture rapide, écriture notée, traduction, score dextérité.'
    ),
    seedTask(
      't-quiz-immediate-feedback',
      'cat-jlpt-quizzes',
      'Quiz avec réponse et explication immédiate juste après le choix',
      45,
      'medium',
      'L37–L38',
      'Actif dans le mode Personnalisé/Modulaire des examens et en indices texte dans /practice. Manquent images, son et GIF dans /practice.'
    ),
    seedTask(
      't-intruder-set',
      'cat-jlpt-quizzes',
      'Trouver l’intrus / l’ensemble (syno, homo, antonyme, paronyme)',
      25,
      'high',
      'L7, L54, L177',
      'Mode synonyms_intruder présent sur kanjis, mais données vides sur antonymes (0) et homonymes (0), synonyms à 1 % (32/3042).'
    ),
    seedTask(
      't-quiz-multimedia-badges',
      'cat-jlpt-quizzes',
      'Quiz kanji/vocab enrichis (images sprites WebP, audio + métadonnées grammaticales après choix)',
      15,
      'medium',
      'L23, L51',
      'Pipeline sprites WebP : items simples (animaux, couleurs…) -> CDN direct sans IA ; items complexes (ex. 達) -> CDN puis juge IA -> file batch si inadapté. Aucune fiche/sprite encore affichée dans /practice.'
    ),
    seedTask(
      't-quiz-dragdrop-sort',
      'cat-jlpt-quizzes',
      'Quiz drag-and-drop (remise en ordre), tri/catégorisation & 1dan/5dan',
      20,
      'medium',
      'L168, L172, L175',
      'Atelier par clics 4 slots ★ (grammar_star) dans le cahier JLPT ; aucun drag-and-drop natif, ni tri/catégorisation, ni 1dan/5dan.'
    ),

    // Cat 3 — Dictionnaires, Kanji N0 & Données
    seedTask(
      't-jlpt-n0-daily',
      'cat-dictionaries-kanji',
      'JLPT N0 : kanjis (811) et mots de la vie de tous les jours',
      100,
      'high',
      'L10',
      '811 kanjis N0 + étiquetage N0 sur les 33 425 jukugo, filtrables dans /kanji, /dictionary et textAnalyzer.'
    ),
    seedTask(
      't-unified-dicts',
      'cat-dictionaries-kanji',
      'Dictionnaires complets (kanjis, verbes, adv, adj, prép, conj, ono, proverbes, jukugo)',
      100,
      'medium',
      'L11',
      'Hub /dictionary livré : 33 425 jukugo (2/3/4+ kanjis), nature grammaticale, 自動/他動, affixes, 接続詞 et proverbes/citations.'
    ),
    seedTask(
      't-slang-era-freq',
      'cat-dictionaries-kanji',
      'Dictionnaire slang + époque d’utilisation + fréquence annuelle (1er janv)',
      100,
      'low',
      'L12',
      '851 entrées slang enrichies (époque, usage /100, filtre époque sur /slang) + route cron annuelle /api/cron/slang-refresh.'
    ),
    seedTask(
      't-kanji-compounds-ends',
      'cat-dictionaries-kanji',
      'Lister exhaustivement les mots composés commençant / finissant par un kanji',
      100,
      'medium',
      'L20, L87',
      'KanjiRelationsNav interroge dynamiquement et exhaustivement les 33 425 jukugo (début, fin et milieu) avec pagination.'
    ),
    seedTask(
      't-kanji-lists-groups',
      'cat-dictionaries-kanji',
      'Groupes de kanjis (même lecture 90 %, visuels 40 %, sens proche 15 %, opposés 0 %)',
      100,
      'medium',
      'L44–L48',
      'Homophones, synonymes, antonymes et ressemblances visuelles enrichis dans kanjiDatabase_unified.json + filtres /kanji et onglet Groupes sur /dictionary.'
    ),
    seedTask(
      't-kanji-38-fields',
      'cat-dictionaries-kanji',
      'Compléter les 38 champs du schéma kanji (antonyms, isKeigo, dualisme, strokeimage…)',
      90,
      'high',
      'L126–L164',
      'Schéma 38+ champs enrichi (SKIP, antonymes, dualisme, keigo, soto/uchi, KanjiVG SVG animé) + scripts batch Gemini & sprites WebP (lots médias à lancer selon quotas).'
    ),
    seedTask(
      't-dict-by-script',
      'cat-dictionaries-kanji',
      'Dictionnaire filtré par script (hira seul, kata seul, mixtes, romaji)',
      100,
      'low',
      'L13',
      'Classifieur classifyJapaneseScript + filtre 5 scripts (hira seul, kata seul, hira+kata, kanji, romaji) dans /dictionary.'
    ),
    seedTask(
      't-kanji-themes',
      'cat-dictionaries-kanji',
      'Thèmes de kanjis (grammaire, prép, conj, adv, gairaigo, ateji, pronoms…)',
      100,
      'low',
      'L98–L124',
      '15 thèmes grammaticaux/lexicaux calculés en base (index multiEntry *themes) et filtrables sur /kanji.'
    ),
    seedTask(
      't-ono-pairs-affixes',
      'cat-dictionaries-kanji',
      'Onomatopées par paires opposées, préfixes/suffixes & 接続詞',
      100,
      'low',
      'L30–L31, L56',
      'Paires opposées cliquables dans /slang + référentiel préfixes/suffixes et 接続詞 groupés dans /dictionary.'
    ),
    seedTask(
      't-polysemy-prob',
      'cat-dictionaries-kanji',
      'Repérer les mots polysémiques & % d’usage par sens',
      100,
      'low',
      'L19, L49',
      'Pondération % par sens sur kanjis & jukugo + onglet dédié Polysémie (%) avec collecte favoris dans /dictionary.'
    ),

    // Cat 4 — Grammaire, Couleurs & Connexions
    seedTask(
      't-grammar-connections',
      'cat-connections-colors',
      'Type de connexion grammaticale 【接続】 & liste globale des patterns',
      100,
      'medium',
      'L22, L61, L96',
      'Index récapitulatif global (ConnectionsIndexModal) sur 3 212+ connexions avec filtrage en 1 clic dans /grammar.'
    ),
    seedTask(
      't-connection-display-modes',
      'cat-connections-colors',
      'Customiser l’affichage des connexions (hiragana, romaji, formes mixtes manuels)',
      100,
      'medium',
      'L27',
      'Sélecteur 6 formats dans /grammar et VisualSystemContext (Japonais standard, Hiragana, Romaji, Manuels FR, Manuels EN, Mixte compact).'
    ),
    seedTask(
      't-color-shape-system',
      'cat-connections-colors',
      'Système unifié couleurs/formes (bunkei, keigo, soto/uchi, +/-, adj, 1dan/5dan, 自動・他動)',
      100,
      'medium',
      'L26, L65–L66, L74',
      'Système 4 canaux simultanés aux tons japonais (Texte = maîtrise SRS 4 paliers, Fond = fréquence 1–10, Soulignement = grammaire, Pastille = JLPT) + VisualLegendBar.'
    ),
    seedTask(
      't-particles-usage-guide',
      'cat-connections-colors',
      'Apprendre signification & cas d’utilisation détaillés des particules',
      100,
      'medium',
      'L50',
      'Guide structuré ParticlesPriorityGuide (24 particules clés + table de priorité à 5 niveaux analogie opérateurs) relié aux 284 fiches /grammar.'
    ),

    // Cat 5 — Lecteur, Scripts Manga & Immersion
    seedTask(
      't-script-2-list-core',
      'cat-reader-immersion',
      'Lecteur Script 2 List : extraction vocabulaire/kanji/grammaire + stats JLPT',
      60,
      'high',
      'L25, L70, L95',
      'Analyse temps réel sur /reader avec niveau cible, taux de lisibilité et listes extractibles vers /bookmarks.'
    ),
    seedTask(
      't-manga-pdf-quiz-reader',
      'cat-reader-immersion',
      'Bibliothèque scripts manga/animés + import PDF + extraction par prompt + quiz généré',
      20,
      'high',
      'L25, L70',
      'Seulement 3 scripts exemple en dur (N5/N3/N2). Zéro import PDF, zéro catalogue manga, zéro prompt IA ou quiz depuis le texte.'
    ),
    seedTask(
      't-video-interactive-subs',
      'cat-reader-immersion',
      'Lecteur vidéo avec sous-titres interactifs (local MP4/WebM + YouTube + .srt/.vtt)',
      0,
      'medium',
      'L28',
      'Double mode validé (fichier local sans upload + YouTube IFrame API synchronisés avec .srt/.vtt cliquable). Non démarré.'
    ),
    seedTask(
      't-memorize-texts-proverbs',
      'cat-reader-immersion',
      'Phrases par cœur JLPT, petits textes/histoires/chansons & proverbes',
      10,
      'low',
      'L36, L41, L55, L60',
      'Exemples statiques dans grammar_unified.json et 3 passages dans /reader ; zéro proverbe, chanson ou mode par cœur.'
    ),
    seedTask(
      't-ja-defs-press-keyboard',
      'cat-reader-immersion',
      'Lire définitions JA monolingues, presse & tutoriels clavier JA (Linux/Win/iOS)',
      15,
      'low',
      'L39–L40',
      'Courts textes avec définitions au clic couverts sur /reader ; définitions japonaises, presse et guides clavier absents.'
    ),
    seedTask(
      't-image-vocab-gairaigo',
      'cat-reader-immersion',
      'Vocabulaire par image/scénario & programme oral gairaigo débutants',
      0,
      'low',
      'L21, L58',
      'Non démarré.'
    ),

    // Cat 6 — Outils Pédagogiques, Filtres & Stats
    seedTask(
      't-furigana-engine',
      'cat-tools-search-stats',
      'Système Furigana global (Toujours / Survol / Masqués) & adaptatif SRS',
      90,
      'high',
      'L77',
      'Opérationnel dans la Navbar (FuriganaContext), les cahiers JLPT (RichJLPTText) et le lecteur adaptatif (shouldShowAdaptiveFurigana).'
    ),
    seedTask(
      't-smart-goals-analytics',
      'cat-tools-search-stats',
      'Objectifs SMART & statistiques heatmap kanji / progrès (AnalyticsDashboard)',
      65,
      'high',
      'L42, L72',
      'Disponible dans /history (heatmap N5→N1, cartes SM-2, 3 objectifs SMART dynamiques). Manquent affichage post-quiz et stats jukugo globales.'
    ),
    seedTask(
      't-advanced-search-filters',
      'cat-tools-search-stats',
      'Filtres avancés recherche (radical 85 %, SKIP 40 %, only:, exclure, comparer, tri +/-)',
      35,
      'medium',
      'L14, L63–L64, L79–L94',
      'Recherche globale FlexSearch/WanaKana + filtres radicaux/traits/fréquence. Absents : comparer, exclure, soto/uchi, tadoushi/jidoushi.'
    ),
    seedTask(
      't-freq-scale-1-10',
      'cat-tools-search-stats',
      'Normaliser la fréquence des kanjis sur une échelle de 1 à 10',
      100,
      'low',
      'L67',
      'Indicateur normalisé 1–10 (frequencyScore10) intégré en base, dans frequencyScale.ts, /kanji et /dictionary.'
    ),
    seedTask(
      't-missing-tools-hub',
      'cat-tools-search-stats',
      'Outils à ajouter dans /tools : table conjugaison, récap politesse, おすすめ, todo IA',
      0,
      'medium',
      'L71, L73, L76, L78',
      '5 onglets actuels dans /tools (Canvas, Ezoe, Arbre, Kanjiverse 3D, Audio). Outil Map (L69) abandonné ; 4 outils restants à créer.'
    ),

    // Cat 7 — Inspirations Apps, IA & Ressources
    seedTask(
      't-kanjiverse-3d',
      'cat-apps-community',
      'Kanjiverse : code couleur fréquence + UI adaptative niveau (et bonus 3D)',
      100,
      'medium',
      'L182',
      'Code couleur fréquence 1–10 sur /kanji, profil adaptatif global Débutant/Intermédiaire/Avancé (Romaji/RTK vs SKIP/Encodage) et constellation 3D conservée en bonus.'
    ),
    seedTask(
      't-ja-sensei-modules',
      'cat-apps-community',
      'JA Sensei : modules structurés « Leçons » et « Lecture »',
      20,
      'medium',
      'L179',
      'Volet Lecture partiellement présent (/reader + Dokkai), module Leçons progressives manquant.'
    ),
    seedTask(
      't-yomikata-z',
      'cat-apps-community',
      'Yomikata Z : phrase par niveau, mot coloré selon maîtrise SRS (QCM / clavier / oral)',
      0,
      'high',
      'L180',
      'Spec validée : phrase adaptée au niveau, mot coloré selon 4 paliers SRS, réponse QCM / clavier / oral (Web Speech + fallback Gemini audio).'
    ),
    seedTask(
      't-todai-daily-news',
      'cat-apps-community',
      'Todai Japan : 1 nouvel article de presse / jour / niveau JLPT (RSS + adaptation IA)',
      0,
      'medium',
      'L181',
      'Spec validée : flux RSS réels (NHK / NHK Easy) classés JLPT + adaptation quotidienne Gemini cachée en MongoDB.'
    ),
    seedTask(
      't-ai-oral-chat-discussion',
      'cat-apps-community',
      'Tchat oral IA borné par JLPT + générateur de sujets de discussion',
      0,
      'low',
      'L34, L43',
      'Tchat IA uniquement (volet natif abandonné) : session bornée par JLPT/thème + Web Speech / Gemini audio + générateur de sujets.'
    ),
    seedTask(
      't-faq-stackoverflow-ai',
      'cat-apps-community',
      'FAQ publique AI-enhanced à la StackOverflow par catégories et niveaux',
      0,
      'low',
      'L17',
      'Spec validée : 100 % publique, anti-doublons IA, anonyme pour questions/commentaires (modération auto), compte Clerk pour votes, modération admin.'
    ),
    seedTask(
      't-resources-learning-order',
      'cat-apps-community',
      'Page ressources vulgarisée (Ezoe, Genki, PDF, YouTube) & ordre kata→hira→clé→part→kanji',
      5,
      'low',
      'L9, L29, L183–L187',
      'Pas de page dédiée ni crédits/liens runtime vers edict_database, kanjium, japanese-toolkit ou kanjiapi.dev.'
    ),
  ];

  return {
    version: 1,
    updatedAt: SEED_TS,
    categories,
    tasks,
  };
}
