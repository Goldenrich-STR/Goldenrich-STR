import 'package:flutter/material.dart';
import '../models/booking_model.dart';
import '../services/api_service.dart';

class BookingProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  List<BookingModel> _guestBookings = [];
  List<BookingModel> _hostBookings = [];
  BookingModel? _currentBooking;
  bool _isLoading = false;

  List<BookingModel> get guestBookings => _guestBookings;
  List<BookingModel> get hostBookings => _hostBookings;
  BookingModel? get currentBooking => _currentBooking;
  bool get isLoading => _isLoading;

  Future<BookingModel?> createBooking(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post('/bookings/', data: data);
      if (response.statusCode == 200 || response.statusCode == 201) {
        _currentBooking = BookingModel.fromJson(response.data);
        return _currentBooking;
      }
      return null;
    } catch (e) {
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> confirmPayment(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post('/bookings/confirm-payment', data: data);
      return response.statusCode == 200;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> mockPay(String bookingId) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post('/bookings/$bookingId/mock-pay');
      return response.statusCode == 200;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> applyCoupon(String bookingId, String couponCode) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post('/bookings/$bookingId/apply-coupon', data: {
        'coupon_code': couponCode,
      });
      if (response.statusCode == 200) {
        final data = response.data;
        if (_currentBooking != null && _currentBooking!.bookingId == bookingId) {
          _currentBooking = BookingModel(
            bookingId: _currentBooking!.bookingId,
            propertyId: _currentBooking!.propertyId,
            guestId: _currentBooking!.guestId,
            checkInDate: _currentBooking!.checkInDate,
            checkOutDate: _currentBooking!.checkOutDate,
            totalAmount: (data['new_total'] as num?)?.toDouble() ?? _currentBooking!.totalAmount,
            baseAmount: _currentBooking!.baseAmount,
            platformFee: _currentBooking!.platformFee,
            kycVerificationFee: _currentBooking!.kycVerificationFee,
            discountAmount: (data['discount_amount'] as num?)?.toDouble() ?? _currentBooking!.discountAmount,
            bookingStatus: _currentBooking!.bookingStatus,
            paymentStatus: _currentBooking!.paymentStatus,
            razorpayOrderId: data['razorpay_order_id'] ?? _currentBooking!.razorpayOrderId,
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
        _guestBookings = list.map((item) => BookingModel.fromJson(item)).toList();
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
        _hostBookings = list.map((item) => BookingModel.fromJson(item)).toList();
      }
    } catch (e) {
      _hostBookings = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> cancelBooking(String bookingId) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.post('/bookings/$bookingId/cancel');
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
