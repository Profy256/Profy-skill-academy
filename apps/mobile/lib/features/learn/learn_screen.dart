import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models.dart';
import '../../core/theme.dart';
import '../../data/providers.dart';
import '../shared/widgets.dart';

/// Learn tab: full Phase-1 taxonomy tree, expandable per category.
class LearnScreen extends ConsumerWidget {
  const LearnScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tree = ref.watch(taxonomyTreeProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Learn')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(taxonomyTreeProvider),
        child: AsyncView(
          value: tree,
          onRetry: () => ref.invalidate(taxonomyTreeProvider),
          data: (nodes) {
            if (nodes.isEmpty) {
              return const EmptyState(
                icon: Icons.school_outlined,
                title: 'No categories yet',
                subtitle: 'Content is being curated — check back soon.',
              );
            }
            return ListView(
              padding: const EdgeInsets.only(bottom: 16),
              children: [
                for (final category in nodes) _CategoryCard(node: category),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _CategoryCard extends ConsumerStatefulWidget {
  const _CategoryCard({required this.node});

  final TaxonomyNode node;

  @override
  ConsumerState<_CategoryCard> createState() => _CategoryCardState();
}

class _CategoryCardState extends ConsumerState<_CategoryCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final node = widget.node;
    return Card(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          initiallyExpanded: _expanded,
          onExpansionChanged: (v) => setState(() => _expanded = v),
          leading: const Icon(Icons.category_outlined, color: ProfyColors.secondary),
          title: Text(node.name, style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: node.description == null
              ? null
              : Text(node.description!, maxLines: 1, overflow: TextOverflow.ellipsis),
          children: [
            if (node.children.isEmpty)
              const ListTile(title: Text('Nothing here yet'))
            else
              for (final sub in node.children)
                _SubRow(parent: node, child: sub),
          ],
        ),
      ),
    );
  }
}

class _SubRow extends StatelessWidget {
  const _SubRow({required this.parent, required this.child});

  final TaxonomyNode parent;
  final TaxonomyNode child;

  @override
  Widget build(BuildContext context) {
    final courses = child.children;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 16, 2),
          child: Text(
            child.name,
            style: Theme.of(context).textTheme.titleSmall,
          ),
        ),
        if (courses.isEmpty)
          Padding(
            padding: const EdgeInsets.only(left: 36),
            child: Text(
              child.isCourse ? 'Tap to open' : 'No courses yet',
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: ProfyColors.mutedForeground),
            ),
          )
        else
          for (final course in courses)
            if (course.isCourse)
              ListTile(
                contentPadding: const EdgeInsets.only(left: 36, right: 16),
                leading: const Icon(Icons.menu_book_outlined, color: ProfyColors.primary),
                title: Text(course.name),
                subtitle: Text('${_countLessons(course)} lessons'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.go('/course/${course.slug}'),
              )
            else
              ListTile(
                contentPadding: const EdgeInsets.only(left: 36, right: 16),
                dense: true,
                leading: const Icon(Icons.subdirectory_arrow_right),
                title: Text(course.name),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.go('/learn/category/${course.slug}'),
              ),
        const SizedBox(height: 4),
      ],
    );
  }
}

int _countLessons(TaxonomyNode course) {
  // The tree does not carry lesson_count; show sub-branch size as a hint.
  return course.children.length;
}
