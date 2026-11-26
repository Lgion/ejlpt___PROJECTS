export type NewsJLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface DailyNewsVocabHighlight {
  term: string;
  reading: string;
  meaningFr: string;
}

export interface DailyNewsArticle {
  id: string;
  dateKey: string;
  level: NewsJLPTLevel;
  titleJa: string;
  titleFr: string;
  summaryFr: string;
  bodyJa: string;
  sourceName: string;
  sourceUrl: string;
  origin: 'rss_nhk' | 'ai_adapted' | 'offline_seed';
  vocabHighlights: DailyNewsVocabHighlight[];
  createdAt: string;
}

export interface RssHeadlineItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

export const NEWS_JLPT_LEVELS: NewsJLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

export function getTodayUtcDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function stripCdataAndTags(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractXmlTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  return m ? stripCdataAndTags(m[1]) : '';
}

export function parseRssXmlItems(xml: string): RssHeadlineItem[] {
  if (!xml || !xml.includes('<item')) return [];
  const items: RssHeadlineItem[] = [];
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const title = extractXmlTag(block, 'title');
    const link = extractXmlTag(block, 'link');
    const description = extractXmlTag(block, 'description');
    const pubDate = extractXmlTag(block, 'pubDate');
    if (title) {
      items.push({ title, link, description, pubDate });
    }
  }
  return items;
}

export async function fetchNhkRssHeadlines(timeoutMs = 4500): Promise<RssHeadlineItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://www3.nhk.or.jp/rss/news/cat0.xml', {
      signal: controller.signal,
      headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssXmlItems(xml).slice(0, 10);
  } catch {
    clearTimeout(timer);
    return [];
  }
}

