import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme.dart';
import '../../data/providers.dart';

/// In-house ad placeholder (TECHNICAL_DOC §7.1 / D6).
///
/// Placement IDs come from `GET /config`; MVP renders a tasteful placeholder —
/// the AdMob SDK drops in behind this same widget later. Hidden entirely for
/// premium users and when the server disables the placement.
class AdSlot extends ConsumerWidget {
  const AdSlot({super.key, required this.placementId});

  final String placementId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(appConfigProvider).value;
    final entitlement = ref.watch(entitlementProvider).value;
    if (entitlement?.isPremium ?? false) return const SizedBox.shrink();

    final placement = config?.placement(placementId);
    final enabled = (config?.adsEnabled ?? false) && (placement?.enabled ?? false);
    if (!enabled) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: ProfyColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: ProfyColors.border),
      ),
      child: Row(
        children: [
          const Icon(Icons.campaign, color: ProfyColors.secondary),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Ad · $placementId',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: ProfyColors.mutedForeground,
                  ),
            ),
          ),
          Text(
            'Sponsored',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: ProfyColors.mutedForeground,
                ),
          ),
        ],
      ),
    );
  }
}

/// Standard loading / error / empty rendering for FutureProviders, with retry.
class AsyncView<T> extends StatelessWidget {
  const AsyncView({
    super.key,
    required this.value,
    required this.data,
    this.onRetry,
  });

  final AsyncValue<T> value;
  final Widget Function(T data) data;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return value.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => _ErrorView(error: e, onRetry: onRetry),
      data: data,
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.error, this.onRetry});

  final Object error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final message = error is Exception ? 'Something went wrong.' : '$error';
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off, size: 40, color: ProfyColors.mutedForeground),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 12),
              OutlinedButton(onPressed: onRetry, child: const Text('Retry')),
            ],
          ],
        ),
      ),
    );
  }
}

/// Warm terracotta brand mark used on Welcome/Auth screens.
class ProfyLogo extends StatelessWidget {
  const ProfyLogo({super.key, this.size = 72});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(
        color: ProfyColors.primary,
        borderRadius: BorderRadius.all(Radius.circular(24)),
      ),
      child: Icon(Icons.school, color: ProfyColors.onPrimary, size: size * 0.55),
    );
  }
}

/// Small reusable section header used across screens.
class SectionHeader extends StatelessWidget {
  const SectionHeader({super.key, required this.title, this.actionLabel, this.onAction});

  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.titleLarge,
            ),
          ),
          if (actionLabel != null)
            TextButton(onPressed: onAction, child: Text(actionLabel!)),
        ],
      ),
    );
  }
}

/// Empty-state block with icon + caption.
class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, this.subtitle});

  final IconData icon;
  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 44, color: ProfyColors.mutedForeground),
            const SizedBox(height: 12),
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            if (subtitle != null) ...[
              const SizedBox(height: 6),
              Text(
                subtitle!,
                textAlign: TextAlign.center,
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: ProfyColors.mutedForeground),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
