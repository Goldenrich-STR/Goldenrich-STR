import '../config.dart';
import '../utils/currency_formatter.dart';

class NearbyPropertyModel {
  final String propertyId;
  final String propertyName;
  final double latitude;
  final double longitude;
  final int distanceMeters;
  final double distanceKm;
  final String? thumbnail;
  final String propertyType;
  final String category;
  final double price;
  final String currency;
  final String pricingCycle;
  final double rating;
  final int reviewCount;
  final bool instantBook;
  final String availabilityStatus;
  final String city;
  final String state;
  final String bhkType;
  final int maxGuests;

  const NearbyPropertyModel({
    required this.propertyId,
    required this.propertyName,
    required this.latitude,
    required this.longitude,
    required this.distanceMeters,
    required this.distanceKm,
    required this.thumbnail,
    required this.propertyType,
    required this.category,
    required this.price,
    required this.currency,
    required this.pricingCycle,
    required this.rating,
    required this.reviewCount,
    required this.instantBook,
    required this.availabilityStatus,
    required this.city,
    required this.state,
    required this.bhkType,
    required this.maxGuests,
  });

  factory NearbyPropertyModel.fromJson(Map<String, dynamic> json) {
    return NearbyPropertyModel(
      propertyId: json['propertyId']?.toString() ?? '',
      propertyName: json['propertyName']?.toString() ?? 'X-Space360 Property',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0,
      distanceMeters: (json['distanceMeters'] as num?)?.round() ?? 0,
      distanceKm: (json['distanceKm'] as num?)?.toDouble() ?? 0,
      thumbnail: AppConfig.resolveImageUrl(json['thumbnail']?.toString()),
      propertyType: json['propertyType']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0,
      currency:
          json['currency']?.toString() ?? AppCurrencyConfig.defaultCurrencyCode,
      pricingCycle: json['pricingCycle']?.toString() ?? 'day',
      rating: (json['rating'] as num?)?.toDouble() ?? 0,
      reviewCount: (json['reviewCount'] as num?)?.toInt() ?? 0,
      instantBook: json['instantBook'] as bool? ?? true,
      availabilityStatus: json['availabilityStatus']?.toString() ?? 'available',
      city: json['city']?.toString() ?? '',
      state: json['state']?.toString() ?? '',
      bhkType: json['bhkType']?.toString() ?? '',
      maxGuests: (json['maxGuests'] as num?)?.toInt() ?? 0,
    );
  }

  String get pricingUnitLabel {
    final value = pricingCycle.toLowerCase();
    if (value.contains('night')) return 'night';
    if (value.contains('hour')) return 'hour';
    if (value.contains('month')) return 'month';
    return 'day';
  }
}
