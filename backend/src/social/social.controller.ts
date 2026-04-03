import { Controller, Get, Post, Delete, Param, Query, Body, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { SocialService } from './social.service';

type AuthReq = Request & { user: { userId: string } };

@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get('search')
  search(@Query('q') q: string, @Req() req: AuthReq) {
    return this.socialService.searchUsers(q ?? '', req.user.userId);
  }

  @Get('profile/:id')
  getProfile(@Param('id') id: string, @Req() req: AuthReq) {
    return this.socialService.getProfile(id, req.user.userId);
  }

  @Get('profile/me')
  getMyProfile(@Req() req: AuthReq) {
    return this.socialService.getProfile(req.user.userId, req.user.userId);
  }

  @Get('profile/:id/followers')
  getFollowers(@Param('id') id: string, @Req() req: AuthReq) {
    return this.socialService.getFollowers(id, req.user.userId);
  }

  @Get('profile/:id/following')
  getFollowing(@Param('id') id: string, @Req() req: AuthReq) {
    return this.socialService.getFollowing(id, req.user.userId);
  }

  @Post('follow/:id')
  follow(@Param('id') id: string, @Req() req: AuthReq) {
    return this.socialService.follow(req.user.userId, id);
  }

  @Delete('follow/:id')
  unfollow(@Param('id') id: string, @Req() req: AuthReq) {
    return this.socialService.unfollow(req.user.userId, id);
  }

  @Post('profile')
  updateProfile(@Req() req: AuthReq, @Body() body: any) {
    return this.socialService.updateProfile(req.user.userId, body);
  }

  @Post('profile/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Req() req: AuthReq,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.socialService.uploadAvatar(req.user.userId, file);
  }
}
