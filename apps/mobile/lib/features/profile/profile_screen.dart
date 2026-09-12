import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../data/providers.dart';
import '../auth/auth_controller.dart';
import '../shared/widgets.dart';

/// Profile: learner stats (PRD §7.4), subscription entry, settings, logout.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stats = ref.watch(profileStatsProvider);
    final entitlement = ref.watch(entitlementProvider);
    final loggedIn = ref.watch(isLoggedInProvider).value ?? false;

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          const SizedBox(height: 8),
          if (!loggedIn)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Card(
                child: ListTile(
                  leading: const Icon(Icons.person_outline),
                  title: const Text('Not logged in'),
                  subtitle: const Text('Log in to track progress and save lessons.'),
                  trailing: FilledButton(
                    onPressed: () => context.go('/login'),
                    child: const Text('Log In'),
                  ),
                ),
              ),
            )
          else ...[
            AsyncView(
              value: stats,
              onRetry: () => ref.invalidate(profileStatsProvider),
              data: (s) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  children: [
                    Row(
                      children: [
                        _StatCard(
                          label: 'Courses completed',
                          value: '${s.coursesCompleted}',
                          icon: Icons.emoji_events_outlined,
                        ),
                        const SizedBox(width: 12),
                        _StatCard(
                          label: 'Lessons completed',
                          value: '${s.lessonsCompleted}',
                          icon: Icons.task_alt,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _StatCard(
                          label: 'In progress',
                          value: '${s.lessonsInProgress}',
                          icon: Icons.timelapse,
                        ),
                        const SizedBox(width: 12),
                        _StatCard(
                          label: 'Quizzes taken',
                          value: '${s.quizzesTaken}',
                          icon: Icons.quiz_outlined,
                        ),
                      ],
                    ),
                    if (s.avgQuizScore != null) ...[
                      const SizedBox(height: 12),
                      _StatCard(
                        label: 'Avg quiz score',
                        value: '${(s.avgQuizScore! * 100).round()}%',
                        icon: Icons.grade_outlined,
                        wide: true,
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            AsyncView(
              value: entitlement,
              data: (e) => ListTile(
                leading: Icon(
                  e.isPremium ? Icons.workspace_premium : Icons.workspace_premium_outlined,
                  color: ProfyColors.primary,
                ),
                title: const Text('Subscription'),
                subtitle: Text(e.isPremium
                    ? 'Premium${e.plan != null ? ' · ${e.plan}' : ''} — ad-free'
                    : 'Free · with ads'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.go('/profile/subscription'),
              ),
            ),
            const Divider(indent: 16),
            ListTile(
              leading: const Icon(Icons.school_outlined),
              title: const Text('Continue learning'),
              subtitle: const Text('Pick up where you left off'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.go('/home'),
            ),
            ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Log out'),
              onTap: () async {
                final navigator = GoRouter.of(context);
                await ref.read(authControllerProvider.notifier).logout();
                navigator.go('/welcome');
              },
            ),
          ],
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    this.wide = false,
  });

  final String label;
  final String value;
  final IconData icon;
  final bool wide;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      flex: wide ? 2 : 1,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: ProfyColors.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: ProfyColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: ProfyColors.primary, size: 22),
            const SizedBox(height: 8),
            Text(value, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 2),
            Text(
              label,
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
