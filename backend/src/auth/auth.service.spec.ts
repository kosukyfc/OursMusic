import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';

import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── In-memory store types ───────────────────────────────────────────────────

interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  plan: string;
  googleAccessToken: string | null;
  googleRefreshToken: string | null;
}

interface RefreshTokenRecord {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

// ─── Shared in-memory stores (reset between runs) ────────────────────────────

let users: Map<string, UserRecord>;
let refreshTokens: Map<string, RefreshTokenRecord>;

function resetStores() {
  users = new Map();
  refreshTokens = new Map();
}

// ─── Mock factories ──────────────────────────────────────────────────────────

function makePrismaMock() {
  return {
    user: {
      findUnique({ where }: { where: { email?: string; id?: string } }) {
        if (where.email) {
          for (const u of users.values()) {
            if (u.email === where.email) return Promise.resolve(u);
          }
          return Promise.resolve(null);
        }
        if (where.id) {
          return Promise.resolve(users.get(where.id) ?? null);
        }
        return Promise.resolve(null);
      },
      create({ data }: { data: Partial<UserRecord> }) {
        const id = uuidv4();
        const user: UserRecord = {
          id,
          email: data.email!,
          passwordHash: data.passwordHash!,
          name: data.name ?? null,
          plan: 'free',
          googleAccessToken: data.googleAccessToken ?? null,
          googleRefreshToken: data.googleRefreshToken ?? null,
        };
        users.set(id, user);
        return Promise.resolve(user);
      },
      upsert({
        where,
        update,
        create,
      }: {
        where: { email: string };
        update: Partial<UserRecord>;
        create: Partial<UserRecord>;
      }) {
        for (const u of users.values()) {
          if (u.email === where.email) {
            Object.assign(u, update);
            return Promise.resolve(u);
          }
        }
        const id = uuidv4();
        const user: UserRecord = {
          id,
          email: create.email!,
          passwordHash: create.passwordHash ?? '',
          name: create.name ?? null,
          plan: 'free',
          googleAccessToken: create.googleAccessToken ?? null,
          googleRefreshToken: create.googleRefreshToken ?? null,
        };
        users.set(id, user);
        return Promise.resolve(user);
      },
    },
    refreshToken: {
      findUnique({ where }: { where: { token: string } }) {
        for (const rt of refreshTokens.values()) {
          if (rt.token === where.token) return Promise.resolve(rt);
        }
        return Promise.resolve(null);
      },
      create({ data }: { data: Partial<RefreshTokenRecord> }) {
        const id = uuidv4();
        const rt: RefreshTokenRecord = {
          id,
          userId: data.userId!,
          token: data.token!,
          expiresAt: data.expiresAt!,
        };
        refreshTokens.set(id, rt);
        return Promise.resolve(rt);
      },
    },
  };
}

function makeJwtMock() {
  return {
    sign: (_payload: object, _opts?: object) => 'mock.jwt.token',
    verify: (_token: string) => ({}),
  };
}

function makeConfigMock() {
  return {
    get: (key: string, defaultVal?: string) => {
      if (key === 'JWT_SECRET') return 'test-secret';
      if (key === 'JWT_EXPIRES_IN') return defaultVal ?? '15m';
      return defaultVal ?? null;
    },
  };
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('AuthService — Property-Based Tests', () => {
  let service: AuthService;

  beforeEach(async () => {
    resetStores();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: makePrismaMock() },
        { provide: JwtService, useValue: makeJwtMock() },
        { provide: ConfigService, useValue: makeConfigMock() },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── Property 1: Registration creates a user and returns a JWT ──────────────
  // Feature: music-streaming-app, Property 1: Registration creates a user and returns a JWT
  it('Property 1 — register() returns access_token, refresh_token, and user.id for any unique email + password ≥ 8 chars', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8 }),
        async (email, password) => {
          resetStores();

          const result = await service.register({ email, password });

          expect(typeof result.access_token).toBe('string');
          expect(result.access_token.length).toBeGreaterThan(0);
          expect(typeof result.refresh_token).toBe('string');
          expect(result.refresh_token.length).toBeGreaterThan(0);
          expect(typeof result.user.id).toBe('string');
          expect(result.user.id.length).toBeGreaterThan(0);
          expect(result.user.email).toBe(email);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ── Property 2: Duplicate email registration is rejected ──────────────────
  // Feature: music-streaming-app, Property 2: Duplicate email registration is rejected
  it('Property 2 — register() throws ConflictException (409) when email already exists', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8 }),
        fc.string({ minLength: 8 }),
        async (email, password1, password2) => {
          resetStores();

          // First registration should succeed
          await service.register({ email, password: password1 });

          // Second registration with same email must throw ConflictException
          await expect(service.register({ email, password: password2 })).rejects.toThrow(
            ConflictException,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // ── Property 3: Valid login returns both tokens ────────────────────────────
  // Feature: music-streaming-app, Property 3: Valid login returns both tokens
  it('Property 3 — login() returns access_token and refresh_token for any registered user with correct password', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8 }),
        async (email, password) => {
          resetStores();

          await service.register({ email, password });
          const result = await service.login({ email, password });

          expect(typeof result.access_token).toBe('string');
          expect(result.access_token.length).toBeGreaterThan(0);
          expect(typeof result.refresh_token).toBe('string');
          expect(result.refresh_token.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ── Property 4: Invalid credentials are rejected ──────────────────────────
  // Feature: music-streaming-app, Property 4: Invalid credentials are rejected
  it('Property 4a — login() throws UnauthorizedException when email does not exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8 }),
        async (email, password) => {
          resetStores();
          // No registration — email does not exist
          await expect(service.login({ email, password })).rejects.toThrow(
            UnauthorizedException,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 4b — login() throws UnauthorizedException when password does not match', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8 }),
        fc.string({ minLength: 8 }),
        async (email, correctPassword, wrongPassword) => {
          fc.pre(correctPassword !== wrongPassword);
          resetStores();

          await service.register({ email, password: correctPassword });
          await expect(service.login({ email, password: wrongPassword })).rejects.toThrow(
            UnauthorizedException,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // ── Property 5: Refresh token round-trip ──────────────────────────────────
  // Feature: music-streaming-app, Property 5: Refresh token round-trip
  it('Property 5a — refresh() returns a new access_token for any valid non-expired refresh token', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8 }),
        async (email, password) => {
          resetStores();

          const { refresh_token } = await service.register({ email, password });
          const result = await service.refresh({ refresh_token });

          expect(typeof result.access_token).toBe('string');
          expect(result.access_token.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 5b — refresh() throws UnauthorizedException for any invalid refresh token', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (invalidToken) => {
          resetStores();
          // No token stored — any random string is invalid
          await expect(service.refresh({ refresh_token: invalidToken })).rejects.toThrow(
            UnauthorizedException,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 5c — refresh() throws UnauthorizedException for an expired refresh token', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8 }),
        async (email, password) => {
          resetStores();

          const { refresh_token } = await service.register({ email, password });

          // Manually expire the token in the in-memory store
          for (const rt of refreshTokens.values()) {
            if (rt.token === refresh_token) {
              rt.expiresAt = new Date(Date.now() - 1000); // 1 second in the past
            }
          }

          await expect(service.refresh({ refresh_token })).rejects.toThrow(
            UnauthorizedException,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // ── Property 6: Passwords are never stored in plaintext ───────────────────
  // Feature: music-streaming-app, Property 6: Passwords are never stored in plaintext
  it('Property 6 — stored passwordHash never equals plaintext and is a valid bcrypt hash', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8 }),
        async (email, password) => {
          resetStores();

          await service.register({ email, password });

          // Find the stored user record from the in-memory store
          let storedUser: UserRecord | undefined;
          for (const u of users.values()) {
            if (u.email === email) {
              storedUser = u;
              break;
            }
          }

          expect(storedUser).toBeDefined();
          expect(storedUser!.passwordHash).not.toBe(password);
          // Valid bcrypt hash starts with $2b$ or $2a$
          expect(storedUser!.passwordHash).toMatch(/^\$2[ab]\$/);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ── Property 7: Google OAuth2 token exchange stores tokens on user ─────────
  // Feature: music-streaming-app, Property 7: Google OAuth2 token exchange stores tokens on user
  it('Property 7 — googleOAuthCallback() returns access_token and user with non-null id, and stores Google tokens', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        async (email, googleId, name, accessToken, refreshToken) => {
          resetStores();

          const result = await service.googleOAuthCallback({
            googleId,
            email,
            name,
            accessToken,
            refreshToken,
          });

          expect(typeof result.access_token).toBe('string');
          expect(result.access_token.length).toBeGreaterThan(0);
          expect(typeof result.user.id).toBe('string');
          expect(result.user.id.length).toBeGreaterThan(0);

          // Verify Google tokens are stored on the user record
          const storedUser = users.get(result.user.id);
          expect(storedUser).toBeDefined();
          expect(storedUser!.googleAccessToken).toBe(accessToken);
          expect(storedUser!.googleRefreshToken).toBe(refreshToken);
        },
      ),
      { numRuns: 100 },
    );
  });
});
