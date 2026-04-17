import { useState, useEffect, useRef, useLayoutEffect, RefObject, useCallback } from 'react';
import { API_URL, EXTRA_HEADERS } from '../config';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LyricWord {
  text: string;
  start: number;
  end: number;
}

interface LyricLine {
  startTime: number;
  endTime?: number;
  text: string;
  words?: LyricWord[];
}

// ── LRC parser com palavras ────────────────────────────────────────────────
function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of lrc.split('\n')) {
    const m = raw.match(/\[(\d+):(\d+(?:[.:]\d+)?)\](.*)/);
    if (!m) continue;
    const time = parseInt(m[1]) * 60 + parseFloat(m[2].replace(':', '.'));
    const text = m[3].trim();
    if (text) {
      // Tenta parsear palavras sincronizadas (karaoke LRC)
      const wordMatches = [...text.matchAll(/<([\d.]+),([\d.]+)>([^<]+)/g)];
      let words: LyricWord[] | undefined = undefined;
      if (wordMatches.length > 0) {
        words = wordMatches.map(w => ({
          start: time + parseFloat(w[1]),
          end: time + parseFloat(w[2]),
          text: w[3].trim(),
        }));
      }
      lines.push({ startTime: time, text: text.replace(/<[^>]+>/g, ''), words });
    }
  }
  return lines.sort((a, b) => a.startTime - b.startTime);
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  songId:      string | null;
  currentTime: number;
  token:       string;
  coverUrl?:   string;
  audioRef?:   RefObject<HTMLAudioElement | null>;
  songTitle?:  string;
  songArtist?: string;
}

// ── MediaPanel — capa ou vídeo ────────────────────────────────────────────────

