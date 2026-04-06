/**
 * DevicesGateway — Multi-room synchronized playback
 *
 * CLOCK SYNC (NTP-like):
 *   1. Server broadcasts `clock:sync` every 5s with serverTime (ms since epoch)
 *   2. Client records t0 = performance.now() before sending `clock:ping`
 *   3. Server replies `clock:pong` with serverTime
 *   4. Client calculates:
 *        rtt    = performance.now() - t0
 *        offset = serverTime - (Date.now() - rtt/2)
 *   5. Client keeps rolling average of last 8 offsets → clockOffset
 *   6. localToServer(t) = t + clockOffset
 *
 * MULTI-ROOM PLAY:
 *   Master sends `playback:command` → server broadcasts to room with
 *   playAt = serverNow + 300ms (future timestamp)
 *   Each client: scheduleAt = playAt - clockOffset (local time)
 *   AudioContext.currentTime + (scheduleAt - performance.now()) / 1000
 */

import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';

interface AuthSocket extends Socket {
  userId: string;
  deviceId: string;
}

@WebSocketGateway({
  cors: { origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true },
  namespace: '/devices',
})
export class DevicesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(DevicesGateway.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Connection lifecycle ──────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token
        ?? client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) { client.disconnect(); return; }

      const payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      }) as { sub: string };

      const socket = client as AuthSocket;
      socket.userId = payload.sub;

      // Detect device — prefer explicit X-Device-Type header over user-agent
      const ua = client.handshake.headers['user-agent'] ?? '';
      const explicitType = client.handshake.headers['x-device-type'] as string | undefined;
      const name = this.detectDeviceName(ua, explicitType);
      const type = this.detectDeviceType(ua, explicitType);

      // Fingerprint: stable identifier for this device (type + UA hash)
      const fingerprint = `${type}:${ua.slice(0, 120)}`;

      // Upsert: find existing device with same fingerprint, update socketId
      // This prevents duplicate entries on reconnect
      const existing = await this.prisma.device.findFirst({
        where: { userId: payload.sub, name, type },
        orderBy: { lastSeen: 'desc' },
      });

      let device;
      if (existing) {
        device = await this.prisma.device.update({
          where: { id: existing.id },
          data: { socketId: client.id, isActive: true, lastSeen: new Date() },
        });
        // Deactivate any other duplicate devices of same type
        await this.prisma.device.updateMany({
          where: { userId: payload.sub, type, id: { not: existing.id } },
          data: { isActive: false },
        });
      } else {
        device = await this.prisma.device.create({
          data: { userId: payload.sub, socketId: client.id, name, type, isMaster: false },
        });
      }

      socket.deviceId = device.id;

      // Join user room
      client.join(`room:${payload.sub}`);

      // Promote to master if first device in room
      const roomDevices = await this.prisma.device.findMany({
        where: { userId: payload.sub, isActive: true },
      });
      if (roomDevices.length === 1) {
        await this.prisma.device.update({ where: { id: device.id }, data: { isMaster: true } });
      }

      // Notify room of new device
      this.server.to(`room:${payload.sub}`).emit('devices:updated', await this.getRoomDevices(payload.sub));

      // Send current playback state to new device
      const session = await this.prisma.playbackSession.findUnique({ where: { userId: payload.sub } });
      if (session) client.emit('playback:state', session);

      this.logger.log(`Device connected: ${name} (${payload.sub})`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const socket = client as AuthSocket;
    if (!socket.userId) return;

    // Mark this specific socket as inactive (not all devices of this user)
    await this.prisma.device.updateMany({
      where: { socketId: client.id },
      data: { isActive: false },
    });

    // If master disconnected, promote next device
    const remaining = await this.prisma.device.findMany({
      where: { userId: socket.userId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (remaining.length > 0 && !remaining.some(d => d.isMaster)) {
      await this.prisma.device.update({ where: { id: remaining[0].id }, data: { isMaster: true } });
    }

    this.server.to(`room:${socket.userId}`).emit('devices:updated', await this.getRoomDevices(socket.userId));
    this.logger.log(`Device disconnected: ${socket.userId}`);
  }

  // ── Clock sync ────────────────────────────────────────────────────────────

  /** Client sends ping, server replies with server timestamp */
  @SubscribeMessage('clock:ping')
  handleClockPing(@ConnectedSocket() client: Socket) {
    client.emit('clock:pong', { serverTime: Date.now() });
  }

  // Broadcast clock every 5 seconds
  startClockBroadcast() {
    setInterval(() => {
      this.server.emit('clock:sync', { serverTime: Date.now() });
    }, 5000);
  }

  // ── Playback commands ─────────────────────────────────────────────────────

  /**
   * Master sends a playback command.
   * Server adds playAt = serverNow + 300ms so all clients can schedule precisely.
   */
  @SubscribeMessage('playback:command')
  async handlePlaybackCommand(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      action: 'play' | 'pause' | 'seek' | 'volume';
      songId?: string;
      songUrl?: string;
      positionMs?: number;
      volume?: number;
    },
  ) {
    const socket = client as AuthSocket;
    if (!socket.userId) return;

    const serverNow = Date.now();
    const playAt = serverNow + 300; // 300ms in the future for sync

    // Persist session
    await this.prisma.playbackSession.upsert({
      where: { userId: socket.userId },
      create: {
        userId: socket.userId,
        songId: data.songId,
        songUrl: data.songUrl,
        isPlaying: data.action === 'play',
        positionMs: data.positionMs ?? 0,
      },
      update: {
        songId: data.songId ?? undefined,
        songUrl: data.songUrl ?? undefined,
        isPlaying: data.action === 'play' ? true : data.action === 'pause' ? false : undefined,
        positionMs: data.positionMs ?? undefined,
      },
    });

    // Broadcast to all devices in room
    this.server.to(`room:${socket.userId}`).emit('playback:sync', {
      ...data,
      playAt,       // future server timestamp — clients use clock offset to schedule
      serverTime: serverNow,
    });
  }

  /** Transfer playback to a specific device */
  @SubscribeMessage('devices:transfer')
  async handleTransfer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetDeviceId: string },
  ) {
    const socket = client as AuthSocket;
    if (!socket.userId) return;

    // Remove master from all, set new master
    await this.prisma.device.updateMany({
      where: { userId: socket.userId },
      data: { isMaster: false },
    });
    await this.prisma.device.update({
      where: { id: data.targetDeviceId },
      data: { isMaster: true },
    });

    const session = await this.prisma.playbackSession.findUnique({ where: { userId: socket.userId } });
    this.server.to(`room:${socket.userId}`).emit('devices:updated', await this.getRoomDevices(socket.userId));
    this.server.to(`room:${socket.userId}`).emit('playback:transfer', {
      targetDeviceId: data.targetDeviceId,
      session,
      playAt: Date.now() + 300,
    });
  }

  @SubscribeMessage('devices:list')
  async handleList(@ConnectedSocket() client: Socket) {
    const socket = client as AuthSocket;
    if (!socket.userId) return;
    return this.getRoomDevices(socket.userId);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Send a notification to all active sockets of a specific user */
  notifyUser(userId: string, event: string, data: any) {
    this.server.to(`room:${userId}`).emit(event, data);
  }

  private async getRoomDevices(userId: string) {
    return this.prisma.device.findMany({
      where: { userId, isActive: true },
      select: { id: true, name: true, type: true, isMaster: true, lastSeen: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  private detectDeviceName(ua: string, explicit?: string): string {
    if (explicit === 'tv') return 'TV / TV Box';
    if (explicit === 'mobile') return 'Smartphone';
    if (explicit === 'web') return 'Navegador Web';
    if (/mobile/i.test(ua)) return 'Smartphone';
    if (/tablet|ipad/i.test(ua)) return 'Tablet';
    if (/windows/i.test(ua)) return 'Chrome no Windows';
    if (/mac/i.test(ua)) return 'Chrome no Mac';
    if (/linux/i.test(ua)) return 'Chrome no Linux';
    return 'Navegador Web';
  }

  private detectDeviceType(ua: string, explicit?: string): 'browser' | 'mobile' | 'speaker' | 'tv' {
    if (explicit === 'tv') return 'tv';
    if (explicit === 'mobile') return 'mobile';
    if (explicit === 'web') return 'browser';
    if (/mobile/i.test(ua)) return 'mobile';
    if (/smart-tv|tv/i.test(ua)) return 'tv';
    return 'browser';
  }
}
