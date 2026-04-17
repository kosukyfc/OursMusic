import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateSetlistDto {
  name: string;
}

export interface AddSongDto {
  songId: string;
}

@Injectable()
export class SetlistPersistenceService {
  constructor(private prisma: PrismaService) {}

  async createSetlist(userId: string, data: CreateSetlistDto) {
    return this.prisma.setlist.create({
      data: {
        userId,
        name: data.name,
      },
      include: { songs: true },
    });
  }

  async getSetlists(userId: string) {
    return this.prisma.setlist.findMany({
      where: { userId },
      include: { songs: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addSongToSetlist(userId: string, setlistId: string, songId: string) {
    const setlist = await this.prisma.setlist.findUnique({
      where: { id: setlistId },
      include: { songs: true },
    });

    if (!setlist || setlist.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const order = setlist.songs.length;

    return this.prisma.setlistSong.create({
      data: { setlistId, songId, order },
    });
  }

  async removeSongFromSetlist(userId: string, setlistId: string, songId: string) {
    const setlist = await this.prisma.setlist.findUnique({ where: { id: setlistId } });

    if (!setlist || setlist.userId !== userId) {
      throw new Error('Unauthorized');
    }

    return this.prisma.setlistSong.delete({
      where: { setlistId_songId: { setlistId, songId } },
    });
  }

  async deleteSetlist(userId: string, setlistId: string) {
    const setlist = await this.prisma.setlist.findUnique({ where: { id: setlistId } });

    if (!setlist || setlist.userId !== userId) {
      throw new Error('Unauthorized');
    }

    return this.prisma.setlist.delete({ where: { id: setlistId } });
  }
}
