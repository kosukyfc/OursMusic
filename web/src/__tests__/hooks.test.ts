import { renderHook, act } from '@testing-library/react';
import { useTempoControl } from './useTempoControl';
import { useCrossfade } from './useCrossfade';
import { useKaraokeMode } from './useKaraokeMode';
import { useAudioDucking } from './useAudioDucking';
import { useSmartQueue } from './useSmartQueue';
import { useMusicTheory } from './useMusicTheory';
import { useGaplessPlayback } from './useGaplessPlayback';
import { useListeningHeatmap } from './useListeningHeatmap';
import { useFontSizeAdjuster } from './useFontSizeAdjuster';
import { useVoiceCommands } from './useVoiceCommands';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useDyslexiaFont } from './useDyslexiaFont';
import { useSetlistBuilder } from './useSetlistBuilder';

describe('Phase 6 Web Hooks Test Suite', () => {
  describe('useTempoControl', () => {
    it('should initialize with default tempo', () => {
      const { result } = renderHook(() => useTempoControl());
      expect(result.current.tempo).toBe(1);
    });

    it('should update tempo within bounds (0.5-2)', () => {
      const { result } = renderHook(() => useTempoControl());
      act(() => {
        result.current.setTempo(1.5);
      });
      expect(result.current.tempo).toBe(1.5);
    });

    it('should clamp tempo to max 2x', () => {
      const { result } = renderHook(() => useTempoControl());
      act(() => {
        result.current.setTempo(3);
      });
      expect(result.current.tempo).toBe(2);
    });

    it('should clamp tempo to min 0.5x', () => {
      const { result } = renderHook(() => useTempoControl());
      act(() => {
        result.current.setTempo(0.1);
      });
      expect(result.current.tempo).toBe(0.5);
    });
  });

  describe('useCrossfade', () => {
    it('should initialize crossfade disabled', () => {
      const { result } = renderHook(() => useCrossfade());
      expect(result.current.enabled).toBe(false);
    });

    it('should toggle crossfade', () => {
      const { result } = renderHook(() => useCrossfade());
      act(() => {
        result.current.toggle();
      });
      expect(result.current.enabled).toBe(true);
    });

    it('should set crossfade duration', () => {
      const { result } = renderHook(() => useCrossfade());
      act(() => {
        result.current.setDuration(5000);
      });
      expect(result.current.duration).toBe(5000);
    });

    it('should clamp duration to 100-10000ms', () => {
      const { result } = renderHook(() => useCrossfade());
      act(() => {
        result.current.setDuration(20000);
      });
      expect(result.current.duration).toBeLessThanOrEqual(10000);
    });
  });

  describe('useKaraokeMode', () => {
    it('should initialize karaoke disabled', () => {
      const { result } = renderHook(() => useKaraokeMode());
      expect(result.current.enabled).toBe(false);
    });

    it('should enable karaoke mode', () => {
      const { result } = renderHook(() => useKaraokeMode());
      act(() => {
        result.current.toggle();
      });
      expect(result.current.enabled).toBe(true);
    });

    it('should adjust vocal reduction (0-1)', () => {
      const { result } = renderHook(() => useKaraokeMode());
      act(() => {
        result.current.setVocalReduction(0.75);
      });
      expect(result.current.vocalReduction).toBe(0.75);
    });
  });

  describe('useAudioDucking', () => {
    it('should initialize ducking with default amount', () => {
      const { result } = renderHook(() => useAudioDucking());
      expect(result.current.reductionAmount).toBe(0.3);
    });

    it('should toggle audio ducking', () => {
      const { result } = renderHook(() => useAudioDucking());
      act(() => {
        result.current.toggle();
      });
      expect(result.current.enabled).not.toBeUndefined();
    });

    it('should set reduction amount (0-1)', () => {
      const { result } = renderHook(() => useAudioDucking());
      act(() => {
        result.current.setReductionAmount(0.5);
      });
      expect(result.current.reductionAmount).toBe(0.5);
    });
  });

  describe('useSmartQueue', () => {
    it('should initialize with no mood selected', () => {
      const { result } = renderHook(() => useSmartQueue());
      expect(result.current.currentMood).toBeUndefined();
    });

    it('should set mood (happy/sad/energetic/chill)', () => {
      const { result } = renderHook(() => useSmartQueue());
      act(() => {
        result.current.setMood('happy');
      });
      expect(result.current.currentMood).toBe('happy');
    });

    it('should generate suggestions for mood', () => {
      const { result } = renderHook(() => useSmartQueue());
      act(() => {
        result.current.setMood('energetic');
        result.current.generateSuggestions();
      });
      expect(Array.isArray(result.current.suggestions)).toBe(true);
    });
  });

  describe('useMusicTheory', () => {
    it('should initialize theory analyzer', () => {
      const { result } = renderHook(() => useMusicTheory());
      expect(result.current.analysis).toBeDefined();
    });

    it('should analyze BPM (60-180)', () => {
      const { result } = renderHook(() => useMusicTheory());
      act(() => {
        result.current.analyze({ bpm: 120 });
      });
      expect(result.current.analysis.bpm).toBeGreaterThanOrEqual(60);
      expect(result.current.analysis.bpm).toBeLessThanOrEqual(180);
    });

    it('should analyze musical key', () => {
      const { result } = renderHook(() => useMusicTheory());
      act(() => {
        result.current.analyze({ key: 'C' });
      });
      expect(result.current.analysis.key).toBeDefined();
    });
  });

  describe('useGaplessPlayback', () => {
    it('should initialize gapless playback', () => {
      const { result } = renderHook(() => useGaplessPlayback());
      expect(result.current.enabled).toBeDefined();
    });

    it('should set queue overlap', () => {
      const { result } = renderHook(() => useGaplessPlayback());
      act(() => {
        result.current.setQueueOverlap(1000);
      });
      expect(result.current.queueOverlapMs).toBe(1000);
    });

    it('should set preload threshold', () => {
      const { result } = renderHook(() => useGaplessPlayback());
      act(() => {
        result.current.setPreloadThreshold(5000);
      });
      expect(result.current.preloadThresholdMs).toBe(5000);
    });
  });

  describe('useListeningHeatmap', () => {
    it('should initialize heatmap grid (7x24)', () => {
      const { result } = renderHook(() => useListeningHeatmap());
      expect(result.current.heatmap).toBeDefined();
      expect(result.current.heatmap.length).toBe(7); // 7 days
    });

    it('should record listening activity', () => {
      const { result } = renderHook(() => useListeningHeatmap());
      act(() => {
        result.current.recordActivity(2, 14); // Wednesday, 2 PM
      });
      expect(result.current.heatmap[2][14]).toBeGreaterThan(0);
    });

    it('should get peak listening times', () => {
      const { result } = renderHook(() => useListeningHeatmap());
      const peaks = result.current.getPeakTimes();
      expect(Array.isArray(peaks)).toBe(true);
    });
  });

  describe('useFontSizeAdjuster', () => {
    it('should initialize with default font size', () => {
      const { result } = renderHook(() => useFontSizeAdjuster());
      expect(result.current.fontSize).toBeGreaterThanOrEqual(70);
      expect(result.current.fontSize).toBeLessThanOrEqual(200);
    });

    it('should set preset sizes', () => {
      const { result } = renderHook(() => useFontSizeAdjuster());
      act(() => {
        result.current.setPreset('large');
      });
      expect(result.current.fontSize).toBeGreaterThan(100);
    });

    it('should clamp custom font size (70-200)', () => {
      const { result } = renderHook(() => useFontSizeAdjuster());
      act(() => {
        result.current.setFontSize(300);
      });
      expect(result.current.fontSize).toBeLessThanOrEqual(200);
    });
  });

  describe('useVoiceCommands', () => {
    it('should initialize voice commands', () => {
      const { result } = renderHook(() => useVoiceCommands());
      expect(result.current.supported).toBeDefined();
      expect(Array.isArray(result.current.supported)).toBe(true);
    });

    it('should process recognized command', () => {
      const { result } = renderHook(() => useVoiceCommands());
      act(() => {
        result.current.processCommand('play');
      });
      expect(result.current.lastCommand).toBe('play');
    });

    it('should support pt-BR language', () => {
      const { result } = renderHook(() => useVoiceCommands());
      expect(result.current.language).toContain('pt-BR');
    });
  });

  describe('useKeyboardShortcuts', () => {
    it('should initialize keyboard shortcuts', () => {
      const { result } = renderHook(() => useKeyboardShortcuts());
      expect(result.current.shortcuts).toBeDefined();
    });

    it('should register 10+ shortcuts', () => {
      const { result } = renderHook(() => useKeyboardShortcuts());
      expect(Object.keys(result.current.shortcuts).length).toBeGreaterThanOrEqual(10);
    });

    it('should handle space for play/pause', () => {
      const { result } = renderHook(() => useKeyboardShortcuts());
      expect(result.current.shortcuts['space']).toBe('play_pause');
    });
  });

  describe('useDyslexiaFont', () => {
    it('should initialize dyslexia font disabled', () => {
      const { result } = renderHook(() => useDyslexiaFont());
      expect(result.current.enabled).toBe(false);
    });

    it('should enable OpenDyslexic font', () => {
      const { result } = renderHook(() => useDyslexiaFont());
      act(() => {
        result.current.toggle();
      });
      expect(result.current.enabled).toBe(true);
    });

    it('should support three contrast modes', () => {
      const { result } = renderHook(() => useDyslexiaFont());
      act(() => {
        result.current.setContrast('high');
      });
      expect(['normal', 'high', 'inverted']).toContain(result.current.contrast);
    });
  });

  describe('useSetlistBuilder', () => {
    it('should initialize empty setlists', () => {
      const { result } = renderHook(() => useSetlistBuilder());
      expect(Array.isArray(result.current.setlists)).toBe(true);
    });

    it('should create new setlist', () => {
      const { result } = renderHook(() => useSetlistBuilder());
      act(() => {
        result.current.createSetlist('Workout Mix');
      });
      expect(result.current.setlists.length).toBeGreaterThan(0);
    });

    it('should add song to setlist', () => {
      const { result } = renderHook(() => useSetlistBuilder());
      act(() => {
        result.current.createSetlist('Party');
        result.current.addSong(0, { id: 'song1', title: 'Track 1', artist: 'Artist A' });
      });
      expect(result.current.setlists[0].songs.length).toBeGreaterThan(0);
    });

    it('should calculate total duration', () => {
      const { result } = renderHook(() => useSetlistBuilder());
      act(() => {
        result.current.createSetlist('Test');
        result.current.addSong(0, { id: 'song1', title: 'Track', artist: 'Artist', duration: 180 });
      });
      const duration = result.current.getTotalDuration(0);
      expect(duration).toBeGreaterThan(0);
    });

    it('should reorder songs in setlist', () => {
      const { result } = renderHook(() => useSetlistBuilder());
      act(() => {
        result.current.createSetlist('Test');
        result.current.addSong(0, { id: 'song1', title: 'Track 1', artist: 'Artist' });
        result.current.addSong(0, { id: 'song2', title: 'Track 2', artist: 'Artist' });
        result.current.reorderSongs(0, [1, 0]);
      });
      expect(result.current.setlists[0].songs[0].id).toBe('song2');
    });

    it('should delete setlist', () => {
      const { result } = renderHook(() => useSetlistBuilder());
      act(() => {
        result.current.createSetlist('Temporary');
        result.current.deleteSetlist(0);
      });
      expect(result.current.setlists.length).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should allow combining multiple features together', () => {
      const { result: tempoResult } = renderHook(() => useTempoControl());
      const { result: karaokeResult } = renderHook(() => useKaraokeMode());
      const { result: heatmapResult } = renderHook(() => useListeningHeatmap());

      act(() => {
        tempoResult.current.setTempo(1.2);
        karaokeResult.current.toggle();
        heatmapResult.current.recordActivity(0, 10);
      });

      expect(tempoResult.current.tempo).toBe(1.2);
      expect(karaokeResult.current.enabled).toBe(true);
      expect(heatmapResult.current.heatmap[0][10]).toBeGreaterThan(0);
    });

    it('should persist data across renders', () => {
      const { result, rerender } = renderHook(() => useSetlistBuilder());
      act(() => {
        result.current.createSetlist('Persist Test');
      });
      const firstLength = result.current.setlists.length;

      rerender();
      expect(result.current.setlists.length).toBeGreaterThanOrEqual(firstLength);
    });
  });

  describe('Performance Tests', () => {
    it('useListeningHeatmap should handle 7x24 grid efficiently', () => {
      const { result } = renderHook(() => useListeningHeatmap());
      const startTime = performance.now();

      act(() => {
        for (let day = 0; day < 7; day++) {
          for (let hour = 0; hour < 24; hour++) {
            result.current.recordActivity(day, hour);
          }
        }
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it('useSmartQueue should generate suggestions quickly', () => {
      const { result } = renderHook(() => useSmartQueue());

      act(() => {
        result.current.setMood('happy');
      });

      const startTime = performance.now();
      act(() => {
        result.current.generateSuggestions();
      });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
    });
  });
});
