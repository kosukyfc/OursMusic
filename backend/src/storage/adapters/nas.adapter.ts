import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { StorageAdapter, StorageFile } from '../storage.interface';

@Injectable()
export class NasAdapter implements StorageAdapter {
  private readonly basePath: string;
  private readonly signingSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.basePath = this.configService.get<string>('NAS_BASE_PATH') ?? '/mnt/nas/music';
    this.signingSecret = this.configService.get<string>('NAS_SIGNING_SECRET') ?? 'nas-secret';
  }

  async upload(file: Buffer, filePath: string, mimeType: string): Promise<string> {
    const fullPath = path.join(this.basePath, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file);
    return filePath;
  }

  async getSignedUrl(filePath: string, ttlSeconds: number): Promise<string> {
    const expires = Date.now() + ttlSeconds * 1000;
    const payload = `${filePath}:${expires}`;
    const token = crypto
      .createHmac('sha256', this.signingSecret)
      .update(payload)
      .digest('hex');
    return `/nas-stream/${encodeURIComponent(filePath)}?token=${token}&expires=${expires}`;
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, filePath);
    await fs.unlink(fullPath);
  }

  async listFiles(prefix: string): Promise<StorageFile[]> {
    const dirPath = path.join(this.basePath, prefix);
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files: StorageFile[] = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        const entryPath = path.join(prefix, entry.name);
        const fullPath = path.join(this.basePath, entryPath);
        const stat = await fs.stat(fullPath);
        files.push({
          path: entryPath,
          size: stat.size,
          mimeType: 'audio/mpeg',
        });
      }
    }

    return files;
  }
}
