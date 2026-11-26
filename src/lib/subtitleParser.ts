export interface SubtitleCue {
  index: number;
  startSec: number;
  endSec: number;
  text: string;
}

export function parseTimestampToSeconds(raw: string): number {
  const clean = raw.trim().replace(',', '.');
  const parts = clean.split(':').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return 0;

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}

function stripSubtitleMarkup(line: string): string {
  return line
    .replace(/<[^>]+>/g, '')
    .replace(/\{[^}]+\}/g, '')
    .trim();
}

export function parseSubtitleFile(raw: string): SubtitleCue[] {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^\uFEFF/, '');
  const blocks = normalized.split(/\n{2,}/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    if (lines[0].toUpperCase().startsWith('WEBVTT') || lines[0].startsWith('NOTE')) {
      continue;
    }

    const timeLineIdx = lines.findIndex((l) => l.includes('-->'));
    if (timeLineIdx < 0) continue;

    const timeLine = lines[timeLineIdx];
    const [startRaw, endAndSettings] = timeLine.split('-->').map((s) => s.trim());
    if (!startRaw || !endAndSettings) continue;

    const endRaw = endAndSettings.split(/\s+/)[0] || '';
    const startSec = parseTimestampToSeconds(startRaw);
    const endSec = Math.max(startSec + 0.5, parseTimestampToSeconds(endRaw));
    const text = lines
      .slice(timeLineIdx + 1)
      .map(stripSubtitleMarkup)
      .filter(Boolean)
      .join(' ')
      .trim();

    if (!text) continue;
    cues.push({
      index: cues.length + 1,
      startSec,
      endSec,
      text,
    });
  }

  return cues.sort((a, b) => a.startSec - b.startSec);
}

export function extractPlainTextFromSubtitles(cues: SubtitleCue[]): string {
  return cues.map((c) => c.text).join('\n');
}

export function findActiveCueIndex(cues: SubtitleCue[], currentTimeSec: number): number {
  for (let i = 0; i < cues.length; i += 1) {
    if (currentTimeSec >= cues[i].startSec && currentTimeSec <= cues[i].endSec) {
      return i;
    }
  }
  return -1;
}

export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const v = url.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = url.pathname.split('/').filter(Boolean);
      if ((parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') && parts[1]) {
        return /^[a-zA-Z0-9_-]{11}$/.test(parts[1]) ? parts[1] : null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export const DEMO_SUBTITLE_VTT = `WEBVTT

00:00:00.500 --> 00:00:04.200
おはようございます。今日の日本語の授業を始めましょう。

00:00:04.500 --> 00:00:08.500
駅の近くにある図書館で毎日勉強しています。

00:00:08.800 --> 00:00:13.000
新しい言葉を覚えたら、すぐに会話で使ってみましょう。

00:00:13.400 --> 00:00:17.500
難しい漢字でも、文脈の中で読めば意味が分かります。
`;
