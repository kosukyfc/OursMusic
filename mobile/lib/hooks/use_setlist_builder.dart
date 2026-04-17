import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class Setlist {
  final String id;
  final String name;
  final List<Map<String, dynamic>> songs;
  final DateTime createdAt;
  
  Setlist({
    required this.id,
    required this.name,
    required this.songs,
    required this.createdAt,
  });
  
  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'songs': songs,
    'createdAt': createdAt.toIso8601String(),
  };
  
  factory Setlist.fromJson(Map<String, dynamic> json) => Setlist(
    id: json['id'],
    name: json['name'],
    songs: List<Map<String, dynamic>>.from(json['songs']),
    createdAt: DateTime.parse(json['createdAt']),
  );
}

class SetlistBuilder extends ChangeNotifier {
  List<Setlist> _setlists = [];
  
  List<Setlist> get setlists => _setlists;
  
  void createSetlist(String name) {
    final setlist = Setlist(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      name: name,
      songs: [],
      createdAt: DateTime.now(),
    );
    _setlists.add(setlist);
    notifyListeners();
    _savePersistence();
  }
  
  void addSongToSetlist(String setlistId, Map<String, dynamic> song) {
    final idx = _setlists.indexWhere((s) => s.id == setlistId);
    if (idx >= 0) {
      _setlists[idx].songs.add(song);
      notifyListeners();
      _savePersistence();
    }
  }
  
  void removeSongFromSetlist(String setlistId, int songIdx) {
    final idx = _setlists.indexWhere((s) => s.id == setlistId);
    if (idx >= 0 && songIdx < _setlists[idx].songs.length) {
      _setlists[idx].songs.removeAt(songIdx);
      notifyListeners();
      _savePersistence();
    }
  }
  
  Duration getTotalDuration(String setlistId) {
    final setlist = _setlists.firstWhere((s) => s.id == setlistId, orElse: () => Setlist(id: '', name: '', songs: [], createdAt: DateTime.now()));
    final ms = setlist.songs.fold<int>(0, (sum, song) => sum + (song['duration'] as int? ?? 0));
    return Duration(milliseconds: ms);
  }
  
  void deleteSetlist(String setlistId) {
    _setlists.removeWhere((s) => s.id == setlistId);
    notifyListeners();
    _savePersistence();
  }
  
  Future<void> _savePersistence() async {
    final prefs = await SharedPreferences.getInstance();
    final json = jsonEncode(_setlists.map((s) => s.toJson()).toList());
    await prefs.setString('setlists', json);
  }
  
  Future<void> loadPersistence() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString('setlists');
    if (data != null) {
      final decoded = jsonDecode(data) as List;
      _setlists = decoded.map((item) => Setlist.fromJson(item)).toList();
      notifyListeners();
    }
  }
}
