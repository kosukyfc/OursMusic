import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * API Versioning middleware
 * Supports: /api/v1, /api/v2
 */
@Injectable()
export class VersioningMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract version from path: /api/v1 → 1
    const versionMatch = req.path.match(/^\/api\/v(\d+)\//);
    const version = versionMatch ? parseInt(versionMatch[1]) : 1;

    // Store version in request for use in controllers
    req['apiVersion'] = version;
    req['versionedPath'] = req.path.replace(`/api/v${version}`, '');

    // Add version to response headers
    res.setHeader('API-Version', `${version}`);
    res.setHeader('Deprecation', version === 1 ? 'false' : 'true');
    res.setHeader('Sunset', getSunsetDate(version));

    next();
  }
}

function getSunsetDate(version: number): string | undefined {
  const sunsetMap: Record<number, Date> = {
    1: new Date('2025-10-11'), // 18 months from now
    2: new Date('2026-10-11'), // 30 months from now
  };
  return sunsetMap[version]?.toUTCString();
}

/**
 * Decorator for version-specific endpoints
 */
export function ApiVersion(version: number | number[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const versions = Array.isArray(version) ? version : [version];
    Reflect.defineMetadata('api:version:supports', versions, descriptor.value);
    return descriptor;
  };
}
