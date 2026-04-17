import type { RepeatMode } from './useQueue';

interface Props {
  playing: boolean;
  shuffled: boolean;
  repeatMode: RepeatMode;
  onPrev: () => void;
  onNext: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
}

const REPEAT_LABELS: Record<RepeatMode, string> = {
  off: 'Off',
  one: 'One',
  all: 'All',
};

const REPEAT_ICONS: Record<RepeatMode, string> = {
  off: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
  one: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/></svg>',
  all: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
};

/**
 * Task 15.2: Shuffle button (Fisher-Yates, handled in useQueue).
 * Task 15.3: Repeat mode cycle (off → one → all).
 */
export function PlayerControls({
  shuffled,
  repeatMode,
  onPrev,
  onNext,
  onToggleShuffle,
  onCycleRepeat,
}: Props) {
  return (
    <div className="player-controls" role="group" aria-label="Playback controls">
      <button onClick={onPrev} aria-label="Previous track" className="player-controls__btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
      </button>
      <button onClick={onNext} aria-label="Next track" className="player-controls__btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
      </button>
      <button
        onClick={onToggleShuffle}
        aria-label={shuffled ? 'Disable shuffle' : 'Enable shuffle'}
        aria-pressed={shuffled}
        className={`player-controls__btn${shuffled ? ' player-controls__btn--active' : ''}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
      </button>
      <button
        onClick={onCycleRepeat}
        aria-label={`Repeat mode: ${repeatMode}`}
        className={`player-controls__btn${repeatMode !== 'off' ? ' player-controls__btn--active' : ''}`}
        title={REPEAT_LABELS[repeatMode]}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
        <span style={{fontSize: '10px', marginLeft: '2px'}}>{REPEAT_LABELS[repeatMode]}</span>
      </button>
    </div>
  );
}
