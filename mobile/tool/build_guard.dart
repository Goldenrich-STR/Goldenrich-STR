import 'dart:io';

const productionHost = 'api.x-space360.in';
const productionUrl = 'https://api.x-space360.in';
const blockedHosts = {
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '10.0.2.2',
};

void main(List<String> args) {
  final env = _arg(args, 'APP_ENV') ?? Platform.environment['APP_ENV'];
  final api =
      _arg(args, 'API_BASE_URL') ?? Platform.environment['API_BASE_URL'];
  final payment = _arg(args, 'PAYMENT_MODE') ??
      Platform.environment['PAYMENT_MODE'] ??
      'live';
  final mock =
      _arg(args, 'MOCK_MODE') ?? Platform.environment['MOCK_MODE'] ?? 'false';
  final demo =
      _arg(args, 'DEMO_MODE') ?? Platform.environment['DEMO_MODE'] ?? 'false';

  if (env == null || env.isEmpty) {
    _fail('APP_ENV is required.');
  }

  if (env == 'production' || env == 'prod') {
    if (api != null && api.isNotEmpty && api != productionUrl) {
      _fail('Production API_BASE_URL must be $productionUrl.');
    }
    final uri = Uri.parse(api?.isNotEmpty == true ? api! : productionUrl);
    if (uri.scheme != 'https' || uri.host != productionHost) {
      _fail('Production API must use HTTPS $productionHost.');
    }
    if (payment != 'live') {
      _fail('Production PAYMENT_MODE must be live.');
    }
    if (mock == 'true' || demo == 'true') {
      _fail('Production MOCK_MODE/DEMO_MODE must be false.');
    }
  } else {
    if (api == null || api.isEmpty) {
      _fail('API_BASE_URL is required for $env builds.');
    }
    final uri = Uri.parse(api);
    if (!uri.hasScheme || uri.host.isEmpty) {
      _fail('API_BASE_URL must be an absolute URL.');
    }
  }

  if (api != null && api.isNotEmpty) {
    final uri = Uri.parse(api);
    if ((env == 'production' || env == 'prod') &&
        blockedHosts.contains(uri.host)) {
      _fail('Production build cannot target local host ${uri.host}.');
    }
  }

  stdout.writeln('Build guard passed for APP_ENV=$env');
}

String? _arg(List<String> args, String key) {
  final prefix = '--$key=';
  for (final arg in args) {
    if (arg.startsWith(prefix)) {
      return arg.substring(prefix.length);
    }
  }
  return null;
}

Never _fail(String message) {
  stderr.writeln('BUILD GUARD FAILED: $message');
  exit(2);
}
