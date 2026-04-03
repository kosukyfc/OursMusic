import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Public } from '../auth/decorators/public.decorator';

const MIME_MAP: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
};

@Controller('nas-stream')
export class NasStreamController {
  private readonly basePath: string;
  private readonly signingSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.basePath = this.configService.get<string>('NAS_BASE_PATH') ?? '/mnt/nas/music';
    this.signingSecret = this.configService.get<string>('NAS_SIGNING_SECRET') ?? 'nas-secret';
  }

  @Public()
  @Get(':filePath(*)')
  async serveFile(
    @Param('filePath') filePath: string,
    @Query('token') token: string,
    @Query('expires') expires: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // Validate token and expiry
    const expiresMs = parseInt(expires, 10);
    if (!token || !expires || isNaN(expiresMs) || Date.now() > expiresMs) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const payload = `${filePath}:${expiresMs}`;
    const expected = crypto
      .createHmac('sha256', this.signingSecret)
      .update(payload)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'))) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Resolve file path safely (prevent path traversal)
    const resolvedPath = path.resolve(this.basePath, filePath);
    if (!resolvedPath.startsWith(path.resolve(this.basePath))) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Check file exists
    let stat: fs.Stats;
    try {
      stat = fs.statSync(resolvedPath);
    } catch {
      res.status(404).json({ statusCode: 404, error: 'Not Found', message: 'File not found' });
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_MAP[ext] ?? 'audio/mpeg';
    const fileSize = stat.size;

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', contentType);

    const rangeHeader = req.headers['range'];

    if (rangeHeader) {
      // Parse Range header: "bytes=start-end"
      const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
      if (!match) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
        return;
      }

      const startStr = match[1];
      const endStr = match[2];

      let start = startStr !== '' ? parseInt(startStr, 10) : fileSize - 1;
      let end = endStr !== '' ? parseInt(endStr, 10) : fileSize - 1;

      // Handle suffix range (e.g. bytes=-500 means last 500 bytes)
      if (startStr === '' && endStr !== '') {
        start = Math.max(0, fileSize - parseInt(endStr, 10));
        end = fileSize - 1;
      }

      if (start > end || start >= fileSize || end >= fileSize) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
        return;
      }

      const chunkSize = end - start + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunkSize);

      const stream = fs.createReadStream(resolvedPath, { start, end });
      stream.pipe(res);
    } else {
      // Full file response
      res.setHeader('Content-Length', fileSize);
      const stream = fs.createReadStream(resolvedPath);
      stream.pipe(res);
    }
  }
}
