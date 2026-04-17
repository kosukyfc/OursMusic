import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HeatmapService } from './heatmap.service';

@Controller('heatmap')
export class HeatmapController {
  constructor(private heatmapService: HeatmapService) {}

  @Post('record')
  @UseGuards(JwtAuthGuard)
  async recordListening(@Request() req) {
    return this.heatmapService.recordListening(req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getHeatmap(@Request() req) {
    return this.heatmapService.getHeatmap(req.user.id);
  }

  @Get('peaks')
  @UseGuards(JwtAuthGuard)
  async getPeakTimes(@Request() req) {
    return this.heatmapService.getPeakTimes(req.user.id);
  }
}
