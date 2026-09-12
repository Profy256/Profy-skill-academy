import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'router.dart';
import '../core/theme.dart';

class ProfyApp extends ConsumerWidget {
  const ProfyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'Profy Skill Academy',
      debugShowCheckedModeBanner: false,
      theme: buildProfyTheme(),
      routerConfig: router,
    );
  }
}
