import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

/// Writes crash logs to a file on device storage.
/// Read the log at: /sdcard/Android/data/com.oursmusic.app/files/crash.log
class CrashLogger {
  static File? _logFile;
  static bool _initialized = false;

  static Future<void> init() async {
    try {
      final dir = await getExternalStorageDirectory() ?? await getApplicationDocumentsDirectory();
      _logFile = File('${dir.path}/crash.log');
      // Clear old log on fresh start
      if (await _logFile!.exists()) await _logFile!.delete();
      await _logFile!.writeAsString('=== OursMusic Crash Log ===\nStarted: ${DateTime.now()}\n\n');
      _initialized = true;
      await log('App started OK');
    } catch (e) {
      debugPrint('CrashLogger init failed: $e');
    }
  }

  static Future<void> log(String message) async {
    final line = '[${DateTime.now().toIso8601String()}] $message\n';
    debugPrint(line);
    if (!_initialized || _logFile == null) return;
    try {
      await _logFile!.writeAsString(line, mode: FileMode.append);
    } catch (_) {}
  }

  static Future<void> logError(Object error, StackTrace? stack) async {
    await log('ERROR: $error');
    if (stack != null) await log('STACK: $stack');
  }
}
