import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api.dart';
import 'theme.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/splash_screen.dart';
import 'screens/onboarding_screen.dart';
import 'services/update_service.dart';
import 'services/theme_service.dart';
import 'crash_logger.dart';

const _appVersion = String.fromEnvironment('APP_VERSION', defaultValue: '1.0.0');

// Global navigator key so dialogs can be shown from anywhere
final navigatorKey = GlobalKey<NavigatorState>();

class MusicApp extends StatefulWidget {
  const MusicApp({super.key});
  @override
  State<MusicApp> createState() => _MusicAppState();
}

class _MusicAppState extends State<MusicApp> {
  bool _showSplash = true;
  bool _loading = true;
  bool _loggedIn = false;
  bool _showOnboarding = false;

  @override
  void initState() {
    super.initState();
    themeService.addListener(_onThemeChange);
    _init();
  }

  void _onThemeChange() => setState(() {});

  @override
  void dispose() {
    themeService.removeListener(_onThemeChange);
    super.dispose();
  }

  Future<void> _init() async {
    await CrashLogger.log('MusicApp._init() start');
    await Api.init();
    await CrashLogger.log('Api.init() done, loggedIn=${Api.isLoggedIn}');
    if (mounted) setState(() { _loading = false; _loggedIn = Api.isLoggedIn; });
    await CrashLogger.log('MusicApp._init() done');
  }

  void _onSplashDone() {
    setState(() => _showSplash = false);
    Future.delayed(const Duration(seconds: 2), () async {
      final ctx = navigatorKey.currentContext;
      if (ctx == null || !ctx.mounted) return;
      await _checkChangelog();
      final ctx2 = navigatorKey.currentContext;
      if (ctx2 != null && ctx2.mounted) {
        await UpdateService.checkForUpdate(ctx2);
      }
      // Agenda o banner de 5 minutos após o usuário dispensar o dialog
      _scheduleGracePeriodBanner();
    });
  }

  // Exibe banner não-intrusivo após 5 minutos se há grace period ativo
  void _scheduleGracePeriodBanner() {
    Future.delayed(const Duration(minutes: 5), () async {
      final ctx = navigatorKey.currentContext;
      if (ctx == null || !ctx.mounted) return;
      try {
        final res = await Api.get('/app/version');
        if (res is! Map<String, dynamic>) return;
        final serverVersion = res['version']?.toString() ?? '';
        final remaining = await UpdateService.getGracePeriodRemaining(serverVersion);
        if (remaining == null || remaining == Duration.zero) return;
        final hours = remaining.inHours;
        if (!ctx.mounted) return;
        ScaffoldMessenger.of(ctx).showMaterialBanner(MaterialBanner(
          backgroundColor: const Color(0xFF2A1A00),
          leading: const Icon(Icons.warning_amber_rounded, color: Color(0xFFFFA500)),
          content: Text(
            'Você tem $hours horas para atualizar o app antes que esta versão deixe de funcionar.',
            style: const TextStyle(color: Color(0xFFFFCC80), fontSize: 13),
          ),
          actions: [
            TextButton(
              onPressed: () {
                ScaffoldMessenger.of(ctx).hideCurrentMaterialBanner();
                UpdateService.checkForUpdate(ctx);
              },
              child: const Text('Atualizar', style: TextStyle(color: Color(0xFFFFA500), fontWeight: FontWeight.w800)),
            ),
            TextButton(
              onPressed: () => ScaffoldMessenger.of(ctx).hideCurrentMaterialBanner(),
              child: const Text('Fechar', style: TextStyle(color: Color(0xFFB3B3B3))),
            ),
          ],
        ));
      } catch (_) {}
    });
  }

  Future<void> _checkChangelog() async {
    final prefs = await SharedPreferences.getInstance();
    final lastSeen = prefs.getString('last_seen_version') ?? '';
    if (lastSeen == _appVersion) return; // already shown for this version

    await prefs.setString('last_seen_version', _appVersion);
    if (!mounted) return;

    // Fetch changelog from server
    try {
      final res = await Api.get('/app/version');
      if (res is! Map<String, dynamic>) return;
      final notes = res['notes']?.toString() ?? '';
      final version = res['version']?.toString() ?? _appVersion;
      if (notes.isNotEmpty && mounted) {
        _showChangelogDialog(version, notes);
      }
    } catch (_) {}
  }

  void _showChangelogDialog(String version, String notes) {
    final ctx = navigatorKey.currentContext;
    if (ctx == null) return;
    showDialog(
      context: ctx,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF282828),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(children: [
          Container(
            width: 36, height: 36,
            decoration: const BoxDecoration(color: kAccent, shape: BoxShape.circle),
            child: const Icon(Icons.play_arrow_rounded, color: Colors.black, size: 22),
          ),
          const SizedBox(width: 10),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('OursMusic', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900)),
            Text('Versão $version', style: const TextStyle(color: kAccent, fontSize: 12, fontWeight: FontWeight.w700)),
          ]),
        ]),
        content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('O que há de novo:', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          Text(notes, style: const TextStyle(color: Color(0xFFB3B3B3), fontSize: 13, height: 1.6)),
        ]),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx),
            style: ElevatedButton.styleFrom(
              backgroundColor: kAccent, foregroundColor: Colors.black,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            ),
            child: const Text('Entendido!', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OursMusic',
      debugShowCheckedModeBanner: false,
      navigatorKey: navigatorKey,
      theme: themeService.current.toFlutterTheme(),
      builder: (context, child) {
        // Catch widget build errors
        ErrorWidget.builder = (FlutterErrorDetails details) {
          return Scaffold(
            backgroundColor: const Color(0xFF121212),
            body: Center(child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.error_outline, color: Color(0xFF1DB954), size: 48),
                const SizedBox(height: 16),
                const Text('OursMusic', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
                const SizedBox(height: 8),
                Text(details.exceptionAsString(), style: const TextStyle(color: Color(0xFFB3B3B3), fontSize: 12), textAlign: TextAlign.center),
              ]),
            )),
          );
        };
        return child ?? const SizedBox.shrink();
      },
      home: _showSplash
          ? SplashScreen(onDone: _onSplashDone)
          : _loading
              ? const Scaffold(body: Center(child: CircularProgressIndicator(color: kAccent)))
              : _showOnboarding
              ? OnboardingScreen(onDone: () => setState(() => _showOnboarding = false))
              : _loggedIn
                  ? HomeScreen(onLogout: () => setState(() => _loggedIn = false))
                  : LoginScreen(onLogin: () => setState(() => _loggedIn = true), onRegister: () => setState(() { _loggedIn = true; _showOnboarding = true; })),
    );
  }
}
