import { useCallback, useEffect, useState } from 'react';

export interface PlayHistoryEntry {
  songId: string;
  title: string;
  artist?: string;
  playedAt: number;
  duration: number;
}

export function usePlayHistory() {
  const [history, setHistory] = useState<PlayHistoryEntry[]>([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('playHistory');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading play history:', e);
    }
  }, []);

  // Save to localStorage whenever history changes
  useEffect(() => {
    try {
      localStorage.setItem('playHistory', JSON.stringify(history.slice(0, 500)));
    } catch (e) {
      console.error('Error saving play history:', e);
    }
  }, [history]);

  const addToHistory = useCallback((entry: Omit<PlayHistoryEntry, 'playedAt'>) => {
    setHistory(prev => [
      { ...entry, playedAt: Date.now() },
      ...prev.slice(0, 499)
    ]);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem('playHistory');
  }, []);

  const getTopArtists = useCallback((days = 30) => {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recent = history.filter(h => h.playedAt > cutoff);
    
    const artistMap = new Map<string, { artist: string; plays: number; totalTime: number }>();
    recent.forEach(entry => {
      const key = entry.artist || 'Unknown';
      const current = artistMap.get(key);
      if (current) {
        artistMap.set(key, { artist: current.artist, plays: current.plays + 1, totalTime: current.totalTime + entry.duration });
      } else {
        artistMap.set(key, { artist: key, plays: 1, totalTime: entry.duration });
      }
    });

    return Array.from(artistMap.values()).sort((a, b) => b.plays - a.plays).slice(0, 10);
  }, [history]);

  const getTotalPlayTime = useCallback((days = 30) => {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return history
      .filter(h => h.playedAt > cutoff)
      .reduce((sum, h) => sum + h.duration, 0);
  }, [history]);

  const getRecentlyPlayed = useCallback((limit = 20) => {
    return history.slice(0, limit);
  }, [history]);

  return {
    history,
    addToHistory,
    clearHistory,
    getTopArtists,
    getTotalPlayTime,
    getRecentlyPlayed,
  };
}
