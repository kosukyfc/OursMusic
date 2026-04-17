import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';

@Injectable()
export class OfflineScheduler {
  private readonly logger = new Logger(OfflineScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Roda todo dia à meia-noite — expira downloads vencidos e remove arquivos */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireDownloads() {
    const expired = await this.prisma.download.findMany({
      where: {
        status: 'ready',
        expiresAt: { lte: new Date() },
      },
      select: { id: true, encryptedPath: true },
    });

    if (!expired.length) return;

    for (const d of expired) {
      // Remove arquivo criptografado do disco
      if (d.encryptedPath) {
        try { fs.unlinkSync(d.encryptedPath); } catch { /* já removido */ }
      }
    }

    const { count } = await this.prisma.download.updateMany({
      where: { id: { in: expired.map(d => d.id) } },
      data: { status: 'expired', encryptedPath: null },
    });

    this.logger.log(`Expired ${count} offline downloads`);
  }

  /** Roda a cada hora — expira downloads de usuários que perderam o plano */
  @Cron(CronExpression.EVERY_HOUR)
  async expireDowngradesDownloads() {
    // Usuários free com downloads ainda ativos
    const freeUsers = await this.prisma.user.findMany({
      where: { plan: 'free', downloads: { some: { status: 'ready' } } },
      select: { id: true },
    });

    if (!freeUsers.length) return;

    const downloads = await this.prisma.download.findMany({
      where: { userId: { in: freeUsers.map(u => u.id) }, status: 'ready' },
      select: { id: true, encryptedPath: true },
    });

    for (const d of downloads) {
      if (d.encryptedPath) {
        try { fs.unlinkSync(d.encryptedPath); } catch { /* já removido */ }
      }
    }

    const { count } = await this.prisma.download.updateMany({
      where: { id: { in: downloads.map(d => d.id) } },
      data: { status: 'expired', encryptedPath: null },
    });

    if (count > 0) this.logger.log(`Expired ${count} downloads from downgraded users`);
  }
}
