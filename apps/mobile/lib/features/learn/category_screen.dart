import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../data/providers.dart';
import '../shared/widgets.dart';

/// One taxonomy node with breadcrumb + children (courses link to course
/// detail; deeper subcategories stay in-place).
class CategoryScreen extends ConsumerWidget {
  const CategoryScreen({super.key, required this.slug});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(taxonomyNodeProvider(slug));

    return Scaffold(
      appBar: AppBar(title: Text(detail.value?.node.name ?? 'Category')),
      body: AsyncView(
        value: detail,
        onRetry: () => ref.invalidate(taxonomyNodeProvider(slug)),
        data: (d) {
          String? subtitle;
          if (d.breadcrumb.isNotEmpty) {
            subtitle = d.breadcrumb.map((b) => b.name).join(' › ');
          }
          return ListView(
            padding: const EdgeInsets.only(bottom: 24),
            children: [
              if (d.node.description != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: Text(
                    d.node.description!,
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(color: ProfyColors.mutedForeground),
                  ),
                ),
              for (final child in d.node.children)
                Card(
                  margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: ListTile(
                    leading: Icon(
                      child.isCourse ? Icons.menu_book_outlined : Icons.category_outlined,
                      color: child.isCourse ? ProfyColors.primary : ProfyColors.secondary,
                    ),
                    title: Text(child.name),
                    subtitle: child.isCourse ? null : Text('${child.children.length} items'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => child.isCourse
                        ? context.go('/course/${child.slug}')
                        : context.go('/learn/category/${child.slug}'),
                  ),
                ),
              if (d.node.children.isEmpty)
                const EmptyState(
                  icon: Icons.inventory_2_outlined,
                  title: 'Nothing here yet',
                  subtitle: 'This branch has no published courses.',
                ),
              if (subtitle != null)
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    subtitle,
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(color: ProfyColors.mutedForeground),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

}
