# Plan d'Implémentation Étape par Étape - eJLPT

> **Localisation du document** : `_docs/implementation_plan.md`  
> **Statut global** : Phase 1 Finalisée | Phase 2 en cours d'initialisation  
> **Architecture** : Next.js 14+ (App Router), Local-First (Dexie.js / IndexedDB), Tailwind CSS / Vanilla CSS, FlexSearch, MongoDB Atlas (Sync Async).

---

## 📊 Tableau de Bord d'Avancement des Phases

| Phase | Description | Statut | Progression |
| :--- | :--- | :---: | :---: |
| **Phase 1** | **Ingestion, Méta-Schéma & Hydratation Local-First** | ✅ Finalisé | 100% |
| **Phase 2** | **Dictionnaire Augmenté, Filtres Multi-Critères & Vues Linguistiques** | 🟦 En Cours | 25% |
| **Phase 3** | **Moteur d'Exercices, Quizz Gamifiés & Répétition Spacée (SRS)** | 🟨 À Venir | 0% |
| **Phase 4** | **Marque-pages, Carnet d'Étude & Sync Worker (Offline-First)** | 🟨 À Venir | 0% |
| **Phase 5** | **Audio Choukai, Text-to-List & Modules Avancés (AI Enhanced)** | 🟨 À Venir | 0% |

---

## 🚀 Détail Exhaustif des Phases & Tâches

### Phase 1 : Architecture Local-First & Ingestion de Données (✅ COMPLÉTÉE)

