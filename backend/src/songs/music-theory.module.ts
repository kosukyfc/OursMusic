import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MusicTheoryService } from './music-theory.service';
import { MusicTheoryController } from './music-theory.controller';

@Module({
  imports: [PrismaModule],
  providers: [MusicTheoryService],
  controllers: [MusicTheoryController],
  exports: [MusicTheoryService],
})
export class MusicTheoryModule {}
