import type { ExamCatalogEntry, JLPTExam, JLPTLevel } from '@/types/jlpt';

/**
 * Manifeste léger (métadonnées seules, sans questions/passages) pour le catalogue d'accueil.
 * Les épreuves complètes sont chargées dynamiquement à la demande via `loadExamById`.
 * Les identifiants d'origine/millésime restent purement internes : l'interface n'expose que `Examen #1`, `#2`, etc.
 */
export const EXAM_CATALOG_MANIFEST: ExamCatalogEntry[] = [
  {
    id: 'exam-n5-official-2018',
    level: 'N5',
    examNumber: 1,
    candidateCodePrefix: '001',
    title: 'JLPT N5 — Examen #1',
    description:
      'Simulation officielle complète 91 questions en 3 épreuves chronométrées (25m + 50m + 30m), mise en page cahier papier, feuille OMR et audio MP3 officiel.',
    totalTimeMinutes: 105,
    questionCount: 91,
    scoringScale: 'JLPT_180',
    isOfficialSample: true,
    stageCount: 3,
    sections: [
      {
        type: 'moji_go',
        name: '言語知識（文字・語彙）',
        description: 'Écriture et vocabulaire (35 Q) — Épreuve 1 (25 min)',
        timeMinutes: 25,
        maxScore: 120,
        minPassScore: 38,
      },
      {
        type: 'bunpou_dokkai',
        name: '言語知識（文法）・読解',
        description: 'Épreuve 2 combinée : Grammaire (26 Q) & Lecture (6 Q) — Total écrit /120 (seuil ≥ 38)',
        timeMinutes: 50,
        maxScore: 120,
        minPassScore: 38,
      },
      {
        type: 'choukai',
        name: '聴解（Choukai）',
        description: 'Compréhension orale 問題1–4 (24 Q, flux MP3 officiel N5Q1–Q4) — Score sur 60 (seuil ≥ 19)',
        timeMinutes: 30,
        maxScore: 60,
        minPassScore: 19,
      },
    ],
  },
  {
    id: 'exam-n5-official-2012',
    level: 'N5',
    examNumber: 2,
    candidateCodePrefix: '002',
    title: 'JLPT N5 — Examen #2',
    description:
      'Simulation officielle complète 89 questions en 3 épreuves chronométrées (25m + 50m + 30m), mise en page cahier papier, feuille OMR et audio MP3 officiel.',
    totalTimeMinutes: 105,
    questionCount: 89,
    scoringScale: 'JLPT_180',
    isOfficialSample: true,
    stageCount: 3,
    sections: [
      {
        type: 'moji_go',
        name: '言語知識（文字・語彙）',
        description: 'Écriture et vocabulaire (33 Q) — Épreuve 1 (25 min)',
        timeMinutes: 25,
        maxScore: 120,
        minPassScore: 38,
      },
      {
        type: 'bunpou_dokkai',
        name: '言語知識（文法）・読解',
        description: 'Épreuve 2 combinée : Grammaire (26 Q) & Lecture (6 Q) — Total écrit /120 (seuil ≥ 38)',
        timeMinutes: 50,
        maxScore: 120,
        minPassScore: 38,
      },
      {
        type: 'choukai',
        name: '聴解（Choukai）',
        description: 'Compréhension orale 問題1–4 (24 Q, flux MP3 officiel N5Q1–Q4) — Score sur 60 (seuil ≥ 19)',
        timeMinutes: 30,
        maxScore: 60,
        minPassScore: 19,
      },
    ],
  },
  {
    id: 'exam-n4-official-2018',
    level: 'N4',
    examNumber: 1,
    candidateCodePrefix: '001',
    title: 'JLPT N4 — Examen #1',
    description:
      'Simulation officielle complète 98 questions en 3 épreuves chronométrées (30m + 60m + 35m), mise en page cahier papier, feuille OMR et audio MP3 officiel.',
    totalTimeMinutes: 125,
    questionCount: 98,
    scoringScale: 'JLPT_180',
    isOfficialSample: true,
    stageCount: 3,
    sections: [
      {
        type: 'moji_go',
        name: '言語知識（文字・語彙）',
        description: 'Écriture et vocabulaire (35 Q) — Épreuve 1 (30 min)',
        timeMinutes: 30,
        maxScore: 120,
        minPassScore: 38,
      },
      {
        type: 'bunpou_dokkai',
        name: '言語知識（文法）・読解',
        description: 'Épreuve 2 combinée : Grammaire (25 Q) & Lecture (10 Q) — Total écrit /120 (seuil ≥ 38)',
        timeMinutes: 60,
        maxScore: 120,
        minPassScore: 38,
      },
      {
        type: 'choukai',
        name: '聴解（Choukai）',
        description: 'Compréhension orale 問題1–4 (28 Q, flux MP3 officiel N4Q1–Q4) — Score sur 60 (seuil ≥ 19)',
        timeMinutes: 39,
        maxScore: 60,
        minPassScore: 19,
      },
    ],
  },
  {
    id: 'exam-n4-official-2012',
    level: 'N4',
    examNumber: 2,
    candidateCodePrefix: '002',
    title: 'JLPT N4 — Examen #2',
    description:
      'Simulation officielle complète 97 questions en 3 épreuves chronométrées (30m + 60m + 35m), mise en page cahier papier, feuille OMR et audio MP3 officiel.',
    totalTimeMinutes: 125,
    questionCount: 97,
    scoringScale: 'JLPT_180',
    isOfficialSample: true,
    stageCount: 3,
    sections: [
      {
        type: 'moji_go',
        name: '言語知識（文字・語彙）',
        description: 'Écriture et vocabulaire (34 Q) — Épreuve 1 (30 min)',
        timeMinutes: 30,
        maxScore: 120,
        minPassScore: 38,
      },
      {
        type: 'bunpou_dokkai',
        name: '言語知識（文法）・読解',
        description: 'Épreuve 2 combinée : Grammaire (25 Q) & Lecture (10 Q) — Total écrit /120 (seuil ≥ 38)',
        timeMinutes: 60,
        maxScore: 120,
        minPassScore: 38,
      },
      {
        type: 'choukai',
        name: '聴解（Choukai）',
        description: 'Compréhension orale 問題1–4 (28 Q, flux MP3 officiel N4Q1–Q4) — Score sur 60 (seuil ≥ 19)',
        timeMinutes: 37,
        maxScore: 60,
        minPassScore: 19,
      },
    ],
  },
  {
    id: 'exam-n3-official-2018',
    level: 'N3',
    examNumber: 1,
    candidateCodePrefix: '001',
    title: 'JLPT N3 — Examen #1',
    description:
      'Simulation officielle complète 102 questions en 3 épreuves chronométrées (30m + 70m + 40m), mise en page cahier papier, feuille OMR et audio MP3 officiel.',
    totalTimeMinutes: 140,
    questionCount: 102,
    scoringScale: 'JLPT_180',
    isOfficialSample: true,
    stageCount: 3,
    sections: [
      {
        type: 'moji_go',
        name: '言語知識（文字・語彙・文法）',
        description: 'Écriture, vocabulaire (35 Q) + Grammaire (23 Q) — Score noté sur 60 (seuil ≥ 19)',
        timeMinutes: 30,
        maxScore: 60,
        minPassScore: 19,
      },
      {
        type: 'bunpou_dokkai',
        name: '言語知識（文法）・読解',
        description:
          'Épreuve 2 combinée : Grammaire 問題1–3 (23 Q) & Lecture 問題4–7 (16 Q) — Score Dokkai sur 60 (seuil ≥ 19)',
        timeMinutes: 70,
        maxScore: 60,
        minPassScore: 19,
      },
      {
        type: 'choukai',
        name: '聴解（Choukai）',
        description:
          'Compréhension orale authentique 問題1–5 (28 Q, flux MP3 officiel N3Q1–Q5) — Score sur 60 (seuil ≥ 19)',
        timeMinutes: 44,
        maxScore: 60,
        minPassScore: 19,
      },
    ],
  },
  {
    id: 'exam-n3-official-2012',
    level: 'N3',
    examNumber: 2,
    candidateCodePrefix: '002',
    title: 'JLPT N3 — Examen #2',
    description:
      'Simulation officielle complète 99 questions en 3 épreuves chronométrées (30m + 70m + 40m), mise en page cahier papier, feuille OMR et audio MP3 officiel.',
    totalTimeMinutes: 140,
    questionCount: 99,
    scoringScale: 'JLPT_180',
    isOfficialSample: true,
    stageCount: 3,
    sections: [
      {
        type: 'moji_go',
        name: '言語知識（文字・語彙・文法）',
        description: 'Écriture, vocabulaire (33 Q) + Grammaire (23 Q) — Score noté sur 60 (seuil ≥ 19)',
        timeMinutes: 30,
        maxScore: 60,
        minPassScore: 19,
      },
      {
        type: 'bunpou_dokkai',
        name: '言語知識（文法）・読解',
        description:
          'Épreuve 2 combinée : Grammaire 問題1–3 (23 Q) & Lecture 問題4–7 (16 Q) — Score Dokkai sur 60 (seuil ≥ 19)',
        timeMinutes: 70,
        maxScore: 60,
        minPassScore: 19,
      },
      {
        type: 'choukai',
        name: '聴解（Choukai）',
        description:
          'Compréhension orale authentique 問題1–5 (27 Q, flux MP3 officiel N3Q1–Q5) — Score sur 60 (seuil ≥ 19)',
        timeMinutes: 41,
        maxScore: 60,
        minPassScore: 19,
      },
    ],
  },
  {
    id: 'exam-n2-official-2018',
    level: 'N2',
    examNumber: 1,
    candidateCodePrefix: '001',
    title: 'JLPT N2 — Examen #1',
    description:
      'Simulation officielle complète 107 questions en 2 épreuves authentiques (105m écrit combiné + 50m audio), cahier papier N2, OMR et MP3 officiel.',
    totalTimeMinutes: 155,
    questionCount: 107,
    scoringScale: 'JLPT_180',
    isOfficialSample: true,
    stageCount: 2,
    sections: [
      {
        type: 'moji_go',
        name: '言語知識（文字・語彙・文法）',
        description: 'Vocabulaire (32 Q) & Grammaire (22 Q) — Score /60 (seuil ≥ 19)',
        timeMinutes: 105,
        maxScore: 60,
        minPassScore: 19,
      },
      {
        type: 'bunpou_dokkai',
        name: '読解（Compréhension écrite）',
        description: 'Textes courts, moyens, comparaison, long & recherche d’info (21 Q) — Score /60 (seuil ≥ 19)',
        timeMinutes: 105,
        maxScore: 60,
        minPassScore: 19,
      },
      {
        type: 'choukai',
        name: '聴解（Choukai）',
        description: 'Compréhension orale 問題1–5 (32 Q, flux MP3 officiel N2Q1–Q5) — Score /60 (seuil ≥ 19)',
        timeMinutes: 50,
        maxScore: 60,
        minPassScore: 19,
      },
    ],
  },
  {
    id: 'exam-n2-official-2012',
    level: 'N2',
    examNumber: 2,
    candidateCodePrefix: '002',
    title: 'JLPT N2 — Examen #2',
    description:
      'Simulation officielle complète 106 questions en 2 épreuves authentiques (105m écrit combiné + 50m audio), cahier papier N2, OMR et MP3 officiel.',
    totalTimeMinutes: 155,
    questionCount: 106,
    scoringScale: 'JLPT_180',
    isOfficialSample: true,
    stageCount: 2,
    sections: [
      {
        type: 'moji_go',
        name: '言語知識（文字・語彙・文法）',
        description: 'Vocabulaire (32 Q) & Grammaire (22 Q) — Score /60 (seuil ≥ 19)',
        timeMinutes: 105,
        maxScore: 60,
        minPassScore: 19,
      },
      {
        type: 'bunpou_dokkai',
        name: '読解（Compréhension écrite）',
        description: 'Textes courts, moyens, comparaison, long & recherche d’info (21 Q) — Score /60 (seuil ≥ 19)',
        timeMinutes: 105,
        maxScore: 60,
        minPassScore: 19,
      },
      {
        type: 'choukai',
        name: '聴解（Choukai）',
        description: 'Compréhension orale 問題1–5 (31 Q, flux MP3 officiel N2Q1–Q5) — Score /60 (seuil ≥ 19)',
        timeMinutes: 50,
        maxScore: 60,
        minPassScore: 19,
      },
    ],
  },
  {
    id: 'exam-n1-official-2018',
    level: 'N1',
    examNumber: 1,
    candidateCodePrefix: '001',
    title: 'JLPT N1 — Examen #1',
    description:
      'Simulation officielle complète 107 questions en 2 épreuves authentiques (110m écrit combiné + 60m audio), cahier papier N1, OMR et MP3 officiel.',
    totalTimeMinutes: 170,
    questionCount: 107,
    scoringScale: 'JLPT_180',
    isOfficialSample: true,
    stageCount: 2,
    sections: [
      {
        type: 'moji_go',
        name: '言語知識（文字・語彙・文法）',
        description: 'Vocabulaire (25 Q) & Grammaire (20 Q) — Score /60 (seuil ≥ 19)',
        timeMinutes: 110,
        maxScore: 60,
        minPassScore: 19,
      },
      {
        type: 'bunpou_dokkai',
        name: '読解（Compréhension écrite）',
        description: 'Textes courts, moyens, comparaison, longs & recherche d’info (25 Q) — Score /60 (seuil ≥ 19)',
        timeMinutes: 110,
        maxScore: 60,
        minPassScore: 19,
      },
      {
        type: 'choukai',
        name: '聴解（Choukai）',
        description: 'Compréhension orale 問題1–5 (37 Q, flux MP3 officiel N1Q1–Q5) — Score /60 (seuil ≥ 19)',
        timeMinutes: 60,
        maxScore: 60,
        minPassScore: 19,
      },
    ],
  },
  {
    id: 'exam-n1-official-2012',
    level: 'N1',
    examNumber: 2,
    candidateCodePrefix: '002',
    title: 'JLPT N1 — Examen #2',
    description:
      'Simulation officielle complète 105 questions en 2 épreuves authentiques (110m écrit combiné + 60m audio), cahier papier N1, OMR et MP3 officiel.',
    totalTimeMinutes: 170,
    questionCount: 105,
    scoringScale: 'JLPT_180',
    isOfficialSample: true,
    stageCount: 2,
    sections: [
      {
        type: 'moji_go',
        name: '言語知識（文字・語彙・文法）',
        description: 'Vocabulaire (25 Q) & Grammaire (20 Q) — Score /60 (seuil ≥ 19)',
        timeMinutes: 110,
        maxScore: 60,
        minPassScore: 19,
      },
      {
        type: 'bunpou_dokkai',
        name: '読解（Compréhension écrite）',
        description: 'Textes courts, moyens, comparaison, longs & recherche d’info (24 Q) — Score /60 (seuil ≥ 19)',
        timeMinutes: 110,
        maxScore: 60,
        minPassScore: 19,
      },
      {
        type: 'choukai',
        name: '聴解（Choukai）',
        description: 'Compréhension orale 問題1–5 (36 Q, flux MP3 officiel N1Q1–Q5) — Score /60 (seuil ≥ 19)',
        timeMinutes: 60,
        maxScore: 60,
        minPassScore: 19,
      },
    ],
  },
];

