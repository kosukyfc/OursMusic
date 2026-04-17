import { useState, useCallback } from 'react';

export function useTempoControl() {
  const [tempo, setTempo] = useState(1);

  const setPlaybackRate = useCallback((rate: number) => {
    const clamped = Math.max(0.5, Math.min(2, rate));
    setTempo(clamped);
  }, []);

  const increase = useCallback(() => setPlaybackRate(tempo + 0.1), [tempo, setPlaybackRate]);
  const decrease = useCallback(() => setPlaybackRate(tempo - 0.1), [tempo, setPlaybackRate]);
  const reset = useCallback(() => setPlaybackRate(1), [setPlaybackRate]);

  return { tempo, setPlaybackRate, increase, decrease, reset };
}
