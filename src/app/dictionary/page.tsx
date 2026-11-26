'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUser } from '@clerk/nextjs';
import { toHiragana, toKatakana, isRomaji } from 'wanakana';
import { localDb, type JukugoRecord, type UnifiedKanjiRecord } from '@/lib/db';
import { enqueueSyncAction } from '@/lib/sync';
import {
  classifyJapaneseScript,
  computeJukugoFrequencyScore10,
  computeKanjiFrequencyScore10,
  type ScriptType,
} from '@/lib/frequencyScale';
import { SpriteThumbnail } from '@/components/media/SpriteThumbnail';
import {
  Bookmark,
  BookMarked,
  Layers,
  Library,
  Quote,
  Search,
  Sparkles,
} from 'lucide-react';

type DictTab = 'jukugo' | 'polysemy' | 'affixes' | 'proverbs' | 'groups';
type LengthFilter = 'ALL' | '2' | '3' | '4+';
type GroupTab = 'similar' | 'synonyms' | 'antonyms' | 'homonyms';

interface AffixItem {
  kanji: string;
  role: 'prefix' | 'suffix' | 'both';
  reading: string;
  meaningFr: string;
  level: string;
  examples: string[];
}

interface SetsuzokushiItem {
  term: string;
  reading: string;
  group: string;
  level: string;
  meaningFr: string;
  example: string;
}

interface ProverbItem {
  id: string;
  kind: 'proverb' | 'citation';
  jp: string;
  reading: string;
  literalFr: string;
  equivalentFr: string;
  level: string;
  theme: string;
}

const SCRIPT_LABELS: Record<ScriptType | 'ALL', string> = {
  ALL: 'Tous scripts',
  hira_only: 'Hiragana seul',
  kata_only: 'Katakana seul',
  mixed_hira_kata: 'Mixte Hira + Kata',
  mixed_kanji: 'Mixte Kanji',
  mixed_romaji: 'Mixte Romaji / ASCII',
};

const POS_LABELS: Record<string, string> = {
  ALL: 'Toutes natures',
  noun: 'Noms',
  verb_ichidan: 'Verbes Ichidan (1段)',
  verb_godan: 'Verbes Godan (5段)',
  verb_irregular: 'Verbes Irréguliers (する/来る)',
  adj_i: 'Adjectifs -い',
  adj_na: 'Adjectifs -な',
  adverb: 'Adverbes',
  conjunction: 'Conjonctions',
  preposition: 'Prépositions / Postpositions',
  interjection: 'Interjections',
  expression: 'Expressions',
};

function DictionaryContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const { isSignedIn } = useUser();

  const [tab, setTab] = useState<DictTab>('jukugo');
  const [query, setQuery] = useState(initialQuery);
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [lengthFilter, setLengthFilter] = useState<LengthFilter>('ALL');
  const [posFilter, setPosFilter] = useState('ALL');
  const [scriptFilter, setScriptFilter] = useState<ScriptType | 'ALL'>('ALL');
  const [transitivityFilter, setTransitivityFilter] = useState('ALL');
  const [groupKind, setGroupKind] = useState<GroupTab>('synonyms');
  const [limit, setLimit] = useState(40);
  const [toast, setToast] = useState<string | null>(null);

  const [affixes, setAffixes] = useState<AffixItem[]>([]);
  const [setsuzokushi, setSetsuzokushi] = useState<SetsuzokushiItem[]>([]);
  const [proverbs, setProverbs] = useState<ProverbItem[]>([]);

  useEffect(() => {
    let active = true;
    fetch('/data/affixes_setsuzokushi.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active || !d) return;
        setAffixes(Array.isArray(d.affixes) ? d.affixes : []);
        setSetsuzokushi(Array.isArray(d.setsuzokushi) ? d.setsuzokushi : []);
      })
      .catch(() => {});

    fetch('/data/proverbs_citations.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active || !d) return;
        setProverbs(Array.isArray(d.items) ? d.items : []);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const jukugoRows = useLiveQuery(async () => {
    if (tab !== 'jukugo') return [] as JukugoRecord[];
    const rawQ = query.trim().toLowerCase();
    const hiraQ = isRomaji(rawQ) ? toHiragana(rawQ) : rawQ;
    const kataQ = isRomaji(rawQ) ? toKatakana(rawQ) : rawQ;

    const base =
      levelFilter !== 'ALL'
        ? localDb.jukugo.where('jlpt').equals(levelFilter)
        : localDb.jukugo.orderBy('frequency').reverse();

    const filtered = await base
      .filter((j) => {
        const kCount = j.kanjiCount ?? (j.word.match(/[\u4e00-\u9faf\u3400-\u4dbf]/g)?.length || 0);
        if (lengthFilter === '2' && kCount !== 2) return false;
        if (lengthFilter === '3' && kCount !== 3) return false;
        if (lengthFilter === '4+' && kCount < 4) return false;

        if (posFilter !== 'ALL' && (j.pos || 'noun') !== posFilter) return false;
        const script = j.scriptType || classifyJapaneseScript(j.word);
        if (scriptFilter !== 'ALL' && script !== scriptFilter) return false;
        if (transitivityFilter !== 'ALL' && (j.transitivity || 'none') !== transitivityFilter) {
          return false;
        }
        if (!rawQ) return true;
        return (
          j.word.toLowerCase().includes(rawQ) ||
          j.word.includes(hiraQ) ||
          j.word.includes(kataQ) ||
          j.reading.toLowerCase().includes(rawQ) ||
          j.reading.includes(hiraQ) ||
          j.meaning_en.toLowerCase().includes(rawQ)
        );
      })
      .limit(limit)
      .toArray();

    return filtered;
  }, [tab, query, levelFilter, lengthFilter, posFilter, scriptFilter, transitivityFilter, limit]);

  const polysemyKanjis = useLiveQuery(async () => {
    if (tab !== 'polysemy') return [] as UnifiedKanjiRecord[];
    const rawQ = query.trim().toLowerCase();
    const rows = await localDb.kanjis
      .filter((k) => {
        if (levelFilter !== 'ALL' && k.jlpt !== levelFilter) return false;
        const probs = k.senseProbabilities || [];
        if (probs.length < 2) return false;
        if (!rawQ) return true;
        return (
          k.kanji.includes(rawQ) ||
          probs.some((p) => p.meaning.toLowerCase().includes(rawQ))
        );
      })
      .limit(limit)
      .toArray();
    return rows;
  }, [tab, query, levelFilter, limit]);

  const groupKanjis = useLiveQuery(async () => {
    if (tab !== 'groups') return [] as UnifiedKanjiRecord[];
    const rawQ = query.trim().toLowerCase();
    return localDb.kanjis
      .filter((k) => {
        if (levelFilter !== 'ALL' && k.jlpt !== levelFilter) return false;
        const arr = k[groupKind] || [];
        if (arr.length === 0) return false;
        if (!rawQ) return true;
        return k.kanji.includes(rawQ) || arr.some((c) => c.includes(rawQ));
      })
      .limit(limit)
      .toArray();
  }, [tab, groupKind, query, levelFilter, limit]);

  const handleBookmark = async (
    type: 'KANJI' | 'VOCAB' | 'GRAMMAR',
    kanjiOrWord: string,
    reading: string,
    meaning: string,
    level: string
  ) => {
    const payload = {
      bookmarkId: `bm_${crypto.randomUUID()}`,
      type,
      kanjiOrWord,
      reading,
      meaning: meaning.slice(0, 180),
      level,
      createdAt: new Date().toISOString(),
      isSynced: 0 as const,
    };
    await localDb.bookmarks.add(payload);
    await enqueueSyncAction('SAVE_BOOKMARK', payload, Boolean(isSignedIn));
    setToast(`« ${kanjiOrWord} » enregistré dans votre carnet !`);
    setTimeout(() => setToast(null), 2500);
  };

  const filteredAffixes = affixes.filter((a) => {
    if (levelFilter !== 'ALL' && a.level !== levelFilter) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      a.kanji.includes(q) ||
      a.reading.includes(q) ||
      a.meaningFr.toLowerCase().includes(q) ||
      a.examples.some((e) => e.toLowerCase().includes(q))
    );
  });

  const filteredSetsuzokushi = setsuzokushi.filter((s) => {
    if (levelFilter !== 'ALL' && s.level !== levelFilter) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      s.term.includes(q) ||
      s.meaningFr.toLowerCase().includes(q) ||
      s.group.toLowerCase().includes(q)
    );
  });

  const filteredProverbs = proverbs.filter((p) => {
    if (levelFilter !== 'ALL' && p.level !== levelFilter) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      p.jp.includes(q) ||
      p.reading.includes(q) ||
      p.equivalentFr.toLowerCase().includes(q) ||
      p.literalFr.toLowerCase().includes(q) ||
      p.theme.toLowerCase().includes(q)
    );
  });

  return (
    <div className="dict-page">
      <div className="dict-page__header">
        <div>
          <div className="dict-page__badge">
            <Library className="w-4 h-4" />
            <span>Dictionnaire Unifié • 33 425 Jukugo • N5 → N0</span>
          </div>
          <h1 className="dict-page__title">Dictionnaires Lexicaux, Scripts &amp; Polysémie</h1>
          <p className="dict-page__subtitle">
            Explorez les mots composés (2, 3, 4+ kanjis), les scripts (hiragana, katakana, mixtes,
            romaji), la polysémie pondérée en %, les affixes, 接続詞 et proverbes.
          </p>
        </div>
      </div>

      {toast && (
        <div role="status" aria-live="polite" className="dict-page__toast">
          {toast}
        </div>
      )}

      <div className="dict-page__tabs" role="tablist" aria-label="Sections du dictionnaire">
        {(
          [
            { id: 'jukugo', label: 'Jukugo & Scripts', icon: Search },
            { id: 'polysemy', label: 'Polysémie (%)', icon: Sparkles },
            { id: 'affixes', label: 'Affixes & 接続詞', icon: Layers },
            { id: 'proverbs', label: 'Proverbes & Citations', icon: Quote },
            { id: 'groups', label: 'Groupes de Kanji', icon: BookMarked },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                setTab(t.id);
                setLimit(40);
              }}
              className={`dict-page__tab ${tab === t.id ? 'dict-page__tab--active' : ''}`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="dict-filters">
        <div className="dict-filters__search-wrap">
          <Search className="dict-filters__search-icon" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un mot, romaji, sens ou kanji..."
            aria-label="Rechercher dans le dictionnaire"
            className="dict-filters__search-input"
          />
        </div>

        <select
          aria-label="Filtrer par niveau JLPT"
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="dict-filters__select"
        >
          <option value="ALL">Tous niveaux (N5–N0)</option>
          <option value="N5">N5</option>
          <option value="N4">N4</option>
          <option value="N3">N3</option>
          <option value="N2">N2</option>
          <option value="N1">N1</option>
          <option value="N0">N0 (Quotidien)</option>
        </select>

        {tab === 'jukugo' && (
          <>
            <select
              aria-label="Nombre de kanjis"
              value={lengthFilter}
              onChange={(e) => setLengthFilter(e.target.value as LengthFilter)}
              className="dict-filters__select"
            >
              <option value="ALL">Longueur : Tous</option>
              <option value="2">2 kanjis</option>
              <option value="3">3 kanjis</option>
              <option value="4+">4+ kanjis</option>
            </select>

            <select
              aria-label="Type d'alphabet / script"
              value={scriptFilter}
              onChange={(e) => setScriptFilter(e.target.value as ScriptType | 'ALL')}
              className="dict-filters__select"
            >
              {Object.entries(SCRIPT_LABELS).map(([k, lbl]) => (
                <option key={k} value={k}>
                  {lbl}
                </option>
              ))}
            </select>

            <select
              aria-label="Catégorie grammaticale"
              value={posFilter}
              onChange={(e) => setPosFilter(e.target.value)}
              className="dict-filters__select"
            >
              {Object.entries(POS_LABELS).map(([k, lbl]) => (
                <option key={k} value={k}>
                  {lbl}
                </option>
              ))}
            </select>

            <select
              aria-label="Transitivité verbale"
              value={transitivityFilter}
              onChange={(e) => setTransitivityFilter(e.target.value)}
              className="dict-filters__select"
            >
              <option value="ALL">自動 / 他動 : Tous</option>
              <option value="jidoushi">自動詞 (Intransitif)</option>
              <option value="tadoushi">他動詞 (Transitif)</option>
              <option value="both">自動・他動 (Les deux)</option>
            </select>
          </>
        )}

        {tab === 'groups' && (
          <select
            aria-label="Type de groupe de kanjis"
            value={groupKind}
            onChange={(e) => setGroupKind(e.target.value as GroupTab)}
            className="dict-filters__select"
          >
            <option value="synonyms">Sens proche (Synonymes)</option>
            <option value="antonyms">Sens opposé (Antonymes)</option>
            <option value="homonyms">Même lecture (Homophones)</option>
            <option value="similar">Ressemblance visuelle</option>
          </select>
        )}
      </div>

      {tab === 'jukugo' && (
        <div className="dict-grid">
          {(jukugoRows || []).map((j) => {
            const score10 = j.frequencyScore10 ?? computeJukugoFrequencyScore10(j.frequency);
            const script = j.scriptType || classifyJapaneseScript(j.word);
            return (
              <article key={j.word} className="dict-card">
                <div className="dict-card__head">
                  <div className="flex items-center gap-3 min-w-0">
                    <SpriteThumbnail
                      itemKey={`jukugo:${j.word}`}
                      fallbackLabel={j.word}
                      images={j.images}
                      size={44}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="dict-card__word">{j.word}</h2>
                        <span className="dict-card__pill">{j.jlpt || 'N0'}</span>
                        <span className="dict-card__pill dict-card__pill--muted">
                          Fréq. {score10}/10
                        </span>
                      </div>
                      <div className="dict-card__reading">{j.reading}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Sauvegarder ${j.word}`}
                    onClick={() =>
                      void handleBookmark('VOCAB', j.word, j.reading, j.meaning_en, j.jlpt || 'N0')
                    }
                    className="dict-card__bookmark"
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                </div>

                <p className="dict-card__meaning">{j.meaning_en}</p>

                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="dict-card__tag">{SCRIPT_LABELS[script]}</span>
                  {j.pos && <span className="dict-card__tag">{POS_LABELS[j.pos] || j.pos}</span>}
                  {j.transitivity && j.transitivity !== 'none' && (
                    <span className="dict-card__tag">
                      {j.transitivity === 'jidoushi'
                        ? '自動詞'
                        : j.transitivity === 'tadoushi'
                          ? '他動詞'
                          : '自動・他動'}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {tab === 'polysemy' && (
        <div className="dict-grid">
          {(polysemyKanjis || []).map((k) => {
            const probs = k.senseProbabilities || [];
            const score10 = k.frequencyScore10 ?? computeKanjiFrequencyScore10(k.frequencies);
            return (
              <article key={k.kanji} className="dict-card">
                <div className="dict-card__head">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/kanji?q=${encodeURIComponent(k.kanji)}`}
                      className="text-3xl font-serif font-bold text-sky-300 hover:text-sky-200"
                    >
                      {k.kanji}
                    </Link>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="dict-card__pill">{k.jlpt}</span>
                        <span className="dict-card__pill dict-card__pill--muted">
                          {probs.length} sens · Fréq. {score10}/10
                        </span>
                      </div>
                      <div className="dict-card__reading">
                        {[...k.on_readings.slice(0, 2), ...k.kun_readings.slice(0, 2)].join(' • ')}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Collectionner ${k.kanji}`}
                    onClick={() =>
                      void handleBookmark(
                        'KANJI',
                        k.kanji,
                        k.kun_readings[0] || k.on_readings[0] || '',
                        probs.map((p) => `${p.meaning} (${p.percent}%)`).join(' / '),
                        k.jlpt
                      )
                    }
                    className="dict-card__bookmark"
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col gap-2 mt-1">
                  {probs.map((p, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs text-slate-200">
                        <span>{p.meaning}</span>
                        <span className="font-bold text-sky-300">{p.percent} %</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-sky-500"
                          style={{ width: `${p.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {tab === 'affixes' && (
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="text-lg font-bold text-slate-100 mb-3">
              Kanji Préfixes &amp; Suffixes ({filteredAffixes.length})
            </h2>
            <div className="dict-grid">
              {filteredAffixes.map((a) => (
                <article key={`${a.role}-${a.kanji}`} className="dict-card">
                  <div className="dict-card__head">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-serif font-bold text-amber-300">{a.kanji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="dict-card__pill">{a.level}</span>
                          <span className="dict-card__pill dict-card__pill--muted">
                            {a.role === 'prefix'
                              ? 'Préfixe (接頭辞)'
                              : a.role === 'suffix'
                                ? 'Suffixe (接尾辞)'
                                : 'Préfixe / Suffixe'}
                          </span>
                        </div>
                        <div className="dict-card__reading">{a.reading}</div>
                      </div>
                    </div>
                  </div>
                  <p className="dict-card__meaning">{a.meaningFr}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {a.examples.map((ex, i) => (
                      <span key={i} className="dict-card__tag">
                        {ex}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-100 mb-3">
              Mots de Transition — 接続詞 ({filteredSetsuzokushi.length})
            </h2>
            <div className="dict-grid">
              {filteredSetsuzokushi.map((s) => (
                <article key={s.term} className="dict-card">
                  <div className="dict-card__head">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="dict-card__word">{s.term}</h3>
                        <span className="dict-card__pill">{s.level}</span>
                        <span className="dict-card__pill dict-card__pill--muted">{s.group}</span>
                      </div>
                      {s.reading !== s.term && (
                        <div className="dict-card__reading">{s.reading}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={`Sauvegarder ${s.term}`}
                      onClick={() =>
                        void handleBookmark('GRAMMAR', s.term, s.reading, s.meaningFr, s.level)
                      }
                      className="dict-card__bookmark"
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="dict-card__meaning">{s.meaningFr}</p>
                  <p className="text-xs text-slate-400 bg-slate-950/70 rounded-lg p-2 border border-slate-800">
                    {s.example}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === 'proverbs' && (
        <div className="dict-grid">
          {filteredProverbs.map((p) => (
            <article key={p.id} className="dict-card">
              <div className="dict-card__head">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="dict-card__pill">{p.level}</span>
                    <span className="dict-card__pill dict-card__pill--muted">
                      {p.kind === 'proverb' ? 'Proverbe (ことわざ)' : 'Citation'} · {p.theme}
                    </span>
                  </div>
                  <h2 className="dict-card__word mt-1">{p.jp}</h2>
                  <div className="dict-card__reading">{p.reading}</div>
                </div>
                <button
                  type="button"
                  aria-label={`Sauvegarder ${p.jp}`}
                  onClick={() =>
                    void handleBookmark('VOCAB', p.jp, p.reading, p.equivalentFr, p.level)
                  }
                  className="dict-card__bookmark"
                >
                  <Bookmark className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400 italic">Littéral : {p.literalFr}</p>
              <p className="dict-card__meaning">{p.equivalentFr}</p>
            </article>
          ))}
        </div>
      )}

      {tab === 'groups' && (
        <div className="dict-grid">
          {(groupKanjis || []).map((k) => {
            const related = k[groupKind] || [];
            return (
              <article key={k.kanji} className="dict-card">
                <div className="dict-card__head">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/kanji?q=${encodeURIComponent(k.kanji)}`}
                      className="text-3xl font-serif font-bold text-sky-300 hover:text-sky-200"
                    >
                      {k.kanji}
                    </Link>
                    <div>
                      <span className="dict-card__pill">{k.jlpt}</span>
                      <div className="dict-card__reading">
                        {(k.meanings_fr.filter((m) => m && m !== '-')[0] || k.meanings_en[0] || '')}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {related.map((relChar) => (
                    <Link
                      key={relChar}
                      href={`/kanji?q=${encodeURIComponent(relChar)}`}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-700 bg-slate-950 font-serif text-lg text-slate-100 hover:border-sky-400 hover:text-sky-300 transition-colors"
                    >
                      {relChar}
                    </Link>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {(tab === 'jukugo' || tab === 'polysemy' || tab === 'groups') && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setLimit((v) => v + 40)}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer"
          >
            Charger plus d’entrées
          </button>
        </div>
      )}
    </div>
  );
}

export default function DictionaryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Chargement du dictionnaire...</div>}>
      <DictionaryContent />
    </Suspense>
  );
}
