import 'dart:convert';

import 'package:dio/dio.dart';

import '../config/app_config.dart';
import 'auth_service.dart';

/// The server session the exchange data now requires.
///
/// The published JSON used to be world-readable and is not any more: every
/// document under `/data/v1/` answers 401 without a session. A reader proves
/// control of an inbox with a six-digit code and gets back a signed token,
/// which every later request carries.
///
/// The website does the same thing with an httpOnly cookie. A phone has
/// nowhere sensible to keep a cookie, so it holds the identical token and
/// sends it as a bearer — same signature, same expiry, different envelope.
///
/// There is still no account table anywhere. The token *is* the account: it
/// carries the address it was issued to and the moment it stops working.
class EsthmrSession {
  EsthmrSession({required AppConfig config, Dio? dio})
    : _base = '${config.siteBaseUrl}/esthmr/api/auth',
      _dio =
          dio ??
          Dio(
            BaseOptions(
              connectTimeout: config.connectTimeout,
              receiveTimeout: config.receiveTimeout,
              responseType: ResponseType.plain,
              headers: const {'content-type': 'application/json'},
              // A 401 or a 429 is an answer, not a transport failure; let the
              // code below read the body and say something useful.
              validateStatus: (status) => status != null && status < 500,
            ),
          );

  final String _base;
  final Dio _dio;

  /// Ask for a code. Succeeds silently whether or not the address has ever
  /// been seen before — the server deliberately gives the same answer either
  /// way, so this cannot be used to discover who has an account.
  Future<void> requestCode(String email) async {
    final response = await _post('/request', {'email': email.trim()});
    if (response.statusCode == 429) {
      throw const AuthException('Too many codes requested. Try again shortly.');
    }
    if (response.statusCode != 200) {
      throw const AuthException('Could not send the code. Try again.');
    }
  }

  /// Exchange a code for a session token. Returns the token and the address it
  /// was issued to.
  Future<({String token, String email})> verify(String email, String code) async {
    final response = await _post('/verify', {
      'email': email.trim(),
      'code': code.trim(),
    });
    if (response.statusCode == 401) {
      throw const AuthException('That code is not right.');
    }
    if (response.statusCode == 429) {
      throw const AuthException('Too many attempts. Try again shortly.');
    }
    if (response.statusCode != 200) {
      throw const AuthException('Could not sign in. Try again.');
    }
    final body = _decode(response.data);
    final token = body['token'] as String?;
    if (token == null || token.isEmpty) {
      throw const AuthException('The server did not return a session.');
    }
    return (token: token, email: body['email'] as String? ?? email.trim());
  }

  Future<Response<String>> _post(String path, Map<String, Object?> body) async {
    try {
      return await _dio.post<String>(_base + path, data: jsonEncode(body));
    } on DioException catch (e) {
      throw AuthException(switch (e.type) {
        DioExceptionType.connectionTimeout ||
        DioExceptionType.receiveTimeout => 'The server took too long to answer.',
        DioExceptionType.connectionError => 'No connection.',
        _ => 'Could not reach the server.',
      });
    }
  }

  Map<String, dynamic> _decode(String? body) {
    if (body == null || body.isEmpty) return const {};
    try {
      final value = jsonDecode(body);
      return value is Map<String, dynamic> ? value : const {};
    } on FormatException {
      return const {};
    }
  }
}
