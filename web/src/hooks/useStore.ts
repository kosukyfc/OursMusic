import { usePlaybackStore, useUserStore, usePlaylistsStore } from '../stores';

/**
 * Hook to get current playback status
 */
export const usePlaybackStatus = () => {
  const currentSong = usePlaybackStore((state) => state.currentSong);
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const volume = usePlaybackStore((state) => state.volume);
  const repeat = usePlaybackStore((state) => state.repeat);
  const shuffle = usePlaybackStore((state) => state.shuffle);

  return {
    currentSong,
    isPlaying,
    volume,
    repeat,
    shuffle,
  };
};

/**
 * Hook to control playback
 */
export const usePlaybackControls = () => {
  return {
    play: usePlaybackStore((state) => state.play),
    pause: usePlaybackStore((state) => state.pause),
    togglePlayPause: usePlaybackStore((state) => state.togglePlayPause),
    nextSong: usePlaybackStore((state) => state.nextSong),
    prevSong: usePlaybackStore((state) => state.prevSong),
    seek: usePlaybackStore((state) => state.seek),
    setVolume: usePlaybackStore((state) => state.setVolume),
    toggleMute: usePlaybackStore((state) => state.toggleMute),
    setRepeat: usePlaybackStore((state) => state.setRepeat),
    toggleShuffle: usePlaybackStore((state) => state.toggleShuffle),
  };
};

/**
 * Hook to get user authentication state
 */
export const useAuth = () => {
  const user = useUserStore((state) => state.user);
  const isLoading = useUserStore((state) => state.isLoading);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isPremium: user?.plan === 'premium' || user?.plan === 'family',
  };
};

/**
 * Hook to manage user state
 */
export const useAuthActions = () => {
  return {
    setUser: useUserStore((state) => state.setUser),
    clearUser: useUserStore((state) => state.clearUser),
    updateUser: useUserStore((state) => state.updateUser),
    setLoading: useUserStore((state) => state.setLoading),
    setError: useUserStore((state) => state.setError),
  };
};

/**
 * Hook to get playlists
 */
export const usePlaylists = () => {
  const playlists = usePlaylistsStore((state) => state.playlists);
  const currentPlaylistId = usePlaylistsStore((state) => state.currentPlaylistId);
  const isLoading = usePlaylistsStore((state) => state.isLoading);
  const error = usePlaylistsStore((state) => state.error);

  const currentPlaylist = playlists.find((p) => p.id === currentPlaylistId);

  return {
    playlists,
    currentPlaylist,
    currentPlaylistId,
    isLoading,
    error,
  };
};

/**
 * Hook to manage playlists
 */
export const usePlaylistActions = () => {
  return {
    setPlaylists: usePlaylistsStore((state) => state.setPlaylists),
    addPlaylist: usePlaylistsStore((state) => state.addPlaylist),
    removePlaylist: usePlaylistsStore((state) => state.removePlaylist),
    updatePlaylist: usePlaylistsStore((state) => state.updatePlaylist),
    setCurrentPlaylist: usePlaylistsStore((state) => state.setCurrentPlaylist),
    setLoading: usePlaylistsStore((state) => state.setLoading),
    setError: usePlaylistsStore((state) => state.setError),
  };
};
