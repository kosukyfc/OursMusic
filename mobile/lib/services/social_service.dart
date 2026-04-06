import 'package:flutter/foundation.dart';
import '../api.dart';

/// Handles follow/unfollow and profile fetching.
class SocialService extends ChangeNotifier {
  final Set<String> _following = {};

  bool isFollowing(String userId) => _following.contains(userId);

  Future<void> loadFollowing() async {
    try {
      final data = await Api.get('/social/following');
      if (data is List) {
        _following.clear();
        for (final u in data) {
          final id = u is Map ? u['id']?.toString() : null;
          if (id != null) _following.add(id);
        }
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> toggleFollow(String userId) async {
    final wasFollowing = _following.contains(userId);
    // Optimistic update
    if (wasFollowing) {
      _following.remove(userId);
    } else {
      _following.add(userId);
    }
    notifyListeners();

    try {
      if (wasFollowing) {
        await Api.delete('/social/follow/$userId');
      } else {
        await Api.post('/social/follow/$userId', {});
      }
    } catch (e) {
      // Revert on error
      if (wasFollowing) {
        _following.add(userId);
      } else {
        _following.remove(userId);
      }
      notifyListeners();
      debugPrint('toggleFollow error: $e');
    }
  }

  Future<Map<String, dynamic>?> getProfile(String userId) async {
    try {
      final data = await Api.get('/social/profile/$userId');
      return data is Map<String, dynamic> ? data : null;
    } catch (_) {
      return null;
    }
  }
}
