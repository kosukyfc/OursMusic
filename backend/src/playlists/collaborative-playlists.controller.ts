import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { CollaborativePlaylistsService } from './collaborative-playlists.service';

@ApiTags('Collaborative Playlists')
@Controller('api/v1/playlists')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class CollaborativePlaylistsController {
  constructor(private service: CollaborativePlaylistsService) {}

  /**
   * Invite collaborator to playlist
   */
  @Post(':playlistId/invite')
  @ApiOperation({ summary: 'Invite user to collaborate on playlist' })
  async inviteCollaborator(
    @Param('playlistId') playlistId: string,
    @Body() body: { collaboratorId: string },
    @Req() req: any,
  ) {
    return this.service.inviteCollaborator(playlistId, body.collaboratorId, req.user.sub);
  }

  /**
   * Get playlist collaborators
   */
  @Get(':playlistId/collaborators')
  @ApiOperation({ summary: 'Get collaborators for playlist' })
  async getCollaborators(@Param('playlistId') playlistId: string) {
    return this.service.getCollaborators(playlistId);
  }
}
