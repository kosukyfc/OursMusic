import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserPreferencesService, UserPreferencesDto } from './user-preferences.service';

@Controller('preferences')
export class PreferencesController {
  constructor(private preferencesService: UserPreferencesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getPreferences(@Request() req) {
    return this.preferencesService.getPreferences(req.user.id);
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  async updatePreferences(@Request() req, @Body() data: UserPreferencesDto) {
    return this.preferencesService.updatePreferences(req.user.id, data);
  }

  @Put('font-size')
  @UseGuards(JwtAuthGuard)
  async setFontSize(@Request() req, @Body() body: { fontSize: number }) {
    return this.preferencesService.setFontSize(req.user.id, body.fontSize);
  }

  @Put('dyslexia')
  @UseGuards(JwtAuthGuard)
  async setDyslexia(@Request() req, @Body() body: { enabled: boolean; contrast?: number }) {
    const result = await this.preferencesService.setDyslexiaFont(req.user.id, body.enabled);
    if (body.contrast !== undefined) {
      return this.preferencesService.setDyslexiaContrast(req.user.id, body.contrast);
    }
    return result;
  }
}
