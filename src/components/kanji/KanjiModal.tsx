'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface KanjiModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  onClose: () => void;
  children: React.ReactNode;
}

export function KanjiModal({
  open,
  title,
  subtitle,
  size = 'md',
  onClose,
  children,
}: KanjiModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      if (open) onClose();
    };
    dialog.addEventListener('close', handleClose);

    if ('closedBy' in HTMLDialogElement.prototype) {
      return () => dialog.removeEventListener('close', handleClose);
    }

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) dialog.close();
      pressedOutside = false;
    };

    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('pointerup', onPointerUp);

    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('pointerup', onPointerUp);
    };
  }, [open, onClose]);

  const sizeClass =
    size === 'sm'
      ? 'kanji-modal--sm'
      : size === 'lg'
        ? 'kanji-modal--lg'
        : 'kanji-modal--md';

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-label={title}
      className={`kanji-modal ${sizeClass}`}
    >
      <div className="kanji-modal__surface">
        <div className="kanji-modal__head">
          <div className="kanji-modal__title-wrap">
            <h2 className="kanji-modal__title">{title}</h2>
            {subtitle && <span className="kanji-modal__subtitle">{subtitle}</span>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            className="kanji-modal__close-btn"
          >
            <X className="kanji-modal__close-icon" />
          </button>
        </div>

        <div className="kanji-modal__body">{children}</div>
      </div>
    </dialog>
  );
}

