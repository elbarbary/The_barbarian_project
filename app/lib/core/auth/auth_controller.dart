import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'auth_service.dart';
import 'identity.dart';

/// The identity the app boots with, read from disk once in `main` and injected
/// here so the very first frame already knows whether to show the gate. The
/// real value comes from the override in `main`; the default keeps tests and
/// any un-overridden scope on the sign-in gate rather than crashing.
final authInitialProvider = Provider<Identity>((ref) => Identity.signedOut);

/// The one source of truth for who the app is being used as. Everything that
/// branches on account vs guest — the data source, the watchlist namespace,
/// the gate — watches this.
final authControllerProvider = NotifierProvider<AuthController, Identity>(
  AuthController.new,
);

class AuthController extends Notifier<Identity> {
  final _prefs = SharedPreferencesAsync();
  final _service = const AuthService();

  static const String _key = 'auth.identity';

  @override
  Identity build() => ref.read(authInitialProvider);

  Future<void> continueAsGuest() => _persist(Identity.guest);

  /// Runs the native Apple flow and, on success, becomes that account. Throws
  /// [AuthException]; the caller decides what to show.
  Future<void> signInWithApple() async {
    await _persist(_withName(await _service.signInWithApple()));
  }

  Future<void> signInWithGoogle() async {
    await _persist(_withName(await _service.signInWithGoogle()));
  }

  /// Leaves the current account and returns to the gate. The account's
  /// watchlist stays on the device under its own namespace, so signing back in
  /// restores it.
  Future<void> signOut() async {
    await _service.signOut();
    await _prefs.remove(_key);
    state = Identity.signedOut;
  }

  /// Apple hands the name back only on the first authorization ever; on later
  /// sign-ins it is empty. When we already stored a name for this same account,
  /// keep it rather than blanking the account row.
  Identity _withName(Identity fresh) {
    if (fresh.displayName.isNotEmpty) return fresh;
    final prior = state;
    final sameAccount =
        prior.mode == fresh.mode && prior.userId == fresh.userId;
    if (sameAccount && prior.displayName.isNotEmpty) {
      return Identity(
        mode: fresh.mode,
        userId: fresh.userId,
        displayName: prior.displayName,
        email: fresh.email.isNotEmpty ? fresh.email : prior.email,
      );
    }
    return fresh;
  }

  Future<void> _persist(Identity identity) async {
    state = identity;
    await _prefs.setString(_key, jsonEncode(identity.toJson()));
  }

  /// Reads the stored identity at startup. Returns [Identity.signedOut] when
  /// nothing is stored or the stored value is unreadable, so a corrupt entry
  /// sends the reader to the gate rather than crashing the launch.
  static Future<Identity> load() async {
    final raw = await SharedPreferencesAsync().getString(_key);
    if (raw == null) return Identity.signedOut;
    try {
      return Identity.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return Identity.signedOut;
    }
  }
}
