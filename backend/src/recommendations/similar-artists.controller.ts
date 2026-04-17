import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ArtistRelationshipService } from './artist-relationship.service';

@Controller('artists/similar')
export class SimilarArtistsController {
  constructor(private relationshipService: ArtistRelationshipService) {}

  @Get(':artistId')
  async getSimilarArtists(@Param('artistId') artistId: string) {
    return this.relationshipService.findSimilarArtists(artistId);
  }

  @Get(':artistId/chain')
  async getChain(@Param('artistId') artistId: string) {
    return this.relationshipService.buildRelationshipChain(artistId, 3);
  }

  @Post(':artistId/relate/:relatedId')
  @UseGuards(JwtAuthGuard)
  async addRelationship(
    @Param('artistId') artistId: string,
    @Param('relatedId') relatedId: string,
    @Body() body: { similarity: number },
  ) {
    return this.relationshipService.addRelationship(artistId, relatedId, body.similarity);
  }
}
