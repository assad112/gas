import 'dart:async';

import 'package:dio/dio.dart';
import 'package:driver_app/config/environment.dart';
import 'package:driver_app/core/monitoring/app_error_reporter.dart';
import 'package:driver_app/core/network/api_exception.dart';
import 'package:driver_app/core/storage/session_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final apiClientProvider = Provider<Dio>((ref) {
  final sessionStorage = ref.watch(sessionStorageProvider);

  final dio = Dio(
    BaseOptions(
      baseUrl: Environment.apiBaseUrl,
      connectTimeout: const Duration(seconds: 25),
      receiveTimeout: const Duration(seconds: 25),
      sendTimeout: const Duration(seconds: 25),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...AppErrorReporter.instance.buildHeaders(channel: 'api'),
      },
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await sessionStorage.readToken();

        options.headers.addAll(
          AppErrorReporter.instance.buildHeaders(channel: 'api'),
        );

        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }

        handler.next(options);
      },
      onResponse: (response, handler) {
        unawaited(AppErrorReporter.instance.flushPendingReports());
        handler.next(response);
      },
      onError: (error, handler) {
        unawaited(AppErrorReporter.instance.captureApiFailure(error));
        final response = error.response;
        final payload = response?.data;
        final fallbackMessage = error.type == DioExceptionType.connectionTimeout
            ? 'Connection timed out while reaching ${Environment.apiBaseUrl}.'
            : 'Request failed';
        final message = payload is Map<String, dynamic>
            ? (payload['message'] ?? error.message ?? fallbackMessage)
                  .toString()
            : (error.message ?? fallbackMessage);

        handler.reject(
          DioException(
            requestOptions: error.requestOptions,
            response: error.response,
            type: error.type,
            error: ApiException(message, statusCode: response?.statusCode),
          ),
        );
      },
    ),
  );

  return dio;
});
