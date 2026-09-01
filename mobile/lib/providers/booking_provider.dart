import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../models/booking_model.dart';
import '../services/api_service.dart';

class BookingProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  List<BookingModel> _guestBookings = [];
  List<BookingModel> _hostBookings = [];
  BookingModel? _currentBooking;
  bool _isLoading = false;
  String? _lastError;

  List<BookingModel> get guestBookings => _guestBookings;
  List<BookingModel> get hostBookings => _hostBookings;
  BookingModel? get currentBooking => _currentBooking;
  bool get isLoading => _isLoading;
  String? get lastError => _lastError;

  String _extractError(Object error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map && data['detail'] != null) {
        return data['detail'].toString();
      }
      if (data is String && data.trim().isNotEmpty) {
        return data;
      }
      return error.message ?? 'Request failed. Please try again.';
    }
    return 'Request failed. Please try again.';
  }

  Future<Map<String, dynamic>?> createQuote(Map<String, dynamic> data) async {
    _isLoading = true;
    _lastError = null;
    notifyListeners();
    try {
      final response =
          await _apiService.dio.post('/bookings/quote', data: data);
      if (response.statusCode == 200) {
        return Map<String, dynamic>.from(response.data);
      }
      return null;
    } catch (e) {
      _lastError = _extractError(e);
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<BookingModel?> createBooking(Map<String, dynamic> data) async {
    _isLoading = true;
    _lastError = null;
    notifyListeners();
    try {
      final response = await _apiService.dio.post('/bookings/', data: data);
      if (response.statusCode == 200 || response.statusCode == 201) {
        _currentBooking = BookingModel.fromJson(response.data);
        return _currentBooking;
      }
      return null;
    } catch (e) {
      _lastError = _extractError(e);
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> confirmPayment(Map<String, dynamic> data) async {
    _isLoading = true;
    _lastError = null;
    notifyListeners();
    try {
      final response =
          await _apiService.dio.post('/bookings/confirm-payment', data: data);
      return response.statusCode == 200;
    } catch (e) {
      _lastError = _extractError(e);
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>?> getPaymentStatus(String bookingId) async {
    _isLoading = true;
    _lastError = null;
    notifyListeners();
    try {
      final response =
          await _apiService.dio.get('/bookings/$bookingId/payment-status');
      if (response.statusCode == 200) {
        return Map<String, dynamic>.from(response.data);
      }
      return null;
    } catch (e) {
      _lastError = _extractError(e);
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>?> retryPayment(String bookingId) async {
    _isLoading = true;
    _lastError = null;
    notifyListeners();
    try {
      final response =
          await _apiService.dio.post('/bookings/$bookingId/retry-payment');
      if (response.statusCode == 200) {
        return Map<String, dynamic>.from(response.data);
      }
      return null;
    } catch (e) {
      _lastError = _extractError(e);
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>?> createRemainingPaymentOrder(
      String bookingId) async {
    _isLoading = true;
    _lastError = null;
    notifyListeners();
    try {
      final response =
          await _apiService.dio.post('/bookings/$bookingId/remaining-payment');
      if (response.statusCode == 200) {
        return Map<String, dynamic>.from(response.data);
      }
      return null;
    } catch (e) {
      _lastError = _extractError(e);
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> applyCoupon(String bookingId, String couponCode) async {
    _isLoading = true;
    _lastError = null;
    notifyListeners();
    try {
      final response = await _apiService.dio
          .post('/bookings/$bookingId/apply-coupon', data: {
        'coupon_code': couponCode,
      });
      if (response.statusCode == 200) {
        final data = response.data;
        if (_currentBooking != null &&
            _currentBooking!.bookingId == bookingId) {
          _currentBooking = BookingModel(
            bookingId: _currentBooking!.bookingId,
            propertyId: _currentBooking!.propertyId,
            guestId: _currentBooking!.guestId,
            checkInDate: _currentBooking!.checkInDate,
            checkOutDate: _currentBooking!.checkOutDate,
            totalAmount: (data['new_total'] as num?)?.toDouble() ??
                _currentBooking!.totalAmount,
            baseAmount: _currentBooking!.baseAmount,
            paidAmount: _currentBooking!.paidAmount,
            remainingAmount: _currentBooking!.remainingAmount,
            paymentPercent: _currentBooking!.paymentPercent,
            platformFee: _currentBooking!.platformFee,
            kycVerificationFee: _currentBooking!.kycVerificationFee,
            discountAmount: (data['discount_amount'] as num?)?.toDouble() ??
                _currentBooking!.discountAmount,
            bookingStatus: _currentBooking!.bookingStatus,
            paymentStatus: _currentBooking!.paymentStatus,
            lifecycleStatus: _currentBooking!.lifecycleStatus,
            statusLabel: _currentBooking!.statusLabel,
            statusDescription: _currentBooking!.statusDescription,
            razorpayOrderId:
                data['razorpay_order_id'] ?? _currentBooking!.razorpayOrderId,
            razorpayKeyId: _currentBooking!.razorpayKeyId,
            razorpayAmount: (data['amount'] as num?)?.toInt() ??
                _currentBooking!.razorpayAmount,
            currency: data['currency'] ?? _currentBooking!.currency,
            couponCode: data['coupon_code'] ?? _currentBooking!.couponCode,
            guestPhone: _currentBooking!.guestPhone,
            guestEmail: _currentBooking!.guestEmail,
            guestName: _currentBooking!.guestName,
            propertyTitle: _currentBooking!.propertyTitle,
            paymentType: _currentBooking!.paymentType,
            advanceAmount: _currentBooking!.advanceAmount,
            numberOfGuests: _currentBooking!.numberOfGuests,
            createdAt: _currentBooking!.createdAt,
            propertyCity: _currentBooking!.propertyCity,
            propertyState: _currentBooking!.propertyState,
            propertyImages: _currentBooking!.propertyImages,
            propertyCategory: _currentBooking!.propertyCategory,
          );
        } else {
          _currentBooking = BookingModel.fromJson(data);
        }
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      _lastError = _extractError(e);
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> getGuestBookings() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get('/bookings/guest/my-bookings');
      if (response.statusCode == 200) {
        final List<dynamic> list = response.data is Map
            ? (response.data['bookings'] ?? [])
            : (response.data ?? []);
        _guestBookings =
            list.map((item) => BookingModel.fromJson(item)).toList();
      }
    } catch (e) {
      _guestBookings = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> getHostBookings() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get('/bookings/host/my-bookings');
      if (response.statusCode == 200) {
        final List<dynamic> list = response.data is Map
            ? (response.data['bookings'] ?? [])
            : (response.data ?? []);
        _hostBookings =
            list.map((item) => BookingModel.fromJson(item)).toList();
      }
    } catch (e) {
      _hostBookings = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> approveBooking(String bookingId) async {
    _isLoading = true;
    _lastError = null;
    notifyListeners();
    try {
      final response =
          await _apiService.dio.post('/bookings/$bookingId/approve');
      if (response.statusCode == 200) {
        await getHostBookings();
        return true;
      }
      return false;
    } catch (e) {
      _lastError = _extractError(e);
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> rejectBooking(String bookingId, {String? reason}) async {
    _isLoading = true;
    _lastError = null;
    notifyListeners();
    try {
      final response = await _apiService.dio.post(
        '/bookings/$bookingId/reject',
        data: {'reason': reason ?? 'Rejected by host'},
      );
      if (response.statusCode == 200) {
        await getHostBookings();
        return true;
      }
      return false;
    } catch (e) {
      _lastError = _extractError(e);
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> cancelBooking(String bookingId) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response =
          await _apiService.dio.post('/bookings/$bookingId/cancel');
      if (response.statusCode == 200) {
        await getGuestBookings();
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
