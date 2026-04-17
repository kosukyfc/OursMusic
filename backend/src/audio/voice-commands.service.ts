import { Injectable } from '@nestjs/common';

@Injectable()
export class VoiceCommandsService {
  private supportedCommands = [
    'play',
    'pause',
    'next',
    'previous',
    'repeat',
    'shuffle',
    'volume_up',
    'volume_down',
    'like',
    'skip',
  ];

  processCommand(command: string): { success: boolean; action: string } {
    const normalized = command.toLowerCase().trim();
    const found = this.supportedCommands.find(c => normalized.includes(c));

    if (found) {
      return { success: true, action: found };
    }

    return { success: false, action: 'unknown' };
  }

  getSupportedCommands() {
    return this.supportedCommands;
  }
}
