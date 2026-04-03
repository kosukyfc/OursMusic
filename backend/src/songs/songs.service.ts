import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { StorageAdapterFactory } from '../storage/storage-adapter.factory';
import { StorageType } from '@prisma/client';
import { Metadata } from './metadata.types';
import { parseMetadata } from './metadata.parser';

export type SongMetadata = Metadata;

export interface StreamResult {
  url: string;
  expiresAt: Date;
}

@Injectable()
export class SongsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageAdapterFactory: StorageAdapterFactory,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async list() {
    return this.prisma.song.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getLyrics(songId: string) {
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
      select: { lyrics: true, lyricsSynced: true, title: true, artist: true },
    });
    if (!song) throw new NotFoundException('Song not found');
    return {
      lyrics: song.lyrics,
      lyricsSynced: song.lyricsSynced,
      hasSynced: !!song.lyricsSynced,
    };
  }

  async stream(songId: string, userId: string): Promise<StreamResult> {
    const song = await this.prisma.song.findUnique({ where: { id: songId } });
    if (!song) throw new NotFoundException(`Song ${songId} not found`);

    if (song.storageType === StorageType.drive) {
      throw new NotFoundException('This song was stored on Google Drive and is no longer available. Please re-import it.');
    }

    const adapter = this.storageAdapterFactory.getAdapter(song.storageType);
    const url = await adapter.getSignedUrl(song.storagePath, 3600);

    this.eventEmitter.emit('activity.play', { userId, songId });

    return { url, expiresAt: new Date(Date.now() + 3600 * 1000) };
  }

  async upload(
    file: Express.Multer.File,
    userId: string,
    storageType: StorageType,
  ): Promise<{ song_id: string; storage_type: StorageType; storage_path: string }> {
    const metadata = await parseMetadata(file);
    const adapter = this.storageAdapterFactory.getAdapter(storageType);

    let storagePath: string;
    try {
      storagePath = await adapter.upload(
        file.buffer,
        `songs/${Date.now()}-${file.originalname}`,
        file.mimetype,
      );
    } catch {
      throw new ServiceUnavailableException('Storage backend unavailable');
    }

    const song = await this.prisma.song.create({
      data: {
        title: metadata.title,
        artist: metadata.artist !== 'Unknown Artist' ? metadata.artist : null,
        albumName: metadata.album !== 'Unknown Album' ? metadata.album : null,
        duration: metadata.duration,
        bitrate: metadata.bitrate,
        storageType,
        storagePath,
        fileSize: BigInt(file.size),
        mimeType: file.mimetype,
        uploadedBy: userId,
      },
    });

    return { song_id: song.id, storage_type: song.storageType, storage_path: song.storagePath };
  }
}
