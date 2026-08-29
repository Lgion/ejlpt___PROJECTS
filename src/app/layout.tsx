import type { Metadata } from 'next';
import { Inter, Noto_Sans_JP } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import Navbar from '@/components/Navbar';
import { DatabaseSeeder } from '@/components/DatabaseSeeder';
import { FuriganaProvider } from '@/context/FuriganaContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoSansJP = Noto_Sans_JP({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-noto-jp' });

export const metadata: Metadata = {
  title: 'eJLPT - Plateforme de Simulation d’Examen & Entraînement JLPT (N5-N1)',
  description: 'Préparez le JLPT du N5 au N1 avec des simulations complètes d’examen blanc, entraînement modulaire, lecteur audio Choukai et suivi Local-First Dexie + MongoDB Atlas.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="fr" className={`${inter.variable} ${notoSansJP.variable} dark`}>
        <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans antialiased selection:bg-sky-500 selection:text-white">
          <FuriganaProvider>
            <DatabaseSeeder />
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>
            <footer className="border-t border-slate-800 bg-slate-900/50 py-6 text-center text-xs text-slate-400">
              <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sky-400">eJLPT</span>
                  <span>• Plateforme Pédagogique d’Examen Japonais</span>
                </div>
                <div>
                  Stack : Next.js App Router • Clerk • Dexie.js (Offline) • MongoDB Atlas
                </div>
              </div>
            </footer>
          </FuriganaProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
