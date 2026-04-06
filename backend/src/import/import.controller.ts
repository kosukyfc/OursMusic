import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ImportService } from './import.service';
import { AdminGuard } from '../auth/guards';

@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  /** POST /import/s3 — admin-only */
  @Post('s3')
  @UseGuards(AdminGuard)
  importS3(@Body('prefix') prefix?: string) {
    return this.importService.importFromS3(prefix ?? '');
  }

  /** POST /import/drive — user-scoped */
  @Post('drive')
  importDrive(
    @Req() req: Request & { user: { userId: string } },
    @Body('prefix') prefix?: string,
  ) {
    return this.importService.importFromDrive(req.user.userId, prefix ?? '');
  }
}
