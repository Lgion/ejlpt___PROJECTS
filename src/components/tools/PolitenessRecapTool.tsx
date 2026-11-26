'use client';

import React, { useMemo, useState } from 'react';
import { KEIGO_VERB_TABLE } from '@/lib/sentenceDrillsEngine';
import { ShieldCheck, Users } from 'lucide-react';

const REGISTER_CARDS = [
  {
    code: '普通形 (Futsuugo)',
    level: 'Famille / Amis / Écrit neutre',
    badgeClass: 'politeness__badge--casual',
    rule: 'Verbe dictionnaire / 〜た / 〜ない + だ・である.',
    example: '明日、図書館へ行く。',
  },
  {
    code: '丁寧語 (Teineigo)',
    level: 'Poli standard (inconnus, collègues)',
    badgeClass: 'politeness__badge--polite',
    rule: 'Terminaisons 〜ます / 〜です (ご/お + mot).',
    example: '明日、図書館へ行きます。',
  },
  {
    code: '尊敬語 (Sonkeigo)',
    level: 'Honorifique — Élève l’action de l’autre (Soto / Supérieur)',
    badgeClass: 'politeness__badge--sonkei',
    rule: 'Verbes spéciaux (いらっしゃる) ou お + Vます + になる / passif られる.',
    example: '部長がまもなくいらっしゃいます。',
  },
  {
    code: '謙譲語 (Kenjougo)',
    level: 'Humble — Abaisse sa propre action ou celle de son groupe (Uchi)',
    badgeClass: 'politeness__badge--kenjou',
    rule: 'Verbes spéciaux (まいる・うかがう・いたす) ou お + Vます + する.',
    example: '私が明日、お宅へ伺います。',
  },
  {
    code: '美化語 (Bikago)',
    level: 'Langage embelli — Raffinement lexical neutre',
    badgeClass: 'politeness__badge--bikago',
    rule: 'Préfixe お (mots japonais) ou ご (mots sino-japonais) sans rapport hiérarchique.',
    example: 'お茶、ご飯、お酒、お名前、ご案内.',
  },
];

const BUSINESS_PHRASES = [
  { jp: 'いつもお世話になっております。', fr: 'Merci pour votre confiance / soutien habituel (ouverture e-mail).' },
  { jp: 'お忙しいところ恐縮ですが、ご確認いただけますでしょうか。', fr: 'Navré de vous déranger, pourriez-vous vérifier cela ?' },
  { jp: '承知いたしました。よろしくお願いいたします。', fr: 'C’est bien compris / entendu (très poli, évite わかりました avec un supérieur).' },
  { jp: '申し訳ございません。確認の上、改めてご連絡いたします。', fr: 'Toutes nos excuses. Après vérification, je vous recontacte.' },
];

export function PolitenessRecapTool() {
  const [filter, setFilter] = useState('');

  const filteredTable = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return KEIGO_VERB_TABLE;
    return KEIGO_VERB_TABLE.filter(
      (row) =>
        row.noteFr.toLowerCase().includes(q) ||
        row.plain.includes(q) ||
        row.polite.includes(q) ||
        row.sonkeigo.includes(q) ||
        row.kenjougo.includes(q)
    );
  }, [filter]);

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <h2 className="tool-panel__title">Récapitulatif Complet des Registres &amp; Keigo</h2>
          <p className="tool-panel__subtitle">
            Distinction普通形 / 丁寧語 / 尊敬語 / 謙譲語 / 美化語 et règle sociale Soto (外) ↔ Uchi (内).
          </p>
        </div>
        <span className="tool-panel__badge">
          <Users className="w-3.5 h-3.5 inline mr-1" />
          Uchi vs Soto
        </span>
      </div>

      <div className="politeness__cards">
        {REGISTER_CARDS.map((card) => (
          <div key={card.code} className="politeness__card">
            <span className={`politeness__badge ${card.badgeClass}`}>{card.code}</span>
            <div className="text-xs font-bold text-slate-200 mt-2">{card.level}</div>
            <p className="text-xs text-slate-400 mt-1">{card.rule}</p>
            <div className="text-xs font-semibold text-sky-300 mt-2" lang="ja">
              {card.example}
            </div>
          </div>
        ))}
      </div>

      <div className="politeness__soto-box">
        <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" />
          Règle d’or Soto (外) / Uchi (内) au téléphone &amp; en entreprise
        </div>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
          Même si vous parlez de votre propre chef devant un client externe (<strong>Soto</strong>), votre
          chef fait partie de votre cercle interne (<strong>Uchi</strong>) : utilisez le{' '}
          <strong>謙譲語</strong> ou la forme neutre pour lui (ex. « 田中はただいま席を外しております ») et réservez
          le <strong>尊敬語</strong> au client !
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-100">
            Tableau d’équivalence des verbes Keigo essentiels
          </h3>
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrer (aller, 見る, いたす…)"
            className="tool-panel__input w-60"
          />
        </div>

        <div className="tool-table-wrap">
          <table className="tool-table">
            <thead>
              <tr>
                <th>Sens</th>
                <th>普通形 (Neutre)</th>
                <th>丁寧語 (Poli)</th>
                <th>尊敬語 (Honorifique)</th>
                <th>謙譲語 (Humble)</th>
              </tr>
            </thead>
            <tbody>
              {filteredTable.map((row) => (
                <tr key={row.plain}>
                  <td className="font-semibold text-slate-200">{row.noteFr}</td>
                  <td lang="ja">{row.plain}</td>
                  <td lang="ja" className="text-sky-300 font-semibold">{row.polite}</td>
                  <td lang="ja" className="text-purple-300 font-bold">{row.sonkeigo}</td>
                  <td lang="ja" className="text-emerald-300 font-bold">{row.kenjougo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-100">Formules professionnelles incontournables</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {BUSINESS_PHRASES.map((p) => (
            <div key={p.jp} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <div className="text-sm font-bold text-slate-100" lang="ja">
                {p.jp}
              </div>
              <div className="text-xs text-slate-400 mt-1">{p.fr}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
