/**
 * Tipos para o Sistema de Lyrics Karaokê Premium
 * Sincronização com áudio, animações, timestamps por verso e por palavra
 */

/**
 * Estrutura de uma palavra dentro de um verso
 * Para sincronização granular (word-level karaokê)
 */
export interface LyricsWord {
  /** Texto da palavra */
  word: string;
  /** Tempo de início em ms */
  startTime: number;
  /** Tempo de fim em ms */
  endTime: number;
}

/**
 * Estrutura de um verso (linha) da música
 * Pode conter palavras individuais para sincronização detalhada
 */
export interface LyricsVerse {
  /** ID único do verso */
  id: string;
  /** Texto completo do verso */
  text: string;
  /** Tempo de início do verso em ms */
  startTime: number;
  /** Tempo de fim do verso em ms */
  endTime: number;
  /** Sincronização por palavra (opcional, para karaokê avançado) */
  words?: LyricsWord[];
  /** Tipo de verso (verse, chorus, bridge, pre-chorus) */
  type?: 'verse' | 'chorus' | 'bridge' | 'pre-chorus' | 'outro' | 'intro';
  /** Traduções opcionais em outros idiomas */
  translations?: Record<string, string>;
}

/**
 * Estrutura completa de letras de uma música
 */
export interface LyricsData {
  /** ID da faixa no banco de dados */
  trackId: string;
  /** Título da música */
  title: string;
  /** Nome do artista */
  artist: string;
  /** URL da capa do álbum */
  albumArt: string;
  /** BPM da música (para velocidade de scroll) */
  bpm: number;
  /** Duração total em ms */
  duration: number;
  /** Array de versos */
  lyrics: LyricsVerse[];
  /** Fonte das letras (Genius, Musixmatch, etc) */
  source?: string;
  /** Idioma principal das letras */
  language: 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR' | 'de-DE' | 'ja-JP' | 'zh-CN';
  /** Data de atualização */
  updatedAt: string;
  /** Se disponível sincronização por palavra */
  hasWordSync: boolean;
}

/**
 * Estado do leitor de lyrics em tempo real
 */
export interface LyricsPlayerState {
  /** Verso atualmente em exibição */
  currentVerse: LyricsVerse | null;
  /** Verso seguinte (para prévia) */
  nextVerse: LyricsVerse | null;
  /** Verso anterior (para contexto) */
  previousVerse: LyricsVerse | null;
  /** Tempo atual de reprodução em ms */
  currentTime: number;
  /** Progresso do verso atual (0-1) */
  verseProgress: number;
  /** Se está reproduzindo */
  isPlaying: boolean;
  /** Índice do verso atual */
  currentVerseIndex: number;
  /** Total de versos */
  totalVerses: number;
}

/**
 * Configurações de animação do karaokê
 */
export interface LyricsAnimationConfig {
  /** Duração da transição entre versos em ms */
  transitionDuration: number;
  /** Easing function para transições */
  easing: 'ease-in-out' | 'ease-in' | 'ease-out' | 'linear' | 'smooth-in-out';
  /** Offset de tempo antes do timestamp para suavidade (em ms) */
  timeOffset: number;
  /** Se deve usar BPM para calcular duração */
  useBpmTiming: boolean;
  /** Intensidade do glow do highlight neon (0-1) */
  glowIntensity: number;
  /** Habilitar blur effect ao sair */
  enableBlur: boolean;
  /** Habilitar scale-up do próximo verso */
  enableScaleUp: boolean;
  /** Suportar sincronização por palavra */
  wordLevelSync: boolean;
}

/**
 * Configurações de responsividade e layout
 */
