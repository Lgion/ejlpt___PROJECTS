import type {
  CollectionExerciseItem,
  CollectionJLPTLevel,
  ExerciseCollectionSource,
} from '@/lib/exerciseCollections';
import type { GrammaticalVisualTag } from '@/lib/mastery';
import { matchesJapaneseSpeech } from '@/lib/speechRecognition';

export type YomikataZAnswerMode = 'qcm' | 'keyboard' | 'voice';

export interface YomikataZItem {
  id: string;
  source: ExerciseCollectionSource;
  level: CollectionJLPTLevel;
  sentenceBefore: string;
  targetWord: string;
  sentenceAfter: string;
  reading: string;
  meaningFr: string;
  expectedAnswers: string[];
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
  grammaticalTag: GrammaticalVisualTag;
  frequencyScore10: number;
  explanation: string;
}

interface RawYomikataSeed {
  id: string;
  level: CollectionJLPTLevel;
  sentenceBefore: string;
  targetWord: string;
  sentenceAfter: string;
  reading: string;
  meaningFr: string;
  distractors: [string, string, string];
  grammaticalTag: GrammaticalVisualTag;
  frequencyScore10: number;
  explanation: string;
}

function buildYomikataItem(raw: RawYomikataSeed): YomikataZItem {
  const letters = ['a', 'b', 'c', 'd'];
  const allChoices = [raw.reading, ...raw.distractors];
  const shift = raw.id.length % allChoices.length;
  const rotated = [...allChoices.slice(shift), ...allChoices.slice(0, shift)];
  const correctIdx = rotated.indexOf(raw.reading);

  return {
    id: raw.id,
    source: 'official',
    level: raw.level,
    sentenceBefore: raw.sentenceBefore,
    targetWord: raw.targetWord,
    sentenceAfter: raw.sentenceAfter,
    reading: raw.reading,
    meaningFr: raw.meaningFr,
    expectedAnswers: [raw.reading, raw.targetWord],
    options: rotated.map((text, idx) => ({ id: letters[idx] || String(idx), text })),
    correctOptionId: letters[correctIdx >= 0 ? correctIdx : 0],
    grammaticalTag: raw.grammaticalTag,
    frequencyScore10: raw.frequencyScore10,
    explanation: raw.explanation,
  };
}

