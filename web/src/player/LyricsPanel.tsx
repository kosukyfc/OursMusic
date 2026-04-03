import { useState, useEffect, useRef } from 'react';

interface LrcLine {
  time: number; // seconds
  text: string;
}

function parseLrc(lrc: string): LrcLine[] {
  const lines: LrcLine[] = [];
  for (const line of lrc.split('\n')) {
    const match = line.match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
    if (!match) continue;
    const time = parseInt(match[1]) * 60 + parseFloat(match[2]);
    const text = match[3].trim();
    if (text) lines.push({ time, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

interface Props {
  songId: string | null;
  currentTime: number;
  token: string;
}

export function LyricsPanel({ songId, currentTime, token }: Props) {
  const [lines, setLines] = useState<LrcLine[]>([]);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const activeRef = useRef<HTMLDivElement>(null);
  const lastSongId = useRef<string | null>(null);

  // Fetch lyrics when song changes
  useEffect(() => {
    if (!songId || songId === lastSongId.current) return;
    lastSongId.current = songId;
    setLines([]); setPlainLyrics(null); setActiveIdx(-1);
    setLoading(true);

    fetch(`http://localhost:3000/songs/${songId}/lyrics`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        if (data.lyricsSynced) {
          setLines(parseLrc(data.lyricsSynced));
        } else if (data.lyrics) {
          setPlainLyrics(data.lyrics);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [songId, token]);

  // Track active line
  useEffect(() => {
    if (!lines.length) return;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time <= currentTime) idx = i;
      else break;
    }
    setActiveIdx(idx);
  }, [currentTime, lines]);

  // Auto-scroll to active line
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIdx]);

  if (!songId) return (
    <div className="lyrics-panel lyrics-panel--empty">
      <span>🎵</span>
      <p>Selecione uma música para ver as letras</p>
    </div>
  );

  if (loading) return (
    <div className="lyrics-panel lyrics-panel--empty">
      <span className="lyrics-loading">⏳</span>
      <p>Carregando letras...</p>
    </div>
  );

  if (!lines.length && !plainLyrics) return (
    <div className="lyrics-panel lyrics-panel--empty">
      <span>📝</span>
      <p>Letras não disponíveis</p>
    </div>
  );

  // Plain lyrics (no sync)
  if (plainLyrics && !lines.length) return (
    <div className="lyrics-panel">
      <div className="lyrics-plain">
        {plainLyrics.split('\n').map((line, i) => (
          <p key={i} className={line.trim() === '' ? 'lyrics-plain__break' : 'lyrics-plain__line'}>
            {line || '\u00A0'}
          </p>
        ))}
      </div>
    </div>
  );

  // Synced lyrics (karaoke)
  return (
    <div className="lyrics-panel">
      <div className="lyrics-synced">
        {lines.map((line, i) => {
          const isActive = i === activeIdx;
          const isPast = i < activeIdx;
          return (
            <div
              key={i}
              ref={isActive ? activeRef : null}
              className={`lyrics-line${isActive ? ' lyrics-line--active' : ''}${isPast ? ' lyrics-line--past' : ''}`}
            >
              {line.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
