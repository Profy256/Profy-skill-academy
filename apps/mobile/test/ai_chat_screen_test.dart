import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:profy_mobile/core/models.dart';
import 'package:profy_mobile/data/providers.dart';
import 'package:profy_mobile/features/lesson/ai_chat_screen.dart';

import 'api_errors_test.dart';

/// Fakes the API layer by overriding [apiClientProvider]; exercises the
/// degradation contract (TECHNICAL_DOC §7.1 / M5 DoD): an AI outage shows the
/// "unavailable" banner while the chat stays usable.
class _Stub extends ProfyApiClientStub {
  _Stub({this.failChat = false});

  final bool failChat;

  @override
  Future<List<ChatMessage>> aiMessages(String lessonId) async => const [];

  @override
  Future<String> aiChat(String lessonId, String message) async {
    if (failChat) throw apiErrorOf(dioError(503, 'ai_unavailable'));
    return 'Grounded reply from the lesson content.';
  }
}

void main() {
  testWidgets('sends a message and renders the assistant reply',
      (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiClientProvider.overrideWithValue(_Stub()),
        ],
        child: const MaterialApp(home: AiChatScreen(lessonId: 'l1', lessonTitle: 'Intro to Go')),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'What is a goroutine?');
    await tester.tap(find.byIcon(Icons.send));
    await tester.pumpAndSettle();

    expect(find.text('What is a goroutine?'), findsOneWidget);
    expect(find.text('Grounded reply from the lesson content.'), findsOneWidget);
    expect(find.byIcon(Icons.cloud_off), findsNothing);
  });

  testWidgets('ai_unavailable shows degradation banner, chat stays usable',
      (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiClientProvider.overrideWithValue(_Stub(failChat: true))],
        child: const MaterialApp(home: AiChatScreen(lessonId: 'l1', lessonTitle: 'Intro to Go')),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'Hello?');
    await tester.tap(find.byIcon(Icons.send));
    await tester.pumpAndSettle();

    // Degradation banner appears…
    expect(find.byIcon(Icons.cloud_off), findsOneWidget);
    expect(find.textContaining('unavailable'), findsOneWidget);
    // …but the optimistic user message is still visible.
    expect(find.text('Hello?'), findsOneWidget);
  });
}
