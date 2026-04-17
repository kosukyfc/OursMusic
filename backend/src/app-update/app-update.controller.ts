import { Body, Controller, Get, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Public } from '../auth/decorators';
import { AdminGuard } from '../auth/guards';
import { DevicesGateway } from '../devices/devices.gateway';
import * as fs from 'fs';
import * as path from 'path';

const APK_DIR = path.join(process.cwd(), 'apk-releases');
const VERSION_FILE = path.join(APK_DIR, 'version.json');
const HISTORY_FILE = path.join(APK_DIR, 'history.json');

@Controller('app')
export class AppUpdateController {
  constructor(private readonly devicesGateway: DevicesGateway) {}

  @Public()
  @Get('version')
  getVersion() {
    if (!fs.existsSync(VERSION_FILE)) {
      return { version: '1.0.0', downloadUrl: null, notes: '' };
    }
    return JSON.parse(fs.readFileSync(VERSION_FILE, 'utf-8'));
  }

  @UseGuards(AdminGuard)
  @Get('history')
  getHistory() {
    if (!fs.existsSync(HISTORY_FILE)) return [];
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
  }

  @Public()
  @Get('download/mobile')
  downloadMobile(@Res() res: Response) {
    const apk = path.join(APK_DIR, 'app-mobile.apk');
    if (!fs.existsSync(apk)) { res.status(404).json({ message: 'APK not available yet' }); return; }
    res.download(apk, 'music-app.apk');
  }

  @Public()
  @Get('download/tv')
  downloadTv(@Res() res: Response) {
    const apk = path.join(APK_DIR, 'app-tv.apk');
    if (!fs.existsSync(apk)) { res.status(404).json({ message: 'APK not available yet' }); return; }
    res.download(apk, 'music-app-tv.apk');
  }

  @UseGuards(AdminGuard)
  @Post('release/mobile')
  @UseInterceptors(FileInterceptor('apk'))
  releaseMobile(
    @UploadedFile() file: Express.Multer.File,
    @Body('version') version: string,
    @Body('notes') notes: string,
    @Res() res: Response,
  ) {
    return this.saveRelease(file, 'app-mobile.apk', res, notes, version);
  }

  @UseGuards(AdminGuard)
  @Post('release/tv')
  @UseInterceptors(FileInterceptor('apk'))
  releaseTv(
    @UploadedFile() file: Express.Multer.File,
    @Body('version') version: string,
    @Body('notes') notes: string,
    @Res() res: Response,
  ) {
    return this.saveRelease(file, 'app-tv.apk', res, notes, version);
  }

  /** Update release notes without publishing a new APK */
  @UseGuards(AdminGuard)
  @Post('notes')
  updateNotes(@Body('notes') notes: string, @Body('version') version?: string) {
    if (!notes?.trim()) return { error: 'notes is required' };
    if (!fs.existsSync(APK_DIR)) fs.mkdirSync(APK_DIR, { recursive: true });

    const current = fs.existsSync(VERSION_FILE)
      ? JSON.parse(fs.readFileSync(VERSION_FILE, 'utf-8'))
      : { version: '1.0.0' };

    const updated = {
      ...current,
      notes: notes.trim(),
      ...(version?.trim() ? { version: version.trim() } : {}),
    };

    fs.writeFileSync(VERSION_FILE, JSON.stringify(updated, null, 2));

    // Update history entry for this version
    if (fs.existsSync(HISTORY_FILE)) {
      const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
      const idx = history.findIndex((h: any) => h.version === updated.version);
      if (idx >= 0) history[idx] = { ...history[idx], notes: updated.notes };
      else history.unshift(updated);
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(0, 20), null, 2));
    }

    return updated;
  }

  /** Broadcast a global message to all connected users on all platforms */
  @UseGuards(AdminGuard)
  @Post('broadcast')
  broadcast(@Body('message') message: string, @Body('type') type = 'info') {
    if (!message?.trim()) return { error: 'message is required' };
    this.devicesGateway.broadcastGlobal('app:broadcast', {
      message: message.trim(),
      type,
      sentAt: new Date().toISOString(),
    });
    return { ok: true, message: 'Broadcast sent to all connected users' };
  }

  private saveRelease(
    file: Express.Multer.File,
    filename: string,
    res: Response,
    notes?: string,
    versionOverride?: string,
  ) {
    if (!file) { res.status(400).json({ message: 'No file' }); return; }
    if (!fs.existsSync(APK_DIR)) fs.mkdirSync(APK_DIR, { recursive: true });

    fs.writeFileSync(path.join(APK_DIR, filename), file.buffer);

    const current = fs.existsSync(VERSION_FILE)
      ? JSON.parse(fs.readFileSync(VERSION_FILE, 'utf-8'))
      : { version: '1.0.0' };

    let newVersion = versionOverride?.trim();
    if (!newVersion) {
      const parts = current.version.split('.').map(Number);
      parts[2] = (parts[2] ?? 0) + 1;
      newVersion = parts.join('.');
    }

    const baseUrl = process.env.API_PUBLIC_URL ?? 'http://192.168.100.4:3000';
    const versionData = {
      version: newVersion,
      mobileUrl: `${baseUrl}/app/download/mobile`,
      tvUrl: `${baseUrl}/app/download/tv`,
      notes: notes || `Versão ${newVersion} disponível`,
      releasedAt: new Date().toISOString(),
    };

    fs.writeFileSync(VERSION_FILE, JSON.stringify(versionData, null, 2));

    // Append to history
    const history = fs.existsSync(HISTORY_FILE)
      ? JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'))
      : [];
    history.unshift(versionData);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(0, 20), null, 2));

    // Notify all connected users about the new version
    this.devicesGateway.broadcastGlobal('app:update-available', versionData);

    res.json({ message: 'Released', ...versionData });
  }
}
