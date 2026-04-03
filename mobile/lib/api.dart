import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const kApiBase = String.fromEnvironment('API_URL', defaultValue: 'http://192.168.15.3:3000');
const _deviceType = String.fromEnvironment('DEVICE_TYPE', defaultValue: 'mobile');

class Api {
  static String? _token;

  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _token = prefs.getString('token');
    } catch (e) {
      debugPrint('Api.init error: $e');
    }
  }

  static Future<void> saveToken(String token) async {
    _token = token;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', token);
    } catch (_) {}
  }

  static Future<void> clearToken() async {
    _token = null;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('token');
    } catch (_) {}
  }

  static bool get isLoggedIn => _token != null;
  static String? get token => _token;

  static Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    'X-Device-Type': _deviceType,
    if (_token != null) 'Authorization': 'Bearer $_token',
  };

  static Future<dynamic> get(String path) async {
    final res = await http.get(
      Uri.parse('$kApiBase$path'),
      headers: _headers,
    ).timeout(const Duration(seconds: 15));
    if (res.statusCode >= 400) {
      final body = _tryDecode(res.body);
      throw Exception(body?['message'] ?? res.reasonPhrase ?? 'Error ${res.statusCode}');
    }
    return _tryDecode(res.body);
  }

  static Future<dynamic> post(String path, Map<String, dynamic> body) async {
    final res = await http.post(
      Uri.parse('$kApiBase$path'),
      headers: _headers,
      body: jsonEncode(body),
    ).timeout(const Duration(seconds: 15));
    if (res.statusCode >= 400) {
      final b = _tryDecode(res.body);
      throw Exception(b?['message'] ?? res.reasonPhrase ?? 'Error ${res.statusCode}');
    }
    return _tryDecode(res.body);
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
    request.files.add(
      http.MultipartFile.fromBytes('file', bytes, filename: filename),
    );
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
    try {
      return jsonDecode(body);
    } catch (_) {
      return null;
    }
  }
}

class Song {
  final String id, title;
  final String? artist, albumName, coverUrl;
  final int duration;
  final bool available;

  Song({
    required this.id,
    required this.title,
    this.artist,
    this.albumName,
    this.coverUrl,
    required this.duration,
    this.available = true,
  });

  factory Song.fromJson(Map<String, dynamic> j) => Song(
    id: j['id']?.toString() ?? '',
    title: j['title']?.toString() ?? 'Unknown',
    artist: j['artist']?.toString(),
    albumName: j['albumName']?.toString(),
    coverUrl: j['coverUrl']?.toString(),
    duration: (j['duration'] as num?)?.toInt() ?? 0,
    available: j['available'] as bool? ?? true,
  );

  String get durationStr {
    final m = duration ~/ 60;
    final s = duration % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }
}
