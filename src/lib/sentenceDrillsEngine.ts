import { toHiragana } from 'wanakana';

export type VerbGroup = 'ichidan' | 'godan' | 'irregular';

export interface VerbConjugations {
  dictionary: string;
  polite: string;
  politeNeg: string;
  politePast: string;
  negative: string;
  past: string;
  te: string;
  passive: string;
  ba: string;
  tara: string;
  imperative: string;
  prohibitive: string;
  casualTeIru: string;
}

const GODAN_ROWS: Record<
  string,
  { a: string; i: string; e: string; te: string; ta: string }
> = {
  う: { a: 'わ', i: 'い', e: 'え', te: 'って', ta: 'った' },
  く: { a: 'か', i: 'き', e: 'け', te: 'いて', ta: 'いた' },
  ぐ: { a: 'が', i: 'ぎ', e: 'げ', te: 'いで', ta: 'いだ' },
  す: { a: 'さ', i: 'し', e: 'せ', te: 'して', ta: 'した' },
  つ: { a: 'た', i: 'ち', e: 'て', te: 'って', ta: 'った' },
  ぬ: { a: 'な', i: 'に', e: 'ね', te: 'んで', ta: 'んだ' },
  ぶ: { a: 'ば', i: 'び', e: 'べ', te: 'んで', ta: 'んだ' },
  む: { a: 'ま', i: 'み', e: 'め', te: 'んで', ta: 'んだ' },
  る: { a: 'ら', i: 'り', e: 'れ', te: 'って', ta: 'った' },
};

export function conjugateJapaneseVerb(
  dictForm: string,
  group: VerbGroup
): VerbConjugations {
  const clean = dictForm.trim();

  if (group === 'irregular' || clean === 'する' || clean.endsWith('する')) {
    if (clean === '来る' || clean === 'くる') {
      const prefix = clean === '来る' ? '来' : 'き';
      const stemKo = clean === '来る' ? '来' : 'こ';
      return {
        dictionary: clean,
        polite: `${prefix}ます`,
        politeNeg: `${prefix}ません`,
        politePast: `${prefix}ました`,
        negative: `${stemKo}ない`,
        past: `${prefix}た`,
        te: `${prefix}て`,
        passive: `${stemKo}られる`,
        ba: `${clean === '来る' ? '来' : 'く'}れば`,
        tara: `${prefix}たら`,
        imperative: `${stemKo}い`,
        prohibitive: `${clean}な`,
        casualTeIru: `${prefix}てる`,
      };
    }

    const base = clean.slice(0, -2); // strip する
    return {
      dictionary: clean,
      polite: `${base}します`,
      politeNeg: `${base}しません`,
      politePast: `${base}しました`,
      negative: `${base}しない`,
      past: `${base}した`,
      te: `${base}して`,
      passive: `${base}される`,
      ba: `${base}すれば`,
      tara: `${base}したら`,
      imperative: `${base}しろ`,
      prohibitive: `${clean}な`,
      casualTeIru: `${base}してる`,
    };
  }

  if (group === 'ichidan') {
    const stem = clean.slice(0, -1);
    return {
      dictionary: clean,
      polite: `${stem}ます`,
      politeNeg: `${stem}ません`,
      politePast: `${stem}ました`,
      negative: `${stem}ない`,
      past: `${stem}た`,
      te: `${stem}て`,
      passive: `${stem}られる`,
      ba: `${stem}れば`,
      tara: `${stem}たら`,
      imperative: `${stem}ろ`,
      prohibitive: `${clean}な`,
      casualTeIru: `${stem}てる`,
    };
  }

  // Godan
  const ending = clean.slice(-1);
  const stem = clean.slice(0, -1);
  const row = GODAN_ROWS[ending] || GODAN_ROWS['る'];

  // Special case: 行く / いく -> 行って / 行った
  const isIku = clean === '行く' || clean === 'いく';
  const teForm = isIku ? `${stem}って` : `${stem}${row.te}`;
  const taForm = isIku ? `${stem}った` : `${stem}${row.ta}`;

  return {
    dictionary: clean,
    polite: `${stem}${row.i}ます`,
    politeNeg: `${stem}${row.i}ません`,
    politePast: `${stem}${row.i}ました`,
    negative: `${stem}${row.a}ない`,
    past: taForm,
    te: teForm,
    passive: `${stem}${row.a}れる`,
    ba: `${stem}${row.e}ば`,
    tara: `${taForm}ら`,
    imperative: `${stem}${row.e}`,
    prohibitive: `${clean}な`,
    casualTeIru: `${teForm}る`,
  };
}

