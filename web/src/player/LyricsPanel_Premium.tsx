/**
 * LyricsPanel Premium - Integração do Sistema Karaokê Avançado
 * Substitui o LyricsPanel antigo com animações e sincronização 60 FPS
 * 
 * Usa: LyricsDisplay, useLyricsSync, useResponsiveLyrics
 */

import { useState, useEffect, useRef, RefObject, useCallback } from 'react';
import LyricsDisplay from '../components/LyricsDisplay/LyricsDisplay';
import { API_URL, EXTRA_HEADERS } from '../config';
import type { LyricsData, LyricsVerse } from '../types/lyrics';

interface Props {
  songId: string | null;
  currentTime: number;
  token: string;
  coverUrl?: string;
  audioRef?: RefObject<HTMLAudioElement | null>;
  songTitle?: string;
  songArtist?: string;
}

/**
 * Converte formato antigo de letras para o novo formato LyricsData
 */
function convertToLyricsData(
  data: any,
  songId: string,
  title: string,
  artist: string,
  albumArt?: string
): LyricsData {
  // Se já vem em formato LyricsData
  if (data.lyrics && Array.isArray(data.lyrics) && data.lyrics[0]?.id) {
    return data as LyricsData;
  }

  // Converte do formato antigo (LRC ou texto simples)
  let verses: LyricsVerse[] = [];
  let hasWordSync = false;

  if (data.lyricsSynced) {
    // Parse LRC com sincronização
    verses = parseLrcToVerses(data.lyricsSynced);
    hasWordSync = data.lyricsSynced.includes('<');
  } else if (data.lyrics) {
    // Texto simples: divide em estrofes
    verses = parseSimpleTextToVerses(data.lyrics);
  }

  return {
    trackId: songId,
    title,
    artist,
    albumArt: albumArt || '',
    bpm: data.bpm || 120,
    duration: data.duration || 180000,
    lyrics: verses,
    language: data.language || 'pt-BR',
    hasWordSync,
    source: 'api',
    updatedAt: new Date().toISOString(),  // ✅ Campo obrigatório
  };
}

/**
 * Parse LRC com sincronização por palavra
 */
function parseLrcToVerses(lrc: string): LyricsVerse[] {
  const verses: LyricsVerse[] = [];
  const lines = lrc.split('\n');

  for (const line of lines) {
    const match = line.match(/\[(\d+):(\d+(?:[.:]\d+)?)\](.*)/);
    if (!match) continue;

    const minutes = parseInt(match[1]);
    const seconds = parseFloat(match[2].replace(':', '.'));
    const startTime = minutes * 60 * 1000 + seconds * 1000;
    const text = match[3].trim();

    if (text) {
      // Parse palavras se houver sincronização
      const words = parseWords(text, startTime);
      
      verses.push({
        id: `verse-${verses.length}`,
        text: text.replace(/<[^>]+>/g, ''), // Remove tags de sincronização
        startTime,
        endTime: startTime + 3000, // Estimado, será corrigido depois
        type: 'verse',
        words: words.length > 0 ? words : undefined,
      });
    }
  }

  // Corrige tempos de fim baseado no próximo verso
  for (let i = 0; i < verses.length - 1; i++) {
    verses[i].endTime = verses[i + 1].startTime;
  }
  if (verses.length > 0) {
    verses[verses.length - 1].endTime = verses[verses.length - 1].startTime + 3000;
  }

  return verses;
}

/**
 * Parse palavras sincronizadas
 */
function parseWords(text: string, lineStartTime: number) {
  const words = [];
  const wordMatches = [...text.matchAll(/<([\d.]+),([\d.]+)>([^<]+)/g)];

  for (const match of wordMatches) {
    const startOffset = parseFloat(match[1]);
    const endOffset = parseFloat(match[2]);
    const wordText = match[3].trim();

    words.push({
      word: wordText,  // ✅ Campo correto: 'word' não 'text'
      startTime: lineStartTime + startOffset * 1000,
      endTime: lineStartTime + endOffset * 1000,
    });
  }

  return words;
}

/**
 * Parse texto simples em versos
 */
function parseSimpleTextToVerses(text: string): LyricsVerse[] {
  const verses: LyricsVerse[] = [];
  const paragraphs = text.split(/\n\n+/);
  let currentTime = 0;

  for (const para of paragraphs) {
    if (para.trim()) {
      const duration = 3000; // 3 segundos por verso
      verses.push({
        id: `verse-${verses.length}`,
        text: para.trim(),
        startTime: currentTime,
        endTime: currentTime + duration,
        type: 'verse',
      });
      currentTime += duration;
    }
  }

  return verses;
}

