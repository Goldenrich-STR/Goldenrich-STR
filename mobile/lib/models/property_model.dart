import '../config.dart';

class PropertyModel {
  final String propertyId;
  final String ownerId;
  final String? brokerId;
  final String title;
  final String description;
  final String propertyType;
  final String category;
  final String bhkType;
  final String address;
  final String city;
  final String state;
  final String pinCode;
  final double latitude;
  final double longitude;
  final double areaSqft;
  final double pricePerNight;
  final double? customerPricePerNight;
  final double? extraGuestPrice;
  final int maxGuests;
  final List<String> amenities;
  final List<String> images;
  final String? videoUrl;
  final String? youtubeShortUrl;
  final String? youtubeLongUrl;
  final bool petFriendly;
  final bool instantBooking;
  final String bookingMode;
  final bool hostApprovalRequired;
  final int? hostApprovalSlaMinutes;
  final String status;
  final double? vegPrice;
  final double? nonVegPrice;
  final int? guestSize;
  final DateTime? createdAt;
  final String? houseRules;
  final String? subscriptionId;
  final String? subscriptionStatus;
  final String? subscriptionPlanName;
  final String? subscriptionPurchaseDate;
  final String? subscriptionRenewalDate;
  final bool hasCook;
  final double? cookPrice;
  final bool hasSelfCook;
  final bool hasTaxi;
  final double? rating;
  final int? reviewCount;

  PropertyModel({
    required this.propertyId,
    required this.ownerId,
    this.brokerId,
    required this.title,
    required this.description,
    required this.propertyType,
    required this.category,
    required this.bhkType,
    required this.address,
    required this.city,
    required this.state,
    required this.pinCode,
    required this.latitude,
    required this.longitude,
    required this.areaSqft,
    required this.pricePerNight,
    this.customerPricePerNight,
    this.extraGuestPrice,
    required this.maxGuests,
    required this.amenities,
    required this.images,
    this.videoUrl,
    this.youtubeShortUrl,
    this.youtubeLongUrl,
    required this.petFriendly,
    required this.instantBooking,
    required this.bookingMode,
    required this.hostApprovalRequired,
    this.hostApprovalSlaMinutes,
    required this.status,
    this.vegPrice,
    this.nonVegPrice,
    this.guestSize,
    this.createdAt,
    this.houseRules,
    this.subscriptionId,
    this.subscriptionStatus,
    this.subscriptionPlanName,
    this.subscriptionPurchaseDate,
    this.subscriptionRenewalDate,
    required this.hasCook,
    this.cookPrice,
    required this.hasSelfCook,
    required this.hasTaxi,
    this.rating,
    this.reviewCount,
  });

  bool get isEventVenue => category.toLowerCase().trim() == 'event_venue';

  bool get isCommercial =>
      category.toLowerCase().trim() == 'commercial' ||
      propertyType.toLowerCase().contains('commercial') ||
      propertyType.toLowerCase().contains('office') ||
      propertyType.toLowerCase().contains('shop') ||
      propertyType.toLowerCase().contains('retail') ||
      propertyType.toLowerCase().contains('warehouse');

  String get pricingUnitLabel {
    if (isEventVenue) return 'day';
    if (isCommercial) return 'day';
    return 'night';
  }

  String get pricingUnitSuffix => ' / $pricingUnitLabel';

  double get customerDisplayPrice => customerPricePerNight ?? pricePerNight;

  bool get isInstantBook => bookingMode.toUpperCase() == 'INSTANT_BOOK';

  String get bookingModeLabel =>
      isInstantBook ? 'Instant Book' : 'Host Approval Required';

  String get bookingModeDescription => isInstantBook
      ? 'Book instantly without waiting for host approval.'
      : 'The host reviews every booking request. Expected response: within 24 hours.';

  String get bookingCtaLabel => isInstantBook ? 'Reserve' : 'Request to Book';

  String get bookingDateTitle {
    if (isEventVenue) return 'Select event date';
    if (isCommercial) return 'Select booking dates';
    return 'Select stay dates';
  }

  String get participantLabel => isCommercial ? 'staff' : 'guests';

  String get participantLabelUpper => participantLabel.toUpperCase();

  String get displayCategoryLabel {
    final normalized = category.trim().replaceAll('_', ' ');
    if (normalized.isEmpty) return 'Property';
    return normalized
        .split(' ')
        .where((part) => part.isNotEmpty)
        .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
        .join(' ');
  }

