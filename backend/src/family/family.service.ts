import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MAX_FAMILY_MEMBERS = 6;

@Injectable()
export class FamilyService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: Implement family features with familyGroup and familyMember models

  async getOrCreateGroup(ownerId: string) {
    // TODO: Implement with Prisma schema
    return { id: 'stub', ownerId, members: [], role: 'owner' };
  }

  async inviteMember(ownerId: string, targetUserId: string) {
    // TODO: Implement with Prisma schema
    return { ok: true, message: 'Membro adicionado ao grupo Family' };
  }

  async removeMember(ownerId: string, targetUserId: string) {
    // TODO: Implement with Prisma schema
    return { ok: true, message: 'Membro removido do grupo' };
  }

  async leaveGroup(userId: string) {
    // TODO: Implement with Prisma schema
    return { ok: true };
  }

  async getMyGroup(userId: string) {
    // TODO: Implement with Prisma schema
    return null;
  }
}
