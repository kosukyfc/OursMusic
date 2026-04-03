import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppThemeData {
  final String id;
  final String name;
  final Color bgBase;
  final Color bgElevated;
  final Color bgHighlight;
  final Color accent;
  final Color accentHover;
  final Color textPrimary;
  final Color textSecondary;
  final Color textMuted;

  const AppThemeData({
    required this.id,
    required this.name,
    required this.bgBase,
    required this.bgElevated,
    required this.bgHighlight,
    required this.accent,
    required this.accentHover,
    required this.textPrimary,
    required this.textSecondary,
    required this.textMuted,
  });

  ThemeData toFlutterTheme() {
    final isDark = bgBase.computeLuminance() < 0.5;
    return ThemeData(
      brightness: isDark ? Brightness.dark : Brightness.light,
      scaffoldBackgroundColor: bgBase,
      colorScheme: ColorScheme(
        brightness: isDark ? Brightness.dark : Brightness.light,
        primary: accent,
        onPrimary: Colors.black,
        secondary: accentHover,
        onSecondary: Colors.black,
        surface: bgElevated,
        onSurface: textPrimary,
        error: const Color(0xFFF15E6C),
        onError: Colors.white,
      ),
      fontFamily: 'Roboto',
      appBarTheme: AppBarTheme(
        backgroundColor: bgBase,
        foregroundColor: textPrimary,
        elevation: 0,
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: bgBase,
        selectedItemColor: textPrimary,
        unselectedItemColor: textMuted,
        type: BottomNavigationBarType.fixed,
      ),
      sliderTheme: SliderThemeData(
        activeTrackColor: textPrimary,
        inactiveTrackColor: bgHighlight,
        thumbColor: textPrimary,
        thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
        trackHeight: 3,
      ),
      textTheme: TextTheme(
        headlineLarge: TextStyle(color: textPrimary, fontSize: 28, fontWeight: FontWeight.w900),
        headlineMedium: TextStyle(color: textPrimary, fontSize: 22, fontWeight: FontWeight.w800),
        titleLarge: TextStyle(color: textPrimary, fontSize: 16, fontWeight: FontWeight.w700),
        bodyMedium: TextStyle(color: textSecondary, fontSize: 13),
        bodySmall: TextStyle(color: textMuted, fontSize: 11),
      ),
    );
  }
}

final kThemes = <AppThemeData>[
  AppThemeData(id: 'dark', name: 'Escuro', bgBase: const Color(0xFF121212), bgElevated: const Color(0xFF1A1A1A), bgHighlight: const Color(0xFF2A2A2A), accent: const Color(0xFF1DB954), accentHover: const Color(0xFF1ED760), textPrimary: Colors.white, textSecondary: const Color(0xFFB3B3B3), textMuted: const Color(0xFF6A6A6A)),
  AppThemeData(id: 'light', name: 'Claro', bgBase: const Color(0xFFF0F0F0), bgElevated: Colors.white, bgHighlight: const Color(0xFFE0E0E0), accent: const Color(0xFF1DB954), accentHover: const Color(0xFF1ED760), textPrimary: const Color(0xFF121212), textSecondary: const Color(0xFF535353), textMuted: const Color(0xFF9A9A9A)),
  AppThemeData(id: 'red', name: 'Vermelho', bgBase: const Color(0xFF0D0000), bgElevated: const Color(0xFF1A0000), bgHighlight: const Color(0xFF2A0808), accent: const Color(0xFFE8115B), accentHover: const Color(0xFFFF1F6B), textPrimary: Colors.white, textSecondary: const Color(0xFFFFB3B3), textMuted: const Color(0xFF884444)),
  AppThemeData(id: 'purple', name: 'Roxo', bgBase: const Color(0xFF0A0010), bgElevated: const Color(0xFF130020), bgHighlight: const Color(0xFF200035), accent: const Color(0xFF7C3AED), accentHover: const Color(0xFF8B5CF6), textPrimary: Colors.white, textSecondary: const Color(0xFFC4B5FD), textMuted: const Color(0xFF6D4A9A)),
  AppThemeData(id: 'pink', name: 'Rosa', bgBase: const Color(0xFF0D0008), bgElevated: const Color(0xFF1A0012), bgHighlight: const Color(0xFF2A0020), accent: const Color(0xFFEC4899), accentHover: const Color(0xFFF472B6), textPrimary: Colors.white, textSecondary: const Color(0xFFFBCFE8), textMuted: const Color(0xFF9D4A6A)),
  AppThemeData(id: 'neon', name: 'Neon', bgBase: const Color(0xFF000000), bgElevated: const Color(0xFF0A0A0A), bgHighlight: const Color(0xFF111111), accent: const Color(0xFF00FF88), accentHover: const Color(0xFF00FFAA), textPrimary: const Color(0xFF00FF88), textSecondary: const Color(0xFF00CC66), textMuted: const Color(0xFF006633)),
  AppThemeData(id: 'green', name: 'Verde', bgBase: const Color(0xFF001A0A), bgElevated: const Color(0xFF002A10), bgHighlight: const Color(0xFF003A18), accent: const Color(0xFF1DB954), accentHover: const Color(0xFF1ED760), textPrimary: Colors.white, textSecondary: const Color(0xFFA7F3D0), textMuted: const Color(0xFF4A8A5A)),
  AppThemeData(id: 'blue', name: 'Azul', bgBase: const Color(0xFF00080D), bgElevated: const Color(0xFF00101A), bgHighlight: const Color(0xFF001A2A), accent: const Color(0xFF3B82F6), accentHover: const Color(0xFF60A5FA), textPrimary: Colors.white, textSecondary: const Color(0xFFBFDBFE), textMuted: const Color(0xFF3A5A8A)),
];

class ThemeService extends ChangeNotifier {
  AppThemeData _current = kThemes.first;
  String _lang = 'pt';

  AppThemeData get current => _current;
  String get lang => _lang;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final id = prefs.getString('theme') ?? 'dark';
    _lang = prefs.getString('lang') ?? 'pt';
    _current = kThemes.firstWhere((t) => t.id == id, orElse: () => kThemes.first);
    notifyListeners();
  }

  Future<void> setTheme(AppThemeData theme) async {
    _current = theme;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('theme', theme.id);
    notifyListeners();
  }

  Future<void> setLang(String lang) async {
    _lang = lang;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('lang', lang);
    notifyListeners();
  }
}

// Global instance
final themeService = ThemeService();
