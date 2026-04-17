import 'package:flutter/material.dart';

class VoiceCommandsController extends ChangeNotifier {
  bool _enabled = false;
  String _lastCommand = '';

  bool get enabled => _enabled;
  String get lastCommand => _lastCommand;

  List<String> get supportedCommands => [
    'Play',
    'Pause',
    'Next',
    'Previous',
    'Repeat',
    'Shuffle',
    'Volume Up',
    'Volume Down',
  ];

  void toggle() {
    _enabled = !_enabled;
    notifyListeners();
  }

  void executeCommand(String command) {
    _lastCommand = command;
    notifyListeners();
  }
}
