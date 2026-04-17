import { useState, useCallback } from 'react';

export function useSmartQueue(mood: string) {
  const [smartQueueEnabled, setSmartQueueEnabled] = useState(false);
  const [nextSuggestions, setNextSuggestions] = useState<string[]>([]);

  const toggleSmartQueue = useCallback(() => setSmartQueueEnabled(p => !p), []);

  const generateSmartNext = useCallback(() => {
    const moodMap: Record<string, string[]> = {
      happy: ['energetic', 'pop', 'uplifting'],
      sad: ['ballad', 'acoustic', 'emotional'],
      energetic: ['rock', 'dance', 'hiphop'],
      chill: ['jazzy', 'ambient', 'indie'],
    };
    setNextSuggestions(moodMap[mood] || ['popular', 'trending']);
  }, [mood]);

  return { smartQueueEnabled, toggleSmartQueue, nextSuggestions, generateSmartNext };
}
