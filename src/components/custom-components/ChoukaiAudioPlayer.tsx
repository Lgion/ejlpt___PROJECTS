'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Play, Pause, Square, FileText } from 'lucide-react';

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
  const [volume, setVolume] = useState(0.85);
  const [rate, setRate] = useState<0.75 | 1 | 1.25>(1);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopPlayback = () => {
    cancelledRef.current = true;
    setIsPlaying(false);
    setActiveLine(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const playChime = async () => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2 * volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
      await new Promise((r) => setTimeout(r, 480));
      void ctx.close();
    } catch {
      // Ignore Web Audio restriction if unavailable
    }
  };

  const handleTogglePlay = async () => {
    if (isFullMockMode && playCount >= 1 && !isPlaying) {
      return;
    }

    if (isPlaying) {
      stopPlayback();
      return;
    }

    cancelledRef.current = false;
    setIsPlaying(true);
    setPlayCount((prev) => prev + 1);

    // 1. Direct MP3/OGG playback when audioUrl exists
    if (audioUrl && audioRef.current) {
      try {
        audioRef.current.volume = volume;
        audioRef.current.playbackRate = rate;
        await audioRef.current.play();
        return;
      } catch (err) {
        console.warn('Direct audio playback failed, falling back to TTS:', err);
      }
    }

    // 2. Web Speech API ja-JP line-by-line synthesis from audioScript
    if (audioScript && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      await playChime();
      if (cancelledRef.current) return;

      const lines = audioScript
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      const voices = window.speechSynthesis.getVoices();
      const jaVoice = voices.find((v) => v.lang.toLowerCase().startsWith('ja')) || null;

      for (let i = 0; i < lines.length; i += 1) {
        if (cancelledRef.current) break;
        setActiveLine(i);
        const cleanSpoken = lines[i].replace(/^[A-Za-zぁ-んァ-ヶ一-龠]{1,8}[：:]\s*/, '');

        await new Promise<void>((resolve) => {
          const utt = new SpeechSynthesisUtterance(cleanSpoken || lines[i]);
          utt.lang = 'ja-JP';
          if (jaVoice) utt.voice = jaVoice;
          utt.rate = rate;
          utt.volume = volume;
          utt.onend = () => resolve();
          utt.onerror = () => resolve();
          window.speechSynthesis.speak(utt);
        });
      }

      if (!cancelledRef.current) {
        setIsPlaying(false);
        setActiveLine(null);
      }
      return;
    }

    // 3. Fallback chime timer if no script & no URL
    await playChime();
    setTimeout(() => {
      if (!cancelledRef.current) {
        setIsPlaying(false);
      }
    }, 1200);
  };

  const scriptLines = audioScript ? audioScript.split(/\r?\n/).filter((l) => l.trim()) : [];

  return (
    <div className="choukai-player">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="choukai-player__audio-el"
        />
      )}

      <div className="choukai-player__head">
        <div className="choukai-player__brand">
          <div className="choukai-player__icon-box">
            <Volume2 className="choukai-player__icon-lg" />
          </div>
          <div>
            <h4 className="choukai-player__title">
              Épreuve de Compréhension Orale (聴解 • TTS ja-JP)
            </h4>
            <p className="choukai-player__subtitle">
              {isFullMockMode
                ? 'Mode Officiel : 1 seule écoute autorisée'
                : 'Mode Entraînement : Vitesse ajustable & Transcript interactif'}
            </p>
          </div>
        </div>

        <div className="choukai-player__count-pill">
          <span>Lectures :</span>
          <span
            className={`choukai-player__count-value ${playCount > 0 && isFullMockMode ? 'choukai-player__count-value--used' : ''
              }`}
          >
            {playCount} {isFullMockMode ? '/ 1' : ''}
          </span>
        </div>
      </div>

      <div className="choukai-player__waveform">
        {[40, 70, 35, 90, 60, 20, 80, 50, 100, 30, 65, 85, 45, 95, 30, 60, 40, 75, 20, 90].map(
          (height, i) => (
            <div
              key={i}
              className={`choukai-player__bar ${isPlaying ? 'choukai-player__bar--playing' : ''}`}
              style={{
                height: isPlaying ? `${Math.max(20, Math.floor(height * 0.85))}%` : `${height / 3}%`,
                animationDelay: `${i * 70}ms`,
              }}
            />
          )
        )}
      </div>

      <div className="choukai-player__controls">
        <div className="choukai-player__play-group">
          <button
            type="button"
            onClick={() => void handleTogglePlay()}
            disabled={isFullMockMode && playCount >= 1 && !isPlaying}
            className={`choukai-player__play-btn ${isFullMockMode && playCount >= 1 && !isPlaying
              ? 'choukai-player__play-btn--locked'
              : isPlaying
                ? 'choukai-player__play-btn--playing'
                : ''
              }`}
          >
            {isPlaying ? (
              <>
                <Pause className="choukai-player__play-icon" /> Arrêter
              </>
            ) : (
              <>
                <Play className="choukai-player__play-icon" /> Écouter l&apos;audio
              </>
            )}
          </button>

          {isPlaying && (
            <button
              type="button"
              onClick={stopPlayback}
              aria-label="Arrêter la lecture"
              className="choukai-player__stop-btn"
            >
              <Square className="choukai-player__stop-icon" />
            </button>
          )}
        </div>

        <div className="choukai-player__tuning-group">
          <div className="choukai-player__rates">
            {([0.75, 1, 1.25] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRate(r)}
                className={`choukai-player__rate-btn ${rate === r ? 'choukai-player__rate-btn--active' : ''
                  }`}
              >
                {r}x
              </button>
            ))}
          </div>

          <label className="choukai-player__volume-label">
            <Volume2 className="choukai-player__small-icon" />
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume audio"
              className="choukai-player__volume-range"
            />
          </label>

          {!isFullMockMode && audioScript && (
            <button
              type="button"
              onClick={() => setShowScript(!showScript)}
              className="choukai-player__script-btn"
            >
              <FileText className="choukai-player__small-icon" />
              {showScript ? 'Masquer Transcript' : 'Transcript'}
            </button>
          )}
        </div>
      </div>

      {showScript && scriptLines.length > 0 && (
        <div className="choukai-player__script-panel">
          <div className="choukai-player__script-title">Transcription Japonaise (スクリプト) :</div>
          {scriptLines.map((line, i) => (
            <div
              key={i}
              className={`choukai-player__script-line ${activeLine === i ? 'choukai-player__script-line--active' : ''
                }`}
            >
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
