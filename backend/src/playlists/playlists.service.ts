import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlaylistDto, UpdatePlaylistDto, ReorderItemDto } from './dto/playlist.dto';

@Injectable()
export class PlaylistsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreatePlaylistDto) {
    return this.prisma.playlist.create({
      data: { userId, title: dto.title, isPublic: dto.isPublic ?? false },
    });
  }

  async findOne(id: string, userId: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      include: { songs: { orderBy: { position: 'asc' }, include: { song: true } } },
    });
    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.userId !== userId) throw new ForbiddenException();
    return playlist;
  }

  async update(id: string, userId: string, dto: UpdatePlaylistDto) {
    await this.assertOwner(id, userId);
    return this.prisma.playlist.update({ where: { id }, data: dto });
  }

  async addSong(id: string, userId: string, songId: string) {
    await this.assertOwner(id, userId);

    const max = await this.prisma.playlistSong.aggregate({
      where: { playlistId: id },
      _max: { position: true },
    });
    const position = (max._max.position ?? -1) + 1;

    return this.prisma.playlistSong.create({
      data: { playlistId: id, songId, position },
    });
  }

  async reorder(id: string, userId: string, songs: ReorderItemDto[]) {
    await this.assertOwner(id, userId);

    await this.prisma.$transaction(
      songs.map(({ songId, position }) =>
        this.prisma.playlistSong.update({
          where: { playlistId_songId: { playlistId: id, songId } },
          data: { position },
        }),
      ),
    );
  }

  async remove(id: string, userId: string) {
    await this.assertOwner(id, userId);
    await this.prisma.playlist.delete({ where: { id } });
  }

  private async assertOwner(id: string, userId: string) {
    const playlist = await this.prisma.playlist.findUnique({ where: { id } });
    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.userId !== userId) throw new ForbiddenException();
  }
}
