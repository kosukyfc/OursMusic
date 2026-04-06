import 'package:flutter/material.dart';

const kBgBase      = Color(0xFF121212);
const kBgElevated  = Color(0xFF1A1A1A);
const kBgHighlight = Color(0xFF2A2A2A);
const kAccent      = Color(0xFF1DB954);
const kAccentHover = Color(0xFF1ED760);
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
  bottomNavigationBarTheme: const BottomNavigationBarThemeData(
    backgroundColor: Color(0xFF181818),
    selectedItemColor: kTextPrimary,
    unselectedItemColor: kTextMuted,
    type: BottomNavigationBarType.fixed,
    showSelectedLabels: true,
    showUnselectedLabels: true,
    selectedLabelStyle: TextStyle(fontSize: 10, fontWeight: FontWeight.w600),
    unselectedLabelStyle: TextStyle(fontSize: 10),
  ),
  sliderTheme: const SliderThemeData(
    activeTrackColor: kTextPrimary,
    inactiveTrackColor: kBgHighlight,
    thumbColor: kTextPrimary,
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
