import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';
import 'session_storage.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late Dio dio;
  String _baseUrl = AppConfig.activeBaseUrl;

  ApiService._internal() {
    dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    // Request interceptor to add Authorization token
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await SessionStorage.readToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }

        // Ensure path starts with /api if not already there
        if (options.path.startsWith('/') && !options.path.startsWith('/api/')) {
          options.path = '/api${options.path}';
        }

        return handler.next(options);
      },
      onResponse: (response, handler) {
        return handler.next(response);
      },
      onError: (DioException e, handler) async {
        if (e.response?.statusCode == 401) {
          await SessionStorage.clearSession();
        }
        return handler.next(e);
      },
    ));
  }

  Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (AppConfig.isProduction ||
          AppConfig.prodBaseUrl == AppConfig.activeBaseUrl) {
        await prefs.remove('custom_api_base_url');
        _baseUrl = AppConfig.prodBaseUrl;
        dio.options.baseUrl = _baseUrl;
        return;
      }

      final customUrl = prefs.getString('custom_api_base_url');
      if (customUrl != null && customUrl.isNotEmpty) {
        if (customUrl.contains('uat.x-space360.in') ||
            customUrl.contains('x-space360.in/api') ||
            customUrl.contains('localhost') ||
            customUrl.contains('10.0.2.2')) {
          await prefs.remove('custom_api_base_url');
          return;
        }
        _baseUrl = customUrl;
        dio.options.baseUrl = _baseUrl;
      }
    } catch (_) {}
  }

  Future<void> setBaseUrl(String url) async {
    if (AppConfig.isProduction) {
      _baseUrl = AppConfig.prodBaseUrl;
      dio.options.baseUrl = _baseUrl;
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.remove('custom_api_base_url');
      } catch (_) {}
      return;
    }

    _baseUrl = url.trim().replaceAll(RegExp(r'/$'), '');
    dio.options.baseUrl = _baseUrl;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('custom_api_base_url', _baseUrl);
    } catch (_) {}
  }

  String get baseUrl => _baseUrl;
}
