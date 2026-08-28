/// Who the app is being used as — the whole of it.
///
/// Signing in does two things. It establishes a *stable local identity*, which
/// namespaces the on-device watchlist so two people — or an account and a
/// guest — on one phone keep separate lists. And it decides whether the app
/// reads the live exchange feed or the bundled sample snapshot. A guest is a
/// first-class identity, not a second-class one: it keeps its own list and
/// reads the sample data.
///
/// It used to be purely local, because the published data was world-readable
/// and the app only had to decide what to *show*. That is no longer true —
/// `/data/v1/` answers 401 without a session — so [AuthMode.email] carries a
/// server-issued token, and it is the mode that reaches the live exchange.
///
/// Google and Apple remain local identities: they namespace a watchlist but do
/// not by themselves open the feed, because nothing has proved to the server
/// who they are. Exchanging one of their tokens for a session is the obvious
/// next step and is not built yet.
enum AuthMode { signedOut, guest, google, apple, email }

/// A resolved identity: which mode, and — for a real account — the stable id
/// and whatever name/email the provider handed back. `userId` is empty for
/// guest and signed-out; it is never shown, only used to key local storage.
class Identity {
  const Identity({
    required this.mode,
    this.userId = '',
    this.displayName = '',
    this.email = '',
    this.token = '',
  });

  final AuthMode mode;
  final String userId;
  final String displayName;
  final String email;

  /// The signed session the exchange feed requires, empty for every mode that
  /// does not hold one. It is sent as a bearer on each request and is the only
  /// thing the server checks; nothing else here leaves the device.
  final String token;

  static const Identity signedOut = Identity(mode: AuthMode.signedOut);
  static const Identity guest = Identity(mode: AuthMode.guest, userId: 'guest');

  bool get isSignedOut => mode == AuthMode.signedOut;
  bool get isGuest => mode == AuthMode.guest;

  /// Whether this identity can read the live exchange feed.
  ///
  /// A session token is the whole test, because it is the whole of what the
  /// server accepts. A Google or Apple account without one is a local identity
  /// with a watchlist, and reads the sample data like a guest.
  bool get isAuthed => token.isNotEmpty;

  /// A signed-in identity of any kind, for the screens that ask "is somebody
  /// here" rather than "may this read the feed".
  bool get hasAccount =>
      mode == AuthMode.google || mode == AuthMode.apple || mode == AuthMode.email;

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
    AuthMode.email => 'e_$userId',
    // Signed-out never persists a list, but if something asks it shares the
    // guest space rather than inventing a third.
    AuthMode.guest || AuthMode.signedOut => 'guest',
  };

  Map<String, dynamic> toJson() => {
    'mode': mode.name,
    'userId': userId,
    'displayName': displayName,
    'email': email,
    'token': token,
  };

  static Identity fromJson(Map<String, dynamic> json) => Identity(
    mode: AuthMode.values.firstWhere(
      (m) => m.name == json['mode'],
      orElse: () => AuthMode.signedOut,
    ),
    userId: json['userId'] as String? ?? '',
    displayName: json['displayName'] as String? ?? '',
    email: json['email'] as String? ?? '',
    token: json['token'] as String? ?? '',
  );
}
