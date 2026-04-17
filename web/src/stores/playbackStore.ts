import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

export interface Song {
  id: string;
  title: string;
  artist: string;
  duration: number;
  coverUrl?: string;
  audioUrl: string;
}

export interface PlaybackState {
  currentSong: Song | null;
  queue: Song[];
  queueIndex: number;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number; // 0-1
  currentTime: number;
  repeat: 'off' | 'one' | 'all';
  shuffle: boolean;

  // Actions
  setCurrentSong: (song: Song) => void;
  setQueue: (songs: Song[], startIndex?: number) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  nextSong: () => void;
  prevSong: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setRepeat: (repeat: 'off' | 'one' | 'all') => void;
  toggleShuffle: () => void;
}

export const usePlaybackStore = create<PlaybackState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      currentSong: null,
      queue: [],
      queueIndex: 0,
      isPlaying: false,
      isMuted: false,
      volume: 0.7,
      currentTime: 0,
      repeat: 'off',
      shuffle: false,

      setCurrentSong: (song: Song) =>
        set({ currentSong: song, currentTime: 0, isPlaying: true }),

      setQueue: (songs: Song[], startIndex = 0) =>
        set({
          queue: songs,
          queueIndex: startIndex,
          currentSong: songs[startIndex] || null,
          currentTime: 0,
          isPlaying: true,
        }),

      addToQueue: (song: Song) =>
        set((state) => ({
          queue: [...state.queue, song],
        })),

      removeFromQueue: (index: number) =>
        set((state) => ({
          queue: state.queue.filter((_, i) => i !== index),
        })),

      clearQueue: () =>
        set({
          queue: [],
          currentSong: null,
          queueIndex: 0,
          isPlaying: false,
        }),

      play: () => set({ isPlaying: true }),

      pause: () => set({ isPlaying: false }),

      togglePlayPause: () =>
        set((state) => ({ isPlaying: !state.isPlaying })),

      nextSong: () => {
        const state = get();
        const { queue, queueIndex, shuffle, repeat } = state;

        if (queue.length === 0) return;

        let nextIndex = queueIndex + 1;

        if (shuffle) {
          nextIndex = Math.floor(Math.random() * queue.length);
        } else if (nextIndex >= queue.length) {
          if (repeat === 'all') {
            nextIndex = 0;
          } else {
            return; // End of queue
          }
        }

        set({
          queueIndex: nextIndex,
          currentSong: queue[nextIndex],
          currentTime: 0,
          isPlaying: true,
        });
      },

      prevSong: () => {
        const state = get();
        const { queue, queueIndex, currentTime } = state;

        if (queue.length === 0) return;

        // If already past 3 seconds, restart current song
        if (currentTime > 3) {
          set({ currentTime: 0 });
          return;
        }

        const prevIndex = queueIndex - 1;
        if (prevIndex >= 0) {
          set({
            queueIndex: prevIndex,
            currentSong: queue[prevIndex],
            currentTime: 0,
            isPlaying: true,
          });
        }
      },

      seek: (time: number) => set({ currentTime: time }),

      setVolume: (volume: number) =>
        set({ volume: Math.max(0, Math.min(1, volume)) }),

      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

      setRepeat: (repeat: 'off' | 'one' | 'all') => set({ repeat }),

      toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
    })),
  ),
);

// Selectors for optimized re-renders
export const useCurrentSong = () => usePlaybackStore((state) => state.currentSong);
export const useIsPlaying = () => usePlaybackStore((state) => state.isPlaying);
export const useVolume = () => usePlaybackStore((state) => state.volume);
export const useQueue = () => usePlaybackStore((state) => state.queue);
