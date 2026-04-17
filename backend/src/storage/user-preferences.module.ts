import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UserPreferencesService } from './user-preferences.service';
import { PreferencesController } from './preferences.controller';

@Module({
  imports: [PrismaModule],
  providers: [UserPreferencesService],
  controllers: [PreferencesController],
  exports: [UserPreferencesService],
})
export class UserPreferencesModule {}
