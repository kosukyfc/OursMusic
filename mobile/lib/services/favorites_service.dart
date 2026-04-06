import 'package:flutter/foundation.dart';
import '../api.dart';

/// Centralized favorites state — toggle, load, check.
class FavoritesService extends ChangeNotifier {
  final Set<String> _favoriteIds = {};

  bool isFavorite(String songId) => _favoriteIds.contains(songId);

  Future<void> load() async {
    try {
      final data = await Api.get('/favorites');
      if (data is List) {
        _favoriteIds.clear();
        for (final item in data) {
          final id = item is Map ? (item['song']?['id'] ?? item['songId'])?.toString() : null;
          if (id != null) _favoriteIds.add(id);
        }
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> toggle(String songId) async {
    final wasFav = _favoriteIds.contains(songId);
    // Optimistic update
    if (wasFav) {
      _favoriteIds.remove(songId);
    } else {
      _favoriteIds.add(songId);
    }
    notifyListeners();

    try {
      if (wasFav) {
        await Api.delete('/favorites/$songId');
      } else {
        await Api.post('/favorites/$songId', {});
      }
    } catch (e) {
      // Revert on error
      if (wasFav) {
        _favoriteIds.add(songId);
      } else {
        _favoriteIds.remove(songId);
      }
      notifyListeners();
      debugPrint('FavoritesService.toggle error: $e');
    }
  }
}

// Global singleton so any widget can access it
final favoritesService = FavoritesService();