export function getOfflineDailyNewsForDate(dateKey: string): DailyNewsArticle[] {
  const nowIso = new Date().toISOString();
  return [
    {
      id: `seed-${dateKey}-N5`,
      dateKey,
      level: 'N5',
      titleJa: 'きょうの てんき と まちの こうえん',
      titleFr: 'La météo du jour et le parc du quartier',
      summaryFr:
        'Il fait beau aujourd’hui à Tokyo. Beaucoup de familles se promènent au parc et mangent sous les arbres.',
      bodyJa:
        'きょうは いい てんきです。あさから あたたかいです。たくさんの ひとが こうえんへ いきます。こどもたちは ともだちと あそびます。みんな とても たのしそうです。',
      sourceName: 'Édition pédagogique eJLPT',
      sourceUrl: 'https://www3.nhk.or.jp/news/',
      origin: 'offline_seed',
      vocabHighlights: [
        { term: '天気', reading: 'てんき', meaningFr: 'météo / temps qu’il fait' },
        { term: '公園', reading: 'こうえん', meaningFr: 'parc public' },
        { term: '暖かい', reading: 'あたたかい', meaningFr: 'chaud / doux (climat)' },
      ],
      createdAt: nowIso,
    },
    {
      id: `seed-${dateKey}-N4`,
      dateKey,
      level: 'N4',
      titleJa: '新しい図書館が駅の近くにオープンしました',
      titleFr: 'Une nouvelle bibliothèque a ouvert près de la gare',
      summaryFr:
        'Une bibliothèque publique moderne vient d’ouvrir à trois minutes de la gare. Les étudiants peuvent y emprunter des livres et utiliser le Wi-Fi gratuitement.',
      bodyJa:
        '今週の月曜日、駅の近くに新しい図書館がオープンしました。二階には静かに勉強できる部屋があり、高校生や大学生がたくさん利用しています。週末には子ども向けの読み聞かせのイベントも開かれる予定です。',
      sourceName: 'Édition pédagogique eJLPT',
      sourceUrl: 'https://www3.nhk.or.jp/news/',
      origin: 'offline_seed',
      vocabHighlights: [
        { term: '図書館', reading: 'としょかん', meaningFr: 'bibliothèque' },
        { term: '利用する', reading: 'りようする', meaningFr: 'utiliser / fréquenter' },
        { term: '予定', reading: 'よてい', meaningFr: 'prévision / programme' },
      ],
      createdAt: nowIso,
    },
    {
      id: `seed-${dateKey}-N3`,
      dateKey,
      level: 'N3',
      titleJa: '自転車の利用を増やす新しい取り組みが始まる',
      titleFr: 'Une nouvelle initiative lancée pour encourager l’usage du vélo',
      summaryFr:
        'La municipalité teste un réseau de vélos partagés devant les gares principales afin de réduire les embouteillages et les émissions de CO₂.',
      bodyJa:
        '市は通勤や通学での自動車利用を減らすため、主要な駅前にシェアサイクルの駐輪場を増やす方針を発表した。スマートフォンのアプリを使えば、二十四時間いつでも簡単に借りることができる。環境に優しい移動手段として定着するか注目されている。',
      sourceName: 'Édition pédagogique eJLPT',
      sourceUrl: 'https://www3.nhk.or.jp/news/',
      origin: 'offline_seed',
      vocabHighlights: [
        { term: '通勤', reading: 'つうきん', meaningFr: 'trajet domicile-travail' },
        { term: '方針', reading: 'ほうしん', meaningFr: 'ligne directrice / politique' },
        { term: '注目', reading: 'ちゅうもく', meaningFr: 'attention / intérêt suscité' },
      ],
      createdAt: nowIso,
    },
    {
      id: `seed-${dateKey}-N2`,
      dateKey,
      level: 'N2',
      titleJa: '地方の伝統工芸とデジタル技術の融合',
      titleFr: 'L’alliance de l’artisanat régional et du numérique',
      summaryFr:
        'De jeunes artisans japonais utilisent l’impression 3D et les réseaux sociaux pour faire découvrir les techniques traditionnelles de poterie à l’étranger.',
      bodyJa:
        '後継者不足が課題となっている地方の伝統工芸の分野で、デジタル技術を取り入れて新たな販路を開拓する動きが広がっている。職人が制作過程を動画で発信することで海外からの注文が増加しており、文化の継承と収益改善の両立が期待されている。',
      sourceName: 'Édition pédagogique eJLPT',
      sourceUrl: 'https://www3.nhk.or.jp/news/',
      origin: 'offline_seed',
      vocabHighlights: [
        { term: '後継者', reading: 'こうけいしゃ', meaningFr: 'successeur / relève' },
        { term: '販路', reading: 'はんろ', meaningFr: 'débouché commercial' },
        { term: '両立', reading: 'りょうりつ', meaningFr: 'conciliation (de deux objectifs)' },
      ],
      createdAt: nowIso,
    },
    {
      id: `seed-${dateKey}-N1`,
      dateKey,
      level: 'N1',
      titleJa: '再生可能エネルギー導入拡大に向けた送電網の刷新',
      titleFr: 'Modernisation du réseau électrique pour l’essor des énergies renouvelables',
      summaryFr:
        'Le ministère examine un plan de renforcement des lignes à haute tension inter-régionales afin d’absorber les surplus solaires et éoliens.',
      bodyJa:
        '脱炭素社会の実現を見据え、地域間で電力を融通する広域連系線の整備が急務となっている。天候に左右されやすい太陽光や風力の発電割合が高まるなか、蓄電池の導入と並行して需給調整の枠組みを再構築することが、安定した電力供給の鍵を握る。',
      sourceName: 'Édition pédagogique eJLPT',
      sourceUrl: 'https://www3.nhk.or.jp/news/',
      origin: 'offline_seed',
      vocabHighlights: [
        { term: '見据える', reading: 'みすえる', meaningFr: 'garder les yeux fixés sur / anticiper' },
        { term: '急務', reading: 'きゅうむ', meaningFr: 'tâche urgente / impératif' },
        { term: '需給', reading: 'じゅきゅう', meaningFr: 'offre et demande' },
      ],
      createdAt: nowIso,
    },
  ];
}
