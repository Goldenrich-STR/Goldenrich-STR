import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  UserModel? _currentUser;
  String? _token;
  bool _isLoading = false;

  UserModel? get currentUser => _currentUser;
  String? get token => _token;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _token != null;
  bool get isPromoClaimed => _currentUser?.isPromoClaimed ?? false;

  String? _demoOtp;
  String? get demoOtp => _demoOtp;

  Future<void> loadSession() async {
    _isLoading = true;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      _token = prefs.getString('propnest_token');
      final userStr = prefs.getString('propnest_user');
      
      if (_token != null && userStr != null) {
        _currentUser = UserModel.fromJson(json.decode(userStr));
      }
    } catch (e) {
      // Clear session on error
      logout();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> sendOTP(String phone, {String purpose = 'registration'}) async {
    _isLoading = true;
    _demoOtp = null;
    notifyListeners();
    try {
      final response = await _apiService.dio.post('/api/auth/send-otp', data: {
        'phone': phone,
        'purpose': purpose,
      });
      if (response.statusCode == 200) {
        if (response.data != null && response.data['otp'] != null) {
          _demoOtp = response.data['otp'].toString();
        }
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> verifyOTP(String phone, String otp, {String purpose = 'registration'}) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post('/api/auth/verify-otp', data: {
        'phone': phone,
        'otp': otp,
        'purpose': purpose,
      });
      return response.statusCode == 200;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> register(Map<String, dynamic> userData) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post('/api/auth/register', data: userData);
      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        _token = data['access_token'];
        _currentUser = UserModel.fromJson(data['user']);
        
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('propnest_token', _token!);
        await prefs.setString('propnest_user', json.encode(_currentUser!.toJson()));
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post('/api/auth/login', data: {
        'email': email,
        'password': password,
      });
      
      if (response.statusCode == 200) {
        final data = response.data;
        _token = data['access_token'];
        _currentUser = UserModel.fromJson(data['user']);
        
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('propnest_token', _token!);
        await prefs.setString('propnest_user', json.encode(_currentUser!.toJson()));
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshProfile() async {
    if (_token == null) return;
    try {
      final response = await _apiService.dio.get('/api/auth/me');
      if (response.statusCode == 200) {
        _currentUser = UserModel.fromJson(response.data);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('propnest_user', json.encode(_currentUser!.toJson()));
        notifyListeners();
      }
    } catch (e) {
      // ignore
    }
  }

  Future<bool> submitHostVerification(Map<String, dynamic> payload) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post('/api/host/submit-verification', data: payload);
      if (response.statusCode == 200) {
        await refreshProfile();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> claimPromo() async {
    if (_token == null) return false;
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post('/api/auth/claim-promo');
      if (response.statusCode == 200) {
        await refreshProfile();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    _token = null;
    _currentUser = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('propnest_token');
    await prefs.remove('propnest_user');
    notifyListeners();
  }
}
