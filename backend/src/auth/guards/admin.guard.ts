import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { timingSafeEqual } from "crypto";

/**
 * AdminGuard — tripla validação:
 * 1. Usuário autenticado com isAdmin=true no banco
 * 2. Header secreto X-Admin-Token (obrigatório em produção)
 * 3. Retorna 404 em vez de 403/401 para não revelar que o endpoint existe
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly adminSecret: string | null;
  private readonly isProd: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.adminSecret = this.configService.get("ADMIN_SECRET_HEADER") ?? null;
    this.isProd = this.configService.get("NODE_ENV") === "production";
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Respeita @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: { userId: string } }>();
    const userId = req.user?.userId;

    // Sempre 404 — nunca revela que o endpoint existe
    if (!userId) throw new NotFoundException();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isAdmin) throw new NotFoundException();

    // Em produção, o header secreto é obrigatório
    if (this.isProd && !this.adminSecret) {
      throw new NotFoundException(); // misconfiguration — bloqueia tudo
    }

    if (this.adminSecret) {
      const provided = req.headers["x-admin-token"] as string | undefined;
      if (!provided) throw new NotFoundException();
      try {
        const padLen = Math.max(provided.length, this.adminSecret.length, 64);
        const a = Buffer.from(provided.padEnd(padLen));
        const b = Buffer.from(this.adminSecret.padEnd(padLen));
        if (a.length !== b.length || !timingSafeEqual(a, b)) throw new NotFoundException();
      } catch {
        throw new NotFoundException();
      }
    }

    return true;
  }
}