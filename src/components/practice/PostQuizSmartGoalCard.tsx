import React from 'react';
import Link from 'next/link';
import { Target, ArrowRight } from 'lucide-react';
import type { PostQuizSmartGoal } from '@/lib/smartGoals';

interface PostQuizSmartGoalCardProps {
  goal: PostQuizSmartGoal;
}

export function PostQuizSmartGoalCard({ goal }: PostQuizSmartGoalCardProps) {
  return (
    <div className={`smart-goal-card smart-goal-card--${goal.tier}`}>
      <div className="smart-goal-card__head">
        <span className="smart-goal-card__kicker">
          <Target className="w-4 h-4" />
          Recommandation SMART post-session
        </span>
      </div>
      <h3 className="smart-goal-card__title">{goal.title}</h3>
      <ul className="smart-goal-card__list">
        <li>
          <strong>Spécifique :</strong> {goal.specificFr}
        </li>
        <li>
          <strong>Mesurable :</strong> {goal.measurableFr}
        </li>
        <li>
          <strong>Atteignable :</strong> {goal.achievableFr}
        </li>
        <li>
          <strong>Temporel :</strong> {goal.timeboundFr}
        </li>
      </ul>
      <div className="smart-goal-card__footer">
        <Link href={goal.href} className="smart-goal-card__cta">
          <span>{goal.cta}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
