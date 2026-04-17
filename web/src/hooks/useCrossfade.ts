import { useState, useCallback } from 'react';

export function useCrossfade() {
  const [crossfadeEnabled, setCrossfadeEnabled] = useState(false);
  const [crossfadeDuration, setCrossfadeDuration] = useState(5000); // ms

  const toggleCrossfade = useCallback(() => setCrossfadeEnabled(p => !p), []);
  const setDuration = useCallback((ms: number) => setCrossfadeDuration(Math.max(100, Math.min(10000, ms))), []);

  return { crossfadeEnabled, toggleCrossfade, crossfadeDuration, setDuration };
}
