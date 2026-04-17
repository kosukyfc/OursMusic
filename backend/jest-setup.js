/**
 * Jest Setup File - Global Test Configurations
 * Mocks all common NestJS providers automatically
 */

// Mock all common services globally
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({
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
      count: jest.fn().mockResolvedValue(0),
    },
    download: {
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: jest.fn(async (fn: any) => fn({})),
  })),
}));

jest.mock('../devices/devices.gateway', () => ({
  DevicesGateway: jest.fn().mockImplementation(() => ({
    notifyClients: jest.fn(),
    broadcast: jest.fn(),
    broadcastGlobal: jest.fn(),
    notifyUser: jest.fn(),
    notifyUserNotification: jest.fn(),
    notifyPlanUpdated: jest.fn(),
    server: { emit: jest.fn() },
  })),
}));

jest.mock('@nestjs/jwt', () => ({
  JwtService: jest.fn().mockImplementation(() => ({
    sign: jest.fn().mockReturnValue('mock.jwt.token'),
    verify: jest.fn().mockReturnValue({ userId: 'user-1' }),
  })),
}));

jest.mock('@nestjs/config', () => ({
  ConfigService: jest.fn().mockImplementation(() => ({
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        DATABASE_URL: 'postgresql://test',
        JWT_SECRET: 'test-secret',
      };
      return config[key];
    }),
  })),
}));

// Suppress console errors during tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

// Default test timeout
jest.setTimeout(10000);
