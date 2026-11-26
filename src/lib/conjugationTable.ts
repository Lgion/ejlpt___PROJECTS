import { toHiragana } from 'wanakana';
import { conjugateJapaneseVerb, type VerbGroup } from '@/lib/sentenceDrillsEngine';

export interface ConjugationRow {
  key: string;
  labelFr: string;
  labelJa: string;
  form: string;
  noteFr: string;
}

export interface FullConjugationParadigm {
  dictionaryForm: string;
  group: VerbGroup;
  rows: ConjugationRow[];
}

export const PRESET_CONJUGATION_VERBS: Array<{
  dict: string;
  reading: string;
  meaningFr: string;
  group: VerbGroup;
}> = [
  { dict: '食べる', reading: 'たべる', meaningFr: 'manger (1段)', group: 'ichidan' },
  { dict: '見る', reading: 'みる', meaningFr: 'voir (1段)', group: 'ichidan' },
  { dict: '書く', reading: 'かく', meaningFr: 'écrire (5段 -く)', group: 'godan' },
  { dict: '泳ぐ', reading: 'およぐ', meaningFr: 'nager (5段 -ぐ)', group: 'godan' },
  { dict: '話す', reading: 'はなす', meaningFr: 'parler (5段 -す)', group: 'godan' },
  { dict: '待つ', reading: 'まつ', meaningFr: 'attendre (5段 -つ)', group: 'godan' },
  { dict: '飲む', reading: 'のむ', meaningFr: 'boire (5段 -む)', group: 'godan' },
  { dict: '遊ぶ', reading: 'あそぶ', meaningFr: 'jouer (5段 -ぶ)', group: 'godan' },
  { dict: '買う', reading: 'かう', meaningFr: 'acheter (5段 -う)', group: 'godan' },
  { dict: '帰る', reading: 'かえる', meaningFr: 'rentrer (piège 5段 -る)', group: 'godan' },
  { dict: '行く', reading: 'いく', meaningFr: 'aller (irrégularité て/た)', group: 'godan' },
  { dict: 'する', reading: 'する', meaningFr: 'faire (irrégulier)', group: 'irregular' },
  { dict: '来る', reading: 'くる', meaningFr: 'venir (irrégulier)', group: 'irregular' },
];

const GODAN_EXTRA_ROWS: Record<string, { potential: string; volitional: string }> = {
  う: { potential: 'える', volitional: 'おう' },
  く: { potential: 'ける', volitional: 'こう' },
  ぐ: { potential: 'げる', volitional: 'ごう' },
  す: { potential: 'せる', volitional: 'そう' },
  つ: { potential: 'てる', volitional: 'とう' },
  ぬ: { potential: 'ねる', volitional: 'のう' },
  ぶ: { potential: 'べる', volitional: 'ぼう' },
  む: { potential: 'める', volitional: 'もう' },
  る: { potential: 'れる', volitional: 'ろう' },
};

const KNOWN_GODAN_RU = new Set([
  '帰る',
  'かえる',
  '走る',
  'はしる',
  '知る',
  'しる',
  '切る',
  'きる',
  '入る',
  'はいる',
  '要る',
  'いる',
  '滑る',
  'すべる',
  '喋る',
  'しゃべる',
]);

export function inferVerbGroup(rawInput: string): VerbGroup {
  const clean = rawInput.trim();
  if (clean === 'する' || clean.endsWith('する') || clean === '来る' || clean === 'くる') {
    return 'irregular';
  }
  if (KNOWN_GODAN_RU.has(clean)) {
    return 'godan';
  }
  if (clean.endsWith('る')) {
    // Heuristique : si fin en kana -iru/-eru, préférer ichidan sauf exceptions ci-dessus
    const hira = toHiragana(clean);
    const prev = hira.slice(-2, -1);
    if ('いきぎしじちぢにひびぴみりえけげせぜてでねへべぺめれ'.includes(prev)) {
      return 'ichidan';
    }
  }
  return 'godan';
}

