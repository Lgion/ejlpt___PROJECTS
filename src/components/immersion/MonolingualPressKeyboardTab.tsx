'use client';

import React, { useState } from 'react';
import { toHiragana } from 'wanakana';
import { BookOpen, Eye, Keyboard, Newspaper, Volume2 } from 'lucide-react';
import {
  KEYBOARD_TUTORIALS,
  MONOLINGUAL_TEXTS,
  type MonolingualGloss,
} from '@/data/monolingualAndKeyboards';

export function MonolingualPressKeyboardTab() {
  const [selectedPassageId, setSelectedPassageId] = useState(MONOLINGUAL_TEXTS[0].id);
  const [selectedGloss, setSelectedGloss] = useState<MonolingualGloss | null>(
    MONOLINGUAL_TEXTS[0].glosses[0]
  );
  const [showFrGloss, setShowFrGloss] = useState(false);

  const [osTab, setOsTab] = useState<'linux' | 'windows' | 'ios'>('linux');
  const [sandboxText, setSandboxText] = useState('');

  const passage =
    MONOLINGUAL_TEXTS.find((p) => p.id === selectedPassageId) || MONOLINGUAL_TEXTS[0];
  const osGuide = KEYBOARD_TUTORIALS.find((g) => g.id === osTab) || KEYBOARD_TUTORIALS[0];

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="space-y-6">
      {/* Monolingual definitions & Press reader */}
      <section className="imm-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-sky-400" />
              <span>Lire des définitions JA monolingues (国語辞典) &amp; Presse</span>
            </h3>
            <p className="text-xs text-slate-400">
              Habituez-vous à comprendre un mot japonais grâce à sa définition simple en japonais avant de vérifier le français.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MONOLINGUAL_TEXTS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedPassageId(item.id);
                  setSelectedGloss(item.glosses[0] || null);
                  setShowFrGloss(false);
                }}
                className={`imm-chip ${selectedPassageId === item.id ? 'imm-chip--active' : ''}`}
              >
                {item.level} • {item.kind === 'press' ? 'Presse' : 'Court texte'}
              </button>
            ))}
          </div>
        </div>

        {passage.headlineJa && (
          <div className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-3">
            <div className="text-[11px] font-bold uppercase text-amber-300">
              見出し (Titre de presse)
            </div>
            <div className="text-base font-black text-white mt-0.5" lang="ja">
              {passage.headlineJa}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-300">{passage.title}</span>
            <button
              type="button"
              onClick={() => speak(passage.body)}
              className="imm-icon-btn"
              title="Écouter le texte"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-base leading-relaxed text-slate-100" lang="ja">
            {passage.body}
          </p>
        </div>

        {passage.pressTipsFr && (
          <p className="text-xs text-sky-300 bg-sky-950/30 border border-sky-800/50 rounded-xl p-3">
            <strong>Astuce presse :</strong> {passage.pressTipsFr}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-400">
              Mots clés du passage (cliquez pour lire la définition en japonais) :
            </div>
            <div className="flex flex-wrap gap-2">
              {passage.glosses.map((g) => (
                <button
                  key={g.term}
                  type="button"
                  onClick={() => {
                    setSelectedGloss(g);
                    setShowFrGloss(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${
                    selectedGloss?.term === g.term
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-indigo-400'
                  }`}
                  lang="ja"
                >
                  {g.term} ({g.reading})
                </button>
              ))}
            </div>
          </div>

          {selectedGloss && (
            <div className="rounded-xl border border-indigo-800/60 bg-slate-900 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-white" lang="ja">
                  <BookOpen className="w-4 h-4 inline mr-1.5 text-indigo-400" />
                  {selectedGloss.term} 【{selectedGloss.reading}】
                </div>
                <span className="text-[11px] text-indigo-300" lang="ja">
                  {selectedGloss.posJa}
                </span>
              </div>
              <div className="text-sm text-emerald-200 font-medium" lang="ja">
                {selectedGloss.jaDef}
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowFrGloss((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showFrGloss ? 'Masquer indice FR' : 'Vérifier le sens en français'}</span>
                </button>
                {showFrGloss && (
                  <div className="text-xs text-slate-300 mt-1">{selectedGloss.frHint}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Keyboard setup guides (Linux / Windows / iOS) */}
      <section className="imm-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-emerald-400" />
              <span>Tutoriels Clavier Japonais (IME) — Linux, Windows &amp; iOS</span>
            </h3>
            <p className="text-xs text-slate-400">
              Configurez la saisie japonaise sur votre système et testez les raccourcis Romaji/Kana en direct.
            </p>
          </div>

          <div className="flex gap-1.5">
            {KEYBOARD_TUTORIALS.map((guide) => (
              <button
                key={guide.id}
                type="button"
                onClick={() => setOsTab(guide.id)}
                className={`imm-chip ${osTab === guide.id ? 'imm-chip--active' : ''}`}
              >
                {guide.id === 'linux' ? 'Linux' : guide.id === 'windows' ? 'Windows' : 'iOS'}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <div className="text-sm font-extrabold text-white">
            {osGuide.osLabel} — <span className="text-emerald-400">{osGuide.engineName}</span>
          </div>
          <p className="text-xs text-slate-300">{osGuide.summaryFr}</p>

          <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-200">
            {osGuide.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800">
            {osGuide.shortcuts.map((sc) => (
              <div key={sc.keys} className="rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-xs">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-[11px]">
                  {sc.keys}
                </kbd>
                <span className="block text-slate-300 mt-1">{sc.actionFr}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-emerald-800/50 bg-slate-900 p-4 space-y-2">
          <label htmlFor="ime-sandbox-input" className="text-xs font-bold text-emerald-300 block">
            Bac à sable IME Romaji → Hiragana (tapez « nihongo », « kitte », « kin&apos;youbi »…) :
          </label>
          <input
            id="ime-sandbox-input"
            type="text"
            value={sandboxText}
            onChange={(e) => setSandboxText(toHiragana(e.target.value, { IMEMode: true }))}
            placeholder="Essayez de taper en japonais ici…"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white"
          />
        </div>
      </section>
    </div>
  );
}
