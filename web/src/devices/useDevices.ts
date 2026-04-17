import { WS_URL } from '../config';

/**
 * CLOCK SYNC ALGORITHM:
 *   1. On connect, send clock:ping every 2s for first 10 pings to build offset history
 *   2. Each pong: offset = serverTime - (Date.now() - rtt/2)
 *   3. Keep rolling average of last 8 offsets → clockOffset
 *   4. serverToLocal(serverTs) = serverTs - clockOffset
 *   5. When scheduling play: audioCtx.currentTime + (localPlayAt - performance.now()) / 1000
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'browser' | 'mobile' | 'speaker' | 'tv';
  isMaster: boolean;
  lastSeen: string;
}

export interface PlaybackSyncEvent {
  action: 'play' | 'pause' | 'seek' | 'volume';
  songId?: string;
  songUrl?: string;
  positionMs?: number;
  volume?: number;
  playAt: number;       // future server timestamp
  serverTime: number;
}

interface UseDevicesOptions {
  token: string;
  onPlaybackSync?: (event: PlaybackSyncEvent, localPlayAt: number) => void;
  onPremiumGranted?: (data: any) => void;
}

export function useDevices({ token, onPlaybackSync, onPremiumGranted }: UseDevicesOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [connected, setConnected] = useState(false);
  const clockOffsets = useRef<number[]>([]);
  const pingTimestamps = useRef<Map<string, number>>(new Map());

  // Average clock offset (server - local)
  const getClockOffset = useCallback(() => {
    const offsets = clockOffsets.current;
    if (offsets.length === 0) return 0;
    return offsets.reduce((a, b) => a + b, 0) / offsets.length;
  }, []);

  // Convert server timestamp to local performance.now() equivalent
  const serverToLocalPerf = useCallback((serverTs: number) => {
    // serverTs (ms epoch) → local performance.now() ms
    const offset = getClockOffset();
    const localEpoch = serverTs - offset;
    return localEpoch - (Date.now() - performance.now());
  }, [getClockOffset]);

  useEffect(() => {
    if (!token) return;

    const socket = io(`${WS_URL}/devices`, {
      auth: { token },
      transports: ['websocket', 'polling'], // Fallback para polling se WebSocket falhar
      reconnection: true,                    // Tenta reconectar automaticamente
      reconnectionDelay: 1000,               // Começa com 1s
      reconnectionDelayMax: 5000,            // Máximo de 5s entre tentativas
      reconnectionAttempts: Infinity,        // Tenta indefinidamente
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('devices:list');
      // Start clock calibration — 10 pings every 500ms
      let count = 0;
      const calibrate = setInterval(() => {
        const id = `${Date.now()}`;
        pingTimestamps.current.set(id, performance.now());
        socket.emit('clock:ping', { id });
        if (++count >= 10) clearInterval(calibrate);
      }, 500);
    });

    socket.on('disconnect', () => setConnected(false));

    // NTP-like pong handler
    socket.on('clock:pong', ({ serverTime, id }: { serverTime: number; id?: string }) => {
      const t0 = id ? (pingTimestamps.current.get(id) ?? performance.now()) : performance.now();
      const rtt = performance.now() - t0;
      const offset = serverTime - (Date.now() - rtt / 2);
      clockOffsets.current = [...clockOffsets.current.slice(-7), offset]; // keep last 8
      if (id) pingTimestamps.current.delete(id);
    });

    // Periodic clock sync from server
    socket.on('clock:sync', (_data: { serverTime: number }) => {
      const id = `sync-${Date.now()}`;
      pingTimestamps.current.set(id, performance.now());
      socket.emit('clock:ping', { id });
    });

    socket.on('devices:updated', (list: DeviceInfo[]) => setDevices(list));

    socket.on('playback:sync', (event: PlaybackSyncEvent) => {
      const localPlayAt = serverToLocalPerf(event.playAt);
      onPlaybackSync?.(event, localPlayAt);
    });

    socket.on('playback:transfer', ({ session, playAt }: any) => {
      const localPlayAt = serverToLocalPerf(playAt);
      if (session) onPlaybackSync?.({ action: 'play', songUrl: session.songUrl, positionMs: session.positionMs, playAt, serverTime: Date.now() }, localPlayAt);
    });

    socket.on('premium:granted', (data: any) => {
      onPremiumGranted?.(data);
    });

    socket.on('app:broadcast', (data: { message: string; type: string; sentAt: string }) => {
      // Mostra notificação global para o usuário web
      const icons: Record<string, string> = { info: 'ℹ️', update: '🚀', warning: '⚠️' };
      const icon = icons[data.type] ?? '📢';
      // Usa a API de Notifications do browser se disponível, senão alert
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(`${icon} OursMusic`, { body: data.message, icon: '/favicon.ico' });
      }
      // Também dispara um evento customizado para o App.tsx capturar e exibir na UI
      window.dispatchEvent(new CustomEvent('app:broadcast', { detail: data }));
    });

    // 🔔 Unified notification handler for all notification types
    socket.on('notif:received', (data: { type: string; message: string; event?: string; timestamp: number; [key: string]: any }) => {
      // Log all notification types for debugging
      console.log('📱 Notification received:', data.type, data.message);

      // Fire push notification using Notification API
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const icons: Record<string, string> = {
          new_follower: '👤',
          plan_updated: '⭐',
          plan_expiring: '⏰',
          app_broadcast: '📢',
        };
        const icon = icons[data.type] ?? '🔔';
        new Notification(`${icon} OursMusic`, { body: data.message, icon: '/favicon.ico' });
      }

      // Dispatch custom event for App.tsx to add to notification list
      window.dispatchEvent(new CustomEvent('notif:received', { detail: data }));
    });

    socket.on('app:update-available', (data: { version: string; notes: string }) => {
      window.dispatchEvent(new CustomEvent('app:update-available', { detail: data }));
    });

    return () => { socket.disconnect(); };
  }, [token]);

  const sendCommand = useCallback((data: Omit<PlaybackSyncEvent, 'playAt' | 'serverTime'>) => {
    socketRef.current?.emit('playback:command', data);
  }, []);

  const transferTo = useCallback((deviceId: string) => {
    socketRef.current?.emit('devices:transfer', { targetDeviceId: deviceId });
  }, []);

  return { devices, connected, sendCommand, transferTo, getClockOffset };
}
