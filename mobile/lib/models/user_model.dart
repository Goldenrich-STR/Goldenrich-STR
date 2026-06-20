class UserModel {
  final String userId;
  final String email;
  final String phone;
  final String fullName;
  final String role;
  final String city;
  final String? profileImage;
  final String kycStatus;
  final bool isActive;
  final bool registrationFeePaid;
  final bool isPromoClaimed;

  UserModel({
    required this.userId,
    required this.email,
    required this.phone,
    required this.fullName,
    required this.role,
    required this.city,
    this.profileImage,
    required this.kycStatus,
    required this.isActive,
    required this.registrationFeePaid,
    required this.isPromoClaimed,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      userId: json['user_id'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      fullName: json['full_name'] ?? '',
      role: json['role'] ?? 'guest',
      city: json['city'] ?? '',
      profileImage: json['profile_image'],
      kycStatus: json['kyc_status'] ?? 'pending',
      isActive: json['is_active'] ?? false,
      registrationFeePaid: json['registration_fee_paid'] ?? false,
      isPromoClaimed: json['is_promo_claimed'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'email': email,
      'phone': phone,
      'full_name': fullName,
      'role': role,
      'city': city,
      'profile_image': profileImage,
      'kyc_status': kycStatus,
      'is_active': isActive,
      'registration_fee_paid': registrationFeePaid,
      'is_promo_claimed': isPromoClaimed,
    };
  }
}
