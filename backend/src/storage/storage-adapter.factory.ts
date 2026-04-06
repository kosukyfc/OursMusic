import { Injectable, Inject, ServiceUnavailableException } from '@nestjs/common';
import { StorageType } from '@prisma/client';
import { StorageAdapter } from './storage.interface';
import { S3_ADAPTER, NAS_ADAPTER, DRIVE_ADAPTER } from './storage.tokens';
import { S3Adapter } from './adapters/s3.adapter';
import { NasAdapter } from './adapters/nas.adapter';
import { DriveAdapter } from './adapters/drive.adapter';

@Injectable()
export class StorageAdapterFactory {
  constructor(
    @Inject(S3_ADAPTER) private readonly s3Adapter: S3Adapter,
    @Inject(NAS_ADAPTER) private readonly nasAdapter: NasAdapter,
    @Inject(DRIVE_ADAPTER) private readonly driveAdapter: DriveAdapter,
  ) {}

  getAdapter(storageType: StorageType): StorageAdapter {
    switch (storageType) {
      case StorageType.s3:
        return this.s3Adapter;
      case StorageType.nas:
        return this.nasAdapter;
      case StorageType.drive:
        return this.driveAdapter;
      default:
        throw new ServiceUnavailableException(
          `No storage adapter available for storage type: ${storageType}`,
        );
    }
  }
}
