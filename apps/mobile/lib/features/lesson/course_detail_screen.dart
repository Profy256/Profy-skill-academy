import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../data/providers.dart';
import '../shared/widgets.dart';

/// Course detail: description + lessons grouped by level (TECHNICAL_DOC §7.1).
class CourseDetailScreen extends ConsumerWidget {
  const CourseDetailScreen({super.key, required this.slug});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(courseDetailProvider(slug));

    return Scaffold(
      body: AsyncView(
        value: detail,
        onRetry: () => ref.invalidate(courseDetailProvider(slug)),
        data: (d) {
          final course = d.course;
          return CustomScrollView(
            slivers: [
              SliverAppBar(
                title: Text(course.name),
                pinned: true,
              ),
              SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (course.description != null)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                        child: Text(
                          course.description!,
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium
                              ?.copyWith(color: ProfyColors.mutedForeground),
                        ),
                      ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                      child: Wrap(
                        spacing: 8,
                        children: [
                          Chip(
                            label: Text('${course.lessonCount} lessons'),
                            visualDensity: VisualDensity.compact,
                          ),
                          for (final level in course.levels)
                            Chip(
                              label: Text(level),
                              visualDensity: VisualDensity.compact,
                            ),
                        ],
                      ),
                    ),
                    for (final entry in d.byLevel.entries) ...[
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 20, 16, 4),
                        child: Text(
                          _levelTitle(entry.key),
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                      ),
                      for (final lesson in entry.value)
                        ListTile(
                          leading: const Icon(Icons.play_circle_outline,
                              color: ProfyColors.primary),
                          title: Text(lesson.title),
                          subtitle: lesson.level == null ? null : Text(lesson.level!),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => context.go('/lesson/${lesson.slug}'),
                        ),
                    ],
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

String _levelTitle(String? level) {
  switch (level) {
    case 'beginner':
      return 'Beginner';
    case 'intermediate':
      return 'Intermediate';
    case 'advanced':
      return 'Advanced';
    default:
      return 'Lessons';
  }
}
