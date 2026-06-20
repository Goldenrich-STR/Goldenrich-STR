import 'package:flutter/foundation.dart';
import 'dart:io' show Platform;

class AppConfig {
  /// Base API URL.
  /// Automatically resolved based on platform:
  /// - 'http://10.0.2.2:8001' for Android Emulator.
  /// - 'http://localhost:8001' for Windows, Web, and iOS.
  static String get devBaseUrl {
    if (kIsWeb) {
      return 'http://localhost:8001';
    }
    try {
      if (Platform.isAndroid) {
        return 'http://10.0.2.2:8001';
      }
    } catch (_) {}
    return 'http://localhost:8001';
  }

  static const String prodBaseUrl = 'https://api.goldenrichstr.com';

  /// Whether to use production backend configuration.
  static const bool isProduction = false;

  /// Default currency symbol for pricing views.
  static const String currencySymbol = '₹';

  /// Default support context email.
  static const String supportEmail = 'support@goldenrichstr.com';

  /// Returns active base URL based on config state.
  static String get activeBaseUrl => isProduction ? prodBaseUrl : devBaseUrl;
}
