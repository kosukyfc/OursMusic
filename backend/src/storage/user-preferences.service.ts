import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UserPreferencesDto {
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  dyslexiaFont?: boolean;
  dyslexiaContrast?: number;
}

@Injectable()
export class UserPreferencesService {
  constructor(private prisma: PrismaService) {}

  async getPreferences(userId: string) {
    let prefs = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await this.prisma.userPreferences.create({
        data: { userId },
      });
    }

    return prefs;
  }

  async updatePreferences(userId: string, data: UserPreferencesDto) {
    return this.prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  async setFontSize(userId: string, fontSize: number) {
    return this.updatePreferences(userId, {
      fontSize: Math.max(12, Math.min(28, fontSize)),
    });
  }

  async setDyslexiaFont(userId: string, enabled: boolean) {
    return this.updatePreferences(userId, { dyslexiaFont: enabled });
  }

  async setDyslexiaContrast(userId: string, mode: number) {
    return this.updatePreferences(userId, {
      dyslexiaContrast: Math.max(0, Math.min(2, mode)),
    });
  }
}
