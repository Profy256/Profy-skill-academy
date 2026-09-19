import 'package:dio/dio.dart';

import '../core/config.dart';
import '../core/models.dart';
import 'auth_storage.dart';

/// Hand-written consumer API client mirroring `backend/api/openapi.yaml`
/// (TECHNICAL_DOC §3: Flutter client is hand-written against the same spec).
class ProfyApiClient {
  ProfyApiClient({required this.auth, Dio? dio})
      : _dio = dio ??
            Dio(BaseOptions(
              baseUrl: kApiBaseUrl,
              connectTimeout: const Duration(seconds: 10),
              receiveTimeout: const Duration(seconds: 20),
              headers: {'X-App-Version': appVersion},
            )) {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: _attachAuth,
      onError: _maybeRefresh,
    ));
  }

  final AuthStorage auth;
  final Dio _dio;

  bool _refreshing = false;
  final _waiting = <(DioException, ErrorInterceptorHandler)>[];

  void _attachAuth(RequestOptions options, RequestInterceptorHandler handler) {
    final token = auth.current?.accessToken;
    if (token != null) options.headers['Authorization'] = 'Bearer $token';
    handler.next(options);
  }

  /// On a 401 (excluding the auth endpoints themselves), try one transparent
  /// refresh + retry. Concurrent 401s wait on the same refresh.
  Future<void> _maybeRefresh(DioException err, ErrorInterceptorHandler handler) async {
    final req = err.requestOptions;
    final isAuthCall = req.path.contains('/auth/login') ||
        req.path.contains('/auth/register') ||
        req.path.contains('/auth/refresh') ||
        req.path.contains('/auth/logout');

    if (err.response?.statusCode != 401 ||
        isAuthCall ||
        auth.current == null) {
      handler.next(err);
      return;
    }

    if (_refreshing) {
      _waiting.add((err, handler));
      return;
    }

    _refreshing = true;
    TokenPair? pair;
    try {
      final res = await _dio.post('/api/v1/auth/refresh', data: {
        'refresh_token': auth.current!.refreshToken,
      });
      pair = TokenPair.fromJson((res.data as Map).cast<String, dynamic>());
      await auth.save(pair);
    } on DioException catch (e) {
      // Refresh failed (reuse detection or expiry) — drop the session.
      if (e.response?.statusCode == 401) await auth.clear();
    } catch (_) {
      // Network error during refresh: keep session, surface original error.
    } finally {
      _refreshing = false;
    }

    if (pair != null) {
      await _retryAndResolve(err, handler, pair.accessToken);
      final queued = List.of(_waiting);
      _waiting.clear();
      for (final (e, h) in queued) {
        await _retryAndResolve(e, h, pair.accessToken);
      }
    } else {
      handler.next(err);
      final queued = List.of(_waiting);
      _waiting.clear();
      for (final (e, h) in queued) {
        h.next(e);
      }
    }
  }

  Future<void> _retryAndResolve(
    DioException err,
    ErrorInterceptorHandler handler,
    String token,
  ) async {
    final opts = err.requestOptions;
    opts.headers['Authorization'] = 'Bearer $token';
    try {
      final response = await _dio.fetch(opts);
      handler.resolve(response);
    } on DioException catch (e) {
      handler.next(e);
    }
  }

  Future<Map<String, dynamic>> _get(String path, {Map<String, dynamic>? query}) async {
    final res = await _dio.get(path, queryParameters: query);
    return (res.data as Map).cast<String, dynamic>();
  }

  Future<Map<String, dynamic>> _post(String path, Object? data) async {
    final res = await _dio.post(path, data: data);
    return (res.data as Map).cast<String, dynamic>();
  }

  // ---------------------------------------------------------------- auth
  Future<TokenPair> register(String name, String email, String password) async {
    final res = await _dio.post('/api/v1/auth/register', data: {
      'name': name,
      'email': email,
      'password': password,
      'device': 'mobile',
    });
    return TokenPair.fromJson((res.data as Map).cast<String, dynamic>());
  }

  Future<TokenPair> login(String email, String password) async {
    final res = await _dio.post('/api/v1/auth/login', data: {
      'email': email,
      'password': password,
      'device': 'mobile',
    });
    return TokenPair.fromJson((res.data as Map).cast<String, dynamic>());
  }

  Future<void> logout(String refreshToken) async {
    try {
      await _dio.post('/api/v1/auth/logout', data: {'refresh_token': refreshToken});
    } on DioException catch (e) {
      if (e.response?.statusCode != 401) rethrow;
      // Expired access token on logout: acceptable — local session is cleared anyway.
    }
  }

  // ------------------------------------------------------------ discovery
  Future<FeaturedHome> featuredHome() async =>
      FeaturedHome.fromJson(await _get('/api/v1/home/featured'));

  Future<ConfigResponse> appConfig() async =>
      ConfigResponse.fromJson(await _get('/api/v1/config'));

  Future<List<TaxonomyNode>> taxonomyTree() async {
    final res = await _dio.get('/api/v1/taxonomy/tree');
    final data = (res.data as Map).cast<String, dynamic>();
    return ((data['tree'] as List?) ?? const [])
        .map((e) => TaxonomyNode.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  Future<NodeDetail> taxonomyNode(String slug) async =>
      NodeDetail.fromJson(await _get('/api/v1/taxonomy/nodes/$slug'));

  Future<SearchResults> search(String query, {String? cursor}) async =>
      SearchResults.fromJson(await _get('/api/v1/search', query: {
        'q': query,
        'cursor': ?cursor,
      }));

  // -------------------------------------------------------------- lessons
  Future<CourseDetail> courseDetail(String slug) async =>
      CourseDetail.fromJson(await _get('/api/v1/courses/$slug'));

  Future<LessonDetail> lessonDetail(String slug) async =>
      LessonDetail.fromJson(await _get('/api/v1/lessons/$slug'));

  // ------------------------------------------------------------------- ai
  Future<String> aiChat(String lessonId, String message) async {
    final res = await _post('/api/v1/lessons/$lessonId/ai/chat', {'message': message});
    return (res['reply'] as String?) ?? '';
  }

  Future<List<ChatMessage>> aiMessages(String lessonId) async {
    final res = await _get('/api/v1/lessons/$lessonId/ai/messages');
    return ((res['messages'] as List?) ?? const [])
        .map((e) => ChatMessage.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  // ------------------------------------------------------------- progress
  Future<void> updateProgress(String lessonId, String status) async {
    await _dio.put('/api/v1/lessons/$lessonId/progress', data: {'status': status});
  }

  Future<List<ContinueLearningItem>> continueLearning() async {
    final res = await _get('/api/v1/progress/continue');
    return ((res['items'] as List?) ?? const [])
        .map((e) => ContinueLearningItem.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  Future<List<Bookmark>> bookmarks() async {
    final res = await _get('/api/v1/library/bookmarks');
    return ((res['items'] as List?) ?? const [])
        .map((e) => Bookmark.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  Future<void> addBookmark(String lessonId) async {
    await _dio.post('/api/v1/library/bookmarks/$lessonId');
  }

  Future<void> removeBookmark(String lessonId) async {
    await _dio.delete('/api/v1/library/bookmarks/$lessonId');
  }

  Future<void> recordQuizAttempt(String lessonId, int score, int total) async {
    await _dio.post('/api/v1/lessons/$lessonId/quiz-attempts', data: {
      'score': score,
      'total': total,
    });
  }

  Future<ProfileStats> profileStats() async =>
      ProfileStats.fromJson(await _get('/api/v1/profile/stats'));

  // -------------------------------------------------------------- billing
  Future<Entitlement> entitlement() async =>
      Entitlement.fromJson(await _get('/api/v1/entitlement'));
}
