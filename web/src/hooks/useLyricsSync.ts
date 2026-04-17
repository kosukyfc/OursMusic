/**
 * Hook React para sincronização de lyrics com áudio em tempo real
 * Gerencia animações, transições e sincronização de versos
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  LyricsVerse,
  LyricsData,
  LyricsPlayerState,
  LyricsAnimationConfig,
  LyricsErrorType,
  LyricsError,
  LyricsLoadingState,
} from '../types/lyrics';
import {
  calculateLyricsPlayerState,
  offsetLyricsTime,
  findCurrentVerse,
  calculateVerseProgress,
  findCurrentWord,
} from '../utils/lyricsParser';

/** Configuração padrão de animação */
const DEFAULT_ANIMATION_CONFIG: LyricsAnimationConfig = {
  transitionDuration: 800,
  easing: 'smooth-in-out',
  timeOffset: 50,
  useBpmTiming: true,
  glowIntensity: 1,
  enableBlur: true,
  enableScaleUp: true,
  wordLevelSync: true,
};

export interface UseLyricsSyncProps {
  /** Dados das lyrics */
  lyrics: LyricsData | null;
  /** Elemento de áudio para sincronização */
  audioElement: HTMLAudioElement | null;
  /** Callback quando verso muda */
  onVerseChange?: (verse: LyricsVerse, index: number) => void;
  /** Callback de erro */
  onError?: (error: LyricsError) => void;
  /** Configuração de animação customizada */
  animationConfig?: Partial<LyricsAnimationConfig>;
  /** Offset de sincronização manual em ms (para compensar delay) */
  syncOffset?: number;
  /** Abilita debug logging */
  debug?: boolean;
}

export interface UseLyricsSyncReturn {
  /** Estado atual do player */
  playerState: LyricsPlayerState;
  /** Estado de carregamento */
  loadingState: LyricsLoadingState;
  /** Erro atual (se houver) */
  error: LyricsError | null;
  /** Configuração de animação em uso */
  animationConfig: LyricsAnimationConfig;
  /** Função para ajustar offset de sincronização */
  setSyncOffset: (offset: number) => void;
  /** Função para atualizando sync manualmente */
  manualSync: (currentTime: number) => void;
  /** Métricas de performance */
  metrics: {
    fps: number;
    syncLatency: number;
    syncAccuracy: number;
  };
  /** ID do verso anterior (para animação de saída) */
  previousVerseId: string | null;
  /** Próxima palavra sincronizada (se disponível) */
  currentWord: any | null;
}

/**
 * Hook para sincronização de lyrics
 * Funciona com qualquer elemento de áudio
 */
