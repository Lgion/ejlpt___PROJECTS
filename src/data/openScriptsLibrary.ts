import type { TargetJLPTLevel } from '@/lib/textAnalyzer';

export interface OpenScriptEntry {
  id: string;
  title: string;
  genre: 'Dialogue Animé Original' | 'Conte Populaire' | 'Littérature Aozora' | 'Presse & Société' | 'Keigo Bureau';
  level: TargetJLPTLevel;
  sourceNote: string;
  text: string;
}

export const OPEN_SCRIPTS_LIBRARY: OpenScriptEntry[] = [
  {
    id: 'n5-morning',
    title: 'Matinée à Tokyo (Vie quotidienne)',
    genre: 'Dialogue Animé Original',
    level: 'N5',
    sourceNote: 'Script pédagogique original eJLPT (N5)',
    text: `ケンジ：おはようございます！もう七時ですよ。
ミカ：えっ、本当？早く起きなければなりませんね。
ケンジ：今日は駅の前で友達と会います。新しい本を買いたいです。
ミカ：図書館にも行きますか。
ケンジ：はい、午後から日本語を勉強します。`,
  },
  {
    id: 'n4-shonen',
    title: 'Défi au club de kendō (Style shōnen)',
    genre: 'Dialogue Animé Original',
    level: 'N4',
    sourceNote: 'Scène originale style animé scolaire (libre de droits)',
    text: `リョウ：昨日の練習は本当に厳しかったけれど、まだ諦めるわけにはいかない。
アオイ：そうだね。来月の大会に向けて、毎日少しずつ準備を続けよう。
リョウ：相手の動きをよく見て、落ち着いて試合に臨むつもりだ。
アオイ：自信を持って挑戦すれば、きっと勝てるよ！`,
  },
  {
    id: 'n4-momotaro',
    title: 'Momotarō — Le garçon né d’une pêche (桃太郎)',
    genre: 'Conte Populaire',
    level: 'N4',
    sourceNote: 'Folklore japonais traditionnel (domaine public)',
    text: `昔々、ある所におじいさんとおばあさんが住んでいました。
おじいさんは山へ芝刈りに、おばあさんは川へ洗濯に行きました。
おばあさんが川で洗濯をしていると、大きな桃が流れてきました。
家に持ち帰って切ろうとすると、中から元気な男の子が生まれました。
二人はその子を「桃太郎」と名付けて、大切に育てました。`,
  },
  {
    id: 'n3-station',
    title: 'Sous la pluie à Shinjuku (Dialogue dramatique)',
    genre: 'Dialogue Animé Original',
    level: 'N3',
    sourceNote: 'Script original eJLPT (N3)',
    text: `高橋：急に強い雨が降り出したね。傘を持ってこなかったから困ったな。
佐藤：電車も少し遅れているみたいだよ。改札の近くで様子を見よう。
高橋：もし間に合わなかったら、すぐに連絡を入れて謝るしかないね。
佐藤：大丈夫、急いで走れば次の急行に乗れるはずだ。`,
  },
  {
    id: 'n3-keigo',
    title: 'Accueil d’un partenaire commercial (Keigo)',
    genre: 'Keigo Bureau',
    level: 'N3',
    sourceNote: 'Dialogue professionnel eJLPT (Sonkeigo / Kenjōgo)',
    text: `受付：いらっしゃいませ。田中様でいらっしゃいますか。
田中：はい、青空商事の田中と申します。いつもお世話になっております。
受付：お待ちしておりました。部長はまもなく参りますので、少々お待ちくださいませ。
田中：お忙しいところ恐縮ですが、よろしくお願いいたします。`,
  },
  {
    id: 'n2-environment',
    title: 'Travail & transition écologique (Presse)',
    genre: 'Presse & Société',
    level: 'N2',
    sourceNote: 'Éditorial pédagogique eJLPT (N2)',
    text: `近年、都市部における働き方改革が進む一方で、地方の活性化や環境問題への取り組みも重要な課題となっている。
再生可能エネルギーの導入を増やすだけでなく、地域社会との協力体制を築くことが求められている。
次世代のために持続可能な社会を実現するには、一人一人の意識の変化が不可欠である。`,
  },
  {
    id: 'n2-soseki',
    title: 'Je suis un chat — Extrait (吾輩は猫である)',
    genre: 'Littérature Aozora',
    level: 'N2',
    sourceNote: 'Natsume Sōseki (1905, domaine public Aozora Bunko)',
    text: `吾輩は猫である。名前はまだ無い。
どこで生れたかとんと見当がつかぬ。何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。
吾輩はここで始めて人間というものを見た。`,
  },
  {
    id: 'n1-merosu',
    title: 'Cours, Melos ! — Extrait (走れメロス)',
    genre: 'Littérature Aozora',
    level: 'N1',
    sourceNote: 'Osamu Dazai (1940, domaine public Aozora Bunko)',
    text: `メロスは激怒した。必ず、かの邪智暴虐の王を除かなければならぬと決意した。
メロスには政治がわからぬ。メロスは、村の牧人である。
笛を吹き、羊と遊んで暮して来た。けれども邪悪に対しては、人一倍に敏感であった。`,
  },
];