type ExamModuleLoader = () => Promise<JLPTExam>;

const EXAM_LOADERS: Record<string, ExamModuleLoader> = {
  'exam-n5-official-2018': () => import('./jlptN5Official2018').then((m) => m.JLPT_N5_OFFICIAL_2018),
  'exam-n5-official-2012': () => import('./jlptN5Official2012').then((m) => m.JLPT_N5_OFFICIAL_2012),
  'exam-n4-official-2018': () => import('./jlptN4Official2018').then((m) => m.JLPT_N4_OFFICIAL_2018),
  'exam-n4-official-2012': () => import('./jlptN4Official2012').then((m) => m.JLPT_N4_OFFICIAL_2012),
  'exam-n3-official-2018': () => import('./jlptN3Official2018').then((m) => m.JLPT_N3_OFFICIAL_2018),
  'exam-n3-official-2012': () => import('./jlptN3Official2012').then((m) => m.JLPT_N3_OFFICIAL_2012),
  'exam-n2-official-2018': () => import('./jlptN2Official2018').then((m) => m.JLPT_N2_OFFICIAL_2018),
  'exam-n2-official-2012': () => import('./jlptN2Official2012').then((m) => m.JLPT_N2_OFFICIAL_2012),
  'exam-n1-official-2018': () => import('./jlptN1Official2018').then((m) => m.JLPT_N1_OFFICIAL_2018),
  'exam-n1-official-2012': () => import('./jlptN1Official2012').then((m) => m.JLPT_N1_OFFICIAL_2012),
};

