import 'package:flutter/material.dart';
import '../services/api_service.dart';

class VerificationProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  List<dynamic> _brokerTasks = [];
  List<dynamic> _pendingReviews = [];
  List<dynamic> _reviewHistory = [];
  List<dynamic> _awaitingFinalApprovals = [];
  Map<String, dynamic> _rmStats = {};
  List<dynamic> _brokers = [];
  List<dynamic> _propertiesNotBooked = [];
  bool _isLoading = false;

  List<dynamic> get brokerTasks => _brokerTasks;
  List<dynamic> get pendingReviews => _pendingReviews;
  List<dynamic> get reviewHistory => _reviewHistory;
  List<dynamic> get awaitingFinalApprovals => _awaitingFinalApprovals;
  Map<String, dynamic> get rmStats => _rmStats;
  List<dynamic> get brokers => _brokers;
  List<dynamic> get propertiesNotBooked => _propertiesNotBooked;
  bool get isLoading => _isLoading;

  // Broker: Get list of verification tasks
  Future<void> getBrokerTasks(String? statusFilter) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get(
        '/broker/verifications',
        queryParameters: statusFilter != null ? {'status_filter': statusFilter} : null,
      );
      if (response.statusCode == 200) {
        _brokerTasks = response.data;
      }
    } catch (e) {
      _brokerTasks = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Broker: Submit visit verification report
  Future<bool> submitVisit(String propertyId, Map<String, dynamic> payload) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post(
        '/broker/verifications/$propertyId/submit',
        data: payload,
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Employee (RM): List pending reviews
  Future<void> getPendingReviews() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get('/employee/verifications/pending');
      if (response.statusCode == 200) {
        _pendingReviews = response.data['verifications'] ?? [];
      }
    } catch (e) {
      _pendingReviews = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Employee (RM): List review history
  Future<void> getReviewHistory() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get('/employee/verifications/history');
      if (response.statusCode == 200) {
        _reviewHistory = response.data['verifications'] ?? [];
      }
    } catch (e) {
      _reviewHistory = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Employee (RM): Approve verification
  Future<bool> employeeApprove(String verificationId, String remarks) async {
    _isLoading = true;
    notifyListeners();
    try {
      debugPrint('Approving verification: $verificationId with remarks: $remarks');
      final response = await _apiService.dio.post(
        '/employee/verifications/$verificationId/approve',
        data: {'remarks': remarks},
      );
      debugPrint('Approve response: ${response.statusCode} - ${response.data}');
      if (response.statusCode == 200) {
        await getPendingReviews();
        await getReviewHistory();
        await getRMStats();
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Error approving verification: $e');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Employee (RM): Reject verification
  Future<bool> employeeReject(String verificationId, String reason) async {
    _isLoading = true;
    notifyListeners();
    try {
      debugPrint('Rejecting verification: $verificationId with reason: $reason');
      final response = await _apiService.dio.post(
        '/employee/verifications/$verificationId/reject',
        data: {'reason': reason},
      );
      debugPrint('Reject response: ${response.statusCode} - ${response.data}');
      if (response.statusCode == 200) {
        await getPendingReviews();
        await getReviewHistory();
        await getRMStats();
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Error rejecting verification: $e');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Employee (RM): Get Dashboard Statistics
  Future<void> getRMStats() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get('/employee/dashboard/stats');
      if (response.statusCode == 200) {
        _rmStats = response.data ?? {};
      }
    } catch (e) {
      _rmStats = {};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Employee (RM): Get Brokers List
  Future<void> getBrokers() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get('/employee/brokers');
      if (response.statusCode == 200) {
        _brokers = response.data['brokers'] ?? [];
      }
    } catch (e) {
      _brokers = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Employee (RM): Get Properties Not Booked Report
  Future<void> getPropertiesNotBookedReport() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get('/employee/reports/properties-not-booked');
      if (response.statusCode == 200) {
        _propertiesNotBooked = response.data['properties'] ?? [];
      }
    } catch (e) {
      _propertiesNotBooked = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Admin: List properties with different moderation filters
  Future<void> getAwaitingFinalApprovals({String filter = 'awaiting_approval'}) async {
    _isLoading = true;
    notifyListeners();
    try {
      String endpoint = '/admin/properties/awaiting-final-approval';
      if (filter == 'pending_verification') {
        endpoint = '/admin/properties/pending-verification';
      } else if (filter == 'all') {
        endpoint = '/admin/properties';
      }

      final response = await _apiService.dio.get(endpoint);
      if (response.statusCode == 200) {
        final data = response.data;
        if (data is List) {
          _awaitingFinalApprovals = data;
        } else if (data is Map) {
          _awaitingFinalApprovals = data['properties'] ?? [];
        } else {
          _awaitingFinalApprovals = [];
        }
      }
    } catch (e) {
      _awaitingFinalApprovals = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Admin: Approve property verification
  Future<bool> adminApprove(String propertyId, Map<String, dynamic> payload) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post(
        '/admin/properties/$propertyId/approve',
        data: payload,
      );
      if (response.statusCode == 200) {
        await getAwaitingFinalApprovals();
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

  // Admin: Reject property verification
  Future<bool> adminReject(String propertyId, String reason) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post(
        '/admin/properties/$propertyId/reject',
        data: {'reason': reason},
      );
      if (response.statusCode == 200) {
        await getAwaitingFinalApprovals();
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
}
