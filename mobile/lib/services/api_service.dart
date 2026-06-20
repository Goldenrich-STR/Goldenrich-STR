import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';

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
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('propnest_token');
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
          final prefs = await SharedPreferences.getInstance();
          await prefs.remove('propnest_token');
          await prefs.remove('propnest_user');
          // In a real application, you'd trigger a stream or state change to redirect the user to login.
        }
        return handler.next(e);
      },
    ));
  }

  Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final customUrl = prefs.getString('custom_api_base_url');
      if (customUrl != null && customUrl.isNotEmpty) {
        _baseUrl = customUrl;
        dio.options.baseUrl = _baseUrl;
      }
    } catch (_) {}
  }

  Future<void> setBaseUrl(String url) async {
    _baseUrl = url.trim().replaceAll(RegExp(r'/$'), '');
    dio.options.baseUrl = _baseUrl;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('custom_api_base_url', _baseUrl);
    } catch (_) {}
  }

  String get baseUrl => _baseUrl;
}
