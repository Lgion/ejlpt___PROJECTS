import React from 'react';
import { Sparkles } from 'lucide-react';

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;

export function HomeHero() {
  return (
    <section className="home-hero">
      <div className="home-hero__glow" />
      <div className="home-hero__content">
        <div className="home-hero__badge">
          <Sparkles className="home-hero__badge-icon" />
          <span>Simulations d&apos;Examens JLPT N5 〜 N1</span>
        </div>

        <h1 className="home-hero__title">
          Passez vos simulations du{' '}
          <span className="home-hero__highlight">JLPT en conditions réelles</span>
        </h1>

        <p className="home-hero__subtitle">
          Évaluez votre niveau d&apos;examen complet avec chronomètre strict et barème officiel, ou
          entraînez-vous par épreuve spécifique (Vocabulaire, Grammaire, Écoute Choukai).
        </p>

        <div className="home-hero__levels">
          {JLPT_LEVELS.map((lvl) => (
            <span key={lvl} className="home-hero__level-pill">
              JLPT {lvl}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

