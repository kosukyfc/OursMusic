import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FontSizeAdjuster extends ChangeNotifier {
  double _fontSize = 16.0;
  double _lineHeight = 1.5;
  double _letterSpacing = 0.0;
  
  double get fontSize => _fontSize;
  double get lineHeight => _lineHeight;
  double get letterSpacing => _letterSpacing;
  
  Map<String, double> get presets => {
    'S': 14.0,
    'M': 16.0,
    'L': 18.0,
    'XL': 20.0,
  };
  
  void setFontSize(double size) {
    _fontSize = size.clamp(12.0, 28.0);
    notifyListeners();
    _savePersistence();
  }
  
  void setLineHeight(double height) {
    _lineHeight = height.clamp(1.0, 2.5);
    notifyListeners();
    _savePersistence();
  }
  
  void setLetterSpacing(double spacing) {
    _letterSpacing = spacing.clamp(-2.0, 5.0);
    notifyListeners();
    _savePersistence();
  }
  
  void applyPreset(String preset) {
    _fontSize = presets[preset] ?? 16.0;
    notifyListeners();
    _savePersistence();
  }
  
  Future<void> _savePersistence() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble('fontSize', _fontSize);
    await prefs.setDouble('lineHeight', _lineHeight);
    await prefs.setDouble('letterSpacing', _letterSpacing);
  }
  
  Future<void> loadPersistence() async {
    final prefs = await SharedPreferences.getInstance();
    _fontSize = prefs.getDouble('fontSize') ?? 16.0;
    _lineHeight = prefs.getDouble('lineHeight') ?? 1.5;
    _letterSpacing = prefs.getDouble('letterSpacing') ?? 0.0;
    notifyListeners();
  }
}
