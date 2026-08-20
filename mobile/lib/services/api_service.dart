import 'package:dio/dio.dart';

import '../config.dart';
import 'session_storage.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio dio;
  late final String _baseUrl;

  ApiService._internal() {
    AppConfig.validateOrThrow();
    _baseUrl = AppConfig.activeBaseUrl;
    dio = Dio(
      BaseOptions(
        baseUrl: _baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await SessionStorage.readToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }

          options.path = _normalizeApiPath(options.path);
          return handler.next(options);
        },
        onError: (DioException e, handler) async {
          if (e.response?.statusCode == 401) {
            await SessionStorage.clearSession();
          }
          return handler.next(e);
        },
      ),
    );
  }

  Future<void> init() async {
    AppConfig.validateOrThrow();
    dio.options.baseUrl = _baseUrl;
  }

  String get baseUrl => _baseUrl;

  String _normalizeApiPath(String path) {
    if (path.startsWith('/') && !path.startsWith('/api/')) {
      return '/api$path';
    }
    return path;
  }
}
