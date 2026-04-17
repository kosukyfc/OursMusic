import { useState, useCallback } from 'react';

type DyslexiaFont = 'default' | 'dyslexia-friendly' | 'open-dyslexic';

interface DyslexiaState {
  enabled: boolean;
  font: DyslexiaFont;
  fontSize: number; // percentage
  lineHeight: number;
  letterSpacing: number;
  backgroundContrast: 'normal' | 'high' | 'inverted';
}

export const useDyslexiaFont = () => {
  const [state, setState] = useState<DyslexiaState>(() => {
    const saved = localStorage.getItem('dyslexiaState');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      enabled: false,
      font: 'default',
      fontSize: 110,
      lineHeight: 1.8,
      letterSpacing: 0.5,
      backgroundContrast: 'normal',
    };
  });

  const saveState = useCallback((newState: DyslexiaState) => {
    setState(newState);
    localStorage.setItem('dyslexiaState', JSON.stringify(newState));

    if (newState.enabled) {
      document.documentElement.style.fontFamily = newState.font === 'open-dyslexic' 
        ? '"OpenDyslexic", "OpenDyslexicAlta", "OpenDyslexicMono", sans-serif'
        : 'system-ui, -apple-system, sans-serif';
      document.documentElement.style.fontSize = `${newState.fontSize}%`;
      document.documentElement.style.lineHeight = `${newState.lineHeight}`;
      document.documentElement.style.letterSpacing = `${newState.letterSpacing}px`;

      if (newState.backgroundContrast === 'high') {
        document.documentElement.style.filter = 'contrast(1.2)';
      } else if (newState.backgroundContrast === 'inverted') {
        document.documentElement.style.filter = 'invert(1)';
      } else {
        document.documentElement.style.filter = 'none';
      }
    } else {
      document.documentElement.style.fontFamily = '';
      document.documentElement.style.fontSize = '';
      document.documentElement.style.lineHeight = '';
      document.documentElement.style.letterSpacing = '';
      document.documentElement.style.filter = 'none';
    }
  }, []);

  const toggleDyslexia = useCallback(() => {
    const newState = { ...state, enabled: !state.enabled };
    saveState(newState);
  }, [state, saveState]);

  const setFont = useCallback((font: DyslexiaFont) => {
    const newState = { ...state, font };
    saveState(newState);
  }, [state, saveState]);

  const setFontSize = useCallback((size: number) => {
    const newState = { ...state, fontSize: Math.max(80, Math.min(size, 150)) };
    saveState(newState);
  }, [state, saveState]);

  const setLineHeight = useCallback((height: number) => {
    const newState = { ...state, lineHeight: Math.max(1.4, Math.min(height, 2.5)) };
    saveState(newState);
  }, [state, saveState]);

  const setLetterSpacing = useCallback((spacing: number) => {
    const newState = { ...state, letterSpacing: Math.max(0, Math.min(spacing, 2)) };
    saveState(newState);
  }, [state, saveState]);

  const setContrast = useCallback((contrast: 'normal' | 'high' | 'inverted') => {
    const newState = { ...state, backgroundContrast: contrast };
    saveState(newState);
  }, [state, saveState]);

  return {
    enabled: state.enabled,
    font: state.font,
    fontSize: state.fontSize,
    lineHeight: state.lineHeight,
    letterSpacing: state.letterSpacing,
    backgroundContrast: state.backgroundContrast,
    toggleDyslexia,
    setFont,
    setFontSize,
    setLineHeight,
    setLetterSpacing,
    setContrast,
  };
};
