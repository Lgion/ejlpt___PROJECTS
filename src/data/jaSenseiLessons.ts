export interface JaSenseiLesson {
  id: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  order: number;
  title: string;
  summaryFr: string;
  objectivesFr: string[];
  grammarPoints: Array<{ pattern: string; connection: string; explanationFr: string }>;
  vocab: Array<{ word: string; reading: string; meaningFr: string }>;
  dialogue: Array<{ speaker: string; jp: string; reading: string; fr: string }>;
  readingText: string;
  checkQuiz: Array<{
    prompt: string;
    options: string[];
    correctIndex: number;
    explanationFr: string;
  }>;
}

export const JA_SENSEI_LESSONS: JaSenseiLesson[] = [
  {
    id: 'ls_n5_1',
    level: 'N5',
    order: 1,
    title: 'Leçon 1 : Se présenter & phrase nominale (〜は〜です)',
    summaryFr: 'Maîtriser la structure thème は + attribut です, la particule も et la question か.',
    objectivesFr: [
      'Construire une présentation simple en style poli 丁寧語.',
      'Distinguer は (thème) et の (appartenance / lien nominal).',
    ],
    grammarPoints: [
      {
        pattern: 'A は B です',
        connection: 'Nom A + は + Nom B + です',
        explanationFr: 'Pose A comme thème et affirme poliment qu’il est B.',
      },
      {
        pattern: 'A の B',
        connection: 'Nom A + の + Nom B',
        explanationFr: 'Relie A (possesseur ou qualificatif) à B (objet principal).',
      },
    ],
    vocab: [
      { word: '私', reading: 'わたし', meaningFr: 'je / moi' },
      { word: '学生', reading: 'がくせい', meaningFr: 'étudiant' },
      { word: '先生', reading: 'せんせい', meaningFr: 'professeur' },
      { word: '日本語', reading: 'にほんご', meaningFr: 'langue japonaise' },
    ],
    dialogue: [
      { speaker: 'ケンジ', jp: 'はじめまして。私はケンジです。', reading: 'はじめまして。わたしは けんじです。', fr: 'Enchanté. Je suis Kenji.' },
      { speaker: 'マリア', jp: 'マリアです。大学の学生です。', reading: 'まりあです。だいがくの がくせいです。', fr: 'Je suis Maria. Je suis étudiante à l’université.' },
    ],
    readingText: '私はフランスの学生です。毎日日本語を勉強します。田中先生は優しいです。',
    checkQuiz: [
      {
        prompt: 'Comment traduire « étudiant de l’université de Tokyo » ?',
        options: ['東京大学のがくせい', '東京大学はがくせい', '東京大学をがくせい', '東京大学にかい'],
        correctIndex: 0,
        explanationFr: 'La particule の relie deux noms (université de Tokyo → étudiant).',
      },
    ],
  },
  {
    id: 'ls_n5_2',
    level: 'N5',
    order: 2,
    title: 'Leçon 2 : Actions quotidiennes, lieux (で / へ) & heures',
    summaryFr: 'Exprimer ses déplacements avec へ/に et localiser une action avec で.',
    objectivesFr: [
      'Différencier に (destination/point fixe) et で (lieu où se déroule l’action).',
      'Conjuguer les verbes en 〜ます et 〜ません.',
    ],
    grammarPoints: [
      {
        pattern: 'Lieu で Vます',
        connection: 'Nom (lieu) + で + Verbe d’action',
        explanationFr: 'Indique le cadre où l’on accomplit une action active (lire, manger, travailler).',
      },
      {
        pattern: 'Heure に Vます',
        connection: 'Nombre + 時/分 + に + Verbe',
        explanationFr: 'Marque l’instant précis d’un événement (pas après 毎日 / 今日).',
      },
    ],
    vocab: [
      { word: '駅', reading: 'えき', meaningFr: 'gare' },
      { word: '図書館', reading: 'としょかん', meaningFr: 'bibliothèque' },
      { word: '毎日', reading: 'まいにち', meaningFr: 'tous les jours' },
      { word: '行く', reading: 'いく', meaningFr: 'aller' },
    ],
    dialogue: [
      { speaker: 'A', jp: '何時に家を出ますか。', reading: 'なんじに いえを でますか。', fr: 'À quelle heure sortez-vous de chez vous ?' },
      { speaker: 'B', jp: '八時に駅へ行きます。図書館で本を読みます。', reading: 'はちじに えきへ いきます。としょかんで ほんを よみます。', fr: 'Je vais à la gare à 8 h. Je lis un livre à la bibliothèque.' },
    ],
    readingText: '毎朝七時に起きます。パンを食べて、八時に学校へ行きます。',
    checkQuiz: [
      {
        prompt: 'Quelle particule convient dans « 図書館（　）勉強します » ?',
        options: ['で', 'へ', 'を', 'か'],
        correctIndex: 0,
        explanationFr: '勉強します est une action active dans un lieu → particule で.',
      },
    ],
  },
  {
    id: 'ls_n4_1',
    level: 'N4',
    order: 3,
    title: 'Leçon 3 : Demandes polies, permissions & prévisions (〜ておく)',
    summaryFr: 'Enchaîner avec la forme en て pour demander, autoriser ou préparer à l’avance.',
    objectivesFr: [
      'Former la base en て des verbes Godan et Ichidan.',
      'Employer 〜ておく (à l’avance) et 〜てもいいです (permission).',
    ],
    grammarPoints: [
      {
        pattern: '〜ておく',
        connection: 'Vて + おく',
        explanationFr: 'Exécute une action en prévision du futur (ex: 切符を買っておく).',
      },
      {
        pattern: '〜てもいいですか',
        connection: 'Vて + もいいですか',
        explanationFr: 'Demande polie d’autorisation (« Puis-je… ? »).',
      },
    ],
    vocab: [
      { word: '準備', reading: 'じゅんび', meaningFr: 'préparation' },
      { word: '切符', reading: 'きっぷ', meaningFr: 'billet' },
      { word: '写真', reading: 'しゃしん', meaningFr: 'photo' },
    ],
    dialogue: [
      { speaker: '客', jp: 'ここで写真を撮ってもいいですか。', reading: 'ここで しゃしんを とっても いいですか。', fr: 'Puis-je prendre des photos ici ?' },
      { speaker: '係員', jp: 'はい、どうぞ。旅行の前にガイドを読んでおいてください。', reading: 'はい、どうぞ。りょこうの まえに がいどを よんでおいて ください。', fr: 'Oui, je vous en prie. Pensez à lire le guide avant le voyage.' },
    ],
    readingText: '来週のテストのために、今日のうちにノートをまとめておきます。',
    checkQuiz: [
      {
        prompt: 'Que signifie « 予習しておきます » ?',
        options: ['Je révise/prépare le cours à l’avance', 'J’essaie de préparer', 'Je regrette d’avoir préparé', 'Je viens de finir'],
        correctIndex: 0,
        explanationFr: '〜ておく exprime une action effectuée par anticipation.',
      },
    ],
  },
  {
    id: 'ls_n4_2',
    level: 'N4',
    order: 4,
    title: 'Leçon 4 : Passif (Ukemikei) & Paires 自動詞 / 他動詞',
    summaryFr: 'Distinguer l’action subie (〜に〜られる) de l’état intransitif (が).',
    objectivesFr: [
      'Conjuguer le passif Godan (-aれる) et Ichidan (-られる).',
      'Choisir entre ドアが開く et ドアを開ける.',
    ],
    grammarPoints: [
      {
        pattern: 'A は B に Vられる',
        connection: 'Victime/Sujet は + Agent に + V受身',
        explanationFr: 'Passif direct ou subi (ex: 雨に降られる = se faire surprendre par la pluie).',
      },
    ],
    vocab: [
      { word: '褒める', reading: 'ほめる', meaningFr: 'féliciter' },
      { word: '閉まる', reading: 'しまる', meaningFr: 'se fermer (自動)' },
      { word: '閉める', reading: 'しめる', meaningFr: 'fermer qqch (他動)' },
    ],
    dialogue: [
      { speaker: 'サトシ', jp: '昨日、雨に降られて大変だったよ。', reading: 'きのう、あめに ふられて たいへんだったよ。', fr: 'Hier j’ai subi la pluie, quelle galère !' },
    ],
    readingText: '電車のドアが閉まります。先生に褒められて嬉しかった。',
    checkQuiz: [
      {
        prompt: 'Comment conjuguer 叱る (しかる, godan) au passif ?',
        options: ['叱られる', '叱れる', '叱させる', '叱るれる'],
        correctIndex: 0,
        explanationFr: 'Godan en -る → base en -a (ら) + れる = 叱られる.',
      },
    ],
  },
  {
    id: 'ls_n3_1',
    level: 'N3',
    order: 5,
    title: 'Leçon 5 : Cause positive/négative (おかげで / せいで) & Efforts (ように)',
    summaryFr: 'Exprimer la nuance affective de la causalité et l’habitude progressive.',
    objectivesFr: [
      'Opposer おかげで (reconnaissance +) et せいで (reproche −).',
      'Employer ようにする (s’efforcer de) et ようになる (devenir capable de).',
    ],
    grammarPoints: [
      {
        pattern: '〜おかげで / 〜せいで',
        connection: 'V普通形 / いA / なAな / Nの + おかげで・せいで',
        explanationFr: 'おかげで attribue un résultat positif ; せいで impute un résultat fâcheux.',
      },
      {
        pattern: '〜ようにする',
        connection: 'V辞書形 / Vない + ようにする',
        explanationFr: 'Indique une discipline personnelle ou un effort conscient répété.',
      },
    ],
    vocab: [
      { word: '感謝', reading: 'かんしゃ', meaningFr: 'gratitude' },
      { word: '解決', reading: 'かいけつ', meaningFr: 'résolution' },
      { word: '努力', reading: 'どりょく', meaningFr: 'effort' },
    ],
    dialogue: [
      { speaker: 'ユキ', jp: '先輩のおかげで、仕事に慣れることができました。', reading: 'せんぱいの おかげで、しごとに なれることが できました。', fr: 'Grâce à mon aînée, j’ai pu m’habituer au travail.' },
    ],
    readingText: '毎日少しずつ音読するようにした結果、日本語が自然に読めるようになった。',
    checkQuiz: [
      {
        prompt: 'Complétez : « 台風の（　）、電車が止まった。 »',
        options: ['せいで', 'おかげで', 'ように', 'ために'],
        correctIndex: 0,
        explanationFr: 'Un train bloqué par un typhon est un résultat négatif → せいで.',
      },
    ],
  },
  {
    id: 'ls_n3_2',
    level: 'N3',
    order: 6,
    title: 'Leçon 6 : Keigo professionnel & Axe Soto / Uchi',
    summaryFr: 'Maîtriser les échanges professionnels entre 尊敬語 et 謙譲語.',
    objectivesFr: [
      'Différencier いらっしゃる (尊敬) et まいる / うかがう (謙譲).',
      'Appliquer la règle Soto/Uchi face aux clients.',
    ],
    grammarPoints: [
      {
        pattern: 'お + Vます + いただけますか',
        connection: 'お + racine Vます + いただけますか',
        explanationFr: 'Formule de requête très polie (« Auriez-vous l’obligeance de… »).',
      },
    ],
    vocab: [
      { word: '恐縮', reading: 'きょうしゅく', meaningFr: 'être confus / navré (formel)' },
      { word: '拝見', reading: 'はいけん', meaningFr: 'consulter humblement' },
      { word: '承知', reading: 'しょうち', meaningFr: 'accord / bien reçu' },
    ],
    dialogue: [
      { speaker: '社員', jp: 'お送りいただいた資料を拝見いたしました。', reading: 'おおくり いただいた しりょうを はいけん いたしました。', fr: 'J’ai bien consulté les documents que vous nous avez envoyés.' },
    ],
    readingText: '恐れ入りますが、こちらの書類をご確認いただけますでしょうか。承知いたしました。',
    checkQuiz: [
      {
        prompt: 'Quel verbe est le 謙譲語 (humble) de 見る (« regarder / lire un doc client ») ?',
        options: ['拝見する', 'ご覧になる', '召し上がる', 'おっしゃる'],
        correctIndex: 0,
        explanationFr: '拝見する = humble (謙譲語) ; ご覧になる = honorifique (尊敬語).',
      },
    ],
  },
  {
    id: 'ls_n2_1',
    level: 'N2',
    order: 7,
    title: 'Leçon 7 : Nuances d’évolution & opposition formelle (につれて / にもかかわらず)',
    summaryFr: 'Rédiger et comprendre des textes analytiques avec des connecteurs N2 précis.',
    objectivesFr: [
      'Exprimer une corrélation graduelle avec V辞書形 + につれて.',
      'Marquer une concession forte avec にもかかわらず.',
    ],
    grammarPoints: [
      {
        pattern: '〜につれて',
        connection: 'V辞書形 / N + につれて',
        explanationFr: '« À mesure que X progresse, Y change parallèlement ».',
      },
      {
        pattern: '〜にもかかわらず',
        connection: 'V普通形 / N / なA + にもかかわらず',
        explanationFr: 'Équivalent écrit soutenu de 〜のに (« en dépit de »).',
      },
    ],
    vocab: [
      { word: '傾向', reading: 'けいこう', meaningFr: 'tendance' },
      { word: '普及', reading: 'ふきゅう', meaningFr: 'diffusion généralisée' },
      { word: '影響', reading: 'えいきょう', meaningFr: 'influence / impact' },
    ],
    dialogue: [
      { speaker: 'アナウンサー', jp: '技術が発展するにつれて、生活様式も急速に変化しています。', reading: 'ぎじゅつが はってんするに つれて、せいかつようしきも きゅうそくに へんかしています。', fr: 'À mesure que la technologie progresse, les modes de vie évoluent rapidement.' },
    ],
    readingText: '厳しい条件にもかかわらず、多くの学生が挑戦を続けている。経験が増えるにつれて自信も深まる。',
    checkQuiz: [
      {
        prompt: 'Quelle connexion précède にもかかわらず ?',
        options: ['Forme neutre (普通形)', 'Uniquement Vます', 'Uniquement Vて', 'Impératif'],
        correctIndex: 0,
        explanationFr: 'V普通形 / いA / なA(である) / N + にもかかわらず.',
      },
    ],
  },
  {
    id: 'ls_n2_2',
    level: 'N2',
    order: 8,
    title: 'Leçon 8 : Jugements contraints & contrastes (せざるを得ない / 一方で)',
    summaryFr: 'Maîtriser les tournures journalistiques et argumentatives du JLPT N2.',
    objectivesFr: [
      'Utiliser 〜ざるを得ない (« ne pas avoir d’autre choix que de »).',
      'Balancer deux aspects d’un phénomène avec 〜一方で.',
    ],
    grammarPoints: [
      {
        pattern: '〜ざるを得ない',
        connection: 'Vない (retirer ない) + ざるを得ない (する → せざるを得ない)',
        explanationFr: 'Exprime une décision inévitable dictée par les circonstances.',
      },
    ],
    vocab: [
      { word: '延期', reading: 'えんき', meaningFr: 'ajournement / report' },
      { word: '検討', reading: 'けんとう', meaningFr: 'examen approfondi' },
      { word: '対策', reading: 'たいさく', meaningFr: 'contre-mesure' },
    ],
    dialogue: [
      { speaker: '担当者', jp: '予算削減のため、計画を見直さざるを得ません。', reading: 'よさんさくげんの ため、けいかくを みなおさざるを えません。', fr: 'En raison des coupes budgétaires, nous sommes contraints de revoir le plan.' },
    ],
    readingText: 'オンライン授業は便利な一方で、対面での交流が減るという課題もあり、新たな対策を検討せざるを得ない。',
    checkQuiz: [
      {
        prompt: 'Comment combiner する avec 〜ざるを得ない ?',
        options: ['せざるを得ない', 'しないざるを得ない', 'しざるを得ない', 'すざるを得ない'],
        correctIndex: 0,
        explanationFr: 'Exception classique : する → せざるを得ない.',
      },
    ],
  },
  {
    id: 'ls_n1_1',
    level: 'N1',
    order: 9,
    title: 'Leçon 9 : Connecteurs rhétoriques N1 (なくして / にほかならない)',
    summaryFr: 'Comprendre la prose argumentative avancée et l’expression de l’essence ou de la condition sine qua non.',
    objectivesFr: [
      'Construire des hypothèses fortes avec N + なくして.',
      'Affirmer une cause unique avec 〜にほかならない.',
    ],
    grammarPoints: [
      {
        pattern: '〜なくして（は）',
        connection: 'Nom + なくして + négation/impossibilité',
        explanationFr: '« Sans X, Y ne saurait exister » (registre soutenu).',
      },
      {
        pattern: '〜にほかならない',
        connection: 'V普通形 / N + にほかならない',
        explanationFr: '« Ce n’est rien d’autre que… » (affirmation emphatique).',
      },
    ],
    vocab: [
      { word: '功績', reading: 'こうせき', meaningFr: 'haut fait / mérite' },
      { word: '信頼', reading: 'しんらい', meaningFr: 'confiance' },
      { word: '不可欠', reading: 'ふかけつ', meaningFr: 'indispensable' },
    ],
    dialogue: [
      { speaker: '論説委員', jp: '成功は地道な努力の積み重ねにほかなりません。', reading: 'せいこうは じみちな どりょくの つみかさねに ほか なりません。', fr: 'Le succès n’est rien d’autre que l’accumulation d’efforts patients.' },
    ],
    readingText: '市民の信頼なくして改革の実現はあり得ない。情報公開の徹底こそが透明性向上への第一歩にほかならない。',
    checkQuiz: [
      {
        prompt: 'Que nuance exprime « AはBにほかならない » ?',
        options: ['A n’est rien d’autre que B', 'A est sans rapport avec B', 'A précède B', 'A dépend de la météo'],
        correctIndex: 0,
        explanationFr: 'にほかならない affirme avec force que X est précisément la cause ou l’essence B.',
      },
    ],
  },
  {
    id: 'ls_n1_2',
    level: 'N1',
    order: 10,
    title: 'Leçon 10 : Engagement formel & finalité classique (からには / べく)',
    summaryFr: 'Maîtriser les nuances littéraires et juridiques fréquentes en lecture JLPT N1.',
    objectivesFr: [
      'Distinguer V辞書形 + べく (« afin de ») et Vた + からには (« dès lors que »).',
    ],
    grammarPoints: [
      {
        pattern: '〜べく',
        connection: 'V辞書形 (する → すべく / するべく) + べく',
        explanationFr: 'Exprime un but réfléchi en registre écrit/soutenu.',
      },
    ],
    vocab: [
      { word: '真相', reading: 'しんそう', meaningFr: 'vérité des faits' },
      { word: '遂行', reading: 'すいこう', meaningFr: 'exécution / accomplissement' },
      { word: '覚悟', reading: 'かくご', meaningFr: 'résolution / détermination' },
    ],
    dialogue: [
      { speaker: '調査員', jp: '真相を究明すべく、関係資料を精査しています。', reading: 'しんそうを きゅうめいすべく、かんけいしりょうを せいさしています。', fr: 'Afin d’élucider la vérité, nous examinons minutieusement les archives.' },
    ],
    readingText: '大役を引き受けたからには、期待に応えるべく全力を尽くす覚悟である。',
    checkQuiz: [
      {
        prompt: 'Quel sens exprime Vた + からには ?',
        options: ['Dès lors que / puisqu’on s’est engagé à X…', 'Bien que X ait échoué', 'Au hasard de X', 'Juste après le dîner'],
        correctIndex: 0,
        explanationFr: 'からには exprime une conséquence logique de détermination ou de devoir moral.',
      },
    ],
  },
];
