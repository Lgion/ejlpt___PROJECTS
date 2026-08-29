'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { isAdminEmail } from '@/lib/admin';
import { ShieldCheck, Database, Award, Users, AlertTriangle, RefreshCw, BarChart3, CheckCircle } from 'lucide-react';

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [statsData, setStatsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const isAdmin = isAdminEmail(userEmail);

  const fetchAdminStats = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || 'Erreur d’accès admin');
      } else {
        setStatsData(data.stats);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors du chargement des statistiques admin');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isAdmin) {
      fetchAdminStats();
    }
  }, [isLoaded, isAdmin]);

  if (!isLoaded) {
    return <div className="p-8 text-center text-xs text-slate-400">Vérification des droits Clerk Auth...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">Accès Administrateur Restreint</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Seuls les comptes administrateurs figurant dans <code className="text-sky-400 bg-slate-950 px-2 py-0.5 rounded">EMAIL_ADMIN</code> ont accès au panneau de gestion MongoDB Atlas.
        </p>
        <div className="text-[11px] text-slate-500 bg-slate-950 p-3 rounded-xl border border-slate-800 w-full font-mono">
          Votre email actuel : {userEmail || 'Non connecté'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800/80 text-amber-400 text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Panneau de Contrôle Administrateur (EMAIL_ADMIN)</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-100">Administration MongoDB Atlas & Stats</h1>
          <p className="text-sm text-slate-400 mt-1">
            Supervisez les passages d&apos;examens des utilisateurs et gérez la base de données centrale.
          </p>
        </div>

        <button
          onClick={fetchAdminStats}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualiser Stats</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Admin KPI Cards */}
      {statsData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex items-center gap-4">
            <div className="p-3 rounded-xl bg-sky-950 border border-sky-800 text-sky-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">Total Tentatives (Atlas)</span>
              <h3 className="text-2xl font-extrabold text-slate-100">{statsData.totalAttempts}</h3>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">Tentatives Réussies</span>
              <h3 className="text-2xl font-extrabold text-emerald-400">{statsData.passedAttempts}</h3>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-950 border border-indigo-800 text-indigo-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">Taux de Réussite Global</span>
              <h3 className="text-2xl font-extrabold text-indigo-400">{statsData.passRate}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Recent Submissions Table */}
      {statsData?.recentAttempts && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
          <h2 className="text-base font-bold text-slate-200">10 Dernières Soumissions Utilisateurs (MongoDB Atlas)</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Utilisateur / Email</th>
                  <th className="p-3">Niveau</th>
                  <th className="p-3">Examen / Titre</th>
                  <th className="p-3">Score Total</th>
                  <th className="p-3">Résultat</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {statsData.recentAttempts.map((att: any) => (
                  <tr key={att._id} className="hover:bg-slate-950/50">
                    <td className="p-3 font-mono text-[11px]">{att.userEmail}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-400 font-bold">
                        {att.level}
                      </span>
                    </td>
                    <td className="p-3 font-medium">{att.title}</td>
                    <td className="p-3 font-bold">{att.scoreTotal} / {att.maxScoreTotal} pts</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          att.passed ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                        }`}
                      >
                        {att.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[10px] text-slate-400">
                      {new Date(att.createdAt).toLocaleString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
