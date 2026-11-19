import React from 'react';
import { JLPTQuestion, ExamResult } from '@/types/jlpt';
import { FuriganaText } from '@/components/custom-components/FuriganaText';
import { RichJLPTText } from '@/components/exam/RichJLPTText';
import { CheckCircle, XCircle, Sparkles } from 'lucide-react';

interface ExamResultsViewProps {
  result: ExamResult;
  questions: JLPTQuestion[];
  answers: Record<string, string>;
  isSignedIn: boolean;
  formatTime: (totalSeconds: number) => string;
  onExit: () => void;
}

export function ExamResultsView({
  result,
  questions,
  answers,
  isSignedIn,
  formatTime,
  onExit,
}: ExamResultsViewProps) {
  const statusMod = result.passed ? 'passed' : 'failed';
  const isOfficial180 = result.scoringScale === 'JLPT_180' && Boolean(result.officialBreakdown);
  const bd = result.officialBreakdown;

  return (
    <div className="exam-results">
      <div className="exam-results__hero">
        <div className={`exam-results__status-circle exam-results__status-circle--${statusMod}`}>
          {result.passed ? (
            <CheckCircle className="exam-results__status-icon" />
          ) : (
            <XCircle className="exam-results__status-icon" />
          )}
        </div>
        <div>
          <span className={`exam-results__status-pill exam-results__status-pill--${statusMod}`}>
            {result.passed ? 'RÉUSSITE (合格 - PASSED)' : 'ÉCHEC (不合格 - FAILED)'}
          </span>
          <h3 className="exam-results__total-score">
            Score Total : {result.scoreTotal} / {result.maxScoreTotal} pts
          </h3>
          <p className="exam-results__meta">
            {isOfficial180 && bd && (
              <span>
                Barème officiel JLPT {result.level} (seuil ≥{' '}
                {bd.requiredTotalScore ?? 95}/{result.maxScoreTotal} et ≥{' '}
                {bd.usesCombinedLanguageReading ? '38/120 écrit · 19/60 écoute' : '19/60 par domaine'}
                ) •{' '}
              </span>
            )}
            Temps écoulé : {formatTime(result.timeSpentSeconds)} • Enregistré localement dans Dexie
            {isSignedIn
              ? ' & synchronisé vers MongoDB Atlas'
              : ' (connectez-vous pour synchroniser sur le cloud)'}
          </p>
        </div>
      </div>

      <div className="exam-results__sections">
        <div className="exam-results__section-card">
          <span className="exam-results__section-label">
            {isOfficial180
              ? '言語知識（文字・語彙・文法）'
              : '文字・語彙 (Vocabulaire)'}
          </span>
          <div className="exam-results__section-values">
            <span className="exam-results__section-score">
              {result.scoreMojiGo} / {result.maxScoreMojiGo}
            </span>
            <span
              className={`exam-results__section-status ${
                result.passedMojiGo
                  ? 'exam-results__section-status--passed'
                  : 'exam-results__section-status--failed'
              }`}
            >
              {result.maxScoreMojiGo === 0
                ? 'Non évalué'
                : result.passedMojiGo
                  ? isOfficial180
                    ? bd?.usesCombinedLanguageReading
                      ? 'Validé (écrit ≥38/120)'
                      : 'Validé (≥19)'
                    : 'Validé'
                  : isOfficial180
                    ? bd?.usesCombinedLanguageReading
                      ? 'Éliminé (<38/120)'
                      : 'Éliminé (<19)'
                    : 'Éliminé (<31%)'}
            </span>
          </div>
        </div>

        <div className="exam-results__section-card">
          <span className="exam-results__section-label">
            {isOfficial180 ? '読解 (Compréhension écrite)' : '文法・読解 (Grammaire/Lecture)'}
          </span>
          <div className="exam-results__section-values">
            <span className="exam-results__section-score">
              {result.scoreBunpouDokkai} / {result.maxScoreBunpouDokkai}
            </span>
            <span
              className={`exam-results__section-status ${
                result.passedBunpouDokkai
                  ? 'exam-results__section-status--passed'
                  : 'exam-results__section-status--failed'
              }`}
            >
              {result.maxScoreBunpouDokkai === 0
                ? 'Non évalué'
                : result.passedBunpouDokkai
                  ? isOfficial180
                    ? bd?.usesCombinedLanguageReading
                      ? 'Validé (écrit ≥38/120)'
                      : 'Validé (≥19)'
                    : 'Validé'
                  : isOfficial180
                    ? bd?.usesCombinedLanguageReading
                      ? 'Éliminé (<38/120)'
                      : 'Éliminé (<19)'
                    : 'Éliminé (<31%)'}
            </span>
          </div>
        </div>

        <div className="exam-results__section-card">
          <span className="exam-results__section-label">聴解 (Écoute Choukai)</span>
          <div className="exam-results__section-values">
            <span className="exam-results__section-score">
              {result.scoreChoukai} / {result.maxScoreChoukai}
            </span>
            <span
              className={`exam-results__section-status ${
                result.passedChoukai
                  ? 'exam-results__section-status--passed'
                  : 'exam-results__section-status--failed'
              }`}
            >
              {result.maxScoreChoukai === 0
                ? 'Non évalué'
                : result.passedChoukai
                  ? isOfficial180
                    ? 'Validé (≥19)'
                    : 'Validé'
                  : isOfficial180
                    ? 'Éliminé (<19)'
                    : 'Éliminé (<31%)'}
            </span>
          </div>
        </div>
      </div>

      {isOfficial180 && bd && (
        <div className="jlpt-official-breakdown">
          <h4 className="jlpt-official-breakdown__title">
            Détail brut par partie d&apos;épreuve officielle
          </h4>
          <div className="jlpt-official-breakdown__grid">
            {bd.vocabTotal > 0 && (
              <div className="jlpt-official-breakdown__item">
                <span>文字・語彙 (Vocabulaire)</span>
                <strong>
                  {bd.vocabCorrect} / {bd.vocabTotal}
                </strong>
              </div>
            )}
            {bd.grammarTotal > 0 && (
              <div className="jlpt-official-breakdown__item">
                <span>文法 (Grammaire)</span>
                <strong>
                  {bd.grammarCorrect} / {bd.grammarTotal}
                </strong>
              </div>
            )}
            {bd.readingTotal > 0 && (
              <div className="jlpt-official-breakdown__item">
                <span>読解 (Lecture)</span>
                <strong>
                  {bd.readingCorrect} / {bd.readingTotal}
                </strong>
              </div>
            )}
            {bd.listeningTotal > 0 && (
              <div className="jlpt-official-breakdown__item">
                <span>聴解 (Écoute)</span>
                <strong>
                  {bd.listeningCorrect} / {bd.listeningTotal}
                </strong>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="exam-results__corrections">
        <h4 className="exam-results__corrections-title">
          <Sparkles className="exam-results__corrections-icon" />
          Correction Détaillée &amp; Explications Pédagogiques
        </h4>

        {questions.map((q, idx) => {
          const userAns = answers[q.id];
          const isCorrect = userAns === q.correctOptionId;

          return (
            <div
              key={q.id}
              className={`exam-results__question-card ${
                isCorrect
                  ? 'exam-results__question-card--correct'
                  : 'exam-results__question-card--wrong'
              }`}
            >
              <div className="exam-results__question-head">
                <div className="exam-results__question-badges">
                  <span className="exam-results__question-num">
                    {q.mondaiNumber && q.questionNumber
                      ? `問題${q.mondaiNumber} · Q${q.questionNumber}`
                      : `Q${idx + 1}`}
                  </span>
                  <span className="exam-results__question-subcat">{q.subCategory}</span>
                </div>

                <span
                  className={`exam-results__question-verdict ${
                    isCorrect
                      ? 'exam-results__question-verdict--correct'
                      : 'exam-results__question-verdict--wrong'
                  }`}
                >
                  {isCorrect ? (
                    <CheckCircle className="exam-results__verdict-icon" />
                  ) : (
                    <XCircle className="exam-results__verdict-icon" />
                  )}
                  {isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>

              <div className="exam-results__question-prompt" lang="ja">
                {q.promptTokens ? (
                  <RichJLPTText tokens={q.promptTokens} furiganaPolicy="official_booklet" />
                ) : (
                  <FuriganaText text={q.prompt} reading={q.furiganaPrompt} />
                )}
              </div>

              <div className="exam-results__question-options">
                {q.options.map((opt) => {
                  const isUserChoice = userAns === opt.id;
                  const isRightAns = q.correctOptionId === opt.id;

                  let optMod = '';
                  if (isRightAns) optMod = 'exam-results__option--right';
                  else if (isUserChoice && !isRightAns) optMod = 'exam-results__option--wrong';

                  return (
                    <div key={opt.id} className={`exam-results__option ${optMod}`}>
                      <span className="exam-results__option-num">{opt.id}</span>
                      {opt.tokens ? (
                        <RichJLPTText tokens={opt.tokens} furiganaPolicy="official_booklet" />
                      ) : (
                        <FuriganaText text={opt.label} reading={opt.reading} />
                      )}
                    </div>
                  );
                })}
              </div>

              {q.audioScript && (
                <div className="exam-results__script-box">
                  <div className="exam-results__script-box-title">
                    Transcription audio officielle (N3 スクリプト)
                  </div>
                  <div className="exam-results__script-box-body" lang="ja">
                    {q.audioScript}
                  </div>
                </div>
              )}

              <div className="exam-results__explanation">
                <span className="exam-results__explanation-label">Explication (FR) : </span>
                {q.explanationFr}
              </div>
            </div>
          );
        })}
      </div>

      <div className="exam-results__footer">
        <button type="button" onClick={onExit} className="exam-results__exit-btn">
          Retourner au Tableau de Bord
        </button>
      </div>
    </div>
  );
}
