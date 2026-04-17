import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  songCount: number;
  isPublic: boolean;
  coverUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistsState {
  playlists: Playlist[];
  currentPlaylistId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setPlaylists: (playlists: Playlist[]) => void;
  addPlaylist: (playlist: Playlist) => void;
  removePlaylist: (id: string) => void;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => void;
  setCurrentPlaylist: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePlaylistsStore = create<PlaylistsState>()(
  devtools((set) => ({
    playlists: [],
    currentPlaylistId: null,
    isLoading: false,
    error: null,

    setPlaylists: (playlists: Playlist[]) =>
      set({ playlists, error: null }),

    addPlaylist: (playlist: Playlist) =>
      set((state) => ({
        playlists: [playlist, ...state.playlists],
      })),

    removePlaylist: (id: string) =>
      set((state) => ({
        playlists: state.playlists.filter((p) => p.id !== id),
        currentPlaylistId:
          state.currentPlaylistId === id ? null : state.currentPlaylistId,
      })),

    updatePlaylist: (id: string, updates: Partial<Playlist>) =>
      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === id ? { ...p, ...updates } : p,
        ),
      })),

    setCurrentPlaylist: (id: string | null) =>
      set({ currentPlaylistId: id }),

    setLoading: (loading: boolean) => set({ isLoading: loading }),

    setError: (error: string | null) => set({ error }),
  })),
);
