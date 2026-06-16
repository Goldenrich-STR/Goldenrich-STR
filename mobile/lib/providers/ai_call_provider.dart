import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AICallProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  List<dynamic> _myCalls = [];
  bool _isLoading = false;

  List<dynamic> get myCalls => _myCalls;
  bool get isLoading => _isLoading;

  Future<void> getMyCalls() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get('/ai-calls/my-calls');
      if (response.statusCode == 200) {
        _myCalls = response.data['calls'] ?? response.data;
      }
    } catch (e) {
      _myCalls = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
