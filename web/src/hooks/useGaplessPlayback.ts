import { useState, useCallback } from 'react';

interface GaplessPlaybackState {
  gaplessEnabled: boolean;
  queueOverlap: number; // milliseconds
  preloadThreshold: number; // milliseconds before end to start next
}

export const useGaplessPlayback = () => {
  const [state, setState] = useState<GaplessPlaybackState>({
    gaplessEnabled: true,
    queueOverlap: 500, // 500ms overlap
    preloadThreshold: 3000, // Start loading 3s before end
  });

  const toggleGapless = useCallback(() => {
    setState(prev => ({ ...prev, gaplessEnabled: !prev.gaplessEnabled }));
  }, []);

  const setQueueOverlap = useCallback((overlap: number) => {
    setState(prev => ({ ...prev, queueOverlap: Math.max(0, Math.min(overlap, 5000)) }));
  }, []);

  const setPreloadThreshold = useCallback((threshold: number) => {
    setState(prev => ({ ...prev, preloadThreshold: Math.max(500, Math.min(threshold, 10000)) }));
  }, []);

  // Trigger next song load when current approaches end
  const shouldPrefetchNext = useCallback((currentTime: number, duration: number) => {
    if (!state.gaplessEnabled) return false;
    return (duration - currentTime) * 1000 < state.preloadThreshold;
  }, [state.gaplessEnabled, state.preloadThreshold]);

  return {
    gaplessEnabled: state.gaplessEnabled,
    toggleGapless,
    queueOverlap: state.queueOverlap,
    setQueueOverlap,
    preloadThreshold: state.preloadThreshold,
    setPreloadThreshold,
    shouldPrefetchNext,
  };
};
