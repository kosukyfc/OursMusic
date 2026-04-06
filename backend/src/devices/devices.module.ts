import { Module } from '@nestjs/common';
import { DevicesGateway } from './devices.gateway';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [AuthModule, ConfigModule],
  providers: [DevicesGateway],
  exports: [DevicesGateway],
})
export class DevicesModule {}
