import 'package:dio/dio.dart';
import 'package:driver_app/config/environment.dart';
import 'package:driver_app/core/network/api_exception.dart';
import 'package:driver_app/core/storage/session_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final apiClientProvider = Provider<Dio>((ref) {
  final sessionStorage = ref.watch(sessionStorageProvider);

  final dio = Dio(
    BaseOptions(
      baseUrl: Environment.apiBaseUrl,
      connectTimeout: const Duration(seconds: 12),
      receiveTimeout: const Duration(seconds: 12),
      sendTimeout: const Duration(seconds: 12),
      headers: const {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await sessionStorage.readToken();

        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }

        handler.next(options);
      },
      onError: (error, handler) {
        final response = error.response;
        final payload = response?.data;
        final message = payload is Map<String, dynamic>
            ? (payload['message'] ?? error.message ?? 'Request failed').toString()
            : (error.message ?? 'Request failed');

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
