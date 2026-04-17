import 'package:flutter/material.dart';
import 'dart:math' as math;

class AudioVisualizer extends ChangeNotifier {
  List<double> _bars = List.filled(20, 0.0);
  double _rotation = 0.0;
  
  List<double> get bars => _bars;
  double get rotation => _rotation;
  
  void updateBars(List<double> newBars) {
    _bars = newBars.take(20).toList();
    if (_bars.length < 20) {
      _bars.addAll(List.filled(20 - _bars.length, 0.0));
    }
    notifyListeners();
  }
  
  void rotate(double angle) {
    _rotation = (_rotation + angle) % 360;
    notifyListeners();
  }
  
  void reset() {
    _bars = List.filled(20, 0.0);
    _rotation = 0.0;
    notifyListeners();
  }
  
  List<double> generateRandomBars() {
    return List.generate(20, (_) => (Math.random() * 0.8 + 0.2));
  }
}

class Math {
  static double random() => math.Random().nextDouble();
}
