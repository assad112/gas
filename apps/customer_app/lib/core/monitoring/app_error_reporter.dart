import 'dart:async';
import 'dart:collection';

import 'package:customer_app/core/network/backend_endpoints.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class CustomerAppIdentity {
  CustomerAppIdentity._();

  static const appSource = 'customer_app';
  static const appVersion = '1.0.0';

  static String get platform {
    if (kIsWeb) {
      return 'web';
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return 'android';
      case TargetPlatform.iOS:
        return 'ios';
      case TargetPlatform.macOS:
        return 'macos';
      case TargetPlatform.windows:
        return 'windows';
      case TargetPlatform.linux:
        return 'linux';
      case TargetPlatform.fuchsia:
        return 'fuchsia';
    }
  }
}

class AppErrorReporter {
  AppErrorReporter._();

  static final AppErrorReporter instance = AppErrorReporter._();

  final Queue<Map<String, dynamic>> _pendingReports = Queue<Map<String, dynamic>>();
  bool _isFlushing = false;

  Map<String, String> buildHeaders({String channel = 'api'}) {
    return {
      'X-Client-App': CustomerAppIdentity.appSource,
      'X-Client-Version': CustomerAppIdentity.appVersion,
      'X-Client-Platform': CustomerAppIdentity.platform,
      'X-Client-Channel': channel,
    };
  }

  Future<void> flushPendingReports() async {
    if (_isFlushing || _pendingReports.isEmpty) {
      return;
    }

    _isFlushing = true;

    try {
      final pendingSnapshot = List<Map<String, dynamic>>.from(_pendingReports);
      _pendingReports.clear();

      for (final payload in pendingSnapshot) {
        final didSend = await _postToBackend(payload);
        if (!didSend) {
          _pendingReports.add(payload);
        }
      }
    } finally {
      _isFlushing = false;
    }
  }

  Future<void> captureApiFailure(
    DioException error, {
    String? operation,
  }) async {
    final response = error.response;
    final statusCode = response?.statusCode;
    final requestOptions = error.requestOptions;

    await _report(
      {
        'level': statusCode != null && statusCode < 500 ? 'warn' : 'error',
        'source': 'client',
        'clientChannel': 'api',
        'errorName': 'CustomerApiError',
        'message': _resolveDioMessage(error),
        'statusCode': statusCode,
        'method': requestOptions.method,
        'path': _buildRequestPath(requestOptions),
        'requestId': requestOptions.headers['x-request-id']?.toString(),
        'metadata': {
          'operation': operation,
          'dioType': error.type.name,
          'baseUrl': requestOptions.baseUrl,
          'queryParameters': requestOptions.queryParameters,
          'didConnectionFailover':
              requestOptions.extra['didConnectionFailover'] == true,
          'responseBody': response?.data,
        },
      },
    );
  }

  Future<void> captureSocketFailure(
    Object error, {
    StackTrace? stackTrace,
    String? endpoint,
    Map<String, dynamic>? metadata,
  }) async {
    await _report(
      {
        'level': 'error',
        'source': 'socket',
        'clientChannel': 'socket',
        'errorName': 'CustomerSocketError',
        'message': error.toString(),
        'path': endpoint,
        'stackTrace': stackTrace?.toString(),
        'metadata': metadata,
      },
    );
  }

  Future<void> captureRuntimeFailure(
    Object error,
    StackTrace stackTrace, {
    String channel = 'runtime',
    String? path,
    Map<String, dynamic>? metadata,
  }) async {
    await _report(
      {
        'level': 'error',
        'source': 'client',
        'clientChannel': channel,
        'errorName': error.runtimeType.toString(),
        'message': error.toString(),
        'path': path,
        'stackTrace': stackTrace.toString(),
        'metadata': metadata,
      },
    );
  }

  Future<void> _report(Map<String, dynamic> payload) async {
    final normalizedPayload = <String, dynamic>{
      'appSource': CustomerAppIdentity.appSource,
      'clientPlatform': CustomerAppIdentity.platform,
      'clientVersion': CustomerAppIdentity.appVersion,
      ...payload,
      'metadata': {
        'capturedAt': DateTime.now().toUtc().toIso8601String(),
        ...(payload['metadata'] is Map<String, dynamic>
            ? payload['metadata'] as Map<String, dynamic>
            : <String, dynamic>{}),
      },
    };

    final didSend = await _postToBackend(normalizedPayload);
    if (!didSend) {
      _pendingReports.add(normalizedPayload);
    }
  }

  Future<bool> _postToBackend(Map<String, dynamic> payload) async {
    for (final baseUrl in apiCandidateBaseUrls) {
      try {
        final client = Dio(
          BaseOptions(
            baseUrl: baseUrl,
            connectTimeout: const Duration(seconds: 4),
            receiveTimeout: const Duration(seconds: 6),
            sendTimeout: const Duration(seconds: 6),
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              ...buildHeaders(
                channel: (payload['clientChannel'] ?? 'runtime').toString(),
              ),
            },
          ),
        );

        final response = await client.post('/errors/client-report', data: payload);
        if ((response.statusCode ?? 500) < 400) {
          return true;
        }
      } on DioException catch (_) {
        // Try the next candidate base URL.
      }
    }

    return false;
  }

  String _resolveDioMessage(DioException error) {
    final responseBody = error.response?.data;

    if (responseBody is Map && responseBody['message'] != null) {
      final serverMessage = responseBody['message'].toString().trim();
      if (serverMessage.isNotEmpty) {
        return serverMessage;
      }
    }

    final message = error.message?.trim();
    if (message != null && message.isNotEmpty) {
      return message;
    }

    return 'Customer app request failed.';
  }

  String _buildRequestPath(RequestOptions options) {
    final path = options.path.trim();
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    final baseUrl = normalizeBaseUrl(options.baseUrl);
    if (baseUrl.isEmpty) {
      return path;
    }

    if (path.startsWith('/')) {
      return '$baseUrl$path';
    }

    return '$baseUrl/$path';
  }
}
