import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SetlistPersistenceService } from './setlist-persistence.service';
import { SetlistController } from './setlist.controller';

@Module({
  imports: [PrismaModule],
  providers: [SetlistPersistenceService],
  controllers: [SetlistController],
  exports: [SetlistPersistenceService],
})
export class SetlistPersistenceModule {}
