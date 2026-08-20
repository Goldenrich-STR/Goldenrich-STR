import 'package:flutter_test/flutter_test.dart';
import 'package:goldenrich_str_mobile/config.dart';

void main() {
  test('default production config uses only production API', () {
    expect(AppConfig.environment, AppEnvironment.production);
    expect(AppConfig.activeBaseUrl, 'https://api.x-space360.in');
    expect(AppConfig.isProduction, isTrue);
    expect(AppConfig.mockMode, isFalse);
    expect(AppConfig.demoMode, isFalse);
    expect(AppConfig.paymentMode, 'live');
  });

  test('api path normalization does not duplicate api prefix', () {
    expect(normalizeApiPathForTest('/auth/login'), '/api/auth/login');
    expect(normalizeApiPathForTest('/api/auth/login'), '/api/auth/login');
    expect(normalizeApiPathForTest('https://api.x-space360.in/api/auth/login'),
        'https://api.x-space360.in/api/auth/login');
  });
}
