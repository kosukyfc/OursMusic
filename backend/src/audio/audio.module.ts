import { Module } from '@nestjs/common';
import { AudioFeaturesService } from './audio-features.service';
import { VoiceCommandsService } from './voice-commands.service';
import { TempoControlService } from './tempo-control.service';
import { AccessibilityService } from './accessibility.service';
import { AudioVisualizerService } from './audio-visualizer.service';
import { AudioController } from './audio.controller';

@Module({
  providers: [
    AudioFeaturesService,
    VoiceCommandsService,
    TempoControlService,
    AccessibilityService,
    AudioVisualizerService,
  ],
  controllers: [AudioController],
  exports: [
    AudioFeaturesService,
    VoiceCommandsService,
    TempoControlService,
    AccessibilityService,
    AudioVisualizerService,
  ],
})
export class AudioModule {}
