import 'package:flutter/material.dart';

/// Design tokens ported from `Mobile Learning App UI/src/index.css`
/// (warm paper background, terracotta primary, slate secondary).
abstract final class ProfyColors {
  static const background = Color(0xFFFBF7F2);
  static const foreground = Color(0xFF2D2B28);
  static const card = Color(0xFFEFE5DA);
  static const primary = Color(0xFFC66F5B);
  static const onPrimary = Color(0xFFFBF7F2);
  static const secondary = Color(0xFF6E84A0);
  static const onSecondary = Color(0xFFFBF7F2);
  static const mutedForeground = Color(0xFF7A7570);
  static const border = Color(0xFFD9CEBC);
  static const success = Color(0xFF4E7A5A);
  static const danger = Color(0xFFB04A3E);
}

ThemeData buildProfyTheme() {
  final scheme = ColorScheme.light(
    primary: ProfyColors.primary,
    onPrimary: ProfyColors.onPrimary,
    secondary: ProfyColors.secondary,
    onSecondary: ProfyColors.onSecondary,
    surface: ProfyColors.background,
    onSurface: ProfyColors.foreground,
    surfaceContainerHighest: ProfyColors.card,
    onSurfaceVariant: ProfyColors.mutedForeground,
    outline: ProfyColors.border,
    error: ProfyColors.danger,
  );

  final base = ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: ProfyColors.background,
    fontFamily: 'Source Sans 3',
  );

  return base.copyWith(
    textTheme: base.textTheme.apply(bodyColor: ProfyColors.foreground, displayColor: ProfyColors.foreground).copyWith(
          headlineMedium: base.textTheme.headlineMedium?.copyWith(
            fontFamily: 'Lora',
            fontWeight: FontWeight.w600,
          ),
          headlineSmall: base.textTheme.headlineSmall?.copyWith(
            fontFamily: 'Lora',
            fontWeight: FontWeight.w600,
          ),
          titleLarge: base.textTheme.titleLarge?.copyWith(fontFamily: 'Lora', fontWeight: FontWeight.w600),
        ),
    appBarTheme: const AppBarTheme(
      backgroundColor: ProfyColors.background,
      foregroundColor: ProfyColors.foreground,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      color: ProfyColors.card,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      margin: EdgeInsets.zero,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: ProfyColors.primary,
        foregroundColor: ProfyColors.onPrimary,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: ProfyColors.foreground,
        side: const BorderSide(color: ProfyColors.border),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: ProfyColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: ProfyColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: ProfyColors.secondary, width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: ProfyColors.background,
      indicatorColor: ProfyColors.card,
      labelTextStyle: WidgetStatePropertyAll(
        base.textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w600),
      ),
    ),
    chipTheme: base.chipTheme.copyWith(
      backgroundColor: ProfyColors.card,
      side: const BorderSide(color: ProfyColors.border),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    ),
    dividerTheme: const DividerThemeData(color: ProfyColors.border, thickness: 1),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
  );
}
