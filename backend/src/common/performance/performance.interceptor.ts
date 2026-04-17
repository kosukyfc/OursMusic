import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const method = req.method;
        const url = req.url;
        const statusCode = context.switchToHttp().getResponse().statusCode;

        // Log slow requests
        if (duration > 500) {
          console.warn(
            `[SLOW] ${method} ${url} - ${duration}ms (status: ${statusCode})`,
          );
        }

        // Add timing header
        context.switchToHttp().getResponse().set('X-Response-Time', `${duration}ms`);
      }),
    );
  }
}
