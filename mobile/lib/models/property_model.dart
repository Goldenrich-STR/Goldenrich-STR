import '../config.dart';

/// A bookable unit (room / flat / office) inside a multi-unit property.
class PropertyUnit {
  final String unitId;
  final String name;
  final double? areaSqft;
  final int maxGuests;
  final String bhkType;
  final String tier; // standard | deluxe | premium | ''
  final double price; // what guests pay today (price rules included)
  final double rawPrice; // the price the host set; used when editing

  const PropertyUnit({
    required this.unitId,
    required this.name,
    this.areaSqft,
    required this.maxGuests,
    required this.bhkType,
    required this.tier,
    required this.price,
    double? rawPrice,
  }) : rawPrice = rawPrice ?? price;

  factory PropertyUnit.fromJson(Map<String, dynamic> json) {
    return PropertyUnit(
      unitId: (json['unit_id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      areaSqft: (json['area_sqft'] as num?)?.toDouble(),
      maxGuests: (json['max_guests'] as num?)?.toInt() ?? 2,
      bhkType: (json['bhk_type'] ?? '').toString(),
      tier: (json['tier'] ?? '').toString(),
      price: ((json['display_price_per_night'] ?? json['price_per_night'])
                  as num?)
              ?.toDouble() ??
          0,
      rawPrice: (json['price_per_night'] as num?)?.toDouble(),
    );
  }
}

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
  final bool hasUnits;
  final List<PropertyUnit> units;
  final String hostName;
  final String? hostJoined;
  final List<String> taggedImages; // 'url#Category'
  final List<Map<String, dynamic>> packages; // meal packages (veg / non-veg)
  final double? basePricePerNight; // the host's own price, before price rules
  final List<String> nearbyPlaces;
  final String? hostPhone;
  final bool locationUnlocked; // exact map unlocks with a confirmed booking
  final String? virtualTourLink;
  final String checkInTime;
  final String checkOutTime;
  final int minimumStayDays;

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
    this.hasUnits = false,
    this.units = const [],
    this.hostName = '',
    this.hostJoined,
    this.taggedImages = const [],
    this.packages = const [],
    this.basePricePerNight,
    this.nearbyPlaces = const [],
    this.hostPhone,
    this.locationUnlocked = false,
    this.virtualTourLink,
    this.checkInTime = '12:00',
    this.checkOutTime = '11:00',
    this.minimumStayDays = 1,
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

  String get bookingModeLabel => isInstantBook ? 'Instant Book' : 'Request to Book';

  String get bookingModeDescription => isInstantBook
      ? 'Book instantly without waiting for host approval.'
      : 'The host confirms within 24 hours. You pay after approval.';

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
        // the category tag ("...jpg#Exterior") is only for the website
        .map<String>((img) =>
            AppConfig.resolveImageUrl(img.toString().split('#').first))
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
      // follow the host's choice (instant booking or approval) instead of forcing instant
      instantBooking: _modeFromJson(json) == 'INSTANT_BOOK',
      bookingMode: _modeFromJson(json),
      hostApprovalRequired: _modeFromJson(json) != 'INSTANT_BOOK',
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
      hasUnits: json['has_units'] == true,
      units: json['has_units'] == true && json['units'] is List
          ? (json['units'] as List)
              .whereType<Map>()
              .map((u) => PropertyUnit.fromJson(Map<String, dynamic>.from(u)))
              .where((u) => u.name.isNotEmpty)
              .toList()
          : const [],
      hostName: json['host'] is Map
          ? (json['host']['full_name'] ?? '').toString().trim()
          : '',
      hostJoined: json['host'] is Map
          ? (json['host']['created_at'] ?? '').toString()
          : null,
      taggedImages: (json['images'] as List? ?? [])
          .where((img) => _isProductionPropertyImageUrl(img.toString()))
          .map<String>((img) {
        final parts = img.toString().split('#');
        final url = AppConfig.resolveImageUrl(parts.first);
        return parts.length > 1 ? '$url#${parts[1]}' : url;
      }).toList(),
      basePricePerNight: (json['base_price_per_night'] as num?)?.toDouble(),
      nearbyPlaces: (json['nearby_places'] as List? ?? [])
          .map((e) => e is Map ? (e['name'] ?? '').toString() : e.toString())
          .where((e) => e.trim().isNotEmpty)
          .toList(),
      locationUnlocked: json['location_unlocked'] == true,
      hostPhone: json['host'] is Map && (json['host']['phone'] ?? '').toString().isNotEmpty
          ? json['host']['phone'].toString()
          : null,
      virtualTourLink: (json['virtual_tour_link'] ?? '').toString().isNotEmpty
          ? json['virtual_tour_link'].toString()
          : null,
      packages: (json['packages'] as List? ?? [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList(),
      checkInTime: (json['check_in_time'] ?? '12:00').toString(),
      checkOutTime: (json['check_out_time'] ?? '11:00').toString(),
      minimumStayDays: (json['minimum_stay_days'] as num?)?.toInt() ?? 1,
    );
  }

  static String _modeFromJson(Map<String, dynamic> json) {
    final mode = (json['booking_mode'] ?? '').toString().toUpperCase();
    if (mode == 'INSTANT_BOOK' || mode == 'HOST_APPROVAL') return mode;
    return json['instant_booking'] == false ? 'HOST_APPROVAL' : 'INSTANT_BOOK';
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
        // local uploads are fine while developing, never in a production build
        (!AppConfig.isProduction || !_isLocalAbsoluteUrl(raw));
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
