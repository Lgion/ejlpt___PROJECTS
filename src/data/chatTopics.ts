export interface ChatDiscussionTopic {
  id: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  titleFr: string;
  titleJa: string;
  starterJa: string;
  starterReading: string;
  starterFr: string;
  vocabField: Array<{ word: string; reading: string; meaningFr: string }>;
  grammarPatterns: string[];
  exampleSentences: string[];
}

export const CHAT_DISCUSSION_TOPICS: ChatDiscussionTopic[] = [
  {
    id: 'chat_n5_cafe',
    level: 'N5',
    titleFr: 'Commander au café ou restaurant',
    titleJa: 'カフェで注文する',
    starterJa: 'いらっしゃいませ！ご注文はお決まりですか。',
    starterReading: 'いらっしゃいませ！ごちゅうもんは おきまりですか。',
    starterFr: 'Bienvenue ! Avez-vous choisi votre commande ?',
    vocabField: [
      { word: 'コーヒー', reading: 'こーひー', meaningFr: 'café' },
      { word: '紅茶', reading: 'こうちゃ', meaningFr: 'thé noir' },
      { word: '一つ', reading: 'ひとつ', meaningFr: 'un (objet)' },
    ],
    grammarPatterns: ['〜を ください', '〜は いくらですか', 'ここで 食べます'],
    exampleSentences: ['ホットコーヒーを一つください。', 'これはいくらですか。'],
  },
  {
    id: 'chat_n5_hobby',
    level: 'N5',
    titleFr: 'Parler de ses loisirs et du week-end',
    titleJa: '趣味と週末の予定',
    starterJa: '週末はいつも何をしますか。趣味は何ですか。',
    starterReading: 'しゅうまつは いつも なにを しますか。しゅみは なんですか。',
    starterFr: 'Que faites-vous d’habitude le week-end ? Quels sont vos loisirs ?',
    vocabField: [
      { word: '映画', reading: 'えいが', meaningFr: 'film' },
      { word: '音楽', reading: 'おんがく', meaningFr: 'musique' },
      { word: '散歩', reading: 'さんぽ', meaningFr: 'promenade' },
    ],
    grammarPatterns: ['〜が 好きです', '〜たいです', '〜と 一緒に'],
    exampleSentences: ['日曜日によく公園を散歩します。', '日本の映画を見るのが好きです。'],
  },
  {
    id: 'chat_n4_trip',
    level: 'N4',
    titleFr: 'Préparer un voyage au Japon',
    titleJa: '日本旅行の計画',
    starterJa: '日本へ行ったら、どこに行ってみたいですか。',
    starterReading: 'にほんへ いったら、どこに いってみたいですか。',
    starterFr: 'Si vous allez au Japon, où aimeriez-vous aller ?',
    vocabField: [
      { word: '予約', reading: 'よやく', meaningFr: 'réservation' },
      { word: '新幹線', reading: 'しんかんせん', meaningFr: 'train à grande vitesse' },
      { word: '旅館', reading: 'りょかん', meaningFr: 'auberge traditionnelle' },
    ],
    grammarPatterns: ['〜てみたい', '〜たら', '〜ておく'],
    exampleSentences: ['京都の旅館に泊まってみたいです。', '切符を買っておきました。'],
  },
  {
    id: 'chat_n4_habit',
    level: 'N4',
    titleFr: 'Raconter sa routine d’apprentissage',
    titleJa: '毎日の勉強方法',
    starterJa: '毎日どうやって日本語を勉強していますか。',
    starterReading: 'まいにち どうやって にほんごを べんきょうして いますか。',
    starterFr: 'Comment étudiez-vous le japonais au quotidien ?',
    vocabField: [
      { word: '復習', reading: 'ふくしゅう', meaningFr: 'révision' },
      { word: '発音', reading: 'はつおん', meaningFr: 'prononciation' },
      { word: '慣れる', reading: 'なれる', meaningFr: 's’habituer' },
    ],
    grammarPatterns: ['〜ようにしている', '〜ことができる', '〜やすい'],
    exampleSentences: ['寝る前に単語を十個覚えるようにしています。'],
  },
  {
    id: 'chat_n3_work',
    level: 'N3',
    titleFr: 'Vie professionnelle & téléphone en Keigo',
    titleJa: '職場でのやり取り（敬語）',
    starterJa: 'お電話ありがとうございます。田中様でいらっしゃいますか。',
    starterReading: 'おでんわ ありがとうございます。たなかさまで いらっしゃいますか。',
    starterFr: 'Merci pour votre appel. Êtes-vous bien M./Mme Tanaka ?',
    vocabField: [
      { word: '確認', reading: 'かくにん', meaningFr: 'vérification' },
      { word: '書類', reading: 'しょるい', meaningFr: 'documents' },
      { word: '相談', reading: 'そうだん', meaningFr: 'consultation' },
    ],
    grammarPatterns: ['〜ていただけますか', 'お + Vます + する', '〜おかげで'],
    exampleSentences: ['来週の会議についてご相談したいのですが。'],
  },
  {
    id: 'chat_n3_culture',
    level: 'N3',
    titleFr: 'Comparer les coutumes France / Japon',
    titleJa: '日仏の文化の違い',
    starterJa: '日本の生活で一番驚いた習慣は何ですか。',
    starterReading: 'にほんの せいかつで いちばん おどろいた しゅうかんは なんですか。',
    starterFr: 'Quelle coutume vous a le plus surpris dans la vie au Japon ?',
    vocabField: [
      { word: '習慣', reading: 'しゅうかん', meaningFr: 'coutume / habitude' },
      { word: '挨拶', reading: 'あいさつ', meaningFr: 'salutation' },
      { word: 'マナー', reading: 'まなー', meaningFr: 'savoir-vivre' },
    ],
    grammarPatterns: ['〜に比べて', '〜わけではない', '〜ほど'],
    exampleSentences: ['フランスに比べて、電車の中がとても静かです。'],
  },
  {
    id: 'chat_n2_society',
    level: 'N2',
    titleFr: 'Télétravail, ville et régions',
    titleJa: 'テレワークと地方生活',
    starterJa: 'リモートワークが増えたことで、働き方はどう変わったと思いますか。',
    starterReading: 'りもーとわーくが ふえたことで、はたらきかたは どう かわったと おもいますか。',
    starterFr: 'Avec l’essor du télétravail, comment la façon de travailler a-t-elle évolué selon vous ?',
    vocabField: [
      { word: '効率', reading: 'こうりつ', meaningFr: 'efficacité' },
      { word: '課題', reading: 'かだい', meaningFr: 'défi / enjeu' },
      { word: '両立', reading: 'りょうりつ', meaningFr: 'équilibre / conciliation' },
    ],
    grammarPatterns: ['〜一方で', '〜につれて', '〜ざるを得ない'],
    exampleSentences: ['通勤時間が減る一方で、会話の機会が減りがちだ。'],
  },
  {
    id: 'chat_n2_tech',
    level: 'N2',
    titleFr: 'IA et apprentissage des langues',
    titleJa: 'AIと言語学習のこれから',
    starterJa: '語学学習において、AIツールの最大の利点は何だと考えますか。',
    starterReading: 'ごがくがくしゅうに おいて、AIつーるの さいだいの りてんと かんがえますか。',
    starterFr: 'Dans l’apprentissage des langues, quel est selon vous le principal atout des outils d’IA ?',
    vocabField: [
      { word: '活用', reading: 'かつよう', meaningFr: 'utilisation active' },
      { word: '限界', reading: 'げんかい', meaningFr: 'limite' },
      { word: '実践', reading: 'じっせん', meaningFr: 'mise en pratique' },
    ],
    grammarPatterns: ['〜において', '〜とは限らない', '〜をもとに'],
    exampleSentences: ['ツールを活用しつつ、実践の場を増やすべきだ。'],
  },
  {
    id: 'chat_n1_ethics',
    level: 'N1',
    titleFr: 'Préservation du patrimoine vs modernisation',
    titleJa: '伝統継承と近代化の均衡',
    starterJa: '都市開発と歴史的景観の保護はどのように調和させるべきでしょうか。',
    starterReading: 'としかいはつと れきしてき けいかんの ほごは どのように ちょうわ させるべきでしょうか。',
    starterFr: 'Comment concilier développement urbain et préservation du paysage historique ?',
    vocabField: [
      { word: '景観', reading: 'けいかん', meaningFr: 'paysage / cadre urbain' },
      { word: '継承', reading: 'けいしょう', meaningFr: 'transmission / héritage' },
      { word: '妥協', reading: 'だきょう', meaningFr: 'compromis' },
    ],
    grammarPatterns: ['〜なくして', '〜にかかわらず', '〜にほかならない'],
    exampleSentences: ['地域の理解なくして、長期的な保護は成り立たない。'],
  },
  {
    id: 'chat_n1_media',
    level: 'N1',
    titleFr: 'Esprit critique face à l’information numérique',
    titleJa: '情報社会におけるメディアリテラシー',
    starterJa: '膨大な情報が流通する現代において、真偽を見極める力はどう養えますか。',
    starterReading: 'ぼうだいな じょうほうが りゅうつうする げんだいに おいて、しんぎを みきわめる ちからは どう やしなえますか。',
    starterFr: 'À l’ère d’un flot massif d’informations, comment cultiver le discernement ?',
    vocabField: [
      { word: '真偽', reading: 'しんぎ', meaningFr: 'véracité' },
      { word: '偏見', reading: 'へんけん', meaningFr: 'préjugé / biais' },
      { word: '裏付け', reading: 'うらづけ', meaningFr: 'preuve / recoupement' },
    ],
    grammarPatterns: ['〜をめぐって', '〜に至るまで', '〜べく'],
    exampleSentences: ['一次資料に当たる習慣こそ、偏見を防ぐ基盤となる。'],
  },
];
