import 'dart:typed_data';

import 'package:barbarian/core/auth/identity.dart';
import 'package:barbarian/core/config/app_config.dart';
import 'package:barbarian/core/networking/document_source.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

/// The exchange data is behind a session now. These are the rules that keep
/// "signed in" and "may read the feed" from drifting apart.
void main() {
  group('an identity may read the feed only while it holds a session', () {
    test('a local account without a token reads the sample data', () {
      // Google and Apple establish a local identity and a watchlist, but
      // nothing has proved to the server who they are, so the feed stays shut.
      // Before the gate existed this returned true and the data was public;
      // shipping that combination would 401 every document on the phone.
      const google = Identity(mode: AuthMode.google, userId: 'g1');
      expect(google.isAuthed, isFalse);
      expect(google.hasAccount, isTrue);
    });

    test('a token is what opens it', () {
      const signed = Identity(
        mode: AuthMode.email,
        userId: 'reader@example.com',
        email: 'reader@example.com',
        token: 'header.signature',
      );
      expect(signed.isAuthed, isTrue);
      expect(signed.hasAccount, isTrue);
    });

    test('guest and signed-out never are', () {
      expect(Identity.guest.isAuthed, isFalse);
      expect(Identity.signedOut.isAuthed, isFalse);
      expect(Identity.guest.hasAccount, isFalse);
    });

    test('the token survives being written to disk and read back', () {
      const before = Identity(
        mode: AuthMode.email,
        userId: 'reader@example.com',
        email: 'reader@example.com',
        token: 'header.signature',
      );
      final after = Identity.fromJson(before.toJson());
      expect(after.token, before.token);
      expect(after.isAuthed, isTrue);
      // A dropped token would silently demote a signed-in reader to the sample
      // data on the next launch, which reads as the app losing their account.
      expect(after.mode, AuthMode.email);
    });

    test('two email identities keep separate watchlists', () {
      const a = Identity(mode: AuthMode.email, userId: 'a@example.com');
      const b = Identity(mode: AuthMode.email, userId: 'b@example.com');
      expect(a.storageNamespace, isNot(b.storageNamespace));
      expect(a.storageNamespace, isNot(Identity.guest.storageNamespace));
    });
  });

  group('the network source carries the session', () {
    test('a token becomes a bearer header on every document', () async {
      final sent = <RequestOptions>[];
      final dio = Dio()
        ..httpClientAdapter = _Recorder(sent, '{"ok":true}');
      final source = NetworkDocumentSource(
        config: AppConfig.fromEnvironment(),
        token: 'header.signature',
        dio: dio,
      );
      await source.fetch('companies.json');
      // Dio lower-cases header names on the way out, so the assertion must
      // not depend on the casing it was written with.
      final headers = sent.single.headers.map((k, v) => MapEntry(k.toLowerCase(), v));
      expect(headers['authorization'], 'Bearer header.signature');
      expect(source.hasSession, isTrue);
    });

    test('no token sends no header at all', () async {
      final sent = <RequestOptions>[];
      final dio = Dio()..httpClientAdapter = _Recorder(sent, '{"ok":true}');
      final source = NetworkDocumentSource(
        config: AppConfig.fromEnvironment(),
        dio: dio,
      );
      await source.fetch('companies.json');
      // Sending an empty bearer would look like a malformed session rather
      // than an absent one, and the server would answer differently.
      final headers = sent.single.headers.map((k, v) => MapEntry(k.toLowerCase(), v));
      expect(headers.containsKey('authorization'), isFalse);
      expect(source.hasSession, isFalse);
    });

    test('a refused session says so, rather than reporting a network fault', () async {
      final dio = Dio()..httpClientAdapter = _Recorder([], '', status: 401);
      final source = NetworkDocumentSource(
        config: AppConfig.fromEnvironment(),
        token: 'expired',
        dio: dio,
      );
      await expectLater(
        source.fetch('companies.json'),
        throwsA(
          isA<DocumentUnavailable>().having(
            (e) => e.toString(),
            'reason',
            contains('sign in again'),
          ),
        ),
      );
    });
  });
}

/// Answers every request with one canned body and keeps what was asked.
class _Recorder implements HttpClientAdapter {
  _Recorder(this.seen, this.body, {this.status = 200});

  final List<RequestOptions> seen;
  final String body;
  final int status;

  @override
  Future<ResponseBody> fetch(
      RequestOptions options, Stream<Uint8List>? stream, Future<void>? cancel) async {
    seen.add(options);
    return ResponseBody.fromString(body, status,
        headers: {Headers.contentTypeHeader: [Headers.jsonContentType]});
  }

  @override
  void close({bool force = false}) {}
}
