'use client';

import React from 'react';
import { Loader2, RefreshCw, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { AiAttemptEvent } from '@/lib/ai/geminiClient';

export type AiBannerStatus =
  | 'idle'
  | 'loading'
  | 'retrying'
  | 'fallback'
  | 'success'
  | 'error';

export interface AiStatusBannerProps {
  status: AiBannerStatus;
  events?: AiAttemptEvent[];
  usedFallback?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  compact?: boolean;
}

function resolveStatusDisplay(props: AiStatusBannerProps): {
  variant: 'loading' | 'warn' | 'success' | 'error';
  text: string;
} | null {
  const { status, events = [], usedFallback = false, errorMessage } = props;

  if (status === 'idle') return null;
  if (status === 'success' && !usedFallback) return null;

  const lastEvent = events.length > 0 ? events[events.length - 1] : undefined;

  if (status === 'error') {
    return {
      variant: 'error',
      text:
        errorMessage?.trim() ||
        'Le service IA est momentanément indisponible. Vous pouvez réessayer dans un instant.',
    };
  }

  if (status === 'success' && usedFallback) {
    return {
      variant: 'success',
      text: 'Modèle de secours activé pour répondre à votre demande.',
    };
  }

  if (status === 'fallback') {
    return {
      variant: 'warn',
      text: lastEvent?.messageFr || 'Bascule sur un modèle de secours…',
    };
  }

  if (status === 'retrying') {
    return {
      variant: 'warn',
      text: lastEvent?.messageFr || 'Serveur IA occupé, nouvel essai…',
    };
  }

  return {
    variant: 'loading',
    text: 'Traitement IA en cours…',
  };
}

export function AiStatusBanner(props: AiStatusBannerProps) {
  const display = resolveStatusDisplay(props);
  if (!display) return null;

  const { status, onRetry, compact = false } = props;
  const isError = status === 'error';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
      className={`ai-status-banner ai-status-banner--${display.variant} ${
        compact ? 'ai-status-banner--compact' : ''
      }`}
    >
      <div className="ai-status-banner__content">
        {display.variant === 'loading' && (
          <Loader2 className="ai-status-banner__icon ai-status-banner__icon--spin" aria-hidden="true" />
        )}
        {display.variant === 'warn' && (
          <RefreshCw className="ai-status-banner__icon ai-status-banner__icon--spin" aria-hidden="true" />
        )}
        {display.variant === 'success' && (
          <CheckCircle2 className="ai-status-banner__icon" aria-hidden="true" />
        )}
        {display.variant === 'error' && (
          <ShieldAlert className="ai-status-banner__icon" aria-hidden="true" />
        )}
        <span className="ai-status-banner__text">{display.text}</span>
      </div>

      {isError && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ai-status-banner__retry-btn"
        >
          <RefreshCw className="ai-status-banner__retry-icon" aria-hidden="true" />
          <span>Réessayer</span>
        </button>
      )}
    </div>
  );
}
