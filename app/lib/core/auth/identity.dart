/// Who the app is being used as — the whole of it.
///
/// This product has no server and stores nothing off the device, so "signing
/// in" is not about a session on a backend. It is about establishing a *stable
/// local identity* that does two things: it namespaces the on-device watchlist
/// so two people (or an account and a guest) on the same phone keep separate
/// lists, and it decides whether the app reads the live exchange feed or the
/// bundled sample snapshot. A guest is a first-class identity, not a
/// second-class one — it simply keeps its own list and reads the sample data.
enum AuthMode { signedOut, guest, google, apple }

/// A resolved identity: which mode, and — for a real account — the stable id
/// and whatever name/email the provider handed back. `userId` is empty for
/// guest and signed-out; it is never shown, only used to key local storage.
class Identity {
  const Identity({
    required this.mode,
    this.userId = '',
    this.displayName = '',
    this.email = '',
  });

  final AuthMode mode;
  final String userId;
  final String displayName;
  final String email;

  static const Identity signedOut = Identity(mode: AuthMode.signedOut);
  static const Identity guest = Identity(mode: AuthMode.guest, userId: 'guest');

  bool get isSignedOut => mode == AuthMode.signedOut;
  bool get isGuest => mode == AuthMode.guest;

  /// True only for a real provider account — the case that reads the live feed.
  bool get isAuthed => mode == AuthMode.google || mode == AuthMode.apple;

  /// A best-effort label for the account row on the You screen. Never invents
  /// a name: falls back to the email, then to nothing (the screen supplies the
  /// generic label in that case).
  String get label => displayName.isNotEmpty ? displayName : email;

  /// The prefix that namespaces this identity's on-device storage. Guest keeps
  /// the app's original un-suffixed keys so a device that has been used as a
  /// guest does not appear to lose its list the day accounts arrive; every
  /// account gets its own space keyed by the provider and the stable id.
  String get storageNamespace => switch (mode) {
    AuthMode.google => 'g_$userId',
    AuthMode.apple => 'a_$userId',
    // Signed-out never persists a list, but if something asks it shares the
    // guest space rather than inventing a third.
    AuthMode.guest || AuthMode.signedOut => 'guest',
  };

  Map<String, dynamic> toJson() => {
    'mode': mode.name,
    'userId': userId,
    'displayName': displayName,
    'email': email,
  };

  static Identity fromJson(Map<String, dynamic> json) => Identity(
    mode: AuthMode.values.firstWhere(
      (m) => m.name == json['mode'],
      orElse: () => AuthMode.signedOut,
    ),
    userId: json['userId'] as String? ?? '',
    displayName: json['displayName'] as String? ?? '',
    email: json['email'] as String? ?? '',
  );
}
