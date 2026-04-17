/**
 * Componente Principal: LyricsDisplay
 * Sistema de exibição de lyrics karaokê ultra moderno para streaming de música
 * 
 * Features:
 * - Sincronização 60FPS com áudio
 * - Animações suaves: scroll, fade, blur, glow neon
 * - Responsivo: mobile, tablet, desktop, smart TV, smartwatch
 * - Dark mode + light mode
 * - Sincronização por palavra (avançada)
 * - Performance otimizado com GPU acceleration
 */

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { useLyricsSync, useSyncCalibration } from '../../hooks/useLyricsSync';
import { useResponsiveLyrics } from '../../hooks/useResponsiveLyrics';
import {
  LyricsData,
  LyricsVerse,
  LyricsAnimationConfig,
  LyricsLoadingState,
  LyricsErrorType,
} from '../../types/lyrics';
import '../../styles/lyrics-animations.css';

export interface LyricsDisplayProps {
  /** Dados das letras */
  lyrics: LyricsData | null;
  
  /** Elemento de áudio <audio> para sincronização */
  audioElement: HTMLAudioElement | null;
  
  /** Callback quando verso muda */
  onVerseChange?: (verse: LyricsVerse, index: number) => void;
  
  /** Callback de erro */
  onError?: (error: Error) => void;
  
  /** Configuração customizada de animação */
  animationConfig?: Partial<LyricsAnimationConfig>;
  
  /** Offset de sincronização em ms (para compensar delay de áudio) */
  syncOffset?: number;
  
  /** Escala de fonte customizada */
  fontScale?: number;
  
  /** Modo de tema: 'dark' | 'light' | 'auto' */
  theme?: 'dark' | 'light' | 'auto';
  
  /** Se deve mostrar header com título e artista */
  showHeader?: boolean;
  
  /** Se deve mostrar album art */
  showAlbumArt?: boolean;
  
  /** Se deve mostrar controles de player */
  showControls?: boolean;
  
  /** Callback para atualização de tempo de reprodução */
  onTimeUpdate?: (currentTime: number) => void;
  
  /** Abilita debug logging */
  debug?: boolean;
}

/**
 * Componente VerseLine: Renderiza uma linha de lyrics
 */
interface VerseLineProps {
  verse: LyricsVerse | null;
  status: 'previous' | 'current' | 'next';
  animationConfig: LyricsAnimationConfig;
  transitionStyle?: React.CSSProperties;
  onWordUpdate?: (wordIndex: number) => void;
  currentWordIndex?: number;
}

const VerseLine = React.memo<VerseLineProps>(
  ({
    verse,
    status,
    animationConfig,
    transitionStyle,
    onWordUpdate,
    currentWordIndex = -1,
  }) => {
    if (!verse) return null;

    const shouldRenderWords =
      animationConfig.wordLevelSync && verse.words && verse.words.length > 0;

    return (
      <div
        className={`lyrics-verse-line ${status}`}
        style={transitionStyle}
      >
        {shouldRenderWords ? (
          // Renderização por palavra (karaokê avançado)
          <span>
            {verse.words?.map((word, idx) => (
              <span
                key={`word-${idx}`}
                className={`lyrics-word ${
                  idx === currentWordIndex ? 'active' : ''
                }`}
              >
                {word.word}
              </span>
            ))}
          </span>
        ) : (
          // Renderização de verso completo
          verse.text
        )}
      </div>
    );
  }
);

VerseLine.displayName = 'VerseLine';

/**
 * Componente Principal: LyricsDisplay
 */
