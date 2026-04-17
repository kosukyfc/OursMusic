import { Test, TestingModule } from '@nestjs/testing';
import { AudioController } from './audio.controller';
import { AudioFeaturesService } from './audio-features.service';
import { VoiceCommandsService } from './voice-commands.service';
import { TempoControlService } from './tempo-control.service';
import { AccessibilityService } from './accessibility.service';
import { AudioVisualizerService } from './audio-visualizer.service';

describe('AudioController (e2e)', () => {
  let controller: AudioController;
  let audioService: AudioFeaturesService;
  let voiceService: VoiceCommandsService;
  let tempoService: TempoControlService;
  let accessibilityService: AccessibilityService;
  let visualizerService: AudioVisualizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AudioController],
      providers: [
        AudioFeaturesService,
        VoiceCommandsService,
        TempoControlService,
        AccessibilityService,
        AudioVisualizerService,
      ],
    }).compile();

    controller = module.get<AudioController>(AudioController);
    audioService = module.get<AudioFeaturesService>(AudioFeaturesService);
    voiceService = module.get<VoiceCommandsService>(VoiceCommandsService);
    tempoService = module.get<TempoControlService>(TempoControlService);
    accessibilityService = module.get<AccessibilityService>(AccessibilityService);
    visualizerService = module.get<AudioVisualizerService>(AudioVisualizerService);
  });

  describe('Crossfade Endpoints', () => {
    it('should set crossfade', async () => {
      const result = await audioService.setCrossfade('user123', true, 5000);
      expect(result.enabled).toBe(true);
      expect(result.duration).toBe(5000);
    });
  });

  describe('Karaoke Endpoints', () => {
    it('should set karaoke mode', async () => {
      const result = await audioService.setKaraoke('user123', true, 0.8);
      expect(result.enabled).toBe(true);
      expect(result.vocalReduction).toBe(0.8);
    });
  });

  describe('Audio Ducking Endpoints', () => {
    it('should set audio ducking', async () => {
      const result = await audioService.setDucking('user123', true, 0.5);
      expect(result.enabled).toBe(true);
      expect(result.reductionAmount).toBe(0.5);
    });
  });

  describe('Gapless Playback Endpoints', () => {
    it('should set gapless playback', async () => {
      const result = await audioService.setGapless('user123', true, 1000, 5000);
      expect(result.enabled).toBe(true);
      expect(result.queueOverlapMs).toBe(1000);
      expect(result.preloadThresholdMs).toBe(5000);
    });
  });

  describe('Voice Commands Endpoints', () => {
    it('should process voice command', async () => {
      const result = voiceService.processCommand('play');
      expect(result.success).toBe(true);
      expect(result.action).toBe('play');
    });

    it('should handle unknown command', async () => {
      const result = voiceService.processCommand('unknown');
      expect(result.success).toBe(false);
    });

    it('should return supported commands', async () => {
      const commands = voiceService.getSupportedCommands();
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBeGreaterThan(5);
    });
  });

  describe('Tempo Control Endpoints', () => {
    it('should set tempo preset', async () => {
      const result = await tempoService.setTempoPreset('user123', 1.5, 'faster');
      expect(result.speed).toBe(1.5);
      expect(result.presetName).toBe('faster');
    });

    it('should clamp speed between 0.5-2', async () => {
      const result = await tempoService.setTempoPreset('user123', 3, 'invalid');
      expect(result.speed).toBeLessThanOrEqual(2);
      expect(result.speed).toBeGreaterThanOrEqual(0.5);
    });

    it('should get tempo history', async () => {
      const result = await tempoService.getTempoHistory('user123', 5);
      expect(Array.isArray(result.recentSpeeds)).toBe(true);
    });
  });

  describe('Accessibility Endpoints', () => {
    it('should set font size', async () => {
      const result = await accessibilityService.setFontSize('user123', 120);
      expect(result.fontSize).toBe(120);
    });

    it('should clamp font size (70-200)', async () => {
      const result = await accessibilityService.setFontSize('user123', 300);
      expect(result.fontSize).toBeLessThanOrEqual(200);
    });

    it('should enable dyslexia font', async () => {
      const result = await accessibilityService.setDyslexiaFont('user123', true, 'high');
      expect(result.dyslexiaFontEnabled).toBe(true);
      expect(result.contrastMode).toBe('high');
    });

    it('should set line height', async () => {
      const result = await accessibilityService.setLineHeight('user123', 1.5);
      expect(result.lineHeight).toBe(1.5);
    });

    it('should set letter spacing', async () => {
      const result = await accessibilityService.setLetterSpacing('user123', 0.1);
      expect(result.letterSpacing).toBe(0.1);
    });
  });

  describe('Audio Visualizer Endpoints', () => {
    it('should get bars visualizer config', async () => {
      const config = visualizerService.getVisualizerConfig('bars');
      expect(config.type).toBe('bars');
      expect(config.barCount).toBe(32);
    });

    it('should get waveform visualizer config', async () => {
      const config = visualizerService.getVisualizerConfig('waveform');
      expect(config.type).toBe('waveform');
      expect(config.pointCount).toBe(100);
    });

    it('should get circular visualizer config', async () => {
      const config = visualizerService.getVisualizerConfig('circular');
      expect(config.type).toBe('circular');
      expect(config.particleCount).toBe(360);
    });

    it('should get spectrum visualizer config', async () => {
      const config = visualizerService.getVisualizerConfig('spectrum');
      expect(config.type).toBe('spectrum');
      expect(config.bandCount).toBe(128);
    });

    it('should record visualizer preference', async () => {
      const result = await visualizerService.recordVisualizerPreference('user123', 'waveform');
      expect(result.selectedVisualizer).toBe('waveform');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid speeds gracefully', async () => {
      const result = await tempoService.setTempoPreset('user123', -5, 'invalid');
      expect(result.speed).toBeGreaterThanOrEqual(0.5);
    });

    it('should validate contrast modes', async () => {
      const result = await accessibilityService.setDyslexiaFont('user123', true, 'high');
      expect(['normal', 'high', 'inverted']).toContain(result.contrastMode);
    });
  });

  describe('Integration Tests', () => {
    it('should combine multiple audio features', async () => {
      const crossfadeResult = await audioService.setCrossfade('user123', true, 5000);
      const karaokeResult = await audioService.setKaraoke('user123', true, 0.75);
      const tempoResult = await tempoService.setTempoPreset('user123', 1.2, 'custom');

      expect(crossfadeResult.enabled).toBe(true);
      expect(karaokeResult.enabled).toBe(true);
      expect(tempoResult.speed).toBe(1.2);
    });

    it('should handle accessibility + visualizer together', async () => {
      const fontResult = await accessibilityService.setFontSize('user123', 150);
      const dyslexiaResult = await accessibilityService.setDyslexiaFont('user123', true, 'high');
      const visualizerResult = visualizerService.getVisualizerConfig('bars');

      expect(fontResult.fontSize).toBe(150);
      expect(dyslexiaResult.dyslexiaFontEnabled).toBe(true);
      expect(visualizerResult.type).toBe('bars');
    });
  });
});
