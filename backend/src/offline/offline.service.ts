import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { StorageAdapterFactory } from '../storage/storage-adapter.factory';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class OfflineService {
  private readonly sandboxDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageAdapterFactory: StorageAdapterFactory,
    private readonly config: ConfigService,
  ) {
    this.sandboxDir = this.config.get<string>('SANDBOX_DIR') ?? '/tmp/offline';
  }

  /**
   * POST /offline/mark/:id
   * Premium + offline_enabled check; fetches file, AES-256-GCM encrypts with random IV,
   * stores in SANDBOX_DIR, creates Download record with expires_at = now + 30 days.
   * Property 23: encrypted file + Download(status=ready, expires_at ≈ now+30d)
   * Property 25: free or offline_enabled=false → 403
   * Property 27: encryptedPath always under SANDBOX_DIR
   */
  async markForOffline(songId: string, userId: string): Promise<{ downloadId: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.plan === 'free' || !user.offlineEnabled) {
      throw new ForbiddenException('Premium plan with offline downloads required');
    }

    const song = await this.prisma.song.findUnique({ where: { id: songId } });
    if (!song) throw new NotFoundException('Song not found');

    // Create a pending Download record first
    const download = await this.prisma.download.create({
      data: {
        userId,
        songId,
        status: 'pending',
        expiresAt: new Date(Date.now() + THIRTY_DAYS_MS),
      },
    });

    try {
      // Fetch the file from storage
      const adapter = this.storageAdapterFactory.getAdapter(song.storageType);
      const signedUrl = await adapter.getSignedUrl(song.storagePath, 300);
      const fileBuffer = await this.fetchBuffer(signedUrl);

      // AES-256-GCM encrypt with random IV
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
      const authTag = cipher.getAuthTag();

      // Store: iv (12) + authTag (16) + ciphertext
      const payload = Buffer.concat([iv, authTag, encrypted]);

      const userDir = path.join(this.sandboxDir, userId);
      fs.mkdirSync(userDir, { recursive: true });
      const encryptedPath = path.join(userDir, `${download.id}.enc`);
      fs.writeFileSync(encryptedPath, payload);

      await this.prisma.download.update({
        where: { id: download.id },
        data: { status: 'ready', encryptedPath },
      });

      return { downloadId: download.id };
    } catch (err) {
      // Clean up pending record on failure
      await this.prisma.download.delete({ where: { id: download.id } }).catch(() => {});
      throw new InternalServerErrorException('Failed to prepare offline download');
    }
  }

  /**
   * GET /offline/list
   * Returns only status=ready AND expires_at > now.
   * Property 24: never returns expired or pending downloads.
   */
  async list(userId: string) {
    return this.prisma.download.findMany({
      where: {
        userId,
        status: 'ready',
        expiresAt: { gt: new Date() },
      },
      include: { song: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Validates offline playback license.
   * Marks download expired if past TTL or plan no longer eligible.
   * Property 26: expired or ineligible → mark expired + refuse playback.
   */
  async validatePlayback(downloadId: string, userId: string): Promise<{ encryptedPath: string }> {
    const download = await this.prisma.download.findUnique({ where: { id: downloadId } });
    if (!download || download.userId !== userId) throw new NotFoundException('Download not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isExpired = download.expiresAt <= new Date();
    const isIneligible = !user || user.plan === 'free' || !user.offlineEnabled;

    if (isExpired || isIneligible) {
      await this.prisma.download.update({
        where: { id: downloadId },
        data: { status: 'expired' },
      });
      throw new ForbiddenException('Offline license expired or plan no longer eligible');
    }

    if (!download.encryptedPath) throw new NotFoundException('Encrypted file not found');
    return { encryptedPath: download.encryptedPath };
  }

  private async fetchBuffer(url: string): Promise<Buffer> {
    const https = await import('https');
    const http = await import('http');
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      (client as any).get(url, (res: any) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    });
  }
}