export function useLyricsSync({
  lyrics,
  audioElement,
  onVerseChange,
  onError,
  animationConfig: customAnimConfig,
  syncOffset: initialSyncOffset = 0,
  debug = false,
}: UseLyricsSyncProps): UseLyricsSyncReturn {
  // Estado
  const [playerState, setPlayerState] = useState<LyricsPlayerState>({
    currentVerse: null,
    nextVerse: null,
    previousVerse: null,
    currentTime: 0,
    verseProgress: 0,
    isPlaying: false,
    currentVerseIndex: 0,
    totalVerses: lyrics?.lyrics.length || 0,
  });

  const [loadingState, setLoadingState] = useState<LyricsLoadingState>(
    lyrics ? LyricsLoadingState.LOADED : LyricsLoadingState.IDLE
  );

  const [error, setError] = useState<LyricsError | null>(null);
  const [syncOffset, setSyncOffset] = useState(initialSyncOffset);
  const [previousVerseId, setPreviousVerseId] = useState<string | null>(null);

  // Refs para tracking
  const rafRef = useRef<number | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const fpsCounterRef = useRef({ count: 0, lastTime: Date.now(), fps: 60 });
  const offsetLyricsRef = useRef<LyricsVerse[]>([]);
  const lastVerseIdRef = useRef<string | null>(null);

  // Configuração de animação
  const animationConfig = useMemo(
    () => ({
      ...DEFAULT_ANIMATION_CONFIG,
      ...customAnimConfig,
      // Se lyrics tem BPM, calcula duração baseado nisso
      ...(lyrics && customAnimConfig?.useBpmTiming
        ? {
            transitionDuration: Math.round(
              (60 / lyrics.bpm) * 1000 * 1.2 // 1.2 = fator de suavidade
            ),
          }
        : {}),
    }),
    [lyrics, customAnimConfig]
  );

  // Atualiza lyrics com offset
  useEffect(() => {
    if (!lyrics) return;

    const offsetLyrics = offsetLyricsTime(lyrics.lyrics, syncOffset);
    offsetLyricsRef.current = offsetLyrics;

    if (debug) {
      console.debug(
        `[LyricsSync] Offset aplicado: ${syncOffset}ms, total de versos: ${offsetLyrics.length}`
      );
    }
  }, [lyrics, syncOffset, debug]);

  // Encontra palavra sincronizada atual
  const currentWord = useMemo(() => {
    if (
      !playerState.currentVerse ||
      !animationConfig.wordLevelSync ||
      !playerState.currentVerse.words
    ) {
      return null;
    }

    return findCurrentWord(playerState.currentVerse, playerState.currentTime);
  }, [playerState.currentVerse, playerState.currentTime, animationConfig.wordLevelSync]);

  // Atualiza estado do player baseado em tempo atual de áudio
  const updatePlayerState = useCallback(
    (currentTime: number, isPlaying: boolean) => {
      if (!offsetLyricsRef.current || offsetLyricsRef.current.length === 0) return;

      const newState = calculateLyricsPlayerState(
        offsetLyricsRef.current,
        currentTime,
        isPlaying
      );

      setPlayerState(newState);

      // Detecta mudança de verso
      if (
        newState.currentVerse &&
        newState.currentVerse.id !== lastVerseIdRef.current
      ) {
        lastVerseIdRef.current = newState.currentVerse.id;
        setPreviousVerseId(newState.previousVerse?.id || null);

        if (onVerseChange) {
          onVerseChange(newState.currentVerse, newState.currentVerseIndex);
        }

        if (debug) {
          console.debug(
            `[LyricsSync] Verso mudou: ${newState.currentVerse.id}`,
            newState.currentVerse.text
          );
        }
      }

      // Registra latência
      const now = performance.now();
      const latency = now - lastSyncTimeRef.current;
      lastSyncTimeRef.current = now;

      // Atualiza FPS counter
      fpsCounterRef.current.count++;
      const timeDiff = Date.now() - fpsCounterRef.current.lastTime;
      if (timeDiff >= 1000) {
        fpsCounterRef.current.fps = fpsCounterRef.current.count;
        fpsCounterRef.current.count = 0;
        fpsCounterRef.current.lastTime = Date.now();
      }
    },
    [onVerseChange, debug]
  );

  // Loop de animação sincronizado com áudio
  const animationLoop = useCallback(() => {
    if (!audioElement) {
      rafRef.current = requestAnimationFrame(animationLoop);
      return;
    }

    const currentTime = audioElement.currentTime * 1000;
    const isPlaying = !audioElement.paused;

    updatePlayerState(currentTime, isPlaying);

    rafRef.current = requestAnimationFrame(animationLoop);
  }, [audioElement, updatePlayerState]);

  // Inicia loop de animação
  useEffect(() => {
    rafRef.current = requestAnimationFrame(animationLoop);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [animationLoop]);

  // Event listeners de áudio
  useEffect(() => {
    if (!audioElement) return;

    const handlePlay = () => {
      if (debug) console.debug('[LyricsSync] Audio started');
      setLoadingState(LyricsLoadingState.SYNCING);
    };

    const handlePause = () => {
      if (debug) console.debug('[LyricsSync] Audio paused');
    };

    const handleEnded = () => {
      if (debug) console.debug('[LyricsSync] Audio ended');
    };

    const handleError = (e: Event) => {
      const error: LyricsError = {
        type: LyricsErrorType.AUDIO_NOT_READY,
        message: 'Erro ao reproduzir áudio',
        timestamp: Date.now(),
      };
      setError(error);
      if (onError) onError(error);
    };

    audioElement.addEventListener('play', handlePlay);
    audioElement.addEventListener('pause', handlePause);
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('error', handleError);

    return () => {
      audioElement.removeEventListener('play', handlePlay);
      audioElement.removeEventListener('pause', handlePause);
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('error', handleError);
    };
  }, [audioElement, debug, onError]);

  // Validação de lyrics
  useEffect(() => {
    if (!lyrics || !Array.isArray(lyrics.lyrics) || lyrics.lyrics.length === 0) {
      const error: LyricsError = {
        type: LyricsErrorType.INVALID_FORMAT,
        message: 'Dados de lyrics inválidos ou vazios',
        timestamp: Date.now(),
      };
      setError(error);
      setLoadingState(LyricsLoadingState.ERROR);
      if (onError) onError(error);
      return;
    }

    setLoadingState(LyricsLoadingState.LOADED);
    setError(null);
  }, [lyrics, onError]);

  return {
    playerState,
    loadingState,
    error,
    animationConfig,
    setSyncOffset,
    manualSync: (currentTime) => {
      updatePlayerState(currentTime, audioElement?.playing ?? false);
    },
    metrics: {
      fps: fpsCounterRef.current.fps,
      syncLatency: Date.now() - lastSyncTimeRef.current,
      syncAccuracy: playerState.currentVerse
        ? Math.round(
            (1 - Math.abs(playerState.verseProgress - 0.5) / 0.5) * 100
          )
        : 0,
    },
    previousVerseId,
    currentWord: currentWord?.word || null,
  };
}

/**
 * Cálculo de sincronização com compensação automática
 * Mede latência entre click e sync
 */
export function useSyncCalibration(audioElement: HTMLAudioElement | null) {
  const calibrationRef = useRef<{ offset: number; confidence: number }>({
    offset: 0,
    confidence: 0,
  });

  const calibrate = useCallback(async (currentVerseStartTime: number) => {
    if (!audioElement) return;

    const audioTime = audioElement.currentTime * 1000;
    const diff = audioTime - currentVerseStartTime;

    // Atualiza offset com suavização exponencial
    const alpha = 0.3;
    calibrationRef.current.offset =
      calibrationRef.current.offset * (1 - alpha) + diff * alpha;

    calibrationRef.current.confidence = Math.min(
      1,
      calibrationRef.current.confidence + 0.1
    );

    return calibrationRef.current.offset;
  }, [audioElement]);

  return { calibrate, calibration: calibrationRef.current };
}
