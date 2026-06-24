import '../config.dart';

class BookingModel {
  final String bookingId;
  final String propertyId;
  final String guestId;
  final String checkInDate;
  final String checkOutDate;
  final double totalAmount;
  final double baseAmount;
  final double platformFee;
  final double kycVerificationFee;
  final double discountAmount;
  final String bookingStatus;
  final String? paymentStatus;
  final String? razorpayOrderId;
  final String? couponCode;
  final String? guestPhone;
  final String? guestEmail;
  final String? guestName;
  final String? propertyTitle;
  final String? paymentType;
  final double? advanceAmount;
  final int numberOfGuests;
  final String createdAt;
  final String? propertyCity;
  final String? propertyState;
  final List<String>? propertyImages;
  final String? propertyCategory;

  BookingModel({
    required this.bookingId,
    required this.propertyId,
    required this.guestId,
    required this.checkInDate,
    required this.checkOutDate,
    required this.totalAmount,
    required this.baseAmount,
    required this.platformFee,
    required this.kycVerificationFee,
    required this.discountAmount,
    required this.bookingStatus,
    this.paymentStatus,
    this.razorpayOrderId,
    this.couponCode,
    this.guestPhone,
    this.guestEmail,
    this.guestName,
    this.propertyTitle,
    this.paymentType,
    this.advanceAmount,
    this.numberOfGuests = 1,
    this.createdAt = '',
    this.propertyCity,
    this.propertyState,
    this.propertyImages,
    this.propertyCategory,
  });

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    final details = json['booking_details'] as Map<String, dynamic>?;
    final propJson = json['property'] as Map<String, dynamic>?;
    final guestJson = json['guest'] as Map<String, dynamic>?;

    return BookingModel(
      bookingId: json['booking_id'] ?? '',
      propertyId: json['property_id'] ?? (details != null ? details['property_id'] ?? '' : ''),
      guestId: json['guest_id'] ?? '',
      checkInDate: json['check_in_date'] ?? (details != null ? details['check_in_date'] ?? '' : ''),
      checkOutDate: json['check_out_date'] ?? (details != null ? details['check_out_date'] ?? '' : ''),
      totalAmount: (json['total_amount'] as num?)?.toDouble() ?? 
                   (details != null ? (details['total_amount'] as num?)?.toDouble() ?? 0.0 : 0.0),
      baseAmount: (json['base_amount'] as num?)?.toDouble() ?? 
                  (details != null ? (details['base_amount'] as num?)?.toDouble() ?? 0.0 : 0.0),
      platformFee: (json['platform_fee'] as num?)?.toDouble() ?? 0.0,
      kycVerificationFee: (json['kyc_verification_fee'] as num?)?.toDouble() ?? 0.0,
      discountAmount: (json['discount_amount'] as num?)?.toDouble() ?? 0.0,
      bookingStatus: json['booking_status'] ?? '',
      paymentStatus: json['payment_status'],
      razorpayOrderId: json['razorpay_order_id'],
      couponCode: json['coupon_code'],
      guestPhone: json['guest_phone'] ?? (guestJson != null ? guestJson['phone'] : null),
      guestEmail: json['guest_email'] ?? (guestJson != null ? guestJson['email'] : null),
      guestName: json['guest_name'] ?? (guestJson != null ? guestJson['full_name'] : null),
      propertyTitle: json['property_title'] ?? 
                     (details != null ? details['property_title'] : null) ?? 
                     (propJson != null ? propJson['title'] : null),
      paymentType: json['payment_type'] ?? (details != null ? details['payment_type'] : null),
      advanceAmount: (json['advance_amount'] as num?)?.toDouble() ?? 
                     (details != null ? (details['advance_amount'] as num?)?.toDouble() : null),
      numberOfGuests: json['number_of_guests'] ?? (details != null ? details['number_of_guests'] ?? 1 : 1),
      createdAt: json['created_at'] ?? '',
      propertyCity: propJson != null ? propJson['city'] : null,
      propertyState: propJson != null ? propJson['state'] : null,
      propertyImages: propJson != null && propJson['images'] != null
          ? (propJson['images'] as List).map<String>((img) => AppConfig.resolveImageUrl(img.toString())).toList()
          : null,
      propertyCategory: propJson != null ? propJson['category'] : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'booking_id': bookingId,
      'property_id': propertyId,
      'guest_id': guestId,
      'check_in_date': checkInDate,
      'check_out_date': checkOutDate,
      'total_amount': totalAmount,
      'base_amount': baseAmount,
      'platform_fee': platformFee,
      'kyc_verification_fee': kycVerificationFee,
      'discount_amount': discountAmount,
      'booking_status': bookingStatus,
      'payment_status': paymentStatus,
      'razorpay_order_id': razorpayOrderId,
      'coupon_code': couponCode,
      'guest_phone': guestPhone,
      'guest_email': guestEmail,
      'guest_name': guestName,
      'payment_type': paymentType,
      'advance_amount': advanceAmount,
      'number_of_guests': numberOfGuests,
      'created_at': createdAt,
    };
  }
}
