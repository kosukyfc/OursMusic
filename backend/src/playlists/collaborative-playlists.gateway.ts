import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CollaborativePlaylistsService, PlaylistChange } from './collaborative-playlists.service';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  namespace: 'playlists',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class CollaborativePlaylistsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userPlaylistMap: Map<string, Set<string>> = new Map();
  private authenticatedUsers: Map<string, string> = new Map();

  constructor(
    private collaborativeService: CollaborativePlaylistsService,
    @Inject(JwtService) private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);

    try {
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect(true);
        return;
      }

      const userId = await this.verifyToken(token);
      if (!userId) {
        client.disconnect(true);
        return;
      }

      this.authenticatedUsers.set(client.id, userId);
      console.log(`User authenticated: ${userId}`);
    } catch (error) {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    const userId = this.authenticatedUsers.get(client.id);
    if (userId) {
      this.userPlaylistMap.delete(userId);
      this.authenticatedUsers.delete(client.id);
    }
  }

  /**
   * Verify JWT token with signature verification
   */
  private async verifyToken(token: string): Promise<string | null> {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      return payload.sub || payload.userId;
    } catch (error) {
      console.error('JWT verification failed:', error);
      return null;
    }
  }

  /**
   * Verify user is authenticated
   */
  private verifyUser(client: Socket, userId: string): void {
    const authenticatedUserId = this.authenticatedUsers.get(client.id);

    if (!authenticatedUserId) {
      throw new WsException('User not authenticated');
    }

    if (authenticatedUserId !== userId) {
      throw new WsException('User ID mismatch - not authorized');
    }
  }

  /**
   * Join collaborative playlist room
   */
  @SubscribeMessage('join_playlist')
  async handleJoinPlaylist(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    try {
      const { playlistId, userId } = data;

      this.verifyUser(client, userId);

      client.join(`playlist:${playlistId}`);

      if (!this.userPlaylistMap.has(userId)) {
        this.userPlaylistMap.set(userId, new Set());
      }
      this.userPlaylistMap.get(userId)!.add(playlistId);

      this.server.to(`playlist:${playlistId}`).emit('user_joined', {
        userId,
        timestamp: new Date(),
      });
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  /**
   * Leave collaborative playlist room
   */
  @SubscribeMessage('leave_playlist')
  handleLeavePlaylist(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    try {
      const { playlistId, userId } = data;

      this.verifyUser(client, userId);

      client.leave(`playlist:${playlistId}`);
      this.userPlaylistMap.get(userId)?.delete(playlistId);

      this.server.to(`playlist:${playlistId}`).emit('user_left', {
        userId,
        timestamp: new Date(),
      });
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  /**
   * Handle real-time playlist changes
   */
  @SubscribeMessage('playlist_change')
  async handlePlaylistChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() change: PlaylistChange,
  ) {
    try {
      this.verifyUser(client, change.userId);

      const processed = await this.collaborativeService.handlePlaylistChange(change);

      this.server.to(`playlist:${change.playlistId}`).emit('playlist_changed', processed);

      client.emit('change_applied', { success: true, change: processed });
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  /**
   * Broadcast cursor position for live UI feedback
   */
  @SubscribeMessage('cursor_move')
  handleCursorMove(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    try {
      const { playlistId, userId, position } = data;

      this.verifyUser(client, userId);

      client.broadcast.to(`playlist:${playlistId}`).emit('cursor_moved', {
        userId,
        position,
        timestamp: new Date(),
      });
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  /**
   * Send typing/editing indicator
   */
  @SubscribeMessage('user_editing')
  handleUserEditing(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    try {
      const { playlistId, userId, editing } = data;

      this.verifyUser(client, userId);

      client.broadcast.to(`playlist:${playlistId}`).emit('user_editing', {
        userId,
        editing,
      });
    } catch (error) {
      throw new WsException(error.message);
    }
  }

  /**
   * Notify collaborators about external changes
   */
  notifyPlaylistChange(playlistId: string, change: PlaylistChange) {
    this.server.to(`playlist:${playlistId}`).emit('external_change', change);
  }
}
