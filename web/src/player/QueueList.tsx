import type { Track } from './useQueue';

interface Props {
  queue: Track[];
  currentIndex: number;
  onPlayAt: (index: number) => void;
  onRemove: (trackId: string) => void;
  onPlayNext: (track: Track) => void;
}

/**
 * Task 15.6: Queue management — append (handled externally), play next, remove without stopping.
 */
export function QueueList({ queue, currentIndex, onPlayAt, onRemove, onPlayNext }: Props) {
  if (queue.length === 0) {
    return <div className="queue-list queue-list--empty">Queue is empty</div>;
  }

  return (
    <ol className="queue-list" aria-label="Playback queue">
      {queue.map((track, i) => (
        <li
          key={`${track.id}-${i}`}
          className={`queue-list__item${i === currentIndex ? ' queue-list__item--active' : ''}`}
          aria-current={i === currentIndex ? 'true' : undefined}
        >
          <button
            className="queue-list__play"
            onClick={() => onPlayAt(i)}
            aria-label={`Play ${track.title}`}
          >
            {i === currentIndex ? '▶' : `${i + 1}.`}
          </button>
          <span className="queue-list__title">{track.title}</span>
          <span className="queue-list__artist">{track.artist}</span>
          <div className="queue-list__actions">
            <button
              onClick={() => onPlayNext(track)}
              aria-label={`Play ${track.title} next`}
              title="Play next"
            >
              ↑
            </button>
            <button
              onClick={() => onRemove(track.id)}
              aria-label={`Remove ${track.title} from queue`}
              title="Remove"
              disabled={i === currentIndex}
            >
              ✕
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}
