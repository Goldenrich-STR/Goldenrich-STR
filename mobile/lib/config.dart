import 'package:flutter/foundation.dart';
import 'dart:io' show Platform;

class AppConfig {
  static String get webBaseUrl {
    if (kIsWeb) {
      return 'http://localhost:3000';
    }
    try {
      if (Platform.isAndroid) {
        // Android emulator uses adb reverse from mobile_run.ps1 so localhost
        // stays aligned with the browser/frontend dev setup.
        return 'http://localhost:3000';
      }
    } catch (_) {}
    return 'http://localhost:3000';
  }

  /// Base API URL.
  /// Automatically resolved based on platform:
  /// - 'http://localhost:8001' for Android Emulator via adb reverse.
  /// - 'http://localhost:8001' for Windows, Web, and iOS.
  static String get devBaseUrl {
    if (kIsWeb) {
      return 'http://localhost:8001';
    }
    try {
      if (Platform.isAndroid) {
        return 'http://localhost:8001';
      }
    } catch (_) {}
    return 'http://localhost:8001';
  }

  static const String prodBaseUrl = 'https://uat.x-space360.in';

  /// Whether to use production backend configuration.
  /// Keep this false for local development so the mobile app and website use
  /// the same localhost backend/database.
  static const bool isProduction = false;

  /// Default currency symbol for pricing views.
  static const String currencySymbol = '₹';

  /// Default support context email.
  static const String supportEmail = 'support@goldenrichstr.com';

  /// Returns active base URL based on config state.
  static String get activeBaseUrl => isProduction ? prodBaseUrl : devBaseUrl;

  /// Resolves an image path/URL to an absolute URL suitable for the current platform.
  static String resolveImageUrl(String? path) {
    if (path == null || path.isEmpty) {
      return 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85';
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
      try {
        final uri = Uri.parse(path);
        if (uri.host == 'localhost' ||
            uri.host == '127.0.0.1' ||
            uri.host == '0.0.0.0') {
          final activeUri = Uri.parse(activeBaseUrl);
          final newUri = uri.replace(
            host: activeUri.host,
            port: activeUri.port == 80 || activeUri.port == 443
                ? null
                : activeUri.port,
            scheme: activeUri.scheme,
          );
          return newUri.toString();
        }
      } catch (_) {}
      return path;
    }

    final baseUrl = activeBaseUrl;
    var cleanPath = path;
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.substring(1);
    }

    if (cleanPath.startsWith('api/')) {
      return '$baseUrl/$cleanPath';
    } else if (cleanPath.startsWith('uploads/')) {
      return '$baseUrl/api/$cleanPath';
    }

    return '$baseUrl/$cleanPath';
  }
}
