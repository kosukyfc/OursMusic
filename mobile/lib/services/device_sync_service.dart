import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../api.dart';
import '../player/player_controller.dart';

/// Syncs playback state across devices via WebSocket.
class DeviceSyncService extends ChangeNotifier {
  io.Socket? _socket;
  final PlayerController _player;
  bool _connected = false;
  List<Map<String, dynamic>> _devices = [];
  Map<String, dynamic>? _lastBroadcast;
  Map<String, dynamic>? _pendingUpdate;
  String? _updatedPlan; // plano atualizado via WebSocket

  bool get connected => _connected;
  List<Map<String, dynamic>> get devices => _devices;
  Map<String, dynamic>? get lastBroadcast => _lastBroadcast;
  Map<String, dynamic>? get pendingUpdate => _pendingUpdate;
  String? get updatedPlan => _updatedPlan;

  void clearBroadcast() { _lastBroadcast = null; notifyListeners(); }
  void clearPendingUpdate() { _pendingUpdate = null; notifyListeners(); }
  void clearUpdatedPlan() { _updatedPlan = null; notifyListeners(); }

  DeviceSyncService(this._player);

  void connect() {
    if (_socket != null) return;
    final token = Api.token;
    if (token == null) return;

    _socket = io.io(
      kApiBase,
      io.OptionBuilder()
        .setTransports(['websocket'])
        .setExtraHeaders({'Authorization': 'Bearer $token'})
        .disableAutoConnect()
        .build(),
    );

    _socket!.onConnect((_) {
      _connected = true;
      notifyListeners();
      _socket!.emit('device:register', {'name': 'Mobile', 'type': 'mobile'});
    });

    _socket!.onDisconnect((_) {
      _connected = false;
      notifyListeners();
    });

    // Receive playback state from master device
    _socket!.on('playback:sync', (data) {
      if (data is! Map) return;
      // Only sync if we're not the master
      final songId = data['songId']?.toString();
      final isPlaying = data['isPlaying'] as bool? ?? false;
      final positionMs = (data['positionMs'] as num?)?.toInt() ?? 0;

      if (songId != null && _player.current?.id != songId) {
        // Song changed — let the player handle it via queue
        debugPrint('DeviceSync: song changed to $songId');
      }
      if (!isPlaying && _player.playing) {
        _player.togglePlay();
      } else if (isPlaying && !_player.playing) {
        _player.togglePlay();
      }
      if (positionMs > 0) {
        final duration = _player.duration.inMilliseconds;
        if (duration > 0) {
          _player.seek(positionMs / duration);
        }
      }
    });

    // Device list update
    _socket!.on('devices:list', (data) {
      if (data is List) {
        _devices = data.whereType<Map<String, dynamic>>().toList();
        notifyListeners();
      }
    });

    // Global broadcast from admin
    _socket!.on('app:broadcast', (data) {
      if (data is! Map) return;
      _lastBroadcast = {
        'message': data['message']?.toString() ?? '',
        'type': data['type']?.toString() ?? 'info',
        'sentAt': data['sentAt']?.toString() ?? '',
      };
      notifyListeners();
    });

    // New version available
    _socket!.on('app:update-available', (data) {
      if (data is! Map) return;
      _pendingUpdate = {
        'version': data['version']?.toString() ?? '',
        'notes': data['notes']?.toString() ?? '',
      };
      notifyListeners();
    });

    // Plan updated by admin — atualiza em tempo real
    _socket!.on('premium:granted', (data) {
      if (data is! Map) return;
      final plan = data['plan']?.toString();
      if (plan != null) {
        _updatedPlan = plan;
        notifyListeners();
      }
    });

    _socket!.connect();
  }

  /// Broadcast current playback state to other devices
  void broadcastState() {
    if (!_connected || _socket == null) return;
    _socket!.emit('playback:update', {
      'songId': _player.current?.id,
      'isPlaying': _player.playing,
      'positionMs': _player.position.inMilliseconds,
    });
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _connected = false;
    notifyListeners();
  }

  @override
  void dispose() {
    disconnect();
    super.dispose();
  }
}
