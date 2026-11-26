import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AiStatusBanner } from '@/components/ai/AiStatusBanner';

describe('AiStatusBanner', () => {
  it('renders nothing when idle or on normal success without fallback', () => {
    const { container: c1 } = render(<AiStatusBanner status="idle" />);
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(<AiStatusBanner status="success" usedFallback={false} />);
    expect(c2.firstChild).toBeNull();
  });

  it('displays sanitized retry and fallback feedback messages', () => {
    const { rerender } = render(
      <AiStatusBanner
        status="retrying"
        events={[{ phase: 'retry', attempt: 1, messageFr: 'Serveur IA occupé, nouvel essai…' }]}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent('Serveur IA occupé, nouvel essai…');

    rerender(<AiStatusBanner status="success" usedFallback />);
    expect(screen.getByRole('status')).toHaveTextContent('Modèle de secours activé');
  });

  it('displays error message and triggers onRetry when Réessayer is clicked', () => {
    const onRetry = vi.fn();
    render(
      <AiStatusBanner
        status="error"
        errorMessage="Le service IA est momentanément indisponible."
        onRetry={onRetry}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Le service IA est momentanément indisponible.'
    );
    fireEvent.click(screen.getByRole('button', { name: /Réessayer/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
