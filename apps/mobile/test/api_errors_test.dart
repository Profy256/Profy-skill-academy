import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:profy_mobile/core/errors.dart';
import 'package:profy_mobile/data/api_client.dart';
import 'package:profy_mobile/data/auth_storage.dart';

/// Builds a dio failure carrying an API error envelope, for stubbing
/// repository calls in widget tests.
DioException dioError(int status, String code) {
  return DioException(
    requestOptions: RequestOptions(path: '/'),
    response: Response(
      requestOptions: RequestOptions(path: '/'),
      statusCode: status,
      data: {
        'error': {'code': code, 'message': 'msg'},
      },
    ),
  );
}

ApiError apiErrorOf(DioException e) =>
    ApiError.fromBody(e.response?.statusCode ?? 0, e.response?.data);

ProviderContainer createContainer() => ProviderContainer();

/// Base stub for [ProfyApiClient]: every method throws [UnimplementedError]
/// so tests override only the calls a screen makes.
class ProfyApiClientStub implements ProfyApiClient {
  @override
  dynamic noSuchMethod(Invocation invocation) => throw UnimplementedError(
      '${invocation.memberName} not stubbed in this test');
}

/// AuthStorage stub with no persisted session (and nothing to persist).
class AuthStorageStub implements AuthStorage {
  final _controller = StreamController<bool>.broadcast();

  @override
  dynamic noSuchMethod(Invocation invocation) {
    if (invocation.memberName == #sessionChanges) return _controller.stream;
    if (invocation.memberName == #current) return null;
    return null;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ApiError mapping', () {
    test('ai outage maps to ai_unavailable', () {
      expect(
          apiErrorOf(dioError(503, 'ai_unavailable')).isAiUnavailable, isTrue);
    });

    test('auth failures map to unauthorized', () {
      final e = apiErrorOf(dioError(401, 'unauthorized'));
      expect(e.isUnauthorized, isTrue);
      expect(e.isAiUnavailable, isFalse);
    });
  });
}
