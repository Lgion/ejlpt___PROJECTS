'use client';

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb, UnifiedKanjiRecord, JLPTLevelNormalized } from '@/lib/db';
import { CascadingKanjiTree } from '@/components/custom-components/CascadingKanjiTree';
import { KanjiCanvasComponent } from '@/components/custom-components/KanjiCanvasComponent';
import { FuriganaText } from '@/components/custom-components/FuriganaText';
import { BookOpen, Play, Network, PenTool, Sparkles, Search, Filter, Hash, Layers } from 'lucide-react';

const JLPT_LEVELS: JLPTLevelNormalized[] = ['N5', 'N4', 'N3', 'N2', 'N1', 'N0'];

export default function KanjiStudyPage() {
  const [selectedKanjiChar, setSelectedKanjiChar] = useState<string>('語');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedJlpt, setSelectedJlpt] = useState<string>('ALL');
  const [isAnimatingStrokes, setIsAnimatingStrokes] = useState<boolean>(false);

  // Live Query to search kanjis from Dexie.js
  const kanjiList = useLiveQuery(async () => {
    let collection = localDb.kanjis.toCollection();

    if (selectedJlpt !== 'ALL') {
      collection = localDb.kanjis.where('jlpt').equals(selectedJlpt as JLPTLevelNormalized);
    }

    let items = await collection.limit(100).toArray();

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      items = items.filter(
        (k) =>
          k.kanji.includes(q) ||
          k.on_readings.some((r) => r.toLowerCase().includes(q)) ||
          k.kun_readings.some((r) => r.toLowerCase().includes(q)) ||
          k.meanings_fr.some((m) => m.toLowerCase().includes(q)) ||
          k.meanings_en.some((m) => m.toLowerCase().includes(q)) ||
          (k.rtk_keyword_6th && k.rtk_keyword_6th.toLowerCase().includes(q))
      );
    }

    return items;
  }, [searchQuery, selectedJlpt]);

  // Query selected kanji details
  const currentKanji = useLiveQuery(
    () => localDb.kanjis.get(selectedKanjiChar),
    [selectedKanjiChar]
  );

  const triggerStrokeAnimation = () => {
    setIsAnimatingStrokes(true);
    setTimeout(() => setIsAnimatingStrokes(false), 2500);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-800/80 text-sky-400 text-xs font-bold mb-2">
          <BookOpen className="w-4 h-4" />
          <span>Module d&apos;Étude des Kanjis & Données Unifiées Local-First</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100">Centre d&apos;Apprentissage des Kanjis (漢字)</h1>
        <p className="text-sm text-slate-400 mt-1">
          Explorez les 3 039 Kanjis (Jōyō + RTK Heisig + WaniKani) avec décomposition vectorielle, fréquences multi-corpus et filiation.
        </p>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par Kanji, lecture (ON/KUN), sens (FR/EN) ou keyword Heisig..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>

        {/* JLPT Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setSelectedJlpt('ALL')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              selectedJlpt === 'ALL' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tous
          </button>
          {JLPT_LEVELS.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedJlpt(lvl)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                selectedJlpt === lvl ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Selector Strip */}
      <div className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto min-h-[64px]">
        <span className="text-xs font-semibold text-slate-400 px-2 shrink-0">
          Résultats ({kanjiList?.length || 0}) :
        </span>
        {kanjiList && kanjiList.length > 0 ? (
          kanjiList.map((k) => (
            <button
              key={k.kanji}
              onClick={() => setSelectedKanjiChar(k.kanji)}
              className={`w-11 h-11 rounded-xl text-lg font-bold font-serif transition-all shrink-0 flex flex-col items-center justify-center ${
                selectedKanjiChar === k.kanji
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/40 scale-105 ring-2 ring-sky-400'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <span>{k.kanji}</span>
            </button>
          ))
        ) : (
          <span className="text-xs text-slate-500 italic">Chargement ou aucun résultat...</span>
        )}
      </div>

      {/* Main Kanji Detail Layout */}
      {currentKanji ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Kanji Visual Card & Metadata */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-6 items-center text-center">
            {/* Visual Canvas Card */}
            <div className="relative w-48 h-48 bg-slate-950 border-2 border-sky-500/40 rounded-2xl flex items-center justify-center shadow-inner overflow-hidden group">
              <div className="absolute inset-0 border-r border-b border-dashed border-slate-800/80 pointer-events-none"></div>

              <span
                className={`text-8xl font-serif font-extrabold text-sky-300 transition-all duration-700 ${
                  isAnimatingStrokes ? 'scale-110 opacity-70 text-indigo-400 animate-pulse' : ''
                }`}
              >
                {currentKanji.kanji}
              </span>

              <span className="absolute bottom-2 right-2 text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Traits: {currentKanji.strokes || '?'}
              </span>

              <span className="absolute top-2 left-2 text-[10px] font-serif text-sky-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Radical: {currentKanji.radical} ({currentKanji.radical_name_en})
              </span>
            </div>

            <button
              onClick={triggerStrokeAnimation}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-600/30 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              Lancer l&apos;Animation des Traits (KanjiVG)
            </button>

            {/* Badges Grid */}
            <div className="w-full grid grid-cols-2 gap-3 text-left">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Niveau JLPT</span>
                <div className="text-sm font-bold text-sky-400">{currentKanji.jlpt}</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Code SKIP</span>
                <div className="text-sm font-mono font-bold text-slate-200">{currentKanji.skipCode}</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Frame RTK</span>
                <div className="text-sm font-mono font-bold text-emerald-400">
                  #{currentKanji.rtk_6th || currentKanji.rtk_5th || 'N/A'}
                </div>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">WaniKani</span>
                <div className="text-sm font-mono font-bold text-purple-400">
                  Lvl {currentKanji.wanikani_level || 'N/A'}
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="w-full p-3 bg-slate-950 rounded-xl border border-slate-800 text-left">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Catégorie Sémantique</span>
              <div className="text-xs font-bold text-slate-200 mt-0.5">
                {currentKanji.category} → {currentKanji.subCategory}
              </div>
            </div>

            {/* Readings */}
            <div className="w-full flex flex-col gap-2 text-left pt-2 border-t border-slate-800">
              <div>
                <span className="text-xs font-semibold text-sky-400">Lecture On (音読み) :</span>
                <div className="text-sm font-bold text-slate-200">
                  {currentKanji.on_readings.join(', ') || 'Aucune'}
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-emerald-400">Lecture Kun (訓読み) :</span>
                <div className="text-sm font-bold text-slate-200">
                  {currentKanji.kun_readings.join(', ') || 'Aucune'}
                </div>
              </div>
              {currentKanji.rtk_keyword_6th && (
                <div>
                  <span className="text-xs font-semibold text-purple-400">Keyword RTK Heisig :</span>
                  <div className="text-xs font-bold text-slate-300">{currentKanji.rtk_keyword_6th}</div>
                </div>
              )}
            </div>

            {/* Multi-corpus Frequencies */}
            {currentKanji.frequencies && (
              <div className="w-full p-3 bg-slate-950 rounded-xl border border-slate-800 text-left flex flex-col gap-1 text-[11px]">
                <span className="text-[10px] text-slate-500 uppercase font-semibold mb-1">
                  Fréquences (Rangs multi-corpus)
                </span>
                <div className="flex justify-between text-slate-300">
                  <span>Aozora: #{currentKanji.frequencies.aozora || '-'}</span>
                  <span>News: #{currentKanji.frequencies.news || '-'}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Twitter: #{currentKanji.frequencies.twitter || '-'}</span>
                  <span>Wikipedia: #{currentKanji.frequencies.wikipedia || '-'}</span>
                </div>
                {currentKanji.frequencies.innocent_rank && (
                  <div className="text-emerald-400 font-semibold mt-0.5">
                    Fiction (Innocent): #{currentKanji.frequencies.innocent_rank} ({currentKanji.frequencies.innocent_count?.toLocaleString()} occurrences)
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Cascading Tree, Canvas, & Jukugo */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Radical Tree Component */}
            <CascadingKanjiTree targetKanji={currentKanji.kanji} />

            {/* Handwriting Practice */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <PenTool className="w-4 h-4" />
                  Pratique d&apos;Écriture Manuscrite
                </span>
                <span className="text-xs text-slate-400">Tracez &quot;{currentKanji.kanji}&quot; ci-dessous</span>
              </div>

              <div className="flex justify-center">
                <KanjiCanvasComponent expectedKanji={currentKanji.kanji} />
              </div>
            </div>

            {/* Starting & Ending Jukugo Compound Words */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                Mots Composés Associés (Jukugo)
              </h3>

              <div className="flex flex-col gap-3">
                {currentKanji.startingW && currentKanji.startingW.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-slate-400">Commencant par &quot;{currentKanji.kanji}&quot; :</span>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {currentKanji.startingW.map((w, idx) => (
                        <span key={idx} className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-sm font-serif font-bold text-sky-300">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {currentKanji.endingW && currentKanji.endingW.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-slate-400">Se terminant par &quot;{currentKanji.kanji}&quot; :</span>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {currentKanji.endingW.map((w, idx) => (
                        <span key={idx} className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-sm font-serif font-bold text-emerald-300">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
          Chargement des données du Kanji &quot;{selectedKanjiChar}&quot;...
        </div>
      )}
    </div>
  );
}
