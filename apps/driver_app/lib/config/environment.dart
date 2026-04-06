import 'package:flutter/foundation.dart';

class Environment {
  Environment._();

  static const _localLanHost = '192.168.0.90';

  static const _apiBaseUrlOverride = String.fromEnvironment(
    'DRIVER_API_BASE_URL',
  );

  static const _socketBaseUrlOverride = String.fromEnvironment(
    'DRIVER_SOCKET_BASE_URL',
  );

  static final apiBaseUrl = _apiBaseUrlOverride.isNotEmpty
      ? _apiBaseUrlOverride
      : _defaultApiBaseUrl();

  static final socketBaseUrl = _socketBaseUrlOverride.isNotEmpty
      ? _socketBaseUrlOverride
      : _defaultSocketBaseUrl();

  static const appName = 'Oman Gas Driver';
  static const appVersion = '1.0.0';

  static String _defaultApiBaseUrl() {
    if (kIsWeb) {
      return 'http://localhost:3000/api';
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        // Real devices cannot reach 10.0.2.2; use the current machine LAN IP.
        return 'http://$_localLanHost:3000/api';
      case TargetPlatform.iOS:
      case TargetPlatform.macOS:
        return 'http://127.0.0.1:3000/api';
      case TargetPlatform.windows:
      case TargetPlatform.linux:
        return 'http://localhost:3000/api';
      case TargetPlatform.fuchsia:
        return 'http://localhost:3000/api';
    }
  }

  static String _defaultSocketBaseUrl() {
    if (kIsWeb) {
      return 'http://localhost:3000';
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return 'http://$_localLanHost:3000';
      case TargetPlatform.iOS:
      case TargetPlatform.macOS:
        return 'http://127.0.0.1:3000';
      case TargetPlatform.windows:
      case TargetPlatform.linux:
        return 'http://localhost:3000';
      case TargetPlatform.fuchsia:
        return 'http://localhost:3000';
    }
  }
}
