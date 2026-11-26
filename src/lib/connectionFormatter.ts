import { toHiragana, toRomaji } from 'wanakana';

export type ConnectionDisplayFormat =
  | 'standard_ja'
  | 'hiragana'
  | 'romaji'
  | 'manual_fr'
  | 'manual_en'
  | 'mixed_compact';

export const CONNECTION_FORMAT_OPTIONS: Array<{
  id: ConnectionDisplayFormat;
  label: string;
  sample: string;
}> = [
  { id: 'standard_ja', label: 'Japonais standard', sample: 'V辞書形 + 〜 / N + 〜' },
  { id: 'hiragana', label: 'Hiragana', sample: 'どうし じしょけい + 〜' },
  { id: 'romaji', label: 'Romaji', sample: 'V-jishokei + 〜 / Meishi + 〜' },
  { id: 'manual_fr', label: 'Manuels FR', sample: 'Verbe (dict.) + 〜 / Nom + 〜' },
  { id: 'manual_en', label: 'Manuels EN', sample: 'V-dict + 〜 / N + 〜' },
  { id: 'mixed_compact', label: 'Mixte compact', sample: 'V普通 / N + 〜' },
];

const REPLACEMENTS_BY_FORMAT: Record<
  Exclude<ConnectionDisplayFormat, 'standard_ja'>,
  Array<[RegExp, string]>
> = {
  hiragana: [
    [/動詞/g, 'どうし'],
    [/い形容詞/g, 'いけいようし'],
    [/な形容詞/g, 'なけいようし'],
    [/形容詞/g, 'けいようし'],
    [/名詞/g, 'めいし'],
    [/辞書形/g, 'じしょけい'],
    [/普通形/g, 'ふつうけい'],
    [/丁寧形/g, 'ていねいけい'],
    [/意向形/g, 'いこうけい'],
    [/可能形/g, 'かのうけい'],
    [/受身形/g, 'うけみけい'],
    [/使役形/g, 'しえきけい'],
    [/条件形/g, 'じょうけんけい'],
    [/て形/g, 'てけい'],
    [/た形/g, 'たけい'],
    [/ない形/g, 'ないけい'],
    [/ます形/g, 'ますけい'],
    [/語幹/g, 'ごかん'],
    [/接続/g, 'せつぞく'],
    [/文型/g, 'ぶんけい'],
    [/\bN\b/g, 'めいし'],
    [/\bV\b/g, 'どうし'],
    [/\bAい\b/g, 'いけいようし'],
    [/\bAな\b/g, 'なけいようし'],
  ],
  romaji: [
    [/動詞/g, 'Doushi'],
    [/い形容詞/g, 'i-Keiyoushi'],
    [/な形容詞/g, 'na-Keiyoushi'],
    [/形容詞/g, 'Keiyoushi'],
    [/名詞/g, 'Meishi'],
    [/辞書形/g, 'jishokei'],
    [/普通形/g, 'futsuukei'],
    [/丁寧形/g, 'teineikei'],
    [/意向形/g, 'ikoukei'],
    [/可能形/g, 'kanoukei'],
    [/受身形/g, 'ukemikei'],
    [/使役形/g, 'shiekikei'],
    [/条件形/g, 'joukenkei'],
    [/て形/g, 'te-kei'],
    [/た形/g, 'ta-kei'],
    [/ない形/g, 'nai-kei'],
    [/ます形/g, 'masu-kei'],
    [/語幹/g, 'gokan'],
    [/接続/g, 'setsuzoku'],
    [/文型/g, 'bunkei'],
    [/\bN\b/g, 'Meishi'],
    [/\bV\b/g, 'V'],
  ],
  manual_fr: [
    [/動詞/g, 'Verbe'],
    [/い形容詞|いAdj|Aい/g, 'Adj-i'],
    [/な形容詞|なAdj|Aな/g, 'Adj-na'],
    [/形容詞/g, 'Adjectif'],
    [/名詞|名/g, 'Nom'],
    [/辞書形/g, '(dictionnaire)'],
    [/普通形/g, '(forme neutre)'],
    [/丁寧形/g, '(forme polie)'],
    [/意向形/g, '(volitif)'],
    [/可能形/g, '(potentiel)'],
    [/受身形/g, '(passif)'],
    [/使役形/g, '(causatif)'],
    [/条件形/g, '(conditionnel)'],
    [/て形/g, '(forme en -te)'],
    [/た形/g, '(forme en -ta)'],
    [/ない形/g, '(négatif -nai)'],
    [/ます形/g, '(radical -masu)'],
    [/語幹/g, '(radical)'],
    [/接続/g, 'Connexion'],
    [/文型/g, 'Structure'],
    [/\bV\b/g, 'Verbe'],
    [/\bN\b/g, 'Nom'],
  ],
  manual_en: [
    [/動詞/g, 'V'],
    [/い形容詞|Aい/g, 'i-Adj'],
    [/な形容詞|Aな/g, 'na-Adj'],
    [/形容詞/g, 'Adj'],
    [/名詞|名/g, 'N'],
    [/辞書形/g, '-dict'],
    [/普通形/g, '-plain'],
    [/丁寧形/g, '-polite'],
    [/意向形/g, '-volitional'],
    [/可能形/g, '-potential'],
    [/受身形/g, '-passive'],
    [/使役形/g, '-causative'],
    [/条件形/g, '-conditional'],
    [/て形/g, '-te'],
    [/た形/g, '-ta'],
    [/ない形/g, '-nai'],
    [/ます形/g, '-masu stem'],
    [/語幹/g, 'stem'],
    [/接続/g, 'Conn'],
    [/文型/g, 'Pattern'],
  ],
  mixed_compact: [
    [/動詞/g, 'V'],
    [/い形容詞/g, 'Aい'],
    [/な形容詞/g, 'Aな'],
    [/名詞/g, 'N'],
    [/辞書形/g, '辞書'],
    [/普通形/g, '普通'],
    [/丁寧形/g, '丁寧'],
    [/て形/g, 'て'],
    [/た形/g, 'た'],
    [/ない形/g, 'ない'],
    [/ます形/g, 'ます'],
    [/語幹/g, '語幹'],
  ],
};

