import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../data/providers.dart';
import '../shared/widgets.dart';

/// Optional onboarding: pick a few interests (Phase-1 top-level categories).
/// Selection is advisory only at MVP — it does not gate any content.
class InterestsScreen extends ConsumerStatefulWidget {
  const InterestsScreen({super.key});

  @override
  ConsumerState<InterestsScreen> createState() => _InterestsScreenState();
}

class _InterestsScreenState extends ConsumerState<InterestsScreen> {
  final _selected = <String>{};

  @override
  Widget build(BuildContext context) {
    final tree = ref.watch(taxonomyTreeProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Choose your interests'),
        actions: [
          TextButton(
            onPressed: () => context.go('/home'),
            child: const Text('Skip'),
          ),
        ],
      ),
      body: AsyncView(
        value: tree,
        onRetry: () => ref.invalidate(taxonomyTreeProvider),
        data: (nodes) {
          final categories = nodes.where((n) => n.nodeType == 'category').toList();
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                'Pick a few topics you’d like to learn. You can change these later.',
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(color: ProfyColors.mutedForeground),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  for (final c in categories)
                    FilterChip(
                      label: Text(c.name),
                      selected: _selected.contains(c.slug),
                      onSelected: (on) => setState(
                        () => on ? _selected.add(c.slug) : _selected.remove(c.slug),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () => context.go('/home'),
                child: Text(
                  _selected.isEmpty
                      ? 'Continue'
                      : 'Continue with ${_selected.length} interest${_selected.length == 1 ? '' : 's'}',
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
