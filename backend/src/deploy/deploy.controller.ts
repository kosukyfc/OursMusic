import {
  Controller, Post, Get, Req, Res,
  UploadedFile, UseGuards, UseInterceptors, Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { AdminGuard } from '../auth/guards';
import { DeployService } from './deploy.service';

@Controller('deploy')
@UseGuards(AdminGuard)
export class DeployController {
  constructor(private readonly deployService: DeployService) {}

  /** SSE endpoint — streams deploy log events */
  @Post('run')
  @UseInterceptors(FileInterceptor('package'))
  async run(
    @UploadedFile() file: Express.Multer.File,
    @Body('version_tag') versionTag = '',
    @Body('keep_uploads') keepUploads = 'false',
    @Body('keep_db') keepDb = 'false',
    @Req() _req: Request,
    @Res() res: Response,
  ) {
    if (!file) {
      res.status(400).json({ message: 'Nenhum arquivo enviado.' });
      return;
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const gen = this.deployService.runDeploy(
        file.buffer,
        versionTag,
        keepUploads === 'true',
        keepDb === 'true',
      );
      for await (const event of gen) {
        send(event);
      }
    } catch (err: any) {
      send({ type: 'error', message: `❌ Erro inesperado: ${err.message}` });
      send({ type: 'done', message: 'deploy_error', progress: 100 });
    }

    res.end();
  }

  /** List available backups */
  @Get('backups')
  listBackups() {
    return this.deployService.listBackups();
  }
}
