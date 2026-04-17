import 'package:flutter/material.dart';

class AudioDuckingController extends ChangeNotifier {
  bool _enabled = true;
  double _reductionAmount = 0.3; // 0-1

  bool get enabled => _enabled;
  double get reductionAmount => _reductionAmount;

  void toggle() {
    _enabled = !_enabled;
    notifyListeners();
  }

  void setReduction(double value) {
    _reductionAmount = value.clamp(0.0, 1.0);
    notifyListeners();
  }
}
