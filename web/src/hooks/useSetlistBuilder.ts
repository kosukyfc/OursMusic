import { useState, useCallback } from 'react';

export interface SavedSetlist {
  id: string;
  name: string;
  songs: Array<{ id: string; title: string; artist: string }>;
  createdAt: number;
  duration: number; // in seconds
}

export const useSetlistBuilder = () => {
  const [setlists, setSetlists] = useState<SavedSetlist[]>(() => {
    const saved = localStorage.getItem('setlists');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentBuild, setCurrentBuild] = useState<SavedSetlist['songs']>([]);

  const saveSetlist = useCallback((name: string) => {
    const duration = currentBuild.reduce((acc) => acc + 180, 0); // Assume 3min per song
    const newSetlist: SavedSetlist = {
      id: Date.now().toString(),
      name,
      songs: currentBuild,
      createdAt: Date.now(),
      duration,
    };

    const updated = [...setlists, newSetlist];
    setSetlists(updated);
    localStorage.setItem('setlists', JSON.stringify(updated));
    setCurrentBuild([]);
    return newSetlist;
  }, [currentBuild, setlists]);

  const addSongToCurrent = useCallback((song: SavedSetlist['songs'][0]) => {
    setCurrentBuild(prev => [...prev, { ...song, id: `${song.id}-${Date.now()}` }]);
  }, []);

  const removeSongFromCurrent = useCallback((index: number) => {
    setCurrentBuild(prev => prev.filter((_, i) => i !== index));
  }, []);

  const reorderSongs = useCallback((fromIndex: number, toIndex: number) => {
    setCurrentBuild(prev => {
      const updated = [...prev];
      const [removed] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, removed);
      return updated;
    });
  }, []);

  const deleteSetlist = useCallback((id: string) => {
    const updated = setlists.filter(s => s.id !== id);
    setSetlists(updated);
    localStorage.setItem('setlists', JSON.stringify(updated));
  }, [setlists]);

  const loadSetlist = useCallback((id: string) => {
    const setlist = setlists.find(s => s.id === id);
    if (setlist) {
      setCurrentBuild(setlist.songs);
    }
  }, [setlists]);

  const getTotalDuration = () => {
    return currentBuild.reduce((acc) => acc + 180, 0) / 60; // in minutes
  };

  return {
    setlists,
    currentBuild,
    saveSetlist,
    addSongToCurrent,
    removeSongFromCurrent,
    reorderSongs,
    deleteSetlist,
    loadSetlist,
    getTotalDuration,
  };
};
