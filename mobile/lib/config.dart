import 'package:flutter/foundation.dart';

enum AppEnvironment {
  dev,
  uat,
  production;

  static AppEnvironment fromValue(String value) {
    switch (value.trim().toLowerCase()) {
      case 'dev':
      case 'development':
        return AppEnvironment.dev;
      case 'uat':
        return AppEnvironment.uat;
      case 'prod':
      case 'production':
        return AppEnvironment.production;
      default:
        throw StateError('Unknown APP_ENV value.');
    }
  }
}

class AppConfig {
  static const String websiteUrl = 'https://x-space360.in';
  static const String publicUrl = 'https://www.x-space360.in';
  static const String productionApiBaseUrl = 'https://api.x-space360.in';
  static const String currencyCode = 'INR';
  static const String _definedAppEnv =
      String.fromEnvironment('APP_ENV', defaultValue: 'production');
  static const String _definedApiBaseUrl =
      String.fromEnvironment('API_BASE_URL');
  static const String _definedWebBaseUrl =
      String.fromEnvironment('WEB_BASE_URL');
  static const String _definedPaymentMode =
      String.fromEnvironment('PAYMENT_MODE', defaultValue: 'live');
  static const bool mockMode =
      bool.fromEnvironment('MOCK_MODE', defaultValue: false);
  static const bool demoMode =
      bool.fromEnvironment('DEMO_MODE', defaultValue: false);
  static const bool debugFeatures =
      bool.fromEnvironment('DEBUG_FEATURES', defaultValue: false);
  static const String mapTileUrl = String.fromEnvironment(
    'MAP_TILE_URL',
    defaultValue:
        'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  );
  static const String mapAttribution = String.fromEnvironment(
    'MAP_ATTRIBUTION',
    defaultValue: '© OpenStreetMap © CARTO',
  );
  static const String mapUserAgent = String.fromEnvironment(
    'MAP_USER_AGENT',
    defaultValue: 'X-Space360 Mobile',
  );
  static const int nearbyDefaultRadiusMeters = int.fromEnvironment(
    'NEARBY_DEFAULT_RADIUS_METERS',
    defaultValue: 5000,
  );

  static AppEnvironment get environment =>
      AppEnvironment.fromValue(_definedAppEnv);

  static bool get isProduction => environment == AppEnvironment.production;

  static String get environmentLabel {
    switch (environment) {
      case AppEnvironment.dev:
        return 'DEV';
      case AppEnvironment.uat:
        return 'UAT';
      case AppEnvironment.production:
        return 'PRODUCTION';
    }
  }

  static String get webBaseUrl =>
      _definedWebBaseUrl.isNotEmpty ? _definedWebBaseUrl : publicUrl;

  static String get activeBaseUrl {
    final url = _definedApiBaseUrl.trim().replaceAll(RegExp(r'/$'), '');
    if (isProduction) {
      if (url.isNotEmpty && url != productionApiBaseUrl) {
        throw StateError('Production API must be $productionApiBaseUrl.');
      }
      return productionApiBaseUrl;
    }
    if (url.isEmpty) {
      throw StateError('API_BASE_URL is required for non-production builds.');
    }
    return url;
  }

  static String get uploadBaseUrl => '$activeBaseUrl/api/uploads/';

  static String get paymentMode => _definedPaymentMode;

  static void validateOrThrow() {
    final uri = Uri.parse(activeBaseUrl);
    if (!uri.hasScheme || uri.host.isEmpty) {
      throw StateError('API_BASE_URL must be an absolute URL.');
    }
    if (isProduction) {
      if (activeBaseUrl != productionApiBaseUrl) {
        throw StateError('Unsafe production API configuration.');
      }
      if (uri.scheme != 'https' || uri.host != 'api.x-space360.in') {
        throw StateError('Production API must use HTTPS api.x-space360.in.');
      }
      if (mockMode || demoMode || debugFeatures || paymentMode != 'live') {
        throw StateError('Production build contains unsafe feature flags.');
      }
    }
  }

  static String resolveImageUrl(String? path) {
    if (path == null || path.isEmpty) {
      return '';
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    var cleanPath = path;
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.substring(1);
    }

    final baseUrl = activeBaseUrl;
    if (cleanPath.startsWith('api/')) {
      return '$baseUrl/$cleanPath';
    }
    if (cleanPath.startsWith('uploads/')) {
      return '$baseUrl/api/$cleanPath';
    }
    return '$baseUrl/$cleanPath';
  }
}

@visibleForTesting
String normalizeApiPathForTest(String path) {
  if (path.startsWith('/') && !path.startsWith('/api/')) {
    return '/api$path';
  }
  return path;
}
