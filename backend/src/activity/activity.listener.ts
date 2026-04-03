import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { ActionType } from '@prisma/client';

interface ActivityPayload {
  userId: string;
  songId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ActivityListener {
  private readonly logger = new Logger(ActivityListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('activity.play', { async: true })
  async onPlay(payload: ActivityPayload) {
    await this.writeLog(ActionType.play, payload);
    // Increment play counter on the song
    if (payload.songId) {
      await this.prisma.song.update({
        where: { id: payload.songId },
        data: { playCount: { increment: 1 } },
      }).catch(() => {});
    }
  }

  @OnEvent('activity.download', { async: true })
  async onDownload(payload: ActivityPayload) {
    await this.writeLog(ActionType.download, payload);
  }

  @OnEvent('activity.skip', { async: true })
  async onSkip(payload: ActivityPayload) {
    await this.writeLog(ActionType.skip, payload);
  }

  @OnEvent('activity.like', { async: true })
  async onLike(payload: ActivityPayload) {
    await this.writeLog(ActionType.like, payload);
  }

  @OnEvent('activity.add_to_playlist', { async: true })
  async onAddToPlaylist(payload: ActivityPayload) {
    await this.writeLog(ActionType.add_to_playlist, payload);
  }

  private async writeLog(action: ActionType, payload: ActivityPayload) {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId: payload.userId,
          songId: payload.songId ?? null,
          action,
          metadata: payload.metadata ? (payload.metadata as any) : undefined,
        },
      });
    } catch (err) {
      // Errors must never propagate to the HTTP response — log to stderr only
      this.logger.error(`Failed to write activity log [${action}]: ${(err as Error).message}`);
    }
  }
}
