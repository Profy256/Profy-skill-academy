import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme.dart';
import '../../data/providers.dart';
import '../shared/widgets.dart';

/// Subscription: Free (with ads) vs Premium (ad-free) — PRD §7.6.
///
/// Mobile billing is native IAP via RevenueCat wired in Milestone 8
/// (TECHNICAL_DOC D8); for now the upgrade CTA explains the coming rollout
/// instead of starting a fake purchase flow.
class SubscriptionScreen extends ConsumerWidget {
  const SubscriptionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final entitlement = ref.watch(entitlementProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Subscription')),
      body: AsyncView(
        value: entitlement,
        onRetry: () => ref.invalidate(entitlementProvider),
        data: (e) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (e.isPremium) ...[
              const EmptyState(
                icon: Icons.workspace_premium,
                title: 'You are Premium 🎉',
                subtitle: 'Your learning is ad-free. Thank you for supporting Dera Skul!',
              ),
              if (e.currentPeriodEnd != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    'Renews/ends: ${_date(e.currentPeriodEnd!)}',
                    textAlign: TextAlign.center,
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(color: ProfyColors.mutedForeground),
                  ),
                ),
            ] else ...[
              _PlanCard(
                title: 'Free',
                price: 'UGX 0',
                features: const [
                  'Full lesson access',
                  'AI Teacher in every lesson',
                  'Progress & library sync',
                  'Shows ads',
                ],
                current: true,
              ),
              const SizedBox(height: 12),
              _PlanCard(
                title: 'Premium',
                price: 'Ad-free',
                highlight: true,
                features: const [
                  'Everything in Free',
                  'Zero ads — ever',
                  'Supports curating more lessons',
                ],
                current: false,
                ctaLabel: 'Upgrade — coming to this app soon',
                onCta: () {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                    content: Text(
                        'Mobile payments (Play Billing / App Store) arrive with the next release. Web checkout is available today.'),
                  ));
                },
              ),
            ],
            const SizedBox(height: 16),
            Text(
              'Premium removes ads only — all lessons stay free to learn.',
              textAlign: TextAlign.center,
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

  String _date(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({
    required this.title,
    required this.price,
    required this.features,
    required this.current,
    this.highlight = false,
    this.ctaLabel,
    this.onCta,
  });

  final String title;
  final String price;
  final List<String> features;
  final bool current;
  final bool highlight;
  final String? ctaLabel;
  final VoidCallback? onCta;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: highlight ? ProfyColors.primary : ProfyColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: highlight ? ProfyColors.primary : ProfyColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: highlight ? ProfyColors.onPrimary : ProfyColors.foreground,
                    ),
              ),
              const Spacer(),
              if (current)
                Chip(
                  label: const Text('Current plan'),
                  visualDensity: VisualDensity.compact,
                ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            price,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: highlight ? ProfyColors.onPrimary : ProfyColors.primary,
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 12),
          for (final f in features)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  Icon(
                    Icons.check_circle_outline,
                    size: 18,
                    color: highlight ? ProfyColors.onPrimary : ProfyColors.success,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      f,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: highlight ? ProfyColors.onPrimary : ProfyColors.foreground,
                          ),
                    ),
                  ),
                ],
              ),
            ),
          if (ctaLabel != null) ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor:
                      highlight ? ProfyColors.onPrimary : ProfyColors.primary,
                  foregroundColor:
                      highlight ? ProfyColors.primary : ProfyColors.onPrimary,
                ),
                onPressed: onCta,
                child: Text(ctaLabel!),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
