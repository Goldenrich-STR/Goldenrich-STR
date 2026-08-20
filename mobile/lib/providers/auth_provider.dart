import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../services/session_storage.dart';

class AuthProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  UserModel? _currentUser;
  String? _token;
  bool _isLoading = false;
  String? _lastError;
  String? _lastDemoOtp;

  UserModel? get currentUser => _currentUser;
  String? get token => _token;
  bool get isLoading => _isLoading;
  String? get lastError => _lastError;
  bool get isAuthenticated => _token != null;
  bool get isPromoClaimed => _currentUser?.isPromoClaimed ?? false;
  String? get lastDemoOtp => _lastDemoOtp;

  Future<void> loadSession() async {
    _isLoading = true;
    notifyListeners();

    try {
      _token = await SessionStorage.readToken();
      final userStr = await SessionStorage.readUser();

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
    _lastError = null;
    _lastDemoOtp = null;
    notifyListeners();
    try {
      final response = await _apiService.dio.post('/api/auth/send-otp', data: {
        'phone': phone,
        'purpose': purpose,
      });
      if (response.statusCode == 200) {
        final data = response.data;
        if (data is Map && data['demo_mode'] == true && data['otp'] != null) {
          _lastDemoOtp = data['otp'].toString();
        }
        return true;
      }
      _lastError = 'Failed to send OTP.';
      return false;
    } on DioException catch (e) {
      final data = e.response?.data;
      if (data is Map && data['detail'] != null) {
        _lastError = data['detail'].toString();
      } else {
        _lastError = e.message ?? 'Failed to send OTP.';
      }
      return false;
    } catch (e) {
      _lastError = 'Failed to send OTP.';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> verifyOTP(String phone, String otp,
      {String purpose = 'registration'}) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response =
          await _apiService.dio.post('/api/auth/verify-otp', data: {
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
    _lastError = null;
    notifyListeners();
    try {
      final response =
          await _apiService.dio.post('/api/auth/register', data: userData);
      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        _token = data['access_token'];
        _currentUser = UserModel.fromJson(data['user']);
        await SessionStorage.writeToken(_token!);
        await SessionStorage.writeUser(json.encode(_currentUser!.toJson()));
        return true;
      }
      _lastError = 'Registration failed.';
      return false;
    } on DioException catch (e) {
      final data = e.response?.data;
      if (data is Map && data['detail'] != null) {
        _lastError = data['detail'].toString();
      } else {
        _lastError = e.message ?? 'Registration failed.';
      }
      return false;
    } catch (e) {
      _lastError = 'Registration failed.';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _lastError = null;
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
        await SessionStorage.writeToken(_token!);
        await SessionStorage.writeUser(json.encode(_currentUser!.toJson()));
        return true;
      }
      _lastError = 'Unable to sign in. Please try again.';
      return false;
    } on DioException catch (e) {
      final data = e.response?.data;
      if (data is Map && data['detail'] != null) {
        _lastError = data['detail'].toString();
      } else {
        _lastError = e.message ?? 'Unable to sign in. Please try again.';
      }
      return false;
    } catch (e) {
      _lastError = 'Unable to sign in. Please try again.';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<String?> forgotPassword(String email) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post(
        '/auth/forgot-password',
        data: {'email': email},
      );
      if (response.statusCode == 200) {
        return response.data['detail']?.toString() ??
            'If this email is registered, a reset link has been sent.';
      }
      return null;
    } on DioException catch (e) {
      final data = e.response?.data;
      if (data is Map && data['detail'] != null) {
        _lastError = data['detail'].toString();
      } else {
        _lastError = e.message ?? 'Unable to send reset link.';
      }
      return null;
    } catch (e) {
      _lastError = 'Unable to send reset link.';
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<String?> resetPassword(String token, String password) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post(
        '/auth/reset-password',
        data: {
          'token': token,
          'password': password,
        },
      );
      if (response.statusCode == 200) {
        return response.data['login_path']?.toString();
      }
      return null;
    } on DioException catch (e) {
      final data = e.response?.data;
      if (data is Map && data['detail'] != null) {
        _lastError = data['detail'].toString();
      } else {
        _lastError = e.message ?? 'Unable to reset password.';
      }
      return null;
    } catch (e) {
      _lastError = 'Unable to reset password.';
      return null;
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
        await SessionStorage.writeUser(json.encode(_currentUser!.toJson()));
        notifyListeners();
      }
    } catch (e) {
      // ignore
    }
  }

  Future<bool> submitHostVerification(Map<String, dynamic> payload) async {
    _isLoading = true;
    _lastError = null;
    notifyListeners();
    try {
      final response = await _apiService.dio
          .post('/api/host/submit-verification', data: payload);
      if (response.statusCode == 200) {
        await refreshProfile();
        return true;
      }
      _lastError = 'Unexpected response: ${response.statusCode}';
      return false;
    } on DioException catch (e) {
      final data = e.response?.data;
      if (data is Map && data['detail'] != null) {
        _lastError = data['detail'].toString();
      } else {
        _lastError = e.message ?? 'Network request failed';
      }
      return false;
    } catch (e) {
      _lastError = e.toString();
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

  Future<bool> deleteAccount() async {
    if (_token == null) return false;
    _isLoading = true;
    _lastError = null;
    notifyListeners();
    try {
      final response = await _apiService.dio.post('/api/auth/delete-account');
      if (response.statusCode == 200) {
        await logout();
        return true;
      }
      _lastError = 'Unable to delete account.';
      return false;
    } on DioException catch (e) {
      final data = e.response?.data;
      if (data is Map && data['detail'] != null) {
        _lastError = data['detail'].toString();
      } else {
        _lastError = e.message ?? 'Unable to delete account.';
      }
      return false;
    } catch (e) {
      _lastError = 'Unable to delete account.';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> deactivateAccount() => deleteAccount();

  Future<void> logout() async {
    _token = null;
    _currentUser = null;
    await SessionStorage.clearSession();
    notifyListeners();
  }
}
