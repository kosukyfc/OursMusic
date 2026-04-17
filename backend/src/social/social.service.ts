import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StorageAdapterFactory } from '../storage/storage-adapter.factory';
import { StorageType } from '@prisma/client';
import { DevicesGateway } from '../devices/devices.gateway';

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageAdapterFactory: StorageAdapterFactory,
    private readonly configService: ConfigService,
    private readonly devicesGateway: DevicesGateway,
  ) {}

  async searchUsers(query: string, currentUserId: string) {
    if (!query.trim()) return [];

    // Remove @ se presente, busca por username ou nome
    const q = query.startsWith('@') ? query.slice(1) : query;
    if (!q.trim()) return [];

    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { name:     { contains: q, mode: 'insensitive' } },
        ],
        NOT: { id: currentUserId },
      },
      select: {
        id: true, name: true, username: true, email: true,
        avatarUrl: true, coverUrl: true, isPrivate: true, bio: true,
        flair: true, plan: true, isAdmin: true,
        _count: { select: { followers: true, following: true } },
      },
      take: 20,
    });

    const followingIds = await this.prisma.follow.findMany({
      where: { followerId: currentUserId, followingId: { in: users.map(u => u.id) } },
      select: { followingId: true },
    });
    const followingSet = new Set(followingIds.map(f => f.followingId));

    return users.map(u => ({
      ...u,
      isFollowing: followingSet.has(u.id),
      followersCount: u._count.followers,
      followingCount: u._count.following,
    }));
  }

  async getProfile(targetId: string, currentUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true, name: true, username: true, email: true,
        avatarUrl: true, coverUrl: true, bio: true, isPrivate: true,
        flair: true,
        createdAt: true,
        _count: { select: { followers: true, following: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const isFollowing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: currentUserId, followingId: targetId } },
    });

    const isOwn = targetId === currentUserId;
    const canSeeDetails = isOwn || !user.isPrivate || !!isFollowing;

    return {
      ...user,
      isFollowing: !!isFollowing,
      isOwn,
      canSeeDetails,
      followersCount: user._count.followers,
      followingCount: user._count.following,
    };
  }

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) throw new BadRequestException('Cannot follow yourself');
    const target = await this.prisma.user.findUnique({ where: { id: followingId } });
    if (!target) throw new NotFoundException('User not found');

    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });

    // If not already following, create new follow and notify
    if (!existing) {
      await this.prisma.follow.create({
        data: { followerId, followingId },
      });

      // Fetch follower info to send in notification
      const follower = await this.prisma.user.findUnique({
        where: { id: followerId },
        select: { id: true, name: true, username: true, avatarUrl: true },
      });

      // Emit notification to the followed user (followingId receives notification about new follower)
      this.devicesGateway.notifyNewFollower(followingId, follower);
    }

    return { following: true };
  }

  async unfollow(followerId: string, followingId: string) {
    await this.prisma.follow.deleteMany({ where: { followerId, followingId } });
    return { following: false };
  }

  async getFollowers(userId: string, currentUserId: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followingId: userId },
      include: { follower: { select: { id: true, name: true, username: true, avatarUrl: true } } },
    });
    return follows.map(f => f.follower);
  }

  async getFollowing(userId: string, currentUserId: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      include: { following: { select: { id: true, name: true, username: true, avatarUrl: true } } },
    });
    return follows.map(f => f.following);
  }

  async updateProfile(userId: string, data: {
    name?: string; username?: string; bio?: string;
    avatarUrl?: string; coverUrl?: string; isPrivate?: boolean; flair?: any;
  }) {
    // Sanitiza username — remove @, espaços e caracteres inválidos
    if (data.username !== undefined) {
      data.username = data.username
        .replace(/@/g, '')
        .replace(/[^a-zA-Z0-9_.]/g, '')
        .slice(0, 30)
        .toLowerCase();
      if (data.username === '') data.username = undefined as any;
    }

    if (data.username) {
      const existing = await this.prisma.user.findFirst({
        where: { username: data.username, NOT: { id: userId } },
      });
      if (existing) throw new BadRequestException('Username already taken');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, username: true, bio: true, avatarUrl: true, coverUrl: true, isPrivate: true, flair: true },
    });
  }

  async getFriendActivity(userId: string, limit = 30) {
    // Get IDs of users this person follows
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const friendIds = following.map(f => f.followingId);
    if (friendIds.length === 0) return [];

    const logs = await this.prisma.activityLog.findMany({
      where: {
        userId: { in: friendIds },
        action: { in: ['play', 'like', 'add_to_playlist'] as any },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, username: true, avatarUrl: true, flair: true, plan: true, isAdmin: true } },
        song: { select: { id: true, title: true, artist: true, albumName: true, coverUrl: true } },
      },
    });

    return logs.map(l => ({
      id:        l.id,
      action:    l.action,
      timestamp: l.timestamp,
      user:      l.user,
      song:      l.song,
    }));
  }

  async uploadAvatar(userId: string, file: any) {
    if (!file) throw new BadRequestException('No file provided');
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) throw new BadRequestException('Invalid image type');

    const s3Key = this.configService.get<string>('AWS_ACCESS_KEY_ID') ?? '';
    const s3Endpoint = this.configService.get<string>('S3_ENDPOINT') ?? '';
    const s3Configured =
      s3Key && !s3Key.startsWith('SEU_') &&
      s3Endpoint && !s3Endpoint.includes('SEU_PROJETO') && !s3Endpoint.includes('SEU_');

    let avatarUrl: string | null = null;

    if (s3Configured) {
      try {
        const adapter = this.storageAdapterFactory.getAdapter(StorageType.s3) as any;
        const ext = file.mimetype.split('/')[1].replace('jpeg', 'jpg');
        const storagePath = `avatars/${userId}-${Date.now()}.${ext}`;
        await adapter.upload(file.buffer, storagePath, file.mimetype);
        avatarUrl = await adapter.getSignedUrl(storagePath, 0);
      } catch {
        // S3 falhou — usa fallback base64
        avatarUrl = null;
      }
    }

    if (!avatarUrl) {
      // Fallback: data URL base64 (dev ou S3 indisponível)
      avatarUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    });
    return updated;
  }
}
