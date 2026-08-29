'use client';

import React, { useEffect, useState } from 'react';
import { localDb, LocalExamAttempt } from '@/lib/db';
import { BookOpen, CheckCircle, XCircle, RefreshCw, Wifi, Database, Award, Trash2 } from 'lucide-react';

export default function HistoryPage() {
  const [localAttempts, setLocalAttempts] = useState<LocalExamAttempt[]>([]);
  const [mongoAttempts, setMongoAttempts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      // 1. Load from Dexie.js
      const local = await localDb.attempts.orderBy('createdAt').reverse().toArray();
      setLocalAttempts(local);

      // 2. Load from MongoDB Atlas if online
      if (navigator.onLine) {
        const res = await fetch('/api/attempts');
        const data = await res.json();
        if (data.success) {
          setMongoAttempts(data.attempts || []);
        }
      }
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleSyncToMongo = async () => {
    setIsSyncing(true);
    try {
      const unsynced = await localDb.attempts.where('isSynced').equals(0).toArray();

      for (const item of unsynced) {
        const res = await fetch('/api/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        const data = await res.json();
        if (data.success) {
          await localDb.attempts.where('attemptId').equals(item.attemptId).modify({ isSynced: true });
        }
      }

      await loadHistory();
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const clearLocalHistory = async () => {
    if (confirm('Voulez-vous supprimer tout l’historique local Dexie.js ?')) {
      await localDb.attempts.clear();
      await loadHistory();
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 text-xs font-bold mb-2">
            <BookOpen className="w-4 h-4" />
            <span>Historique Dual Dexie.js ↔ MongoDB Atlas</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-100">Historique des Simulations & Score</h1>
          <p className="text-sm text-slate-400 mt-1">
            Vos tentatives d&apos;examen sont sauvegardées instantanément dans votre navigateur (Dexie) et synchronisées sur le cloud.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncToMongo}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/30 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronisation...' : 'Synchroniser MongoDB'}</span>
          </button>

          <button
            onClick={clearLocalHistory}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
            title="Vider l'historique local"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Local Dexie Attempts list */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
          <Database className="w-5 h-5 text-sky-400" />
          Base Locale IndexedDB (Dexie.js) - {localAttempts.length} entrées
        </h2>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Chargement de l&apos;historique...</div>
        ) : localAttempts.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-400">
            Aucune tentative locale enregistrée. Passez un examen blanc depuis l&apos;accueil !
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {localAttempts.map(att => (
              <div
                key={att.attemptId}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-sm ${
                        att.passed
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 shadow-emerald-900/40'
                          : 'bg-rose-950 text-rose-400 border border-rose-800 shadow-rose-900/40'
                      }`}
                    >
                      {att.level}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">{att.title}</h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(att.createdAt).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full border ${
                      att.passed
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border-rose-800'
                    }`}
                  >
                    {att.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase">Vocab</span>
                    <div className="font-bold text-slate-200">{att.scoreMojiGo} pts</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase">Gramm.</span>
                    <div className="font-bold text-slate-200">{att.scoreBunpouDokkai} pts</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase">Écoute</span>
                    <div className="font-bold text-slate-200">{att.scoreChoukai} pts</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-slate-400">
                    Total : <strong className="text-slate-100">{att.scoreTotal} / {att.maxScoreTotal} pts</strong>
                  </span>
                  <span
                    className={`text-[11px] font-semibold flex items-center gap-1 ${
                      att.isSynced ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    <Wifi className="w-3 h-3" />
                    {att.isSynced ? 'Synced Cloud' : 'Attente Sync'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cloud MongoDB Atlas attempts */}
      {mongoAttempts.length > 0 && (
        <div className="flex flex-col gap-4 pt-6 border-t border-slate-800">
          <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <Wifi className="w-5 h-5 text-emerald-400" />
            Tentatives Sauvegardées sur MongoDB Atlas Cloud ({mongoAttempts.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mongoAttempts.map((m: any) => (
              <div key={m._id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200">{m.title} ({m.level})</div>
                  <div className="text-slate-400 text-[10px] font-mono">{new Date(m.createdAt).toLocaleString('fr-FR')}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sky-400">{m.scoreTotal} / {m.maxScoreTotal} pts</div>
                  <div className={`text-[10px] font-bold ${m.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {m.passed ? 'RÉUSSI' : 'ÉCHOUÉ'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
