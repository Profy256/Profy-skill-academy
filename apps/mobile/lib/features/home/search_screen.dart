import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models.dart';
import '../../core/theme.dart';
import '../../data/providers.dart';
import '../shared/widgets.dart';

/// Skill/lesson search results (PRD §8). Debounced, auto-submits on type.
class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key, this.initialQuery = ''});

  final String initialQuery;

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  late final TextEditingController _controller;
  Timer? _debounce;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialQuery);
    _query = widget.initialQuery;
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      setState(() => _query = value.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    final results = _query.isEmpty
        ? const AsyncValue<SearchResults>.data(
            SearchResults(query: '', results: [], nextCursor: null))
        : ref.watch(searchResultsProvider(_query));

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Padding(
          padding: const EdgeInsets.only(right: 16),
          child: TextField(
            controller: _controller,
            autofocus: widget.initialQuery.isEmpty,
            onChanged: _onChanged,
            decoration: InputDecoration(
              hintText: 'Search skills and lessons…',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _controller.text.isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _controller.clear();
                        setState(() => _query = '');
                      },
                    ),
            ),
          ),
        ),
      ),
      body: AsyncView(
        value: results,
        onRetry: () => ref.invalidate(searchResultsProvider(_query)),
        data: (page) {
          if (page.results.isEmpty) {
            return const EmptyState(
              icon: Icons.search_off,
              title: 'No matches',
              subtitle: 'Try a different keyword, e.g. "python" or "accounting".',
            );
          }
          return ListView.separated(
            itemCount: page.results.length,                    separatorBuilder: (_, _) => const Divider(height: 1, indent: 16),
            itemBuilder: (context, i) {
              final r = page.results[i];
              return ListTile(
                leading: Icon(
                  r.isCourse ? Icons.school_outlined : Icons.play_circle_outline,
                  color: r.isCourse ? ProfyColors.primary : ProfyColors.secondary,
                ),
                title: Text(r.name),
                subtitle: Text(
                  r.isCourse
                      ? '${r.lessonCount ?? 0} lessons'
                      : 'Lesson${r.courseSlug != null ? ' · ${r.courseSlug}' : ''}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () =>
                    context.go(r.isCourse ? '/course/${r.slug}' : '/lesson/${r.slug}'),
              );
            },
          );
        },
      ),
    );
  }
}