export function buildFullConjugationParadigm(
  rawDict: string,
  explicitGroup?: VerbGroup | 'auto'
): FullConjugationParadigm {
  const normalized = toHiragana(rawDict.trim(), { passRomaji: false }).trim() || rawDict.trim();
  // Keep kanji characters if user entered kanji, only convert pure ASCII romaji
  const dict = /^[a-zA-Z\s]+$/.test(rawDict.trim()) ? normalized : rawDict.trim();
  const group: VerbGroup =
    !explicitGroup || explicitGroup === 'auto' ? inferVerbGroup(dict) : explicitGroup;

  const base = conjugateJapaneseVerb(dict, group);

  let potential = '';
  let volitional = '';
  let causative = '';
  let causativePassive = '';

  if (group === 'irregular' || dict === 'する' || dict.endsWith('する') || dict === '来る' || dict === 'くる') {
    if (dict === '来る' || dict === 'くる') {
      const stemKo = dict === '来る' ? '来' : 'こ';
      potential = `${stemKo}られる`;
      volitional = `${stemKo}よう`;
      causative = `${stemKo}させる`;
      causativePassive = `${stemKo}させられる`;
    } else {
      const stemSuru = dict.slice(0, -2);
      potential = `${stemSuru}できる`;
      volitional = `${stemSuru}しよう`;
      causative = `${stemSuru}させる`;
      causativePassive = `${stemSuru}させられる`;
    }
  } else if (group === 'ichidan') {
    const stem = dict.slice(0, -1);
    potential = `${stem}られる`;
    volitional = `${stem}よう`;
    causative = `${stem}させる`;
    causativePassive = `${stem}させられる`;
  } else {
    const ending = dict.slice(-1);
    const stem = dict.slice(0, -1);
    const extra = GODAN_EXTRA_ROWS[ending] || GODAN_EXTRA_ROWS['る'];
    const negStem = base.negative.slice(0, -2); // remove ない
    potential = `${stem}${extra.potential}`;
    volitional = `${stem}${extra.volitional}`;
    causative = `${negStem}せる`;
    causativePassive = ending === 'す' ? `${negStem}せられる` : `${negStem}される`;
  }

  const rows: ConjugationRow[] = [
    { key: 'dictionary', labelFr: 'Dictionnaire / Neutre', labelJa: '辞書形', form: base.dictionary, noteFr: 'Forme de base du dictionnaire' },
    { key: 'polite', labelFr: 'Poli présent', labelJa: 'ます形', form: base.polite, noteFr: 'Style poli standard (丁寧語)' },
    { key: 'negative', labelFr: 'Négatif neutre', labelJa: 'ない形', form: base.negative, noteFr: 'Sert pour ないで / なければならない' },
    { key: 'past', labelFr: 'Passé neutre', labelJa: 'た形', form: base.past, noteFr: 'Accompli / 〜たり / 〜たことがある' },
    { key: 'te', labelFr: 'Suspensif en て', labelJa: 'て形', form: base.te, noteFr: 'Enchaînement / 〜てください / 〜ている' },
    { key: 'potential', labelFr: 'Potentiel (pouvoir)', labelJa: '可能形', form: potential, noteFr: 'Capacité / possibilité (particule が)' },
    { key: 'passive', labelFr: 'Passif (Ukemikei)', labelJa: '受身形', form: base.passive, noteFr: 'Passif direct ou subi (〜に〜られる)' },
    { key: 'causative', labelFr: 'Causatif (faire faire)', labelJa: '使役形', form: causative, noteFr: 'Autoriser ou contraindre qq’un à agir' },
    { key: 'causative_passive', labelFr: 'Causatif-Passif', labelJa: '使役受身形', form: causativePassive, noteFr: 'Être forcé / amené malgré soi à agir' },
    { key: 'volitional', labelFr: 'Volitif (proposons)', labelJa: '意向形', form: volitional, noteFr: 'Allons / je compte bien… (〜ようとする)' },
    { key: 'ba', labelFr: 'Conditionnel en ば', labelJa: 'ば形', form: base.ba, noteFr: 'Condition hypothétique ou générale' },
    { key: 'tara', labelFr: 'Conditionnel en たら', labelJa: 'たら形', form: base.tara, noteFr: 'Si / une fois que… (tout temps)' },
    { key: 'imperative', labelFr: 'Impératif direct', labelJa: '命令形', form: base.imperative, noteFr: 'Ordre direct / signalisation / urgence' },
    { key: 'prohibitive', labelFr: 'Prohibitif', labelJa: '禁止形', form: base.prohibitive, noteFr: 'Interdiction stricte (forme dict + な)' },
    { key: 'casual_teiru', labelFr: 'Progressif familier', labelJa: '〜てる', form: base.casualTeIru, noteFr: 'Contraction orale courante de 〜ている' },
  ];

  return {
    dictionaryForm: dict,
    group,
    rows,
  };
}
