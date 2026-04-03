import { Module } from '@nestjs/common';
import { S3_ADAPTER, NAS_ADAPTER, DRIVE_ADAPTER } from './storage.tokens';
import { S3Adapter } from './adapters/s3.adapter';
import { NasAdapter } from './adapters/nas.adapter';
import { DriveAdapter } from './adapters/drive.adapter';
import { StorageAdapterFactory } from './storage-adapter.factory';

@Module({
  providers: [
    { provide: S3_ADAPTER, useClass: S3Adapter },
    { provide: NAS_ADAPTER, useClass: NasAdapter },
    { provide: DRIVE_ADAPTER, useClass: DriveAdapter },
    StorageAdapterFactory,
  ],
  exports: [S3_ADAPTER, NAS_ADAPTER, DRIVE_ADAPTER, StorageAdapterFactory],
})
export class StorageModule {}
