import 'package:flutter/material.dart';
import '../models/property_model.dart';
import '../services/api_service.dart';

class PropertyProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  List<PropertyModel> _properties = [];
  List<PropertyModel> _hostProperties = [];
  PropertyModel? _currentProperty;
  bool _isLoading = false;

  List<PropertyModel> get properties => _properties;
  List<PropertyModel> get hostProperties => _hostProperties;
  PropertyModel? get currentProperty => _currentProperty;
  bool get isLoading => _isLoading;

  Future<void> searchProperties(Map<String, dynamic> params) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio
          .get('/properties/search', queryParameters: params);
      if (response.statusCode == 200) {
        final List<dynamic> list = response.data['properties'] ??
            response.data['results'] ??
            (response.data is List ? response.data : []);
        _properties = list.map((item) => PropertyModel.fromJson(item)).toList();
      }
    } catch (e) {
      _properties = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<PropertyModel?> getProperty(String propertyId) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get('/properties/$propertyId');
      if (response.statusCode == 200) {
        _currentProperty = PropertyModel.fromJson(response.data);
        return _currentProperty;
      }
      return null;
    } catch (e) {
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> getHostProperties() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response =
          await _apiService.dio.get('/properties/host/my-properties');
      if (response.statusCode == 200) {
        final List<dynamic> list = response.data is Map
            ? (response.data['properties'] ?? [])
            : (response.data ?? []);
        _hostProperties =
            list.map((item) => PropertyModel.fromJson(item)).toList();
      }
    } catch (e) {
      _hostProperties = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<String?> createProperty(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post('/properties/', data: data);
      if (response.statusCode == 200 || response.statusCode == 201) {
        await getHostProperties();
        return response.data['property_id'] ??
            response.data['id']?.toString() ??
            'success';
      }
      return null;
    } catch (e) {
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<String?> generateDescription(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio
          .post('/properties/generate-description', data: data);
      if (response.statusCode == 200) {
        return response.data['description'];
      }
      return null;
    } catch (e) {
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateProperty(
      String propertyId, Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response =
          await _apiService.dio.patch('/properties/$propertyId', data: data);
      if (response.statusCode == 200) {
        await getHostProperties();
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

  Future<bool> submitForVerification(String propertyId) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio
          .post('/properties/$propertyId/submit-verification');
      if (response.statusCode == 200) {
        await getHostProperties();
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

  List<Map<String, dynamic>> _blockedDates = [];
  List<Map<String, dynamic>> get blockedDates => _blockedDates;

  Future<List<Map<String, dynamic>>> getBlockedDates(String propertyId) async {
    try {
      final response = await _apiService.dio
          .get('/calendar/properties/$propertyId/blocked-dates');
      if (response.statusCode == 200) {
        final List<dynamic> list = response.data['blocked_dates'] ?? [];
        _blockedDates = List<Map<String, dynamic>>.from(list);
        notifyListeners();
        return _blockedDates;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Map<String, dynamic>? _currentPropertyReviewsSummary;
  Map<String, dynamic>? get currentPropertyReviewsSummary =>
      _currentPropertyReviewsSummary;

  List<Map<String, dynamic>> _currentPropertyReviews = [];
  List<Map<String, dynamic>> get currentPropertyReviews =>
      _currentPropertyReviews;

  Future<Map<String, dynamic>?> getPropertyReviews(String propertyId) async {
    try {
      final response =
          await _apiService.dio.get('/properties/$propertyId/reviews');
      if (response.statusCode == 200) {
        final List<dynamic> list = response.data['reviews'] ?? [];
        _currentPropertyReviews = List<Map<String, dynamic>>.from(list);
        _currentPropertyReviewsSummary = response.data['summary'];
        notifyListeners();
        return response.data;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<List<dynamic>> getSubscriptionPlans({
    String? planType,
    String? propertyCategory,
    String? propertyType,
    String? bhkType,
    double? areaSqft,
  }) async {
    try {
      final response = await _apiService.dio.get(
        '/subscriptions/plans',
        queryParameters: {
          if (planType != null && planType.isNotEmpty) 'plan_type': planType,
          if (propertyCategory != null && propertyCategory.isNotEmpty)
            'property_category': propertyCategory,
          if (propertyType != null && propertyType.isNotEmpty)
            'property_type': propertyType,
          if (bhkType != null && bhkType.isNotEmpty) 'bhk_type': bhkType,
          if (areaSqft != null) 'area_sqft': areaSqft,
        },
      );
      if (response.statusCode == 200) {
        return response.data['plans'] ?? [];
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>?> subscribeToPlan(
      String planId, String propertyId,
      {String? couponCode}) async {
    try {
      final Map<String, dynamic> data = {
        'plan_id': planId,
        'property_id': propertyId,
        'billing_cycle': 'monthly'
      };
      if (couponCode != null && couponCode.isNotEmpty) {
        data['coupon_code'] = couponCode;
      }
      final response =
          await _apiService.dio.post('/subscriptions/subscribe', data: data);
      if (response.statusCode == 200 || response.statusCode == 201) {
        return response.data;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<List<dynamic>> getSubscriptionCoupons({
    String? planType,
    String? propertyCategory,
    String? bhkType,
    double? areaSqft,
  }) async {
    try {
      final response = await _apiService.dio.get(
        '/coupons/subscription',
        queryParameters: {
          if (planType != null && planType.isNotEmpty) 'plan_type': planType,
          if (propertyCategory != null && propertyCategory.isNotEmpty)
            'property_category': propertyCategory,
          if (bhkType != null && bhkType.isNotEmpty) 'bhk_type': bhkType,
          if (areaSqft != null) 'area_sqft': areaSqft,
        },
      );
      if (response.statusCode == 200) {
        return response.data['coupons'] ?? [];
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>?> validateSubscriptionCoupon(
    String code,
    String planId, {
    String? propertyCategory,
    String? propertyType,
    String? bhkType,
    double? areaSqft,
  }) async {
    try {
      final response =
          await _apiService.dio.post('/subscriptions/validate-coupon', data: {
        'code': code,
        'plan_id': planId,
        'billing_cycle': 'monthly',
        if (propertyCategory != null && propertyCategory.isNotEmpty)
          'property_category': propertyCategory,
        if (propertyType != null && propertyType.isNotEmpty)
          'property_type': propertyType,
        if (bhkType != null && bhkType.isNotEmpty) 'bhk_type': bhkType,
        if (areaSqft != null) 'area_sqft': areaSqft,
      });
      if (response.statusCode == 200) {
        return response.data;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<bool> mockPaySubscription(
      String subscriptionId, String razorpayOrderId) async {
    try {
      final response = await _apiService.dio
          .post('/subscriptions/subscribe/mock-pay', queryParameters: {
        'subscription_id': subscriptionId,
        'razorpay_order_id': razorpayOrderId,
      });
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  Map<String, dynamic> _unifiedCalendar = {};
  Map<String, dynamic> get unifiedCalendar => _unifiedCalendar;

  List<dynamic> _externalCalendars = [];
  List<dynamic> get externalCalendars => _externalCalendars;

  Future<Map<String, dynamic>?> getUnifiedCalendar(
      String propertyId, int month, int year) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get(
        '/calendar/properties/$propertyId/unified-view',
        queryParameters: {'month': month, 'year': year},
      );
      if (response.statusCode == 200) {
        _unifiedCalendar = response.data;
        notifyListeners();
        return _unifiedCalendar;
      }
      return null;
    } catch (e) {
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> blockDates(String propertyId, String startDate, String endDate,
      String reason) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post(
        '/calendar/properties/$propertyId/block-dates',
        data: {
          'start_date': startDate,
          'end_date': endDate,
          'reason': reason,
        },
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> unblockDates(String blockedDateId) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio
          .delete('/calendar/blocked-dates/$blockedDateId');
      return response.statusCode == 200;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> listExternalCalendars(String propertyId) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio
          .get('/calendar/properties/$propertyId/external-calendars');
      if (response.statusCode == 200) {
        _externalCalendars = response.data['calendars'] ?? [];
      }
    } catch (e) {
      _externalCalendars = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> addExternalCalendar(
      String propertyId, String name, String icalUrl, String color) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post(
        '/calendar/properties/$propertyId/external-calendars',
        data: {
          'name': name,
          'ical_url': icalUrl,
          'color': color,
        },
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> removeExternalCalendar(String calendarId) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio
          .delete('/calendar/external-calendars/$calendarId');
      return response.statusCode == 200;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<String?> getIcalFeedUrl(String propertyId) async {
    try {
      final response = await _apiService.dio
          .get('/calendar/properties/$propertyId/ical-feed-url');
      if (response.statusCode == 200) {
        return response.data['feed_url'];
      }
    } catch (_) {}
    return null;
  }

  Future<String?> rotateIcalFeedUrl(String propertyId) async {
    try {
      final response = await _apiService.dio
          .post('/calendar/properties/$propertyId/ical-feed-url/rotate');
      if (response.statusCode == 200) {
        return response.data['feed_url'];
      }
    } catch (_) {}
    return null;
  }

  // --- WISHLIST MANAGEMENT ---
  final Set<String> _wishlistIds = {};
  Set<String> get wishlistIds => _wishlistIds;

  bool isWishlisted(String propertyId) {
    return _wishlistIds.contains(propertyId);
  }

  void toggleWishlist(String propertyId) {
    if (_wishlistIds.contains(propertyId)) {
      _wishlistIds.remove(propertyId);
    } else {
      _wishlistIds.add(propertyId);
    }
    notifyListeners();
  }

  List<PropertyModel> get wishlistProperties {
    return _properties
        .where((p) => _wishlistIds.contains(p.propertyId))
        .toList();
  }
}