function MediaPanel({ coverUrl, songTitle, songArtist, resolvedVideoUrl }: {
  coverUrl?: string; songTitle?: string; songArtist?: string; resolvedVideoUrl?: string | null;
}) {
  const [mode, setMode] = useState<'cover' | 'video'>('cover');
  const [videoError, setVideoError] = useState(false);

  // Prioridade: URL resolvida pelo backend (videoUrl do banco).
  // Fallback: busca por título no YouTube se não houver URL salva.
  const ytEmbed = resolvedVideoUrl
    ? `https://www.youtube.com/embed/${resolvedVideoUrl}`
    : (songTitle
      ? `https://www.youtube.com/embed/?listType=search&list=${encodeURIComponent(
          `${songArtist ? songArtist + ' ' : ''}${songTitle} official video`
        )}`
      : null);

  return (
    <div className="lp__media-panel">
      <div className="lp__media-tabs">
        <button
          className={`lp__media-tab${mode === 'cover' ? ' lp__media-tab--on' : ''}`}
          onClick={() => setMode('cover')}
        >
          🖼 Capa
        </button>
        {ytEmbed && (
          <button
            className={`lp__media-tab${mode === 'video' ? ' lp__media-tab--on' : ''}`}
            onClick={() => setMode('video')}
          >
            ▶ Vídeo
          </button>
        )}
      </div>

      <div className="lp__media-content">
        {mode === 'cover' && (
          coverUrl
            ? <img src={coverUrl} alt={songTitle ?? 'capa'} className="lp__media-cover" />
            : <div className="lp__media-cover lp__media-cover--empty">🎵</div>
        )}
        {mode === 'video' && ytEmbed && (
          videoError ? (
            <div className="lp__media-video lp__media-video--error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b3b3b3', fontSize: 14, textAlign: 'center', padding: '20px' }}>
              <div>
                <div style={{ fontSize: 24, marginBottom: '12px' }}>📹</div>
                <p>Vídeo não disponível no momento</p>
                <p style={{ fontSize: 12, marginTop: '8px', color: '#6a6a6a' }}>Procure por "{songArtist ?? ''} {songTitle ?? ''}" no YouTube</p>
              </div>
            </div>
          ) : (
            <iframe
              className="lp__media-video"
              src={ytEmbed}
              title={`${songArtist ?? ''} ${songTitle ?? ''}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onError={() => setVideoError(true)}
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: '6px' }}
            />
          )
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function LyricsPanel({ songId, currentTime, token, coverUrl, audioRef, songTitle, songArtist }: Props) {
  const [lines,       setLines]       = useState<LyricLine[]>([]);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [activeIdx,   setActiveIdx]   = useState(-1);
  const [activeWordIdx, setActiveWordIdx] = useState(-1);
  const [karaokeMode, setKaraokeMode] = useState(false);
  const [fullscreen,  setFullscreen]  = useState(false);
  const [videoUrl,    setVideoUrl]    = useState<string | null>(null);

  const trackRef  = useRef<HTMLDivElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const lineRefs  = useRef<(HTMLDivElement | null)[]>([]);
  const fillRef   = useRef<HTMLSpanElement>(null);
  const lastSong  = useRef<string | null>(null);
  const rafRef    = useRef<number>(0);
  const linesRef  = useRef<LyricLine[]>([]);
  const activeRef = useRef<number>(-1);

  linesRef.current = lines;
  activeRef.current = activeIdx;

  // ── fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!songId || songId === lastSong.current) return;
    lastSong.current = songId;
    setLines([]); setPlainLyrics(null); setActiveIdx(-1);
    setLoading(true);

    fetch(`${API_URL}/songs/${songId}/lyrics`, {
      headers: { Authorization: `Bearer ${token}`, ...EXTRA_HEADERS },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        if (data.lyricsSynced) {
          let parsed = parseLrc(data.lyricsSynced);
          // Fallback: se não houver palavras sincronizadas, simula para cada linha
          parsed = parsed.map((line, idx, arr) => {
            if (!line.words || line.words.length === 0) {
              // Calcula duração da linha até a próxima
              const nextStart = arr[idx + 1]?.startTime ?? (line.startTime + 4);
              const duration = Math.max(0.8, nextStart - line.startTime);
              const wordsArr = line.text.split(/\s+/).filter(Boolean);
              const wordCount = wordsArr.length;
              if (wordCount > 0) {
                const wordDur = duration / wordCount;
                line.words = wordsArr.map((w, i) => ({
                  text: w,
                  start: line.startTime + i * wordDur,
                  end: line.startTime + (i + 1) * wordDur,
                }));
              }
            }
            return line;
          });
          setLines(parsed);
        } else if (data.lyrics)  setPlainLyrics(data.lyrics);
        // videoUrl da API tem prioridade; fallback para busca por título
        if (data.videoUrl) {
          // converte watch URL para embed
          const embedId = data.videoUrl.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1];
          setVideoUrl(embedId ? `https://www.youtube.com/embed/${embedId}` : null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [songId, token]);

  // ── RAF loop: linha e palavra ─────────────────────────────────────────────
  useEffect(() => {
    if (!lines.length) return;

    function frame() {
      const t = audioRef?.current?.currentTime ?? currentTime;
      const ls = linesRef.current;

      let idx = -1;
      for (let i = 0; i < ls.length; i++) {
        if (ls[i].startTime <= t) idx = i;
        else break;
      }
      if (idx !== activeRef.current) setActiveIdx(idx);

      // Palavra ativa
      let wordIdx = -1;
      if (idx >= 0 && ls[idx].words) {
        for (let w = 0; w < ls[idx].words!.length; w++) {
          if (ls[idx].words![w].start <= t && t < ls[idx].words![w].end) {
            wordIdx = w;
            break;
          }
        }
      }
      setActiveWordIdx(wordIdx);

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [lines, audioRef]);

  // ── scroll ─────────────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const el    = lineRefs.current[activeIdx];
    const wrap  = wrapRef.current;
    const track = trackRef.current;
    if (!el || !wrap || !track) return;
    const target = el.offsetTop + el.offsetHeight / 2 - wrap.clientHeight * 0.40;
    track.style.transform = `translateY(${-target}px)`;
  }, [activeIdx]);

  // ── seek on click ──────────────────────────────────────────────────────────
  const seekTo = useCallback((time: number) => {
    if (audioRef?.current) audioRef.current.currentTime = time;
  }, [audioRef]);

  // ── empty states ───────────────────────────────────────────────────────────
  if (!songId) return (
    <div className="lp lp--empty"><span>🎵</span><p>Selecione uma música para ver as letras</p></div>
  );
  if (loading) return (
    <div className="lp lp--empty"><span className="lp__spinner" /><p>Carregando letras...</p></div>
  );

  // ── plain lyrics (sem sync) ────────────────────────────────────────────────
  if (!lines.length && plainLyrics) return (
    <div className="lp lp--plain-layout">
      {coverUrl && <div className="lp__bg" style={{ backgroundImage: `url(${coverUrl})` }} />}
      <MediaPanel coverUrl={coverUrl} songTitle={songTitle} songArtist={songArtist} resolvedVideoUrl={videoUrl} />
      <div className="lp__plain-scroll">
        <div className="lp__plain">
          {plainLyrics.split('\n').map((line, i) => (
            <p key={i} className={line.trim() === '' ? 'lp__plain-break' : 'lp__plain-line'}>
              {line || '\u00A0'}
            </p>
          ))}
        </div>
      </div>
    </div>
  );

  if (!lines.length) return (
    <div className="lp lp--plain-layout">
      {coverUrl && <div className="lp__bg" style={{ backgroundImage: `url(${coverUrl})` }} />}
      <MediaPanel coverUrl={coverUrl} songTitle={songTitle} songArtist={songArtist} resolvedVideoUrl={videoUrl} />
      <div className="lp lp--empty" style={{ flex: 1 }}><span>📝</span><p>Letras não disponíveis</p></div>
    </div>
  );

  // ── synced ─────────────────────────────────────────────────────────────────
  return (
    <div className={`lp lp--synced-layout${fullscreen ? ' lp--fullscreen' : ''}${karaokeMode ? ' lp--karaoke' : ''}`}>
      {coverUrl && <div className="lp__bg" style={{ backgroundImage: `url(${coverUrl})` }} />}

      {/* capa / vídeo — sempre visível no topo */}
      <MediaPanel coverUrl={coverUrl} songTitle={songTitle} songArtist={songArtist} resolvedVideoUrl={videoUrl} />

      {/* controles de letras */}
      <div className="lp__lyric-controls">
        <button
          className={`lp__ctrl-btn${karaokeMode ? ' lp__ctrl-btn--on' : ''}`}
          onClick={() => setKaraokeMode(k => !k)}
          title="Modo Karaoke"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: '4px', display: 'inline'}}><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
          Karaoke
        </button>
        <button
          className="lp__ctrl-btn"
          onClick={() => setFullscreen(f => !f)}
          title={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
        >
          {fullscreen 
            ? <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: '4px', display: 'inline'}}><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
              Sair
            </>
            : <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: '4px', display: 'inline'}}><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
              Tela Cheia
            </>
          }
        </button>
      </div>

      {/* letras sincronizadas premium */}
      <div className="lp__scroll-area" ref={wrapRef}>
        <div className="lp__fade lp__fade--top" />
        <div className="lp__fade lp__fade--bot" />

        <div ref={trackRef} className="lp__track">
          <div className="lp__spacer-top" />
          {lines.map((line, i) => {
            const isActive = i === activeIdx;
            const isNext   = i === activeIdx + 1;
            const dist     = i - activeIdx;
            const opacity = isActive ? 1
              : isNext    ? 0.85
              : dist < 0  ? 0.25
              : Math.max(0.35, 0.7 - (dist - 1) * 0.12);
            return (
              <div
                key={i}
                ref={el => { lineRefs.current[i] = el; }}
                className={`lp__line${isActive ? ' lp__line--active' : ''}${isNext ? ' lp__line--next' : ''}${dist < 0 ? ' lp__line--past' : ''}`}
                style={{ opacity, cursor: 'pointer', transition: 'opacity 0.35s, color 0.35s', textAlign: 'center', justifyContent: 'center', alignItems: 'center', display: 'flex', flexWrap: 'wrap' }}
                onClick={() => seekTo(line.startTime)}
              >
                {isActive && line.words && line.words.length > 0 ? (
                  <span className="lp__fill-wrap" style={{ width: '100%', display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {line.words.map((word, widx) => (
                      <span
                        key={widx}
                        className={`lp__word${widx === activeWordIdx ? ' lp__word--active' : ''}`}
                        style={{
                          transition: 'color 0.18s, background 0.18s',
                          color: widx === activeWordIdx ? '#1db954' : '#fff',
                          background: widx === activeWordIdx ? 'rgba(29,185,84,0.18)' : 'transparent',
                          borderRadius: '4px',
                          margin: '0 2px',
                          padding: '2px 4px',
                          fontWeight: widx === activeWordIdx ? 900 : 700,
                          fontSize: widx === activeWordIdx ? 28 : 22,
                          boxShadow: widx === activeWordIdx ? '0 0 16px #1db95455' : 'none',
                        }}
                      >
                        {word.text}
                      </span>
                    ))}
                  </span>
                ) : (
                  isActive ? (
                    <span className="lp__fill-wrap">
                      <span className="lp__fill-dim" aria-hidden>{line.text}</span>
                      <span ref={fillRef} className="lp__fill-lit" style={{ clipPath: 'inset(0 100% 0 0)' }} aria-hidden>{line.text}</span>
                      <span className="lp__fill-sr">{line.text}</span>
                    </span>
                  ) : line.text
                )}
              </div>
            );
          })}
          <div className="lp__spacer-bot" />
        </div>
      </div>
    </div>
  );
}
