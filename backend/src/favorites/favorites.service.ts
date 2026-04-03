import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, songId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_songId: { userId, songId } },
    });
    if (existing) throw new ConflictException('Song already in favorites');

    return this.prisma.favorite.create({ data: { userId, songId } });
  }

  async remove(userId: string, songId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_songId: { userId, songId } },
    });
    if (!existing) throw new NotFoundException('Favorite not found');

    return this.prisma.favorite.delete({
      where: { userId_songId: { userId, songId } },
    });
  }

  async list(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { song: true },
    });
  }
}
