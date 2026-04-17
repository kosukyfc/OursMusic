import { Module } from '@nestjs/common';
import { SongsService } from './songs.service';
import { SongsController } from './songs.controller';
import { NasStreamController } from './nas-stream.controller';
import { StorageModule } from '../storage/storage.module';
import { AdminGuard } from '../auth/guards';
import { AuthModule } from '../auth/auth.module';
import { AudioAnalysisService } from './audio-analysis.service';

@Module({
  imports: [StorageModule, AuthModule],
  providers: [SongsService, AdminGuard, AudioAnalysisService],
  controllers: [SongsController, NasStreamController],
  exports: [SongsService, AudioAnalysisService],
})
export class SongsModule {}
