'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { isAdminEmail } from '@/lib/admin';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { AdminKpiGrid } from '@/components/admin/AdminKpiGrid';
import {
  AdminAttemptsTable,
  type AdminAttemptRow,
} from '@/components/admin/AdminAttemptsTable';
import { ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';

interface AdminStatsData {
  totalAttempts: number;
  passedAttempts: number;
  passRate: number;
  recentAttempts: AdminAttemptRow[];
  levelDistribution?: Array<{ _id: string; count: number; avgScore?: number }>;
}

export default function AdminPage() {
  const { user, isLoaded } = useUser();

  const [statsData, setStatsData] = useState<AdminStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const isAdmin = isAdminEmail(userEmail);

  const fetchAdminStats = async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
      setErrorMsg(null);
    }
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Erreur d’accès admin');
      } else {
        setErrorMsg(null);
        setStatsData(data.stats);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors du chargement des statistiques admin';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !isAdmin) return;
    let cancelled = false;

    const loadInitialStats = async () => {
      try {
        const res = await fetch('/api/admin/stats');
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.success) {
          setErrorMsg(data.error || 'Erreur d’accès admin');
        } else {
          setErrorMsg(null);
          setStatsData(data.stats);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Erreur lors du chargement des statistiques admin';
        setErrorMsg(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadInitialStats();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isAdmin]);

  if (!isLoaded) {
    return (
      <div className="admin-page__loading">Vérification des droits Clerk Auth...</div>
    );
  }

  if (!isAdmin) {
    return <AdminAccessDenied userEmail={userEmail} />;
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <div className="admin-page__badge">
            <ShieldCheck className="admin-page__badge-icon" />
            <span>Panneau de Contrôle Administrateur (EMAIL_ADMIN)</span>
          </div>
          <h1 className="admin-page__title">Administration MongoDB Atlas &amp; Stats</h1>
          <p className="admin-page__subtitle">
            Supervisez les passages d&apos;examens des utilisateurs et gérez la base de données
            centrale.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchAdminStats()}
          disabled={isLoading}
          className="admin-page__refresh-btn"
        >
          <RefreshCw
            className={`admin-page__refresh-icon ${
              isLoading ? 'admin-page__refresh-icon--spin' : ''
            }`}
          />
          <span>Actualiser Stats</span>
        </button>
      </div>

      {errorMsg && (
        <div className="admin-page__error">
          <AlertTriangle className="admin-page__error-icon" />
          <span>{errorMsg}</span>
        </div>
      )}

      {statsData && (
        <AdminKpiGrid
          totalAttempts={statsData.totalAttempts}
          passedAttempts={statsData.passedAttempts}
          passRate={statsData.passRate}
        />
      )}

      {statsData?.recentAttempts && <AdminAttemptsTable attempts={statsData.recentAttempts} />}
    </div>
  );
}
