import { Controller, Get, Post, Delete, Param, Req } from '@nestjs/common';
import { FamilyService } from './family.service';
import { Request } from 'express';

type AuthReq = Request & { user: { userId: string } };

@Controller('family')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Get('group')
  getMyGroup(@Req() req: AuthReq) {
    return this.familyService.getMyGroup(req.user.userId);
  }

  @Post('invite/:userId')
  invite(@Req() req: AuthReq, @Param('userId') targetId: string) {
    return this.familyService.inviteMember(req.user.userId, targetId);
  }

  @Delete('member/:userId')
  remove(@Req() req: AuthReq, @Param('userId') targetId: string) {
    return this.familyService.removeMember(req.user.userId, targetId);
  }

  @Post('leave')
  leave(@Req() req: AuthReq) {
    return this.familyService.leaveGroup(req.user.userId);
  }
}
