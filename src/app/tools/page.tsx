'use client';

import React, { Suspense, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { KanjiCanvasComponent } from '@/components/custom-components/KanjiCanvasComponent';
import { EzoeGrammarViewer } from '@/components/custom-components/EzoeGrammarViewer';
import { CascadingKanjiTree } from '@/components/custom-components/CascadingKanjiTree';
import { ChoukaiAudioPlayer } from '@/components/custom-components/ChoukaiAudioPlayer';
import { ToolsTabs, type ToolsTabId } from '@/components/tools/ToolsTabs';
import { ConjugationTableTool } from '@/components/tools/ConjugationTableTool';
import { PolitenessRecapTool } from '@/components/tools/PolitenessRecapTool';
import { RecommendedLinksTool } from '@/components/tools/RecommendedLinksTool';
import { AiStudyTodoTool } from '@/components/tools/AiStudyTodoTool';
import { PenTool } from 'lucide-react';

const Kanjiverse3D = dynamic(
  () => import('@/components/custom-components/Kanjiverse3D').then((m) => m.Kanjiverse3D),
  {
    ssr: false,
    loading: () => (
      <div className="tools-page__webgl-loading">
        Initialisation du moteur WebGL Kanjiverse 3D...
      </div>
    ),
  }
);

const VALID_TABS = new Set<ToolsTabId>([
  'canvas',
  'ezoe',
  'tree',
  'kanjiverse',
  'audio',
  'conjugation',
  'politeness',
  'links',
  'ai_todo',
]);

const SAMPLE_EZOE_SEGMENTS = [
  { text: '私', type: 'subject' as const, reading: 'わたし', frenchMeaning: 'Moi' },
  { text: 'は', type: 'particle' as const, frenchMeaning: 'Thème' },
  { text: '毎日', type: 'time' as const, reading: 'まいにち', frenchMeaning: 'Chaque jour' },
  { text: '日本語', type: 'noun' as const, reading: 'にほんご', frenchMeaning: 'Japonais' },
  { text: 'を', type: 'particle' as const, frenchMeaning: 'COD' },
  { text: '勉強します', type: 'verb' as const, reading: 'べんきょうします', frenchMeaning: 'Étudier' },
];

function ToolsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') as ToolsTabId | null;
  const [activeTab, setActiveTab] = useState<ToolsTabId>(
    initialTab && VALID_TABS.has(initialTab) ? initialTab : 'canvas'
  );

  return (
    <div className="tools-page">
      <div>
        <div className="tools-page__badge">
          <PenTool className="tools-page__badge-icon" />
          <span>9 Outils Pédagogiques Interactifs</span>
        </div>
        <h1 className="tools-page__title">Hub d&apos;Outils Interactifs Pédagogiques</h1>
        <p className="tools-page__subtitle">
          Canvas d&apos;écriture, table complète de conjugaison, récapitulatif politesse/keigo,
          liens sélectionnés, todo-list co-écrite avec l&apos;IA, méthode Ezoe, arbre radical et Choukai.
        </p>
      </div>

      <ToolsTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="tools-page__stage">
        {activeTab === 'canvas' && (
          <div className="tools-page__panel-canvas">
            <p className="tools-page__panel-desc tools-page__panel-desc--centered">
              Entraînez-vous à tracer les kanjis au trait près. Le système enregistre votre tracé
              vectoriel.
            </p>
            <KanjiCanvasComponent expectedKanji="語" />
          </div>
        )}

        {activeTab === 'conjugation' && (
          <div className="tools-page__panel-full">
            <ConjugationTableTool />
          </div>
        )}

        {activeTab === 'politeness' && (
          <div className="tools-page__panel-full">
            <PolitenessRecapTool />
          </div>
        )}

        {activeTab === 'links' && (
          <div className="tools-page__panel-full">
            <RecommendedLinksTool />
          </div>
        )}

        {activeTab === 'ai_todo' && (
          <div className="tools-page__panel-full">
            <AiStudyTodoTool />
          </div>
        )}

        {activeTab === 'ezoe' && (
          <div className="tools-page__panel-wide">
            <p className="tools-page__panel-desc">
              La méthode Ezoe (江副文法) découpe les phrases en blocs de couleurs distincts pour
              chaque rôle syntaxique.
            </p>
            <EzoeGrammarViewer segments={SAMPLE_EZOE_SEGMENTS} />
          </div>
        )}

        {activeTab === 'tree' && (
          <div className="tools-page__panel-wide">
            <CascadingKanjiTree targetKanji="語" />
          </div>
        )}

        {activeTab === 'kanjiverse' && (
          <div className="tools-page__panel-full">
            <Kanjiverse3D initialKanji="語" />
          </div>
        )}

        {activeTab === 'audio' && (
          <div className="tools-page__panel-audio">
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

export default function ToolsPage() {
  return (
    <Suspense fallback={<div className="tools-page__webgl-loading">Chargement des outils…</div>}>
      <ToolsContent />
    </Suspense>
  );
}
