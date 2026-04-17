import { useState, useCallback } from 'react';

export function useAudioDucking() {
  const [duckingEnabled, setDuckingEnabled] = useState(true);
  const [duckAmount, setDuckAmount] = useState(0.3); // 0-1

  const toggleDucking = useCallback(() => setDuckingEnabled(p => !p), []);
  const setAmount = useCallback((val: number) => setDuckAmount(Math.max(0, Math.min(1, val))), []);

  return { duckingEnabled, toggleDucking, duckAmount, setAmount };
}
