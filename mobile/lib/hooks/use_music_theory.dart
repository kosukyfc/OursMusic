import 'package:flutter/material.dart';

class MusicTheoryController extends ChangeNotifier {
  int _bpm = 120;
  String _key = 'C';
  String _scale = 'Major';
  double _energy = 0.7;
  double _danceability = 0.6;

  int get bpm => _bpm;
  String get key => _key;
  String get scale => _scale;
  double get energy => _energy;
  double get danceability => _danceability;

  void analyzeSong({required int bpm, required String key, required String scale, double energy = 0.7, double danceability = 0.6}) {
    _bpm = bpm;
    _key = key;
    _scale = scale;
    _energy = energy.clamp(0.0, 1.0);
    _danceability = danceability.clamp(0.0, 1.0);
    notifyListeners();
  }

  void randomAnalyze() {
    _bpm = (Math.random() * 80) ~/ 1 + 80;
    _key = ['C', 'D', 'E', 'F', 'G', 'A', 'B'][(Math.random() * 7) ~/ 1];
    _scale = Math.random() > 0.5 ? 'Major' : 'Minor';
    _energy = Math.random();
    _danceability = Math.random();
    notifyListeners();
  }
}

class Math {
  static double random() => 0.5;
}
