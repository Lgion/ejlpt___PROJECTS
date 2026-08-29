'use client';

import React, { useState } from 'react';
import { KanjiCanvasComponent } from '@/components/custom-components/KanjiCanvasComponent';
import { EzoeGrammarViewer } from '@/components/custom-components/EzoeGrammarViewer';
import { CascadingKanjiTree } from '@/components/custom-components/CascadingKanjiTree';
import { ChoukaiAudioPlayer } from '@/components/custom-components/ChoukaiAudioPlayer';
import { PenTool, Network, Volume2, BookOpen, Layers } from 'lucide-react';

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState<'canvas' | 'ezoe' | 'tree' | 'audio'>('canvas');

  const sampleEzoeSegments = [
    { text: '私', type: 'subject' as const, reading: 'わたし', frenchMeaning: 'Moi' },
    { text: 'は', type: 'particle' as const, frenchMeaning: 'Thème' },
    { text: '毎日', type: 'time' as const, reading: 'まいにち', frenchMeaning: 'Chaque jour' },
    { text: '日本語', type: 'noun' as const, reading: 'にほんご', frenchMeaning: 'Japonais' },
    { text: 'を', type: 'particle' as const, frenchMeaning: 'COD' },
    { text: '勉強します', type: 'verb' as const, reading: 'べんきょうします', frenchMeaning: 'Étudier' },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-800/80 text-sky-400 text-xs font-bold mb-2">
          <PenTool className="w-4 h-4" />
          <span>Composants Pédagogiques Sur Mesure</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100">Hub d&apos;Outils Interactifs Pédagogiques</h1>
        <p className="text-sm text-slate-400 mt-1">
          Explorez le canvas d&apos;écriture manuscrite, la visualisation Ezoe, le lecteur Choukai et l&apos;arbre de filiation des kanjis.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('canvas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'canvas'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <PenTool className="w-4 h-4" /> Canvas Écriture (IME)
        </button>

        <button
          onClick={() => setActiveTab('ezoe')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'ezoe'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" /> Grammaire Méthode Ezoe
        </button>

        <button
          onClick={() => setActiveTab('tree')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'tree'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Network className="w-4 h-4" /> Arbre de Kanji (Radicaux)
        </button>

        <button
          onClick={() => setActiveTab('audio')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'audio'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Volume2 className="w-4 h-4" /> Lecteur Choukai Audio
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex justify-center">
        {activeTab === 'canvas' && (
          <div className="w-full flex flex-col items-center gap-4">
            <p className="text-xs text-slate-400 text-center max-w-md">
              Entraînez-vous à tracer les kanjis au trait près. Le système enregistre votre tracé vectoriel.
            </p>
            <KanjiCanvasComponent expectedKanji="語" />
          </div>
        )}

        {activeTab === 'ezoe' && (
          <div className="w-full max-w-3xl flex flex-col gap-4">
            <p className="text-xs text-slate-400">
              La méthode Ezoe (江副文法) découpe les phrases en blocs de couleurs distincts pour chaque rôle syntaxique.
            </p>
            <EzoeGrammarViewer segments={sampleEzoeSegments} />
          </div>
        )}

        {activeTab === 'tree' && (
          <div className="w-full max-w-3xl">
            <CascadingKanjiTree targetKanji="語" />
          </div>
        )}

        {activeTab === 'audio' && (
          <div className="w-full max-w-2xl">
            <ChoukaiAudioPlayer
              audioScript={`男：すみません、この 辞書は いくらですか。
女：それは 3,000円です。
男：じゃあ、これを ください。`}
              isFullMockMode={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
