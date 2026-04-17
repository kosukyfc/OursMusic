import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SetlistPersistenceService, CreateSetlistDto, AddSongDto } from './setlist-persistence.service';

@Controller('setlists')
export class SetlistController {
  constructor(private setlistService: SetlistPersistenceService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getSetlists(@Request() req) {
    return this.setlistService.getSetlists(req.user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createSetlist(@Request() req, @Body() data: CreateSetlistDto) {
    return this.setlistService.createSetlist(req.user.id, data);
  }

  @Post(':id/songs')
  @UseGuards(JwtAuthGuard)
  async addSong(@Request() req, @Param('id') setlistId: string, @Body() data: AddSongDto) {
    return this.setlistService.addSongToSetlist(req.user.id, setlistId, data.songId);
  }

  @Delete(':id/songs/:songId')
  @UseGuards(JwtAuthGuard)
  async removeSong(@Request() req, @Param('id') setlistId: string, @Param('songId') songId: string) {
    return this.setlistService.removeSongFromSetlist(req.user.id, setlistId, songId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteSetlist(@Request() req, @Param('id') setlistId: string) {
    return this.setlistService.deleteSetlist(req.user.id, setlistId);
  }
}
