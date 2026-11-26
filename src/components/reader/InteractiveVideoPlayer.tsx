'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  Captions,
  Film,
  Play,
  PlusCircle,
  Upload,
  Tv,
} from 'lucide-react';
import {
  analyzeJapaneseText,
  type TextToken,
} from '@/lib/textAnalyzer';
import {
  DEMO_SUBTITLE_VTT,
  extractYouTubeVideoId,
  findActiveCueIndex,
  parseSubtitleFile,
  type SubtitleCue,
} from '@/lib/subtitleParser';
import { AnnotatedJapaneseToken } from '@/components/visual/AnnotatedJapaneseToken';
import { localDb } from '@/lib/db';
import { enqueueSyncAction } from '@/lib/sync';
import { recordErrorToSRS } from '@/lib/srs';
import { useUser } from '@clerk/nextjs';

interface YTPlayerInstance {
  getCurrentTime?: () => number;
  seekTo?: (seconds: number, allowSeekAhead?: boolean) => void;
  pauseVideo?: () => void;
  destroy?: () => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        opts: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: { onReady?: () => void };
        }
      ) => YTPlayerInstance;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function formatCueTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function InteractiveVideoPlayer() {
  const { isSignedIn } = useUser();
  const [sourceMode, setSourceMode] = useState<'local' | 'youtube'>('local');
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [localVideoName, setLocalVideoName] = useState<string>('');
  const [youtubeInput, setYoutubeInput] = useState<string>('');
  const [youtubeId, setYoutubeId] = useState<string | null>(null);

  const [cues, setCues] = useState<SubtitleCue[]>(() => parseSubtitleFile(DEMO_SUBTITLE_VTT));
  const [subtitleLabel, setSubtitleLabel] = useState<string>('Sous-titres démo N4–N3');
  const [currentTime, setCurrentTime] = useState<number>(1);
  const [activeTokens, setActiveTokens] = useState<TextToken[]>([]);
  const [selectedToken, setSelectedToken] = useState<TextToken | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<YTPlayerInstance | null>(null);

  useEffect(() => {
    return () => {
      if (localVideoUrl) {
        URL.revokeObjectURL(localVideoUrl);
      }
      ytPlayerRef.current?.destroy?.();
    };
  }, [localVideoUrl]);

  // YouTube IFrame API setup & time polling
  useEffect(() => {
    if (sourceMode !== 'youtube' || !youtubeId) return;

    let timerId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const mountPlayer = () => {
      if (cancelled || !ytContainerRef.current || !window.YT?.Player) return;
      ytPlayerRef.current?.destroy?.();
      ytPlayerRef.current = new window.YT.Player(ytContainerRef.current, {
        videoId: youtubeId,
        playerVars: { modestbranding: 1, rel: 0 },
        events: {
          onReady: () => {
            timerId = setInterval(() => {
              const t = ytPlayerRef.current?.getCurrentTime?.();
              if (typeof t === 'number' && Number.isFinite(t)) {
                setCurrentTime(t);
              }
            }, 250);
          },
        },
      });
    };

    if (window.YT?.Player) {
      mountPlayer();
    } else {
      const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      window.onYouTubeIframeAPIReady = () => mountPlayer();
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (timerId) clearInterval(timerId);
      ytPlayerRef.current?.destroy?.();
      ytPlayerRef.current = null;
    };
  }, [sourceMode, youtubeId]);

  const activeCueIndex = useMemo(() => findActiveCueIndex(cues, currentTime), [cues, currentTime]);
  const activeCue = activeCueIndex >= 0 ? cues[activeCueIndex] : cues[0] || null;

  useEffect(() => {
    let active = true;
    const text = activeCue?.text || '';
    if (!text) {
      queueMicrotask(() => setActiveTokens([]));
      return;
    }
    void analyzeJapaneseText(text, 'N4').then((res) => {
      if (active) setActiveTokens(res.tokens);
    });
    return () => {
      active = false;
    };
  }, [activeCue]);

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (localVideoUrl) URL.revokeObjectURL(localVideoUrl);
    const url = URL.createObjectURL(file);
    setLocalVideoUrl(url);
    setLocalVideoName(file.name);
  };

  const handleSubtitleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseSubtitleFile(text);
    if (parsed.length === 0) {
      setNotice('Aucune réplique horodatée détectée dans ce fichier .srt / .vtt.');
      return;
    }
    setCues(parsed);
    setSubtitleLabel(`${file.name} (${parsed.length} sous-titres)`);
    setCurrentTime(parsed[0].startSec);
    setSelectedToken(null);
    setNotice(null);
  };

  const handleLoadYoutube = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractYouTubeVideoId(youtubeInput);
    if (!id) {
      setNotice('URL ou identifiant YouTube invalide.');
      return;
    }
    setNotice(null);
    setYoutubeId(id);
  };

  const handleSeekToCue = (cue: SubtitleCue) => {
    setCurrentTime(cue.startSec);
    if (sourceMode === 'local' && videoRef.current) {
      videoRef.current.currentTime = cue.startSec;
      void videoRef.current.play().catch(() => undefined);
    } else if (sourceMode === 'youtube' && ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(cue.startSec, true);
    }
  };

  const handleSelectSubtitleToken = (tok: TextToken) => {
    setSelectedToken(tok);
    if (sourceMode === 'local' && videoRef.current) {
      videoRef.current.pause();
    } else if (sourceMode === 'youtube') {
      ytPlayerRef.current?.pauseVideo?.();
    }
  };

  const handleBookmarkSelected = async () => {
    if (!selectedToken) return;
    const payload = {
      bookmarkId: `bm_${crypto.randomUUID()}`,
      type: (selectedToken.kind === 'kanji' ? 'KANJI' : 'VOCAB') as 'KANJI' | 'VOCAB',
      kanjiOrWord: selectedToken.text,
      reading: selectedToken.reading || '',
      meaning: selectedToken.meaning || selectedToken.text,
      level: selectedToken.jlpt || 'N0',
      notes: 'Extrait depuis Lecteur Vidéo Sous-Titres Interactifs',
      createdAt: new Date().toISOString(),
      isSynced: 0 as const,
    };
    await localDb.bookmarks.add(payload);
    await enqueueSyncAction('SAVE_BOOKMARK', payload, Boolean(isSignedIn));
    setNotice(`« ${selectedToken.text} » sauvegardé dans votre carnet !`);
  };

  const handleAddSelectedToSrs = async () => {
    if (!selectedToken) return;
    await recordErrorToSRS({
      cardId: `jukugo:${selectedToken.text}`,
      itemType: selectedToken.kind === 'kanji' ? 'KANJI' : 'JUKUGO',
      itemKey: selectedToken.text,
      level: selectedToken.jlpt || 'N0',
      prompt: `Sens de « ${selectedToken.text} »`,
      reading: selectedToken.reading,
      answer: selectedToken.meaning || selectedToken.text,
    });
    setNotice(`« ${selectedToken.text} » ajouté à votre file SRS SM-2 !`);
  };

  return (
    <section className="video-subs">
      <div className="video-subs__header">
        <div>
          <h2 className="video-subs__title">Lecteur Vidéo à Sous-Titres Interactifs</h2>
          <p className="video-subs__subtitle">
            Chargez un fichier vidéo local (aucun upload serveur) ou une vidéo YouTube, puis importez
            vos sous-titres <code>.srt</code> / <code>.vtt</code> pour cliquer sur chaque mot japonais.
          </p>
        </div>

        <div className="video-subs__mode-tabs">
          <button
            type="button"
            onClick={() => setSourceMode('local')}
            className={`video-subs__mode-btn ${
              sourceMode === 'local' ? 'video-subs__mode-btn--active' : ''
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Vidéo locale (MP4 / WebM)</span>
          </button>
          <button
            type="button"
            onClick={() => setSourceMode('youtube')}
            className={`video-subs__mode-btn ${
              sourceMode === 'youtube' ? 'video-subs__mode-btn--active' : ''
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>YouTube IFrame</span>
          </button>
        </div>
      </div>

      <div className="video-subs__imports">
        {sourceMode === 'local' ? (
          <label className="video-subs__upload-btn">
            <Upload className="w-4 h-4" />
            <span>{localVideoName ? `Vidéo : ${localVideoName}` : 'Choisir un MP4 / WebM local'}</span>
            <input
              type="file"
              accept="video/mp4,video/webm,video/*"
              onChange={handleVideoFileChange}
              className="hidden"
            />
          </label>
        ) : (
          <form onSubmit={handleLoadYoutube} className="flex flex-1 min-w-[260px] gap-2">
            <input
              type="text"
              value={youtubeInput}
              onChange={(e) => setYoutubeInput(e.target.value)}
              placeholder="Coller URL YouTube ou ID (ex: https://youtu.be/...)"
              className="video-subs__input"
            />
            <button type="submit" className="video-subs__load-btn">
              <Play className="w-3.5 h-3.5" />
              <span>Charger</span>
            </button>
          </form>
        )}

        <label className="video-subs__upload-btn">
          <Captions className="w-4 h-4" />
          <span>Importer .SRT / .VTT</span>
          <input
            type="file"
            accept=".srt,.vtt,text/vtt,text/plain"
            onChange={(e) => void handleSubtitleUpload(e)}
            className="hidden"
          />
        </label>

        <button
          type="button"
          onClick={() => {
            const parsed = parseSubtitleFile(DEMO_SUBTITLE_VTT);
            setCues(parsed);
            setSubtitleLabel('Sous-titres démo N4–N3');
            setCurrentTime(parsed[0]?.startSec ?? 0);
          }}
          className="video-subs__demo-btn"
        >
          Réinitialiser démo ({subtitleLabel})
        </button>
      </div>

      {notice && <div className="video-subs__notice">{notice}</div>}

      <div className="video-subs__grid">
        <div className="video-subs__player-col">
          <div className="video-subs__viewport">
            {sourceMode === 'local' ? (
              localVideoUrl ? (
                <video
                  ref={videoRef}
                  src={localVideoUrl}
                  controls
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  className="w-full h-full max-h-[360px] rounded-xl bg-black"
                />
              ) : (
                <div className="video-subs__empty-viewport">
                  Sélectionnez un fichier MP4/WebM local ou testez les sous-titres interactifs ci-dessous.
                </div>
              )
            ) : youtubeId ? (
              <div ref={ytContainerRef} className="w-full aspect-video rounded-xl overflow-hidden bg-black" />
            ) : (
              <div className="video-subs__empty-viewport">
                Entrez un lien YouTube ci-dessus pour synchroniser l’API IFrame YouTube avec vos sous-titres.
              </div>
            )}
          </div>

          <div className="video-subs__active-cue" lang="ja">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">
              Sous-titre actif ({activeCue ? formatCueTime(activeCue.startSec) : '00:00'}) — cliquez sur un mot pour mettre en pause et inspecter :
            </div>
            <div className="flex flex-wrap items-center gap-1 text-lg leading-relaxed">
              {activeTokens.map((tok, idx) => {
                if (tok.kind === 'text' || tok.kind === 'newline') {
                  return <span key={idx}>{tok.text}</span>;
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSubtitleToken(tok)}
                    className={`px-1 py-0.5 rounded-lg transition-colors cursor-pointer ${
                      selectedToken?.text === tok.text ? 'bg-indigo-600/40 ring-1 ring-indigo-400' : 'hover:bg-slate-800'
                    }`}
                  >
                    <AnnotatedJapaneseToken
                      text={tok.text}
                      reading={tok.reading}
                      showFurigana
                      jlpt={tok.jlpt}
                      masteryTier={tok.masteryTier}
                      frequencyScore10={tok.frequencyScore10}
                      grammaticalTag={tok.grammaticalTag}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {selectedToken && (
            <div className="video-subs__inspector">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xl font-black text-white mr-2" lang="ja">
                    {selectedToken.text}
                  </span>
                  {selectedToken.reading && (
                    <span className="text-xs text-sky-400 mr-2" lang="ja">
                      [{selectedToken.reading}]
                    </span>
                  )}
                  <span className="text-xs font-bold text-indigo-300">{selectedToken.jlpt || 'N0'}</span>
                  <div className="text-xs text-slate-300 mt-1">
                    {selectedToken.meaning || 'Sens indisponible hors-ligne.'}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleBookmarkSelected()}
                    className="video-subs__action-btn"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Carnet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAddSelectedToSrs()}
                    className="video-subs__action-btn video-subs__action-btn--srs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ SRS</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="video-subs__timeline">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Timeline des sous-titres ({cues.length})
          </div>
          <div className="video-subs__cue-list">
            {cues.map((cue, idx) => {
              const isCurrent = idx === activeCueIndex;
              return (
                <button
                  key={`${cue.index}-${cue.startSec}`}
                  type="button"
                  onClick={() => handleSeekToCue(cue)}
                  className={`video-subs__cue-row ${
                    isCurrent ? 'video-subs__cue-row--active' : ''
                  }`}
                >
                  <span className="font-mono text-[11px] text-sky-400 shrink-0">
                    {formatCueTime(cue.startSec)}
                  </span>
                  <span className="text-xs text-left text-slate-200" lang="ja">
                    {cue.text}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}
