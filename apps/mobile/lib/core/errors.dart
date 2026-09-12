/// Parses the API error envelope `{"error": {"code", "message"}}` into a typed
/// exception so the UI can branch on stable machine codes (`ai_unavailable`,
/// `rate_limited`, ...) instead of HTTP statuses.
library;

class ApiError implements Exception {
  ApiError({
    required this.statusCode,
    required this.code,
    required this.message,
  });

  final int statusCode;
  final String code;
  final String message;

  /// Build from a dio response body, tolerating non-envelope payloads.
  static ApiError fromBody(int statusCode, Object? body) {
    String code = 'unknown';
    String message = 'Something went wrong. Please try again.';
    if (body is Map) {
      final err = body['error'];
      if (err is Map) {
        code = err['code']?.toString() ?? code;
        message = err['message']?.toString() ?? message;
      }
    }
    return ApiError(statusCode: statusCode, code: code, message: message);
  }

  bool get isAiUnavailable => code == 'ai_unavailable' || statusCode == 503;
  bool get isRateLimited => code == 'rate_limited' || statusCode == 429;
  bool get isUnauthorized => statusCode == 401;
  bool get isNotFound => statusCode == 404;

  @override
  String toString() => 'ApiError($statusCode, $code, $message)';
}
