import {
  BadGatewayException, BadRequestException, ConflictException,
  Injectable, UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDto, LoginDto, RefreshDto, ForgotPasswordDto, ResetPasswordDto } from "./dto";
import * as argon2 from "argon2";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { MailService } from "./mail.service";

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
};

@Injectable()
export class AuthService {
  private readonly pepper: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {
    this.pepper = this.configService.get("ARGON2_PEPPER", "change-me-in-production-32chars");
  }

  private async hashPassword(password: string): Promise<string> {
    return argon2.hash(password + this.pepper, ARGON2_OPTIONS);
  }

  private async verifyAndMigrate(userId: string, rawHash: string, password: string): Promise<boolean> {
    const hash = (rawHash ?? "").trim();
    if (hash.startsWith("$argon2")) {
      try { return await argon2.verify(hash, password + this.pepper); }
      catch { return false; }
    }
    if (hash.startsWith("$2b$") || hash.startsWith("$2a$")) {
      const ok = await bcrypt.compare(password, hash).catch(() => false);
      if (ok) {
        const newHash = await this.hashPassword(password);
        await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } }).catch(() => {});
      }
      return ok;
    }
    return false;
  }

  private generateOpaqueToken(): string {
    return randomBytes(48).toString("base64url");
  }

  private issueJwt(userId: string, email: string): string {
    const secret = this.configService.get("JWT_SECRET");
    const expiresIn = this.configService.get("JWT_EXPIRES_IN", "15m");
    return this.jwtService.sign({ sub: userId, email }, { secret, expiresIn });
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const token = this.generateOpaqueToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({ data: { userId, token, expiresAt } });
    return token;
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException("Email already in use");
    const username = (dto.username ?? '').trim().toLowerCase() || null;
    if (username) {
      const taken = await this.prisma.user.findUnique({ where: { username } });
      if (taken) {
        const suggestions = await this.suggestUsernames(username);
        throw new ConflictException({ message: `O username @${username} ja esta em uso.`, suggestions });
      }
    }
    const passwordHash = await this.hashPassword(dto.password);
    const user = await this.prisma.user.create({ data: { email: dto.email, passwordHash, name: dto.name, username } });
    const accessToken = this.issueJwt(user.id, user.email);
    const refreshToken = await this.createRefreshToken(user.id);
    return { access_token: accessToken, refresh_token: refreshToken, user: { id: user.id, email: user.email, name: user.name, username: user.username, plan: user.plan, isAdmin: user.isAdmin } };
  }

  private async suggestUsernames(base: string): Promise<string[]> {
    const candidates = [base + (Math.floor(Math.random() * 900) + 100), base + '_' + (Math.floor(Math.random() * 90) + 10), base + new Date().getFullYear()];
    const suggestions: string[] = [];
    for (const c of candidates) {
      if (suggestions.length >= 2) break;
      const exists = await this.prisma.user.findUnique({ where: { username: c } });
      if (!exists) suggestions.push(c);
    }
    return suggestions;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const dummyHash = "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$RdescudvJCsgt3ub+b+dWRWJTcg+bOa89p3sqKvjYZs";
    const ok = user
      ? await this.verifyAndMigrate(user.id, user.passwordHash, dto.password)
      : await argon2.verify(dummyHash, "dummy" + this.pepper).catch(() => false);
    if (!user || !ok) throw new UnauthorizedException("Invalid credentials");
    const accessToken = this.issueJwt(user.id, user.email);
    const refreshToken = await this.createRefreshToken(user.id);
    return { access_token: accessToken, refresh_token: refreshToken, user: { id: user.id, email: user.email, name: user.name, plan: user.plan, isAdmin: user.isAdmin } };
  }

  async googleOAuthCallback(googleUser: { googleId: string; email: string; name: string; accessToken: string; refreshToken: string; }) {
    try {
      const user = await this.prisma.user.upsert({
        where: { email: googleUser.email },
        update: { googleAccessToken: googleUser.accessToken, googleRefreshToken: googleUser.refreshToken, name: googleUser.name },
        create: { email: googleUser.email, name: googleUser.name, passwordHash: "", googleAccessToken: googleUser.accessToken, googleRefreshToken: googleUser.refreshToken },
      });
      const accessToken = this.issueJwt(user.id, user.email);
      return { access_token: accessToken, user: { id: user.id, email: user.email, name: user.name, plan: user.plan, isAdmin: user.isAdmin } };
    } catch (err) {
      if (err instanceof BadGatewayException) throw err;
      throw new BadGatewayException("Google OAuth2 exchange failed");
    }
  }

  async refresh(dto: RefreshDto) {
    const rec = await this.prisma.refreshToken.findUnique({ where: { token: dto.refresh_token } });
    if (!rec || rec.expiresAt <= new Date()) throw new UnauthorizedException("Invalid or expired refresh token");
    const user = await this.prisma.user.findUnique({ where: { id: rec.userId } });
    if (!user) throw new UnauthorizedException("User not found");
    await this.prisma.refreshToken.deleteMany({ where: { id: rec.id } });
    const newRefresh = await this.createRefreshToken(user.id);
    const accessToken = this.issueJwt(user.id, user.email);
    return { access_token: accessToken, refresh_token: newRefresh, user: { id: user.id, email: user.email, name: user.name, plan: user.plan, isAdmin: user.isAdmin } };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const MSG = "Se este e-mail estiver cadastrado, voce recebera as instrucoes.";
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return { message: MSG };
    await this.prisma.passwordResetToken.updateMany({ where: { userId: user.id, used: false }, data: { used: true } });
    const token = this.generateOpaqueToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await this.prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt } });
    const frontendUrl = this.configService.get("FRONTEND_URL", "http://localhost:5173");
    await this.mailService.sendPasswordReset(user.email, frontendUrl + "/reset-password?token=" + token, user.name ?? undefined);
    return { message: MSG };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const rec = await this.prisma.passwordResetToken.findUnique({ where: { token: dto.token } });
    if (!rec || rec.used || rec.expiresAt <= new Date()) throw new BadRequestException("Token invalido ou expirado.");
    const passwordHash = await this.hashPassword(dto.password);
    await this.prisma.user.update({ where: { id: rec.userId }, data: { passwordHash } });
    await this.prisma.passwordResetToken.update({ where: { id: rec.id }, data: { used: true } });
    await this.prisma.refreshToken.deleteMany({ where: { userId: rec.userId } });
    return { message: "Senha redefinida com sucesso." };
  }
}
