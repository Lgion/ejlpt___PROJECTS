import React from 'react';
import { LocalExamAttempt } from '@/lib/db';
import { Award } from 'lucide-react';

interface RecentAttemptsListProps {
  attempts: LocalExamAttempt[];
}

export function RecentAttemptsList({ attempts }: RecentAttemptsListProps) {
  if (attempts.length === 0) return null;

  return (
    <section className="recent-attempts">
      <h2 className="recent-attempts__title">
        <Award className="recent-attempts__title-icon" />
        Dernières Simulations Passées (Dexie LocalDB)
      </h2>

      <div className="recent-attempts__grid">
        {attempts.map((att) => (
          <div key={att.attemptId} className="recent-attempts__card">
            <div className="recent-attempts__meta">
              <span
                className={`recent-attempts__level-badge ${
                  att.passed
                    ? 'recent-attempts__level-badge--passed'
                    : 'recent-attempts__level-badge--failed'
                }`}
              >
                {att.level}
              </span>
              <div>
                <h4 className="recent-attempts__card-title">{att.title}</h4>
                <p className="recent-attempts__card-date">
                  {new Date(att.createdAt).toLocaleDateString('fr-FR')} •{' '}
                  {att.mode === 'FULL_MOCK' ? 'Examen Blanc' : 'Partiel'}
                </p>
              </div>
            </div>

            <div className="recent-attempts__score-wrap">
              <div
                className={`recent-attempts__score ${
                  att.passed
                    ? 'recent-attempts__score--passed'
                    : 'recent-attempts__score--failed'
                }`}
              >
                {att.scoreTotal} / {att.maxScoreTotal} pts
              </div>
              <span className="recent-attempts__status">
                {att.passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

