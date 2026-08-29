# Synthèse, Catégorisation des Directives & Analyse des Ressources

> [!NOTE]
> **Mise à jour du 29/08 (v5)** : Consolidation unique de la matrice de fréquences (`frequences_combinees.json` / `.csv`) couvrant 5 corpus (Aozora, News, Twitter, Wikipedia, Innocent Fiction) pour une consultation optimisée Local-First.

---

## 1. Catégorisation des Directives (`README.md`) — 6 Modules

### 📦 Module 1 : Ontologie, Dictionnaire & Base de Données Linguistiques

* **Dictionnaire Multi-Facettes** : Kanji, verbes, adverbes, adjectifs, onomatopées, expressions, proverbes, jukugo (2-4+ kanjis), slang/argot daté, multi-scripts (Hira/Kata/Kanji/Romaji).
* **Schéma de Données Kanji** :
  * Métadonnées : UUID, JLPT, Grade, Fréquence (1-10), Traits, strokeimage, Nelson, SKIP, Encodages.
  * Lectures : ON, KUN, Nanori, Meanings FR/EN.
  * Relations : Synonymes, Antonymes, Homonymes, sameTsukuri, startingW/endingW.
  * Drapeaux : `isVerbe` **enum(4)** (false, irregulier [kuru/suru], ichidan, godan), `isAdj` **enum(4)** (i, na, no [連体詞], false), `dualisme` (-1/0/1), isKeigo, isPronoun, isCountry, etc.
* **Catégorisation Sémantique** : Taxonomie 7 catégories → 33 sous-catégories (1970 kanji classés).
* **Paramètres d'Affichage** : Typographie (Shodou/Mincho/Gothic), Shinjitai vs Kyūjitai, Classification Jōyō/Jinmeiyō.
* **Recherche Avancée** : Filtres multicritères (SKIP, radical, composant, synonyme/antonyme, polarité, Soto/Uchi, Keigo, fréquence par corpus, etc.) + suggestions.

### 🎮 Module 2 : Quiz & Exercices Interactifs Adaptatifs
QCM, texte à trous, drag-drop, vitesse, médias riches, correction de phrases, construction progressive, quiz manga/audio JLPT, particules intercalées en langue natale, boucle SRS sur erreurs.

### 📐 Module 3 : Visualisation Grammaticale & Connexion (接続)
Connexions (N+bunkei, V+bunkei) avec notation personnalisable, classification 接続詞, doubles particules, priorité des particules, conjugueurs.

### 🎨 Module 4 : Design System & Métriques
Code couleur typologique, furigana toggle, fréquence 1-10, dashboard stats, objectifs SMART, Heatmap SRS.

### 📚 Module 5 : Immersion, Pédagogie & Outils
Annuaire ressources, JLPT 0, lecture courte annotée, proverbes, tutoriels clavier, FAQ IA, Chat oral JLPT, Gairaigo débutants, Map, Script 2 Lists, Todo List IA.

### 🔄 Module 6 : Benchmark Écosystème
JA Sensei (Leçons/Lecture), Yomikata Z (variante adaptée), Todai Japan (article quotidien), Kanjiverse (✅ Constellation 3D Three.js/R3F validée).

---

## 2. Décisions Actées

| # | Question | Décision |
| :---: | :--- | :--- |
| 1 | "Type de kanji" (L.64) | Filtrer par catégorie sémantique (`kanjiCategories.json`). Typo/Shinjitai/Classification = paramètres d'affichage. |
| 2 | Filtre L.97 | Complet. |
| 3 | Yomikata Z | Variante adaptée. |
| 4 | Kanjiverse 3D | ✅ Three.js/R3F validé. |
| 5 | `isVerbe` | enum(4) : false, irregulier (kuru/suru), ichidan, godan. |
| 6 | `isAdj` | enum(4) : i, na, no (連体詞), false. |
| 7 | **Fichiers de Fréquence** | **Consolidés en un fichier unique `frequences_combinees.json` / `.csv` (5 corpus unifiés).** |

---

## 3. Analyse du Repo `grammarDic___AikiTanaka`

