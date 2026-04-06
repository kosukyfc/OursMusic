import 'package:flutter/foundation.dart';
import '../api.dart';

enum DownloadStatus { none, downloading, ready }

/// Manages offline download state for songs.
/// Premium only — checks plan before allowing downloads.
class DownloadService extends ChangeNotifier {
  final Map<String, DownloadStatus> _status = {};
  final Set<String> _inProgress = {};

  DownloadStatus getStatus(String songId) => _status[songId] ?? DownloadStatus.none;
  bool get hasAny => _status.values.any((s) => s == DownloadStatus.ready);

  /// Load existing downloads from server
  Future<void> loadDownloads() async {
    try {
      final data = await Api.get('/offline/list');
      if (data is List) {
        for (final d in data) {
          if (d is Map) {
            final songId = d['song']?['id']?.toString();
            if (songId != null) _status[songId] = DownloadStatus.ready;
          }
        }
        notifyListeners();
      }
    } catch (_) {}
  }

  /// Download a single song (premium only)
  Future<void> downloadSong(String songId, String userPlan) async {
    if (userPlan == 'free') return;
    if (_status[songId] == DownloadStatus.ready) return;
    if (_inProgress.contains(songId)) return;

    _inProgress.add(songId);
    _status[songId] = DownloadStatus.downloading;
    notifyListeners();

    try {
      await Api.post('/offline/mark/$songId', {});
      _status[songId] = DownloadStatus.ready;
    } catch (e) {
      _status[songId] = DownloadStatus.none;
      debugPrint('Download error: $e');
    } finally {
      _inProgress.remove(songId);
      notifyListeners();
    }
  }

  /// Download all songs in a list (playlist download)
  Future<void> downloadAll(List<Song> songs, String userPlan) async {
    if (userPlan == 'free') return;
    for (final song in songs) {
      await downloadSong(song.id, userPlan);
      await Future.delayed(const Duration(milliseconds: 300));
    }
  }
}
