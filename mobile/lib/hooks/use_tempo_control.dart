import 'package:flutter/material.dart';

class TempoController extends ChangeNotifier {
  double _tempo = 1.0;
  
  double get tempo => _tempo;
  
  void increase() {
    if (_tempo < 2.0) {
      _tempo = (_tempo + 0.1).clamp(0.5, 2.0);
      notifyListeners();
    }
  }
  
  void decrease() {
    if (_tempo > 0.5) {
      _tempo = (_tempo - 0.1).clamp(0.5, 2.0);
      notifyListeners();
    }
  }
  
  void setTempo(double value) {
    _tempo = value.clamp(0.5, 2.0);
    notifyListeners();
  }
  
  void reset() {
    _tempo = 1.0;
    notifyListeners();
  }
  
  List<double> get presets => [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
}
