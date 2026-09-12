import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:youtube_player_iframe/youtube_player_iframe.dart';

import '../../core/models.dart';
import '../../core/theme.dart';
import '../../data/providers.dart';
import '../shared/widgets.dart';
import 'lesson_tabs.dart';

/// Lesson screen: curated YouTube video + tabbed written content + quizzes +
/// Ask AI Teacher entry point (PRD §8). Network errors degrade per-section:
/// the video still works if the AI/progress calls fail, and vice versa.
class LessonScreen extends ConsumerStatefulWidget {
  const LessonScreen({super.key, required this.slug});

  final String slug;

  @override
  ConsumerState<LessonScreen> createState() => _LessonScreenState();
}

class _LessonScreenState extends ConsumerState<LessonScreen> {
  YoutubePlayerController? _player;

  @override
  void dispose() {
    _player?.close();
    super.dispose();
  }

  void _ensurePlayer(LessonDetail lesson) {
    final videoId = lesson.video?.youtubeVideoId;
    if (videoId == null || _player != null) return;
    _player = YoutubePlayerController(
      params: const YoutubePlayerParams(
        showControls: true,
        showFullscreenButton: true,
        enableCaption: false,
      ),
    );
    _player!.loadVideoById(videoId: videoId);
  }

  void _askAiTeacher(LessonDetail lesson) {
    context.go('/lesson/${lesson.slug}/ai'
        '?lessonId=${lesson.id}&title=${Uri.encodeComponent(lesson.title)}');
  }

  @override
  Widget build(BuildContext context) {
    final detail = ref.watch(lessonDetailProvider(widget.slug));

    return Scaffold(
      body: AsyncView(
        value: detail,
        onRetry: () => ref.invalidate(lessonDetailProvider(widget.slug)),
        data: (lesson) {
          _ensurePlayer(lesson);
          ref
              .read(lessonActionsFamily(lesson.id).notifier)
              .load();
          final actions = ref.watch(lessonActionsFamily(lesson.id));

          return Column(
            children: [
              _PlayerArea(lesson: lesson, controller: _player),
              Expanded(
                child: DefaultTabController(
                  length: _tabCount(lesson),
                  child: Column(
                    children: [
                      TabBar(
                        isScrollable: true,
                        tabAlignment: TabAlignment.start,
                        tabs: _tabs(lesson),
                      ),
                      Expanded(
                        child: TabBarView(
                          children: _tabViews(context, ref, lesson),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              _BottomBar(
                lesson: lesson,
                actions: actions,
                onAskAi: () => _askAiTeacher(lesson),
                onComplete: () async {
                  final ok = await ref
                      .read(lessonActionsFamily(lesson.id).notifier)
                      .markCompleted();
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Text(ok
                          ? 'Lesson completed! 🎉'
                          : 'Could not save progress — try again.'),
                    ));
                  }
                },
                onBookmark: () async {
                  await ref
                      .read(lessonActionsFamily(lesson.id).notifier)
                      .toggleBookmark();
                },
              ),
            ],
          );
        },
      ),
    );
  }
}

class _PlayerArea extends StatelessWidget {
  const _PlayerArea({required this.lesson, required this.controller});

  final LessonDetail lesson;
  final YoutubePlayerController? controller;

  @override
  Widget build(BuildContext context) {
    final video = lesson.video;
    if (video == null) {
      return Container(
        height: 210,
        color: ProfyColors.foreground,
        alignment: Alignment.center,
        padding: const EdgeInsets.all(24),
        child: Text(
          'Video coming soon.\nWritten content below.',
          textAlign: TextAlign.center,
          style: Theme.of(context)
              .textTheme
              .bodyMedium
              ?.copyWith(color: ProfyColors.onPrimary),
        ),
      );
    }
    if (controller == null) {
      return const SizedBox(height: 210);
    }
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: YoutubePlayer(controller: controller!),
    );
  }
}

class _BottomBar extends StatelessWidget {
  const _BottomBar({
    required this.lesson,
    required this.actions,
    required this.onAskAi,
    required this.onComplete,
    required this.onBookmark,
  });

  final LessonDetail lesson;
  final LessonActionsState actions;
  final VoidCallback onAskAi;
  final VoidCallback onComplete;
  final VoidCallback onBookmark;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: ProfyColors.background,
        border: Border(top: BorderSide(color: ProfyColors.border)),
      ),
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 10,
        bottom: 10 + MediaQuery.paddingOf(context).bottom,
      ),
      child: Row(
        children: [
          IconButton.filledTonal(
            onPressed: onBookmark,
            isSelected: actions.bookmarked,
            icon: Icon(
              actions.bookmarked ? Icons.bookmark : Icons.bookmark_border,
              color: actions.bookmarked ? ProfyColors.primary : null,
            ),
            tooltip: 'Bookmark',
          ),
          const SizedBox(width: 12),
          Expanded(
            child: OutlinedButton.icon(
              onPressed: onAskAi,
              icon: const Icon(Icons.smart_toy_outlined),
              label: const Text('Ask AI Teacher'),
            ),
          ),
          const SizedBox(width: 12),
          FilledButton(
            onPressed: actions.completing || actions.completed ? null : onComplete,
            child: Text(actions.completed ? 'Completed ✓' : 'Complete'),
          ),
        ],
      ),
    );
  }
}

