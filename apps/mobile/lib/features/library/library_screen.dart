import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../data/providers.dart';
import '../shared/widgets.dart';

/// Library: saved (bookmarked) lessons with completion status (PRD §7.4).
class LibraryScreen extends ConsumerWidget {
  const LibraryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bookmarks = ref.watch(bookmarksProvider);
    final loggedIn = ref.watch(isLoggedInProvider).value ?? false;

    return Scaffold(
      appBar: AppBar(title: const Text('Library')),
      body: !loggedIn
          ? const EmptyState(
              icon: Icons.lock_outline,
              title: 'Log in to see your library',
              subtitle: 'Saved lessons and progress sync to your account.',
            )
          : RefreshIndicator(
              onRefresh: () async => ref.invalidate(bookmarksProvider),
              child: AsyncView(
                value: bookmarks,
                onRetry: () => ref.invalidate(bookmarksProvider),
                data: (items) {
                  if (items.isEmpty) {
                    return const EmptyState(
                      icon: Icons.bookmark_border,
                      title: 'No saved lessons yet',
                      subtitle: 'Tap the bookmark icon inside any lesson to save it here.',
                    );
                  }
                  return ListView.separated(
                    itemCount: items.length,
                    separatorBuilder: (_, _) => const Divider(height: 1, indent: 16),
                    itemBuilder: (context, i) {
                      final b = items[i];
                      return ListTile(
                        leading: const Icon(Icons.bookmark, color: ProfyColors.primary),
                        title: Text(b.lessonTitle),
                        subtitle: Text(b.courseName),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () {
                          // Bookmarks expose course_slug; navigate via search-free route.
                          context.go('/course/${b.courseSlug}');
                        },
                      );
                    },
                  );
                },
              ),
            ),
      bottomNavigationBar: const AdSlot(placementId: 'library_banner'),
    );
  }
}
