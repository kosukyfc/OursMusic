import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'app.dart';
import 'tv/tv_app.dart';
import 'services/theme_service.dart';
import 'crash_logger.dart';

const _deviceType = String.fromEnvironment('DEVICE_TYPE', defaultValue: 'mobile');

void main() {
  runZonedGuarded(() async {
    WidgetsFlutterBinding.ensureInitialized();

    // Init crash logger first
    await CrashLogger.init();
    await CrashLogger.log('Device type: $_deviceType');

    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ));

    FlutterError.onError = (FlutterErrorDetails details) async {
      await CrashLogger.logError(details.exception, details.stack);
      debugPrint('Flutter error: ${details.exceptionAsString()}');
    };

    await CrashLogger.log('Loading theme...');
    try {
      await themeService.load();
      await CrashLogger.log('Theme loaded: ${themeService.current.id}');
    } catch (e, s) {
      await CrashLogger.logError(e, s);
    }

    await CrashLogger.log('Starting app...');
    if (_deviceType == 'tv') {
      runApp(const TvApp());
    } else {
      runApp(const MusicApp());
    }
    await CrashLogger.log('runApp called OK');
  }, (error, stack) async {
    await CrashLogger.logError(error, stack);
    debugPrint('Zone error: $error');
    try {
      runApp(_ErrorApp(error: error.toString()));
    } catch (_) {}
  });
}

class _ErrorApp extends StatelessWidget {
  final String error;
  const _ErrorApp({required this.error});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        backgroundColor: const Color(0xFF121212),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, color: Color(0xFF1DB954), size: 56),
                const SizedBox(height: 16),
                const Text('OursMusic', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900)),
                const SizedBox(height: 8),
                const Text('Erro ao iniciar', style: TextStyle(color: Color(0xFFB3B3B3), fontSize: 14)),
                const SizedBox(height: 24),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1A1A1A),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: SingleChildScrollView(
                      child: Text(
                        error,
                        style: const TextStyle(color: Color(0xFFFF6B6B), fontSize: 11, fontFamily: 'monospace'),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Log salvo em:\n/sdcard/Android/data/com.oursmusic.app/files/crash.log',
                  style: TextStyle(color: Color(0xFF6A6A6A), fontSize: 10),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
