import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { S3Adapter } from './s3.adapter';
import { NasAdapter } from './nas.adapter';
import { DriveAdapter } from './drive.adapter';
import { StorageAdapter, StorageFile } from '../storage.interface';

// ─── Mock @aws-sdk/client-s3 ─────────────────────────────────────────────────

const mockS3Send = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  GetObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  ListObjectsV2Command: jest.fn().mockImplementation((input) => ({ input })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/signed-url'),
}));

// ─── Mock fs/promises ────────────────────────────────────────────────────────

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn().mockResolvedValue([
    { name: 'track.mp3', isFile: () => true },
  ]),
  stat: jest.fn().mockResolvedValue({ size: 1024 }),
}));

// ─── Mock googleapis ─────────────────────────────────────────────────────────

const mockFilesCreate = jest.fn().mockResolvedValue({ data: { id: 'drive-file-id' } });
const mockFilesDelete = jest.fn().mockResolvedValue({});
const mockFilesList = jest.fn().mockResolvedValue({
  data: {
    files: [{ id: 'file-1', name: 'song.mp3', size: '2048', mimeType: 'audio/mpeg' }],
    nextPageToken: undefined,
  },
});

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
      })),
    },
    drive: jest.fn().mockReturnValue({
      files: {
        create: mockFilesCreate,
        delete: mockFilesDelete,
        list: mockFilesList,
      },
    }),
  },
}));

// ─── Shared ConfigService mock ───────────────────────────────────────────────

function makeConfigMock() {
  return {
    get: (key: string, defaultVal?: string) => {
      const config: Record<string, string> = {
        AWS_REGION: 'us-east-1',
        AWS_ACCESS_KEY_ID: 'test-key-id',
        AWS_SECRET_ACCESS_KEY: 'test-secret',
        S3_BUCKET_NAME: 'test-bucket',
        NAS_BASE_PATH: '/mnt/nas/music',
        NAS_SIGNING_SECRET: 'nas-secret',
      };
      return config[key] ?? defaultVal ?? null;
    },
  };
}

// ─── S3Adapter Tests ─────────────────────────────────────────────────────────

describe('S3Adapter', () => {
  let adapter: S3Adapter;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockS3Send.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Adapter,
        { provide: ConfigService, useValue: makeConfigMock() },
      ],
    }).compile();

    adapter = module.get<S3Adapter>(S3Adapter);
  });

  // Requirement 15.1 — S3Adapter implements StorageAdapter interface
  it('implements the StorageAdapter interface (has upload, getSignedUrl, delete, listFiles)', () => {
    expect(typeof adapter.upload).toBe('function');
    expect(typeof adapter.getSignedUrl).toBe('function');
    expect(typeof adapter.delete).toBe('function');
    expect(typeof adapter.listFiles).toBe('function');
  });

  it('upload() returns a string (the storage path)', async () => {
    const result = await adapter.upload(Buffer.from('audio'), 'songs/track.mp3', 'audio/mpeg');
    expect(typeof result).toBe('string');
    expect(result).toBe('songs/track.mp3');
  });

  it('getSignedUrl() returns a string URL', async () => {
    const result = await adapter.getSignedUrl('songs/track.mp3', 60);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('delete() returns void (Promise<void>)', async () => {
    const result = await adapter.delete('songs/track.mp3');
    expect(result).toBeUndefined();
  });

  it('listFiles() returns an array of StorageFile objects', async () => {
    mockS3Send.mockResolvedValueOnce({
      Contents: [{ Key: 'songs/track.mp3', Size: 1024 }],
      NextContinuationToken: undefined,
    });

    const result = await adapter.listFiles('songs/');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    const file: StorageFile = result[0];
    expect(typeof file.path).toBe('string');
    expect(typeof file.size).toBe('number');
    expect(typeof file.mimeType).toBe('string');
  });

  it('listFiles() returns empty array when bucket has no contents', async () => {
    mockS3Send.mockResolvedValueOnce({ Contents: undefined, NextContinuationToken: undefined });
    const result = await adapter.listFiles('empty/');
    expect(result).toEqual([]);
  });

  it('satisfies the StorageAdapter interface type', () => {
    // TypeScript structural check — assign to interface type
    const typed: StorageAdapter = adapter;
    expect(typed).toBeDefined();
  });
});

