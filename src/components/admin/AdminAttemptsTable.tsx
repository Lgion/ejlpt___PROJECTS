import React from 'react';

export interface AdminAttemptRow {
  _id?: string;
  attemptId?: string;
  userName?: string;
  userEmail?: string;
  title: string;
  level: string;
  scoreTotal: number;
  maxScoreTotal: number;
  passed: boolean;
  createdAt: string;
}

interface AdminAttemptsTableProps {
  attempts: AdminAttemptRow[];
}

export function AdminAttemptsTable({ attempts }: AdminAttemptsTableProps) {
  return (
    <div className="admin-table">
      <h2 className="admin-table__title">
        10 Dernières Soumissions Utilisateurs (MongoDB Atlas)
      </h2>

      <div className="admin-table__scroll">
        <table className="admin-table__table">
          <thead className="admin-table__thead">
            <tr>
              <th className="admin-table__th">Utilisateur / Email</th>
              <th className="admin-table__th">Niveau</th>
              <th className="admin-table__th">Examen / Titre</th>
              <th className="admin-table__th">Score Total</th>
              <th className="admin-table__th">Résultat</th>
              <th className="admin-table__th">Date</th>
            </tr>
          </thead>
          <tbody className="admin-table__tbody">
            {attempts.map((att) => (
              <tr key={att._id} className="admin-table__row">
                <td className="admin-table__td admin-table__td--email">{att.userEmail}</td>
                <td className="admin-table__td">
                  <span className="admin-table__level-pill">{att.level}</span>
                </td>
                <td className="admin-table__td admin-table__td--title">{att.title}</td>
                <td className="admin-table__td admin-table__td--score">
                  {att.scoreTotal} / {att.maxScoreTotal} pts
                </td>
                <td className="admin-table__td">
                  <span
                    className={`admin-table__verdict-pill ${
                      att.passed
                        ? 'admin-table__verdict-pill--passed'
                        : 'admin-table__verdict-pill--failed'
                    }`}
                  >
                    {att.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </td>
                <td className="admin-table__td admin-table__td--date">
                  {new Date(att.createdAt).toLocaleString('fr-FR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