export const LyricsDisplay = React.memo<LyricsDisplayProps>(
  ({
    lyrics,
    audioElement,
    onVerseChange,
    onError,
    animationConfig: customAnimConfig,
    syncOffset: initialSyncOffset = 0,
    fontScale = 1,
    theme = 'auto',
    showHeader = true,
    showAlbumArt = true,
    showControls = true,
    onTimeUpdate,
    debug = false,
  }) => {
    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const audioRefForSync = useRef<HTMLAudioElement | null>(audioElement);
    const lastRenderedVerseRef = useRef<string | null>(null);
    const transitionStylesRef = useRef<Record<string, React.CSSProperties>>({});

    // Hooks
    const {
      playerState,
      loadingState,
      error,
      animationConfig,
      setSyncOffset,
      metrics,
      previousVerseId,
      currentWord,
    } = useLyricsSync({
      lyrics,
      audioElement: audioRefForSync.current,
      onVerseChange,
      onError,
      animationConfig: customAnimConfig,
      syncOffset: initialSyncOffset,
      debug,
    });

    const { responsiveConfig, cssVariables, htmlClassName, deviceInfo } =
      useResponsiveLyrics({
        fontScale,
        debug,
      });

    const { calibrate } = useSyncCalibration(audioRefForSync.current);

    // Atualiza referência de áudio
    useEffect(() => {
      audioRefForSync.current = audioElement;
    }, [audioElement]);

    // Aplica CSS variables
    useEffect(() => {
      if (!containerRef.current) return;

      Object.entries(cssVariables).forEach(([key, value]) => {
        containerRef.current?.style.setProperty(key, String(value));
      });

      // Aplica classe CSS
      containerRef.current.className = htmlClassName;

      // Aplica tema
      if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
          .matches;
        containerRef.current.style.colorScheme = prefersDark ? 'dark' : 'light';
      } else {
        containerRef.current.style.colorScheme = theme;
      }
    }, [cssVariables, htmlClassName, theme]);

    // Callback de atualização de tempo
    useEffect(() => {
      if (onTimeUpdate && playerState.currentTime) {
        onTimeUpdate(playerState.currentTime);
      }
    }, [playerState.currentTime, onTimeUpdate]);

    // Calcula estilos de transição para versos
    useEffect(() => {
      const duration = animationConfig.transitionDuration;
      const easing = animationConfig.easing === 'smooth-in-out'
        ? 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        : animationConfig.easing;

      transitionStylesRef.current = {
        current: {
          transition: `all ${duration}ms ${easing}`,
          transform: 'translate(-50%, -50%)',
          opacity: 1,
          filter: 'blur(0)',
        },
        next: {
          transition: `all ${duration}ms ${easing}`,
          transform: 'translate(-50%, -50%) translateY(100px) scale(0.98)',
          opacity: 0.6,
          filter: 'blur(2px)',
        },
        previous: {
          transition: `all ${duration}ms ${easing}`,
          transform: 'translate(-50%, -50%) translateY(-100px) scale(0.95)',
          opacity: 0.3,
          filter: 'blur(6px)',
        },
      };
    }, [animationConfig.transitionDuration, animationConfig.easing]);

    // Handlers
    const handlePlayClick = useCallback(() => {
      if (audioRefForSync.current) {
        if (audioRefForSync.current.paused) {
          audioRefForSync.current.play();
        } else {
          audioRefForSync.current.pause();
        }
      }
    }, []);

    const handleSkipClick = useCallback((direction: 'forward' | 'backward') => {
      if (audioRefForSync.current) {
        const skipAmount = 10000; // 10 segundos
        audioRefForSync.current.currentTime +=
          direction === 'forward' ? skipAmount / 1000 : -skipAmount / 1000;
      }
    }, []);

    const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (audioRefForSync.current) {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audioRefForSync.current.currentTime =
          percent * audioRefForSync.current.duration;
      }
    }, []);

    const handleCalibrateSync = useCallback(async () => {
      if (playerState.currentVerse) {
        const offset = await calibrate(playerState.currentVerse.startTime);
        if (offset !== undefined) {
          setSyncOffset(offset);
          if (debug) {
            console.debug(`[LyricsDisplay] Sync calibrated: ${offset}ms`);
          }
        }
      }
    }, [playerState.currentVerse, calibrate, setSyncOffset, debug]);

    // Estado de carregamento
    if (!lyrics || loadingState === LyricsLoadingState.IDLE) {
      return (
        <div ref={containerRef} className={htmlClassName}>
          <div className="lyrics-loading">
            <p>Carregando letras...</p>
          </div>
        </div>
      );
    }

    if (loadingState === LyricsLoadingState.ERROR) {
      return (
        <div ref={containerRef} className={htmlClassName}>
          <div className="lyrics-error">
            <p>❌ Erro ao carregar letras</p>
            {error && <small>{error.message}</small>}
          </div>
        </div>
      );
    }

    // Formatação de tempo
    const formatTime = (ms: number) => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    };

    const progress =
      audioRefForSync.current && audioRefForSync.current.duration
        ? (playerState.currentTime / (audioRefForSync.current.duration * 1000)) * 100
        : 0;

    // Renderização
    return (
      <div
        ref={containerRef}
        className={htmlClassName}
      >
        {/* Header (Título e Artista) */}
        {showHeader && responsiveConfig.showArtistInfo && (
          <div className="lyrics-header">
            <h1 className="lyrics-header__title">{lyrics.title}</h1>
            <p className="lyrics-header__artist">{lyrics.artist}</p>
          </div>
        )}

        {/* Seção de Album Art (Desktop/Tablet) */}
        {showAlbumArt && responsiveConfig.showAlbumArt && (
          <div className="lyrics-album-section">
            <img
              src={lyrics.albumArt}
              alt={`${lyrics.title} - ${lyrics.artist}`}
              className="lyrics-album-art"
              style={{
                '--lyrics-album-art-bg': `url(${lyrics.albumArt})`,
              } as React.CSSProperties}
            />
            {responsiveConfig.layoutMode === 'horizontal' && (
              <div className="lyrics-album-info">
                <h2 className="lyrics-album-info__title">{lyrics.title}</h2>
                <p className="lyrics-album-info__artist">{lyrics.artist}</p>
              </div>
            )}
          </div>
        )}

        {/* Área Principal de Lyrics */}
        <div className="lyrics-content-area">
          <div className="lyrics-container">
            {/* Verso Anterior (Saindo) */}
            <VerseLine
              verse={playerState.previousVerse}
              status="previous"
              animationConfig={animationConfig}
              transitionStyle={transitionStylesRef.current.previous}
            />

            {/* Verso Atual (Destacado com Glow) */}
            <VerseLine
              verse={playerState.currentVerse}
              status="current"
              animationConfig={animationConfig}
              transitionStyle={transitionStylesRef.current.current}
              currentWordIndex={
                currentWord && playerState.currentVerse?.words
                  ? playerState.currentVerse.words.findIndex((w) => w === currentWord)
                  : -1
              }
            />

            {/* Próximo Verso (Preparação) */}
            <VerseLine
              verse={playerState.nextVerse}
              status="next"
              animationConfig={animationConfig}
              transitionStyle={transitionStylesRef.current.next}
            />
          </div>
        </div>

        {/* Controles do Player */}
        {showControls && responsiveConfig.showPlayerControls && audioRefForSync.current && (
          <div className="lyrics-player-controls">
            <button
              className="lyrics-player-controls__button"
              onClick={() => handleSkipClick('backward')}
              title="Voltar 10s"
              aria-label="Voltar 10 segundos"
            >
              ⏪
            </button>

            <button
              className="lyrics-player-controls__button"
              onClick={handlePlayClick}
              title={audioRefForSync.current.paused ? 'Play' : 'Pause'}
              aria-label={audioRefForSync.current.paused ? 'Play' : 'Pause'}
            >
              {audioRefForSync.current.paused ? '▶️' : '⏸️'}
            </button>

            <button
              className="lyrics-player-controls__button"
              onClick={() => handleSkipClick('forward')}
              title="Avançar 10s"
              aria-label="Avançar 10 segundos"
            >
              ⏩
            </button>

            <button
              className="lyrics-player-controls__button"
              onClick={handleCalibrateSync}
              title="Calibrar sincronização"
              aria-label="Calibrar sincronização"
            >
              🔄
            </button>
          </div>
        )}

        {/* Barra de Progresso */}
        {showControls &&
          responsiveConfig.showPlayerControls &&
          audioRefForSync.current && (
            <div className="lyrics-player-controls" style={{ bottom: '80px' }}>
              <div className="lyrics-time-display">
                {formatTime(playerState.currentTime)}
              </div>
              <div
                className="lyrics-progress-bar"
                onClick={handleProgressClick}
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="lyrics-progress-bar__fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="lyrics-time-display">
                {audioRefForSync.current.duration
                  ? formatTime(
                      audioRefForSync.current.duration * 1000
                    )
                  : '0:00'}
              </div>
            </div>
          )}

        {/* Debug Info (Development) */}
        {debug && (
          <div
            style={{
              position: 'fixed',
              bottom: 20,
              right: 20,
              background: 'rgba(0, 0, 0, 0.8)',
              color: '#10b981',
              padding: '10px 15px',
              fontSize: '12px',
              fontFamily: 'monospace',
              borderRadius: '4px',
              zIndex: 100,
              maxWidth: '300px',
            }}
          >
            <div>FPS: {metrics.fps}</div>
            <div>Sync Latency: {metrics.syncLatency.toFixed(1)}ms</div>
            <div>Sync Accuracy: {metrics.syncAccuracy.toFixed(1)}%</div>
            <div>
              Verso: {playerState.currentVerseIndex}/{playerState.totalVerses}
            </div>
            <div>Progresso: {(playerState.verseProgress * 100).toFixed(1)}%</div>
            <div>Screen: {deviceInfo.screenWidth}x{deviceInfo.screenHeight}</div>
          </div>
        )}
      </div>
    );
  }
);

LyricsDisplay.displayName = 'LyricsDisplay';

export default LyricsDisplay;
