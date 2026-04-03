import { Controller, Get, Param, Res } from '@nestjs/common';
import { Public } from '../auth/decorators';
import { MagicImportService } from './magic-import.service';

/**
 * Uses /events prefix to avoid conflict with AdminController's @UseGuards(AdminGuard).
 * EventSource cannot send Authorization headers, so this endpoint must be public.
 */
@Controller('events')
export class MagicImportSseController {
  constructor(private readonly magicImportService: MagicImportService) {}

  @Public()
  @Get('magic-import/:jobId')
  progress(@Param('jobId') jobId: string, @Res() res: any) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const send = (data: object) => {
      try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch { /* disconnected */ }
    };

    send({ heartbeat: true });

    const unsub = this.magicImportService.subscribeProgress(jobId, (event) => {
      send(event);
      if (event.done) { res.end(); unsub(); }
    });

    res.on('close', () => unsub());
  }
}
