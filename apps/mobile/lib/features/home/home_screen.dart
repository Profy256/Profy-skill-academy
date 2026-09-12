import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models.dart';
import '../../core/theme.dart';
import '../../data/providers.dart';
import '../shared/widgets.dart';

/// Home: search, continue learning, featured skills carousel, Phase-1
/// category grid (PRD §8), plus the server-driven home banner AdSlot.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final featured = ref.watch(featuredHomeProvider);
    final continueLearning = ref.watch(continueLearningProvider);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Profy Skill Academy', style: Theme.of(context).textTheme.titleLarge),
            Text(
              'Learn anything. Anytime. Anywhere.',
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: ProfyColors.mutedForeground),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.workspace_premium_outlined),
            onPressed: () => context.go('/profile/subscription'),
            tooltip: 'Go Premium',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(featuredHomeProvider);
          ref.invalidate(continueLearningProvider);
          ref.invalidate(profileStatsProvider);
        },
        child: ListView(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: InkWell(
                borderRadius: BorderRadius.circular(10),
                onTap: () => context.go('/home/search'),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: ProfyColors.border),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.search, color: ProfyColors.mutedForeground),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Search skills and lessons…',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium
                              ?.copyWith(color: ProfyColors.mutedForeground),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            AsyncView(
              value: continueLearning,
              data: (items) => items.isEmpty
                  ? const SizedBox.shrink()
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SectionHeader(title: 'Continue learning'),
                        for (final item in items.take(3))
                          ListTile(
                            leading: const Icon(Icons.play_circle_outline,
                                color: ProfyColors.primary),
                            title: Text(item.lesson.title,
                                maxLines: 1, overflow: TextOverflow.ellipsis),
                            subtitle: Text(item.courseName),
                            trailing: item.status == 'completed'
                                ? const Icon(Icons.check_circle,
                                    color: ProfyColors.success)
                                : const Icon(Icons.chevron_right),
                            onTap: () => context.go('/lesson/${item.lesson.slug}'),
                          ),
                      ],
                    ),
            ),
            const AdSlot(placementId: 'home_banner'),
            AsyncView(
              value: featured,
              onRetry: () => ref.invalidate(featuredHomeProvider),
              data: (home) => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SectionHeader(title: 'Featured skills'),
                  SizedBox(
                    height: 172,
                    child: home.featured.isEmpty
                        ? const EmptyState(
                            icon: Icons.auto_awesome_outlined,
                            title: 'Nothing featured yet',
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            scrollDirection: Axis.horizontal,
                            itemCount: home.featured.length,
                            separatorBuilder: (_, _) => const SizedBox(width: 12),
                            itemBuilder: (context, i) {
                              final c = home.featured[i];
                              return _CourseCard(course: c);
                            },
                          ),
                  ),
                  const SectionHeader(title: 'Browse by category'),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(
                      children: [
                        for (final cat in home.categories)
                          _CategoryTile(category: cat),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CourseCard extends StatelessWidget {
  const _CourseCard({required this.course});

  final CourseSummary course;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () => context.go('/course/${course.slug}'),
      child: Container(
        width: 220,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: ProfyColors.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: ProfyColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              _iconFor(course.icon),
              color: ProfyColors.primary,
              size: 28,
            ),
            const Spacer(),
            Text(
              course.name,
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w600),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Text(
              '${course.lessonCount} lessons',
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: ProfyColors.mutedForeground),
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryTile extends StatelessWidget {
  const _CategoryTile({required this.category});

  final TaxonomyNode category;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: Icon(_iconFor(category.icon), color: ProfyColors.secondary),
        title: Text(category.name),
        subtitle: category.description == null
            ? null
            : Text(
                category.description!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.go('/learn/category/${category.slug}'),
      ),
    );
  }
}

IconData _iconFor(String? name) {
  switch (name) {
    case 'code':
    case 'technology':
      return Icons.code;
    case 'business':
    case 'finance':
      return Icons.trending_up;
    case 'language':
    case 'languages':
      return Icons.translate;
    default:
      return Icons.school_outlined;
  }
}
