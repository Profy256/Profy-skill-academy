import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:profy_mobile/core/models.dart';
import 'package:profy_mobile/data/providers.dart';
import 'package:profy_mobile/features/home/home_screen.dart';

import 'api_errors_test.dart' show ProfyApiClientStub;

/// Canonical fixture used by widget + golden tests.
FeaturedHome fixtureHome() => FeaturedHome(
      featured: [
        const CourseSummary(
          id: 'c1',
          name: 'REST APIs with Go',
          slug: 'rest-apis-go',
          lessonCount: 6,
          levels: ['beginner'],
        ),
        const CourseSummary(
          id: 'c2',
          name: 'Personal Finance Basics',
          slug: 'personal-finance',
          lessonCount: 4,
          levels: ['beginner', 'intermediate'],
        ),
      ],
      categories: [
        TaxonomyNode(
          id: 't1',
          nodeType: 'category',
          name: 'Technology',
          slug: 'technology',
          phase: 1,
          isActive: true,
          sortOrder: 0,
          depth: 0,
          children: [],
        ),
        TaxonomyNode(
          id: 't2',
          nodeType: 'category',
          name: 'Business & Finance',
          slug: 'business-finance',
          phase: 1,
          isActive: true,
          sortOrder: 1,
          depth: 0,
          children: [],
        ),
      ],
    );

class _HomeStub extends ProfyApiClientStub {
  @override
  Future<FeaturedHome> featuredHome() async => fixtureHome();

  @override
  Future<ConfigResponse> appConfig() async => const ConfigResponse(
        adsEnabled: true,
        adsPlacements: [
          AdPlacement(
            placementId: 'home_banner',
            enabled: true,
            frequency: 1,
          ),
        ],
        forceUpdate: false,
      );
}

void main() {
  testWidgets('renders featured carousel, categories and search entry',
      (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiClientProvider.overrideWithValue(_HomeStub())],
        child: const MaterialApp(home: HomeScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Featured skills'), findsOneWidget);
    expect(find.text('REST APIs with Go'), findsOneWidget);
    expect(find.text('Browse by category'), findsOneWidget);
    expect(find.text('Technology'), findsOneWidget);
    expect(find.text('Business & Finance'), findsOneWidget);
    expect(find.text('Search skills and lessons…'), findsOneWidget);
  });
}
