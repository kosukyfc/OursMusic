import { useCallback, useState, useEffect } from 'react';

export function usePrivateMode() {
  const [isPrivateMode, setIsPrivateMode] = useState(() => {
    const saved = localStorage.getItem('privateMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('privateMode', JSON.stringify(isPrivateMode));
  }, [isPrivateMode]);

  const togglePrivateMode = useCallback(() => {
    setIsPrivateMode((p: boolean) => !p);
  }, []);

  const addToPrivateHistory = useCallback((songId: string, title: string) => {
    // Skip history recording when private mode is enabled
    if (isPrivateMode) return;
    try {
      const key = `history_${new Date().toDateString()}`;
      const raw = localStorage.getItem(key) || '[]';
      const history = JSON.parse(raw);
      if (!Array.isArray(history)) throw new Error('Invalid history format');
      if (!history.find((s: any) => s.id === songId)) {
        history.push({ id: songId, title, timestamp: Date.now() });
        localStorage.setItem(key, JSON.stringify(history));
      }
    } catch (error) {
      console.warn('Failed to add to history:', error);
    }
  }, [isPrivateMode]);

  return { isPrivateMode, togglePrivateMode, addToPrivateHistory };
}
