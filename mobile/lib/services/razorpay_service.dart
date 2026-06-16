import '../services/api_service.dart';

/// A helper service outlining Razorpay Mobile integration for Flutter.
/// 
/// In production:
/// 1. Add `razorpay_flutter: ^1.3.7` to pubspec.yaml
/// 2. Import package:razorpay_flutter/razorpay_flutter.dart
/// 3. Call `openCheckout(...)` to trigger native SDK screens.
class RazorpayService {
  final ApiService _apiService = ApiService();

  /// Fetches payment keys/config from the backend
  Future<Map<String, dynamic>?> getPaymentConfig() async {
    try {
      final response = await _apiService.dio.get('/bookings/payment/config');
      if (response.statusCode == 200) {
        return response.data;
      }
    } catch (e) {
      // Fallback
    }
    return null;
  }

  /// Helper to mock checkout flow for UAT/development.
  /// Reuses `/bookings/{booking_id}/mock-pay` endpoint.
  Future<bool> executeMockPayment(String bookingId) async {
    try {
      final response = await _apiService.dio.post('/bookings/$bookingId/mock-pay');
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  /// Setup options mapping for razorpay_flutter plugin.
  /// Pass these values directly to Razorpay's .open() method.
  Map<String, dynamic> buildCheckoutOptions({
    required String keyId,
    required double amount,
    required String currency,
    required String bookingId,
    required String orderId,
    required String propertyTitle,
    required String userEmail,
    required String userPhone,
    required String userName,
  }) {
    return {
      'key': keyId,
      'amount': (amount * 100).round(), // Razorpay expects amount in paise (subunits)
      'name': 'Goldenrich STR',
      'description': '$propertyTitle - Booking $bookingId',
      'order_id': orderId,
      'prefill': {
        'contact': userPhone,
        'email': userEmail,
        'name': userName,
      },
      'external': {
        'wallets': ['paytm']
      },
      'theme': {
        'color': '#C05C4F' // Organic Terracotta Theme color
      }
    };
  }

  /// Verifies Razorpay payment signature on backend
  Future<bool> confirmPayment({
    required String bookingId,
    required String razorpayPaymentId,
    required String razorpayOrderId,
    required String razorpaySignature,
  }) async {
    try {
      final response = await _apiService.dio.post(
        '/bookings/confirm-payment',
        data: {
          'booking_id': bookingId,
          'razorpay_payment_id': razorpayPaymentId,
          'razorpay_order_id': razorpayOrderId,
          'razorpay_signature': razorpaySignature,
        },
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }
}
