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
        headlineLarge: TextStyle(
            color: textPrimary, fontSize: 28, fontWeight: FontWeight.w900),
        headlineMedium: TextStyle(
            color: textPrimary, fontSize: 22, fontWeight: FontWeight.w800),
        titleLarge: TextStyle(
            color: textPrimary, fontSize: 16, fontWeight: FontWeight.w700),
        bodyMedium: TextStyle(color: textSecondary, fontSize: 13),
        bodySmall: TextStyle(color: textMuted, fontSize: 11),
      ),
    );
  }
}

final kThemes = <AppThemeData>[
  const AppThemeData(
      id: 'dark',
      name: 'Escuro',
      bgBase: Color(0xFF121212),
      bgElevated: Color(0xFF1A1A1A),
      bgHighlight: Color(0xFF2A2A2A),
      accent: Color(0xFF1DB954),
      accentHover: Color(0xFF1ED760),
      textPrimary: Colors.white,
      textSecondary: Color(0xFFB3B3B3),
      textMuted: Color(0xFF6A6A6A)),
  const AppThemeData(
      id: 'light',
      name: 'Claro',
      bgBase: Color(0xFFF0F0F0),
      bgElevated: Colors.white,
      bgHighlight: Color(0xFFE0E0E0),
      accent: Color(0xFF1DB954),
      accentHover: Color(0xFF1ED760),
      textPrimary: Color(0xFF121212),
      textSecondary: Color(0xFF535353),
      textMuted: Color(0xFF9A9A9A)),
  const AppThemeData(
      id: 'red',
      name: 'Vermelho',
      bgBase: Color(0xFF0D0000),
      bgElevated: Color(0xFF1A0000),
      bgHighlight: Color(0xFF2A0808),
      accent: Color(0xFFE8115B),
      accentHover: Color(0xFFFF1F6B),
      textPrimary: Colors.white,
      textSecondary: Color(0xFFFFB3B3),
      textMuted: Color(0xFF884444)),
  const AppThemeData(
      id: 'purple',
      name: 'Roxo',
      bgBase: Color(0xFF0A0010),
      bgElevated: Color(0xFF130020),
      bgHighlight: Color(0xFF200035),
      accent: Color(0xFF7C3AED),
      accentHover: Color(0xFF8B5CF6),
      textPrimary: Colors.white,
      textSecondary: Color(0xFFC4B5FD),
      textMuted: Color(0xFF6D4A9A)),
  const AppThemeData(
      id: 'pink',
      name: 'Rosa',
      bgBase: Color(0xFF0D0008),
      bgElevated: Color(0xFF1A0012),
      bgHighlight: Color(0xFF2A0020),
      accent: Color(0xFFEC4899),
      accentHover: Color(0xFFF472B6),
      textPrimary: Colors.white,
      textSecondary: Color(0xFFFBCFE8),
      textMuted: Color(0xFF9D4A6A)),
  const AppThemeData(
      id: 'neon',
      name: 'Neon',
      bgBase: Color(0xFF000000),
      bgElevated: Color(0xFF0A0A0A),
      bgHighlight: Color(0xFF111111),
      accent: Color(0xFF00FF88),
      accentHover: Color(0xFF00FFAA),
      textPrimary: Color(0xFF00FF88),
      textSecondary: Color(0xFF00CC66),
      textMuted: Color(0xFF006633)),
  const AppThemeData(
      id: 'green',
      name: 'Verde',
      bgBase: Color(0xFF001A0A),
      bgElevated: Color(0xFF002A10),
      bgHighlight: Color(0xFF003A18),
      accent: Color(0xFF1DB954),
      accentHover: Color(0xFF1ED760),
      textPrimary: Colors.white,
      textSecondary: Color(0xFFA7F3D0),
      textMuted: Color(0xFF4A8A5A)),
  const AppThemeData(
      id: 'blue',
      name: 'Azul',
      bgBase: Color(0xFF00080D),
      bgElevated: Color(0xFF00101A),
      bgHighlight: Color(0xFF001A2A),
      accent: Color(0xFF3B82F6),
      accentHover: Color(0xFF60A5FA),
      textPrimary: Colors.white,
      textSecondary: Color(0xFFBFDBFE),
      textMuted: Color(0xFF3A5A8A)),
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
    _current =
        kThemes.firstWhere((t) => t.id == id, orElse: () => kThemes.first);
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
