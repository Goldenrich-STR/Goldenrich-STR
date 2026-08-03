import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../providers/property_provider.dart';
import '../../providers/booking_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/property_model.dart';
import '../../theme.dart';
import 'package:url_launcher/url_launcher.dart';
import '../auth/login_screen.dart';

class PropertyDetailScreen extends StatefulWidget {
  final String propertyId;
  const PropertyDetailScreen({super.key, required this.propertyId});

  @override
  State<PropertyDetailScreen> createState() => _PropertyDetailScreenState();
}

class _PropertyDetailScreenState extends State<PropertyDetailScreen> {
  static const String _recentlyVisitedKey = 'recently_visited_properties';
  DateTime? _checkInDate;
  DateTime? _checkOutDate;
  String _selectedSlot = 'morning';
  String _foodPreference = 'veg';
  String _paymentType = 'full';
  final _couponController = TextEditingController();
  int _currentImageIndex = 0;
  bool _isDescriptionExpanded = false;
  final PageController _pageController = PageController();

  // New State variables for availability calendar, reviews, and guest count
  int _guestCount = 1;
  DateTime _calendarMonth = DateTime.now();
  List<Map<String, dynamic>> _blockedDatesList = [];
  List<Map<String, dynamic>> _reviewsList = [];
  Map<String, dynamic>? _reviewsSummary;
  bool _loadingReviews = false;

  bool _isSignatureSeriesProperty(PropertyModel prop) {
    final type = prop.propertyType.toLowerCase();
    return prop.pricePerNight >= 50000 &&
        (type.contains('villa') ||
            type.contains('resort') ||
            prop.category.toLowerCase() == 'residential');
  }

  Future<void> _openPropertyMap(PropertyModel prop) async {
    final query = Uri.encodeComponent(
      '${prop.title}, ${prop.address}, ${prop.city}, ${prop.state}, ${prop.pinCode}',
    );
    final mapsUri = Uri.parse(
      'https://www.google.com/maps/search/?api=1&query=$query',
    );
    await launchUrl(mapsUri, mode: LaunchMode.externalApplication);
  }

  String _propertyShareUrl(PropertyModel prop) {
    return 'https://uat.x-space360.in/property/${Uri.encodeComponent(prop.propertyId)}';
  }

  String _propertyShareText(PropertyModel prop) {
    final price = NumberFormat.currency(
      locale: 'en_IN',
      symbol: 'Rs ',
      decimalDigits: 0,
    ).format(prop.pricePerNight);
    return 'Check out ${prop.title} in ${prop.city} on X-Space360. Starting from $price/night.\n${_propertyShareUrl(prop)}';
  }