const examPromiseCache = new Map<string, Promise<JLPTExam>>();

export function getCatalogEntryById(id: string): ExamCatalogEntry | undefined {
  return EXAM_CATALOG_MANIFEST.find((entry) => entry.id === id);
}

export function getCatalogEntriesByLevel(level: JLPTLevel): ExamCatalogEntry[] {
  return EXAM_CATALOG_MANIFEST.filter((entry) => entry.level === level).sort(
    (a, b) => a.examNumber - b.examNumber
  );
}

export async function loadExamById(id: string): Promise<JLPTExam | null> {
  const loader = EXAM_LOADERS[id];
  if (!loader) return null;

  let cached = examPromiseCache.get(id);
  if (!cached) {
    cached = loader().catch((err) => {
      examPromiseCache.delete(id);
      throw err;
    });
    examPromiseCache.set(id, cached);
  }
  return cached;
}

export async function loadExamsByLevel(level: JLPTLevel): Promise<JLPTExam[]> {
  const entries = getCatalogEntriesByLevel(level);
  const loaded = await Promise.all(entries.map((entry) => loadExamById(entry.id)));
  return loaded.filter((exam): exam is JLPTExam => exam !== null);
}

export async function loadAllOfficialExams(): Promise<JLPTExam[]> {
  const loaded = await Promise.all(EXAM_CATALOG_MANIFEST.map((entry) => loadExamById(entry.id)));
  return loaded.filter((exam): exam is JLPTExam => exam !== null);
}
