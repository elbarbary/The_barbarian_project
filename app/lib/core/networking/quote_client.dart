import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';

import '../config/app_config.dart';
import '../models/quote_snapshot.dart';

/// Fetches the live quote snapshot.
///
/// Deliberately not a [DocumentSource]: the static API is cache-first and
/// version-gated, which is exactly right for research documents that change
/// once a day and exactly wrong for a price. This has no manifest, no cache
/// generation and no disk copy — if the request fails the app keeps showing
/// published closes, which are honest and labelled.
abstract interface class QuoteClient {
  Future<QuoteSnapshot> latest();
}

class HttpQuoteClient implements QuoteClient {
  HttpQuoteClient({Dio? dio, String? url})
    : _url = url ?? AppConfig.quotesUrl,
      _dio =
          dio ??
          Dio(
            BaseOptions(
              // Tighter than the document timeouts. A quote that takes fifteen
              // seconds to arrive is not worth having; the next poll is only
              // five minutes away and the published close is already on screen.
              connectTimeout: const Duration(seconds: 6),
              receiveTimeout: const Duration(seconds: 8),
              responseType: ResponseType.plain,
              headers: const {'Accept': 'application/json'},
            ),
          );

  final Dio _dio;
  final String _url;

  @override
  Future<QuoteSnapshot> latest() async {
    final response = await _dio.get<String>(_url);
    final body = response.data;
    if (body == null || body.isEmpty) {
      throw const FormatException('empty quote response');
    }
    final decoded = jsonDecode(body);
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('quote response was not an object');
    }
    return QuoteSnapshot.fromJson(decoded);
  }
}
