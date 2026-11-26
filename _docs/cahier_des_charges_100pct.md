# Cahier des Charges — eJLPT vers 100 % (Décisions Verrouillées)

Document de référence issu du cadrage `/grill-me` (26 novembre 2026) alignant [README.md](../README.md), [index.html](../index.html) et [roadmapSeed.ts](../src/lib/roadmapSeed.ts).

---

## 1. Définition d'un « Item »

Un **item** est une unité pédagogique élémentaire issue des bases de données locales ([db.ts](../src/lib/db.ts)), consultable en fiche, suivie en SRS (`srsCards`), enregistrable en favoris (`bookmarks`) et tirée dans les quiz :

- **Kanji** (`kanjiDatabase_unified.json`, 3 042 entrées)
- **Mot / Jukugo** (`jukugo_unified.json`, 33 425 entrées)
- **Point de grammaire / Particule** (`grammar_unified.json`, 3 422 entrées)
- **Expression de Slang** (`slang_unified.json`, 851 entrées)
- **Onomatopée** (`onomatopoeia_unified.json`, 1 422 entrées)

Chaque item peut porter ses propres images via `images: Array<{ sheet: string; index: number; senseIndex?: number; source: 'cdn' | 'ai' }>` (plusieurs vignettes possibles pour les items polysémiques), réutilisées directement par les quiz.

---

## 2. Socle IA Résilient (Gemini)

- Variables d'environnement : `GEMINI_API_KEY` et `GEMINI_MODEL` (chaîne de modèles séparés par virgules, ex. `gemini-3.5-flash-lite,gemini-3.6-flash,gemini-3.1-pro-preview`).
- Retries exponentiels par modèle sur erreur transitoire (`429`, `500`, `502`, `503`, `504`, timeout, erreur réseau) puis bascule automatique sur le modèle suivant de la chaîne.
- Retour UI discret et sanitisé (`Serveur IA occupé, nouvel essai…`, `Bascule sur un modèle de secours…`, bouton **Réessayer** en cas d'échec total) — **aucune clé API, URL signée ni stack trace brute exposée**.
- **Reconnaissance vocale** (Yomikata Z & Tchat oral) : Web Speech API du navigateur en priorité, avec repli automatique sur **Gemini audio** lorsque le navigateur ne la supporte pas (ex. Firefox).

---

## 3. Pipeline Données & Sprites WebP

### Données linguistiques (2 étages)
1. **Étage 1 (open-data déterministe)** : scripts Python exploitant les bases libres citées dans le README (`JMdict/edict`, `KanjiVG`, `Kanjium`, `kanjiapi.dev`) pour remplir le schéma 38 champs des kanjis, le niveau `N0` des jukugo, les `strokeimage` SVG KanjiVG, les homonymes, `startingW`/`endingW`, thèmes, scripts (`hira`/`kata`/mixtes/romaji), affixes, `接続詞` et la fréquence normalisée `1–10`.
2. **Étage 2 (lots Gemini résumables)** : complétion par lots avec checkpoint sur disque des champs sémantiques absents des bases ouvertes (antonymes, synonymes manquants, dualisme `+/-`, `isKeigo`, `soto/uchi`, époque et fréquence annuelle du slang + cron annuel du 1er janvier, paires opposées d'onomatopées, pondération `%` des sens polysémiques).

### Images & Sprites WebP
1. **Routage local Simple vs Complexe** (0 appel IA) : catégories concrètes (animaux, couleurs, nourriture, objets, nature, corps, transports) → **Simple** ; concepts abstraits, suffixes (`達` *-tachi*), grammaire, particules, onomatopées, slang → **Complexe**.
2. **Items simples** : recherche CDN (Unsplash si clé configurée / Wikimedia Commons) → sélection directe du meilleur résultat **sans aucune analyse IA** (bascule en file IA uniquement si 0 résultat CDN).
3. **Items complexes** : recherche CDN → **l'IA analyse les résultats obtenus** ; si un candidat convient, téléchargement ; sinon l'IA ajoute un `generationPrompt` à la file persistante.
4. **Exécution par lots résumables** de la file de génération (sans erreur bloquante sur quota) → **compilation Pillow en feuilles sprites WebP** (`public/sprites/*.webp` + `manifest.json`).

---

## 4. Système Visuel 4 Canaux Simultanés & Kanjiverse

- **4 canaux affichés simultanément** (chacun activable/désactivable individuellement) :
  - **Couleur du texte** = Maîtrise SRS (4 paliers auto : *Jamais vu · En apprentissage · Consolidé · Maîtrisé*)
  - **Fond** = Fréquence d'usage normalisée (`1–10`)
  - **Soulignement** (style + couleur) = Type grammatical (`1dan`/`5dan`, `自動/他動`, `adj i/na`, particule, `keigo`, `接続詞`, `soto/uchi`, `+/-`)
  - **Pastille** = Niveau JLPT (`N5`–`N1`, `N0`)
- **Kanjiverse** : reprise du code couleur par fréquence et de l'interface adaptative (*Débutant* vs *Avancé*) ; la constellation 3D existante dans `/tools` est conservée comme bonus.

---

## 5. Exercices, Quiz, Yomikata Z & 3 Collections Fusionnables

- **Portée des 3 collections** : réservée strictement aux **exercices de phrases et quiz** (pas aux textes, proverbes ou leçons) :
  1. `official` (**Socle**) : moteur de règles local + banque vérifiée `N5–N1`
  2. `ai_generated` (**Généré par IA**) : collection MongoDB auto-alimentée à chaque génération Gemini
  3. `community` (**Communauté**) : collection MongoDB auto-alimentée par les contributions utilisateurs (opt-in explicite + filtre anti-spam/insultes + modération admin)
  - Fusion configurable par session (1, 2 ou 3 sources combinées, dédupliquées par empreinte).
- **Yomikata Z** : phrase présentée selon le niveau configuré, mot cible coloré selon sa maîtrise SRS (4 paliers), réponse configurable (**QCM**, **clavier**, ou **oral**).

---

## 6. Lecteur, Vidéo, Todai, FAQ, Tchat & Périmètre Final

- **Lecteur & Vidéo** : import PDF/TXT/SRT/VTT, scripts libres de droits (aucun script commercial sous copyright embarqué), extraction par prompt IA, quiz généré depuis le texte, lecteur vidéo double mode (**fichier local MP4/WebM** + **YouTube intégré**) synchronisé avec `.srt`/`.vtt`.
- **Todai Japan** : combinaison **flux RSS presse japonaise réels (NHK / NHK Easy)** classés par niveau JLPT + **adaptation quotidienne par Gemini** cachée en MongoDB pour couvrir chaque niveau `N5–N1` (1 seule génération/jour partagée).
- **FAQ publique AI-enhanced** : 100 % publique, anti-doublons IA avant réponse, anonyme autorisé pour poser/commenter/compléter (avec modération automatique), compte Clerk requis pour voter « utile » et gérer ses fils, modération admin.
- **Tchat oral** : **IA uniquement** borné par niveau JLPT et thème + générateur de sujets de discussion (**volet tchat avec un natif abandonné**).
- **Outils `/tools`** : ajout de la table de conjugaison, récap politesse, `おすすめのリンクス`, todo list co-écrite avec IA (**outil « Map » retiré/abandonné**).
- **Tout le reste du README** (leçons progressives JA Sensei, textes/proverbes/chansons par cœur, scénarios gairaigo, définitions JA, guides clavier Linux/Win/iOS) est conservé dans l'objectif 100 %.
