/**
 * Index File - Export Central para o Sistema de Lyrics
 * Facilita importações: import { ... } from '@/lyrics'
 */

// Types
export * from './types/lyrics';

// Hooks
export { useLyricsSync, useSyncCalibration } from './hooks/useLyricsSync';
export type { UseLyricsSyncProps, UseLyricsSyncReturn } from './hooks/useLyricsSync';

export { useResponsiveLyrics } from './hooks/useResponsiveLyrics';
export type { UseResponsiveLyricsProps, UseResponsiveLyricsReturn } from './hooks/useResponsiveLyrics';

// Components
export { LyricsDisplay } from './components/LyricsDisplay/LyricsDisplay';
export type { LyricsDisplayProps } from './components/LyricsDisplay/LyricsDisplay';

export { MusicPlayerWithLyrics } from './components/LyricsDisplay/MusicPlayerWithLyrics';
export type { MusicPlayerWithLyricsProps } from './components/LyricsDisplay/MusicPlayerWithLyrics';

// Utils
export * from './utils/lyricsParser';

// Example Data
export * from './data/example-lyrics';

// Styles
import './styles/lyrics-animations.css';
