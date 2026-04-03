import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageAdapterFactory } from '../storage/storage-adapter.factory';
import { StorageType } from '@prisma/client';

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageAdapterFactory: StorageAdapterFactory,
  ) {}

  async searchUsers(query: string, currentUserId: string) {
    if (!query.trim()) return [];
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { username: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
        NOT: { id: currentUserId },
      },
      select: {
        id: true, name: true, username: true, email: true,
        avatarUrl: true, coverUrl: true, isPrivate: true, bio: true,
        _count: { select: { followers: true, following: true } },
      },
      take: 20,
    });

    // Check if current user follows each result
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

    await this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      create: { followerId, followingId },
      update: {},
    });
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
    avatarUrl?: string; coverUrl?: string; isPrivate?: boolean;
  }) {
    if (data.username) {
      const existing = await this.prisma.user.findFirst({
        where: { username: data.username, NOT: { id: userId } },
      });
      if (existing) throw new BadRequestException('Username already taken');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, username: true, bio: true, avatarUrl: true, coverUrl: true, isPrivate: true },
    });
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) throw new BadRequestException('Invalid image type');

    const adapter = this.storageAdapterFactory.getAdapter(StorageType.s3) as any;
    const ext = file.mimetype.split('/')[1].replace('jpeg', 'jpg');
    const path = `avatars/${userId}-${Date.now()}.${ext}`;

    await adapter.upload(file.buffer, path, file.mimetype);

    // Get the public URL (not just the path)
    const avatarUrl = await adapter.getSignedUrl(path, 0);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    });
    return updated;
  }
}
