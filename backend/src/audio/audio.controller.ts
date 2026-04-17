import { Controller, Post, Body, Get, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AudioFeaturesService } from './audio-features.service';
import { VoiceCommandsService } from './voice-commands.service';
import { TempoControlService } from './tempo-control.service';
import { AccessibilityService } from './accessibility.service';
import { AudioVisualizerService } from './audio-visualizer.service';

@Controller('audio')
export class AudioController {
  constructor(
    private audioService: AudioFeaturesService,
    private voiceService: VoiceCommandsService,
    private tempoService: TempoControlService,
    private accessibilityService: AccessibilityService,
    private visualizerService: AudioVisualizerService,
  ) {}

  @Post('crossfade')
  @UseGuards(JwtAuthGuard)
  async setCrossfade(
    @Request() req,
    @Body() body: { enabled: boolean; duration: number },
  ) {
    return this.audioService.setCrossfade(req.user.id, body.enabled, body.duration);
  }

  @Post('karaoke')
  @UseGuards(JwtAuthGuard)
  async setKaraoke(
    @Request() req,
    @Body() body: { enabled: boolean; vocalReduction: number },
  ) {
    return this.audioService.setKaraoke(req.user.id, body.enabled, body.vocalReduction);
  }

  @Post('ducking')
  @UseGuards(JwtAuthGuard)
  async setDucking(
    @Request() req,
    @Body() body: { enabled: boolean; reduction: number },
  ) {
    return this.audioService.setDucking(req.user.id, body.enabled, body.reduction);
  }

  @Post('gapless')
  @UseGuards(JwtAuthGuard)
  async setGapless(
    @Request() req,
    @Body() body: { enabled: boolean; queueOverlap?: number; preloadThreshold?: number },
  ) {
    return this.audioService.setGapless(
      req.user.id,
      body.enabled,
      body.queueOverlap,
      body.preloadThreshold,
    );
  }

  @Post('voice/process')
  @UseGuards(JwtAuthGuard)
  async processVoiceCommand(@Body() body: { command: string }) {
    return this.voiceService.processCommand(body.command);
  }

  @Get('voice/commands')
  async getSupportedCommands() {
    return this.voiceService.getSupportedCommands();
  }

  @Get('keyboard/shortcuts')
  async getKeyboardShortcuts() {
    return {
      shortcuts: [
        { key: 'space', action: 'play_pause' },
        { key: 'n', action: 'next' },
        { key: 'p', action: 'previous' },
        { key: 'r', action: 'repeat' },
        { key: 's', action: 'shuffle' },
        { key: 'l', action: 'like' },
        { key: 'q', action: 'queue' },
        { key: 'm', action: 'menu' },
        { key: 'arrow_up', action: 'volume_up' },
        { key: 'arrow_down', action: 'volume_down' },
      ],
    };
  }

  // Tempo Control endpoints
  @Post('tempo/preset')
  @UseGuards(JwtAuthGuard)
  async setTempoPreset(
    @Request() req,
    @Body() body: { speed: number; presetName?: string },
  ) {
    return this.tempoService.setTempoPreset(req.user.id, body.speed, body.presetName);
  }

  @Get('tempo/history')
  @UseGuards(JwtAuthGuard)
  async getTempoHistory(@Request() req, @Query('limit') limit?: string) {
    return this.tempoService.getTempoHistory(req.user.id, limit ? parseInt(limit) : 10);
  }

  // Accessibility endpoints
  @Post('accessibility/font-size')
  @UseGuards(JwtAuthGuard)
  async setFontSize(@Request() req, @Body() body: { size: number }) {
    return this.accessibilityService.setFontSize(req.user.id, body.size);
  }

  @Post('accessibility/dyslexia-font')
  @UseGuards(JwtAuthGuard)
  async setDyslexiaFont(
    @Request() req,
    @Body() body: { enabled: boolean; contrast?: 'normal' | 'high' | 'inverted' },
  ) {
    return this.accessibilityService.setDyslexiaFont(req.user.id, body.enabled, body.contrast);
  }

  @Post('accessibility/line-height')
  @UseGuards(JwtAuthGuard)
  async setLineHeight(@Request() req, @Body() body: { lineHeight: number }) {
    return this.accessibilityService.setLineHeight(req.user.id, body.lineHeight);
  }

  @Post('accessibility/letter-spacing')
  @UseGuards(JwtAuthGuard)
  async setLetterSpacing(@Request() req, @Body() body: { spacing: number }) {
    return this.accessibilityService.setLetterSpacing(req.user.id, body.spacing);
  }

  // Audio Visualizer endpoints
  @Get('visualizer/config')
  @UseGuards(JwtAuthGuard)
  async getVisualizerConfig(@Query('type') type?: string) {
    return this.visualizerService.getVisualizerConfig(
      (type as 'bars' | 'waveform' | 'circular' | 'spectrum') || 'bars',
    );
  }

  @Post('visualizer/preference')
  @UseGuards(JwtAuthGuard)
  async recordVisualizerPreference(@Request() req, @Body() body: { type: string }) {
    return this.visualizerService.recordVisualizerPreference(req.user.id, body.type);
  }
}
