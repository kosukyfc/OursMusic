import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GoogleTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Returns a valid Google access token for the user.
   * If the stored token is expired/invalid, uses the refresh token to get a new one
   * and persists it to the DB.
   */
  async getValidAccessToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user?.googleAccessToken) {
      throw new ForbiddenException(
        'Google Drive not connected. Please re-authenticate via /auth/google.',
      );
    }

    // Try a lightweight token validation — if it fails, refresh
    const valid = await this.isTokenValid(user.googleAccessToken);
    if (valid) return user.googleAccessToken;

    // Token expired — use refresh token
    if (!user.googleRefreshToken) {
      throw new ForbiddenException(
        'Google token expired and no refresh token available. Please re-authenticate via /auth/google.',
      );
    }

    const newToken = await this.refreshAccessToken(user.googleRefreshToken);

    // Persist the new access token
    await this.prisma.user.update({
      where: { id: userId },
      data: { googleAccessToken: newToken },
    });

    return newToken;
  }

  private async isTokenValid(accessToken: string): Promise<boolean> {
    try {
      const res = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`,
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  private async refreshAccessToken(refreshToken: string): Promise<string> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ForbiddenException(
        `Failed to refresh Google token: ${(err as any).error_description ?? res.statusText}. Please re-authenticate via /auth/google.`,
      );
    }

    const data = await res.json();
    return data.access_token;
  }
}
