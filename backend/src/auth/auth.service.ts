import { BadGatewayException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, RefreshDto } from './dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // 1. Check for duplicate email
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    // 2. Hash password with bcrypt cost 12
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // 3. Create user record
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
      },
    });

    // 4. Generate JWT (15 min TTL)
    const secret = this.configService.get<string>('JWT_SECRET');
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { secret, expiresIn },
    );

    // 5. Generate refresh token (UUID), store with 7-day expiry
    const refreshTokenValue = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenValue,
        expiresAt,
      },
    });

    // 6. Return tokens + user info
    return {
      access_token: accessToken,
      refresh_token: refreshTokenValue,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        isAdmin: user.isAdmin,
      },
    };
  }

  async login(dto: LoginDto) {
    // 1. Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Verify password with bcrypt
    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Generate JWT (15 min TTL)
    const secret = this.configService.get<string>('JWT_SECRET');
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { secret, expiresIn },
    );

    // 4. Generate refresh token (UUID), store with 7-day expiry
    const refreshTokenValue = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenValue,
        expiresAt,
      },
    });

    // 5. Return tokens + user info
    return {
      access_token: accessToken,
      refresh_token: refreshTokenValue,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        isAdmin: user.isAdmin,
      },
    };
  }

  async googleOAuthCallback(googleUser: {
    googleId: string;
    email: string;
    name: string;
    accessToken: string;
    refreshToken: string;
  }) {
    try {
      // 1. Find or create user by email (upsert) — preserve isAdmin and plan on update
      const user = await this.prisma.user.upsert({
        where: { email: googleUser.email },
        update: {
          googleAccessToken: googleUser.accessToken,
          googleRefreshToken: googleUser.refreshToken,
          name: googleUser.name,
          // Never downgrade isAdmin or plan on OAuth re-login
        },
        create: {
          email: googleUser.email,
          name: googleUser.name,
          passwordHash: '',
          googleAccessToken: googleUser.accessToken,
          googleRefreshToken: googleUser.refreshToken,
        },
      });

      // 2. Generate JWT (15 min TTL)
      const secret = this.configService.get<string>('JWT_SECRET');
      const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
      const accessToken = this.jwtService.sign(
        { sub: user.id, email: user.email },
        { secret, expiresIn },
      );

      // 3. Return access token + user info
      return {
        access_token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          isAdmin: user.isAdmin,
        },
      };
    } catch (err) {
      if (err instanceof BadGatewayException) throw err;
      throw new BadGatewayException('Google OAuth2 exchange failed');
    }
  }

  async refresh(dto: RefreshDto) {
    // 1. Find refresh token record by token value
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refresh_token },
    });
    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 2. Check expiry
    if (tokenRecord.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // 3. Find the associated user
    const user = await this.prisma.user.findUnique({
      where: { id: tokenRecord.userId },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 4. Generate new JWT (15 min TTL)
    const secret = this.configService.get<string>('JWT_SECRET');
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { secret, expiresIn },
    );

    // 5. Return new access token (refresh token stays valid until natural expiry)
    return { access_token: accessToken };
  }
}
