/// App-wide configuration.
///
/// `appVersion` must be kept in sync with `version:` in pubspec.yaml — it is
/// sent as the `X-App-Version` header on every request (OpenAPI §info) so the
/// backend can force-update clients later.
library;

const String appVersion = '1.0.0+1';

/// Base URL of the API.
///
/// - Android emulator reaches the host machine via `10.0.2.2`.
/// - iOS simulator can use `http://localhost:8080` directly.
/// - Override at build time with: `--dart-define=PROFY_API_BASE_URL=...`
const String kApiBaseUrl = String.fromEnvironment(
  'PROFY_API_BASE_URL',
  defaultValue: 'http://10.0.2.2:8080',
);
