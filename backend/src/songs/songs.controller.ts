import {
  Controller, Get, Param, Post, Req, Res,
  UploadedFile, UseGuards, UseInterceptors, Inject,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { MaxFileSizeValidator, ParseFilePipe } from "@nestjs/common";
import { Request, Response } from "express";
import { SongsService } from "./songs.service";
import { AdminGuard } from "../auth/guards";
import { StorageType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { DRIVE_ADAPTER } from "../storage/storage.tokens";
import { DriveAdapter } from "../storage/adapters/drive.adapter";
import { GoogleTokenService } from "../auth/google-token.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AudioAnalysisService } from "./audio-analysis.service";

@Controller("songs")
export class SongsController {
  constructor(
    private readonly songsService: SongsService,
    private readonly prisma: PrismaService,
    @Inject(DRIVE_ADAPTER) private readonly _driveAdapter: DriveAdapter,
    private readonly googleTokenService: GoogleTokenService,
    private readonly eventEmitter: EventEmitter2,
    private readonly _audioAnalysis: AudioAnalysisService,
  ) {}

  @Get()
  list(@Req() req: Request & { query: { uploadedBy?: string } }) {
    const uploadedBy = (req as any).query?.uploadedBy as string | undefined;
    return this.songsService.list(uploadedBy);
  }

  @Get("home")
  home(@Req() req: Request & { user: { userId: string } }) {
    return this.songsService.homeData(req.user.userId);
  }

  @Get(":id/lyrics")
  lyrics(@Param("id") id: string) {
    return this.songsService.getLyrics(id);
  }

  @Get(":id/analysis")
  async analysis(@Param("id") id: string) {
    const rows: any[] = await this.prisma.$queryRaw`
      SELECT duration, beat_timestamps, waveform_data FROM songs WHERE id = ${id} LIMIT 1
    `;
    if (!rows.length) return { beatTimestamps: [], waveformData: [], bpm: 120 };
    const row = rows[0];
    if (row.beat_timestamps && row.waveform_data) {
      return {
        beatTimestamps: JSON.parse(row.beat_timestamps),
        waveformData: JSON.parse(row.waveform_data),
        bpm: 120,
      };
    }
    const durationMs = (row.duration ?? 210) * 1000;
    const bpm = 120;
    const intervalMs = Math.round(60000 / bpm);
    const beats = Array.from({ length: Math.floor(durationMs / intervalMs) }, (_: unknown, i: number) => i * intervalMs);
    const waveform = Array.from({ length: 200 }, (_: unknown, i: number) =>
      Math.round((0.3 + 0.7 * Math.abs(Math.sin(i * 0.15))) * 10000) / 10000,
    );
    return { beatTimestamps: beats, waveformData: waveform, bpm };
  }

  @Get("stream/:id")  @Get("stream/:id")
  async stream(
    @Param("id") id: string,
    @Req() req: Request & { user: { userId: string } },
    @Res() res: Response,
  ) {
    const userId = req.user.userId;
    const song = await this.prisma.song.findUnique({ where: { id } });
    if (!song) { res.status(404).json({ message: "Song not found" }); return; }

    if (song.storageType !== StorageType.drive) {
      try {
        const result = await this.songsService.stream(id, userId);
        res.json(result);
      } catch (err: any) {
        res.status(err.status ?? 500).json({ message: err.message });
      }
      return;
    }

    const ownerId = song.uploadedBy ?? userId;
    let driveToken: string;
    try {
      driveToken = await this.googleTokenService.getValidAccessToken(ownerId);
    } catch {
      try {
        driveToken = await this.googleTokenService.getValidAccessToken(userId);
      } catch (err: any) {
        res.status(403).json({ message: err.message }); return;
      }
    }

    const driveUrl = `https://www.googleapis.com/drive/v3/files/${song.storagePath}?alt=media&access_token=${driveToken}`;
    const rangeHeader = req.headers.range;
    let driveRes: globalThis.Response;
    try {
      driveRes = await fetch(driveUrl, { headers: rangeHeader ? { Range: rangeHeader } : {} });
    } catch (err: any) {
      res.status(502).json({ message: "Drive unreachable: " + err.message }); return;
    }

    if (!driveRes.ok && driveRes.status !== 206) {
      res.status(driveRes.status).json({ message: `Drive returned ${driveRes.status}` }); return;
    }

    this.eventEmitter.emit("activity.play", { userId, songId: id });
    res.status(driveRes.status);
    res.setHeader("Content-Type", driveRes.headers.get("content-type") ?? "audio/mpeg");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");
    const cl = driveRes.headers.get("content-length");
    if (cl) res.setHeader("Content-Length", cl);
    const cr = driveRes.headers.get("content-range");
    if (cr) res.setHeader("Content-Range", cr);

    const reader = driveRes.body?.getReader();
    if (!reader) { res.end(); return; }
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        if (!res.write(value)) await new Promise(r => res.once("drain", r));
      }
    } catch { res.end(); }
  }

  @Post("upload")
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor("file"))
  upload(
    @UploadedFile(new ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: 500 * 1024 * 1024 })] }))
    file: Express.Multer.File,
    @Req() req: Request & { user: { userId: string } },
  ) {
    const storageType: StorageType = (req.body?.storageType as StorageType) ?? StorageType.nas;
    return this.songsService.upload(file, req.user.userId, storageType);
  }
}