/**
 * Componente Premium LyricsPanel
 */
export function LyricsPanelPremium({
  songId,
  currentTime,
  token,
  coverUrl,
  audioRef,
  songTitle = 'Untitled',
  songArtist = 'Unknown Artist',
}: Props) {
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [karaokeModeEnabled, setKaraokeMode] = useState(false);
  const [syncOffset, setSyncOffset] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  const lastSongId = useRef<string | null>(null);

  // Carrega letras quando songId muda
  useEffect(() => {
    if (!songId || songId === lastSongId.current) return;
    lastSongId.current = songId;

    setLyrics(null);
    setError(null);
    setLoading(true);

    fetch(`${API_URL}/songs/${songId}/lyrics`, {
      headers: { Authorization: `Bearer ${token}`, ...EXTRA_HEADERS },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) {
          setError('Letras não disponíveis');
          return;
        }

        const converted = convertToLyricsData(
          data,
          songId,
          songTitle,
          songArtist,
          coverUrl
        );
        setLyrics(converted);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Erro ao carregar letras');
        console.error('[LyricsPanelPremium]', err);
      })
      .finally(() => setLoading(false));
  }, [songId, token, songTitle, songArtist, coverUrl]);

  const handleVerseChange = useCallback((verse: LyricsVerse, index: number) => {
    // Haptic feedback se disponível
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, []);

  const handleError = useCallback((error: Error) => {
    setError(error.message);
  }, []);

  // Estado vazio
  if (!songId) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#b3b3b3',
          fontSize: '14px',
        }}
      >
        🎵 Selecione uma música para ver as letras
      </div>
    );
  }

  // Estado carregando
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#b3b3b3',
          fontSize: '14px',
        }}
      >
        <div
          style={{
            animation: 'spin 1s linear infinite',
            display: 'inline-block',
          }}
        >
          ⏳
        </div>
        <span style={{ marginLeft: '10px' }}>Carregando letras...</span>
      </div>
    );
  }

  // Estado erro ou sem letras
  if (error || !lyrics) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#b3b3b3',
          fontSize: '14px',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ fontSize: '24px' }}>📝</div>
        <div>{error || 'Letras não disponíveis'}</div>
      </div>
    );
  }

  // Componente principal com LyricsDisplay Premium
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.5)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {/* Header com controles */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(0, 0, 0, 0.8)',
        }}
      >
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
            {lyrics.title}
          </div>
          <div style={{ fontSize: '12px', color: '#b3b3b3', marginTop: '2px' }}>
            {lyrics.artist}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Toggle Karaoke Mode */}
          <button
            onClick={() => setKaraokeMode(!karaokeModeEnabled)}
            title="Modo Karaokê"
            style={{
              background: karaokeModeEnabled
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#fff',
              padding: '6px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = karaokeModeEnabled
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(255, 255, 255, 0.1)')
            }
          >
            🎤
          </button>

          {/* Toggle Debug */}
          <button
            onClick={() => setShowDebug(!showDebug)}
            title="Debug Info"
            style={{
              background: showDebug
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#fff',
              padding: '6px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = showDebug
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(255, 255, 255, 0.1)')
            }
          >
            🐛
          </button>
        </div>
      </div>

      {/* Main Lyrics Display - Premium Component */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <LyricsDisplay
          lyrics={lyrics}
          audioElement={audioRef?.current || null}
          syncOffset={syncOffset}
          theme="dark"
          debug={showDebug}
          showHeader={false}
          showAlbumArt={false}
          showControls={false}
          onVerseChange={handleVerseChange}
          onError={handleError}
          animationConfig={{
            transitionDuration: 800,
            easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
            timeOffset: 0,
            useBpmTiming: true,
            glowIntensity: karaokeModeEnabled ? 1.5 : 1,
            enableBlur: true,
            enableScaleUp: karaokeModeEnabled,
            wordLevelSync: lyrics.hasWordSync && karaokeModeEnabled,
          }}
        />
      </div>

      {/* Footer com controles de sync */}
      {karaokeModeEnabled && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(0, 0, 0, 0.8)',
            fontSize: '12px',
            color: '#b3b3b3',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ minWidth: '80px' }}>Sync: {syncOffset}ms</span>
            <input
              type="range"
              min={-500}
              max={500}
              step={10}
              value={syncOffset}
              onChange={(e) => setSyncOffset(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <button
              onClick={() => setSyncOffset(0)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </label>
        </div>
      )}
    </div>
  );
}

export default LyricsPanelPremium;
