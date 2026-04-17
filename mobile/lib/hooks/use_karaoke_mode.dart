import 'package:flutter/material.dart';

class KaraokeModeController extends ChangeNotifier {
  bool _enabled = false;
  double _vocalReduction = 0.0; // 0-1

  bool get enabled => _enabled;
  double get vocalReduction => _vocalReduction;

  void toggle() {
    _enabled = !_enabled;
    notifyListeners();
  }

  void setVocalReduction(double value) {
    _vocalReduction = value.clamp(0.0, 1.0);
    notifyListeners();
  }
}
