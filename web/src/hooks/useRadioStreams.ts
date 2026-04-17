import { useCallback, useState } from 'react';

interface RadioStream {
  id: string;
  name: string;
  songs: Array<{ id: string; title: string; artist: string; duration: number }>;
  currentIndex: number;
}

export function useRadioStreams() {
  const [currentStation, setCurrentStation] = useState<string | null>(null);
  const [streams, setStreams] = useState<Map<string, RadioStream>>(new Map());

  const generateStreamForStation = useCallback((stationId: string) => {
    // Mock data - in production, would fetch from backend
    const stationConfigs: Record<string, { name: string; count: number }> = {
      chill: { name: 'Chill Radio', count: 500 },
      workout: { name: 'Workout Radio', count: 500 },
      sleep: { name: 'Sleep Radio', count: 500 },
      party: { name: 'Party Radio', count: 500 },
      focus: { name: 'Focus Radio', count: 500 },
      discovery: { name: 'Descoberta Semanal', count: 500 },
      artist: { name: 'Seu Artista Favorito', count: 500 },
    };

    const config = stationConfigs[stationId];
    if (!config) return null;

    const mockSongs = Array.from({ length: config.count }, (_, i) => ({
      id: `${stationId}-${i}`,
      title: `${config.name} - Track ${i + 1}`,
      artist: 'Artist Name',
      duration: 180,
    }));

    const stream: RadioStream = {
      id: stationId,
      name: config.name,
      songs: mockSongs,
      currentIndex: 0,
    };

    return stream;
  }, []);

  const selectStation = useCallback((stationId: string) => {
    setCurrentStation(stationId);
    if (!streams.has(stationId)) {
      const newStream = generateStreamForStation(stationId);
      if (newStream) {
        setStreams((prev) => new Map(prev).set(stationId, newStream));
      }
    }
  }, [streams, generateStreamForStation]);

  const getCurrentSong = useCallback(() => {
    if (!currentStation) return null;
    const stream = streams.get(currentStation);
    if (!stream) return null;
    return stream.songs[stream.currentIndex] || null;
  }, [currentStation, streams]);

  const playNext = useCallback(() => {
    if (!currentStation) return;
    setStreams((prev) => {
      const stream = prev.get(currentStation);
      if (!stream) return prev;
      const newStream = {
        ...stream,
        currentIndex: (stream.currentIndex + 1) % stream.songs.length,
      };
      return new Map(prev).set(currentStation, newStream);
    });
  }, [currentStation]);

  return {
    currentStation,
    selectStation,
    getCurrentSong,
    playNext,
    isPlaying: currentStation !== null,
  };
}
