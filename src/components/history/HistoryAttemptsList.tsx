import React from 'react';
import { LocalExamAttempt } from '@/lib/db';
import { Database, Wifi } from 'lucide-react';

export interface MongoAttempt {
  _id?: string;
  attemptId?: string;
  title: string;
  level: string;
  scoreTotal: number;
  maxScoreTotal: number;
  passed: boolean;
  createdAt: string;
}

interface HistoryAttemptsListProps {
  localAttempts: LocalExamAttempt[];
  mongoAttempts: MongoAttempt[];
  isLoading: boolean;
}

export function HistoryAttemptsList({
  localAttempts,
  mongoAttempts,
  isLoading,
}: HistoryAttemptsListProps) {
  return (
    <>
      <div className="history-attempts">
        <h2 className="history-attempts__heading">
          <Database className="history-attempts__heading-icon history-attempts__heading-icon--local" />
          Base Locale IndexedDB (Dexie.js) - {localAttempts.length} entrées
        </h2>

        {isLoading ? (
          <div className="history-attempts__state">Chargement de l&apos;historique...</div>
        ) : localAttempts.length === 0 ? (
          <div className="history-attempts__state history-attempts__state--empty">
            Aucune tentative locale enregistrée. Passez un examen blanc depuis l&apos;accueil !
          </div>
        ) : (
          <div className="history-attempts__grid">
            {localAttempts.map((att) => {
              const statusMod = att.passed ? 'passed' : 'failed';
              return (
                <div key={att.attemptId} className="history-attempts__card">
                  <div className="history-attempts__card-head">
                    <div className="history-attempts__card-identity">
                      <span
                        className={`history-attempts__level-badge history-attempts__level-badge--${statusMod}`}
                      >
                        {att.level}
                      </span>
                      <div>
                        <h3 className="history-attempts__card-title">{att.title}</h3>
                        <span className="history-attempts__card-date">
                          {new Date(att.createdAt).toLocaleString('fr-FR')}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`history-attempts__verdict-pill history-attempts__verdict-pill--${statusMod}`}
                    >
                      {att.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>

                  <div className="history-attempts__breakdown">
                    <div>
                      <span className="history-attempts__part-label">Vocab</span>
                      <div className="history-attempts__part-score">{att.scoreMojiGo} pts</div>
                    </div>
                    <div>
                      <span className="history-attempts__part-label">Gramm.</span>
                      <div className="history-attempts__part-score">
                        {att.scoreBunpouDokkai} pts
                      </div>
                    </div>
                    <div>
                      <span className="history-attempts__part-label">Écoute</span>
                      <div className="history-attempts__part-score">{att.scoreChoukai} pts</div>
                    </div>
                  </div>

                  <div className="history-attempts__card-foot">
                    <span className="history-attempts__total-label">
                      Total :{' '}
                      <strong className="history-attempts__total-value">
                        {att.scoreTotal} / {att.maxScoreTotal} pts
                      </strong>
                    </span>
                    <span
                      className={`history-attempts__sync-status ${
                        att.isSynced
                          ? 'history-attempts__sync-status--synced'
                          : 'history-attempts__sync-status--pending'
                      }`}
                    >
                      <Wifi className="history-attempts__sync-icon" />
                      {att.isSynced ? 'Synced Cloud' : 'Attente Sync'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {mongoAttempts.length > 0 && (
        <div className="history-attempts history-attempts--cloud">
          <h2 className="history-attempts__heading">
            <Wifi className="history-attempts__heading-icon history-attempts__heading-icon--cloud" />
            Tentatives Sauvegardées sur MongoDB Atlas Cloud ({mongoAttempts.length})
          </h2>

          <div className="history-attempts__grid">
            {mongoAttempts.map((m) => (
              <div key={m._id} className="history-attempts__cloud-card">
                <div>
                  <div className="history-attempts__cloud-title">
                    {m.title} ({m.level})
                  </div>
                  <div className="history-attempts__cloud-date">
                    {new Date(m.createdAt).toLocaleString('fr-FR')}
                  </div>
                </div>
                <div className="history-attempts__cloud-right">
                  <div className="history-attempts__cloud-score">
                    {m.scoreTotal} / {m.maxScoreTotal} pts
                  </div>
                  <div
                    className={`history-attempts__cloud-verdict ${
                      m.passed
                        ? 'history-attempts__cloud-verdict--passed'
                        : 'history-attempts__cloud-verdict--failed'
                    }`}
                  >
                    {m.passed ? 'RÉUSSI' : 'ÉCHOUÉ'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
