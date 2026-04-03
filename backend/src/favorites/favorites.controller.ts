import { Controller, Post, Delete, Get, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { FavoritesService } from './favorites.service';

type AuthReq = Request & { user: { userId: string } };

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post(':songId')
  add(@Param('songId') songId: string, @Req() req: AuthReq) {
    return this.favoritesService.add(req.user.userId, songId);
  }

  @Delete(':songId')
  remove(@Param('songId') songId: string, @Req() req: AuthReq) {
    return this.favoritesService.remove(req.user.userId, songId);
  }

  @Get()
  list(@Req() req: AuthReq) {
    return this.favoritesService.list(req.user.userId);
  }
}
