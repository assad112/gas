const _configuredApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: '',
);

const _configuredSocketBaseUrl = String.fromEnvironment(
  'SOCKET_BASE_URL',
  defaultValue: '',
);

const _configuredLanBaseUrl = String.fromEnvironment(
  'LAN_BASE_URL',
  defaultValue: 'http://192.168.0.90:3000',
);

const _adbReverseBaseUrl = 'http://127.0.0.1:3000';
const _emulatorBaseUrl = 'http://10.0.2.2:3000';

String get defaultApiBaseUrl => apiCandidateBaseUrls.first;

String get defaultSocketBaseUrl => socketCandidateBaseUrls.first;

List<String> get apiCandidateBaseUrls =>
    _buildCandidateBaseUrls(_configuredApiBaseUrl);

List<String> get socketCandidateBaseUrls =>
    _buildCandidateBaseUrls(_configuredSocketBaseUrl);

List<String> _buildCandidateBaseUrls(String preferredBaseUrl) {
  final uniqueBaseUrls = <String>[];

  for (final rawBaseUrl in [
    preferredBaseUrl,
    _adbReverseBaseUrl,
    _configuredLanBaseUrl,
    _emulatorBaseUrl,
  ]) {
    final normalizedBaseUrl = normalizeBaseUrl(rawBaseUrl);

    if (normalizedBaseUrl.isEmpty ||
        uniqueBaseUrls.contains(normalizedBaseUrl)) {
      continue;
    }

    uniqueBaseUrls.add(normalizedBaseUrl);
  }

  return uniqueBaseUrls;
}

String normalizeBaseUrl(String? value) {
  final trimmedValue = value?.trim() ?? '';
  if (trimmedValue.isEmpty) {
    return '';
  }

  return trimmedValue.endsWith('/')
      ? trimmedValue.substring(0, trimmedValue.length - 1)
      : trimmedValue;
}
