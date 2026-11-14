import type { UnifiedKanjiRecord } from '@/lib/db';

/**
 * Maps KanjiAlive private-use-area / extended radical codepoints present in
 * `radicaux_liste.json` to standard printable CJK / Kangxi characters so
 * browsers never render missing-glyph tofu boxes.
 */
const PUA_RADICAL_MAP: Record<number, string> = {
  0xe700: '穴',
  0xe701: '麻',
  0xe702: '舟',
  0xe703: '歹',
  0xe704: '言',
  0xe705: '巾',
  0xe706: '白',
  0xe707: '八',
  0xe708: '日',
  0xe709: '火',
  0xe710: '矛',
  0xe711: '骨',
  0xe712: '方',
  0xe713: '石',
  0xe714: '至',
  0xe715: '糸',
  0xe716: '貝',
  0xe717: '金',
  0xe718: '片',
  0xe719: '牙',
  0xe720: '木',
  0xe721: '子',
  0xe722: '米',
  0xe723: '口',
  0xe724: '車',
  0xe725: '豆',
  0xe726: '目',
  0xe727: '身',
  0xe728: '耳',
  0xe729: '虫',
  0xe730: '釆',
  0xe731: '丿',
  0xe732: '女',
  0xe733: '王',
  0xe734: '士',
  0xe735: '里',
  0xe736: '走',
  0xe737: '寸',
  0xe738: '田',
  0xe739: '工',
  0xe740: '谷',
  0xe741: '立',
  0xe742: '戸',
  0xe743: '酉',
  0xe744: '土',
  0xe745: '角',
  0xe746: '馬',
  0xe747: '魚',
  0xe748: '牛',
  0xe749: '矢',
  0xe750: '山',
  0xe751: '山',
  0xe752: '弓',
  0xe753: '瓜',
  0xe754: '革',
  0xe755: '牙',
  0xe756: '牙',
  0xe757: '舛',
  0xe758: '月',
  0xe759: '罒',
  0xfa1e: '羽',
  0x201a2: '人',
  0x26270: '罒',
};

export function normalizeRadicalGlyph(radical: string | undefined | null): string {
  if (!radical) return '?';
  const code = radical.codePointAt(0);
  if (code !== undefined && PUA_RADICAL_MAP[code]) {
    return PUA_RADICAL_MAP[code];
  }
  return radical.normalize('NFKC');
}

export interface FrequencyEntry {
  id: string;
  label: string;
  shortLabel: string;
  rank: number;
  detail?: string;
  isTop: boolean;
}

export function getAllFrequencyEntries(
  freqs: UnifiedKanjiRecord['frequencies'] | undefined
): FrequencyEntry[] {
  if (!freqs) return [];

  const raw: Array<Omit<FrequencyEntry, 'isTop'>> = [];

  if (typeof freqs.innocent_rank === 'number' && freqs.innocent_rank > 0) {
    raw.push({
      id: 'innocent',
      label: 'Fiction (Innocent)',
      shortLabel: 'Fic',
      rank: freqs.innocent_rank,
      detail:
        typeof freqs.innocent_count === 'number'
          ? `${freqs.innocent_count.toLocaleString()} occ.`
          : undefined,
    });
  }
  if (typeof freqs.wikipedia === 'number' && freqs.wikipedia > 0) {
    raw.push({
      id: 'wikipedia',
      label: 'Wikipedia',
      shortLabel: 'Wiki',
      rank: freqs.wikipedia,
    });
  }
  if (typeof freqs.aozora === 'number' && freqs.aozora > 0) {
    raw.push({
      id: 'aozora',
      label: 'Aozora Bunko',
      shortLabel: 'Ao',
      rank: freqs.aozora,
    });
  }
  if (typeof freqs.news === 'number' && freqs.news > 0) {
    raw.push({
      id: 'news',
      label: 'News',
      shortLabel: 'News',
      rank: freqs.news,
    });
  }
  if (typeof freqs.twitter === 'number' && freqs.twitter > 0) {
    raw.push({
      id: 'twitter',
      label: 'Twitter',
      shortLabel: 'Tw',
      rank: freqs.twitter,
    });
  }

  raw.sort((a, b) => a.rank - b.rank);
  return raw.map((entry, idx) => ({
    ...entry,
    isTop: idx === 0,
  }));
}

