import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class SmartQueueController extends ChangeNotifier {
  String _currentMood = 'happy';
  List<Map<String, dynamic>> _suggestions = [];

  String get currentMood => _currentMood;
  List<Map<String, dynamic>> get suggestions => _suggestions;

  final Map<String, List<String>> moodGenres = {
    'happy': ['pop', 'funk', 'electronic'],
    'sad': ['ballad', 'acoustic', 'indie'],
    'energetic': ['rock', 'punk', 'dance'],
    'chill': ['ambient', 'lo-fi', 'jazz'],
  };

  void setMood(String mood) {
    _currentMood = mood;
    generateSuggestions();
    notifyListeners();
  }

  void generateSuggestions() {
    final genres = moodGenres[_currentMood] ?? [];
    _suggestions = genres
        .map((genre) => {
              'title': 'Song in $genre',
              'artist': 'Various',
              'genre': genre,
              'score': 0.5 + (genres.indexOf(genre) * 0.25),
            })
        .toList();
    notifyListeners();
  }

  String getNextSong() {
    if (_suggestions.isEmpty) generateSuggestions();
    return _suggestions.isNotEmpty ? _suggestions.first['title'] : 'Unknown';
  }
}
