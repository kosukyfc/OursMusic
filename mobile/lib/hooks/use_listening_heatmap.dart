import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class ListeningHeatmapController extends ChangeNotifier {
  final Map<String, int> _heatmap = {};
  
  Map<String, int> get heatmap => _heatmap;
  
  Future<void> recordListening() async {
    final now = DateTime.now();
    final dayOfWeek = (now.weekday % 7).toString();
    final hour = now.hour.toString().padLeft(2, '0');
    final key = '$dayOfWeek-$hour';
    
    _heatmap[key] = (_heatmap[key] ?? 0) + 1;
    notifyListeners();
    await _savePersistence();
  }
  
  double getIntensity(int day, int hour) {
    final key = '$day-${hour.toString().padLeft(2, '0')}';
    final value = _heatmap[key] ?? 0;
    return (value / 10).clamp(0.0, 1.0);
  }
  
  Future<void> _savePersistence() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('heatmap', jsonEncode(_heatmap));
  }
  
  Future<void> loadPersistence() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString('heatmap');
    if (data != null) {
      final decoded = jsonDecode(data) as Map;
      _heatmap.clear();
      _heatmap.addAll(decoded.cast<String, int>());
      notifyListeners();
    }
  }
}
