import 'package:flutter/material.dart';

class KeyboardShortcutsController extends ChangeNotifier {
  Map<String, String> shortcuts = {
    'Space': 'Play/Pause',
    'N': 'Próxima',
    'P': 'Anterior',
    'R': 'Repetir',
    'S': 'Embaralhar',
    'L': 'Like',
    'Q': 'Fila',
    'M': 'Menu',
    '↑': 'Volume +',
    '↓': 'Volume -',
  };

  List<MapEntry<String, String>> getShortcuts() {
    return shortcuts.entries.toList();
  }
}
