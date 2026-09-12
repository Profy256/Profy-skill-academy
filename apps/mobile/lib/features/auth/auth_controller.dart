import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors.dart';
import '../../core/models.dart';
import '../../data/api_client.dart';
import '../../data/providers.dart';

/// Formats + submits register/login; exposes logout for the Profile screen.
class AuthController extends Notifier<AsyncValue<void>> {
  @override
  AsyncValue<void> build() => const AsyncData(null);

  ProfyApiClient get _api => ref.read(apiClientProvider);

  Future<bool> register(String name, String email, String password) =>
      _run(() => _api.register(name, email, password));

  Future<bool> login(String email, String password) =>
      _run(() => _api.login(email, password));

  Future<bool> _run(Future<TokenPair> Function() action) async {
    state = const AsyncLoading();
    try {
      final pair = await action();
      await ref.read(authStorageProvider).save(pair);
      state = const AsyncData(null);
      return true;
    } on DioException catch (e) {
      state = AsyncError(
        ApiError.fromBody(e.response?.statusCode ?? 0, e.response?.data),
        StackTrace.current,
      );
      return false;
    }
  }

  Future<void> logout() async {
    final storage = ref.read(authStorageProvider);
    final refresh = storage.current?.refreshToken;
    if (refresh != null) {
      try {
        await _api.logout(refresh);
      } on DioException {
        // Best-effort; local session is cleared regardless.
      }
    }
    await storage.clear();
  }
}

final authControllerProvider =
    NotifierProvider<AuthController, AsyncValue<void>>(AuthController.new);
