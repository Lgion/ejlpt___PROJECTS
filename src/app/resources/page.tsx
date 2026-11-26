'use client';

import React from 'react';
import Link from 'next/link';
import {
  Compass,
  BookOpen,
  ExternalLink,
  ArrowRight,
  Database,
  Layers,
} from 'lucide-react';
import {
  EXTERNAL_MEDIA_CATALOG,
  LEARNING_ORDER_STEPS,
  OPEN_DATA_CREDITS,
  POPULARIZED_METHODS,
} from '@/data/learningResources';

export default function ResourcesPage() {
  return (
    <div className="phase8-page">
      <header className="phase8-header">
        <div>
          <div className="phase8-kicker phase8-kicker--sky">
            <Compass className="w-4 h-4" />
            <span>Feuille de Route Pédagogique &amp; Sources Open-Data</span>
          </div>
          <h1 className="phase8-title">Méthodes, Ordre d&apos;Apprentissage &amp; Ressources</h1>
          <p className="phase8-subtitle">
            Par où commencer sans se disperser, les grandes méthodes vulgarisées, la médiathèque
            externe et les crédits des bases de données ouvertes intégrées dans eJLPT.
          </p>
        </div>
      </header>

      {/* Recommended 5-step order */}
      <section className="phase8-card space-y-4">
        <div className="text-sm font-extrabold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>Ordre d’apprentissage recommandé (Katakana → Hiragana → Clés → Particules → Kanjis)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {LEARNING_ORDER_STEPS.map((st) => (
            <div key={st.slug} className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-col justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="phase8-pill">Étape {st.step}</span>
                  <span className="text-slate-400">{st.durationHint}</span>
                </div>
                <div className="text-lg font-black text-sky-300" lang="ja">
                  {st.titleJp}
                </div>
                <h2 className="text-xs font-extrabold text-white">{st.titleFr}</h2>
                <p className="text-[11px] text-slate-400 leading-relaxed">{st.rationaleFr}</p>
              </div>
              <Link href={st.appHref} className="text-xs font-bold text-emerald-400 hover:text-emerald-300">
                {st.appCta} <ArrowRight className="w-3 h-3 inline" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Popularized Methods */}
      <section className="phase8-card space-y-4">
        <div className="text-sm font-extrabold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <span>Grandes méthodes d’apprentissage vulgarisées</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {POPULARIZED_METHODS.map((m) => (
            <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-white">{m.name}</h3>
                <span className="text-[11px] text-indigo-300 font-semibold">{m.origin}</span>
              </div>
              <div className="text-[11px] text-amber-300 font-bold">Idéal pour : {m.bestFor}</div>
              <p className="text-xs text-slate-300 leading-relaxed">{m.summaryFr}</p>
              <div className="text-[11px] text-emerald-300 bg-emerald-950/30 border border-emerald-800/40 rounded-lg p-2">
                <strong>Dans eJLPT :</strong> {m.howInEjlptFr}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* External Media Catalog */}
      <section className="phase8-card space-y-4">
        <div className="text-sm font-extrabold text-white">
          Médiathèque Externe (Presse, YouTube, Radios &amp; PDF gratuits)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {EXTERNAL_MEDIA_CATALOG.map((item) => (
            <a
              key={item.title}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-slate-800 bg-slate-900 hover:border-sky-500 p-4 space-y-1.5 block transition-colors"
            >
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="phase8-pill">{item.kind}</span>
                <span className="text-slate-400">{item.level}</span>
              </div>
              <div className="text-sm font-extrabold text-white flex items-center justify-between gap-1">
                <span>{item.title}</span>
                <ExternalLink className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              </div>
              <p className="text-xs text-slate-400">{item.descriptionFr}</p>
            </a>
          ))}
        </div>
      </section>

      {/* Runtime Attribution Credits */}
      <section className="phase8-card space-y-4">
        <div className="text-sm font-extrabold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-sky-400" />
          <span>Crédits &amp; Licences des Bases de Données Ouvertes</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {OPEN_DATA_CREDITS.map((credit) => (
            <a
              key={credit.id}
              href={credit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-slate-800 bg-slate-900 hover:border-indigo-500 p-3.5 space-y-1 block"
            >
              <div className="text-xs font-extrabold text-sky-300 flex items-center justify-between gap-1">
                <span>{credit.name}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </div>
              <div className="text-[10px] text-slate-500 font-mono">{credit.licenseOrType}</div>
              <p className="text-xs text-slate-300">{credit.roleFr}</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
