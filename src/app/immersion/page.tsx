'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookHeart, Newspaper, Image as ImageIcon, Headphones } from 'lucide-react';
import { MemorizeAndProverbsTab } from '@/components/immersion/MemorizeAndProverbsTab';
import { MonolingualPressKeyboardTab } from '@/components/immersion/MonolingualPressKeyboardTab';
import { ImageScenariosGairaigoTab } from '@/components/immersion/ImageScenariosGairaigoTab';

type ImmersionTabId = 'memorize' | 'monolingual' | 'scenarios';

function resolveTab(raw: string | null): ImmersionTabId {
  if (raw === 'monolingual') return 'monolingual';
  if (raw === 'scenarios') return 'scenarios';
  return 'memorize';
}

function ImmersionContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<ImmersionTabId>(
    resolveTab(searchParams.get('tab'))
  );

  return (
    <div className="imm-page">
      <header className="imm-page__header">
        <div>
          <div className="imm-page__badge">
            <Headphones className="w-4 h-4" />
            <span>Immersion, Culture, Presse &amp; Oral Gairaigo</span>
          </div>
          <h1 className="imm-page__title">Hub d&apos;Immersion Japonaise</h1>
          <p className="imm-page__subtitle">
            Mémorisation par cœur &amp; proverbes, lecture de définitions JA monolingues, presse,
            tutoriels clavier (Linux/Win/iOS), scénarios illustrés et parcours oral Gairaigo.
          </p>
        </div>

        <div className="imm-page__tabs">
          <button
            type="button"
            onClick={() => setActiveTab('memorize')}
            className={`imm-page__tab ${activeTab === 'memorize' ? 'imm-page__tab--active' : ''}`}
          >
            <BookHeart className="w-4 h-4" />
            <span>Par cœur, Contes &amp; Proverbes</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('monolingual')}
            className={`imm-page__tab ${activeTab === 'monolingual' ? 'imm-page__tab--active' : ''}`}
          >
            <Newspaper className="w-4 h-4" />
            <span>Définitions JA, Presse &amp; Claviers</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scenarios')}
            className={`imm-page__tab ${activeTab === 'scenarios' ? 'imm-page__tab--active' : ''}`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Scénarios Image &amp; Gairaigo Oral</span>
          </button>
        </div>
      </header>

      {activeTab === 'memorize' && <MemorizeAndProverbsTab />}
      {activeTab === 'monolingual' && <MonolingualPressKeyboardTab />}
      {activeTab === 'scenarios' && <ImageScenariosGairaigoTab />}
    </div>
  );
}

export default function ImmersionPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-xs text-slate-400">Chargement de l’immersion…</div>}
    >
      <ImmersionContent />
    </Suspense>
  );
}
