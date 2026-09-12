import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import 'ai_chat_controller.dart';

/// Per-lesson AI Teacher chat (PRD §7.3). Failures show a banner and keep the
/// conversation usable — the lesson screen itself never depends on this.
class AiChatScreen extends ConsumerStatefulWidget {
  const AiChatScreen({super.key, required this.lessonId, required this.lessonTitle});

  final String lessonId;
  final String lessonTitle;

  @override
  ConsumerState<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends ConsumerState<AiChatScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _input.text;
    _input.clear();
    await ref.read(aiChatFamily(widget.lessonId).notifier).send(text);
    _scrollDown();
  }

  void _scrollDown() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(aiChatFamily(widget.lessonId));

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('AI Teacher', style: Theme.of(context).textTheme.titleLarge),
            Text(
              widget.lessonTitle,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: ProfyColors.mutedForeground),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: state.loadingHistory
                ? const Center(child: CircularProgressIndicator())
                : _MessageList(
                    state: state,
                    scrollController: _scroll,
                  ),
          ),
          if (state.error != null)
            _ErrorBanner(
              error: state.error!,
              onDismiss: () =>
                  ref.read(aiChatFamily(widget.lessonId).notifier).dismissError(),
            ),
          _Composer(
            controller: _input,
            enabled: !state.sending,
            onSend: _send,
          ),
        ],
      ),
    );
  }
}

class _MessageList extends StatelessWidget {
  const _MessageList({required this.state, required this.scrollController});

  final AiChatState state;
  final ScrollController scrollController;

  @override
  Widget build(BuildContext context) {
    if (state.messages.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.smart_toy_outlined, size: 48, color: ProfyColors.secondary),
            const SizedBox(height: 12),
            Text(
              'Confused about something in this lesson?',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 6),
            Text(
              'Ask below — the AI Teacher answers using this lesson’s own content.',
              textAlign: TextAlign.center,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: ProfyColors.mutedForeground),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      controller: scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: state.messages.length + (state.sending ? 1 : 0),
      itemBuilder: (context, i) {
        if (i == state.messages.length) {
          return const Align(
            alignment: Alignment.centerLeft,
            child: Padding(
              padding: EdgeInsets.all(12),
              child: SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          );
        }
        final m = state.messages[i];
        return _Bubble(message: m);
      },
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message});

  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final isUser = message.isUser;
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.78,
        ),
        decoration: BoxDecoration(
          color: isUser ? ProfyColors.primary : ProfyColors.card,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(14),
            topRight: const Radius.circular(14),
            bottomLeft: Radius.circular(isUser ? 14 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 14),
          ),
        ),
        child: Text(
          message.content,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: isUser ? ProfyColors.onPrimary : ProfyColors.foreground,
              ),
        ),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.error, required this.onDismiss});

  final ApiError error;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final (icon, text) = switch (error.code) {
      'ai_unavailable' => (
          Icons.cloud_off,
          'AI Teacher is unavailable right now. Lesson content stays available.'
        ),
      'rate_limited' => (
          Icons.hourglass_top,
          'Daily AI message limit reached. Check back tomorrow.'
        ),
      _ => (
          Icons.wifi_off,
          'Could not reach the AI Teacher. Check your connection and retry.'
        ),
    };

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 4, 16, 0),
      padding: const EdgeInsets.fromLTRB(12, 8, 4, 8),
      decoration: BoxDecoration(
        color: ProfyColors.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: ProfyColors.border),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: ProfyColors.mutedForeground),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 18),
            onPressed: onDismiss,
          ),
        ],
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.enabled,
    required this.onSend,
  });

  final TextEditingController controller;
  final bool enabled;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                enabled: enabled,
                minLines: 1,
                maxLines: 4,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => onSend(),
                decoration: const InputDecoration(hintText: 'Ask about this lesson…'),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              onPressed: enabled ? onSend : null,
              icon: const Icon(Icons.send),
              tooltip: 'Send',
            ),
          ],
        ),
      ),
    );
  }
}
