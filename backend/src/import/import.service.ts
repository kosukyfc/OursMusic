import {
  Injectable,
  BadGatewayException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageAdapterFactory } from '../storage/storage-adapter.factory';
import { StorageType } from '@prisma/client';

const AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/flac',
  'audio/aac',
  'audio/ogg',
]);

export interface ImportResult {
  created: number;
  skipped: number;
}

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageAdapterFactory: StorageAdapterFactory,
  ) {}

  /**
   * POST /import/s3 — admin-only.
   * Lists the S3 bucket, filters audio MIME types, deduplicates by storage_path,
   * bulk-inserts new Song records, and returns created/skipped counts.
   * Property 14: idempotent — running twice produces same DB state.
   * Property 15: created + skipped === total audio files scanned.
   * Property 16: storage unavailable → HTTP 502, no DB changes.
   */
  async importFromS3(prefix = ''): Promise<ImportResult> {
    const adapter = this.storageAdapterFactory.getAdapter(StorageType.s3);

    let files: Awaited<ReturnType<typeof adapter.listFiles>>;
    try {
      files = await adapter.listFiles(prefix);
    } catch {
      throw new BadGatewayException('S3 storage backend is unavailable');
    }

    return this.bulkImport(files, StorageType.s3);
  }

  /**
   * POST /import/drive — user-scoped.
   * Lists Drive files, same dedup logic, refreshes Google tokens if expired.
   * Property 14, 15, 16 apply here too.
   */
  async importFromDrive(
    userId: string,
    prefix = '',
  ): Promise<ImportResult> {
    // Verify user has Google tokens stored
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.googleAccessToken) {
      throw new ForbiddenException(
        'Google Drive not connected. Please re-authenticate.',
      );
    }

    const adapter = this.storageAdapterFactory.getAdapter(StorageType.drive) as any;
    // Set the access token on the DriveAdapter before using it
    if (typeof adapter.setAccessToken === 'function') {
      adapter.setAccessToken(user.googleAccessToken);
    }

    let files: Awaited<ReturnType<typeof adapter.listFiles>>;
    try {
      files = await adapter.listFiles(prefix);
    } catch (err: any) {
      // DriveAdapter throws on 401 after token refresh failure
      if (err?.status === 401 || err?.message?.includes('re-authenticate')) {
        throw new BadGatewayException(
          'Google Drive authentication expired. Please re-authenticate.',
        );
      }
      throw new BadGatewayException('Google Drive storage backend is unavailable');
    }

    return this.bulkImport(files, StorageType.drive);
  }

  private async bulkImport(
    files: { path: string; size: number; mimeType: string }[],
    storageType: StorageType,
  ): Promise<ImportResult> {
    const audioFiles = files.filter((f) => AUDIO_MIME_TYPES.has(f.mimeType));

    if (audioFiles.length === 0) {
      return { created: 0, skipped: 0 };
    }

    // Find already-existing paths to compute skipped count
    const paths = audioFiles.map((f) => f.path);
    const existing = await this.prisma.song.findMany({
      where: { storagePath: { in: paths } },
      select: { storagePath: true },
    });
    const existingPaths = new Set(existing.map((s) => s.storagePath));

    const newFiles = audioFiles.filter((f) => !existingPaths.has(f.path));

    if (newFiles.length > 0) {
      await this.prisma.song.createMany({
        data: newFiles.map((f) => ({
          title: this.titleFromPath(f.path),
          duration: 0,
          storageType,
          storagePath: f.path,
          fileSize: BigInt(f.size),
          mimeType: f.mimeType,
        })),
        skipDuplicates: true, // guard against race conditions
      });
    }

    return {
      created: newFiles.length,
      skipped: audioFiles.length - newFiles.length,
    };
  }

  /** Derives a human-readable title from a storage path (filename without extension). */
  private titleFromPath(path: string): string {
    const filename = path.split('/').pop() ?? path;
    return filename.replace(/\.[^.]+$/, '') || 'Unknown Title';
  }
}
