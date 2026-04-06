import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const kApiBase = String.fromEnvironment('API_URL', defaultValue: 'http://192.168.15.3:3000');
const _deviceType = String.fromEnvironment('DEVICE_TYPE', defaultValue: 'mobile');

class Api {
  static String? _token;
  static String? _refreshToken;

  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _token = prefs.getString('token');
      _refreshToken = prefs.getString('refresh_token');
    } catch (e) {
      debugPrint('Api.init error: $e');
    }
  }

  static Future<void> saveTokens(String access, String? refresh) async {
    _token = access;
    _refreshToken = refresh;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', access);
      if (refresh != null) await prefs.setString('refresh_token', refresh);
    } catch (_) {}
  }

  /// Kept for backwards compat
  static Future<void> saveToken(String token) => saveTokens(token, null);

  static Future<void> clearToken() async {
    _token = null;
    _refreshToken = null;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('token');
      await prefs.remove('refresh_token');
    } catch (_) {}
  }

  static bool get isLoggedIn => _token != null;
  static String? get token => _token;

  static Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    'X-Device-Type': _deviceType,
    if (_token != null) 'Authorization': 'Bearer $_token',
  };

  /// Try to refresh the access token using the stored refresh token.
  static Future<bool> _tryRefresh() async {
    if (_refreshToken == null) return false;
    try {
      final res = await http.post(
        Uri.parse('$kApiBase/auth/refresh'),
        headers: {'Content-Type': 'application/json', 'X-Device-Type': _deviceType},
        body: jsonEncode({'refresh_token': _refreshToken}),
      ).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200 || res.statusCode == 201) {
        final data = _tryDecode(res.body);
        final access = data?['access_token']?.toString();
        final refresh = data?['refresh_token']?.toString();
        if (access != null) {
          await saveTokens(access, refresh ?? _refreshToken);
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  static Future<dynamic> get(String path) async {
    var res = await http.get(Uri.parse('$kApiBase$path'), headers: _headers)
        .timeout(const Duration(seconds: 15));
    if (res.statusCode == 401 && await _tryRefresh()) {
      res = await http.get(Uri.parse('$kApiBase$path'), headers: _headers)
          .timeout(const Duration(seconds: 15));
    }
    if (res.statusCode >= 400) {
      final body = _tryDecode(res.body);
      throw Exception(body?['message'] ?? res.reasonPhrase ?? 'Error ${res.statusCode}');
    }
    return _tryDecode(res.body);
  }

  static Future<dynamic> post(String path, Map<String, dynamic> body) async {
    var res = await http.post(Uri.parse('$kApiBase$path'), headers: _headers, body: jsonEncode(body))
        .timeout(const Duration(seconds: 15));
    if (res.statusCode == 401 && await _tryRefresh()) {
      res = await http.post(Uri.parse('$kApiBase$path'), headers: _headers, body: jsonEncode(body))
          .timeout(const Duration(seconds: 15));
    }
    if (res.statusCode >= 400) {
      final b = _tryDecode(res.body);
      throw Exception(b?['message'] ?? res.reasonPhrase ?? 'Error ${res.statusCode}');
    }
    return _tryDecode(res.body);
  }

  static Future<dynamic> patch(String path, Map<String, dynamic> body) async {
    var res = await http.patch(Uri.parse('$kApiBase$path'), headers: _headers, body: jsonEncode(body))
        .timeout(const Duration(seconds: 15));
    if (res.statusCode == 401 && await _tryRefresh()) {
      res = await http.patch(Uri.parse('$kApiBase$path'), headers: _headers, body: jsonEncode(body))
          .timeout(const Duration(seconds: 15));
    }
    if (res.statusCode >= 400) {
      final b = _tryDecode(res.body);
      throw Exception(b?['message'] ?? res.reasonPhrase ?? 'Error ${res.statusCode}');
    }
    return _tryDecode(res.body);
  }

  static Future<void> delete(String path) async {
    var res = await http.delete(Uri.parse('$kApiBase$path'), headers: _headers)
        .timeout(const Duration(seconds: 15));
    if (res.statusCode == 401 && await _tryRefresh()) {
      res = await http.delete(Uri.parse('$kApiBase$path'), headers: _headers)
          .timeout(const Duration(seconds: 15));
    }
    if (res.statusCode >= 400) {
      final b = _tryDecode(res.body);
      throw Exception(b?['message'] ?? res.reasonPhrase ?? 'Error ${res.statusCode}');
    }
  }

  static Future<dynamic> uploadFile(
    String path,
    List<int> bytes,
    String filename,
    String mimeType,
  ) async {
    final request = http.MultipartRequest('POST', Uri.parse('$kApiBase$path'));
    request.headers['X-Device-Type'] = _deviceType;
    if (_token != null) request.headers['Authorization'] = 'Bearer $_token';
    request.files.add(http.MultipartFile.fromBytes('file', bytes, filename: filename));
    final streamed = await request.send().timeout(const Duration(seconds: 30));
    final res = await http.Response.fromStream(streamed);
    if (res.statusCode >= 400) {
      final b = _tryDecode(res.body);
      throw Exception(b?['message'] ?? res.reasonPhrase ?? 'Error ${res.statusCode}');
    }
    return _tryDecode(res.body);
  }

  static dynamic _tryDecode(String body) {
    if (body.isEmpty) return null;
    try { return jsonDecode(body); } catch (_) { return null; }
  }
}

class Song {
  final String id, title;
  final String? artist, albumName, coverUrl;
  final int duration;
  final bool available;
  final int playCount;

  Song({
    required this.id,
    required this.title,
    this.artist,
    this.albumName,
    this.coverUrl,
    required this.duration,
    this.available = true,
    this.playCount = 0,
  });

  factory Song.fromJson(Map<String, dynamic> j) => Song(
    id: j['id']?.toString() ?? '',
    title: j['title']?.toString() ?? 'Unknown',
    artist: j['artist']?.toString(),
    albumName: j['albumName']?.toString(),
    coverUrl: j['coverUrl']?.toString(),
    duration: (j['duration'] as num?)?.toInt() ?? 0,
    available: j['available'] as bool? ?? true,
    playCount: (j['playCount'] as num?)?.toInt() ?? 0,
  );

  String get durationStr {
    final m = duration ~/ 60;
    final s = duration % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }
}

class Playlist {
  final String id, title;
  final bool isPublic;
  final List<Song> songs;

  Playlist({
    required this.id,
    required this.title,
    this.isPublic = false,
    this.songs = const [],
  });

  factory Playlist.fromJson(Map<String, dynamic> j) => Playlist(
    id: j['id']?.toString() ?? '',
    title: j['title']?.toString() ?? 'Playlist',
    isPublic: j['isPublic'] as bool? ?? false,
    songs: (j['songs'] as List?)
        ?.whereType<Map<String, dynamic>>()
        .map((s) => Song.fromJson(s['song'] ?? s))
        .toList() ?? [],
  );

  int get totalDuration => songs.fold(0, (sum, s) => sum + s.duration);

  String get durationStr {
    final total = totalDuration;
    final h = total ~/ 3600;
    final m = (total % 3600) ~/ 60;
    if (h > 0) return '${h}h ${m}min';
    return '${m}min';
  }
}
