import 'package:flutter/material.dart';
import 'package:volume_controller/volume_controller.dart';

class VolumeShortcuts extends ChangeNotifier {
  double _volume = 0.5;
  bool _muteOnCall = false;
  
  double get volume => _volume;
  bool get muteOnCall => _muteOnCall;
  
  Future<void> increaseVolume() async {
    _volume = (_volume + 0.1).clamp(0.0, 1.0);
    try {
      VolumeController().setVolume(_volume);
    } catch (e) {
      // Silently fail on platform
    }
    notifyListeners();
  }
  
  Future<void> decreaseVolume() async {
    _volume = (_volume - 0.1).clamp(0.0, 1.0);
    try {
      VolumeController().setVolume(_volume);
    } catch (e) {
      // Silently fail on platform
    }
    notifyListeners();
  }
  
  Future<void> toggleMute() async {
    _volume = _volume == 0 ? 0.5 : 0;
    try {
      VolumeController().setVolume(_volume);
    } catch (e) {
      // Silently fail on platform
    }
    notifyListeners();
  }
  
  void setMuteOnCall(bool value) {
    _muteOnCall = value;
    notifyListeners();
  }
  
  // Gestos suportados
  List<String> get supportedGestures => [
    'Volume Up: Next',
    'Volume Down: Previous',
    'Long Press Up: Increase Volume',
    'Long Press Down: Decrease Volume',
    'Double Tap: Toggle Play',
  ];
}
