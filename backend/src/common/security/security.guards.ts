import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class SecurityHeadersGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // OWASP Security Headers
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('X-XSS-Protection', '1; mode=block');
    response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    response.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    return true;
  }
}

@Injectable()
export class CSRFProtectionGuard implements CanActivate {
  private readonly CSRF_TOKEN_LENGTH = 32;
  private readonly CSRF_HEADER = 'x-csrf-token';
  private readonly CSRF_COOKIE = 'csrf-token';

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const { method } = request;

    // Only protect state-changing operations
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return true;
    }

    const token = request.get(this.CSRF_HEADER) || request.body?.csrfToken;
    const cookieToken = request.cookies?.[this.CSRF_COOKIE];

    if (!token || !cookieToken || token !== cookieToken) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}

@Injectable()
export class InputValidationGuard implements CanActivate {
  private readonly DANGEROUS_PATTERNS = [
    /<script[^>]*>.*?<\/script>/gi,
    /on\w+\s*=/gi,
    /javascript:/gi,
    /data:text\/html/gi,
  ];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const { body, query, params } = request;

    this.validateInput(body);
    this.validateInput(query);
    this.validateInput(params);

    return true;
  }

  private validateInput(data: any): void {
    if (!data) return;

    Object.values(data).forEach(value => {
      if (typeof value === 'string') {
        this.checkForInjection(value);
      } else if (typeof value === 'object') {
        this.validateInput(value);
      }
    });
  }

  private checkForInjection(value: string): void {
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(value)) {
        throw new ForbiddenException('Potentially malicious input detected');
      }
    }
  }
}

@Injectable()
export class RateLimitingGuard implements CanActivate {
  private readonly requests = new Map<string, number[]>();
  private readonly WINDOW_MS = 60000; // 1 minute
  private readonly LIMITS = {
    default: 100,
    auth: 5,
    voice_commands: 30,
    analysis: 20,
  };

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress;
    const endpoint = request.path;

    const limit = this.getLimit(endpoint);
    const now = Date.now();

    let timestamps = this.requests.get(ip) || [];
    timestamps = timestamps.filter(t => now - t < this.WINDOW_MS);

    if (timestamps.length >= limit) {
      throw new ForbiddenException('Rate limit exceeded');
    }

    timestamps.push(now);
    this.requests.set(ip, timestamps);

    return true;
  }

  private getLimit(endpoint: string): number {
    if (endpoint.includes('auth')) return this.LIMITS.auth;
    if (endpoint.includes('voice')) return this.LIMITS.voice_commands;
    if (endpoint.includes('analyze')) return this.LIMITS.analysis;
    return this.LIMITS.default;
  }
}

@Injectable()
export class SQLInjectionGuard implements CanActivate {
  private readonly SQL_PATTERNS = [
    /('|(\\%27))/,
    /("|(\\%22))/,
    /(;|(%3B))/,
    /(--)|(%2D%2D)/,
    /\/\*/,
    /\*\//,
    /(union|select|insert|update|delete|drop|create|alter)/i,
  ];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const { query, body, params } = request;

    this.checkForSQLInjection(query);
    this.checkForSQLInjection(body);
    this.checkForSQLInjection(params);

    return true;
  }

  private checkForSQLInjection(data: any): void {
    if (!data) return;

    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string') {
        for (const pattern of this.SQL_PATTERNS) {
          if (pattern.test(value)) {
            throw new ForbiddenException(`Potential SQL injection in ${key}`);
          }
        }
      }
    });
  }
}
