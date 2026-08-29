'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, SignInButton, useUser } from '@clerk/nextjs';
import { BookOpen, GraduationCap, ShieldCheck, PenTool, Wifi, WifiOff, Eye, Search } from 'lucide-react';
import { isAdminEmail } from '@/lib/admin';
import { localDb } from '@/lib/db';
import { useFurigana } from '@/context/FuriganaContext';
import { HeaderSearch } from './HeaderSearch';
import { SelectionBookmarkToolbar } from './SelectionBookmarkToolbar';

export default function Navbar() {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const { furiganaMode, cycleFuriganaMode } = useFurigana();
  const [isOnline, setIsOnline] = useState(true);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const isAdmin = isAdminEmail(userEmail);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkDexie = async () => {
      try {
        const count = await localDb.attempts.where('isSynced').equals(0).count();
        setUnsyncedCount(count);
      } catch (err) {
        // ignore
      }
    };
    checkDexie();
    const interval = setInterval(checkDexie, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const navLinks = [
    { href: '/', label: 'Examen Blancs', icon: GraduationCap },
    { href: '/kanji', label: 'Étude Kanji', icon: BookOpen },
    { href: '/tools', label: 'Outils & Canvas', icon: PenTool },
    { href: '/history', label: 'Mes Résultats', icon: BookOpen },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin Panel', icon: ShieldCheck, adminOnly: true }] : []),
  ];

  const getFuriganaModeBadge = () => {
    switch (furiganaMode) {
      case 'ALWAYS':
        return { label: 'Furigana: Toujours', color: 'bg-sky-950 text-sky-400 border-sky-800' };
      case 'HOVER':
        return { label: 'Furigana: Au survol 👁️', color: 'bg-purple-950 text-purple-400 border-purple-800' };
      case 'OFF':
        return { label: 'Furigana: Désactivé', color: 'bg-slate-900 text-slate-500 border-slate-800' };
      default:
        return { label: 'Furigana: Auto', color: 'bg-sky-950 text-sky-400 border-sky-800' };
    }
  };

  const badge = getFuriganaModeBadge();

  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
      {/* Mouse selection bookmark trigger component */}
      <SelectionBookmarkToolbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-sky-600/30 group-hover:scale-105 transition-transform">
            JLPT
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-100 tracking-tight text-lg">
              <span>eJLPT</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-400 font-mono font-medium">
                日本語
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">Simulations N5〜N1 & Apprentissage</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map(link => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-sky-600/10 text-sky-400 border border-sky-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
                } ${link.adminOnly ? 'text-amber-400 hover:text-amber-300' : ''}`}
              >
                <Icon className={`w-4 h-4 ${link.adminOnly ? 'text-amber-400' : ''}`} />
                <span>{link.label}</span>
                {link.adminOnly && (
                  <span className="text-[9px] uppercase px-1 py-0.2 bg-amber-950 text-amber-300 rounded border border-amber-800">
                    Admin
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Header Instant Search Bar */}
        <HeaderSearch />

        {/* Right side: Furigana toggle, Dexie status & Clerk User button */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Furigana Global Mode Button */}
          <button
            onClick={cycleFuriganaMode}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all shadow-sm ${badge.color}`}
            title="Cliquer pour faire défiler le mode Furigana (Toujours -> Au Survol -> Désactivé)"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{badge.label}</span>
          </button>

          {/* Dexie Sync Badge */}
          <div
            title={
              isOnline
                ? `En ligne - MongoDB Atlas actif`
                : `Hors-ligne - Dexie.js sauvegarde vos données localement`
            }
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isOnline
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                : 'bg-amber-950/60 text-amber-400 border-amber-800/80 animate-pulse'
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {unsyncedCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                {unsyncedCount}
              </span>
            )}
          </div>

          {/* User Profile via Clerk */}
          {isLoaded && (
            <div>
              {user ? (
                <UserButton />
              ) : (
                <SignInButton mode="modal">
                  <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/30 transition-colors">
                    Se Connecter
                  </button>
                </SignInButton>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
