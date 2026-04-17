import { useState, useCallback } from 'react';

type FontSizePreset = 'small' | 'normal' | 'large' | 'xlarge';

interface FontSizeState {
  preset: FontSizePreset;
  customSize: number; // percentage, 100 = normal
  lineHeight: number; // multiplier
  letterSpacing: number; // pixels
}

const PRESETS: Record<FontSizePreset, number> = {
  small: 85,
  normal: 100,
  large: 125,
  xlarge: 150,
};

export const useFontSizeAdjuster = () => {
  const [state, setState] = useState<FontSizeState>(() => {
    const saved = localStorage.getItem('fontSizeState');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      preset: 'normal',
      customSize: 100,
      lineHeight: 1.5,
      letterSpacing: 0,
    };
  });

  const saveState = useCallback((newState: FontSizeState) => {
    setState(newState);
    localStorage.setItem('fontSizeState', JSON.stringify(newState));
    document.documentElement.style.setProperty('--font-size-multiplier', `${newState.customSize}%`);
    document.documentElement.style.setProperty('--line-height', `${newState.lineHeight}`);
    document.documentElement.style.setProperty('--letter-spacing', `${newState.letterSpacing}px`);
  }, []);

  const applyPreset = useCallback((preset: FontSizePreset) => {
    const newState = { ...state, preset, customSize: PRESETS[preset] };
    saveState(newState);
  }, [state, saveState]);

  const setCustomSize = useCallback((size: number) => {
    const clamped = Math.max(70, Math.min(size, 200));
    const newState = { ...state, customSize: clamped, preset: 'normal' as FontSizePreset };
    saveState(newState);
  }, [state, saveState]);

  const setLineHeight = useCallback((height: number) => {
    const clamped = Math.max(1, Math.min(height, 2.5));
    const newState = { ...state, lineHeight: clamped };
    saveState(newState);
  }, [state, saveState]);

  const setLetterSpacing = useCallback((spacing: number) => {
    const clamped = Math.max(0, Math.min(spacing, 5));
    const newState = { ...state, letterSpacing: clamped };
    saveState(newState);
  }, [state, saveState]);

  const getCSSVariables = () => ({
    '--font-size-multiplier': `${state.customSize}%`,
    '--line-height': `${state.lineHeight}`,
    '--letter-spacing': `${state.letterSpacing}px`,
  } as React.CSSProperties);

  return {
    preset: state.preset,
    customSize: state.customSize,
    lineHeight: state.lineHeight,
    letterSpacing: state.letterSpacing,
    applyPreset,
    setCustomSize,
    setLineHeight,
    setLetterSpacing,
    getCSSVariables,
  };
};