int _tabCount(LessonDetail lesson) =>
    1 +
    (lesson.description == null ? 0 : 1) +
    (lesson.explanation == null ? 0 : 1) +
    (lesson.objectives.isEmpty ? 0 : 1) +
    (lesson.examples.isEmpty ? 0 : 1) +
    (lesson.exercises.isEmpty ? 0 : 1) +
    (lesson.quizzes.isEmpty ? 0 : 1);

List<Tab> _tabs(LessonDetail lesson) {
  final tabs = <Tab>[];
  if (lesson.description != null) tabs.add(const Tab(text: 'Overview'));
  if (lesson.explanation != null) tabs.add(const Tab(text: 'Explanation'));
  if (lesson.objectives.isNotEmpty) tabs.add(const Tab(text: 'Objectives'));
  if (lesson.examples.isNotEmpty) tabs.add(const Tab(text: 'Examples'));
  if (lesson.exercises.isNotEmpty) tabs.add(const Tab(text: 'Exercises'));
  if (lesson.quizzes.isNotEmpty) tabs.add(const Tab(text: 'Quiz'));
  if (tabs.isEmpty) tabs.add(const Tab(text: 'About'));
  return tabs;
}

List<Widget> _tabViews(BuildContext context, WidgetRef ref, LessonDetail lesson) {
  final views = <Widget>[];
  if (lesson.description != null) {
    views.add(SectionListView(
      children: [TextParagraph(lesson.description!)],
    ));
  }
  if (lesson.explanation != null) {
    views.add(SectionListView(
      children: [TextParagraph(lesson.explanation!)],
    ));
  }
  if (lesson.objectives.isNotEmpty) {
    views.add(SectionListView(
      children: [
        for (final o in lesson.objectives)
          BulletItem(icon: Icons.check_circle_outline, text: o),
      ],
    ));
  }
  if (lesson.examples.isNotEmpty) {
    views.add(SectionListView(
      children: [
        for (final e in lesson.examples)
          BulletItem(icon: Icons.lightbulb_outline, text: e),
      ],
    ));
  }
  if (lesson.exercises.isNotEmpty) {
    views.add(SectionListView(
      children: [
        for (final e in lesson.exercises)
          BulletItem(icon: Icons.edit_note, text: e),
      ],
    ));
  }
  if (lesson.quizzes.isNotEmpty) {
    views.add(QuizView(
      quizzes: lesson.quizzes,
      lessonId: lesson.id,
    ));
  }
  if (views.isEmpty) {
    views.add(const SectionListView(
      children: [TextParagraph('This lesson has no written content yet.')],
    ));
  }
  return views;
}
