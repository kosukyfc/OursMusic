import { useEffect, useCallback, useState } from 'react';

interface KeyboardShortcut {
  keys: string[]; // ['ctrl', 'k'] or ['space']
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  const [activeShortcuts, setActiveShortcuts] = useState<KeyboardShortcut[]>(shortcuts);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const pressedKeys: string[] = [];
      if (e.ctrlKey) pressedKeys.push('ctrl');
      if (e.shiftKey) pressedKeys.push('shift');
      if (e.altKey) pressedKeys.push('alt');
      if (e.metaKey) pressedKeys.push('meta');
      if (e.key) pressedKeys.push(e.key.toLowerCase());

      activeShortcuts.forEach(shortcut => {
        const match = shortcut.keys.every(key => pressedKeys.includes(key));
        if (match) {
          e.preventDefault();
          shortcut.action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeShortcuts]);

  const addShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setActiveShortcuts(prev => [...prev, shortcut]);
  }, []);

  const removeShortcut = useCallback((description: string) => {
    setActiveShortcuts(prev => prev.filter(s => s.description !== description));
  }, []);

  return {
    shortcuts: activeShortcuts,
    addShortcut,
    removeShortcut,
  };
};
