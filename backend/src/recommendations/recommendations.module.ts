import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';
import { ArtistRelationshipService } from './artist-relationship.service';
import { SmartQueueService } from './smart-queue.service';
import { SimilarArtistsController } from './similar-artists.controller';
import { SmartQueueController } from './smart-queue.controller';

@Module({
  imports: [PrismaModule],
  controllers: [RecommendationsController, SimilarArtistsController, SmartQueueController],
  providers: [RecommendationsService, ArtistRelationshipService, SmartQueueService],
  exports: [RecommendationsService, ArtistRelationshipService, SmartQueueService],
})
export class RecommendationsModule {}
