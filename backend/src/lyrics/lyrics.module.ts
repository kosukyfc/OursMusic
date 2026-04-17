import { Module } from '@nestjs/common';
import { LyricsService } from './lyrics.service';
import { LyricsController } from './lyrics.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [LyricsController],
  providers: [LyricsService],
  exports: [LyricsService],
})
export class LyricsModule {}