  factory PropertyModel.fromJson(Map<String, dynamic> json) {
    final images = (json['images'] as List? ?? [])
        .where((img) => _isProductionPropertyImageUrl(img.toString()))
        .map<String>((img) => AppConfig.resolveImageUrl(img.toString()))
        .toList();
    return PropertyModel(
      propertyId: json['property_id'] ?? '',
      ownerId: json['owner_id'] ?? '',
      brokerId: json['broker_id'],
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      propertyType: json['property_type'] ?? '',
      category: json['category'] ?? '',
      bhkType: json['bhk_type'] ?? '',
      address: json['address'] ?? '',
      city: json['city'] ?? '',
      state: json['state'] ?? '',
      pinCode: json['pin_code'] ?? '',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      areaSqft: (json['area_sqft'] as num?)?.toDouble() ?? 0.0,
      pricePerNight: (json['price_per_night'] as num?)?.toDouble() ?? 0.0,
      customerPricePerNight:
          (json['customer_price_per_night'] as num?)?.toDouble() ??
              (json['display_price_per_night'] as num?)?.toDouble(),
      extraGuestPrice: (json['extra_guest_price'] as num?)?.toDouble(),
      maxGuests: json['max_guests'] ?? 6,
      amenities: List<String>.from(json['amenities'] ?? []),
      images: images,
      videoUrl: json['video_url'],
      youtubeShortUrl: json['youtube_short_url'],
      youtubeLongUrl: json['youtube_long_url'],
      petFriendly: json['pet_friendly'] ?? false,
      instantBooking: true,
      bookingMode: 'INSTANT_BOOK',
      hostApprovalRequired: false,
      hostApprovalSlaMinutes: null,
      status: json['status'] ?? 'draft',
      vegPrice: (json['veg_price'] as num?)?.toDouble(),
      nonVegPrice: (json['non_veg_price'] as num?)?.toDouble(),
      guestSize: json['guest_size'] as int?,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'])
          : null,
      houseRules: json['house_rules'],
      subscriptionId: json['subscription_id'],
      subscriptionStatus: json['subscription_status'],
      subscriptionPlanName: json['subscription_plan_name'],
      subscriptionPurchaseDate: json['subscription_purchase_date']?.toString(),
      subscriptionRenewalDate: json['subscription_renewal_date']?.toString(),
      hasCook: json['has_cook'] ?? false,
      cookPrice: (json['cook_price'] as num?)?.toDouble(),
      hasSelfCook: json['has_self_cook'] ?? false,
      hasTaxi: json['has_taxi'] ?? false,
      rating: (json['rating'] as num?)?.toDouble() ??
          (json['rating_avg'] as num?)?.toDouble(),
      reviewCount: (json['review_count'] as num?)?.toInt() ??
          (json['rating_count'] as num?)?.toInt(),
    );
  }

  static bool _isProductionPropertyImageUrl(String value) {
    final raw = value.trim();
    if (raw.isEmpty) return false;
    final lower = raw.toLowerCase();
    return !lower.contains('example.com') &&
        !lower.contains('images.unsplash.com') &&
        !lower.contains('source.unsplash.com') &&
        !lower.contains('images.pexels.com') &&
        !lower.contains('picsum.photos') &&
        !lower.contains('placeholder.com') &&
        !lower.contains('placehold.co') &&
        !lower.contains('dummyimage') &&
        !_isLocalAbsoluteUrl(raw);
  }

  static bool _isLocalAbsoluteUrl(String value) {
    final uri = Uri.tryParse(value);
    if (uri == null || !uri.hasScheme) return false;
    return uri.host == 'localhost' ||
        uri.host == '127.0.0.1' ||
        uri.host == '10.0.2.2' ||
        uri.host == '0.0.0.0';
  }

  Map<String, dynamic> toJson() {
    return {
      'property_id': propertyId,
      'owner_id': ownerId,
      'broker_id': brokerId,
      'title': title,
      'description': description,
      'property_type': propertyType,
      'category': category,
      'bhk_type': bhkType,
      'address': address,
      'city': city,
      'state': state,
      'pin_code': pinCode,
      'latitude': latitude,
      'longitude': longitude,
      'area_sqft': areaSqft,
      'price_per_night': pricePerNight,
      'customer_price_per_night': customerPricePerNight,
      'extra_guest_price': extraGuestPrice,
      'max_guests': maxGuests,
      'amenities': amenities,
      'images': images,
      'video_url': videoUrl,
      'youtube_short_url': youtubeShortUrl,
      'youtube_long_url': youtubeLongUrl,
      'pet_friendly': petFriendly,
      'instant_booking': true,
      'booking_mode': 'INSTANT_BOOK',
      'host_approval_required': false,
      'host_approval_sla_minutes': null,
      'status': status,
      'veg_price': vegPrice,
      'non_veg_price': nonVegPrice,
      'guest_size': guestSize,
      'created_at': createdAt?.toIso8601String(),
      'house_rules': houseRules,
      'subscription_id': subscriptionId,
      'subscription_status': subscriptionStatus,
      'subscription_plan_name': subscriptionPlanName,
      'subscription_purchase_date': subscriptionPurchaseDate,
      'subscription_renewal_date': subscriptionRenewalDate,
      'has_cook': hasCook,
      'cook_price': cookPrice,
      'has_self_cook': hasSelfCook,
      'has_taxi': hasTaxi,
      'rating': rating,
      'review_count': reviewCount,
    };
  }
}
