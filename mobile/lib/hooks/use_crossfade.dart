import 'package:flutter/material.dart';

class CrossfadeController extends ChangeNotifier {
  bool _enabled = false;
  int _duration = 5000; // ms

  bool get enabled => _enabled;
  int get duration => _duration;

  void toggle() {
    _enabled = !_enabled;
    notifyListeners();
  }

  void setDuration(int ms) {
    _duration = ms.clamp(100, 10000);
    notifyListeners();
  }

  List<int> get presets => [100, 1000, 3000, 5000, 7000, 10000];
}
