import { Controller, Post, Get, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { OfflineService } from './offline.service';

type AuthReq = Request & { user: { userId: string } };

@Controller('offline')
export class OfflineController {
  constructor(private readonly offlineService: OfflineService) {}

  @Post('mark/:id')
  mark(@Param('id') songId: string, @Req() req: AuthReq) {
    return this.offlineService.markForOffline(songId, req.user.userId);
  }

  @Get('list')
  list(@Req() req: AuthReq) {
    return this.offlineService.list(req.user.userId);
  }

  @Get('validate/:downloadId')
  validate(@Param('downloadId') downloadId: string, @Req() req: AuthReq) {
    return this.offlineService.validatePlayback(downloadId, req.user.userId);
  }
}
