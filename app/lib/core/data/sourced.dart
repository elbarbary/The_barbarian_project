import '../networking/static_api.dart';

/// A parsed value carrying the provenance of the bytes it came from.
///
/// Every screen that shows market data must show its age (spec §49), and the
/// only way to do that honestly is to carry it alongside the value rather than
/// letting the UI guess.
class Sourced<T> {
  const Sourced({required this.value, required this.origin, this.storedAt});

  const Sourced.fixture(this.value)
    : origin = DocumentOrigin.fixture,
      storedAt = null;

  final T value;
  final DocumentOrigin origin;
  final DateTime? storedAt;

  bool get isFromCache => origin == DocumentOrigin.cache;
  bool get isFresh => origin == DocumentOrigin.network;

  /// How old this copy is, or null when it has no meaningful age.
  Duration? get age {
    final at = storedAt;
    if (at == null) return null;
    return DateTime.now().difference(at);
  }

  Sourced<R> map<R>(R Function(T value) transform) =>
      Sourced<R>(value: transform(value), origin: origin, storedAt: storedAt);
}
