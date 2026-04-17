import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccessibilityService {
  constructor(private prisma: PrismaService) {}

  async setFontSize(userId: string, size: number) {
    const normalizedSize = Math.max(70, Math.min(200, size));
    
    return {
      userId,
      fontSize: normalizedSize,
      presets: {
        small: 70,
        medium: 100,
        large: 130,
        xlarge: 170,
      },
      timestamp: new Date(),
    };
  }

  async setDyslexiaFont(userId: string, enabled: boolean, contrast: 'normal' | 'high' | 'inverted' = 'normal') {
    return {
      userId,
      dyslexiaFontEnabled: enabled,
      contrastMode: contrast,
      availableContrasts: ['normal', 'high', 'inverted'],
      timestampestamp: new Date(),
    };
  }

  async setLineHeight(userId: string, lineHeight: number) {
    const normalized = Math.max(1, Math.min(2, lineHeight));
    
    return {
      userId,
      lineHeight: normalized,
      presets: {
        compact: 1,
        normal: 1.5,
        relaxed: 2,
      },
      timestamp: new Date(),
    };
  }

  async setLetterSpacing(userId: string, spacing: number) {
    const normalized = Math.max(0, Math.min(0.2, spacing));
    
    return {
      userId,
      letterSpacing: normalized,
      timestamp: new Date(),
    };
  }
}
