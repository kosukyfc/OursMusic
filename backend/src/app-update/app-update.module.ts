import { Module } from '@nestjs/common';
import { AppUpdateController } from './app-update.controller';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [DevicesModule],
  controllers: [AppUpdateController],
})
export class AppUpdateModule {}
