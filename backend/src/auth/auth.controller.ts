import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import { Response, Request } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto, LoginDto, RefreshDto, ForgotPasswordDto, ResetPasswordDto } from "./dto";
import { Public } from "./decorators";
import { PrismaService } from "../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";

type AuthReq = Request & { user: { userId: string } };

// Cookies HttpOnly + Secure + SameSite — tokens nunca acessiveis pelo JS
const cookieOpts = (maxAge: number, isProd: boolean) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? ('strict' as const) : ('lax' as const),
  path: "/",
  maxAge,
});

const ACCESS_TTL  = 15 * 60 * 1000;           // 15 min
const REFRESH_TTL = 7 * 24 * 60 * 60 * 1000;  // 7 dias

@Controller("auth")
export class AuthController {
  private readonly isProd: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.isProd = this.configService.get("NODE_ENV") === "production";
  }

  @Get("me")
  async me(@Req() req: AuthReq) {
    return this.prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, name: true, plan: true, isAdmin: true, avatarUrl: true, username: true },
    });
  }

  /** Returns the current access_token from cookie — used by WebSocket clients */
  @Get("ws-token")
  wsToken(@Req() req: Request) {
    const token = (req as any).cookies?.access_token;
    if (!token) return { token: null };
    return { token };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    res.cookie("access_token",  result.access_token,  cookieOpts(ACCESS_TTL,  this.isProd));
    res.cookie("refresh_token", result.refresh_token, cookieOpts(REFRESH_TTL, this.isProd));
    // Return user info but NOT the tokens in the body
    return { user: result.user };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    res.cookie("access_token",  result.access_token,  cookieOpts(ACCESS_TTL,  this.isProd));
    res.cookie("refresh_token", result.refresh_token, cookieOpts(REFRESH_TTL, this.isProd));
    // Also return tokens in body for cross-origin clients (Vercel → ngrok)
    return { user: result.user, access_token: result.access_token, refresh_token: result.refresh_token };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Body() body: any, @Res({ passthrough: true }) res: Response) {
    // Accept refresh token from cookie (web) or body (cross-origin/mobile)
    const cookieToken = (req as any).cookies?.refresh_token;
    const bodyToken = body?.refresh_token;
    const token = cookieToken || bodyToken;
    if (!token) {
      throw new (await import('@nestjs/common').then(m => m.BadRequestException))('No refresh token');
    }
    const result = await this.authService.refresh({ refresh_token: token });
    res.cookie("access_token",  result.access_token,  cookieOpts(ACCESS_TTL,  this.isProd));
    res.cookie("refresh_token", result.refresh_token, cookieOpts(REFRESH_TTL, this.isProd));
    return { ok: true, user: result.user, access_token: result.access_token, refresh_token: result.refresh_token };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: AuthReq, @Res({ passthrough: true }) res: Response) {
    // Invalidate all refresh tokens for this user
    await this.prisma.refreshToken.deleteMany({ where: { userId: req.user.userId } });
    // Clear cookies
    res.clearCookie("access_token",  { path: "/" });
    res.clearCookie("refresh_token", { path: "/" });
    return { ok: true };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @UseGuards(AuthGuard("google"))
  @Get("google")
  googleAuth() {}

  @Public()
  @UseGuards(AuthGuard("google"))
  @Get("google/callback")
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.googleOAuthCallback(req.user);
    const frontendUrl = this.configService.get("FRONTEND_URL", "http://localhost:5173");
    // Set cookie and redirect — token never in URL
    res.cookie("access_token", result.access_token, cookieOpts(ACCESS_TTL, this.isProd));
    const user = encodeURIComponent(JSON.stringify(result.user));
    res.redirect(frontendUrl + "/auth/callback?user=" + user);
  }
}