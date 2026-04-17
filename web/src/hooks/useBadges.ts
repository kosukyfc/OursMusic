import { useCallback, useMemo } from 'react';

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
}

interface ArtistStats {
  [artistName: string]: {
    plays: number;
    lastPlayed: number;
  };
}

export function useBadges(history: any[]) {
  const artistStats = useMemo(() => {
    const stats: ArtistStats = {};
    history.forEach(entry => {
      const artist = entry.artist || 'Unknown';
      if (!stats[artist]) {
        stats[artist] = { plays: 0, lastPlayed: 0 };
      }
      stats[artist].plays += 1;
      stats[artist].lastPlayed = Math.max(stats[artist].lastPlayed, entry.playedAt);
    });
    return stats;
  }, [history]);

  const calculateBadges = useCallback((): Badge[] => {
    const badges: Badge[] = [];
    const totalPlays = history.length;
    // const now = Date.now();

    // Music Lover - 50 plays
    badges.push({
      id: 'music_lover_50',
      name: '🎵 Music Lover',
      icon: '🎵',
      description: 'Ouça 50 músicas',
      progress: Math.min(totalPlays, 50),
      maxProgress: 50,
      unlocked: totalPlays >= 50,
    });

    // Devoted - 100 plays
    badges.push({
      id: 'devoted_100',
      name: '👑 Devoted',
      icon: '👑',
      description: 'Ouça 100 músicas',
      progress: Math.min(totalPlays, 100),
      maxProgress: 100,
      unlocked: totalPlays >= 100,
    });

    // Fan of the Artist - 20 plays same artist
    const maxArtistPlays = Math.max(...Object.values(artistStats).map(s => s.plays), 0);
    badges.push({
      id: 'fan_of_artist',
      name: '⭐ Fã do Artista',
      icon: '⭐',
      description: 'Ouça 20 músicas do mesmo artista',
      progress: Math.min(maxArtistPlays, 20),
      maxProgress: 20,
      unlocked: maxArtistPlays >= 20,
    });

    // Night Owl - plays between 22:00-06:00
    const nightPlays = history.filter(h => {
      const hour = new Date(h.playedAt).getHours();
      return hour >= 22 || hour < 6;
    }).length;
    badges.push({
      id: 'night_owl',
      name: '🌙 Night Owl',
      icon: '🌙',
      description: 'Ouça 30 músicas à noite',
      progress: Math.min(nightPlays, 30),
      maxProgress: 30,
      unlocked: nightPlays >= 30,
    });

    // Early Bird - plays between 06:00-10:00
    const morningPlays = history.filter(h => {
      const hour = new Date(h.playedAt).getHours();
      return hour >= 6 && hour < 10;
    }).length;
    badges.push({
      id: 'early_bird',
      name: '🌅 Early Bird',
      icon: '🌅',
      description: 'Ouça 30 músicas de manhã',
      progress: Math.min(morningPlays, 30),
      maxProgress: 30,
      unlocked: morningPlays >= 30,
    });

    // Binge Listener - 10 plays in one day
    const playsByDay = new Map<string, number>();
    history.forEach(entry => {
      const day = new Date(entry.playedAt).toDateString();
      playsByDay.set(day, (playsByDay.get(day) || 0) + 1);
    });
    const maxPlaysInDay = Math.max(...playsByDay.values(), 0);
    badges.push({
      id: 'binge_listener',
      name: '🔥 Binge Listener',
      icon: '🔥',
      description: 'Ouça 10 músicas em um dia',
      progress: Math.min(maxPlaysInDay, 10),
      maxProgress: 10,
      unlocked: maxPlaysInDay >= 10,
    });

    // Genre Explorer - listen to x different artists
    badges.push({
      id: 'genre_explorer',
      name: '🎭 Genre Explorer',
      icon: '🎭',
      description: 'Escute de 10 artistas diferentes',
      progress: Math.min(Object.keys(artistStats).length, 10),
      maxProgress: 10,
      unlocked: Object.keys(artistStats).length >= 10,
    });

    return badges;
  }, [history, artistStats]);

  const unlockedBadges = useMemo(() => {
    return calculateBadges().filter(b => b.unlocked);
  }, [calculateBadges]);

  return {
    badges: calculateBadges(),
    unlockedBadges,
    stats: useMemo(() => ({
      totalPlays: history.length,
      uniqueArtists: Object.keys(artistStats).length,
      topArtist: Object.entries(artistStats).sort((a, b) => b[1].plays - a[1].plays)[0]?.[0] || 'N/A',
      adventureScore: unlockedBadges.length * 20 + history.length,
    }), [history.length, artistStats, unlockedBadges.length]),
  };
}
