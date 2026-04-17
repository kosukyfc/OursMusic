import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HeatmapService } from './heatmap.service';
import { HeatmapController } from './heatmap.controller';

@Module({
  imports: [PrismaModule],
  providers: [HeatmapService],
  controllers: [HeatmapController],
  exports: [HeatmapService],
})
export class HeatmapModule {}
