import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AccountProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  Map<String, dynamic> _overviewData = {};
  List<dynamic> _transactions = [];
  List<dynamic> _payouts = [];
  final List<dynamic> _refunds = [];
  bool _isLoading = false;

  Map<String, dynamic> get overviewData => _overviewData;
  List<dynamic> get transactions => _transactions;
  List<dynamic> get payouts => _payouts;
  List<dynamic> get refunds => _refunds;
  bool get isLoading => _isLoading;

  Future<void> getOverview() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get('/admin/account/overview');
      if (response.statusCode == 200) {
        _overviewData = response.data;
      }
    } catch (e) {
      _overviewData = {};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> getTransactions(Map<String, dynamic> params) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get('/admin/account/transactions', queryParameters: params);
      if (response.statusCode == 200) {
        _transactions = response.data['results'] ?? response.data;
      }
    } catch (e) {
      _transactions = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> getPayouts(Map<String, dynamic> params) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get('/admin/account/payouts', queryParameters: params);
      if (response.statusCode == 200) {
        _payouts = response.data['results'] ?? response.data;
      }
    } catch (e) {
      _payouts = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> processPayout(String payoutId) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post('/admin/account/payouts/$payoutId/process');
      if (response.statusCode == 200) {
        await getPayouts({});
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

  Future<bool> initiateRefund(String bookingId, double amount, String reason) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post(
        '/admin/account/refunds/$bookingId',
        data: {'amount': amount, 'reason': reason},
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Map<String, dynamic> _payoutPreference = {};
  Map<String, dynamic> get payoutPreference => _payoutPreference;

  Future<void> getHostPayoutPreference() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get('/host/payout-preference');
      if (response.statusCode == 200) {
        _payoutPreference = response.data['payout_preference'] ?? {};
      }
    } catch (e) {
      _payoutPreference = {};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateHostPayoutPreference(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.put('/host/payout-preference', data: data);
      if (response.statusCode == 200) {
        _payoutPreference = response.data['payout_preference'] ?? {};
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

  Future<void> getHostPayouts() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get('/host/payouts');
      if (response.statusCode == 200) {
        _payouts = response.data['payouts'] ?? [];
      }
    } catch (e) {
      _payouts = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
