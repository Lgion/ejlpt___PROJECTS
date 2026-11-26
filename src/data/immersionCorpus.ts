export interface MemorizeSentenceItem {
  id: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  jp: string;
  reading: string;
  pattern: string;
  literalFr: string;
  naturalFr: string;
  clozeWord: string;
}

export interface ShortStoryOrSong {
  id: string;
  kind: 'story' | 'fable' | 'song';
  level: 'N5' | 'N4' | 'N3' | 'N2';
  title: string;
  sourceNote: string;
  lines: Array<{ jp: string; reading: string; fr: string }>;
}

export const MEMORIZE_SENTENCES: MemorizeSentenceItem[] = [
  // N5
  {
    id: 'mem_n5_1',
    level: 'N5',
    jp: '図書館で日本語の本を読みます。',
    reading: 'としょかんで にほんごの ほんを よみます。',
    pattern: 'Lieu で + COD を + Vます',
    literalFr: 'À la bibliothèque, je lis un livre de japonais.',
    naturalFr: 'Je lis un livre japonais à la bibliothèque.',
    clozeWord: '図書館で',
  },
  {
    id: 'mem_n5_2',
    level: 'N5',
    jp: '電車に乗って、学校へ行きます。',
    reading: 'でんしゃに のって、がっこうへ いきます。',
    pattern: '〜てから / Vて enchaînement + へ',
    literalFr: 'En montant dans le train, je vais à l’école.',
    naturalFr: 'Je prends le train pour aller à l’école.',
    clozeWord: '乗って',
  },
  {
    id: 'mem_n5_3',
    level: 'N5',
    jp: '毎日七時間寝たいです。',
    reading: 'まいにち ななじかん ねたいです。',
    pattern: 'Vます + たい (désir)',
    literalFr: 'Chaque jour, sept heures, je veux dormir.',
    naturalFr: 'Je voudrais dormir sept heures par jour.',
    clozeWord: '寝たいです',
  },
  // N4
  {
    id: 'mem_n4_1',
    level: 'N4',
    jp: '日本へ行く前に、お金を換えておきます。',
    reading: 'にほんへ いくまえに、おかねを かえておきます。',
    pattern: 'V辞書形 + 前に / 〜ておく',
    literalFr: 'Avant d’aller au Japon, je change de l’argent à l’avance.',
    naturalFr: 'Je vais faire du change avant de partir au Japon.',
    clozeWord: '換えておきます',
  },
  {
    id: 'mem_n4_2',
    level: 'N4',
    jp: '雨が降っているのに、外で遊んでいます。',
    reading: 'あめが ふっているのに、そとで あそんでいます。',
    pattern: '〜のに (opposition surprenante)',
    literalFr: 'Bien qu’il pleuve, ils jouent dehors.',
    naturalFr: 'Ils jouent dehors alors qu’il pleut.',
    clozeWord: 'のに',
  },
  {
    id: 'mem_n4_3',
    level: 'N4',
    jp: '先生に褒められて、とても嬉しかったです。',
    reading: 'せんせいに ほめられて、とても うれしかったです。',
    pattern: 'Agent に + V受身 (passif)',
    literalFr: 'Ayant été félicité par le professeur, j’étais très heureux.',
    naturalFr: 'Le professeur m’a félicité et cela m’a fait très plaisir.',
    clozeWord: '褒められて',
  },
  // N3
  {
    id: 'mem_n3_1',
    level: 'N3',
    jp: '健康のために、毎日歩くようにしています。',
    reading: 'けんこうの ために、まいにち あるくように しています。',
    pattern: 'V辞書形 + ようにする (effort habituel)',
    literalFr: 'Pour la santé, je fais en sorte de marcher chaque jour.',
    naturalFr: 'Je m’efforce de marcher tous les jours pour ma santé.',
    clozeWord: 'ようにしています',
  },
  {
    id: 'mem_n3_2',
    level: 'N3',
    jp: '彼女の説明のおかげで、問題がすぐ解決した。',
    reading: 'かのじょの せつめいの おかげで、もんだいが すぐ かいけつした。',
    pattern: 'N の + おかげで (cause positive)',
    literalFr: 'Grâce à son explication, le problème s’est vite résolu.',
    naturalFr: 'Grâce à ses explications, le problème a été résolu rapidement.',
    clozeWord: 'おかげで',
  },
  {
    id: 'mem_n3_3',
    level: 'N3',
    jp: 'どんなに難しくても、最後まで諦めないつもりだ。',
    reading: 'どんなに むずかしくても、さいごまで あきらめない つもりだ。',
    pattern: 'どんなに 〜ても + つもり',
    literalFr: 'Peu importe à quel point c’est difficile, j’ai l’intention de ne pas abandonner.',
    naturalFr: 'Quelle que soit la difficulté, je compte bien tenir jusqu’au bout.',
    clozeWord: '難しくても',
  },
  // N2
  {
    id: 'mem_n2_1',
    level: 'N2',
    jp: '努力したにもかかわらず、期待した結果が出なかった。',
    reading: 'どりょくしたに もかかわらず、きたいした けっかが でなかった。',
    pattern: '〜にもかかわらず (malgré)',
    literalFr: 'En dépit des efforts fournis, le résultat espéré n’est pas sorti.',
    naturalFr: 'Malgré nos efforts, nous n’avons pas obtenu le résultat attendu.',
    clozeWord: 'にもかかわらず',
  },
  {
    id: 'mem_n2_2',
    level: 'N2',
    jp: '練習を重ねるにつれて、発音が自然になってきた。',
    reading: 'れんしゅうを かさねるに つれて、はつおんが しぜんに なってきた。',
    pattern: 'V辞書形 + につれて (évolution parallèle)',
    literalFr: 'À mesure que j’accumule la pratique, la prononciation devient naturelle.',
    naturalFr: 'Plus je m’entraîne, plus ma prononciation devient naturelle.',
    clozeWord: 'につれて',
  },
  {
    id: 'mem_n2_3',
    level: 'N2',
    jp: 'この計画については、時間をかけて検討せざるを得ない。',
    reading: 'この けいかくに ついては、じかんを かけて けんとうせざるをえない。',
    pattern: '〜ざるを得ない (contrainte incontournable)',
    literalFr: 'Concernant ce projet, nous ne pouvons faire autrement que l’examiner longuement.',
    naturalFr: 'Nous sommes contraints d’étudier ce projet en détail.',
    clozeWord: 'せざるを得ない',
  },
  // N1
  {
    id: 'mem_n1_1',
    level: 'N1',
    jp: '彼の功績なくして、今回の成功はあり得なかっただろう。',
    reading: 'かれの こうせきなくして、こんかいの せいこうは ありえなかっただろう。',
    pattern: 'N + なくして (sans X, Y est impossible)',
    literalFr: 'Sans ses mérites, ce succès actuel n’aurait pu exister.',
    naturalFr: 'Sans son apport décisif, cette réussite aurait été impensable.',
    clozeWord: 'なくして',
  },
  {
    id: 'mem_n1_2',
    level: 'N1',
    jp: '事実を正確に伝えるべく、現地へ赴いた。',
    reading: 'じじつを せいかくに つたえるべく、げんちへ おもむいた。',
    pattern: 'V辞書形 + べく (dans le but formel de)',
    literalFr: 'Afin de transmettre exactement les faits, il se rendit sur place.',
    naturalFr: 'Il s’est rendu sur place afin de relater fidèlement les faits.',
    clozeWord: 'べく',
  },
  {
    id: 'mem_n1_3',
    level: 'N1',
    jp: '一度引き受けたからには、責任を持ってやり遂げる。',
    reading: 'いちど ひきうけたからには、せきにんを もって やりとげる。',
    pattern: 'Vた + からには (à partir du moment où…)',
    literalFr: 'Dès lors que j’ai accepté une fois, j’irai jusqu’au bout avec responsabilité.',
    naturalFr: 'Puisque je m’y suis engagé, j’irai jusqu’au bout de manière responsable.',
    clozeWord: 'からには',
  },
];

