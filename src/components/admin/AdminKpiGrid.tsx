import React from 'react';
import { Database, CheckCircle, BarChart3 } from 'lucide-react';

interface AdminKpiGridProps {
  totalAttempts: number;
  passedAttempts: number;
  passRate: number;
}

export function AdminKpiGrid({
  totalAttempts,
  passedAttempts,
  passRate,
}: AdminKpiGridProps) {
  return (
    <div className="admin-kpis">
      <div className="admin-kpis__card">
        <div className="admin-kpis__icon-box admin-kpis__icon-box--total">
          <Database className="admin-kpis__icon" />
        </div>
        <div>
          <span className="admin-kpis__label">Total Tentatives (Atlas)</span>
          <h3 className="admin-kpis__value">{totalAttempts}</h3>
        </div>
      </div>

      <div className="admin-kpis__card">
        <div className="admin-kpis__icon-box admin-kpis__icon-box--passed">
          <CheckCircle className="admin-kpis__icon" />
        </div>
        <div>
          <span className="admin-kpis__label">Tentatives Réussies</span>
          <h3 className="admin-kpis__value admin-kpis__value--passed">{passedAttempts}</h3>
        </div>
      </div>

      <div className="admin-kpis__card">
        <div className="admin-kpis__icon-box admin-kpis__icon-box--rate">
          <BarChart3 className="admin-kpis__icon" />
        </div>
        <div>
          <span className="admin-kpis__label">Taux de Réussite Global</span>
          <h3 className="admin-kpis__value admin-kpis__value--rate">{passRate}</h3>
        </div>
      </div>
    </div>
  );
}
