import { Module } from '@nestjs/common';
import { CollaborativePlaylistsService } from './collaborative-playlists.service';
import { CollaborativePlaylistsGateway } from './collaborative-playlists.gateway';
import { CollaborativePlaylistsController } from './collaborative-playlists.controller';

@Module({
  providers: [CollaborativePlaylistsService, CollaborativePlaylistsGateway],
  controllers: [CollaborativePlaylistsController],
  exports: [CollaborativePlaylistsService],
})
export class CollaborativePlaylistsModule {}