  Future<void> _copyPropertyLink(PropertyModel prop) async {
    await Clipboard.setData(ClipboardData(text: _propertyShareUrl(prop)));
    if (!mounted) return;
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Property link copied.')),
    );
  }

  Future<void> _shareProperty(PropertyModel prop) async {
    await Share.share(
      _propertyShareText(prop),
      subject: prop.title,
    );
  }

  void _showShareSheet(PropertyModel prop) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) {
        return SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 42,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppTheme.border,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  'Share property',
                  style: GoogleFonts.manrope(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.charcoal,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  prop.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.manrope(
                    fontSize: 13,
                    color: AppTheme.charcoalMuted,
                  ),
                ),
                const SizedBox(height: 18),
                _ShareActionTile(
                  icon: Icons.ios_share_rounded,
                  title: 'Share with apps',
                  subtitle: 'WhatsApp, Instagram, Facebook and more',
                  onTap: () {
                    Navigator.pop(sheetContext);
                    _shareProperty(prop);
                  },
                ),
                _ShareActionTile(
                  icon: Icons.link_rounded,
                  title: 'Copy link',
                  subtitle: _propertyShareUrl(prop),
                  onTap: () => _copyPropertyLink(prop),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _openImageGallery(List<String> images, {int initialIndex = 0}) {
    showGeneralDialog(
      context: context,
      barrierLabel: 'Image Gallery',
      barrierDismissible: true,
      barrierColor: Colors.black.withValues(alpha: 0.92),
      pageBuilder: (context, animation, secondaryAnimation) {
        return _PropertyImageGalleryDialog(
          images: images,
          initialIndex: initialIndex,
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: animation,
          child: child,
        );
      },
    );
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final propertyProvider =
          Provider.of<PropertyProvider>(context, listen: false);
      await propertyProvider.getProperty(widget.propertyId);
      final prop = propertyProvider.currentProperty;
      if (prop != null) {
        await _saveRecentlyVisitedProperty(prop);
      }
      if (prop != null && prop.category.toLowerCase() == 'event_venue') {
        setState(() {
          _guestCount = 100;
        });
      }
      _fetchBlockedDatesAndReviews();
    });
  }

  Future<void> _saveRecentlyVisitedProperty(PropertyModel property) async {
    final prefs = await SharedPreferences.getInstance();
    final item = {
      ...property.toJson(),
      'visited_at': DateTime.now().toIso8601String(),
    };

    List<dynamic> existing;
    try {
      existing =
          jsonDecode(prefs.getString(_recentlyVisitedKey) ?? '[]') as List;
    } catch (_) {
      existing = [];
    }

    final next = [
      item,
      ...existing.where((entry) {
        return entry is Map<String, dynamic>
            ? entry['property_id'] != property.propertyId
            : (entry is Map
                ? entry['property_id'] != property.propertyId
                : true);
      }),
    ].take(10).toList();

    await prefs.setString(_recentlyVisitedKey, jsonEncode(next));
  }

  Future<void> _fetchBlockedDatesAndReviews() async {
    setState(() {
      _loadingReviews = true;
    });
    final propertyProvider =
        Provider.of<PropertyProvider>(context, listen: false);
    final blocked = await propertyProvider.getBlockedDates(widget.propertyId);
    final reviewsData =
        await propertyProvider.getPropertyReviews(widget.propertyId);
    setState(() {
      _blockedDatesList = blocked;
      if (reviewsData != null) {
        _reviewsList =
            List<Map<String, dynamic>>.from(reviewsData['reviews'] ?? []);
        _reviewsSummary = reviewsData['summary'];
      }
      _loadingReviews = false;
    });
  }

  @override
  void dispose() {
    _couponController.dispose();
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _selectCheckIn(BuildContext context) async {
    final propertyProvider =
        Provider.of<PropertyProvider>(context, listen: false);
    final prop = propertyProvider.currentProperty;
    final isEvent = prop?.category.toLowerCase() == 'event_venue';

    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppTheme.primary,
              onPrimary: Colors.white,
              onSurface: AppTheme.charcoal,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _checkInDate = picked;
        if (isEvent) {
          _checkOutDate = picked;
        } else if (_checkOutDate != null &&
            _checkOutDate!.isBefore(_checkInDate!)) {
          _checkOutDate = null;
        }
      });
    }
  }

  Future<void> _selectCheckOut(BuildContext context) async {
    if (_checkInDate == null) return;
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _checkInDate!.add(const Duration(days: 1)),
      firstDate: _checkInDate!.add(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppTheme.primary,
              onPrimary: Colors.white,
              onSurface: AppTheme.charcoal,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _checkOutDate = picked;
      });
    }
  }

  Future<void> _handleBooking(
      BuildContext context, double pricePerNight) async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (!auth.isAuthenticated) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please sign in to book this property.'),
          backgroundColor: AppTheme.primary,
        ),
      );
      final loggedIn = await Navigator.push<bool>(
        context,
        MaterialPageRoute(
          builder: (context) => const LoginScreen(popOnSuccess: true),
        ),
      );
      if (loggedIn == true && context.mounted) {
        _handleBooking(context, pricePerNight);
      }
      return;
    }

    final userRole = auth.currentUser?.role.toLowerCase().trim();
    if (userRole != 'guest') {
      await showDialog<void>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Text(
            'Guest Booking Only',
            style: GoogleFonts.manrope(
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoal,
            ),
          ),
          content: Text(
            'Property booking is available only for guest accounts. '
            'Your current role is ${auth.currentUser?.role ?? 'user'}. '
            'Please sign in with a guest account to continue booking.',
            style: GoogleFonts.manrope(
              color: AppTheme.charcoalMuted,
              height: 1.5,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: Text(
                'OK',
                style: GoogleFonts.manrope(
                  color: AppTheme.primary,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
      );
      return;
    }

    final propertyProvider =
        Provider.of<PropertyProvider>(context, listen: false);
    final prop = propertyProvider.currentProperty;
    final isEvent = prop?.category.toLowerCase() == 'event_venue';

    if (_checkInDate == null || _checkOutDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(isEvent
              ? 'Please select event date'
              : 'Please select check-in and check-out dates'),
          backgroundColor: AppTheme.primary,
        ),
      );
      return;
    }

    final bookingProvider =
        Provider.of<BookingProvider>(context, listen: false);
    final dateFormat = DateFormat('yyyy-MM-dd');

    final Map<String, dynamic> bookingData = {
      'property_id': widget.propertyId,
      'check_in_date': dateFormat.format(_checkInDate!),
      'check_out_date': dateFormat.format(_checkOutDate!),
      'number_of_guests': _guestCount,
      'payment_type': isEvent ? _paymentType : 'full',
    };

    if (isEvent) {
      bookingData['selected_slot'] = _selectedSlot;
      bookingData['food_preference'] = _foodPreference;
    }

    final booking = await bookingProvider.createBooking(bookingData);

    if (booking != null && context.mounted) {
      final double displayPayable = (booking.paymentType == 'advance' &&
              (booking.advanceAmount ?? 0.0) > 0.0)
          ? booking.advanceAmount!
          : booking.totalAmount;
      _showPaymentSheet(context, booking.bookingId, displayPayable);
    } else if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to create booking. Property might be blocked.'),
          backgroundColor: AppTheme.primary,
        ),
      );
    }
  }

  void _showPaymentSheet(
      BuildContext context, String bookingId, double totalAmount) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            top: 24,
            left: 24,
            right: 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppTheme.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Confirm & Pay',
                style: GoogleFonts.manrope(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.charcoal,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.stone,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Total Amount Payable',
                      style: GoogleFonts.manrope(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.charcoalLight,
                      ),
                    ),
                    Text(
                      '₹${NumberFormat('#,##,###').format(totalAmount)}',
                      style: GoogleFonts.manrope(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.primary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _couponController,
                      style: GoogleFonts.manrope(fontSize: 14),
                      decoration: InputDecoration(
                        hintText: 'Enter Coupon Code',
                        hintStyle:
                            GoogleFonts.manrope(color: AppTheme.charcoalMuted),
                        filled: true,
                        fillColor: AppTheme.stone,
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: () async {
                      final bookingProvider =
                          Provider.of<BookingProvider>(context, listen: false);
                      final success = await bookingProvider.applyCoupon(
                          bookingId, _couponController.text.trim());
                      if (success && context.mounted) {
                        Navigator.pop(context);
                        _showPaymentSheet(context, bookingId,
                            bookingProvider.currentBooking!.totalAmount);
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.secondary,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 12),
                    ),
                    child: const Text('Apply'),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () async {
                  final success =
                      await Provider.of<BookingProvider>(context, listen: false)
                          .mockPay(bookingId);
                  if (success && context.mounted) {
                    Navigator.pop(context); // Close sheet
                    Navigator.pop(context); // Close details screen
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Payment Successful! Booking confirmed.'),
                        backgroundColor: Colors.green,
                      ),
                    );
                  }
                },
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: AppTheme.primary,
                ),
                child: Text(
                  'Pay via Simulated UPI (Mock)',
                  style: GoogleFonts.manrope(fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        );
      },
    );
  }

  IconData _getAmenityIcon(String amenity) {
    switch (amenity.toLowerCase().trim()) {
      case 'wifi':
        return Icons.wifi;
      case 'pool':
      case 'swimming pool':
        return Icons.pool;
      case 'ac':
      case 'air conditioning':
        return Icons.ac_unit;
      case 'parking':
        return Icons.local_parking;
      case 'kitchen':
        return Icons.kitchen;
      case 'tv':
        return Icons.tv;
      case 'fireplace':
        return Icons.fireplace;
      case 'rooftop':
        return Icons.roofing;
      case 'bar':
        return Icons.local_bar;
      case 'av_system':
        return Icons.volume_up;
      case 'catering':
        return Icons.restaurant;
      case 'gym':
        return Icons.fitness_center;
      default:
        return Icons.check_circle_outline;
    }
  }

  Widget _buildEventVenueOptions(PropertyModel prop) {
    if (prop.category.toLowerCase() != 'event_venue') {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 24),
        Text(
          'CATERING & FOOD PREFERENCE',
          style: GoogleFonts.manrope(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: AppTheme.charcoal,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.border, width: 1.5),
          ),
          child: Column(
            children: [
              // Vegetarian option
              InkWell(
                onTap: () => setState(() => _foodPreference = 'veg'),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _foodPreference == 'veg'
                        ? Colors.green.withValues(alpha: 0.05)
                        : Colors.transparent,
                    border: Border.all(
                      color: _foodPreference == 'veg'
                          ? Colors.green
                          : AppTheme.border,
                      width: 1.5,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _foodPreference == 'veg'
                            ? Icons.radio_button_checked
                            : Icons.radio_button_off,
                        color: _foodPreference == 'veg'
                            ? Colors.green
                            : AppTheme.charcoalMuted,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Vegetarian Menu',
                              style: GoogleFonts.manrope(
                                fontWeight: FontWeight.bold,
                                color: AppTheme.charcoal,
                                fontSize: 14,
                              ),
                            ),
                            Text(
                              'Standard catering service included',
                              style: GoogleFonts.manrope(
                                color: AppTheme.charcoalMuted,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        '₹${(prop.vegPrice ?? 0).toStringAsFixed(0)} / Plate',
                        style: GoogleFonts.manrope(
                          fontWeight: FontWeight.w800,
                          color: AppTheme.charcoal,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              // Non-Vegetarian option
              InkWell(
                onTap: () => setState(() => _foodPreference = 'non_veg'),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _foodPreference == 'non_veg'
                        ? Colors.red.withValues(alpha: 0.05)
                        : Colors.transparent,
                    border: Border.all(
                      color: _foodPreference == 'non_veg'
                          ? Colors.red
                          : AppTheme.border,
                      width: 1.5,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _foodPreference == 'non_veg'
                            ? Icons.radio_button_checked
                            : Icons.radio_button_off,
                        color: _foodPreference == 'non_veg'
                            ? Colors.red
                            : AppTheme.charcoalMuted,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Non-Vegetarian Menu',
                              style: GoogleFonts.manrope(
                                fontWeight: FontWeight.bold,
                                color: AppTheme.charcoal,
                                fontSize: 14,
                              ),
                            ),
                            Text(
                              'Standard catering service included',
                              style: GoogleFonts.manrope(
                                color: AppTheme.charcoalMuted,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        '₹${(prop.nonVegPrice ?? 0).toStringAsFixed(0)} / Plate',
                        style: GoogleFonts.manrope(
                          fontWeight: FontWeight.w800,
                          color: AppTheme.charcoal,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Text(
          'SELECT TIMING SLOT',
          style: GoogleFonts.manrope(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: AppTheme.charcoal,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.border, width: 1.5),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _selectedSlot,
              isExpanded: true,
              style: GoogleFonts.manrope(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppTheme.charcoal,
              ),
              items: const [
                DropdownMenuItem(
                  value: 'morning',
                  child: Text('Morning Slot (9 AM - 3 PM)'),
                ),
                DropdownMenuItem(
                  value: 'evening',
                  child: Text('Evening Slot (5 PM - 11 PM)'),
                ),
                DropdownMenuItem(
                  value: 'full_day',
                  child: Text('Full Day (9 AM - 11 PM)'),
                ),
              ],
              onChanged: (val) {
                setState(() {
                  _selectedSlot = val ?? 'morning';
                });
              },
            ),
          ),
        ),
        const SizedBox(height: 24),
        Text(
          'PAYMENT PREFERENCE',
          style: GoogleFonts.manrope(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: AppTheme.charcoal,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: InkWell(
                onTap: () => setState(() => _paymentType = 'full'),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    color: _paymentType == 'full'
                        ? AppTheme.primary
                        : Colors.white,
                    border: Border.all(color: AppTheme.primary, width: 1.5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      'Full Payment',
                      style: GoogleFonts.manrope(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: _paymentType == 'full'
                            ? Colors.white
                            : AppTheme.primary,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: InkWell(
                onTap: () => setState(() => _paymentType = 'advance'),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    color: _paymentType == 'advance'
                        ? AppTheme.primary
                        : Colors.white,
                    border: Border.all(color: AppTheme.primary, width: 1.5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      'Pay 50% Advance',
                      style: GoogleFonts.manrope(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: _paymentType == 'advance'
                            ? Colors.white
                            : AppTheme.primary,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildVideoSection(PropertyModel prop) {
    final hasVideo = prop.videoUrl != null && prop.videoUrl!.isNotEmpty;
    final hasShort =
        prop.youtubeShortUrl != null && prop.youtubeShortUrl!.isNotEmpty;
    final hasLong =
        prop.youtubeLongUrl != null && prop.youtubeLongUrl!.isNotEmpty;

    if (!hasVideo && !hasShort && !hasLong) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Videos & Tours',
          style: GoogleFonts.manrope(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: AppTheme.charcoal,
          ),
        ),
        const SizedBox(height: 12),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          child: Row(
            children: [
              if (hasVideo)
                _buildVideoCard(
                  title: 'Property Video Clip',
                  subtitle: 'Walkthrough Video',
                  icon: Icons.play_circle_fill,
                  color: AppTheme.primary,
                  url: prop.videoUrl!,
                ),
              if (hasShort)
                _buildVideoCard(
                  title: 'YouTube Short',
                  subtitle: 'Quick Video Tour',
                  icon: Icons.video_library,
                  color: Colors.redAccent,
                  url: prop.youtubeShortUrl!,
                ),
              if (hasLong)
                _buildVideoCard(
                  title: 'YouTube Video',
                  subtitle: 'Full Details & Review',
                  icon: Icons.movie_filter_outlined,
                  color: Colors.red,
                  url: prop.youtubeLongUrl!,
                ),
            ],
          ),
        ),
        const SizedBox(height: 28),
      ],
    );
  }

  Widget _buildVideoCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required String url,
  }) {
    return Container(
      width: 220,
      margin: const EdgeInsets.only(right: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(15),
        child: Stack(
          children: [
            Container(
              height: 120,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    color.withValues(alpha: 0.15),
                    color.withValues(alpha: 0.3),
                  ],
                ),
              ),
              child: Center(
                child: Icon(
                  icon,
                  size: 48,
                  color: color,
                ),
              ),
            ),
            Positioned.fill(
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () async {
                    final uri = Uri.parse(url);
                    if (await canLaunchUrl(uri)) {
                      await launchUrl(uri,
                          mode: LaunchMode.externalApplication);
                    } else {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                              content: Text('Could not open video URL: $url')),
                        );
                      }
                    }
                  },
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 120),
              child: Container(
                padding: const EdgeInsets.all(12),
                color: Colors.white,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.manrope(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: AppTheme.charcoal,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Text(
                          subtitle,
                          style: GoogleFonts.manrope(
                            fontSize: 10,
                            color: AppTheme.charcoalMuted,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const Spacer(),
                        const Icon(Icons.open_in_new,
                            size: 12, color: AppTheme.charcoalMuted),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  @override
  Widget build(BuildContext context) {
    final propertyProvider = Provider.of<PropertyProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final prop = propertyProvider.currentProperty;

    if (propertyProvider.isLoading || prop == null) {
      return const Scaffold(
        backgroundColor: Colors.white,
        body: Center(
          child: CircularProgressIndicator(color: AppTheme.primary),
        ),
      );
    }

    final isCommercial = prop.category.toLowerCase() == 'commercial';
    final isEvent = prop.category.toLowerCase() == 'event_venue';
    final showPerDay = isCommercial || isEvent;

    final images = prop.images.isNotEmpty
        ? prop.images
        : [
            'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
          ];

    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // 1. SCROLLABLE CONTENT
          Positioned.fill(
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(
                  bottom: 110), // Room for sticky booking bar
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // IMAGE CAROUSEL SECTION
                  Stack(
                    children: [
                      SizedBox(
                        height: 320,
                        child: PageView.builder(
                          controller: _pageController,
                          onPageChanged: (index) {
                            setState(() {
                              _currentImageIndex = index;
                            });
                          },
                          itemCount: images.length,
                          itemBuilder: (context, index) {
                            return GestureDetector(
                              onTap: () => _openImageGallery(
                                images,
                                initialIndex: index,
                              ),
                              child: Image.network(
                                images[index],
                                fit: BoxFit.cover,
                                loadingBuilder:
                                    (context, child, loadingProgress) {
                                  if (loadingProgress == null) return child;
                                  return Container(
                                    color: AppTheme.stone,
                                    alignment: Alignment.center,
                                    child: const CircularProgressIndicator(
                                      color: AppTheme.primary,
                                    ),
                                  );
                                },
                                errorBuilder: (context, _, __) => Container(
                                  color: AppTheme.stone,
                                  child: const Icon(Icons.image_not_supported,
                                      size: 60, color: AppTheme.charcoalMuted),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                      // Gradient Overlay for Title/Actions contrast
                      Positioned.fill(
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.black.withValues(alpha: 0.4),
                                Colors.transparent,
                                Colors.black.withValues(alpha: 0.3),
                              ],
                              stops: const [0.0, 0.5, 1.0],
                            ),
                          ),
                        ),
                      ),
                      // Slide Index indicator badge
                      Positioned(
                        right: 16,
                        bottom: 36, // leave room for card overlap
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.6),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '${_currentImageIndex + 1}/${images.length}',
                            style: GoogleFonts.manrope(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                      if (images.length > 1)
                        Positioned(
                          left: 16,
                          bottom: 36,
                          child: GestureDetector(
                            onTap: () => _openImageGallery(
                              images,
                              initialIndex: _currentImageIndex,
                            ),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 8,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.92),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons.photo_library_outlined,
                                    size: 16,
                                    color: AppTheme.charcoal,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'View all photos',
                                    style: GoogleFonts.manrope(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: AppTheme.charcoal,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),

                  // DETAILS & CONTAINER CONTENT
                  Transform.translate(
                    offset: const Offset(0, -24),
                    child: Container(
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        borderRadius:
                            BorderRadius.vertical(top: Radius.circular(28)),
                      ),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 24, vertical: 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 7,
                                ),
                                decoration: BoxDecoration(
                                  color:
                                      AppTheme.primary.withValues(alpha: 0.10),
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  prop.category.toUpperCase(),
                                  style: GoogleFonts.manrope(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    color: AppTheme.primary,
                                    letterSpacing: 1.1,
                                  ),
                                ),
                              ),
                              if (_isSignatureSeriesProperty(prop))
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 7,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.black.withValues(alpha: 0.92),
                                    borderRadius: BorderRadius.circular(999),
                                    border: Border.all(
                                      color: const Color(0xFFD4AF37),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(
                                        Icons.workspace_premium_rounded,
                                        size: 13,
                                        color: Color(0xFFD4AF37),
                                      ),
                                      const SizedBox(width: 5),
                                      Text(
                                        'SIGNATURE SERIES',
                                        style: GoogleFonts.manrope(
                                          fontSize: 9,
                                          fontWeight: FontWeight.w800,
                                          color: const Color(0xFFD4AF37),
                                          letterSpacing: 1.0,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          // Title
                          Text(
                            prop.title,
                            style: GoogleFonts.manrope(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.charcoal,
                              height: 1.25,
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Subtitle & Info
                          Text(
                            '${prop.maxGuests} guests · ${prop.bhkType.toUpperCase()} · ${prop.areaSqft.toStringAsFixed(0)} Sqft',
                            style: GoogleFonts.manrope(
                              fontSize: 13,
                              color: AppTheme.charcoalLight,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Small Guest Favourite Badge
                          if (prop.rating != null && prop.rating! > 0) ...[
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.grey.shade200),
                              ),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceEvenly,
                                children: [
                                  Column(
                                    children: [
                                      Row(
                                        children: [
                                          Text(
                                            prop.rating!.toStringAsFixed(1),
                                            style: GoogleFonts.manrope(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w800,
                                              color: AppTheme.charcoal,
                                            ),
                                          ),
                                          const SizedBox(width: 2),
                                          const Icon(Icons.star,
                                              size: 14,
                                              color: AppTheme.charcoal),
                                        ],
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        List.generate(
                                            prop.rating!.round().clamp(1, 5),
                                            (index) => '★').join(''),
                                        style: GoogleFonts.manrope(
                                          fontSize: 8,
                                          color: AppTheme.charcoalMuted,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Container(
                                      width: 1,
                                      height: 28,
                                      color: Colors.grey.shade200),
                                  Column(
                                    children: [
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(
                                              Icons
                                                  .keyboard_double_arrow_left_rounded,
                                              size: 14,
                                              color: AppTheme.charcoal),
                                          Text(
                                            'Guest favourite',
                                            style: GoogleFonts.manrope(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w800,
                                              color: AppTheme.charcoal,
                                            ),
                                          ),
                                          const Icon(
                                              Icons
                                                  .keyboard_double_arrow_right_rounded,
                                              size: 14,
                                              color: AppTheme.charcoal),
                                        ],
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Highly rated stay',
                                        style: GoogleFonts.manrope(
                                          fontSize: 10,
                                          color: AppTheme.charcoalMuted,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Container(
                                      width: 1,
                                      height: 28,
                                      color: Colors.grey.shade200),
                                  Column(
                                    children: [
                                      Text(
                                        (prop.reviewCount ?? 0).toString(),
                                        style: GoogleFonts.manrope(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w800,
                                          color: AppTheme.charcoal,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Reviews',
                                        style: GoogleFonts.manrope(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: AppTheme.charcoalMuted,
                                          decoration: TextDecoration.underline,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 20),
                          ],

                          const Divider(height: 1),
                          const SizedBox(height: 20),

                          _buildQuickFactsGrid(prop, showPerDay),
                          const SizedBox(height: 20),

                          const Divider(height: 1),
                          const SizedBox(height: 20),

                          // Exceptional key features list
                          _buildPremiumHighlight(
                            Icons.login_rounded,
                            'Exceptional check-in experience',
                            'Recent guests gave the check-in process a 5-star rating.',
                          ),
                          _buildPremiumHighlight(
                            Icons.location_on_outlined,
                            'Great location',
                            'Guests who stayed here in the past year loved the location.',
                          ),
                          _buildPremiumHighlight(
                            prop.petFriendly
                                ? Icons.pets_outlined
                                : Icons.local_parking_rounded,
                            prop.petFriendly
                                ? 'Pet friendly environment'
                                : 'Park for free',
                            prop.petFriendly
                                ? 'Pets are welcomed with open arms at this listing.'
                                : 'This is one of the few places in the area with free parking.',
                          ),
                          const SizedBox(height: 24),

                          const Divider(height: 1),
                          const SizedBox(height: 24),

                          // Description / About
                          Text(
                            prop.description,
                            maxLines: _isDescriptionExpanded ? null : 4,
                            overflow: _isDescriptionExpanded
                                ? TextOverflow.visible
                                : TextOverflow.ellipsis,
                            style: GoogleFonts.manrope(
                              fontSize: 14,
                              color: AppTheme.charcoalLight,
                              height: 1.6,
                            ),
                          ),
                          const SizedBox(height: 12),
                          InkWell(
                            onTap: () {
                              setState(() {
                                _isDescriptionExpanded =
                                    !_isDescriptionExpanded;
                              });
                            },
                            child: Row(
                              children: [
                                Text(
                                  _isDescriptionExpanded
                                      ? 'Show less'
                                      : 'Read more',
                                  style: GoogleFonts.manrope(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.charcoal,
                                    decoration: TextDecoration.underline,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Icon(
                                  _isDescriptionExpanded
                                      ? Icons.keyboard_arrow_up
                                      : Icons.keyboard_arrow_down,
                                  size: 16,
                                  color: AppTheme.charcoal,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),

                          _buildVideoSection(prop),

                          const Divider(height: 1),
                          const SizedBox(height: 24),

                          // Cook & Taxi Services Section
                          if (prop.hasCook ||
                              prop.hasSelfCook ||
                              prop.hasTaxi) ...[
                            Text(
                              'Services & Kitchen',
                              style: GoogleFonts.manrope(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.charcoal,
                              ),
                            ),
                            const SizedBox(height: 12),
                            if (prop.hasCook) ...[
                              Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: AppTheme.stone,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                      color: AppTheme.border, width: 1),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: AppTheme.primary
                                            .withValues(alpha: 0.1),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(
                                        Icons.restaurant,
                                        color: AppTheme.primary,
                                        size: 24,
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Cook Available',
                                            style: GoogleFonts.manrope(
                                              fontWeight: FontWeight.bold,
                                              color: AppTheme.charcoal,
                                              fontSize: 14,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'Personal cook service is available at this property.',
                                            style: GoogleFonts.manrope(
                                              color: AppTheme.charcoalMuted,
                                              fontSize: 12,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Text(
                                      '₹${(prop.cookPrice ?? 0.0).toStringAsFixed(0)}/day',
                                      style: GoogleFonts.manrope(
                                        fontWeight: FontWeight.w800,
                                        color: AppTheme.primary,
                                        fontSize: 15,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (prop.hasSelfCook || prop.hasTaxi)
                                const SizedBox(height: 12),
                            ],
                            if (prop.hasSelfCook) ...[
                              Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: AppTheme.stone,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                      color: AppTheme.border, width: 1),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF10B981)
                                            .withValues(alpha: 0.1),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(
                                        Icons.soup_kitchen,
                                        color: Color(0xFF10B981),
                                        size: 24,
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Self Cooking Allowed',
                                            style: GoogleFonts.manrope(
                                              fontWeight: FontWeight.bold,
                                              color: AppTheme.charcoal,
                                              fontSize: 14,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'Guests can use the kitchen facility to cook meals.',
                                            style: GoogleFonts.manrope(
                                              color: AppTheme.charcoalMuted,
                                              fontSize: 12,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Text(
                                      'Free',
                                      style: GoogleFonts.manrope(
                                        fontWeight: FontWeight.w800,
                                        color: const Color(0xFF10B981),
                                        fontSize: 15,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (prop.hasTaxi) const SizedBox(height: 12),
                            ],
                            if (prop.hasTaxi) ...[
                              Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: AppTheme.stone,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                      color: AppTheme.border, width: 1),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color:
                                            Colors.amber.withValues(alpha: 0.1),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(
                                        Icons.local_taxi_rounded,
                                        color: Colors.amber,
                                        size: 24,
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Taxi Service Available',
                                            style: GoogleFonts.manrope(
                                              fontWeight: FontWeight.bold,
                                              color: AppTheme.charcoal,
                                              fontSize: 14,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'Taxi or transportation service is available at this property.',
                                            style: GoogleFonts.manrope(
                                              color: AppTheme.charcoalMuted,
                                              fontSize: 12,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Text(
                                      'Available',
                                      style: GoogleFonts.manrope(
                                        fontWeight: FontWeight.w800,
                                        color: Colors.amber.shade700,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                            const SizedBox(height: 24),
                            const Divider(height: 1),
                            const SizedBox(height: 24),
                          ],

                          // What this place offers (Amenities)
                          Text(
                            'What this place offers',
                            style: GoogleFonts.manrope(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.charcoal,
                            ),
                          ),
                          const SizedBox(height: 16),
                          if (prop.amenities.isEmpty)
                            Text(
                              'No specific amenities listed.',
                              style: GoogleFonts.manrope(
                                  color: AppTheme.charcoalMuted),
                            )
                          else
                            GridView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              gridDelegate:
                                  const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                childAspectRatio: 3.5,
                                crossAxisSpacing: 16,
                                mainAxisSpacing: 12,
                              ),
                              itemCount: prop.amenities.length > 6
                                  ? 6
                                  : prop.amenities.length,
                              itemBuilder: (context, index) {
                                final amenity = prop.amenities[index];
                                return Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: AppTheme.stone,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Icon(
                                        _getAmenityIcon(amenity),
                                        color: AppTheme.primary,
                                        size: 18,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Text(
                                        amenity.toUpperCase(),
                                        style: GoogleFonts.manrope(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                          color: AppTheme.charcoal,
                                        ),
                                      ),
                                    ),
                                  ],
                                );
                              },
                            ),
                          if (prop.amenities.length > 6) ...[
                            const SizedBox(height: 16),
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton(
                                onPressed: () {
                                  // Simple bottom sheet to show all amenities
                                  showModalBottomSheet(
                                    context: context,
                                    shape: const RoundedRectangleBorder(
                                      borderRadius: BorderRadius.vertical(
                                          top: Radius.circular(24)),
                                    ),
                                    builder: (context) {
                                      return Padding(
                                        padding: const EdgeInsets.all(24.0),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'What this place offers',
                                              style: GoogleFonts.manrope(
                                                fontSize: 20,
                                                fontWeight: FontWeight.w800,
                                                color: AppTheme.charcoal,
                                              ),
                                            ),
                                            const SizedBox(height: 20),
                                            Expanded(
                                              child: ListView.separated(
                                                itemCount:
                                                    prop.amenities.length,
                                                separatorBuilder:
                                                    (context, index) =>
                                                        const Divider(),
                                                itemBuilder: (context, index) {
                                                  final amenity =
                                                      prop.amenities[index];
                                                  return ListTile(
                                                    leading: Icon(
                                                        _getAmenityIcon(
                                                            amenity),
                                                        color:
                                                            AppTheme.primary),
                                                    title: Text(
                                                      amenity.toUpperCase(),
                                                      style:
                                                          GoogleFonts.manrope(
                                                        fontWeight:
                                                            FontWeight.w600,
                                                        color:
                                                            AppTheme.charcoal,
                                                      ),
                                                    ),
                                                  );
                                                },
                                              ),
                                            ),
                                          ],
                                        ),
                                      );
                                    },
                                  );
                                },
                                style: OutlinedButton.styleFrom(
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 14),
                                  side: const BorderSide(
                                      color: AppTheme.charcoal),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                                child: Text(
                                  'Show all ${prop.amenities.length} amenities',
                                  style: GoogleFonts.manrope(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.charcoal,
                                  ),
                                ),
                              ),
                            ),
                          ],
                          const SizedBox(height: 24),

                          const Divider(height: 1),
                          const SizedBox(height: 24),

                          // Location block
                          Text(
                            'Location & neighbourhood',
                            style: GoogleFonts.manrope(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.charcoal,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${prop.address}, ${prop.city}, ${prop.state}, India',
                            style: GoogleFonts.manrope(
                              fontSize: 14,
                              color: AppTheme.charcoalLight,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Container(
                            height: 200,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(16),
                              image: const DecorationImage(
                                image: NetworkImage(
                                    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80'),
                                fit: BoxFit.cover,
                              ),
                            ),
                            child: Stack(
                              children: [
                                Positioned.fill(
                                  child: Container(
                                    decoration: BoxDecoration(
                                      gradient: LinearGradient(
                                        begin: Alignment.topCenter,
                                        end: Alignment.bottomCenter,
                                        colors: [
                                          Colors.black.withValues(alpha: 0.12),
                                          Colors.black.withValues(alpha: 0.28),
                                        ],
                                      ),
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                  ),
                                ),
                                Positioned(
                                  left: 16,
                                  top: 16,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 12, vertical: 8),
                                    decoration: BoxDecoration(
                                      color:
                                          Colors.white.withValues(alpha: 0.92),
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(
                                          Icons.satellite_alt_rounded,
                                          size: 16,
                                          color: AppTheme.charcoal,
                                        ),
                                        const SizedBox(width: 6),
                                        Text(
                                          'Satellite view',
                                          style: GoogleFonts.manrope(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w800,
                                            color: AppTheme.charcoal,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                Positioned(
                                  left: 16,
                                  right: 16,
                                  bottom: 16,
                                  child: Container(
                                    padding: const EdgeInsets.all(14),
                                    decoration: BoxDecoration(
                                      color:
                                          Colors.white.withValues(alpha: 0.92),
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                    child: Row(
                                      children: [
                                        Container(
                                          width: 44,
                                          height: 44,
                                          decoration: const BoxDecoration(
                                            color: AppTheme.primary,
                                            shape: BoxShape.circle,
                                          ),
                                          child: const Icon(
                                            Icons.location_on_rounded,
                                            color: Colors.white,
                                            size: 22,
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                prop.city,
                                                style: GoogleFonts.manrope(
                                                  fontSize: 14,
                                                  fontWeight: FontWeight.w800,
                                                  color: AppTheme.charcoal,
                                                ),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                '${prop.state} • Pin ${prop.pinCode}',
                                                style: GoogleFonts.manrope(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w600,
                                                  color: AppTheme.charcoalMuted,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        OutlinedButton(
                                          onPressed: () =>
                                              _openPropertyMap(prop),
                                          style: OutlinedButton.styleFrom(
                                            side: const BorderSide(
                                                color: AppTheme.charcoal),
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 14, vertical: 10),
                                            shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(12),
                                            ),
                                          ),
                                          child: Text(
                                            'Open Map',
                                            style: GoogleFonts.manrope(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w800,
                                              color: AppTheme.charcoal,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 32),

                          const Divider(height: 1),
                          const SizedBox(height: 32),

                          // Large Wreath Guest Favourite Banner
                          if (prop.rating != null && prop.rating! > 0) ...[
                            Center(
                              child: Column(
                                children: [
                                  LaurelWreathWidget(
                                      rating: prop.rating ?? 4.95),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Guest favourite',
                                    style: GoogleFonts.manrope(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w800,
                                      color: AppTheme.charcoal,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'One of the most loved homes on X-Space360,\nbased on ratings, reviews, and reliability',
                                    textAlign: TextAlign.center,
                                    style: GoogleFonts.manrope(
                                      fontSize: 12,
                                      color: AppTheme.charcoalMuted,
                                      fontWeight: FontWeight.w500,
                                      height: 1.4,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 32),
                            const Divider(height: 1),
                            const SizedBox(height: 32),
                          ],

                          // Stay Dates Selection Card
                          Text(
                            isEvent ? 'Select event date' : 'Select stay dates',
                            style: GoogleFonts.manrope(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.charcoal,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                  color: AppTheme.border, width: 1.5),
                            ),
                            child: Column(
                              children: [
                                // Dates row
                                Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: InkWell(
                                          onTap: () => _selectCheckIn(context),
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                isEvent
                                                    ? 'EVENT DATE'
                                                    : 'CHECK-IN',
                                                style: GoogleFonts.manrope(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.w800,
                                                  color: AppTheme.charcoalMuted,
                                                ),
                                              ),
                                              const SizedBox(height: 6),
                                              Row(
                                                children: [
                                                  const Icon(
                                                      Icons.calendar_today,
                                                      size: 14,
                                                      color: AppTheme.primary),
                                                  const SizedBox(width: 6),
                                                  Text(
                                                    _checkInDate == null
                                                        ? 'Add Date'
                                                        : DateFormat(
                                                                'dd-MM-yyyy')
                                                            .format(
                                                                _checkInDate!),
                                                    style: GoogleFonts.manrope(
                                                      fontSize: 14,
                                                      fontWeight:
                                                          FontWeight.w700,
                                                      color: _checkInDate ==
                                                              null
                                                          ? AppTheme.primary
                                                          : AppTheme.charcoal,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                      if (!isEvent) ...[
                                        Container(
                                            width: 1.5,
                                            height: 40,
                                            color: AppTheme.border),
                                        const SizedBox(width: 16),
                                        Expanded(
                                          child: InkWell(
                                            onTap: _checkInDate == null
                                                ? null
                                                : () =>
                                                    _selectCheckOut(context),
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  'CHECK-OUT',
                                                  style: GoogleFonts.manrope(
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.w800,
                                                    color: _checkInDate == null
                                                        ? AppTheme.charcoalMuted
                                                            .withValues(
                                                                alpha: 0.5)
                                                        : AppTheme
                                                            .charcoalMuted,
                                                  ),
                                                ),
                                                const SizedBox(height: 6),
                                                Row(
                                                  children: [
                                                    Icon(
                                                      Icons.calendar_today,
                                                      size: 14,
                                                      color: _checkInDate ==
                                                              null
                                                          ? AppTheme
                                                              .charcoalMuted
                                                              .withValues(
                                                                  alpha: 0.4)
                                                          : AppTheme.primary,
                                                    ),
                                                    const SizedBox(width: 6),
                                                    Text(
                                                      _checkOutDate == null
                                                          ? 'Add Date'
                                                          : DateFormat(
                                                                  'dd-MM-yyyy')
                                                              .format(
                                                                  _checkOutDate!),
                                                      style:
                                                          GoogleFonts.manrope(
                                                        fontSize: 14,
                                                        fontWeight:
                                                            FontWeight.w700,
                                                        color: _checkOutDate ==
                                                                null
                                                            ? (_checkInDate ==
                                                                    null
                                                                ? AppTheme
                                                                    .charcoalMuted
                                                                    .withValues(
                                                                        alpha:
                                                                            0.5)
                                                                : AppTheme
                                                                    .primary)
                                                            : AppTheme.charcoal,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),

                                const Divider(
                                    height: 1,
                                    thickness: 1.5,
                                    color: AppTheme.border),

                                // Guests row
                                Padding(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 16, vertical: 12),
                                  child: Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Row(
                                          children: [
                                            Icon(
                                              isCommercial
                                                  ? Icons.groups_outlined
                                                  : Icons.people_outline,
                                              color: AppTheme.charcoalLight,
                                              size: 22,
                                            ),
                                            const SizedBox(width: 12),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment:
                                                    CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    isCommercial
                                                        ? 'TOTAL STAFF'
                                                        : 'TOTAL GUESTS',
                                                    style: GoogleFonts.manrope(
                                                      fontSize: 10,
                                                      fontWeight:
                                                          FontWeight.w800,
                                                      color: AppTheme
                                                          .charcoalMuted,
                                                    ),
                                                  ),
                                                  const SizedBox(height: 4),
                                                  if (isEvent)
                                                    DropdownButton<int>(
                                                      value: _guestCount,
                                                      underline:
                                                          const SizedBox(),
                                                      icon: const Icon(
                                                          Icons.arrow_drop_down,
                                                          color:
                                                              AppTheme.primary),
                                                      style:
                                                          GoogleFonts.manrope(
                                                        fontSize: 15,
                                                        fontWeight:
                                                            FontWeight.w700,
                                                        color:
                                                            AppTheme.charcoal,
                                                      ),
                                                      items: const [
                                                        DropdownMenuItem(
                                                            value: 100,
                                                            child: Text(
                                                                'Less than 100')),
                                                        DropdownMenuItem(
                                                            value: 200,
                                                            child: Text(
                                                                '100-200')),
                                                        DropdownMenuItem(
                                                            value: 300,
                                                            child: Text(
                                                                '200-300')),
                                                        DropdownMenuItem(
                                                            value: 400,
                                                            child: Text(
                                                                '300-400')),
                                                        DropdownMenuItem(
                                                            value: 500,
                                                            child: Text(
                                                                '400-500')),
                                                        DropdownMenuItem(
                                                            value: 600,
                                                            child: Text(
                                                                'Greater than 500')),
                                                      ],
                                                      onChanged: (val) {
                                                        setState(() {
                                                          _guestCount =
                                                              val ?? 100;
                                                        });
                                                      },
                                                    )
                                                  else
                                                    Row(
                                                      children: [
                                                        InkWell(
                                                          onTap: _guestCount > 1
                                                              ? () => setState(() =>
                                                                  _guestCount--)
                                                              : null,
                                                          child: Container(
                                                            padding:
                                                                const EdgeInsets
                                                                    .all(4),
                                                            decoration:
                                                                BoxDecoration(
                                                              shape: BoxShape
                                                                  .circle,
                                                              border: Border.all(
                                                                  color: AppTheme
                                                                      .border),
                                                            ),
                                                            child: const Icon(
                                                                Icons.remove,
                                                                size: 14,
                                                                color: AppTheme
                                                                    .charcoal),
                                                          ),
                                                        ),
                                                        const SizedBox(
                                                            width: 12),
                                                        Text(
                                                          '$_guestCount',
                                                          style: GoogleFonts
                                                              .manrope(
                                                            fontSize: 16,
                                                            fontWeight:
                                                                FontWeight.w700,
                                                            color: AppTheme
                                                                .charcoal,
                                                          ),
                                                        ),
                                                        const SizedBox(
                                                            width: 12),
                                                        InkWell(
                                                          onTap: _guestCount <
                                                                  prop.maxGuests
                                                              ? () => setState(() =>
                                                                  _guestCount++)
                                                              : null,
                                                          child: Container(
                                                            padding:
                                                                const EdgeInsets
                                                                    .all(4),
                                                            decoration:
                                                                BoxDecoration(
                                                              shape: BoxShape
                                                                  .circle,
                                                              border: Border.all(
                                                                  color: AppTheme
                                                                      .border),
                                                            ),
                                                            child: const Icon(
                                                                Icons.add,
                                                                size: 14,
                                                                color: AppTheme
                                                                    .charcoal),
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      if (!isEvent)
                                        Text(
                                          isCommercial
                                              ? 'MAX ${prop.maxGuests} STAFF'
                                              : 'MAX ${prop.maxGuests}',
                                          style: GoogleFonts.manrope(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w800,
                                            color: AppTheme.primary,
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          _buildEventVenueOptions(prop),

                          // Inline Availability Calendar section
                          _buildAvailabilityCalendar(),

                          // Guest Reviews section
                          _buildReviewsSection(),
                          const SizedBox(height: 32),

                          const Divider(height: 1),
                          const SizedBox(height: 32),

                          _buildGuestAccessNote(),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 2. FLOATING BACK ACTION BUTTONS OVERLAY
          Positioned(
            top: MediaQuery.of(context).padding.top + 12,
            left: 16,
            right: 16,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Back Button
                InkWell(
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.9),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        )
                      ],
                    ),
                    child: const Icon(Icons.arrow_back,
                        color: AppTheme.charcoal, size: 20),
                  ),
                ),
                // Share & Favorite Buttons
                Row(
                  children: [
                    GestureDetector(
                      onTap: () => _showShareSheet(prop),
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.9),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.1),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            )
                          ],
                        ),
                        child: const Icon(Icons.share_outlined,
                            color: AppTheme.charcoal, size: 20),
                      ),
                    ),
                    const SizedBox(width: 12),
                    GestureDetector(
                      onTap: () {
                        propertyProvider.toggleWishlist(prop.propertyId);
                      },
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.9),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.1),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            )
                          ],
                        ),
                        child: Icon(
                          propertyProvider.isWishlisted(prop.propertyId)
                              ? Icons.favorite_rounded
                              : Icons.favorite_border_rounded,
                          color: propertyProvider.isWishlisted(prop.propertyId)
                              ? Colors.red
                              : AppTheme.charcoal,
                          size: 20,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // 3. STICKY BOTTOM RESERVATION BAR
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                border: const Border(
                    top: BorderSide(color: AppTheme.border, width: 1)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, -4),
                  )
                ],
              ),
              child: Row(
                children: [
                  // Price Tag
                  Expanded(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text(
                              '₹${NumberFormat('#,##,###').format(prop.pricePerNight * (auth.isPromoClaimed ? 0.9 : 1.0))}',
                              style: GoogleFonts.manrope(
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.charcoal,
                              ),
                            ),
                            Text(
                              showPerDay ? ' / day' : ' / night',
                              style: GoogleFonts.manrope(
                                fontSize: 13,
                                color: AppTheme.charcoalLight,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            if (auth.isPromoClaimed) ...[
                              const SizedBox(width: 6),
                              Text(
                                '₹${NumberFormat('#,##,###').format(prop.pricePerNight)}',
                                style: GoogleFonts.manrope(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.charcoalMuted,
                                  decoration: TextDecoration.lineThrough,
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 2),
                        InkWell(
                          onTap: () {
                            // pricing details logic or show info dialog
                          },
                          child: Text(
                            'View price breakup',
                            style: GoogleFonts.manrope(
                              fontSize: 12,
                              color: AppTheme.charcoal,
                              fontWeight: FontWeight.w700,
                              decoration: TextDecoration.underline,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Book Button
                  ElevatedButton(
                    onPressed: () =>
                        _handleBooking(context, prop.pricePerNight),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 40, vertical: 16),
                      backgroundColor: AppTheme.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      elevation: 0,
                    ),
                    child: Text(
                      isEvent ? 'Book Venue' : 'Book Now',
                      style: GoogleFonts.manrope(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Helper methods for availability calendar, date blocking and reviews

  bool _isDateBlocked(DateTime date) {
    final checkDateStr = DateFormat('yyyy-MM-dd').format(date);
    for (final block in _blockedDatesList) {
      final start = block['start_date'] as String;
      final end = block['end_date'] as String;
      if (checkDateStr.compareTo(start) >= 0 &&
          checkDateStr.compareTo(end) <= 0) {
        return true;
      }
    }
    return false;
  }

  void _onCalendarDayTap(DateTime date) {
    if (_isDateBlocked(date) ||
        date.isBefore(DateTime.now().subtract(const Duration(days: 1)))) {
      return;
    }
    setState(() {
      if (_checkInDate == null ||
          (_checkInDate != null && _checkOutDate != null)) {
        _checkInDate = date;
        _checkOutDate = null;
      } else if (_checkInDate != null && _checkOutDate == null) {
        if (date.isBefore(_checkInDate!)) {
          _checkInDate = date;
        } else {
          // Check if any date between _checkInDate and date is blocked
          bool hasBlock = false;
          DateTime temp = _checkInDate!.add(const Duration(days: 1));
          while (temp.isBefore(date)) {
            if (_isDateBlocked(temp)) {
              hasBlock = true;
              break;
            }
            temp = temp.add(const Duration(days: 1));
          }
          if (hasBlock) {
            _checkInDate = date;
          } else {
            _checkOutDate = date;
          }
        }
      }
    });
  }

  Widget _buildAvailabilityCalendar() {
    final daysInMonth =
        DateTime(_calendarMonth.year, _calendarMonth.month + 1, 0).day;
    final firstDayOfMonth =
        DateTime(_calendarMonth.year, _calendarMonth.month, 1);
    final startOffset = firstDayOfMonth.weekday % 7;
    final totalCells = startOffset + daysInMonth;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 32),
        Text(
          'Availability',
          style: GoogleFonts.manrope(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: AppTheme.charcoal,
          ),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.border),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: const Icon(Icons.chevron_left,
                        color: AppTheme.charcoal),
                    onPressed: () {
                      setState(() {
                        _calendarMonth = DateTime(
                            _calendarMonth.year, _calendarMonth.month - 1, 1);
                      });
                    },
                  ),
                  Text(
                    DateFormat('MMMM yyyy').format(_calendarMonth),
                    style: GoogleFonts.manrope(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.charcoal,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.chevron_right,
                        color: AppTheme.charcoal),
                    onPressed: () {
                      setState(() {
                        _calendarMonth = DateTime(
                            _calendarMonth.year, _calendarMonth.month + 1, 1);
                      });
                    },
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
                    .map((day) {
                  return SizedBox(
                    width: 36,
                    child: Center(
                      child: Text(
                        day,
                        style: GoogleFonts.manrope(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.charcoalMuted,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 8),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 7,
                  mainAxisSpacing: 8,
                  crossAxisSpacing: 8,
                  childAspectRatio: 1.0,
                ),
                itemCount: totalCells,
                itemBuilder: (context, index) {
                  if (index < startOffset) {
                    return const SizedBox.shrink();
                  }
                  final day = index - startOffset + 1;
                  final cellDate =
                      DateTime(_calendarMonth.year, _calendarMonth.month, day);
                  final isBlocked = _isDateBlocked(cellDate);
                  final isPast = cellDate.isBefore(
                      DateTime.now().subtract(const Duration(days: 1)));

                  bool isSelected = false;
                  if (_checkInDate != null && _checkOutDate != null) {
                    isSelected = cellDate.compareTo(_checkInDate!) >= 0 &&
                        cellDate.compareTo(_checkOutDate!) <= 0;
                  } else if (_checkInDate != null) {
                    isSelected = cellDate.compareTo(_checkInDate!) == 0;
                  }

                  Widget cellContent = Center(
                    child: Text(
                      '$day',
                      style: GoogleFonts.manrope(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: isSelected
                            ? Colors.white
                            : (isBlocked || isPast
                                ? AppTheme.primary
                                : AppTheme.charcoal),
                      ),
                    ),
                  );

                  BoxDecoration decoration;
                  if (isSelected) {
                    decoration = const BoxDecoration(
                      color: AppTheme.charcoal,
                      shape: BoxShape.circle,
                    );
                  } else if (isBlocked || isPast) {
                    decoration = BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AppTheme.primary.withValues(alpha: 0.5),
                        width: 1.5,
                      ),
                    );
                    cellContent = Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          '$day',
                          style: GoogleFonts.manrope(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.primary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Container(
                          width: 4,
                          height: 4,
                          decoration: const BoxDecoration(
                            color: AppTheme.primary,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ],
                    );
                  } else {
                    decoration = const BoxDecoration(
                      shape: BoxShape.circle,
                    );
                  }

                  return InkWell(
                    onTap: () => _onCalendarDayTap(cellDate),
                    customBorder: const CircleBorder(),
                    child: Container(
                      decoration: decoration,
                      child: cellContent,
                    ),
                  );
                },
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildLegendItem(Colors.white, AppTheme.border, 'AVAILABLE',
                      showBorder: true),
                  const SizedBox(width: 16),
                  _buildLegendItem(Colors.white,
                      AppTheme.primary.withValues(alpha: 0.5), 'UNAVAILABLE',
                      hasDot: true),
                  const SizedBox(width: 16),
                  _buildLegendItem(
                      AppTheme.charcoal, Colors.transparent, 'SELECTED'),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLegendItem(Color color, Color borderColor, String label,
      {bool showBorder = false, bool hasDot = false}) {
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: showBorder || borderColor != Colors.transparent
                ? Border.all(color: borderColor, width: 1)
                : null,
          ),
          child: hasDot
              ? Center(
                  child: Container(
                    width: 3,
                    height: 3,
                    decoration: const BoxDecoration(
                      color: AppTheme.primary,
                      shape: BoxShape.circle,
                    ),
                  ),
                )
              : null,
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: GoogleFonts.manrope(
            fontSize: 9,
            fontWeight: FontWeight.w700,
            color: AppTheme.charcoalMuted,
            letterSpacing: 0.5,
          ),
        ),
      ],
    );
  }

  Widget _buildSubRatingRow(String label, double rating) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            flex: 4,
            child: Text(
              label.toUpperCase(),
              style: GoogleFonts.manrope(
                fontSize: 10,
                fontWeight: FontWeight.w800,
                color: AppTheme.charcoalMuted,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 5,
            child: LinearProgressIndicator(
              value: rating / 5.0,
              backgroundColor: AppTheme.stone,
              color: AppTheme.charcoal,
              minHeight: 4,
            ),
          ),
          const SizedBox(width: 12),
          Text(
            rating.toStringAsFixed(1),
            style: GoogleFonts.manrope(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoal,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReviewsSection() {
    if (_loadingReviews) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(
          child: CircularProgressIndicator(color: AppTheme.primary),
        ),
      );
    }
    final avgRating = _reviewsSummary?['rating_avg']?.toDouble() ?? 0.0;
    final subAvgs = _reviewsSummary?['sub_avgs'] ?? {};

    final double cleanliness = (subAvgs['cleanliness'] ?? 0.0).toDouble();
    final double communication = (subAvgs['communication'] ?? 0.0).toDouble();
    final double checkIn = (subAvgs['check_in'] ?? 0.0).toDouble();
    final double accuracy = (subAvgs['accuracy'] ?? 0.0).toDouble();
    final double location = (subAvgs['location'] ?? 0.0).toDouble();
    final double valueRating = (subAvgs['value'] ?? 0.0).toDouble();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 32),
        Text(
          'Guest Reviews',
          style: GoogleFonts.manrope(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: AppTheme.charcoal,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 4,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(vertical: 20, horizontal: 12),
                decoration: BoxDecoration(
                  color: AppTheme.charcoal,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      avgRating.toStringAsFixed(1),
                      style: GoogleFonts.manrope(
                        fontSize: 32,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(5, (index) {
                        return Icon(
                          index < avgRating.round()
                              ? Icons.star
                              : Icons.star_border,
                          color: Colors.amber,
                          size: 12,
                        );
                      }),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'OVERALL RATING',
                      style: GoogleFonts.manrope(
                        fontSize: 8,
                        fontWeight: FontWeight.w800,
                        color: Colors.white.withValues(alpha: 0.6),
                        letterSpacing: 1.0,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              flex: 6,
              child: Column(
                children: [
                  _buildSubRatingRow('Cleanliness', cleanliness),
                  _buildSubRatingRow('Communication', communication),
                  _buildSubRatingRow('Check In', checkIn),
                  _buildSubRatingRow('Accuracy', accuracy),
                  _buildSubRatingRow('Location', location),
                  _buildSubRatingRow('Value', valueRating),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        if (_reviewsList.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: AppTheme.border,
                width: 1.5,
              ),
            ),
            child: Column(
              children: [
                const Icon(Icons.rate_review_outlined,
                    color: AppTheme.charcoalMuted, size: 28),
                const SizedBox(height: 12),
                Text(
                  'NO REVIEWS YET. BE THE FIRST TO SHARE YOUR STAY.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.manrope(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.charcoalMuted,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _reviewsList.length,
            separatorBuilder: (context, index) => const Divider(height: 24),
            itemBuilder: (context, index) {
              final review = _reviewsList[index];
              final dateStr = review['created_at'] != null
                  ? DateFormat('dd MMM yyyy')
                      .format(DateTime.parse(review['created_at']))
                  : '';
              final rating = (review['overall_rating'] ?? 0.0).toDouble();

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            review['guest_display_name'] ?? 'Guest',
                            style: GoogleFonts.manrope(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.charcoal,
                            ),
                          ),
                          Text(
                            dateStr,
                            style: GoogleFonts.manrope(
                              fontSize: 12,
                              color: AppTheme.charcoalMuted,
                            ),
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          const Icon(Icons.star, color: Colors.amber, size: 16),
                          const SizedBox(width: 4),
                          Text(
                            rating.toStringAsFixed(1),
                            style: GoogleFonts.manrope(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.charcoal,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    review['comment'] ?? '',
                    style: GoogleFonts.manrope(
                      fontSize: 13,
                      color: AppTheme.charcoalLight,
                      height: 1.5,
                    ),
                  ),
                  if (review['host_response'] != null) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.stone,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Host Response',
                            style: GoogleFonts.manrope(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.charcoal,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            review['host_response'],
                            style: GoogleFonts.manrope(
                              fontSize: 12,
                              color: AppTheme.charcoalLight,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              );
            },
          ),
      ],
    );
  }

  Widget _buildPremiumHighlight(IconData icon, String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            size: 26,
            color: AppTheme.charcoal,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.manrope(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.charcoal,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: GoogleFonts.manrope(
                    fontSize: 12,
                    color: AppTheme.charcoalMuted,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickFactsGrid(PropertyModel prop, bool showPerDay) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: _buildFactTile(
                'Type',
                '${prop.category[0].toUpperCase()}${prop.category.substring(1)}',
                Icons.home_work_outlined,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildFactTile(
                'Area',
                '${prop.areaSqft.toStringAsFixed(0)} Sqft',
                Icons.square_foot_outlined,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildFactTile(
                'Config',
                prop.bhkType.toUpperCase(),
                Icons.meeting_room_outlined,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildFactTile(
                'Starting price',
                'Rs ${NumberFormat('#,##,###').format(prop.pricePerNight)}${showPerDay ? '/day' : '/night'}',
                Icons.local_offer_outlined,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildFactTile(
                'Guest capacity',
                '${prop.maxGuests} Guests',
                Icons.groups_2_outlined,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildFactTile(
                'Status',
                prop.status.toUpperCase(),
                Icons.verified_outlined,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          onPressed: () => _openPropertyMap(prop),
          icon: const Icon(Icons.map_outlined, size: 18),
          label: Text(
            'Open directions',
            style: GoogleFonts.manrope(
              fontWeight: FontWeight.w800,
              fontSize: 14,
            ),
          ),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppTheme.charcoal,
            side: const BorderSide(color: AppTheme.border),
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFactTile(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppTheme.primary),
          const SizedBox(height: 10),
          Text(
            label.toUpperCase(),
            style: GoogleFonts.manrope(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoalMuted,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: GoogleFonts.manrope(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppTheme.charcoal,
              height: 1.35,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGuestAccessNote() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.stone,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.lock_outline_rounded,
                  color: AppTheme.primary,
                  size: 18,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                'Host profile stays locked',
                style: GoogleFonts.manrope(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.charcoal,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'Host details and direct contact are revealed only after booking confirmation and successful payment. This keeps guest and host interactions secure on X-Space360.',
            style: GoogleFonts.manrope(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppTheme.charcoalMuted,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  // ignore: unused_element
  Widget _buildAirbnbMeetHostSection(PropertyModel prop) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Meet your host',
          style: GoogleFonts.manrope(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: AppTheme.charcoal,
          ),
        ),
        const SizedBox(height: 16),

        // Host Card
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.grey.shade200),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              // Left Part
              Expanded(
                flex: 5,
                child: Column(
                  children: [
                    Stack(
                      children: [
                        CircleAvatar(
                          radius: 44,
                          backgroundImage: const NetworkImage(
                              'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'),
                          backgroundColor: Colors.grey.shade100,
                        ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: Color(0xFFE61E4F),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.star_rounded,
                                color: Colors.white, size: 14),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Shivani',
                      style: GoogleFonts.manrope(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.charcoal,
                      ),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.workspace_premium,
                            size: 14, color: AppTheme.charcoal),
                        const SizedBox(width: 4),
                        Text(
                          'Superhost',
                          style: GoogleFonts.manrope(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.charcoal,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              // Divider
              Container(
                height: 100,
                width: 1,
                color: Colors.grey.shade200,
                margin: const EdgeInsets.symmetric(horizontal: 16),
              ),
              // Right Part
              Expanded(
                flex: 5,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          (prop.reviewCount ?? 0).toString(),
                          style: GoogleFonts.manrope(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.charcoal,
                          ),
                        ),
                        Text(
                          'Reviews',
                          style: GoogleFonts.manrope(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.charcoalMuted,
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              prop.rating != null && prop.rating! > 0
                                  ? prop.rating!.toStringAsFixed(1)
                                  : '—',
                              style: GoogleFonts.manrope(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.charcoal,
                              ),
                            ),
                            const SizedBox(width: 2),
                            const Icon(Icons.star_rounded,
                                size: 14, color: AppTheme.charcoal),
                          ],
                        ),
                        Text(
                          'Rating',
                          style: GoogleFonts.manrope(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.charcoalMuted,
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '1',
                          style: GoogleFonts.manrope(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.charcoal,
                          ),
                        ),
                        Text(
                          'Year hosting',
                          style: GoogleFonts.manrope(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.charcoalMuted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Host Bio details
        Row(
          children: [
            const Icon(Icons.work_outline, color: AppTheme.charcoal, size: 20),
            const SizedBox(width: 12),
            Text(
              "Shivani's work: School Director",
              style: GoogleFonts.manrope(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppTheme.charcoal,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            const Icon(Icons.lightbulb_outline,
                color: AppTheme.charcoal, size: 20),
            const SizedBox(width: 12),
            Text(
              "My favorite: Traveling",
              style: GoogleFonts.manrope(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppTheme.charcoal,
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),

        // Superhost Description
        Text(
          'Shivani is a Superhost',
          style: GoogleFonts.manrope(
            fontSize: 15,
            fontWeight: FontWeight.w800,
            color: AppTheme.charcoal,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Superhosts are experienced, highly rated hosts who are committed to providing great stays for guests.',
          style: GoogleFonts.manrope(
            fontSize: 13,
            color: AppTheme.charcoalMuted,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 24),

        // Co-Hosts
        Text(
          'Co-Hosts',
          style: GoogleFonts.manrope(
            fontSize: 15,
            fontWeight: FontWeight.w800,
            color: AppTheme.charcoal,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            const CircleAvatar(
              radius: 18,
              backgroundImage: NetworkImage(
                  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'),
            ),
            const SizedBox(width: 12),
            Text(
              'Ritesh',
              style: GoogleFonts.manrope(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppTheme.charcoal,
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        // Host details
        Text(
          'Host details',
          style: GoogleFonts.manrope(
            fontSize: 15,
            fontWeight: FontWeight.w800,
            color: AppTheme.charcoal,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Response rate: 100%\nResponds within an hour',
          style: GoogleFonts.manrope(
            fontSize: 13,
            color: AppTheme.charcoal,
            height: 1.6,
          ),
        ),
        const SizedBox(height: 20),

        // Message Host Button
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () {
              // Message host logic
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.grey.shade100,
              foregroundColor: AppTheme.charcoal,
              elevation: 0,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: Colors.grey.shade300),
              ),
            ),
            child: Text(
              'Message host',
              style: GoogleFonts.manrope(
                fontWeight: FontWeight.w800,
                fontSize: 15,
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Warning note
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.security_rounded, size: 18, color: Colors.grey),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'To protect your payment, never transfer money or communicate outside the X-Space360 website or app.',
                style: GoogleFonts.manrope(
                  fontSize: 11,
                  color: AppTheme.charcoalMuted,
                  height: 1.4,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class LaurelWreathWidget extends StatelessWidget {
  final double rating;
  const LaurelWreathWidget({super.key, required this.rating});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        CustomPaint(
          size: const Size(24, 48),
          painter: LaurelWreathPainter(isLeft: true),
        ),
        const SizedBox(width: 16),
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              rating.toStringAsFixed(2),
              style: GoogleFonts.manrope(
                fontSize: 32,
                fontWeight: FontWeight.w800,
                color: AppTheme.charcoal,
                height: 1.1,
              ),
            ),
            const SizedBox(height: 2),
            Row(
              children: List.generate(5, (index) {
                return const Icon(
                  Icons.star_rounded,
                  color: AppTheme.charcoal,
                  size: 14,
                );
              }),
            ),
          ],
        ),
        const SizedBox(width: 16),
        CustomPaint(
          size: const Size(24, 48),
          painter: LaurelWreathPainter(isLeft: false),
        ),
      ],
    );
  }
}

class LaurelWreathPainter extends CustomPainter {
  final bool isLeft;
  LaurelWreathPainter({required this.isLeft});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppTheme.charcoal
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    final path = Path();
    if (isLeft) {
      // Draw left curved branch
      path.moveTo(size.width, size.height);
      path.quadraticBezierTo(0, size.height * 0.7, 0, size.height * 0.2);
      path.quadraticBezierTo(0, 0, size.width * 0.4, 0);
    } else {
      // Draw right curved branch
      path.moveTo(0, size.height);
      path.quadraticBezierTo(
          size.width, size.height * 0.7, size.width, size.height * 0.2);
      path.quadraticBezierTo(size.width, 0, size.width * 0.6, 0);
    }
    canvas.drawPath(path, paint);

    // Draw small leaves along the curve
    final leafPaint = Paint()
      ..color = AppTheme.charcoal
      ..style = PaintingStyle.fill;

    if (isLeft) {
      _drawLeaf(canvas, leafPaint, Offset(size.width * 0.8, size.height * 0.85),
          -0.5);
      _drawLeaf(
          canvas, leafPaint, Offset(size.width * 0.4, size.height * 0.7), -0.8);
      _drawLeaf(canvas, leafPaint, Offset(size.width * 0.15, size.height * 0.5),
          -1.1);
      _drawLeaf(
          canvas, leafPaint, Offset(size.width * 0.1, size.height * 0.3), -1.4);
      _drawLeaf(canvas, leafPaint, Offset(size.width * 0.25, size.height * 0.1),
          -1.8);
    } else {
      _drawLeaf(
          canvas, leafPaint, Offset(size.width * 0.2, size.height * 0.85), 0.5);
      _drawLeaf(
          canvas, leafPaint, Offset(size.width * 0.6, size.height * 0.7), 0.8);
      _drawLeaf(
          canvas, leafPaint, Offset(size.width * 0.85, size.height * 0.5), 1.1);
      _drawLeaf(
          canvas, leafPaint, Offset(size.width * 0.9, size.height * 0.3), 1.4);
      _drawLeaf(
          canvas, leafPaint, Offset(size.width * 0.75, size.height * 0.1), 1.8);
    }
  }

  void _drawLeaf(Canvas canvas, Paint paint, Offset center, double rotation) {
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(rotation);
    canvas.drawOval(
        Rect.fromCenter(center: Offset.zero, width: 14, height: 6), paint);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _ShareActionTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _ShareActionTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: AppTheme.primary, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.manrope(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.charcoal,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.manrope(
                      fontSize: 12,
                      color: AppTheme.charcoalMuted,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded,
                color: AppTheme.charcoalMuted),
          ],
        ),
      ),
    );
  }
}

class _PropertyImageGalleryDialog extends StatefulWidget {
  final List<String> images;
  final int initialIndex;

  const _PropertyImageGalleryDialog({
    required this.images,
    required this.initialIndex,
  });

  @override
  State<_PropertyImageGalleryDialog> createState() =>
      _PropertyImageGalleryDialogState();
}

class _PropertyImageGalleryDialogState
    extends State<_PropertyImageGalleryDialog> {
  late final PageController _controller;
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _controller = PageController(initialPage: widget.initialIndex);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close, color: Colors.white),
                  ),
                  const Spacer(),
                  Text(
                    '${_currentIndex + 1} / ${widget.images.length}',
                    style: GoogleFonts.manrope(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _controller,
                onPageChanged: (index) {
                  setState(() {
                    _currentIndex = index;
                  });
                },
                itemCount: widget.images.length,
                itemBuilder: (context, index) {
                  return InteractiveViewer(
                    minScale: 1,
                    maxScale: 4,
                    child: Center(
                      child: Image.network(
                        widget.images[index],
                        fit: BoxFit.contain,
                        loadingBuilder: (context, child, progress) {
                          if (progress == null) return child;
                          return const Center(
                            child: CircularProgressIndicator(
                              color: Colors.white,
                            ),
                          );
                        },
                        errorBuilder: (context, _, __) => const Center(
                          child: Icon(
                            Icons.broken_image_outlined,
                            color: Colors.white70,
                            size: 64,
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            if (widget.images.length > 1)
              Container(
                height: 92,
                padding: const EdgeInsets.only(bottom: 14, left: 12, right: 12),
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: widget.images.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 10),
                  itemBuilder: (context, index) {
                    final isActive = index == _currentIndex;
                    return GestureDetector(
                      onTap: () {
                        _controller.animateToPage(
                          index,
                          duration: const Duration(milliseconds: 240),
                          curve: Curves.easeOut,
                        );
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        width: 72,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isActive
                                ? AppTheme.primary
                                : Colors.white.withValues(alpha: 0.25),
                            width: isActive ? 2 : 1,
                          ),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Image.network(
                          widget.images[index],
                          fit: BoxFit.cover,
                          errorBuilder: (context, _, __) => Container(
                            color: Colors.white10,
                            child: const Icon(
                              Icons.image_not_supported_outlined,
                              color: Colors.white54,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}
