import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AdminProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  bool _isLoading = false;
  Map<String, dynamic> _dashboardStats = {};
  List<dynamic> _usersList = [];
  int _usersTotal = 0;
  
  List<dynamic> _bookingsList = [];
  List<dynamic> _subscriptionPlans = [];
  List<dynamic> _cmsContent = [];
  List<dynamic> _couponsList = [];
  List<dynamic> _searchLogsList = [];
  List<dynamic> _aiCallsList = [];
  List<dynamic> _aiAgentsList = [];

  bool get isLoading => _isLoading;
  Map<String, dynamic> get dashboardStats => _dashboardStats;
  List<dynamic> get usersList => _usersList;
  int get usersTotal => _usersTotal;
  
  List<dynamic> get bookingsList => _bookingsList;
  List<dynamic> get subscriptionPlans => _subscriptionPlans;
  List<dynamic> get cmsContent => _cmsContent;
  List<dynamic> get couponsList => _couponsList;
  List<dynamic> get searchLogsList => _searchLogsList;
  List<dynamic> get aiCallsList => _aiCallsList;
  List<dynamic> get aiAgentsList => _aiAgentsList;

  Future<void> getDashboardStats() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get('/admin/dashboard/stats');
      if (response.statusCode == 200) {
        _dashboardStats = response.data;
      }
    } catch (e) {
      _dashboardStats = {};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> getUsers({String? role, String? search}) async {
    _isLoading = true;
    notifyListeners();
    try {
      final Map<String, dynamic> queryParams = {
        'limit': 100,
        'skip': 0,
      };
      if (role != null && role.isNotEmpty && role.toLowerCase() != 'all') {
        queryParams['role'] = role.toLowerCase();
      }
      if (search != null && search.isNotEmpty) {
        queryParams['search'] = search;
      }

      final response = await _apiService.dio.get(
        '/admin/users',
        queryParameters: queryParams,
      );
      if (response.statusCode == 200) {
        _usersList = response.data['users'] ?? [];
        _usersTotal = response.data['total'] ?? 0;
      }
    } catch (e) {
      _usersList = [];
      _usersTotal = 0;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> toggleUserStatus(String userId, bool isActive) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.patch(
        '/admin/users/$userId/status',
        queryParameters: {'is_active': isActive},
      );
      if (response.statusCode == 200) {
        final index = _usersList.indexWhere((u) => u['user_id'] == userId);
        if (index != -1) {
          _usersList[index]['is_active'] = isActive;
        }
        notifyListeners();
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

  Future<bool> deleteUser(String userId) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.delete('/admin/users/$userId');
      if (response.statusCode == 200) {
        _usersList.removeWhere((u) => u['user_id'] == userId);
        _usersTotal--;
        notifyListeners();
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

  Future<bool> createUser(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post('/admin/users', data: data);
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateUser(String userId, Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.patch('/admin/users/$userId', data: data);
      return response.statusCode == 200;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Bookings
  Future<void> getBookings({String? statusFilter}) async {
    _isLoading = true;
    notifyListeners();
    try {
      final Map<String, dynamic> queryParams = {};
      if (statusFilter != null && statusFilter.isNotEmpty && statusFilter.toLowerCase() != 'all') {
        queryParams['status_filter'] = statusFilter.toLowerCase();
      }
      final response = await _apiService.dio.get(
        '/admin/bookings',
        queryParameters: queryParams,
      );
      if (response.statusCode == 200) {
        _bookingsList = response.data['bookings'] ?? [];
      }
    } catch (e) {
      _bookingsList = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Subscription Plans
  Future<void> getSubscriptionPlans() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get('/subscriptions/plans');
      if (response.statusCode == 200) {
        _subscriptionPlans = response.data['plans'] ?? [];
      }
    } catch (e) {
      _subscriptionPlans = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createSubscriptionPlan(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post(
        '/subscriptions/admin/plans',
        queryParameters: {
          'plan_name': data['plan_name'],
          'plan_type': data['plan_type'],
          'price_monthly': data['price_monthly'],
          'price_annual': data['price_annual'],
          'description': data['description'],
          if (data['sqft_range'] != null) 'sqft_range': data['sqft_range'],
        },
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        await getSubscriptionPlans();
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

  Future<bool> deleteSubscriptionPlan(String planId) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.delete('/subscriptions/admin/plans/$planId');
      if (response.statusCode == 200) {
        await getSubscriptionPlans();
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

  // CMS Content
  Future<void> getCMSContent() async {
    _isLoading = true;
    notifyListeners();
    try {
      print('DEBUG: Calling getCMSContent...');
      final response = await _apiService.dio.get('/cms/admin/content', queryParameters: {'page': 'landing'});
      print('DEBUG: getCMSContent status code: ${response.statusCode}');
      print('DEBUG: getCMSContent response data: ${response.data}');
      if (response.statusCode == 200) {
        _cmsContent = response.data['content'] ?? [];
        print('DEBUG: loaded ${_cmsContent.length} CMS items');
      }
    } catch (e) {
      print('DEBUG: Error in getCMSContent: $e');
      _cmsContent = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateCMSContent(String contentId, Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();
    try {
      print('DEBUG: Calling updateCMSContent for $contentId...');
      print('DEBUG: updateCMSContent payload: $data');
      final response = await _apiService.dio.patch(
        '/cms/admin/content/$contentId',
        data: {'content_data': data},
      );
      print('DEBUG: updateCMSContent status: ${response.statusCode}');
      if (response.statusCode == 200) {
        await getCMSContent();
        return true;
      }
      return false;
    } catch (e) {
      print('DEBUG: Error in updateCMSContent: $e');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Coupons
  Future<void> getCoupons() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get('/coupons/');
      if (response.statusCode == 200) {
        _couponsList = response.data['coupons'] ?? [];
      }
    } catch (e) {
      _couponsList = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createCoupon(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post('/coupons/', data: data);
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Search Logs
  Future<void> getSearchLogs() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get('/admin/search-logs');
      if (response.statusCode == 200) {
        _searchLogsList = response.data['logs'] ?? [];
      }
    } catch (e) {
      _searchLogsList = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // AI Voice Calls & Agents
  Future<void> getAICalls() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get('/ai-calls/all-calls');
      if (response.statusCode == 200) {
        _aiCallsList = response.data['calls'] ?? [];
      }
    } catch (e) {
      _aiCallsList = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> getAIAgents() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get('/ai-calls/agents');
      if (response.statusCode == 200) {
        _aiAgentsList = response.data['agents'] ?? [];
      }
    } catch (e) {
      _aiAgentsList = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createAIAgent(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post('/ai-calls/agents', data: data);
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> activateAIAgent(String agentId) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.patch('/ai-calls/agents/$agentId/active');
      return response.statusCode == 200;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> deleteAIAgent(String agentId) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.delete('/ai-calls/agents/$agentId');
      return response.statusCode == 200;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
