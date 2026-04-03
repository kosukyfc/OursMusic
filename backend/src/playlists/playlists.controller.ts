import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PlaylistsService } from './playlists.service';
import {
  CreatePlaylistDto,
  UpdatePlaylistDto,
  AddSongDto,
  ReorderPlaylistDto,
} from './dto/playlist.dto';

type AuthReq = Request & { user: { userId: string } };

@Controller('playlists')
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Post()
  create(@Req() req: AuthReq, @Body() dto: CreatePlaylistDto) {
    return this.playlistsService.create(req.user.userId, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthReq) {
    return this.playlistsService.findOne(id, req.user.userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Req() req: AuthReq, @Body() dto: UpdatePlaylistDto) {
    return this.playlistsService.update(id, req.user.userId, dto);
  }

  @Post(':id/songs')
  addSong(@Param('id') id: string, @Req() req: AuthReq, @Body() dto: AddSongDto) {
    return this.playlistsService.addSong(id, req.user.userId, dto.songId);
  }

  @Put(':id/reorder')
  reorder(@Param('id') id: string, @Req() req: AuthReq, @Body() dto: ReorderPlaylistDto) {
    return this.playlistsService.reorder(id, req.user.userId, dto.songs);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthReq) {
    return this.playlistsService.remove(id, req.user.userId);
  }
}
