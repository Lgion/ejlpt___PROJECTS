import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface AdminAccessDeniedProps {
  userEmail?: string;
}

export function AdminAccessDenied({ userEmail }: AdminAccessDeniedProps) {
  return (
    <div className="admin-denied">
      <div className="admin-denied__icon-wrap">
        <AlertTriangle className="admin-denied__icon" />
      </div>
      <h2 className="admin-denied__title">Accès Administrateur Restreint</h2>
      <p className="admin-denied__description">
        Seuls les comptes administrateurs figurant dans{' '}
        <code className="admin-denied__code">EMAIL_ADMIN</code> ont accès au panneau de gestion
        MongoDB Atlas.
      </p>
      <div className="admin-denied__email">Votre email actuel : {userEmail || 'Non connecté'}</div>
    </div>
  );
}

