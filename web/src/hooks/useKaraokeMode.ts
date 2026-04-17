import { useState, useCallback } from 'react';

export function useKaraokeMode() {
  const [karaokeEnabled, setKaraokeEnabled] = useState(false);
  const [vocalReduction, setVocalReduction] = useState(0.5); // 0-1, how much to reduce

  const toggleKaraoke = useCallback(() => setKaraokeEnabled(p => !p), []);
  const setReduction = useCallback((val: number) => setVocalReduction(Math.max(0, Math.min(1, val))), []);

  return { karaokeEnabled, toggleKaraoke, vocalReduction, setReduction };
}
