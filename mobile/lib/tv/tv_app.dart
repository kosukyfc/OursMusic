import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../api.dart';
import '../theme.dart';
import '../player/player_controller.dart';
import 'tv_home_screen.dart';

/// Entry point for TV/TV Box layout.
/// Detected via --dart-define=DEVICE_TYPE=tv
class TvApp extends StatefulWidget {
  const TvApp({super.key});
  @override
  State<TvApp> createState() => _TvAppState();
}

class _TvAppState extends State<TvApp> {
  bool _loggedIn = false;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    // Try to force landscape — some TV boxes don't support this, so we catch silently
    try {
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
    } catch (_) {}
    _init();
  }

  Future<void> _init() async {
    await Api.init();
    if (mounted) setState(() { _loggedIn = Api.isLoggedIn; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const MaterialApp(home: Scaffold(backgroundColor: kBgBase, body: Center(child: CircularProgressIndicator(color: kAccent))));
    if (!_loggedIn) return MaterialApp(theme: _tvTheme(), home: _TvLoginScreen(onAuth: () => setState(() => _loggedIn = true)));
    return MaterialApp(theme: _tvTheme(), home: TvHomeScreen(onLogout: () => setState(() => _loggedIn = false)));
  }

  ThemeData _tvTheme() => ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: kBgBase,
    colorScheme: const ColorScheme.dark(primary: kAccent, surface: kBgBase),
    fontFamily: 'Roboto',
    focusColor: kAccent.withOpacity(0.3),
    textTheme: const TextTheme(
      headlineLarge: TextStyle(color: kTextPrimary, fontSize: 32, fontWeight: FontWeight.w900),
      headlineMedium: TextStyle(color: kTextPrimary, fontSize: 24, fontWeight: FontWeight.w800),
      titleLarge: TextStyle(color: kTextPrimary, fontSize: 20, fontWeight: FontWeight.w700),
      bodyMedium: TextStyle(color: kTextSecond, fontSize: 16),
    ),
  );
}

class _TvLoginScreen extends StatefulWidget {
  final VoidCallback onAuth;
  const _TvLoginScreen({required this.onAuth});
  @override
  State<_TvLoginScreen> createState() => _TvLoginScreenState();
}

class _TvLoginScreenState extends State<_TvLoginScreen> {
  final _email = TextEditingController();
  final _pass = TextEditingController();
  String _error = '';
  bool _loading = false;

  Future<void> _login() async {
    setState(() { _error = ''; _loading = true; });
    try {
      final data = await Api.post('/auth/login', {'email': _email.text, 'password': _pass.text});
      final token = data?['access_token']?.toString();
      if (token != null) await Api.saveToken(token);
      if (mounted) widget.onAuth();
    } catch (e) {
      if (mounted) setState(() { _error = e.toString().replaceAll('Exception: ', ''); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBgBase,
      body: Center(
        child: SizedBox(width: 480, child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.music_note, color: kAccent, size: 64),
          const SizedBox(height: 24),
          const Text('Music App', style: TextStyle(color: kTextPrimary, fontSize: 36, fontWeight: FontWeight.w900)),
          const SizedBox(height: 40),
          TextField(controller: _email, style: const TextStyle(color: kTextPrimary, fontSize: 18),
            decoration: _inputDec('E-mail'), keyboardType: TextInputType.emailAddress),
          const SizedBox(height: 16),
          TextField(controller: _pass, obscureText: true, style: const TextStyle(color: kTextPrimary, fontSize: 18),
            decoration: _inputDec('Senha'), onSubmitted: (_) => _login()),
          if (_error.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(_error, style: const TextStyle(color: Color(0xFFE8115B), fontSize: 14)),
          ],
          const SizedBox(height: 24),
          SizedBox(width: double.infinity, height: 52,
            child: ElevatedButton(
              onPressed: _loading ? null : _login,
              style: ElevatedButton.styleFrom(backgroundColor: kAccent, foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4))),
              child: _loading ? const CircularProgressIndicator(color: Colors.black) : const Text('Entrar', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            ),
          ),
        ])),
      ),
    );
  }

  InputDecoration _inputDec(String hint) => InputDecoration(
    hintText: hint, hintStyle: const TextStyle(color: kTextMuted),
    filled: true, fillColor: const Color(0xFF2A2A2A),
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(4), borderSide: BorderSide.none),
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
  );
}
