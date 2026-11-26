'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Volume2, Eye, EyeOff, PlusCircle, ExternalLink, Sparkles } from 'lucide-react';
import { MEMORIZE_SENTENCES, SHORT_STORIES_AND_SONGS } from '@/data/immersionCorpus';
import { recordErrorToSRS } from '@/lib/srs';

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

export function MemorizeAndProverbsTab() {
  const [subTab, setSubTab] = useState<'sentences' | 'stories' | 'proverbs'>('sentences');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [clozeHidden, setClozeHidden] = useState<boolean>(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [showTranslations, setShowTranslations] = useState<boolean>(true);
  const [srsToast, setSrsToast] = useState<string | null>(null);

  const [proverbs, setProverbs] = useState<ProverbItem[]>([]);
  const [proverbIdx, setProverbIdx] = useState(0);
  const [proverbSelected, setProverbSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/proverbs_citations.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { items?: ProverbItem[] } | null) => {
        if (data?.items) setProverbs(data.items);
      })
      .catch(() => undefined);
  }, []);

  const filteredSentences = useMemo(() => {
    if (levelFilter === 'ALL') return MEMORIZE_SENTENCES;
    return MEMORIZE_SENTENCES.filter((s) => s.level === levelFilter);
  }, [levelFilter]);

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  const addSentenceToSrs = async (jp: string, reading: string, meaningFr: string, level: string) => {
    await recordErrorToSRS({
      cardId: `jukugo:${jp.slice(0, 12)}`,
      itemType: 'GRAMMAR',
      itemKey: jp,
      level,
      prompt: `Traduire ou réciter : ${meaningFr}`,
      reading,
      answer: jp,
    });
    setSrsToast(`Phrase ajoutée à votre file SRS (${level}) !`);
    setTimeout(() => setSrsToast(null), 2500);
  };

  const activeProverb = proverbs[proverbIdx % Math.max(1, proverbs.length)] || null;
  const proverbOptions = useMemo(() => {
    if (!activeProverb || proverbs.length < 4) return [];
    const others = proverbs.filter((p) => p.id !== activeProverb.id).slice(0, 3);
    const pool = [activeProverb, ...others];
    const shift = proverbIdx % pool.length;
    return [...pool.slice(shift), ...pool.slice(0, shift)];
  }, [activeProverb, proverbs, proverbIdx]);

  return (
    <div className="space-y-5">
      <div className="imm-subtabs">
        <button
          type="button"
          onClick={() => setSubTab('sentences')}
          className={`imm-subtab ${subTab === 'sentences' ? 'imm-subtab--active' : ''}`}
        >
          Phrases par cœur JLPT ({MEMORIZE_SENTENCES.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('stories')}
          className={`imm-subtab ${subTab === 'stories' ? 'imm-subtab--active' : ''}`}
        >
          Textes courts, Fables &amp; Chansons ({SHORT_STORIES_AND_SONGS.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('proverbs')}
          className={`imm-subtab ${subTab === 'proverbs' ? 'imm-subtab--active' : ''}`}
        >
          Proverbes &amp; Quiz FR → JA ({proverbs.length})
        </button>
      </div>

      {srsToast && <div className="imm-toast">{srsToast}</div>}

      {subTab === 'sentences' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {['ALL', 'N5', 'N4', 'N3', 'N2', 'N1'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevelFilter(lvl)}
                  className={`imm-chip ${levelFilter === lvl ? 'imm-chip--active' : ''}`}
                >
                  {lvl === 'ALL' ? 'Tous niveaux' : lvl}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setClozeHidden((v) => !v);
                setRevealedIds({});
              }}
              className="imm-toggle-btn"
            >
              {clozeHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{clozeHidden ? 'Réafficher le motif clé' : 'Mode Par Cœur (masquer mot clé)'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredSentences.map((s) => {
              const hiddenNow = clozeHidden && !revealedIds[s.id];
              const displayJp = hiddenNow ? s.jp.replace(s.clozeWord, '【 ？ 】') : s.jp;
              return (
                <article key={s.id} className="imm-card">
                  <div className="flex items-center justify-between gap-2">
                    <span className="imm-pill">{s.level} • {s.pattern}</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => speak(s.jp)}
                        aria-label={`Écouter ${s.jp}`}
                        className="imm-icon-btn"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void addSentenceToSrs(s.jp, s.reading, s.naturalFr, s.level)}
                        className="imm-icon-btn"
                        title="Ajouter au SRS"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                    </div>
                  </div>
                  <div className="text-base font-extrabold text-white mt-2" lang="ja">
                    {displayJp}
                  </div>
                  {!hiddenNow && (
                    <div className="text-xs text-sky-400 mt-1" lang="ja">
                      {s.reading}
                    </div>
                  )}
                  <div className="text-xs text-slate-300 mt-2">
                    <strong>FR :</strong> {s.naturalFr}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Littéral : {s.literalFr}
                  </div>
                  {hiddenNow && (
                    <button
                      type="button"
                      onClick={() => setRevealedIds((p) => ({ ...p, [s.id]: true }))}
                      className="mt-2 text-xs font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                    >
                      Révéler la réponse
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {subTab === 'stories' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowTranslations((v) => !v)}
              className="imm-toggle-btn"
            >
              {showTranslations ? 'Masquer traduction FR' : 'Afficher traduction FR'}
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {SHORT_STORIES_AND_SONGS.map((story) => {
              const joinedText = story.lines.map((l) => l.jp).join('\n');
              return (
                <article key={story.id} className="imm-card space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="imm-pill">{story.level} • {story.kind}</span>
                      <h3 className="text-base font-extrabold text-white mt-1.5">{story.title}</h3>
                      <p className="text-[11px] text-slate-400">{story.sourceNote}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => speak(joinedText)}
                        aria-label={`Écouter ${story.title}`}
                        className="imm-icon-btn"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <Link
                        href={`/reader?text=${encodeURIComponent(joinedText)}`}
                        className="imm-icon-btn text-sky-300"
                        title="Analyser dans Script 2 List"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                  <div className="space-y-2 border-t border-slate-800 pt-2">
                    {story.lines.map((line, i) => (
                      <div key={i} className="rounded-lg bg-slate-900/70 p-2.5">
                        <div className="text-sm font-bold text-slate-100" lang="ja">
                          {line.jp}
                        </div>
                        <div className="text-[11px] text-sky-400" lang="ja">
                          {line.reading}
                        </div>
                        {showTranslations && (
                          <div className="text-xs text-slate-300 mt-1">{line.fr}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {subTab === 'proverbs' && activeProverb && (
        <div className="space-y-4">
          <div className="imm-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="imm-pill">
                <Sparkles className="w-3 h-3 inline mr-1" />
                Quiz Proverbe FR → JA ({proverbIdx + 1} / {proverbs.length})
              </span>
              <span className="text-xs text-slate-400">
                {activeProverb.level} • {activeProverb.theme}
              </span>
            </div>
            <div className="text-sm font-bold text-slate-100">
              Quel proverbe japonais correspond à : « {activeProverb.equivalentFr} » ?
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {proverbOptions.map((opt) => {
                const answered = proverbSelected !== null;
                const isRight = opt.id === activeProverb.id;
                const isPicked = proverbSelected === opt.id;
                let mod = '';
                if (answered) {
                  if (isRight) mod = 'border-emerald-500 bg-emerald-950/60 text-emerald-200';
                  else if (isPicked) mod = 'border-rose-500 bg-rose-950/60 text-rose-200';
                }
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={answered}
                    onClick={() => setProverbSelected(opt.id)}
                    className={`rounded-xl border border-slate-700 bg-slate-900 p-3 text-left text-xs font-bold text-slate-100 cursor-pointer ${mod}`}
                  >
                    <div className="text-sm" lang="ja">{opt.jp}</div>
                    <div className="text-[11px] text-sky-400 font-normal" lang="ja">{opt.reading}</div>
                  </button>
                );
              })}
            </div>
            {proverbSelected !== null && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300">
                <span>
                  Sens littéral : <strong>{activeProverb.literalFr}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setProverbSelected(null);
                    setProverbIdx((i) => i + 1);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer"
                >
                  Proverbe suivant
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