// ─── NasAdapter Tests ────────────────────────────────────────────────────────

describe('NasAdapter', () => {
  let adapter: NasAdapter;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NasAdapter,
        { provide: ConfigService, useValue: makeConfigMock() },
      ],
    }).compile();

    adapter = module.get<NasAdapter>(NasAdapter);
  });

  // Requirement 15.1 — NasAdapter implements StorageAdapter interface
  it('implements the StorageAdapter interface (has upload, getSignedUrl, delete, listFiles)', () => {
    expect(typeof adapter.upload).toBe('function');
    expect(typeof adapter.getSignedUrl).toBe('function');
    expect(typeof adapter.delete).toBe('function');
    expect(typeof adapter.listFiles).toBe('function');
  });

  it('upload() returns a string (the relative file path)', async () => {
    const result = await adapter.upload(Buffer.from('audio'), 'songs/track.mp3', 'audio/mpeg');
    expect(typeof result).toBe('string');
    expect(result).toBe('songs/track.mp3');
  });

  it('getSignedUrl() returns a string URL containing the path and token', async () => {
    const result = await adapter.getSignedUrl('songs/track.mp3', 60);
    expect(typeof result).toBe('string');
    expect(result).toContain('nas-stream');
    expect(result).toContain('token=');
    expect(result).toContain('expires=');
  });

  it('delete() returns void (Promise<void>)', async () => {
    const result = await adapter.delete('songs/track.mp3');
    expect(result).toBeUndefined();
  });

  it('listFiles() returns an array of StorageFile objects', async () => {
    const result = await adapter.listFiles('songs');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    const file: StorageFile = result[0];
    expect(typeof file.path).toBe('string');
    expect(typeof file.size).toBe('number');
    expect(typeof file.mimeType).toBe('string');
  });

  it('satisfies the StorageAdapter interface type', () => {
    const typed: StorageAdapter = adapter;
    expect(typed).toBeDefined();
  });
});

// ─── DriveAdapter Tests ──────────────────────────────────────────────────────

describe('DriveAdapter', () => {
  let adapter: DriveAdapter;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [DriveAdapter],
    }).compile();

    adapter = module.get<DriveAdapter>(DriveAdapter);
    // DriveAdapter requires an access token before use
    adapter.setAccessToken('test-access-token');
  });

  // Requirement 15.1 — DriveAdapter implements StorageAdapter interface
  it('implements the StorageAdapter interface (has upload, getSignedUrl, delete, listFiles)', () => {
    expect(typeof adapter.upload).toBe('function');
    expect(typeof adapter.getSignedUrl).toBe('function');
    expect(typeof adapter.delete).toBe('function');
    expect(typeof adapter.listFiles).toBe('function');
  });

  it('upload() returns a string (the Drive file ID)', async () => {
    const result = await adapter.upload(Buffer.from('audio'), 'track.mp3', 'audio/mpeg');
    expect(typeof result).toBe('string');
    expect(result).toBe('drive-file-id');
  });

  it('getSignedUrl() returns a string URL containing the file ID and access token', async () => {
    const result = await adapter.getSignedUrl('drive-file-id', 60);
    expect(typeof result).toBe('string');
    expect(result).toContain('drive-file-id');
    expect(result).toContain('access_token=');
  });

  it('delete() returns void (Promise<void>)', async () => {
    const result = await adapter.delete('drive-file-id');
    expect(result).toBeUndefined();
  });

  it('listFiles() returns an array of StorageFile objects', async () => {
    const result = await adapter.listFiles('');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    const file: StorageFile = result[0];
    expect(typeof file.path).toBe('string');
    expect(typeof file.size).toBe('number');
    expect(typeof file.mimeType).toBe('string');
  });

  it('listFiles() returns empty array when Drive has no files', async () => {
    mockFilesList.mockResolvedValueOnce({ data: { files: [], nextPageToken: undefined } });
    const result = await adapter.listFiles('');
    expect(result).toEqual([]);
  });

  it('throws when used before setAccessToken() is called', () => {
    const uninitialised = new DriveAdapter();
    expect(() => uninitialised['getDrive']()).toThrow('Access token not set');
  });

  it('satisfies the StorageAdapter interface type', () => {
    const typed: StorageAdapter = adapter;
    expect(typed).toBeDefined();
  });
});
