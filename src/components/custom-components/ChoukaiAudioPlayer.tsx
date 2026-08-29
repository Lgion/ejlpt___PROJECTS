'use client';

import React, { useState, useRef } from 'react';
import { Volume2, Play, Pause, RotateCcw, AlertTriangle, FileText } from 'lucide-react';

interface ChoukaiAudioPlayerProps {
  audioUrl?: string;
  audioScript?: string;
  isFullMockMode?: boolean;
}

export const ChoukaiAudioPlayer: React.FC<ChoukaiAudioPlayerProps> = ({
  audioUrl,
  audioScript,
  isFullMockMode = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [showScript, setShowScript] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Simulated web synthesizer audio for JLPT Choukai tone if no direct MP3
  const playSimulatedChoukaiAudio = () => {
    if (isFullMockMode && playCount >= 1) {
      alert('En mode Examen Blanc Officiel, l’écoute ne peut être jouée qu’une seule fois.');
      return;
    }

    if (isPlaying) {
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.pause();
      return;
    }

    setIsPlaying(true);
    setPlayCount(prev => prev + 1);

    // Audio chime simulation via Web Audio API if HTML audio fails or empty
    if (typeof window !== 'undefined') {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        
        // 2-tone JLPT chime (Ding-Dong)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain1.gain.setValueAtTime(0.3 * volume, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 1.2);

        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
          gain2.gain.setValueAtTime(0.3 * volume, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(ctx.currentTime);
          osc2.stop(ctx.currentTime + 1.5);
        }, 500);

        setTimeout(() => {
          setIsPlaying(false);
        }, 3000);
      } catch (err) {
        console.error('Web audio API error', err);
        setIsPlaying(false);
      }
    }
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">Épreuve de Compréhension Orale (聴解)</h4>
            <p className="text-xs text-slate-400">
              {isFullMockMode ? 'Mode Officiel : 1 seule écoute autorisée' : 'Mode Entraînement : Réécoute & Transcript disponibles'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
          <span>Lectures :</span>
          <span className={`font-bold ${playCount > 0 && isFullMockMode ? 'text-amber-400' : 'text-emerald-400'}`}>
            {playCount} {isFullMockMode ? '/ 1' : ''}
          </span>
        </div>
      </div>

      {/* Audio Wave Visualizer representation */}
      <div className="flex items-center justify-between gap-1 h-10 px-4 bg-slate-950 rounded-lg border border-slate-800/80">
        {[40, 70, 35, 90, 60, 20, 80, 50, 100, 30, 65, 85, 45, 95, 30, 60, 40, 75, 20, 90].map((height, i) => (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-300 ${
              isPlaying ? 'bg-indigo-400 animate-pulse' : 'bg-slate-700'
            }`}
            style={{
              height: isPlaying ? `${Math.max(20, Math.floor(height * Math.random()))}%` : `${height / 3}%`,
              animationDelay: `${i * 70}ms`,
            }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          onClick={playSimulatedChoukaiAudio}
          disabled={isFullMockMode && playCount >= 1 && !isPlaying}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-md ${
            isFullMockMode && playCount >= 1 && !isPlaying
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : isPlaying
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-current" /> Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" /> Lancer l&apos;écoute Audio
            </>
          )}
        </button>

        {!isFullMockMode && audioScript && (
          <button
            onClick={() => setShowScript(!showScript)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            {showScript ? 'Masquer Transcript' : 'Afficher Transcript'}
          </button>
        )}
      </div>

      {/* Transcript view if training mode */}
      {showScript && audioScript && (
        <div className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans">
          <div className="font-semibold text-indigo-400 mb-1 flex items-center gap-1">
            <span>Transcription Japonaise (スクリプト) :</span>
          </div>
          {audioScript}
        </div>
      )}
    </div>
  );
};
