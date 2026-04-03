import { useState, useCallback } from 'react';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl?: string;
  streamUrl: string;
}

export type RepeatMode = 'off' | 'one' | 'all';

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function useQueue(initialTracks: Track[] = []) {
  const [queue, setQueue] = useState<Track[]>(initialTracks);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffled, setShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');

  const current = queue[currentIndex] ?? null;

  // Task 15.6: append, play next, remove without stopping playback
  const append = useCallback((track: Track) => {
    setQueue((q) => [...q, track]);
  }, []);

  const playNext = useCallback((track: Track) => {
    setQueue((q) => {
      const next = [...q];
      next.splice(currentIndex + 1, 0, track);
      return next;
    });
  }, [currentIndex]);

  const remove = useCallback((trackId: string) => {
    setQueue((q) => {
      const idx = q.findIndex((t) => t.id === trackId);
      if (idx === -1) return q;
      const next = q.filter((t) => t.id !== trackId);
      // Adjust currentIndex if needed to avoid stopping playback
      if (idx < currentIndex) setCurrentIndex((i) => i - 1);
      return next;
    });
  }, [currentIndex]);

  // Task 15.2: shuffle (Fisher-Yates)
  const toggleShuffle = useCallback(() => {
    setShuffled((s) => {
      if (!s) {
        setQueue((q) => {
          const cur = q[currentIndex];
          const rest = shuffle(q.filter((_, i) => i !== currentIndex));
          setCurrentIndex(0);
          return [cur, ...rest];
        });
      }
      return !s;
    });
  }, [currentIndex]);

  // Task 15.3: repeat modes
  const cycleRepeat = useCallback(() => {
    setRepeatMode((m) => (m === 'off' ? 'one' : m === 'one' ? 'all' : 'off'));
  }, []);

  const goNext = useCallback(() => {
    if (repeatMode === 'one') return; // handled by audio element loop
    if (currentIndex < queue.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else if (repeatMode === 'all') {
      setCurrentIndex(0);
    }
  }, [currentIndex, queue.length, repeatMode]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const playAt = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  return {
    queue,
    current,
    currentIndex,
    shuffled,
    repeatMode,
    append,
    playNext,
    remove,
    toggleShuffle,
    cycleRepeat,
    goNext,
    goPrev,
    playAt,
  };
}
