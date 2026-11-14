import type { Metadata } from 'next';
import { Inter, Noto_Sans_JP, Noto_Serif_JP } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import '../styles/main.scss';
import Navbar from '@/components/Navbar';
import { DatabaseSeeder } from '@/components/DatabaseSeeder';
import { FuriganaProvider } from '@/context/FuriganaContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoSansJP = Noto_Sans_JP({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-noto-jp' });
const notoSerifJP = Noto_Serif_JP({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-noto-serif-jp' });

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
          <html lang="fr" className={`${inter.variable} ${notoSansJP.variable} ${notoSerifJP.variable} app-html--dark`}>
        <body className="app-body">
          <FuriganaProvider>
            <DatabaseSeeder />
            <Navbar />
            <main className="app-main">{children}</main>
            <footer className="app-footer">
              <div className="app-footer__inner">
                <div className="app-footer__brand">
                  <span className="app-footer__title">eJLPT</span>
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
