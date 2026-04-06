import * as fc from 'fast-check';
import { ServiceUnavailableException } from '@nestjs/common';
import { StorageAdapterFactory } from './storage-adapter.factory';
import { StorageAdapter, StorageFile } from './storage.interface';

// StorageType values mirror the Prisma enum (s3 | nas | drive).
// We redeclare them here so the test file compiles without a generated Prisma client.
const StorageType = { s3: 's3', nas: 'nas', drive: 'drive' } as const;
type StorageType = (typeof StorageType)[keyof typeof StorageType];

// ─── Mock adapters with unique identifiers ────────────────────────────────────

class MockS3Adapter implements StorageAdapter {
  readonly adapterId = 's3';
  async upload(_file: Buffer, path: string, _mimeType: string): Promise<string> { return path; }
  async getSignedUrl(path: string, _ttl: number): Promise<string> { return `https://s3/${path}`; }
  async delete(_path: string): Promise<void> {}
  async listFiles(_prefix: string): Promise<StorageFile[]> { return []; }
}

class MockNasAdapter implements StorageAdapter {
  readonly adapterId = 'nas';
  async upload(_file: Buffer, path: string, _mimeType: string): Promise<string> { return path; }
  async getSignedUrl(path: string, _ttl: number): Promise<string> { return `https://nas/${path}`; }
  async delete(_path: string): Promise<void> {}
  async listFiles(_prefix: string): Promise<StorageFile[]> { return []; }
}

class MockDriveAdapter implements StorageAdapter {
  readonly adapterId = 'drive';
  async upload(_file: Buffer, path: string, _mimeType: string): Promise<string> { return path; }
  async getSignedUrl(path: string, _ttl: number): Promise<string> { return `https://drive/${path}`; }
  async delete(_path: string): Promise<void> {}
  async listFiles(_prefix: string): Promise<StorageFile[]> { return []; }
}

// ─── Factory helper ───────────────────────────────────────────────────────────

function makeFactory() {
  const s3 = new MockS3Adapter();
  const nas = new MockNasAdapter();
  const drive = new MockDriveAdapter();
  // Bypass NestJS DI — inject mocks directly via constructor
  const factory = new StorageAdapterFactory(s3 as any, nas as any, drive as any);
  return { factory, s3, nas, drive };
}

// ─── Property 30: Storage adapter is selected by song.storage_type ────────────

// Feature: music-streaming-app, Property 30: Storage adapter is selected by song.storage_type
describe('StorageAdapterFactory — Property 30', () => {
  // **Validates: Requirements 15.2**
  it('returns the correct adapter for every StorageType (never a different one)', () => {
    const { factory, s3, nas, drive } = makeFactory();

    fc.assert(
      fc.property(
        fc.constantFrom(StorageType.s3, StorageType.nas, StorageType.drive),
        (storageType) => {
          const adapter = factory.getAdapter(storageType as any);

          if (storageType === StorageType.s3) {
            expect(adapter).toBe(s3);
            expect((adapter as any).adapterId).toBe('s3');
            expect((adapter as any).adapterId).not.toBe('nas');
            expect((adapter as any).adapterId).not.toBe('drive');
          } else if (storageType === StorageType.nas) {
            expect(adapter).toBe(nas);
            expect((adapter as any).adapterId).toBe('nas');
            expect((adapter as any).adapterId).not.toBe('s3');
            expect((adapter as any).adapterId).not.toBe('drive');
          } else {
            expect(adapter).toBe(drive);
            expect((adapter as any).adapterId).toBe('drive');
            expect((adapter as any).adapterId).not.toBe('s3');
            expect((adapter as any).adapterId).not.toBe('nas');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('throws ServiceUnavailableException for an unknown storage type', () => {
    const { factory } = makeFactory();
    expect(() => factory.getAdapter('unknown' as any)).toThrow(ServiceUnavailableException);
  });
});
