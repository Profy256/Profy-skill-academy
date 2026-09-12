import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:profy_mobile/core/models.dart';
import 'package:profy_mobile/data/providers.dart';
import 'package:profy_mobile/features/home/home_screen.dart';
import 'package:profy_mobile/features/lesson/ai_chat_screen.dart';

import 'api_errors_test.dart' show ProfyApiClientStub;
import 'home_screen_test.dart' show fixtureHome;

/// Deterministic phone viewport for goldens (Pixel-ish 390x844 @3x).
void _phoneViewport(WidgetTester tester) {
  tester.view.physicalSize = const Size(1170, 2532);
  tester.view.devicePixelRatio = 3.0;
  addTearDown(tester.view.reset);
}

class _HomeGoldenStub extends ProfyApiClientStub {
  @override
  Future<FeaturedHome> featuredHome() async => fixtureHome();

  @override
  Future<ConfigResponse> appConfig() async => const ConfigResponse(
        adsEnabled: true,
        adsPlacements: [
          AdPlacement(placementId: 'home_banner', enabled: true, frequency: 1),
        ],
        forceUpdate: false,
      );
}

class _ChatGoldenStub extends ProfyApiClientStub {
  @override
  Future<List<ChatMessage>> aiMessages(String lessonId) async => [
        ChatMessage(
          id: 'm1',
          role: 'user',
          content: 'What is a goroutine?',
          createdAt: DateTime.utc(2026, 1, 1, 10, 0, 0),
        ),
        ChatMessage(
          id: 'm2',
          role: 'assistant',
          content:
              'A goroutine is a lightweight thread managed by the Go runtime — this lesson’s examples use them for concurrent requests.',
          createdAt: DateTime.utc(2026, 1, 1, 10, 0, 5),
        ),
      ];
}

void main() {
  testWidgets('home screen golden', (tester) async {
    _phoneViewport(tester);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiClientProvider.overrideWithValue(_HomeGoldenStub())],
        child: const MaterialApp(home: HomeScreen()),
      ),
    );
    await tester.pumpAndSettle();

    await expectLater(
      find.byType(HomeScreen),
      matchesGoldenFile('goldens/home_screen.png'),
    );
  });

  testWidgets('ai chat screen golden', (tester) async {
    _phoneViewport(tester);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiClientProvider.overrideWithValue(_ChatGoldenStub())],
        child: const MaterialApp(
          home: AiChatScreen(lessonId: 'l1', lessonTitle: 'Intro to Go'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await expectLater(
      find.byType(AiChatScreen),
      matchesGoldenFile('goldens/ai_chat_screen.png'),
    );
  });
}
