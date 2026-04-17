import 'package:flutter/material.dart';

const kBgBase      = Color(0xFF121212);
const kBgElevated  = Color(0xFF1A1A1A);
const kBgHighlight = Color(0xFF2A2A2A);
const kAccent      = Color(0xFF7C3AED);
const kAccentHover = Color(0xFF6D28D9);
const kAccentLight = Color(0xFFC4B5FD);
const kTextPrimary = Color(0xFFFFFFFF);
const kTextSecond  = Color(0xFFB3B3B3);
const kTextMuted   = Color(0xFF6A6A6A);

ThemeData spotifyTheme() => ThemeData(
  brightness: Brightness.dark,
  scaffoldBackgroundColor: kBgBase,
  colorScheme: const ColorScheme.dark(
    primary: kAccent,
    surface: kBgBase,
    onSurface: kTextPrimary,
  ),
  fontFamily: 'Roboto',
  appBarTheme: const AppBarTheme(
    backgroundColor: Colors.transparent,
    elevation: 0,
    foregroundColor: kTextPrimary,
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ButtonStyle(
      backgroundColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.disabled)) return const Color(0xFF3A2A5A);
        if (states.contains(WidgetState.pressed)) return const Color(0xFF5B21B6);
        return const Color(0xFF7C3AED);
      }),
      foregroundColor: WidgetStateProperty.all(Colors.white),
      overlayColor: WidgetStateProperty.all(Colors.transparent),
      shadowColor: WidgetStateProperty.all(const Color(0xFF7C3AED)),
      elevation: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.disabled)) return 0;
        if (states.contains(WidgetState.pressed)) return 4;
        if (states.contains(WidgetState.hovered)) return 12;
        return 8;
      }),
      shape: WidgetStateProperty.all(
        RoundedRectangleBorder(borderRadius: BorderRadius.circular(500)),
      ),
      textStyle: WidgetStateProperty.all(
        const TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.5),
      ),
      animationDuration: const Duration(milliseconds: 150),
    ),
  ),
  outlinedButtonTheme: OutlinedButtonThemeData(
    style: ButtonStyle(
      foregroundColor: WidgetStateProperty.all(kAccentLight),
      side: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.hovered) || states.contains(WidgetState.pressed)) {
          return const BorderSide(color: Color(0xFF7C3AED), width: 1.5);
        }
        return const BorderSide(color: Color(0xFF4C1D95), width: 1);
      }),
      overlayColor: WidgetStateProperty.all(const Color(0x1A7C3AED)),
      shape: WidgetStateProperty.all(
        RoundedRectangleBorder(borderRadius: BorderRadius.circular(500)),
      ),
    ),
  ),
  textButtonTheme: TextButtonThemeData(
    style: ButtonStyle(
      foregroundColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.pressed)) return kAccentLight;
        return kTextSecond;
      }),
      overlayColor: WidgetStateProperty.all(const Color(0x1A7C3AED)),
    ),
  ),
  bottomNavigationBarTheme: const BottomNavigationBarThemeData(
    backgroundColor: Color(0xFF181818),
    selectedItemColor: kAccentLight,
    unselectedItemColor: kTextMuted,
    type: BottomNavigationBarType.fixed,
    showSelectedLabels: true,
    showUnselectedLabels: true,
    selectedLabelStyle: TextStyle(fontSize: 10, fontWeight: FontWeight.w600),
    unselectedLabelStyle: TextStyle(fontSize: 10),
  ),
  sliderTheme: const SliderThemeData(
    activeTrackColor: kAccent,
    inactiveTrackColor: kBgHighlight,
    thumbColor: kAccentLight,
    thumbShape: RoundSliderThumbShape(enabledThumbRadius: 6),
    trackHeight: 3,
    overlayShape: RoundSliderOverlayShape(overlayRadius: 12),
  ),
  textTheme: const TextTheme(
    headlineLarge: TextStyle(color: kTextPrimary, fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: -0.5),
    headlineMedium: TextStyle(color: kTextPrimary, fontSize: 22, fontWeight: FontWeight.w800),
    titleLarge: TextStyle(color: kTextPrimary, fontSize: 16, fontWeight: FontWeight.w700),
    titleMedium: TextStyle(color: kTextPrimary, fontSize: 14, fontWeight: FontWeight.w600),
    bodyMedium: TextStyle(color: kTextSecond, fontSize: 13),
    bodySmall: TextStyle(color: kTextMuted, fontSize: 11),
  ),
);
