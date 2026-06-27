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
  final int maxGuests;
  final List<String> amenities;
  final List<String> images;
  final String? videoUrl;
  final String? youtubeShortUrl;
  final String? youtubeLongUrl;
  final bool petFriendly;
  final bool instantBooking;
  final String status;
  final double? vegPrice;
  final double? nonVegPrice;
  final int? guestSize;
  final DateTime? createdAt;
  final String? houseRules;
  final String? subscriptionId;
  final String? subscriptionStatus;
  final bool hasCook;
  final double? cookPrice;
  final bool hasSelfCook;
  final bool hasTaxi;

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
    required this.maxGuests,
    required this.amenities,
    required this.images,
    this.videoUrl,
    this.youtubeShortUrl,
    this.youtubeLongUrl,
    required this.petFriendly,
    required this.instantBooking,
    required this.status,
    this.vegPrice,
    this.nonVegPrice,
    this.guestSize,
    this.createdAt,
    this.houseRules,
    this.subscriptionId,
    this.subscriptionStatus,
    required this.hasCook,
    this.cookPrice,
    required this.hasSelfCook,
    required this.hasTaxi,
  });

  factory PropertyModel.fromJson(Map<String, dynamic> json) {
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
      maxGuests: json['max_guests'] ?? 6,
      amenities: List<String>.from(json['amenities'] ?? []),
      images: (json['images'] as List? ?? [])
          .map<String>((img) => AppConfig.resolveImageUrl(img.toString()))
          .toList(),
      videoUrl: json['video_url'],
      youtubeShortUrl: json['youtube_short_url'],
      youtubeLongUrl: json['youtube_long_url'],
      petFriendly: json['pet_friendly'] ?? false,
      instantBooking: json['instant_booking'] ?? false,
      status: json['status'] ?? 'draft',
      vegPrice: (json['veg_price'] as num?)?.toDouble(),
      nonVegPrice: (json['non_veg_price'] as num?)?.toDouble(),
      guestSize: json['guest_size'] as int?,
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at']) : null,
      houseRules: json['house_rules'],
      subscriptionStatus: json['subscription_status'],
      hasCook: json['has_cook'] ?? false,
      cookPrice: (json['cook_price'] as num?)?.toDouble(),
      hasSelfCook: json['has_self_cook'] ?? false,
      hasTaxi: json['has_taxi'] ?? false,
    );
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
      'max_guests': maxGuests,
      'amenities': amenities,
      'images': images,
      'video_url': videoUrl,
      'youtube_short_url': youtubeShortUrl,
      'youtube_long_url': youtubeLongUrl,
      'pet_friendly': petFriendly,
      'instant_booking': instantBooking,
      'status': status,
      'veg_price': vegPrice,
      'non_veg_price': nonVegPrice,
      'guest_size': guestSize,
      'created_at': createdAt?.toIso8601String(),
      'house_rules': houseRules,
      'subscription_id': subscriptionId,
      'subscription_status': subscriptionStatus,
      'has_cook': hasCook,
      'cook_price': cookPrice,
      'has_self_cook': hasSelfCook,
      'has_taxi': hasTaxi,
    };
  }
}
