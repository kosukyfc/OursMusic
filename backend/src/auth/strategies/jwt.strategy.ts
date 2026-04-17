import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      // Extract JWT from HttpOnly cookie first, then Authorization header as fallback
      // (header fallback needed for mobile apps that cannot use cookies)
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          // Primary: HttpOnly cookie (web)
          if (req?.cookies?.access_token) return req.cookies.access_token;
          // Secondary: ?t= query param (audio stream URLs)
          if (req?.query?.t) return req.query.t as string;
          return null;
        },
        // Tertiary: Authorization Bearer (mobile/API clients)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET"),
      passReqToCallback: false,
    });
  }

  validate(payload: { sub: string; email: string }) {
    if (!payload?.sub) throw new UnauthorizedException("Invalid token payload");
    return { userId: payload.sub, email: payload.email };
  }
}