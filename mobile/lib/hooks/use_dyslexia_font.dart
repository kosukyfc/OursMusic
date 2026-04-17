import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class DyslexiaFont extends ChangeNotifier {
  bool _enabled = false;
  String _fontFamily = 'Roboto';
  int _contrastMode = 0;
  double _fontSize = 14.0;
  
  bool get enabled => _enabled;
  String get fontFamily => _fontFamily;
  int get contrastMode => _contrastMode;
  double get fontSize => _fontSize;
  
  List<String> get availableFonts => ['Roboto', 'OpenDyslexic', 'Trebuchet MS'];
  List<String> get contrastModes => ['Normal', 'Alto Contraste', 'Invertido'];
  
  void toggleDyslexia(bool value) {
    _enabled = value;
    if (_enabled && _fontFamily == 'Roboto') {
      _fontFamily = 'OpenDyslexic';
    }
    notifyListeners();
    _savePersistence();
  }
  
  void setFont(String font) {
    _fontFamily = font;
    notifyListeners();
    _savePersistence();
  }
  
  void setContrastMode(int mode) {
    _contrastMode = mode.clamp(0, 2);
    notifyListeners();
    _savePersistence();
  }
  
  void setFontSize(double size) {
    _fontSize = size.clamp(12.0, 24.0);
    notifyListeners();
    _savePersistence();
  }
  
  Color getBackgroundColor() {
    switch (_contrastMode) {
      case 0: return Colors.white;
      case 1: return Colors.grey[900] ?? Colors.black;
      case 2: return Colors.black;
      default: return Colors.white;
    }
  }
  
  Color getTextColor() {
    switch (_contrastMode) {
      case 0: return Colors.black;
      case 1: return Colors.white;
      case 2: return Colors.yellow;
      default: return Colors.black;
    }
  }
  
  Future<void> _savePersistence() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('dyslexiaEnabled', _enabled);
    await prefs.setString('dyslexiaFont', _fontFamily);
    await prefs.setInt('dyslexiaContrast', _contrastMode);
    await prefs.setDouble('dyslexiaFontSize', _fontSize);
  }
  
  Future<void> loadPersistence() async {
    final prefs = await SharedPreferences.getInstance();
    _enabled = prefs.getBool('dyslexiaEnabled') ?? false;
    _fontFamily = prefs.getString('dyslexiaFont') ?? 'Roboto';
    _contrastMode = prefs.getInt('dyslexiaContrast') ?? 0;
    _fontSize = prefs.getDouble('dyslexiaFontSize') ?? 14.0;
    notifyListeners();
  }
}