export function formatGrammarConnection(
  raw: string,
  format: ConnectionDisplayFormat = 'standard_ja'
): string {
  const clean = (raw || '').trim();
  if (!clean || format === 'standard_ja') return clean;

  let out = clean;
  for (const [pattern, replacement] of REPLACEMENTS_BY_FORMAT[format]) {
    out = out.replace(pattern, replacement);
  }

  if (format === 'hiragana') {
    // Convert katakana particles/segments if present while keeping readable spacing
    out = toHiragana(out, { passRomaji: true });
  } else if (format === 'romaji') {
    // Transliterate remaining kana chunks cleanly into romaji
    out = out.replace(/[\u3040-\u30ffー]+/g, (kana) => toRomaji(kana));
  }

  return out.replace(/\s+/g, ' ').trim();
}

export interface ConnectionPatternGroup {
  id: string;
  label: string;
  sampleNotation: string;
  queryToken: string;
  count: number;
}

const PATTERN_BUCKETS: Array<{
  id: string;
  label: string;
  sampleNotation: string;
  queryToken: string;
  regex: RegExp;
}> = [
  {
    id: 'noun',
    label: 'Nom + 文型',
    sampleNotation: '名詞 / N + 〜',
    queryToken: '名詞',
    regex: /名詞|\bN\b|N1|N2/,
  },
  {
    id: 'v_plain',
    label: 'Verbe forme neutre (普通形)',
    sampleNotation: 'V普通形 + 〜',
    queryToken: '普通形',
    regex: /普通形|V-plain|普通/,
  },
  {
    id: 'v_dict',
    label: 'Verbe dictionnaire (辞書形)',
    sampleNotation: 'V辞書形 + 〜',
    queryToken: '辞書形',
    regex: /辞書形|る形/,
  },
  {
    id: 'v_te',
    label: 'Verbe en -て (て形)',
    sampleNotation: 'Vて形 + 〜',
    queryToken: 'て形',
    regex: /て形|て\+/,
  },
  {
    id: 'v_ta',
    label: 'Verbe en -た (た形)',
    sampleNotation: 'Vた形 + 〜',
    queryToken: 'た形',
    regex: /た形|た\+/,
  },
  {
    id: 'v_nai',
    label: 'Verbe négatif (ない形)',
    sampleNotation: 'Vない形 + 〜',
    queryToken: 'ない形',
    regex: /ない形|ない\+/,
  },
  {
    id: 'v_masu',
    label: 'Radical -ます (ます形)',
    sampleNotation: 'Vます形 + 〜',
    queryToken: 'ます形',
    regex: /ます形|ます/,
  },
  {
    id: 'adj_i',
    label: 'Adjectif en -い (い形容詞)',
    sampleNotation: 'い形容詞 / Aい + 〜',
    queryToken: 'い形容詞',
    regex: /い形容詞|い形|Aい|i-Adj/,
  },
  {
    id: 'adj_na',
    label: 'Adjectif en -な (な形容詞)',
    sampleNotation: 'な形容詞 / Aな + 〜',
    queryToken: 'な形容詞',
    regex: /な形容詞|な形|Aな|na-Adj/,
  },
  {
    id: 'verb_any',
    label: 'Verbe (général)',
    sampleNotation: '動詞 / V + 〜',
    queryToken: '動詞',
    regex: /動詞|\bV\b/,
  },
];

export function buildConnectionPatternIndex(
  records: Array<{ connections?: string[] }>
): ConnectionPatternGroup[] {
  const counts = new Map<string, number>();
  let otherCount = 0;

  for (const rec of records) {
    const conns = rec.connections || [];
    if (conns.length === 0) continue;
    const joined = conns.join(' ');
    let matchedAny = false;
    for (const bucket of PATTERN_BUCKETS) {
      if (bucket.regex.test(joined)) {
        counts.set(bucket.id, (counts.get(bucket.id) || 0) + 1);
        matchedAny = true;
      }
    }
    if (!matchedAny) {
      otherCount += 1;
    }
  }

  const groups: ConnectionPatternGroup[] = PATTERN_BUCKETS.map((b) => ({
    id: b.id,
    label: b.label,
    sampleNotation: b.sampleNotation,
    queryToken: b.queryToken,
    count: counts.get(b.id) || 0,
  }))
    .filter((g) => g.count > 0)
    .sort((a, b) => b.count - a.count);

  if (otherCount > 0) {
    groups.push({
      id: 'other',
      label: 'Autres connexions contextuelles',
      sampleNotation: '節 / 疑問詞 + 〜',
      queryToken: '',
      count: otherCount,
    });
  }

  return groups;
}
