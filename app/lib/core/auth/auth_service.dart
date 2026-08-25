import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import 'identity.dart';

/// A sign-in that did not complete. [cancelled] is true when the person backed
/// out themselves — the caller stays silent for that, and shows [message] for
/// everything else (a provider not yet configured, no network, a device the
/// provider will not serve).
class AuthException implements Exception {
  const AuthException(this.message, {this.cancelled = false});

  final String message;
  final bool cancelled;

  @override
  String toString() => 'AuthException($message)';
}

/// Thin wrappers over the two native SDKs. Both run entirely on the device and
/// return an [Identity]; there is no backend to hand a token to. The provider
/// configuration each one needs (the Apple capability, the Google iOS client
/// id) lives in ios/ — until it is present these throw, which the buttons catch
/// and surface rather than crash.
class AuthService {
  const AuthService();

  Future<Identity> signInWithApple() async {
    try {
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: const [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );
      // Apple returns the name and email only on the very first authorization;
      // the stable [userIdentifier] is what every later sign-in shares, so it
      // is the key. The name, when we get it, is kept by the controller.
      final name = [credential.givenName, credential.familyName]
          .where((part) => part != null && part.isNotEmpty)
          .join(' ');
      return Identity(
        mode: AuthMode.apple,
        userId: credential.userIdentifier ?? '',
        displayName: name,
        email: credential.email ?? '',
      );
    } on SignInWithAppleAuthorizationException catch (e) {
      throw AuthException(
        e.message,
        cancelled: e.code == AuthorizationErrorCode.canceled,
      );
    } catch (e) {
      throw AuthException(e.toString());
    }
  }

  Future<Identity> signInWithGoogle() async {
    try {
      final account = await GoogleSignIn(scopes: const ['email']).signIn();
      // A null account is the person dismissing the sheet.
      if (account == null) {
        throw const AuthException('cancelled', cancelled: true);
      }
      return Identity(
        mode: AuthMode.google,
        userId: account.id,
        displayName: account.displayName ?? '',
        email: account.email,
      );
    } on AuthException {
      rethrow;
    } catch (e) {
      throw AuthException(e.toString());
    }
  }

  /// Clears the Google session so the next sign-in re-prompts for the account.
  /// Apple keeps no client session to clear.
  Future<void> signOut() async {
    try {
      await GoogleSignIn().signOut();
    } catch (_) {
      // Signing out is best-effort — a failure here must not trap the user in
      // an account they asked to leave.
    }
  }
}