const RAW_SEEDS: RawYomikataSeed[] = [
  // N5 (5)
  {
    id: 'yz_n5_1',
    level: 'N5',
    sentenceBefore: 'まいにち ',
    targetWord: '学校',
    sentenceAfter: ' へ いきます。',
    reading: 'がっこう',
    meaningFr: 'école',
    distractors: ['がくこう', 'かっこう', 'がこ'],
    grammaticalTag: 'noun',
    frequencyScore10: 10,
    explanation: '学校 (がっこう) comporte un っ (sokuon) entre がく et こう : « Je vais à l’école chaque jour. »',
  },
  {
    id: 'yz_n5_2',
    level: 'N5',
    sentenceBefore: 'あした ともだちと ',
    targetWord: '映画',
    sentenceAfter: ' を みます。',
    reading: 'えいが',
    meaningFr: 'film / cinéma',
    distractors: ['えいか', 'えが', 'えいご'],
    grammaticalTag: 'noun',
    frequencyScore10: 9,
    explanation: '映画 (えいが) signifie « film » (attention à ne pas confondre avec 英語 えいご = anglais).',
  },
  {
    id: 'yz_n5_3',
    level: 'N5',
    sentenceBefore: 'その ほんは とても ',
    targetWord: '高い',
    sentenceAfter: ' です。',
    reading: 'たかい',
    meaningFr: 'cher / élevé',
    distractors: ['やすい', 'ながい', 'おおきい'],
    grammaticalTag: 'adj_i',
    frequencyScore10: 10,
    explanation: '高い (たかい) est un adjectif en -い signifiant « cher » ou « haut ». ',
  },
  {
    id: 'yz_n5_4',
    level: 'N5',
    sentenceBefore: 'いま なん',
    targetWord: '時間',
    sentenceAfter: ' かかりますか。',
    reading: 'じかん',
    meaningFr: 'heure / durée',
    distractors: ['じげん', 'ちかん', 'じあい'],
    grammaticalTag: 'noun',
    frequencyScore10: 10,
    explanation: '時間 (じかん) signifie « temps / heure ». どのくらい時間がかかりますか = combien de temps faut-il ?',
  },
  {
    id: 'yz_n5_5',
    level: 'N5',
    sentenceBefore: 'あさ ごはんを ',
    targetWord: '食べる',
    sentenceAfter: '。',
    reading: 'たべる',
    meaningFr: 'manger',
    distractors: ['のむ', 'みる', 'しょくべる'],
    grammaticalTag: 'verb_ichidan',
    frequencyScore10: 10,
    explanation: '食べる (たべる) est un verbe ichidan (1段) fondamental : « manger ».',
  },

  // N4 (5)
  {
    id: 'yz_n4_1',
    level: 'N4',
    sentenceBefore: 'すみません、この ',
    targetWord: '意味',
    sentenceAfter: ' が わかりません。',
    reading: 'いみ',
    meaningFr: 'sens / signification',
    distractors: ['いあじ', 'おみ', 'いんみ'],
    grammaticalTag: 'noun',
    frequencyScore10: 9,
    explanation: '意味 (いみ) désigne « le sens, la signification » d’un mot ou d’une phrase.',
  },
  {
    id: 'yz_n4_2',
    level: 'N4',
    sentenceBefore: '来週の 土曜日に ',
    targetWord: '引っ越す',
    sentenceAfter: ' よていです。',
    reading: 'ひっこす',
    meaningFr: 'déménager',
    distractors: ['ひきこす', 'いっこす', 'ひっごす'],
    grammaticalTag: 'verb_godan',
    frequencyScore10: 7,
    explanation: '引っ越す (ひっこす) est un verbe godan signifiant « déménager ».',
  },
  {
    id: 'yz_n4_3',
    level: 'N4',
    sentenceBefore: 'テストの 前に よく ',
    targetWord: '準備',
    sentenceAfter: ' を してください。',
    reading: 'じゅんび',
    meaningFr: 'préparation',
    distractors: ['しゅんび', 'じゅんぴ', 'ちゅんび'],
    grammaticalTag: 'noun',
    frequencyScore10: 9,
    explanation: '準備 (じゅんび) signifie « préparation » (attention au rendaku び).',
  },
  {
    id: 'yz_n4_4',
    level: 'N4',
    sentenceBefore: 'ドアが 急に ',
    targetWord: '閉まる',
    sentenceAfter: ' ので きをつけて。',
    reading: 'しまる',
    meaningFr: 'se fermer (intransitif)',
    distractors: ['しめる', 'とまる', 'あまる'],
    grammaticalTag: 'jidoushi',
    frequencyScore10: 8,
    explanation: '閉まる (しまる) est la forme intransitive (自動詞) : la porte se ferme d’elle-même (sans agent).',
  },
  {
    id: 'yz_n4_5',
    level: 'N4',
    sentenceBefore: '先生に 日本語で ',
    targetWord: '説明',
    sentenceAfter: ' していただきました。',
    reading: 'せつめい',
    meaningFr: 'explication',
    distractors: ['せつみょう', 'ぜつめい', 'せいためい'],
    grammaticalTag: 'keigo',
    frequencyScore10: 9,
    explanation: '説明 (せつめい) + していただく exprime le keigo humble (謙譲語) envers le professeur.',
  },

  // N3 (5)
  {
    id: 'yz_n3_1',
    level: 'N3',
    sentenceBefore: '電車が 遅れたので 会議に ',
    targetWord: '間に合う',
    sentenceAfter: ' か 心配です。',
    reading: 'まにあう',
    meaningFr: 'arriver à temps',
    distractors: ['かんにあう', 'まにあい', 'あいだにあう'],
    grammaticalTag: 'verb_godan',
    frequencyScore10: 8,
    explanation: '間に合う (まにあう) se lit ま・に・あう et signifie « être à l’heure / arriver à temps ».',
  },
  {
    id: 'yz_n3_2',
    level: 'N3',
    sentenceBefore: '今回の 計画は 思ったより ',
    targetWord: '複雑',
    sentenceAfter: ' な 問題が 多い。',
    reading: 'ふくざつ',
    meaningFr: 'complexe / compliqué',
    distractors: ['ふくさつ', 'ぶくざつ', 'ふうざつ'],
    grammaticalTag: 'adj_na',
    frequencyScore10: 8,
    explanation: '複雑な (ふくざつな) est un adjectif en -な signifiant « complexe, embrouillé ».',
  },
  {
    id: 'yz_n3_3',
    level: 'N3',
    sentenceBefore: '彼の 意見を ',
    targetWord: '尊重',
    sentenceAfter: ' したいと 思います。',
    reading: 'そんちょう',
    meaningFr: 'respect / estime',
    distractors: ['そんじゅう', 'ぞんちょう', 'そんおも'],
    grammaticalTag: 'positive',
    frequencyScore10: 7,
    explanation: '尊重 (そんちょう) signifie « respecter, accorder de la valeur à l’avis de quelqu’un ».',
  },
  {
    id: 'yz_n3_4',
    level: 'N3',
    sentenceBefore: '雨が 降り始めた。',
    targetWord: 'したがって',
    sentenceAfter: ' 試合は 中止になった。',
    reading: 'したがって',
    meaningFr: 'par conséquent',
    distractors: ['それでも', 'ところが', 'ちなみに'],
    grammaticalTag: 'setsuzokushi',
    frequencyScore10: 7,
    explanation: 'したがって (従って) est un connecteur logique formel (接続詞) signifiant « par conséquent ».',
  },
  {
    id: 'yz_n3_5',
    level: 'N3',
    sentenceBefore: '社長が まもなく ',
    targetWord: 'いらっしゃる',
    sentenceAfter: ' はずです。',
    reading: 'いらっしゃる',
    meaningFr: 'venir / être (honorifique)',
    distractors: ['おっしゃる', 'うかがう', 'まいる'],
    grammaticalTag: 'keigo',
    frequencyScore10: 8,
    explanation: 'いらっしゃる est le keigo honorifique (尊敬語) remplaçant 来る / いる / 行く pour un supérieur.',
  },

  // N2 (5)
  {
    id: 'yz_n2_1',
    level: 'N2',
    sentenceBefore: '長期的な ',
    targetWord: '視点',
    sentenceAfter: ' に 立って 判断すべきだ。',
    reading: 'してん',
    meaningFr: 'point de vue / perspective',
    distractors: ['みみせ', 'してつ', 'みどころ'],
    grammaticalTag: 'noun',
    frequencyScore10: 7,
    explanation: '視点 (してん) signifie « angle de vue, perspective » dans une analyse.',
  },
  {
    id: 'yz_n2_2',
    level: 'N2',
    sentenceBefore: '予算不足のため 計画を ',
    targetWord: '延期',
    sentenceAfter: ' せざるを得ない。',
    reading: 'えんき',
    meaningFr: 'report / ajournement',
    distractors: ['えんご', 'のびき', 'えんかい'],
    grammaticalTag: 'negative',
    frequencyScore10: 7,
    explanation: '延期 (えんき) = reporter à plus tard (avec nuance contrainte ici par せざるを得ない).',
  },
  {
    id: 'yz_n2_3',
    level: 'N2',
    sentenceBefore: '環境保護に 対する 意識が ',
    targetWord: '高まる',
    sentenceAfter: ' 一方だ。',
    reading: 'たかまる',
    meaningFr: 's’élever / s’intensifier',
    distractors: ['たかめる', 'あがる', 'ひろまる'],
    grammaticalTag: 'jidoushi',
    frequencyScore10: 7,
    explanation: '高まる (たかまる) est intransitif (自動詞) : la conscience s’élève d’elle-même.',
  },
  {
    id: 'yz_n2_4',
    level: 'N2',
    sentenceBefore: '正確な データに ',
    targetWord: '基づく',
    sentenceAfter: ' 報告が 求められている。',
    reading: 'もとづく',
    meaningFr: 'se fonder sur',
    distractors: ['きづく', 'かたづく', 'ちかづく'],
    grammaticalTag: 'verb_godan',
    frequencyScore10: 7,
    explanation: '基づく (もとづく) = « se baser sur », très fréquent dans les articles de presse et N2.',
  },
  {
    id: 'yz_n2_5',
    level: 'N2',
    sentenceBefore: 'お忙しいところ ',
    targetWord: '恐縮',
    sentenceAfter: ' ですが ご確認願います。',
    reading: 'きょうしゅく',
    meaningFr: 'être navré / obligé (formel)',
    distractors: ['きょうふく', 'こうしゅく', 'おそれちぢみ'],
    grammaticalTag: 'soto',
    frequencyScore10: 6,
    explanation: '恐縮ですが (きょうしゅくですが) est une formule d’excuse/politesse commerciale envers un interlocuteur externe (Soto).',
  },

  // N1 (5)
  {
    id: 'yz_n1_1',
    level: 'N1',
    sentenceBefore: '二つの 証言の 間に ',
    targetWord: '矛盾',
    sentenceAfter: ' が 生じている。',
    reading: 'むじゅん',
    meaningFr: 'contradiction',
    distractors: ['ぼじゅん', 'むとん', 'ぶじゅん'],
    grammaticalTag: 'negative',
    frequencyScore10: 6,
    explanation: '矛盾 (むじゅん, litt. « lance et bouclier ») signifie « contradiction logique ».',
  },
  {
    id: 'yz_n1_2',
    level: 'N1',
    sentenceBefore: '彼女の 説明は ',
    targetWord: '曖昧',
    sentenceAfter: ' で 真意が つかめない。',
    reading: 'あいまい',
    meaningFr: 'vague / ambigu',
    distractors: ['あんまい', 'あいみ', 'えいまい'],
    grammaticalTag: 'adj_na',
    frequencyScore10: 6,
    explanation: '曖昧 (あいまい) qualifie quelque chose de flou, vague ou ambigu.',
  },
  {
    id: 'yz_n1_3',
    level: 'N1',
    sentenceBefore: '経済の 低迷を ',
    targetWord: '打開',
    sentenceAfter: ' する 策が 必要だ。',
    reading: 'だかい',
    meaningFr: 'débloquer / trouver une issue',
    distractors: ['たかい', 'だげ', 'うちあけ'],
    grammaticalTag: 'tadoushi',
    frequencyScore10: 5,
    explanation: '打開する (だかいする) est un verbe transitif : briser une impasse, débloquer une situation.',
  },
  {
    id: 'yz_n1_4',
    level: 'N1',
    sentenceBefore: 'この 研究は 極めて ',
    targetWord: '顕著',
    sentenceAfter: ' な 成果を 上げた。',
    reading: 'けんちょ',
    meaningFr: 'remarquable / manifeste',
    distractors: ['けんじゃ', 'げんちょ', 'あきらか'],
    grammaticalTag: 'positive',
    frequencyScore10: 5,
    explanation: '顕著な (けんちょな) signifie « frappant, remarquable, manifeste » (registre écrit/N1).',
  },
  {
    id: 'yz_n1_5',
    level: 'N1',
    sentenceBefore: '伝統文化の 継承に ',
    targetWord: '尽力',
    sentenceAfter: ' された 方々に 感謝します。',
    reading: 'じんりょく',
    meaningFr: 'dévouement / efforts soutenus',
    distractors: ['しんりょく', 'じんりき', 'ちからづく'],
    grammaticalTag: 'keigo',
    frequencyScore10: 5,
    explanation: '尽力 (じんりょく) signifie « consacrer tous ses efforts à » ; suivi de された (passif honorifique).',
  },
];

