import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * AdminGuard — restricts access to admin-only endpoints.
 *
 * The current schema has no dedicated `role` field on User. As a pragmatic
 * placeholder, users with plan `premium` or `family` are treated as admins.
 * TODO: Add a `role: Role` field (e.g. admin | user) to the User model and
 *       update this guard to check `req.user.role === 'admin'` instead.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: { userId: string } }>();
    const userId = req.user?.userId;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const adminPlans = ['premium', 'family'];
    if (!user.isAdmin && !adminPlans.includes(user.plan)) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
