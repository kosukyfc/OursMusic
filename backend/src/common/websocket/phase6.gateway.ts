import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

interface ConnectedUser {
  userId: string;
  socketId: string;
  features: Set<string>;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/phase6',
})
@Injectable()
export class Phase6GatewayService implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, ConnectedUser> = new Map();
  private userSockets: Map<string, Set<Socket>> = new Map();

  handleConnection(client: Socket) {
    const userId = client.handshake.auth.userId;
    if (!userId) {
      client.disconnect();
      return;
    }

    const user: ConnectedUser = {
      userId,
      socketId: client.id,
      features: new Set(),
    };

    this.connectedUsers.set(client.id, user);

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(client);

    // Broadcast user count
    this.server.emit('stats:connected-users', this.connectedUsers.size);
  }

  handleDisconnect(client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (user) {
      const userSocketSet = this.userSockets.get(user.userId);
      if (userSocketSet) {
        userSocketSet.delete(client);
      }
      this.connectedUsers.delete(client.id);
    }

    this.server.emit('stats:connected-users', this.connectedUsers.size);
  }

  // Subscribe to feature updates
  @SubscribeMessage('feature:subscribe')
  handleFeatureSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { featureName: string },
  ) {
    const user = this.connectedUsers.get(client.id);
    if (user) {
      user.features.add(data.featureName);
      client.join(`feature:${data.featureName}`);
      client.emit('feature:subscribed', { feature: data.featureName });
    }
  }

  // Notify feature usage
  notifyFeatureUsage(featureName: string, count: number, userId?: string) {
    const eventData = {
      feature: featureName,
      enabledCount: count,
      timestamp: new Date().toISOString(),
    };

    if (userId) {
      // Send to specific user
      const userSockets = this.userSockets.get(userId);
      if (userSockets) {
        userSockets.forEach(socket => {
          socket.emit('feature:usage-update', eventData);
        });
      }
    } else {
      // Broadcast to all users interested in this feature
      this.server.to(`feature:${featureName}`).emit('feature:usage-update', eventData);
    }
  }

  // Notify setlist sharing/collaboration
  notifySetlistShared(setlistId: string, sharedWith: string[], owner: string) {
    sharedWith.forEach(userId => {
      const userSockets = this.userSockets.get(userId);
      if (userSockets) {
        userSockets.forEach(socket => {
          socket.emit('setlist:shared', {
            setlistId,
            sharedBy: owner,
            timestamp: new Date().toISOString(),
          });
        });
      }
    });
  }

  // Notify voice command used in collaborative session
  notifyVoiceCommandUsed(userId: string, command: string, featureName: string) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.forEach(socket => {
        socket.emit('voice:command-executed', { command, feature: featureName });
      });
    }

    // Also broadcast to listening heatmap subscribers
    this.server.to('feature:listening_heatmap').emit('heatmap:activity', {
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  // Notify music theory analysis complete
  notifyAnalysisComplete(userId: string, songId: string, analysis: any) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.forEach(socket => {
        socket.emit('theory:analysis-complete', { songId, analysis });
      });
    }
  }

  // Real-time heatmap updates
  updateHeatmapActivity(userId: string, dayOfWeek: number, hour: number) {
    this.server.to('feature:listening_heatmap').emit('heatmap:activity-update', {
      userId,
      dayOfWeek,
      hour,
      timestamp: new Date().toISOString(),
    });
  }

  // Broadcast stats periodically
  broadcastStats(stats: {
    activeUsers: number;
    totalFeatures: number;
    averageSessionDuration: number;
  }) {
    this.server.emit('stats:update', {
      ...stats,
      timestamp: new Date().toISOString(),
      connectedWebSockets: this.connectedUsers.size,
    });
  }

  // Room-based live collaboration
  @SubscribeMessage('collab:join-session')
  handleJoinCollabSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; userId: string },
  ) {
    client.join(`session:${data.sessionId}`);
    this.server.to(`session:${data.sessionId}`).emit('collab:user-joined', {
      userId: data.userId,
      sessionId: data.sessionId,
    });
  }

  @SubscribeMessage('collab:queue-update')
  handleQueueUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; queueUpdate: any },
  ) {
    this.server.to(`session:${data.sessionId}`).emit('collab:queue-changed', data.queueUpdate);
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Get feature subscribers
  getFeatureSubscribers(featureName: string): number {
    let count = 0;
    this.connectedUsers.forEach(user => {
      if (user.features.has(featureName)) {
        count++;
      }
    });
    return count;
  }
}