export const YOMIKATA_Z_OFFICIAL_SEED: YomikataZItem[] = RAW_SEEDS.map(buildYomikataItem);

export function parseCollectionItemToYomikataZ(item: CollectionExerciseItem): YomikataZItem | null {
  const prompt = (item.prompt || '').trim();
  const target = (item.targetWord || '').trim();
  const reading = (item.reading || item.expectedAnswers?.[0] || '').trim();
  if (!prompt || !reading) return null;

  let sentenceBefore = prompt;
  let targetWord = target || reading;
  let sentenceAfter = '';

  if (target && prompt.includes(target)) {
    const idx = prompt.indexOf(target);
    sentenceBefore = prompt.slice(0, idx);
    targetWord = target;
    sentenceAfter = prompt.slice(idx + target.length);
  } else if (target) {
    sentenceBefore = `${prompt} (`;
    targetWord = target;
    sentenceAfter = ')';
  }

  return {
    id: item.id,
    source: item.source,
    level: item.level,
    sentenceBefore,
    targetWord,
    sentenceAfter,
    reading,
    meaningFr: item.explanation,
    expectedAnswers:
      item.expectedAnswers && item.expectedAnswers.length > 0
        ? item.expectedAnswers
        : [reading, targetWord],
    options:
      item.options && item.options.length > 0
        ? item.options
        : [{ id: 'a', text: reading }],
    correctOptionId: item.correctOptionId || 'a',
    grammaticalTag: 'noun',
    frequencyScore10: 6,
    explanation: item.explanation,
  };
}

export function checkYomikataAnswer(
  item: YomikataZItem,
  answerMode: YomikataZAnswerMode,
  userValue: string
): boolean {
  if (answerMode === 'qcm') {
    return userValue === item.correctOptionId;
  }
  return matchesJapaneseSpeech(userValue, [item.reading, item.targetWord, ...item.expectedAnswers]);
}
