import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshDto } from './dto';
import { Public } from './decorators';

const COOKIE_BASE = { httpOnly: true, secure: true, sameSite: 'strict' as const };
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;          // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    res.cookie('access_token', result.access_token, { ...COOKIE_BASE, maxAge: ACCESS_TOKEN_MAX_AGE });
    res.cookie('refresh_token', result.refresh_token, { ...COOKIE_BASE, maxAge: REFRESH_TOKEN_MAX_AGE });
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    res.cookie('access_token', result.access_token, { ...COOKIE_BASE, maxAge: ACCESS_TOKEN_MAX_AGE });
    res.cookie('refresh_token', result.refresh_token, { ...COOKIE_BASE, maxAge: REFRESH_TOKEN_MAX_AGE });
    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google')
  googleAuth() {
    // Passport redirects to Google — no body needed
  }

  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google/callback')
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.googleOAuthCallback(req.user);
    // Redirect to frontend with token + user info in query params
    const user = encodeURIComponent(JSON.stringify(result.user));
    const frontendUrl = `http://localhost:5173/auth/callback?token=${result.access_token}&user=${user}`;
    res.redirect(frontendUrl);
  }
}
