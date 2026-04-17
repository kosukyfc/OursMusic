/**
 * Test Mocks Factory
 * Centralized mock creation for all test files
 */

export const createMockPrisma = () => ({
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  },
  song: {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  },
  playlist: {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  download: {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
  favorite: {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    delete: jest.fn(),
  },
  activityLog: {
    create: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  },
  device: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(async (fn: any) => fn(module.exports.createMockPrisma())),
});

export const createMockDevicesGateway = () => ({
  notifyClients: jest.fn(),
  broadcast: jest.fn(),
  broadcastGlobal: jest.fn(),
  notifyUser: jest.fn(),
  notifyUserNotification: jest.fn(),
  notifyPlanUpdated: jest.fn(),
  server: { emit: jest.fn() },
});

export const createMockAuthService = () => ({
  register: jest.fn().mockResolvedValue({
    access_token: 'mock.access.token',
    refresh_token: 'mock.refresh.token',
    user: { id: 'user-1', email: 'test@example.com' },
  }),
  login: jest.fn().mockResolvedValue({
    access_token: 'mock.access.token',
    refresh_token: 'mock.refresh.token',
    user: { id: 'user-1', email: 'test@example.com' },
  }),
  validateToken: jest.fn().mockResolvedValue({ userId: 'user-1' }),
  refreshToken: jest.fn().mockResolvedValue({
    access_token: 'mock.new.access.token',
  }),
});

export const createMockJwtService = () => ({
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn().mockReturnValue({ userId: 'user-1' }),
  decode: jest.fn().mockReturnValue({ userId: 'user-1' }),
});

export const createMockConfigService = () => ({
  get: jest.fn((key: string) => {
    const config: Record<string, any> = {
      DATABASE_URL: 'postgresql://test',
      JWT_SECRET: 'test-secret',
      JWT_EXPIRATION: '24h',
      PORT: 3000,
      NODE_ENV: 'test',
    };
    return config[key];
  }),
});

export const createMockStorageService = () => ({
  uploadFile: jest.fn().mockResolvedValue({ url: 'https://storage.example.com/file' }),
  deleteFile: jest.fn().mockResolvedValue(true),
  getFile: jest.fn().mockResolvedValue(Buffer.from('file content')),
});

export const createMockAudioFeaturesService = () => ({
  extractFeatures: jest.fn().mockResolvedValue({
    tempo: 120,
    key: 'C',
    mode: 'major',
    loudness: -5,
  }),
  analyzeAudio: jest.fn().mockResolvedValue({
    duration: 180,
    sampleRate: 44100,
  }),
});

export const createMockSpotifyService = () => ({
  searchTracks: jest.fn().mockResolvedValue([]),
  getTrackDetails: jest.fn().mockResolvedValue({}),
  getUserPlaylists: jest.fn().mockResolvedValue([]),
});

export const createMockRecommendationService = () => ({
  getRecommendations: jest.fn().mockResolvedValue([]),
  scoreTrack: jest.fn().mockReturnValue(0.8),
});
