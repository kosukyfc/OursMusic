import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

// ─── Models ───────────────────────────────────────────────────────────────────

class Song {
  final String id;
  final String title;
  final String artist;
  final String? coverUrl;
  final int duration;

  const Song({
    required this.id,
    required this.title,
    required this.artist,
    this.coverUrl,
    required this.duration,
  });

  factory Song.fromJson(Map<String, dynamic> json) {
    return Song(
      id: json['id'] as String,
      title: json['title'] as String,
      artist: json['artist'] as String? ?? 'Unknown',
      coverUrl: json['coverUrl'] as String?,
      duration: json['duration'] as int,
    );
  }
}

// ─── Services ────────────────────────────────────────────────────────────────

class MusicService {
  final String apiUrl;
  final String token;

  const MusicService({
    required this.apiUrl,
    required this.token,
  });

  Future<List<Song>> fetchSongs() async {
    final response = await http.get(
      Uri.parse('$apiUrl/songs'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body)['songs'];
      return data.map((json) => Song.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load songs');
    }
  }

  Future<Song> fetchSong(String id) async {
    final response = await http.get(
      Uri.parse('$apiUrl/songs/$id'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      return Song.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to load song');
    }
  }
}

// ─── API Client Provider (Riverpod) ───────────────────────────────────────────

final musicServiceProvider = Provider<MusicService>((ref) {
  const apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://localhost:3000',
  );
  const token = String.fromEnvironment('AUTH_TOKEN', defaultValue: '');

  return MusicService(apiUrl: apiUrl, token: token);
});

// ─── Songs Provider ──────────────────────────────────────────────────────────

final songsProvider = FutureProvider<List<Song>>((ref) async {
  final musicService = ref.watch(musicServiceProvider);
  return musicService.fetchSongs();
});

// ─── Song Detail Provider ────────────────────────────────────────────────────

final songProvider = FutureProvider.family<Song, String>((ref, id) async {
  final musicService = ref.watch(musicServiceProvider);
  return musicService.fetchSong(id);
});

// ─── Favorites Provider (Local State) ────────────────────────────────────────

final favoriteSongsProvider = StateNotifierProvider<FavoriteSongsNotifier, List<String>>((ref) {
  return FavoriteSongsNotifier();
});

class FavoriteSongsNotifier extends StateNotifier<List<String>> {
  FavoriteSongsNotifier() : super([]);

  void addFavorite(String songId) {
    if (!state.contains(songId)) {
      state = [...state, songId];
    }
  }

  void removeFavorite(String songId) {
    state = state.where((id) => id != songId).toList();
  }

  bool isFavorite(String songId) => state.contains(songId);
}

// ─── Usage Example in Widget ─────────────────────────────────────────────────
/*
class SongsListScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final songsAsync = ref.watch(songsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Songs')),
      body: songsAsync.when(
        data: (songs) => ListView.builder(
          itemCount: songs.length,
          itemBuilder: (context, index) {
            final song = songs[index];
            final isFavorite = ref.watch(
              favoriteSongsProvider.select((fav) => fav.contains(song.id)),
            );

            return ListTile(
              title: Text(song.title),
              subtitle: Text(song.artist),
              trailing: IconButton(
                icon: Icon(
                  isFavorite ? Icons.favorite : Icons.favorite_border,
                ),
                onPressed: () {
                  if (isFavorite) {
                    ref.read(favoriteSongsProvider.notifier).removeFavorite(song.id);
                  } else {
                    ref.read(favoriteSongsProvider.notifier).addFavorite(song.id);
                  }
                },
              ),
            );
          },
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
      ),
    );
  }
}
*/