export interface KeigoTableRow {
  plain: string;
  polite: string;
  sonkeigo: string;
  kenjougo: string;
  noteFr: string;
}

export const KEIGO_VERB_TABLE: KeigoTableRow[] = [
  { plain: 'する', polite: 'します', sonkeigo: 'なさる / なさいます', kenjougo: 'いたす / いたします', noteFr: 'Faire' },
  { plain: '行く・来る', polite: '行きます・来ます', sonkeigo: 'いらっしゃる / おいでになる', kenjougo: 'まいる・うかがう', noteFr: 'Aller / Venir' },
  { plain: 'いる', polite: 'います', sonkeigo: 'いらっしゃる / おいでになる', kenjougo: 'おる / おります', noteFr: 'Être (animé)' },
  { plain: '食べる・飲む', polite: '食べます・飲みます', sonkeigo: '召し上がる', kenjougo: 'いただく', noteFr: 'Manger / Boire' },
  { plain: '言う', polite: '言います', sonkeigo: 'おっしゃる', kenjougo: '申す・申し上げる', noteFr: 'Dire' },
  { plain: '見る', polite: '見ます', sonkeigo: 'ご覧になる', kenjougo: '拝見する', noteFr: 'Regarder' },
  { plain: '知る', polite: '知っています', sonkeigo: 'ご存じだ', kenjougo: '存じる・存じ上げる', noteFr: 'Savoir / Connaître' },
  { plain: '聞く・訪ねる', polite: '聞きます・訪ねます', sonkeigo: 'お聞きになる', kenjougo: 'うかがう・拝聴する', noteFr: 'Demander / Rendre visite' },
  { plain: '会う', polite: '会います', sonkeigo: 'お会いになる', kenjougo: 'お目にかかる', noteFr: 'Rencontrer' },
  { plain: 'あげる', polite: 'あげます', sonkeigo: 'くださる', kenjougo: '差し上げる', noteFr: 'Donner' },
  { plain: 'もらう', polite: 'もらいます', sonkeigo: '—', kenjougo: 'いただく・頂戴する', noteFr: 'Recevoir' },
  { plain: '思う', polite: '思います', sonkeigo: 'お思いになる', kenjougo: '存じる', noteFr: 'Penser' },
  { plain: '読む', polite: '読みます', sonkeigo: 'お読みになる', kenjougo: '拝読する', noteFr: 'Lire' },
  { plain: '書く', polite: '書きます', sonkeigo: 'お書きになる', kenjougo: 'お書きいたす', noteFr: 'Écrire' },
];

export const UKEMIKEI_RULES: Array<{ title: string; formula: string; exampleJp: string; exampleFr: string }> = [
  {
    title: 'Godan (5段) → -a + れる',
    formula: 'Base en -a (わ pour う) + れる',
    exampleJp: '叱る → 叱られる / 踏む → 踏まれる',
    exampleFr: 'Être grondé / Se faire marcher dessus',
  },
  {
    title: 'Ichidan (1段) → Radical + られる',
    formula: 'Retirer る + られる',
    exampleJp: '食べる → 食べられる / 褒める → 褒められる',
    exampleFr: 'Être mangé / Être félicité',
  },
  {
    title: 'Irréguliers (する / 来る)',
    formula: 'する → される · 来る → 来られる (こられる)',
    exampleJp: '招待する → 招待される',
    exampleFr: 'Être invité',
  },
  {
    title: 'Passif direct vs Passif subi (迷惑の受身)',
    formula: 'Victime は + Agent に + (COD を) + V受身',
    exampleJp: '雨に降られて、ぬれてしまった。',
    exampleFr: 'J’ai subi la pluie et j’ai été trempé.',
  },
];

