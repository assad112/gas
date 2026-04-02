class Environment {
  Environment._();

  static const apiBaseUrl = String.fromEnvironment(
    'DRIVER_API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000/api',
  );

  static const socketBaseUrl = String.fromEnvironment(
    'DRIVER_SOCKET_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000',
  );

  static const appName = 'Oman Gas Driver';
  static const appVersion = '1.0.0';

  // TODO(driver-app): Replace with the production Maps key before release.
  static const mapsApiKey = String.fromEnvironment(
    'DRIVER_GOOGLE_MAPS_API_KEY',
    defaultValue: '',
  );
}
