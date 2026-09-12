import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors.dart';
import '../../core/models.dart';
import '../../data/providers.dart';

/// Chat state for one lesson. Optimistic user bubble; degradation handled via
/// [AiChatState.error] (`ai_unavailable` → friendly banner, per TECHNICAL_DOC
/// §7.1: lesson never depends on AI).
class AiChatState {
  const AiChatState({
    this.messages = const [],
    this.loadingHistory = true,
    this.sending = false,
    this.error,
  });

  final List<ChatMessage> messages;
  final bool loadingHistory;
  final bool sending;

  /// Error to render as a banner (not a dead screen): `ai_unavailable`,
  /// `rate_limited`, network, etc.
  final ApiError? error;

  AiChatState copyWith({
    List<ChatMessage>? messages,
    bool? loadingHistory,
    bool? sending,
    ApiError? error,
    bool clearError = false,
  }) =>
      AiChatState(
        messages: messages ?? this.messages,
        loadingHistory: loadingHistory ?? this.loadingHistory,
        sending: sending ?? this.sending,
        error: clearError ? null : (error ?? this.error),
      );
}

class AiChatController extends Notifier<AiChatState> {
  AiChatController(this._lessonId);

  final String _lessonId;

  @override
  AiChatState build() {
    _loadHistory();
    return const AiChatState();
  }

  Future<void> _loadHistory() async {
    try {
      final msgs = await ref.read(apiClientProvider).aiMessages(_lessonId);
      state = state.copyWith(messages: msgs, loadingHistory: false, clearError: true);
    } catch (_) {
      // History is optional; the chat still works for new messages.
      state = state.copyWith(loadingHistory: false);
    }
  }

  Future<void> send(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || state.sending) return;

    final local = ChatMessage(
      id: 'local-${DateTime.now().microsecondsSinceEpoch}',
      role: 'user',
      content: trimmed,
      createdAt: DateTime.now(),
    );
    state = state.copyWith(
      messages: [...state.messages, local],
      sending: true,
      clearError: true,
    );

    try {
      final reply = await ref.read(apiClientProvider).aiChat(_lessonId, trimmed);
      final assistant = ChatMessage(
        id: 'local-reply-${DateTime.now().microsecondsSinceEpoch}',
        role: 'assistant',
        content: reply,
        createdAt: DateTime.now(),
      );
      state = state.copyWith(
        messages: [...state.messages, assistant],
        sending: false,
      );
    } on ApiError catch (e) {
      state = state.copyWith(sending: false, error: e);
    } catch (_) {
      state = state.copyWith(
        sending: false,
        error: ApiError(
          statusCode: 0,
          code: 'network',
          message: 'No connection. Try again.',
        ),
      );
    }
  }

  void dismissError() => state = state.copyWith(clearError: true);
}

/// Per-lesson AI chat controller family.
final aiChatFamily =
    NotifierProvider.family<AiChatController, AiChatState, String>(
  AiChatController.new,
);
