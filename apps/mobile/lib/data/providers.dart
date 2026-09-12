import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/errors.dart';
import '../core/models.dart';
import 'api_client.dart';
import 'auth_storage.dart';

/// Overridden in `main.dart` before runApp with the real SharedPreferences.
final sharedPreferencesProvider = Provider<SharedPreferences>((ref) =>
    throw UnimplementedError('sharedPreferencesProvider must be overridden'));

final authStorageProvider = Provider<AuthStorage>((ref) {
  final storage = AuthStorage(ref.watch(sharedPreferencesProvider));
  ref.onDispose(storage.close);
  return storage;
});

final apiClientProvider = Provider<ProfyApiClient>(
    (ref) => ProfyApiClient(auth: ref.watch(authStorageProvider)));

/// True when a consumer session exists. Drives go_router redirects.
final isLoggedInProvider = StreamProvider<bool>((ref) {
  final storage = ref.watch(authStorageProvider);
  late final StreamSubscription<bool> sub;
  final controller = StreamController<bool>();
  // Emit the current value first so the router gets an initial answer.
  controller.add(storage.current != null);
  sub = storage.sessionChanges.listen(
    controller.add,
    onError: controller.addError,
    onDone: controller.close,
    cancelOnError: false,
  );
  ref.onDispose(() async {
    await sub.cancel();
    if (!controller.isClosed) await controller.close();
  });
  return controller.stream;
});

// ---------------------------------------------------------------------------
// App config (ads + flags) — server-driven, cached in memory.
// ---------------------------------------------------------------------------

final appConfigProvider = FutureProvider<ConfigResponse>((ref) async {
  try {
    return await ref.watch(apiClientProvider).appConfig();
  } on DioException {
    return const ConfigResponse(
      adsEnabled: false,
      adsPlacements: [],
      forceUpdate: false,
    );
  }
});

// ---------------------------------------------------------------------------
// Home / discovery
// ---------------------------------------------------------------------------

Future<T> _mapDioError<T>(Future<T> Function() run) async {
  try {
    return await run();
  } on DioException catch (e) {
    throw ApiError.fromBody(e.response?.statusCode ?? 0, e.response?.data);
  }
}

final featuredHomeProvider = FutureProvider.autoDispose<FeaturedHome>(
    (ref) => _mapDioError(() => ref.watch(apiClientProvider).featuredHome()));

final taxonomyTreeProvider = FutureProvider.autoDispose<List<TaxonomyNode>>(
    (ref) => _mapDioError(() => ref.watch(apiClientProvider).taxonomyTree()));

final taxonomyNodeProvider = FutureProvider.autoDispose.family<NodeDetail, String>(
    (ref, slug) => _mapDioError(() => ref.watch(apiClientProvider).taxonomyNode(slug)));

/// Search results for the query currently committed by the Search screen.
final searchResultsProvider =
    FutureProvider.autoDispose.family<SearchResults, String>(
        (ref, query) => _mapDioError(() => ref.watch(apiClientProvider).search(query)));

// ---------------------------------------------------------------------------
// Course & lesson
// ---------------------------------------------------------------------------

final courseDetailProvider = FutureProvider.autoDispose.family<CourseDetail, String>(
    (ref, slug) => _mapDioError(() => ref.watch(apiClientProvider).courseDetail(slug)));

final lessonDetailProvider = FutureProvider.autoDispose.family<LessonDetail, String>(
    (ref, slug) => _mapDioError(() => ref.watch(apiClientProvider).lessonDetail(slug)));

// ---------------------------------------------------------------------------
// Continue learning, bookmarks, stats, entitlement
// ---------------------------------------------------------------------------

final continueLearningProvider =
    FutureProvider.autoDispose<List<ContinueLearningItem>>((ref) async {
  if (ref.watch(isLoggedInProvider).value != true) return const [];
  return _mapDioError(() => ref.watch(apiClientProvider).continueLearning());
});

final bookmarksProvider = FutureProvider.autoDispose<List<Bookmark>>((ref) async {
  if (ref.watch(isLoggedInProvider).value != true) return const [];
  return _mapDioError(() => ref.watch(apiClientProvider).bookmarks());
});

final profileStatsProvider = FutureProvider.autoDispose<ProfileStats>((ref) async {
  if (ref.watch(isLoggedInProvider).value != true) {
    return const ProfileStats(
      coursesCompleted: 0,
      lessonsCompleted: 0,
      lessonsInProgress: 0,
      bookmarksCount: 0,
      quizzesTaken: 0,
    );
  }
  return _mapDioError(() => ref.watch(apiClientProvider).profileStats());
});

final entitlementProvider = FutureProvider.autoDispose<Entitlement>((ref) async {
  if (ref.watch(isLoggedInProvider).value != true) {
    return const Entitlement(isPremium: false);
  }
  return _mapDioError(() => ref.watch(apiClientProvider).entitlement());
});

// ---------------------------------------------------------------------------
// Lesson mutations (progress / bookmark) — family Notifier keyed by lesson id.
// The lesson screen watches it for optimistic bookmark/complete state.
// ---------------------------------------------------------------------------

class LessonActionsState {
  const LessonActionsState({
    this.bookmarked = false,
    this.completing = false,
    this.completed = false,
  });

  final bool bookmarked;
  final bool completing;
  final bool completed;
}

class LessonActionsController extends Notifier<LessonActionsState> {
  LessonActionsController(this._lessonId);

  final String _lessonId;

  @override
  LessonActionsState build() => const LessonActionsState();

  Future<void> load() async {
    try {
      final marks = await ref.read(apiClientProvider).bookmarks();
      state = LessonActionsState(
        bookmarked: marks.any((b) => b.lessonId == _lessonId),
        completing: state.completing,
        completed: state.completed,
      );
    } on DioException {
      // Non-fatal: bookmark state stays unknown.
    }
  }

  Future<void> toggleBookmark() async {
    final was = state.bookmarked;
    state = LessonActionsState(
      bookmarked: !was,
      completing: state.completing,
      completed: state.completed,
    );
    try {
      if (was) {
        await ref.read(apiClientProvider).removeBookmark(_lessonId);
      } else {
        await ref.read(apiClientProvider).addBookmark(_lessonId);
      }
      ref.invalidate(bookmarksProvider);
    } on DioException {
      // Revert on failure.
      state = LessonActionsState(
        bookmarked: was,
        completing: state.completing,
        completed: state.completed,
      );
    }
  }

  Future<bool> markCompleted() async {
    state = LessonActionsState(
      bookmarked: state.bookmarked,
      completing: true,
      completed: state.completed,
    );
    try {
      await ref.read(apiClientProvider).updateProgress(_lessonId, 'completed');
      ref.invalidate(continueLearningProvider);
      ref.invalidate(profileStatsProvider);
      state = LessonActionsState(
        bookmarked: state.bookmarked,
        completing: false,
        completed: true,
      );
      return true;
    } on DioException {
      state = LessonActionsState(
        bookmarked: state.bookmarked,
        completing: false,
        completed: state.completed,
      );
      return false;
    }
  }
}

/// Per-lesson actions family keyed by lesson id.
final lessonActionsFamily = NotifierProvider.family<LessonActionsController,
    LessonActionsState, String>(
  LessonActionsController.new,
);
