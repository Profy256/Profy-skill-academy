import 'dart:async';
import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../core/models.dart';

/// Persists the consumer session (token pair) locally and exposes session
/// changes as a broadcast stream so the router can redirect on login/logout.
class AuthStorage {
  AuthStorage(this._prefs);

  static const _key = 'auth.token_pair.v1';

  final SharedPreferences _prefs;
  final _session = StreamController<bool>.broadcast();

  TokenPair? _current;

  /// Session state as a stream: emits true after login, false after logout.
  Stream<bool> get sessionChanges => _session.stream;

  TokenPair? get current => _current;

  /// Load persisted session at startup (before the first frame).
  Future<void> load() async {
    final raw = _prefs.getString(_key);
    if (raw == null) return;
    try {
      _current = TokenPair.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      await _prefs.remove(_key);
      _current = null;
    }
  }

  Future<void> save(TokenPair pair) async {
    _current = pair;
    await _prefs.setString(_key, jsonEncode(pair.toJson()));
    _session.add(true);
  }

  Future<void> clear() async {
    _current = null;
    await _prefs.remove(_key);
    _session.add(false);
  }

  void close() => _session.close();
}