Ce repo constitue le **Pilier Grammatical & Syntactique** d'eJLPT. Il rassemble 4 dictionnaires de grammaire spécialisés convertis en JSON :

| Dictionnaire | Volume | Niveau JLPT | Spécificités & Intérêt pour eJLPT |
| :--- | ---: | :---: | :--- |
| **`dojg`** (Dictionary of Japanese Grammar) | **535 entrées** | Basic, Inter, Adv | Explanations pédagogiques précises ([解説]), traductions ([意味]), et phrases d'exemple bilingues ([例文A], [例文B]). |
| **`edewakaru`** (絵でわかる日本語) | **1 248 entrées** | N5 → N1 | **Formules de connexion (【接続】)** explicites (ex: `名詞［辞書形］＋なりとも`), explications en japonais simple et exemples numérotés. |
| **`nihongo_no_sensei`** (毎日のんびり日本語教師) | **1 479 entrées** | N5 → N1 | Explications du point de vue d'un enseignant natif, nuances d'usage, formules de connexion et traductions multi-langues. |
| **`nihongo_kyoushi`** (JLPT文法解説まとめ) | **628 entrées** | N5 → N1 | Fiches de synthèse synthétiques pour la préparation ciblée aux examens JLPT. |

### 💡 Complémentarité : `yomitan___MarvNC` vs `grammarDic___AikiTanaka`

| Dimension | `yomitan___MarvNC` | `grammarDic___AikiTanaka` |
| :--- | :--- | :--- |
| **Domaine** | **Kanji & Vocabulaire** | **Grammaire & Syntaxe (文法 / 接続)** |
| **Rôle Cœur** | Graphe Kanjiverse 3D, décomposition SKIP/composants, pitch accents, fréquences multi-corpus, variantes Shinjitai/Kyūjitai, onomatopées. | Moteur de leçons de grammaire, quiz de grammaire JLPT (N5-N1), visualiseur de règles de connexion (接続), particules détaillées. |
| **Formules de Connexion (接続)** | Non présent | **Exhaustif (3 000+ formules)** |
| **Intégration eJLPT** | Modules 1, 4 et 6 | **Modules 2, 3 et 5** |

---

## 4. Audit & Fichiers de Données Unifiés (`public/tmp/perplexity/output/`)

Tous les fichiers de données ont été générés et nettoyés. La structure du dossier `output/` est désormais simplifiée :

| Fichier | Taille | Items | Description & Structure |
| :--- | ---: | ---: | :--- |
| **`frequences_combinees.json`** | 685 Ko | **6 449 kanji** | **Unique objet central** répertoriant les rangs d'occurrence sur **5 corpus** (`aozora`, `news`, `twitter`, `wikipedia`, `innocent_fiction`). Ex: `"人": {"aozora": 1, "news": 5, "twitter": 1, "wikipedia": 12, "innocent_rank": 1}`. |
| **`frequences_combinees.csv`** | 147 Ko | **6 449 kanji** | Table unique multi-colonnes : `kanji, rank_aozora, rank_news, rank_twitter, rank_wikipedia, rank_innocent_fiction, count_innocent_fiction`. |
| `rtk_heisig_index.json` | 885 Ko | **3 039 kanji** | Index Heisig complet avec numéros (5th/6th ed), keywords EN, lectures ON/KUN, nb de traits, niveau JLPT. |
| `rtk_heisig_par_numero.json` | 899 Ko | **3 007 kanji** | Table de recherche directe par numéro de frame Heisig. |
| `radicaux_liste.json` | 42 Ko | **322 radicaux** | Radicaux avec symbole unicode, nombre de traits, traduction, lecture Hiragana, et position traditionnelle. |
| `particules_grammaire.json` | 1,1 Mo | **504 entrées** | Base de données de grammaire/particules DOJG avec lectures, niveau JLPT, signification, explications et exemples d'usage. |
| `slang_japonais.json` | 470 Ko | **851 termes** | Slang japonais avec lectures, type grammatical, signification, exemple contextuel, notes et liens. |
| `dictionnaire_unilingue.json` | 20 Mo | **140 664 termes** | Lexique japonais propre extrait de Wiktionary JA (avec POS et définitions). |
| `composants_vers_kanji.json` | 72 Ko | 2 004 comp. | Inversion composant graphique → liste des kanji l'utilisant. |
| `wanikani_60_niveaux.json` | 23 Ko | 60 niveaux | Niveaux d'apprentissage WaniKani (1 à 60). |

