import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { MagicImportService } from './magic-import.service';
import { MagicImportSseController } from './magic-import-sse.controller';
import { SpotdlService } from './spotdl.service';
import { SpotdlController } from './spotdl.controller';
import { StorageModule } from '../storage/storage.module';
import { ImportModule } from '../import/import.module';
import { SpotifyModule } from '../spotify/spotify.module';
import { AuthModule } from '../auth/auth.module';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [StorageModule, ImportModule, SpotifyModule, AuthModule, DevicesModule],
  controllers: [AdminController, MagicImportSseController, SpotdlController],
  providers: [AdminService, MagicImportService, SpotdlService],
})
export class AdminModule {}
