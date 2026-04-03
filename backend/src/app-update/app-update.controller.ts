import { Body, Controller, Get, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Public } from '../auth/decorators';
import { AdminGuard } from '../auth/guards';
import * as fs from 'fs';
import * as path from 'path';

const APK_DIR = path.join(process.cwd(), 'apk-releases');
const VERSION_FILE = path.join(APK_DIR, 'version.json');

@Controller('app')
export class AppUpdateController {

  /** Public — app checks this on startup */
  @Public()
  @Get('version')
  getVersion() {
    if (!fs.existsSync(VERSION_FILE)) {
      return { version: '1.0.0', downloadUrl: null, notes: '' };
    }
    return JSON.parse(fs.readFileSync(VERSION_FILE, 'utf-8'));
  }

  /** Public — download the APK */
  @Public()
  @Get('download/mobile')
  downloadMobile(@Res() res: Response) {
    const apk = path.join(APK_DIR, 'app-mobile.apk');
    if (!fs.existsSync(apk)) {
      res.status(404).json({ message: 'APK not available yet' });
      return;
    }
    res.download(apk, 'music-app.apk');
  }

  @Public()
  @Get('download/tv')
  downloadTv(@Res() res: Response) {
    const apk = path.join(APK_DIR, 'app-tv.apk');
    if (!fs.existsSync(apk)) {
      res.status(404).json({ message: 'APK not available yet' });
      return;
    }
    res.download(apk, 'music-app-tv.apk');
  }

  /** Admin only — upload new APK + set version */
  @UseGuards(AdminGuard)
  @Post('release/mobile')
  @UseInterceptors(FileInterceptor('apk'))
  releaseMobile(
    @UploadedFile() file: Express.Multer.File,
    @Body('notes') notes: string,
    @Res() res: Response,
  ) {
    return this.saveRelease(file, 'app-mobile.apk', res, notes);
  }

  @UseGuards(AdminGuard)
  @Post('release/tv')
  @UseInterceptors(FileInterceptor('apk'))
  releaseTv(
    @UploadedFile() file: Express.Multer.File,
    @Body('notes') notes: string,
    @Res() res: Response,
  ) {
    return this.saveRelease(file, 'app-tv.apk', res, notes);
  }

  private saveRelease(file: Express.Multer.File, filename: string, res: Response, notes?: string) {
    if (!file) { res.status(400).json({ message: 'No file' }); return; }
    if (!fs.existsSync(APK_DIR)) fs.mkdirSync(APK_DIR, { recursive: true });

    fs.writeFileSync(path.join(APK_DIR, filename), file.buffer);

    // Bump version
    const current = fs.existsSync(VERSION_FILE)
      ? JSON.parse(fs.readFileSync(VERSION_FILE, 'utf-8'))
      : { version: '1.0.0' };

    const parts = current.version.split('.').map(Number);
    parts[2] = (parts[2] ?? 0) + 1;
    const newVersion = parts.join('.');

    const versionData = {
      version: newVersion,
      mobileUrl: `${process.env.API_PUBLIC_URL ?? 'http://192.168.15.3:3000'}/app/download/mobile`,
      tvUrl: `${process.env.API_PUBLIC_URL ?? 'http://192.168.15.3:3000'}/app/download/tv`,
      notes: notes || `Versão ${newVersion} disponível`,
      releasedAt: new Date().toISOString(),
    };

    fs.writeFileSync(VERSION_FILE, JSON.stringify(versionData, null, 2));
    res.json({ message: 'Released', ...versionData });
  }
}
