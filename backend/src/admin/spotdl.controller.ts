import { Controller, Post, Body, Req, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { Response, Request } from 'express';
import { AdminGuard } from '../auth/guards';
import { SpotdlService } from './spotdl.service';

type AuthReq = Request & { user: { userId: string } };

@Controller('admin/spotdl')
@UseGuards(AdminGuard)
export class SpotdlController {
  constructor(private readonly spotdlService: SpotdlService) {}

  /**
   * POST /admin/spotdl/download
   * Body: { url: string }
   * Resposta: SSE stream com progresso
   */
  @Post('download')
  async download(
    @Body('url') url: string,
    @Req() req: AuthReq,
    @Res() res: Response,
  ) {
    if (!url?.trim()) throw new BadRequestException('URL é obrigatória');

    const spotifyRegex = /^https:\/\/open\.spotify\.com\/(track|album|playlist|artist)\//;
    if (!spotifyRegex.test(url.trim())) {
      throw new BadRequestException('URL inválida. Use um link do Spotify (faixa, álbum ou playlist)');
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
      const result = await this.spotdlService.downloadFromSpotify(
        url.trim(),
        req.user.userId,
        (progress) => send(progress),
      );
      send({ status: 'done', ...result });
    } catch (e: any) {
      send({ status: 'error', error: e.message ?? 'Erro desconhecido' });
    } finally {
      res.end();
    }
  }
}