export const CONDITIONAL_IMPERATIVE_RULES: Array<{
  form: string;
  connection: string;
  nuanceFr: string;
  exampleJp: string;
}> = [
  {
    form: '〜と (Naturel / Inévitable)',
    connection: 'V辞書形 / いAdj / なAdjだ + と',
    nuanceFr: 'Conséquence automatique, loi naturelle ou itinéraire. Jamais suivi d’un ordre/volonté.',
    exampleJp: '春になると、桜が咲きます。',
  },
  {
    form: '〜ば (Condition hypothétique)',
    connection: 'Godan -eば · Ichidan -れば · いAdj -ければ',
    nuanceFr: 'Condition logique ou proverbiale (« si X est rempli, alors Y »).',
    exampleJp: '時間があれば、本を読みます。',
  },
  {
    form: '〜たら (Cas concret / Après coup)',
    connection: 'Forme passée Vた / いAdjかった / Nだった + ら',
    nuanceFr: 'Le plus polyvalent : événement futur ponctuel (« quand / si ») ou découverte inattendue.',
    exampleJp: '家に着いたら、電話してください。',
  },
  {
    form: '〜なら (Rebond sur le contexte)',
    connection: 'V普通形 / N / なAdj + なら',
    nuanceFr: '« Si c’est de cela qu’il s’agit / à ce propos… » — très utilisé pour conseiller.',
    exampleJp: '日本へ行くなら、京都がおすすめです。',
  },
  {
    form: '命令形 / 禁止形 (Ordre & Interdiction)',
    connection: 'Godan -e · Ichidan -ろ · する→しろ · 禁止: V辞書形+な',
    nuanceFr: 'Ordre direct (urgence, sport, panneaux) ou interdiction sèche (« Ne fais pas ! »).',
    exampleJp: '早く走れ！ / ここに入るな！',
  },
];

export const CASUAL_ABBREVIATION_RULES: Array<{
  polite: string;
  casual: string;
  noteFr: string;
}> = [
  { polite: '〜ています', casual: '〜てる', noteFr: 'Chute du い dans l’action en cours (食べている → 食べてる)' },
  { polite: '〜ておきます', casual: '〜とく / 〜どく', noteFr: 'Préparation préalable (買っておく → 買っとく)' },
  { polite: '〜てしまいます', casual: '〜ちゃう / 〜じゃう', noteFr: 'Action achevée ou regret (忘れてしまった → 忘れちゃった)' },
  { polite: '〜なければなりません', casual: '〜なきゃ / 〜なくちゃ', noteFr: 'Obligation à l’oral familier (行かなければ → 行かなきゃ)' },
  { polite: '〜ではありません', casual: '〜じゃない', noteFr: 'Négation nominale / adjectivale familière' },
  { polite: '〜のです / 〜んです', casual: '〜んだ / 〜の', noteFr: 'Explication familière (行くんです → 行くんだ)' },
];

export function normalizeJapaneseAnswer(raw: string): string {
  const stripped = raw
    .trim()
    .replace(/[\s\u3000。、.,!?！？「」『』()（）]/g, '');
  if (!stripped) return '';
  if (/^[a-zA-Z0-9'-]+$/.test(stripped)) {
    return toHiragana(stripped.toLowerCase());
  }
  return stripped.toLowerCase();
}

export function checkDrillAnswer(userInput: string, expectedAnswers: string[]): boolean {
  const normUser = normalizeJapaneseAnswer(userInput);
  if (!normUser) return false;
  return expectedAnswers.some((ans) => normalizeJapaneseAnswer(ans) === normUser);
}
