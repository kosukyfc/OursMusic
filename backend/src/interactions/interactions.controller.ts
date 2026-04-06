import { Controller, Get, Post, Delete, Param, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { InteractionsService } from './interactions.service';

type AuthReq = Request & { user: { userId: string } };

@Controller('songs/:songId/interactions')
export class InteractionsController {
  constructor(private readonly svc: InteractionsService) {}

  /** GET /songs/:id/interactions — stats + user state */
  @Get()
  getStats(@Param('songId') songId: string, @Req() req: AuthReq) {
    return this.svc.getStats(songId, req.user.userId);
  }

  /** POST /songs/:id/interactions/like */
  @Post('like')
  like(@Param('songId') songId: string, @Req() req: AuthReq) {
    return this.svc.setLike(songId, req.user.userId, 'like');
  }

  /** POST /songs/:id/interactions/dislike */
  @Post('dislike')
  dislike(@Param('songId') songId: string, @Req() req: AuthReq) {
    return this.svc.setLike(songId, req.user.userId, 'dislike');
  }

  /** DELETE /songs/:id/interactions/like — remove like/dislike */
  @Delete('like')
  removeLike(@Param('songId') songId: string, @Req() req: AuthReq) {
    return this.svc.removeLike(songId, req.user.userId);
  }

  /** GET /songs/:id/interactions/comments */
  @Get('comments')
  getComments(@Param('songId') songId: string) {
    return this.svc.getComments(songId);
  }

  /** POST /songs/:id/interactions/comments */
  @Post('comments')
  addComment(
    @Param('songId') songId: string,
    @Body('text') text: string,
    @Req() req: AuthReq,
  ) {
    return this.svc.addComment(songId, req.user.userId, text);
  }

  /** DELETE /songs/:id/interactions/comments/:commentId */
  @Delete('comments/:commentId')
  deleteComment(
    @Param('commentId') commentId: string,
    @Req() req: AuthReq,
  ) {
    return this.svc.deleteComment(commentId, req.user.userId);
  }

  /** POST /songs/:id/interactions/save — toggle favorite */
  @Post('save')
  toggleSave(@Param('songId') songId: string, @Req() req: AuthReq) {
    return this.svc.toggleSave(songId, req.user.userId);
  }
}
