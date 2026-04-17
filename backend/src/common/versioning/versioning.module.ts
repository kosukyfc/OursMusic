import { Module } from '@nestjs/common';
import { VersioningMiddleware } from './versioning.middleware';

@Module({})
export class VersioningModule {
  configure(consumer: any) {
    consumer.apply(VersioningMiddleware).forRoutes('api/*');
  }
}
