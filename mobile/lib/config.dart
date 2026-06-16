class AppConfig {
  /// Base API URL.
  /// Use 'http://10.0.2.2:8001' for Android Emulator.
  /// Use 'http://localhost:8001' for iOS Simulator.
  static const String devBaseUrl = 'http://10.0.2.2:8001';
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
