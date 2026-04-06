import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InteractionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(songId: string, userId: string) {
    const [likes, dislikes, comments, userLike, isSaved] = await Promise.all([
      this.prisma.songLike.count({ where: { songId, type: 'like' } }),
      this.prisma.songLike.count({ where: { songId, type: 'dislike' } }),
      this.prisma.songComment.count({ where: { songId } }),
      this.prisma.songLike.findUnique({ where: { userId_songId: { userId, songId } } }),
      this.prisma.favorite.findUnique({ where: { userId_songId: { userId, songId } } }),
    ]);

    return {
      likes,
      dislikes,
      comments,
      userLike: userLike?.type ?? null,
      isSaved: !!isSaved,
    };
  }

  async setLike(songId: string, userId: string, type: 'like' | 'dislike') {
    const song = await this.prisma.song.findUnique({ where: { id: songId } });
    if (!song) throw new NotFoundException('Song not found');

    await this.prisma.songLike.upsert({
      where: { userId_songId: { userId, songId } },
      create: { userId, songId, type },
      update: { type },
    });

    return this.getStats(songId, userId);
  }

  async removeLike(songId: string, userId: string) {
    await this.prisma.songLike.deleteMany({ where: { userId, songId } });
    return this.getStats(songId, userId);
  }

  async getComments(songId: string) {
    return this.prisma.songComment.findMany({
      where: { songId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
  }

  async addComment(songId: string, userId: string, text: string) {
    if (!text?.trim()) throw new BadRequestException('Comment cannot be empty');
    if (text.length > 500) throw new BadRequestException('Comment too long (max 500 chars)');

    const comment = await this.prisma.songComment.create({
      data: { songId, userId, text: text.trim() },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    return comment;
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.songComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) throw new ForbiddenException('Not your comment');

    await this.prisma.songComment.delete({ where: { id: commentId } });
    return { deleted: true };
  }

  /** Toggle save (favorite) */
  async toggleSave(songId: string, userId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_songId: { userId, songId } },
    });

    if (existing) {
      await this.prisma.favorite.delete({ where: { userId_songId: { userId, songId } } });
      return { saved: false };
    } else {
      await this.prisma.favorite.create({ data: { userId, songId } });
      return { saved: true };
    }
  }
}