- [x] **1.1. Unification de la Source de Vérité (`kanjiDatabase_unified.json`)**
  - Fusion exhaustive des 3 039 kanjis (Jōyō + RTK + Jinmeiyō).
  - Adoption du méta-schéma compact `{ description, total_count, schema: { key: typeof }, data: any[][] }` (gain de 70% d'espace).
  - Mappage des 214 radicaux Kangxi Unicode (U+2F00..U+2FDF) à 100%.
  - Normalisation des niveaux JLPT (`"N5"` à `"N1"`, et `"N0"` pour hors-JLPT).

- [x] **1.2. Architecture Dexie.js (`src/lib/db.ts`)**
  - Interfaces TypeScript rigoureuses pour `UnifiedKanjiRecord` (41 champs), `GrammarRecord`, `SlangRecord`, `AttemptRecord`, `BookmarkRecord`, `SyncQueueRecord`.
  - Schéma d'indexation Dexie v2 créé.

- [x] **1.3. Pipeline d'Auto-Hydratation (`DatabaseSeeder.tsx`)**
  - Chargement automatique en arrière-plan sans blocage du thread principal UI.
  - Peuplement des tables IndexedDB `kanjis`, `grammar`, et `slang`.

---

### Phase 2 : Dictionnaire Augmenté, Filtres Multi-Critères & Vues Linguistiques (🟦 EN COURS)

- [ ] **2.1. Moteur de Recherche Plein-Texte Instantané**
  - [ ] Intégration de `FlexSearch` en mémoire pour des recherches multi-champs instantanées (< 5ms) sur Kanjis, lectures (On/Kun/Romaji), significations FR/EN et composants.
  - [ ] Composant de barre de recherche globale réutilisable dans le header (`HeaderSearch.tsx`).

- [ ] **2.2. Filtres Multi-Critères & Système de Navigation (`/kanji`, `/grammar`, `/slang`)**
  - [ ] Barre de filtrage avancée : Niveau JLPT (N5-N0), Nombre de traits, Radicaux Kangxi, Code SKIP.
  - [ ] Filtres sémantiques et grammaticaux : Verbes (*Godan/Ichidan*), Adjectifs (*i/na*), Keigo (*Sonkeigo/Kenshougo*), Transitif/Intransitif (*Jidoushi/Tadoushi*), Soto/Uchi.
  - [ ] Filtre par plages de fréquences multi-corpus (*Aozora, News, Twitter, Wikipedia, Light Novels*).

- [ ] **2.3. Fiche Détaillée du Kanji & Dictionnaire Augmenté**
  - [ ] Panneau/Modal de détails d'un Kanji :
    - Affichage des lectures (On/Kun/Nanori), Furigana interactif, et significations FR/EN.
    - Ordre des traits et prévisualisation SVG.
    - Mots composés exhaustifs (*Jukugo* commençant ou se terminant par le kanji).
    - Métriques d'entropie et de fréquence multi-corpus.
  - [ ] **Sélecteur de Typographie** : Permettre au user de changer la police d'affichage (*Gothic/Sans, Mincho/Serif, Calligraphie*).
  - [ ] **Option Formes Anciennes & Classifications** : Toggle pour afficher les formes anciennes (*Kyuujitai* vs *Shinjitai*) et la classification administrative (*Jōyō, Jinmeiyō, Hors-liste*).

- [ ] **2.4. Arbre Généalogique Dynamique (`CascadingKanjiTree.tsx`)**
  - [ ] Rendu dynamique basé sur `composition.json`.
  - [ ] Navigation interactive dans les composants et sous-composants visuels du Kanji.

---

### Phase 3 : Moteur d'Exercices, Quizz Interactifs & Système SRS (🟨 À VENIR)

- [ ] **3.1. Quizz Kanji & Vocabulaire**
  - [ ] Quizz QCM (Kanji ↔ Signification / Lecture / Image / Audio).
  - [ ] Quizz Intrus & Paires : Trouver l'intrus ou associer les ensembles (*Synonymes, Homonymes, Antonymes*).
  - [ ] Quizz Jukugo : Assemblage de kanjis pour former des mots de 2, 3, ou 4+ kanjis.

- [ ] **3.2. Quizz Grammaire, Particules & Transformations**
  - [ ] Exercices de particules à trous avec affichage visuel des règles de priorité.
  - [ ] Visualisation des types de connexions grammaticales (`N + 文型`, `V futsuu + 文型`).
  - [ ] Exercices de transformation de phrases : Politesse (*Futsuugo ↔ Sonkeigo / Kenshougo*), Ukemikei, Formes conditionnelles et impératives.

- [ ] **3.3. Algorithme de Répétition Spacée (SRS)**
  - [ ] Enregistrement local des résultats dans la table Dexie `attempts`.
  - [ ] Algorithme d'espacement (SuperMemo-2 / Leitner) réinjectant automatiquement les erreurs récentes dans les prochaines sessions d'exercice.

---

### Phase 4 : Marque-pages, Carnet d'Étude & Sync Worker (🟨 À VENIR)

- [ ] **4.1. Système de Marque-pages & Notes Personnalisées**
  - [ ] Marquer des Kanjis, mots de vocabulaire ou règles de grammaire.
  - [ ] Organisation par dossiers/étiquettes personnalisés dans un carnet d'étude dédié.

- [ ] **4.2. Worker de Synchronisation Offline-First (`syncQueue`)**
  - [ ] File d'attente locale `syncQueue` enregistrant les actions offline (`attempt_created`, `bookmark_added`, `bookmark_removed`).
  - [ ] Background Sync Worker envoyant automatiquement les données vers l'API MongoDB Atlas dès le rétablissement de la connexion.

---

### Phase 5 : Audio Choukai, Text-to-List & Modules Avancés (🟨 À VENIR)

- [ ] **5.1. Module Audio & Choukai (Compréhension Orale)**
  - [ ] Exercices d'écoute type JLPT avec lecteur audio, questions à choix multiples et script synchronisé.
  - [ ] Furigana interactif (Toujours / Au survol / Désactivé).

- [ ] **5.2. Analyseur de Texte & Sous-titres ("Script 2 List")**
  - [ ] Importation de sous-titres de mangas/animés, fichiers PDF ou articles de presse.
  - [ ] Extraction automatique du vocabulaire et génération de statistiques par niveau JLPT.

- [ ] **5.3. FAQ AI-Enhanced & Tutorat Interactif**
  - [ ] Module de questions/réponses structuré par catégories (Grammaire, Keigo, Nuances).
  - [ ] Assistant virtuel pour pratiquer l'oral/écrit sur des scénarios cadrés par niveau JLPT.

---

## 🛠️ Prochaine Action Immédiate (Feu de Signalement)

Pour entamer la **Phase 2**, nous allons implémenter le **Moteur de Recherche Plein-Texte et la Fiche Détaillée des Kanjis avec Sélecteur de Typographie et Option Kyuujitai/Shinjitai**.
