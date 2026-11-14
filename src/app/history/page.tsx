'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { localDb, LocalExamAttempt } from '@/lib/db';
import { flushSyncQueue } from '@/lib/sync';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import {
  HistoryAttemptsList,
  type MongoAttempt,
} from '@/components/history/HistoryAttemptsList';
import { BookOpen, RefreshCw, Trash2 } from 'lucide-react';

export default function HistoryPage() {
  const { isSignedIn } = useUser();
  const [localAttempts, setLocalAttempts] = useState<LocalExamAttempt[]>([]);
  const [mongoAttempts, setMongoAttempts] = useState<MongoAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadHistory = async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }
    try {
      const local = await localDb.attempts.orderBy('createdAt').reverse().toArray();
      setLocalAttempts(local);

      if (navigator.onLine) {
        const res = await fetch('/api/attempts');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setMongoAttempts(data.attempts || []);
          }
        }
      }
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadInitialHistory = async () => {
      try {
        const local = await localDb.attempts.orderBy('createdAt').reverse().toArray();
        if (!cancelled) {
          setLocalAttempts(local);
        }

        if (navigator.onLine) {
          const res = await fetch('/api/attempts');
          if (res.ok) {
            const data = await res.json();
            if (!cancelled && data.success) {
              setMongoAttempts(data.attempts || []);
            }
          }
        }
      } catch (err) {
        console.error('Error loading history:', err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadInitialHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSyncToMongo = async () => {
    setIsSyncing(true);
    try {
      await flushSyncQueue(Boolean(isSignedIn));
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
    <div className="history-page">
      <div className="history-page__header">
        <div>
          <div className="history-page__badge">
            <BookOpen className="history-page__badge-icon" />
            <span>Historique Dual Dexie.js ↔ MongoDB Atlas</span>
          </div>
          <h1 className="history-page__title">Historique des Simulations &amp; Score</h1>
          <p className="history-page__subtitle">
            Vos tentatives d&apos;examen sont sauvegardées instantanément dans votre navigateur
            (Dexie) et synchronisées sur le cloud.
          </p>
        </div>

        <div className="history-page__actions">
          <button
            type="button"
            onClick={() => void handleSyncToMongo()}
            disabled={isSyncing}
            className="history-page__sync-btn"
          >
            <RefreshCw
              className={`history-page__btn-icon ${
                isSyncing ? 'history-page__btn-icon--spin' : ''
              }`}
            />
            <span>{isSyncing ? 'Synchronisation...' : 'Synchroniser MongoDB'}</span>
          </button>

          <button
            type="button"
            onClick={() => void clearLocalHistory()}
            className="history-page__clear-btn"
            title="Vider l'historique local"
          >
            <Trash2 className="history-page__btn-icon" />
          </button>
        </div>
      </div>

      <AnalyticsDashboard />

      <HistoryAttemptsList
        localAttempts={localAttempts}
        mongoAttempts={mongoAttempts}
        isLoading={isLoading}
      />
    </div>
  );
}
