/**
 * Exemplo de Integração: LyricsDisplay com Player de Música
 * Demonstra como usar o sistema completo de lyrics karaokê
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import LyricsDisplay from './LyricsDisplay';
import { LyricsData, LyricsLoadingState } from '../../types/lyrics';
import axios from 'axios';

export interface MusicPlayerWithLyricsProps {
  /** ID da música para carregar letras */
  trackId: string;
  
  /** URL de áudio para reprodução */
  audioUrl: string;
  
  /** API base URL */
  apiBaseUrl?: string;
}

/**
 * Componente completo: Player de Música + Lyrics Karaokê
 */
export const MusicPlayerWithLyrics = ({
  trackId,
  audioUrl,
  apiBaseUrl = '/api',
}: MusicPlayerWithLyricsProps) => {
  // Estado
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'light' | 'auto'>('auto');
  const [syncOffset, setSyncOffset] = useState(0);
  const [showDebug, setShowDebug] = useState(false);

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);

  // Carrega letras
  useEffect(() => {
    const loadLyrics = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(`${apiBaseUrl}/lyrics/${trackId}`);
        const data: LyricsData = response.data;

        // Validação
        if (!data.lyrics || data.lyrics.length === 0) {
          throw new Error('Letras não encontradas para esta música');
        }

        setLyrics(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Erro ao carregar letras';
        setError(errorMessage);
        console.error('[MusicPlayerWithLyrics]', errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (trackId) {
      loadLyrics();
    }
  }, [trackId, apiBaseUrl]);

  // Handlers
  const handleVerseChange = useCallback((verse, index) => {
    console.log(`[Verso ${index}]`, verse.text);
    
    // Haptic feedback em dispositivos suportados
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }
  }, []);

  const handleLyricsError = useCallback((error) => {
    console.error('[LyricsError]', error);
    setError(error.message);
  }, []);

  const handleTimeUpdate = useCallback((time) => {
    setCurrentTime(time);
  }, []);

  // Estados de carregamento
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '24px', marginBottom: '20px' }}>⏳</div>
        <p>Carregando letras...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
        <div style={{ fontSize: '24px', marginBottom: '20px' }}>❌</div>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* Componente Principal de Lyrics */}
      <LyricsDisplay
        lyrics={lyrics}
        audioElement={audioRef.current}
        onVerseChange={handleVerseChange}
        onError={handleLyricsError}
        onTimeUpdate={handleTimeUpdate}
        syncOffset={syncOffset}
        theme={theme}
        debug={showDebug}
        animationConfig={{
          transitionDuration: 800,
          easing: 'smooth-in-out',
          wordLevelSync: true,
          enableBlur: true,
          enableScaleUp: true,
        }}
      />

      {/* Elemento de Áudio Oculto */}
      <audio
        ref={audioRef}
        src={audioUrl}
        crossOrigin="anonymous"
        style={{ display: 'none' }}
      />

      {/* Controles Adicionais (Overlay) */}
      <div
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          display: 'flex',
          gap: '10px',
          zIndex: 1000,
          flexDirection: 'column',
        }}
      >
        {/* Toggle Tema */}
        <button
          onClick={() => {
            setTheme((prev) =>
              prev === 'dark' ? 'light' : prev === 'light' ? 'auto' : 'dark'
            );
          }}
          style={{
            padding: '10px 15px',
            borderRadius: '8px',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
          }}
          title="Toggle tema"
        >
          {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🔄'}
        </button>

        {/* Toggle Debug */}
        <button
          onClick={() => setShowDebug(!showDebug)}
          style={{
            padding: '10px 15px',
            borderRadius: '8px',
            border: 'none',
            background: showDebug
              ? 'rgba(16, 185, 129, 0.3)'
              : 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
          }}
          title="Toggle debug info"
        >
          🐛
        </button>

        {/* Ajuste de Offset */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '10px',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '12px',
          }}
        >
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Sync Offset ({syncOffset}ms)
          </label>
          <input
            type="range"
            min={-500}
            max={500}
            step={10}
            value={syncOffset}
            onChange={(e) => setSyncOffset(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </div>
  );
};

export default MusicPlayerWithLyrics;

/**
 * Exemplo de uso em página:
 * 
 * <MusicPlayerWithLyrics
 *   trackId="spotify-12345"
 *   audioUrl="/music/track.mp3"
 *   apiBaseUrl="/api"
 * />
 */
