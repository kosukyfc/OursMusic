import { Module } from '@nestjs/common';
import { OfflineService } from './offline.service';
import { OfflineController } from './offline.controller';
import { OfflineScheduler } from './offline.scheduler';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [OfflineService, OfflineScheduler],
  controllers: [OfflineController],
})
export class OfflineModule {}