export interface LyricsResponsiveConfig {
  /** Tamanho da fonte para verso atual (px) */
  currentVerseFontSize: number;
  /** Tamanho da fonte para próximo verso (px) */
  nextVerseFontSize: number;
  /** Altura do container em vh */
  containerHeight: number;
  /** Modo de layout: 'vertical' | 'horizontal' | 'compact' */
  layoutMode: 'vertical' | 'horizontal' | 'compact';
  /** Tamanho da capa do álbum (px) */
  albumArtSize: number;
  /** Se mostrar capa do álbum */
  showAlbumArt: boolean;
  /** Se mostrar controles do player */
  showPlayerControls: boolean;
  /** Se mostrar informações do artista */
  showArtistInfo: boolean;
  /** Orientação do dispositivo */
  orientation: 'portrait' | 'landscape' | 'auto';
}

/**
 * Tema (dark/light mode)
 */
export interface LyricsTheme {
  /** Modo: 'dark' | 'light' | 'auto' */
  mode: 'dark' | 'light' | 'auto';
  
  /** Cores para dark mode */
  dark: {
    backgroundPrimary: string;
    backgroundSecondary: string;
    textPrimary: string;
    textSecondary: string;
    accentHighlight: string;
    accentGlow: string;
    albumBlur: string;
  };
  
  /** Cores para light mode */
  light: {
    backgroundPrimary: string;
    backgroundSecondary: string;
    textPrimary: string;
    textSecondary: string;
    accentHighlight: string;
    accentGlow: string;
    albumBlur: string;
  };
}

/**
 * Opções de configuração global do sistema de lyrics
 */
export interface LyricsSystemConfig {
  /** Tema visual */
  theme: LyricsTheme;
  /** Configurações de animação */
  animation: LyricsAnimationConfig;
  /** Configurações de responsividade */
  responsive: LyricsResponsiveConfig;
  /** Se habilitar logs de debug */
  debug: boolean;
  /** Callback quando verso muda */
  onVerseChange?: (verse: LyricsVerse, index: number) => void;
  /** Callback quando sincronização falha */
  onSyncError?: (error: Error) => void;
}

/**
 * Estado de erro de sincronização
 */
export enum LyricsErrorType {
  FETCH_FAILED = 'FETCH_FAILED',
  INVALID_FORMAT = 'INVALID_FORMAT',
  SYNC_TIMEOUT = 'SYNC_TIMEOUT',
  AUDIO_NOT_READY = 'AUDIO_NOT_READY',
  NOT_FOUND = 'NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

export interface LyricsError {
  type: LyricsErrorType;
  message: string;
  trackId?: string;
  timestamp: number;
}

/**
 * Resposta da API de lyrics
 */
export interface LyricsApiResponse {
  success: boolean;
  data?: LyricsData;
  error?: LyricsError;
  cached: boolean;
  timestamp: number;
}

/**
 * Estado de carregamento
 */
export enum LyricsLoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  LOADED = 'LOADED',
  ERROR = 'ERROR',
  SYNCING = 'SYNCING',
}

/**
 * Estatísticas de performance
 */
export interface LyricsPerformanceMetrics {
  /** FPS atual */
  fps: number;
  /** Latência de sincronização (ms) */
  syncLatency: number;
  /** Uso de memória (MB) */
  memoryUsage: number;
  /** Uso de CPU (%) */
  cpuUsage: number;
  /** Tempo de resposta da API (ms) */
  apiResponseTime: number;
  /** Precisão de sincronização (0-100%) */
  syncAccuracy: number;
}

/**
 * Plataforma de execução
 */
export enum Platform {
  WEB = 'web',
  IOS = 'ios',
  ANDROID = 'android',
  MACOS = 'macos',
  WINDOWS = 'windows',
  LINUX = 'linux',
  SMART_TV = 'smart-tv',
  SMARTWATCH = 'smartwatch',
  TABLET = 'tablet',
}

/**
 * Informações de dispositivo
 */
export interface DeviceInfo {
  platform: Platform;
  screenWidth: number;
  screenHeight: number;
  screenDensity: number;
  hasNotch: boolean;
  isSafeAreaAware: boolean;
  supportsTouchInput: boolean;
  supportsHapticFeedback: boolean;
  isPWA: boolean;
}
