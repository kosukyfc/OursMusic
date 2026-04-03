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
  off: '🔁 Off',
  one: '🔂 One',
  all: '🔁 All',
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
      <button onClick={onPrev} aria-label="Previous track">⏮</button>
      <button onClick={onNext} aria-label="Next track">⏭</button>
      <button
        onClick={onToggleShuffle}
        aria-label={shuffled ? 'Disable shuffle' : 'Enable shuffle'}
        aria-pressed={shuffled}
        className={shuffled ? 'active' : ''}
      >
        🔀
      </button>
      <button
        onClick={onCycleRepeat}
        aria-label={`Repeat mode: ${repeatMode}`}
      >
        {REPEAT_LABELS[repeatMode]}
      </button>
    </div>
  );
}
