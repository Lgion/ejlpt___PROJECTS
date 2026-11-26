'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, SignInButton, useUser } from '@clerk/nextjs';
import {
  BookOpen,
  GraduationCap,
  ShieldCheck,
  PenTool,
  Wifi,
  WifiOff,
  Eye,
  Bookmark,
  Sparkles,
  MessageSquare,
  History,
  Zap,
  BookText,
  Library,
  SlidersHorizontal,
} from 'lucide-react';
import { isAdminEmail } from '@/lib/admin';
import { localDb } from '@/lib/db';
import { flushSyncQueue } from '@/lib/sync';
import { useFurigana } from '@/context/FuriganaContext';
import { useVisualSystem } from '@/context/VisualSystemContext';
import { HeaderSearch } from './HeaderSearch';
import { SelectionBookmarkToolbar } from './SelectionBookmarkToolbar';

export default function Navbar() {
  const pathname = usePathname();
  const { user, isLoaded, isSignedIn } = useUser();
  const { furiganaMode, cycleFuriganaMode } = useFurigana();
  const { adaptiveProfile, cycleAdaptiveProfile } = useVisualSystem();
  const [isOnline, setIsOnline] = useState(true);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const isAdmin = isAdminEmail(userEmail);

  useEffect(() => {
    const syncOnline = () => setIsOnline(navigator.onLine);
    queueMicrotask(syncOnline);

    const checkDexiePending = async () => {
      try {
        const [attemptsPending, bookmarksPending, queueCount] = await Promise.all([
          localDb.attempts.where('isSynced').equals(0).count(),
          localDb.bookmarks.where('isSynced').equals(0).count(),
          localDb.syncQueue.count(),
        ]);
        setUnsyncedCount(Math.max(attemptsPending + bookmarksPending, queueCount));
      } catch {
        // ignore
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      if (isLoaded && isSignedIn) {
        void flushSyncQueue(true).then(() => checkDexiePending());
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (isLoaded && isSignedIn && navigator.onLine) {
      void flushSyncQueue(true).then(() => checkDexiePending());
    } else {
      void checkDexiePending();
    }

    const interval = setInterval(() => void checkDexiePending(), 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isLoaded, isSignedIn]);

  const navLinks = [
    { href: '/', label: 'Examens', icon: GraduationCap },
    { href: '/kanji', label: 'Kanji', icon: BookOpen },
    { href: '/dictionary', label: 'Dico', icon: Library },
    { href: '/grammar', label: 'Grammaire', icon: Sparkles },
    { href: '/slang', label: 'Slang', icon: MessageSquare },
    { href: '/practice', label: 'Quiz & SRS', icon: Zap },
    { href: '/reader', label: 'Lecteur', icon: BookText },
    { href: '/bookmarks', label: 'Carnet', icon: Bookmark },
    { href: '/tools', label: 'Outils', icon: PenTool },
    { href: '/history', label: 'Historique', icon: History },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: ShieldCheck, adminOnly: true }] : []),
  ];

  const getFuriganaModeBadge = () => {
    switch (furiganaMode) {
      case 'ALWAYS':
        return { label: 'Furigana: Toujours', modifier: 'site-header__furigana-btn--sky' };
      case 'HOVER':
        return { label: 'Furigana: Survol', modifier: 'site-header__furigana-btn--purple' };
      case 'OFF':
        return { label: 'Furigana: Off', modifier: 'site-header__furigana-btn--off' };
      default:
        return { label: 'Furigana: Auto', modifier: 'site-header__furigana-btn--sky' };
    }
  };

  const badge = getFuriganaModeBadge();
  const profileLabel =
    adaptiveProfile === 'beginner'
      ? 'Profil: Débutant'
      : adaptiveProfile === 'advanced'
        ? 'Profil: Avancé'
        : 'Profil: Interm.';

  return (
    <header className="site-header">
      <SelectionBookmarkToolbar />

      <div className="site-header__inner">
        <Link href="/" className="site-header__brand">
          <div className="site-header__logo-badge">
            JLPT
          </div>
          <div className="site-header__brand-text">
            <div className="site-header__brand-title">
              <span>eJLPT</span>
              <span className="site-header__brand-tag">
                日本語
              </span>
            </div>
          </div>
        </Link>

        <nav aria-label="Navigation principale" className="site-header__nav">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`site-header__nav-link ${
                  isActive ? 'site-header__nav-link--active' : ''
                } ${link.adminOnly ? 'site-header__nav-link--admin' : ''}`}
              >
                <Icon
                  className={`site-header__nav-icon ${
                    link.adminOnly ? 'site-header__nav-icon--admin' : ''
                  }`}
                />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <HeaderSearch />

        <div className="site-header__actions">
          <button
            type="button"
            onClick={cycleAdaptiveProfile}
            className="site-header__furigana-btn site-header__furigana-btn--purple"
            title="Profil adaptatif Kanjiverse (Débutant -> Intermédiaire -> Avancé)"
          >
            <SlidersHorizontal className="site-header__nav-icon" />
            <span className="site-header__furigana-label">{profileLabel}</span>
          </button>

          <button
            type="button"
            onClick={cycleFuriganaMode}
            className={`site-header__furigana-btn ${badge.modifier}`}
            title="Cliquer pour faire défiler le mode Furigana (Toujours -> Survol -> Désactivé)"
          >
            <Eye className="site-header__nav-icon" />
            <span className="site-header__furigana-label">{badge.label}</span>
          </button>

          <Link
            href="/history"
            title={
              isOnline
                ? `En ligne — ${unsyncedCount} élément(s) en attente de synchronisation`
                : `Hors-ligne — ${unsyncedCount} élément(s) sauvegardés dans Dexie.js`
            }
            className={`site-header__sync-link ${
              isOnline ? 'site-header__sync-link--online' : 'site-header__sync-link--offline'
            }`}
          >
            {isOnline ? (
              <Wifi className="site-header__sync-icon" />
            ) : (
              <WifiOff className="site-header__sync-icon" />
            )}
            {unsyncedCount > 0 && (
              <span className="site-header__sync-count">{unsyncedCount}</span>
            )}
          </Link>

          {isLoaded && (
            <div>
              {user ? (
                <UserButton />
              ) : (
                <SignInButton mode="modal">
                  <button type="button" className="site-header__login-btn">
                    Connexion
                  </button>
                </SignInButton>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compact Secondary Nav Bar for tablet/mobile viewports */}
      <nav aria-label="Navigation mobile" className="site-header__mobile-nav">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`site-header__mobile-link ${
                isActive ? 'site-header__mobile-link--active' : ''
              }`}
            >
              <Icon className="site-header__nav-icon" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
