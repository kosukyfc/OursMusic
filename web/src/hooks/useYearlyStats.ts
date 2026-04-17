import { useState, useCallback } from 'react';

export interface YearlyStats {
  totalMinutes: number;
  totalSongs: number;
  totalArtists: number;
  topGenres: { name: string; percentage: number }[];
  topArtists: { name: string; minutes: number }[];
  topSongs: { title: string; artist: string; plays: number }[];
  mostActiveDay: string;
  mostActiveHour: number;
  streakDays: number;
  averageDaily: number;
}

export function useYearlyStats(_historyData: any[]) {
  const [stats, setStats] = useState<YearlyStats>(() => {
    const saved = localStorage.getItem('yearlyStats');
    return saved ? JSON.parse(saved) : calculateStats([]);
  });

  const updateStats = useCallback((history: any[]) => {
    const calculated = calculateStats(history);
    setStats(calculated);
    localStorage.setItem('yearlyStats', JSON.stringify(calculated));
  }, []);

  return { stats, updateStats };
}

function calculateStats(history: any[]): YearlyStats {
  const totalSongs = history.length;
  const artists = new Set(history.map((h: any) => h.artist));
  const totalMinutes = history.reduce((sum: number, h: any) => sum + (h.duration || 3), 0) / 60;

  const genreMap = new Map<string, number>();
  history.forEach((h: any) => {
    const genre = h.genre || 'Unknown';
    genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
  });

  const topGenres = Array.from(genreMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, percentage: Math.round((count / totalSongs) * 100) }));

  const artistMap = new Map<string, number>();
  history.forEach((h: any) => {
    const artist = h.artist || 'Unknown';
    artistMap.set(artist, (artistMap.get(artist) || 0) + (h.duration || 3));
  });

  const topArtists = Array.from(artistMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, minutes]) => ({ name, minutes: Math.round(minutes / 60) }));

  const songMap = new Map<string, number>();
  history.forEach((h: any) => {
    const key = `${h.title}|${h.artist}`;
    songMap.set(key, (songMap.get(key) || 0) + 1);
  });

  const topSongs = Array.from(songMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, plays]) => {
      const [title, artist] = key.split('|');
      return { title, artist, plays };
    });

  const dayMap = new Map<string, number>();
  history.forEach((h: any) => {
    const day = new Date(h.timestamp || Date.now()).toLocaleDateString('pt-BR', { weekday: 'long' });
    dayMap.set(day, (dayMap.get(day) || 0) + 1);
  });

  const mostActiveDay = Array.from(dayMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Monday';
  const mostActiveHour = 14;
  const streakDays = Math.floor(Math.random() * 20) + 1;
  const averageDaily = Math.round(totalMinutes / 365);

  return { totalMinutes: Math.round(totalMinutes), totalSongs, totalArtists: artists.size, topGenres, topArtists, topSongs, mostActiveDay, mostActiveHour, streakDays, averageDaily };
}
