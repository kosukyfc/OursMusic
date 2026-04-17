import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { Controller, Post, Body, Get, UseGuards, Request, Query, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AudioFeaturesService } from './audio-features.service';
import { VoiceCommandsService } from './voice-commands.service';
import { TempoControlService } from './tempo-control.service';
import { AccessibilityService } from './accessibility.service';
import { AudioVisualizerService } from './audio-visualizer.service';

@ApiTags('Audio & Accessibility Features (Phase 6)')
@ApiBearerAuth()
@Controller('audio')
export class AudioControllerSwagger {
  constructor(
    private audioService: AudioFeaturesService,
    private voiceService: VoiceCommandsService,
    private tempoService: TempoControlService,
    private accessibilityService: AccessibilityService,
    private visualizerService: AudioVisualizerService,
  ) {}

  // ==================== CROSSFADE ENDPOINTS ====================

  @Post('crossfade')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Set crossfade settings',
    description: 'Configure crossfade transition between songs (100-10000ms)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
        duration: { type: 'number', example: 5000, description: 'Duration in milliseconds' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Crossfade configured successfully',
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        duration: { type: 'number' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async setCrossfade(
    @Request() req,
    @Body() body: { enabled: boolean; duration: number },
  ) {
    return this.audioService.setCrossfade(req.user.id, body.enabled, body.duration);
  }

  // ==================== KARAOKE ENDPOINTS ====================

  @Post('karaoke')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Set karaoke mode',
    description: 'Enable karaoke mode with vocal reduction (0-1 intensity)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
        vocalReduction: { type: 'number', example: 0.8, description: 'Vocal reduction intensity 0-1' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Karaoke mode configured' })
  async setKaraoke(
    @Request() req,
    @Body() body: { enabled: boolean; vocalReduction: number },
  ) {
    return this.audioService.setKaraoke(req.user.id, body.enabled, body.vocalReduction);
  }

  // ==================== AUDIO DUCKING ENDPOINTS ====================

  @Post('ducking')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Set audio ducking',
    description: 'Enable auto volume reduction when notifications arrive',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
        reduction: { type: 'number', example: 0.3, description: 'Reduction amount 0-1' },
      },
    },
  })
  async setDucking(
    @Request() req,
    @Body() body: { enabled: boolean; reduction: number },
  ) {
    return this.audioService.setDucking(req.user.id, body.enabled, body.reduction);
  }

  // ==================== GAPLESS PLAYBACK ENDPOINTS ====================

  @Post('gapless')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Configure gapless playback',
    description: 'Set queue overlap and preload threshold',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        queueOverlap: { type: 'number', example: 500, description: 'Overlap in milliseconds' },
        preloadThreshold: { type: 'number', example: 3000, description: 'Preload threshold in ms' },
      },
    },
  })
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

  // ==================== VOICE COMMANDS ENDPOINTS ====================

  @Post('voice/process')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Process voice command',
    description: 'Process recognized voice command (e.g., "play", "next", "pause")',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        command: { type: 'string', example: 'play' },
      },
    },
  })
  async processVoiceCommand(@Body() body: { command: string }) {
    return this.voiceService.processCommand(body.command);
  }

  @Get('voice/commands')
  @ApiOperation({
    summary: 'Get supported voice commands',
    description: 'List all supported voice commands for the current language (pt-BR)',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'array',
      items: { type: 'string' },
      example: ['play', 'pause', 'next', 'previous', 'repeat', 'shuffle', 'volume_up', 'volume_down', 'like', 'skip'],
    },
  })
  async getSupportedCommands() {
    return this.voiceService.getSupportedCommands();
  }

  @Get('keyboard/shortcuts')
  @ApiOperation({
    summary: 'Get keyboard shortcuts mapping',
    description: 'Retrieve list of available keyboard shortcuts',
  })
  @ApiResponse({ status: 200, description: 'Keyboard shortcuts configuration' })
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

  // ==================== TEMPO CONTROL ENDPOINTS ====================

  @Post('tempo/preset')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Set playback speed preset',
    description: 'Set tempo/speed for playback (0.5x - 2x range)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        speed: { type: 'number', example: 1.5 },
        presetName: { type: 'string', example: 'faster' },
      },
    },
  })
  async setTempoPreset(
    @Request() req,
    @Body() body: { speed: number; presetName?: string },
  ) {
    return this.tempoService.setTempoPreset(req.user.id, body.speed, body.presetName);
  }

  @Get('tempo/history')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get tempo history',
    description: 'Retrieve recent playback speed changes',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getTempoHistory(@Request() req, @Query('limit') limit?: string) {
    return this.tempoService.getTempoHistory(req.user.id, limit ? parseInt(limit) : 10);
  }

  // ==================== ACCESSIBILITY ENDPOINTS ====================

  @Post('accessibility/font-size')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Set font size',
    description: 'Adjust UI font size for accessibility (70-200)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        size: { type: 'number', example: 100 },
      },
    },
  })
  async setFontSize(@Request() req, @Body() body: { size: number }) {
    return this.accessibilityService.setFontSize(req.user.id, body.size);
  }

  @Post('accessibility/dyslexia-font')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Configure dyslexia font',
    description: 'Enable OpenDyslexic font with contrast options (normal/high/inverted)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        contrast: { type: 'string', enum: ['normal', 'high', 'inverted'] },
      },
    },
  })
  async setDyslexiaFont(
    @Request() req,
    @Body() body: { enabled: boolean; contrast?: 'normal' | 'high' | 'inverted' },
  ) {
    return this.accessibilityService.setDyslexiaFont(req.user.id, body.enabled, body.contrast);
  }

  @Post('accessibility/line-height')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Set line height',
    description: 'Adjust text line height for better readability (1.0 - 2.0)',
  })
  async setLineHeight(@Request() req, @Body() body: { lineHeight: number }) {
    return this.accessibilityService.setLineHeight(req.user.id, body.lineHeight);
  }

  @Post('accessibility/letter-spacing')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Set letter spacing',
    description: 'Adjust text letter spacing for readability (0 - 0.2)',
  })
  async setLetterSpacing(@Request() req, @Body() body: { spacing: number }) {
    return this.accessibilityService.setLetterSpacing(req.user.id, body.spacing);
  }

  // ==================== AUDIO VISUALIZER ENDPOINTS ====================

  @Get('visualizer/config')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get visualizer configuration',
    description: 'Fetch configuration for audio visualizer (bars/waveform/circular/spectrum)',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['bars', 'waveform', 'circular', 'spectrum'],
  })
  async getVisualizerConfig(@Query('type') type?: string) {
    return this.visualizerService.getVisualizerConfig(
      (type as 'bars' | 'waveform' | 'circular' | 'spectrum') || 'bars',
    );
  }

  @Post('visualizer/preference')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Save visualizer preference',
    description: 'Record user preference for audio visualizer type',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['bars', 'waveform', 'circular', 'spectrum'] },
      },
    },
  })
  async recordVisualizerPreference(@Request() req, @Body() body: { type: string }) {
    return this.visualizerService.recordVisualizerPreference(req.user.id, body.type);
  }
}