---

## 5. Matrice de Correspondance Finale : Directives vs Données

| Directive README.md | Source(s) Disponible(s) | État |
| :--- | :--- | :---: |
| Dictionnaire 2136 Kanjis + métadonnées | `kanjiDatabase_kanjis.json` | 🟢 |
| Jukugo (2, 3, 4+ kanjis) | `kanjiDatabase_jukugo.json` + `jukugo.json` | 🟢 |
| Similitudes visuelles/sémantiques | `gemini-n1..n5.json` + `kanji-synonyms.json` | 🟢 |
| Catégorisation sémantique | `kanjiCategories.json` (1970 kanji, 33 sous-cat.) | 🟢 |
| Niveaux JLPT N5→N0 | `jlpt-n0..n5.json` + `kanjiLevels.json` | 🟢 |
| Niveaux WaniKani (SRS) | `wanikani_60_niveaux.json` | 🟢 |
| RTK / Heisig (ordre d'apprentissage) | `rtk_heisig_index.json` (3039 kanji) | 🟢 |
| **Fréquences Multi-Corpus Unifiées** | **`frequences_combinees.json`** (6449 kanji sur 5 corpus) | 🟢 |
| Composants graphiques | `composants_vers_kanji.json` + `composition.json` (6451 nœuds) | 🟢 |
| **KanjiTree / Constellation 3D** | **`composition.json`** (in/out) + `kanjilist.json` + `radicallist.json` | 🟢 |
| Reading hints / Prédiction de lecture | `readingHints.tsv` (861 indices) | 🟢 |
| Shinjitai / Kyūjitai (formes anciennes) | `jitai/` (旧字体↔新字体) + `mozc/` (variantes) | 🟢 |
| Onomatopées (par paires opposées) | `surasura/data.json` (1422 onomatopées) | 🟢 |
| Étymologies de mots composés | `複合語起源.tsv` (222+ étymologies) | 🟢 |
| Dictionnaire Slang & Argot | `slang_japonais.json` (851 termes complets) | 🟢 |
| Dictionnaire unilingue JP | `dictionnaire_unilingue.json` (140 664 termes propres) | 🟢 |
| **Particules & Grammaire JLPT (接続)** | **`grammarDic___AikiTanaka`** (DOJG + Edewakaru + Nihongo no Sensei + Nihongo Kyoushi : 3 000+ règles) | 🟢 |
| Reconnaissance d'écriture & SVG | `3002_Kanji.svg` + PDF architecture | 🟢 |

---

## 6. Architecture & Prochaines Étapes de Découpage du Code

1. **IndexedDB / Dexie.js Schema** :
   - Table `kanjis` : fusion de `kanjiDatabase_kanjis.json`, `kanjiCategories.json`, `kanjiLevels.json`, `rtk_heisig_index.json`, `wanikani_60_niveaux.json`, et `frequences_combinees.json`.
   - Table `grammar` : import de `grammarDic___AikiTanaka` (règles bunpou N5-N1, explications DOJG, formules de connexion 接続).
   - Table `kanji_graph` : import de `composition.json` (pour alimenter Three.js / Kanjiverse 3D).
   - Table `slang` : import de `slang_japonais.json`.
   - Table `onomatopoeia` : import de `surasura/data.json`.
2. **Moteur de Recherche Multi-Critières UI** :
   - Filtre combiné : Niveau JLPT + Catégorie sémantique + Code SKIP + Frame RTK + Fréquences multi-corpus + Polarité.
3. **Composant Kanjiverse 3D** :
   - Rendu Three.js / React Three Fiber fondé sur `composition.json` avec les nœuds colorés selon leur catégorie sémantique (`kanjiCategories.json`).
