import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { StorageModule } from '../storage/storage.module';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [ConfigModule, StorageModule, DevicesModule],
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