export const SHORT_STORIES_AND_SONGS: ShortStoryOrSong[] = [
  {
    id: 'song_sakura',
    kind: 'song',
    level: 'N5',
    title: 'さくらさくら (Chant traditionnel)',
    sourceNote: 'Domaine public — Chant folklorique d’Edo',
    lines: [
      { jp: 'さくら さくら 野山も里も 見渡す限り', reading: 'さくら さくら のやまも さとも みわたす かぎり', fr: 'Cerisiers en fleurs, par monts et villages, à perte de vue' },
      { jp: 'かすみか雲か 朝日ににおう', reading: 'かすみか くもか あさひに におう', fr: 'Brume ou nuages, scintillant dans le soleil levant' },
      { jp: 'さくら さくら いざや いざや 見に行かん', reading: 'さくら さくら いざや いざや みにゆかん', fr: 'Cerisiers en fleurs, allons-y donc les contempler !' },
    ],
  },
  {
    id: 'song_kaeru',
    kind: 'song',
    level: 'N5',
    title: 'かえるの合唱 (Comptine des grenouilles)',
    sourceNote: 'Chanson enfantine libre de droits — idéal rythme & onomatopées',
    lines: [
      { jp: 'かえるのうたが 聞こえてくるよ', reading: 'かえるの うたが きこえて くるよ', fr: 'On entend venir le chant des grenouilles' },
      { jp: 'クワ クワ クワ クワ', reading: 'くわ くわ くわ くわ', fr: 'Coâ, coâ, coâ, coâ' },
      { jp: 'ケケケケ ケケケケ クワ クワ クワ', reading: 'けけけけ けけけけ くわ くわ くわ', fr: 'Ké-ké-ké, coâ coâ coâ !' },
    ],
  },
  {
    id: 'fable_usagi',
    kind: 'fable',
    level: 'N4',
    title: 'うさぎとかめ (Le Lièvre et la Tortue)',
    sourceNote: 'Fable classique en japonais simplifié',
    lines: [
      { jp: '足の速いうさぎは、ゆっくり歩くかめを笑いました。', reading: 'あしの はやい うさぎは、ゆっくり あるく かめを わらいました。', fr: 'Le lièvre rapide se moqua de la tortue qui marchait lentement.' },
      { jp: '競争が始まると、うさぎは途中で昼寝をしてしまいました。', reading: 'きょうそうが はじまると、うさぎは とちゅうで ひるねを してしまいました。', fr: 'La course commencée, le lièvre fit malheureusement une sieste en chemin.' },
      { jp: 'かめは休まずに歩き続け、ついに一番でゴールに着きました。', reading: 'かめは やすまずに あるきつづけ、ついに いちばんで ごーるに つきました。', fr: 'La tortue continua sans pause et franchit finalement la ligne d’arrivée la première.' },
    ],
  },
  {
    id: 'story_kissa',
    kind: 'story',
    level: 'N3',
    title: '雨の日の喫茶店 (Micro-récit à Kyōto)',
    sourceNote: 'Histoire courte originale eJLPT',
    lines: [
      { jp: '小雨が降る午後、古い商店街の角にある小さな喫茶店に入った。', reading: 'こさめが ふる ごご、ふるい しょうてんがいの かどに ある ちいさな きっさてんに はいった。', fr: 'Un après-midi de bruine, je suis entré dans un petit café au coin d’une galerie commerçante ancienne.' },
      { jp: '店内にはジャズが静かに流れ、挽きたてのコーヒーの香りが広がっていた。', reading: 'てんないには じゃずが しずかに ながれ、ひきたての こーひーの かおりが ひろがっていた。', fr: 'Un jazz doux résonnait à l’intérieur et l’arôme du café fraîchement moulu emplissait la pièce.' },
      { jp: '窓の外を眺めながら一冊の本を読み終えた頃には、雨はすっかり上がっていた。', reading: 'まどの そとを ながめながら いっさつの ほんを よみおえた ころには、あめは すっかり あがっていた。', fr: 'Lorsque j’eus fini mon livre tout en observant la rue, la pluie avait complètement cessé.' },
    ],
  },
];
