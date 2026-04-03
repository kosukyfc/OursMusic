import { Module } from '@nestjs/common';
import { ImportService } from './import.service';
import { ImportController } from './import.controller';
import { StorageModule } from '../storage/storage.module';
import { AdminGuard } from '../auth/guards';

@Module({
  imports: [StorageModule],
  providers: [ImportService, AdminGuard],
  controllers: [ImportController],
  exports: [ImportService],
})
export class ImportModule {}
