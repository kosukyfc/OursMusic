import 'package:flutter/material.dart';

class GaplessPlaybackController extends ChangeNotifier {
  bool _enabled = true;
  int _queueOverlapMs = 500;
  int _preloadThresholdMs = 3000;

  bool get enabled => _enabled;
  int get queueOverlapMs => _queueOverlapMs;
  int get preloadThresholdMs => _preloadThresholdMs;

  void toggle() {
    _enabled = !_enabled;
    notifyListeners();
  }

  void setQueueOverlap(int ms) {
    _queueOverlapMs = ms.clamp(0, 2000);
    notifyListeners();
  }

  void setPreloadThreshold(int ms) {
    _preloadThresholdMs = ms.clamp(1000, 10000);
    notifyListeners();
  }
}
