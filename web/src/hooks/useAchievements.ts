import { useState, useCallback, useMemo } from 'react';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
}

export function useAchievements(_listeningData: any) {
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const saved = localStorage.getItem('achievements');
    return saved ? JSON.parse(saved) : getDefaultAchievements();
  });

  const updateAchievement = useCallback((id: string, progress: number) => {
    setAchievements(prev => {
      const updated = prev.map(ach => 
        ach.id === id ? { ...ach, progress, unlocked: progress >= ach.maxProgress } : ach
      );
      localStorage.setItem('achievements', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getUnlockedCount = useMemo(() => {
    return achievements.filter(a => a.unlocked).length;
  }, [achievements]);

  return { achievements, updateAchievement, getUnlockedCount };
}

function getDefaultAchievements(): Achievement[] {
  return [
    { id: 'first_play', name: 'First Note', description: 'Começar a ouvir', icon: '🎵', progress: 0, maxProgress: 1, unlocked: false },
    { id: 'streak_7', name: '7-Day Listener', description: '7 dias ouvindo consecutivos', icon: '🔥', progress: 0, maxProgress: 7, unlocked: false },
    { id: 'explore_5_genres', name: 'Genre Explorer', description: 'Escutar 5 gêneros diferentes', icon: '🌍', progress: 0, maxProgress: 5, unlocked: false },
    { id: 'superfan_artist', name: 'Superfã', description: '+100h de um artista', icon: '🌟', progress: 0, maxProgress: 100, unlocked: false },
    { id: 'playlist_collector', name: 'Colecionador', description: 'Criar 10 playlists', icon: '📚', progress: 0, maxProgress: 10, unlocked: false },
    { id: 'social_butterfly', name: 'Social Butterfly', description: 'Compartilhar 10 playlists', icon: '🦋', progress: 0, maxProgress: 10, unlocked: false },
    { id: 'night_owl', name: 'Night Owl', description: 'Ouvir 50h entre 22:00-05:00', icon: '🌙', progress: 0, maxProgress: 50, unlocked: false },
    { id: 'early_bird', name: 'Early Bird', description: 'Ouvir 50h entre 05:00-10:00', icon: '🌅', progress: 0, maxProgress: 50, unlocked: false },
  ];
}
