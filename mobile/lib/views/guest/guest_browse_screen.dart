import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/property_provider.dart';
import '../../theme.dart';
import '../../utils/currency_formatter.dart';
import '../../utils/wishlist_action.dart';
import 'package:google_fonts/google_fonts.dart';
import '../auth/login_screen.dart';
import '../shared/notifications_screen.dart';
import '../shared/property_image.dart';
import 'property_detail_screen.dart';
import 'property_filter_dialog.dart';
import '../../models/property_model.dart';

class GuestBrowseScreen extends StatefulWidget {
  final String? initialCity;
  final String? initialSearchQuery;
  final int? initialGuests;
  final String? initialCategory;
  final String? initialPropertyType;

  const GuestBrowseScreen({
    super.key,
    this.initialCity,
    this.initialSearchQuery,
    this.initialGuests,
    this.initialCategory,
    this.initialPropertyType,
  });

  @override
  State<GuestBrowseScreen> createState() => _GuestBrowseScreenState();
}

class _GuestBrowseScreenState extends State<GuestBrowseScreen> {
  final _searchController = TextEditingController();
  String _selectedCity = '';
  int _activeCategoryIndex = 0;
  final Set<String> _knownCities = {
    'Nashik',
    'Mumbai',
    'Pune',
    'Goa',
    'Jaipur',
    'Bangalore',
  };
  Map<String, dynamic> _advancedFilters = {
    'category': '',
    'property_type': '',
    'bhk_type': '',
    'min_price': null,
    'max_price': null,
    'instant_booking': null,
    'pet_friendly': null,
    'amenities': '',
  };

  @override
  void initState() {
    super.initState();
    if (widget.initialCity != null && widget.initialCity!.isNotEmpty) {
      _searchController.text = widget.initialCity!;
      _selectedCity = widget.initialCity!;
    }
    if (widget.initialSearchQuery != null &&
        widget.initialSearchQuery!.isNotEmpty) {
      _searchController.text = widget.initialSearchQuery!;
    }
    if (widget.initialGuests != null && widget.initialGuests! > 0) {
      _advancedFilters['guests'] = widget.initialGuests;
    }
    if (widget.initialPropertyType != null &&
        widget.initialPropertyType!.isNotEmpty) {
      _advancedFilters['property_type'] = widget.initialPropertyType;
    }
    if (widget.initialCategory != null && widget.initialCategory!.isNotEmpty) {
      _advancedFilters['category'] = widget.initialCategory;
      if (widget.initialCategory!.toLowerCase() == 'commercial') {
        _activeCategoryIndex = 1;
      } else if (widget.initialCategory!.toLowerCase() == 'event' ||
          widget.initialCategory!.toLowerCase() == 'event_venue' ||
          widget.initialCategory!.toLowerCase() == 'events_venue') {
        _activeCategoryIndex = 2;
      } else {
        _activeCategoryIndex = 0;
      }
    } else {
      _advancedFilters['category'] = 'residential';
      _activeCategoryIndex = 0;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadProperties();
      Provider.of<NotificationProvider>(context, listen: false)
          .loadUnreadCount();
    });
  }

  void _loadProperties() {
    final provider = Provider.of<PropertyProvider>(context, listen: false);
    final Map<String, dynamic> params = {};
    final searchText = _searchController.text.trim();
    if (searchText.isNotEmpty && searchText != _selectedCity) {
      params['search'] = searchText;
    }
    if (_selectedCity.isNotEmpty) {
      params['city'] = _selectedCity;
    }

    _advancedFilters.forEach((key, value) {
      if (value != null && value.toString().isNotEmpty) {
        params[key] = value;
      }
    });

    provider.searchProperties(params);
  }

  Future<void> _openFilters() async {
    final result = await Navigator.push<Map<String, dynamic>>(
      context,
      MaterialPageRoute(
        builder: (context) =>
            PropertyFilterDialog(initialFilters: _advancedFilters),
      ),
    );
    if (result != null) {
      setState(() {
        _advancedFilters = result;
      });
      _loadProperties();
    }
  }

  @override
  Widget build(BuildContext context) {
    final propertyProvider = Provider.of<PropertyProvider>(context);
    final authProvider = Provider.of<AuthProvider>(context);
    final unreadCount = context.watch<NotificationProvider>().unreadCount;

    final properties = propertyProvider.properties;
    for (final prop in properties) {
      final city = prop.city.trim();
      if (city.isNotEmpty) {
        _knownCities.add(city);
      }
    }

    // Group properties by city
    final Map<String, List<PropertyModel>> cityGroups = {};
    for (var prop in properties) {
      final city = prop.city.isNotEmpty ? prop.city : 'Other';
      if (!cityGroups.containsKey(city)) {
        cityGroups[city] = [];
      }
      cityGroups[city]!.add(prop);
    }

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 10, 18, 10),
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.06),
                          blurRadius: 16,
                          offset: const Offset(0, 7),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.location_on_rounded,
                        color: AppTheme.primary, size: 27),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'X-SPACE360',
                          style: GoogleFonts.manrope(
                            fontSize: 23,
                            height: 1,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF07142F),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Find your perfect space',
                          style: GoogleFonts.manrope(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.charcoalMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _HeaderNotificationButton(
                    unreadCount:
                        authProvider.currentUser == null ? 0 : unreadCount,
                    onTap: () {
                      if (authProvider.currentUser == null) {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) =>
                                  const LoginScreen(initialRole: 'guest')),
                        );
                        return;
                      }
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const NotificationsScreen()),
                      );
                    },
                  ),
                  const CircleAvatar(
                    radius: 23,
                    backgroundColor: Color(0xFF07142F),
                    child: Icon(Icons.person_rounded, color: Colors.white),
                  ),
                ],
              ),
            ),

            // 1. CAPSULE SEARCH BAR
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 6, 18, 12),
              child: Container(
                height: 64,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppTheme.border),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 18,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: TextField(
                  controller: _searchController,
                  onChanged: (_) {
                    if (_selectedCity.isNotEmpty &&
                        _searchController.text.trim() != _selectedCity) {
                      setState(() => _selectedCity = '');
                    }
                  },
                  onSubmitted: (_) => _loadProperties(),
                  style: GoogleFonts.manrope(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.black87,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Search property or destination',
                    hintStyle: GoogleFonts.manrope(
                      color: Colors.black54,
                      fontWeight: FontWeight.w500,
                      fontSize: 15,
                    ),
                    prefixIcon: Navigator.canPop(context)
                        ? GestureDetector(
                            onTap: () => Navigator.pop(context),
                            child: const Padding(
                              padding: EdgeInsets.symmetric(horizontal: 14.0),
                              child: Icon(Icons.arrow_back_ios_new_rounded,
                                  color: Colors.black87, size: 20),
                            ),
                          )
                        : const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 14.0),
                            child: Icon(Icons.search,
                                color: Colors.black87, size: 22),
                          ),
                    suffixIcon: Padding(
                      padding: const EdgeInsets.only(right: 10.0),
                      child: IconButton(
                        icon: const Icon(Icons.tune,
                            color: AppTheme.primary, size: 27),
                        onPressed: _openFilters,
                      ),
                    ),
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),
            ),

            // 2. CATEGORY TAB SELECTOR
            Container(
              margin: const EdgeInsets.fromLTRB(18, 4, 18, 10),
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: _buildCategoryItem(
                        0, 'Residential', Icons.home_rounded,
                        isNew: false),
                  ),
                  Expanded(
                    child: _buildCategoryItem(
                        1, 'Commercial', Icons.business_rounded,
                        isNew: true),
                  ),
                  Expanded(
                    child: _buildCategoryItem(
                        2, 'Events', Icons.celebration_rounded,
                        isNew: true),
                  ),
                ],
              ),
            ),

            // 3. CITY CHIPS (PILLS)
            Container(
              height: 58,
              color: Colors.white,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding:
                    const EdgeInsets.symmetric(horizontal: 18.0, vertical: 9.0),
                children: [
                  _buildCityChip('', 'All Cities'),
                  ..._knownCities.map((city) => _buildCityChip(city, city)),
                ],
              ),
            ),

            // 4. PROPERTIES LISTING
            Expanded(
              child: propertyProvider.isLoading
                  ? const Center(
                      child: CircularProgressIndicator(color: AppTheme.primary))
                  : properties.isEmpty
                      ? const Center(child: Text('No properties found.'))
                      : ListView(
                          physics: const BouncingScrollPhysics(),
                          padding: const EdgeInsets.only(bottom: 24.0),
                          children: [
                            const SizedBox(height: 6),
                            _buildBrowseHostBanner(),
                            ..._buildPropertySections(cityGroups),
                            _buildTrustStrip(),
                          ],
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryItem(int index, String label, IconData iconData,
      {bool isNew = false}) {
    final bool isActive = _activeCategoryIndex == index;
    return GestureDetector(
      onTap: () {
        setState(() {
          _activeCategoryIndex = index;
          if (index == 0) {
            _advancedFilters['category'] = 'residential';
          } else if (index == 1) {
            _advancedFilters['category'] = 'commercial';
          } else if (index == 2) {
            _advancedFilters['category'] = 'event_venue';
          }
        });
        _loadProperties();
      },
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        height: 64,
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFF07142F) : Colors.transparent,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Stack(
          alignment: Alignment.center,
          clipBehavior: Clip.none,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  iconData,
                  size: 24,
                  color: isActive ? AppTheme.primary : Colors.grey[500],
                ),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.manrope(
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                      color: isActive ? Colors.white : const Color(0xFF07142F),
                    ),
                  ),
                ),
              ],
            ),
            if (isNew)
              Positioned(
                top: -7,
                right: 18,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFF07142F),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Text(
                    'NEW',
                    style: TextStyle(
                      fontSize: 8,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildCityChip(String cityCode, String label) {
    final isSelected = _selectedCity == cityCode;
    return Padding(
      padding: const EdgeInsets.only(right: 10.0),
      child: ChoiceChip(
        avatar: isSelected
            ? const Icon(Icons.location_on_rounded,
                size: 17, color: Colors.white)
            : null,
        label: Text(
          label,
          style: GoogleFonts.manrope(
            fontSize: 14,
            fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
            color: isSelected ? Colors.white : AppTheme.charcoal,
          ),
        ),
        selected: isSelected,
        onSelected: (selected) {
          setState(() {
            _selectedCity = cityCode;
            _searchController.text = label == 'All Cities' ? '' : label;
          });
          _loadProperties();
        },
        selectedColor: AppTheme.primary,
        backgroundColor: Colors.white,
        elevation: isSelected ? 2 : 0,
        pressElevation: 0,
        side: BorderSide(
          color: isSelected ? AppTheme.primary : AppTheme.border,
          width: 1,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(999),
        ),
      ),
    );
  }

  List<Widget> _buildPropertySections(
      Map<String, List<PropertyModel>> cityGroups) {
    final sections = <Widget>[];
    final orderedCities = cityGroups.keys.toList()
      ..sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));

    for (final city in orderedCities) {
      final list = cityGroups[city] ?? [];
      if (list.isEmpty) continue;
      final popularList = list.take(6).toList();
      final weekendList =
          list.length > 1 ? list.skip(1).take(4).toList() : list;

      sections.add(_buildSectionHeader('Popular homes in $city'));
      sections.add(_buildHorizontalPropertyGrid(popularList));
      sections.add(_buildSectionHeader('Available in $city this weekend'));
      sections.add(_buildWeekendPropertyList(weekendList));
    }

    return sections;
  }

  Widget _buildBrowseHostBanner() {
    return Container(
      margin: const EdgeInsets.fromLTRB(18, 8, 18, 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFFFFBF1), Color(0xFFFFF1D2)],
        ),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFF0DFC5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: SizedBox(
              height: 76,
              width: double.infinity,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Image.asset('assets/images/hero_villa.jpg',
                      fit: BoxFit.cover),
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                        colors: [
                          const Color(0xFF07142F).withValues(alpha: 0.76),
                          const Color(0xFF07142F).withValues(alpha: 0.14),
                        ],
                      ),
                    ),
                  ),
                  Positioned(
                    left: 12,
                    top: 12,
                    bottom: 12,
                    child: Container(
                      width: 52,
                      decoration: BoxDecoration(
                        color: AppTheme.primary,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(Icons.home_rounded,
                          color: Colors.white, size: 24),
                    ),
                  ),
                  Positioned(
                    left: 76,
                    top: 15,
                    right: 12,
                    child: Text(
                      'Become a Host',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.manrope(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  Positioned(
                    left: 76,
                    top: 42,
                    right: 12,
                    child: Text(
                      'List your space and start earning.',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.manrope(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Colors.white.withValues(alpha: 0.86),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.72),
                  border: Border.all(color: AppTheme.primary),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text('EARN MORE',
                    style: GoogleFonts.manrope(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        color: AppTheme.primary)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Trusted platform • 24/7 support',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.manrope(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.charcoalMuted,
                  ),
                ),
              ),
              SizedBox(
                height: 38,
                child: ElevatedButton(
                  onPressed: () {},
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF07142F),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    textStyle: GoogleFonts.manrope(
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('List'),
                      SizedBox(width: 5),
                      Icon(Icons.arrow_forward_rounded, size: 16),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(
          left: 16.0, right: 16.0, top: 20.0, bottom: 12.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              title,
              style: GoogleFonts.manrope(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('View all',
                  style: GoogleFonts.manrope(
                      color: AppTheme.primary,
                      fontSize: 13,
                      fontWeight: FontWeight.w800)),
              const SizedBox(width: 6),
              const Icon(Icons.arrow_forward_rounded,
                  size: 18, color: AppTheme.primary),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildWeekendPropertyList(List<PropertyModel> properties) {
    if (properties.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      height: 276,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 18),
        itemCount: properties.length,
        separatorBuilder: (_, __) => const SizedBox(width: 14),
        itemBuilder: (context, index) =>
            _WeekendPropertyCard(property: properties[index]),
      ),
    );
  }

  Widget _buildTrustStrip() {
    final items = [
      (Icons.verified_user_outlined, 'Verified Properties', 'Quality Checked'),
      (Icons.support_agent_outlined, '24/7 Support', 'We are here'),
      (Icons.local_offer_outlined, 'Best Price Guarantee', 'Great deals'),
    ];
    return Container(
      margin: const EdgeInsets.fromLTRB(18, 14, 18, 10),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          for (int i = 0; i < items.length; i++) ...[
            Expanded(
              child: Column(
                children: [
                  Icon(items[i].$1, color: AppTheme.primary, size: 22),
                  const SizedBox(height: 6),
                  Text(items[i].$2,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.manrope(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF07142F))),
                  Text(items[i].$3,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.manrope(
                          fontSize: 9, color: AppTheme.charcoalMuted)),
                ],
              ),
            ),
            if (i != items.length - 1)
              Container(width: 1, height: 44, color: AppTheme.border),
          ],
        ],
      ),
    );
  }

  Widget _buildHorizontalPropertyGrid(List<PropertyModel> properties) {
    final propertyProvider = Provider.of<PropertyProvider>(context);
    return SizedBox(
      height: 292,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16.0),
        itemCount: properties.length,
        itemBuilder: (context, index) {
          final prop = properties[index];
          final hasRating = prop.rating != null && prop.rating! > 0;

          return Container(
            width: 230,
            margin: const EdgeInsets.only(right: 16.0, bottom: 8.0),
            child: InkWell(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) =>
                        PropertyDetailScreen(propertyId: prop.propertyId),
                  ),
                );
              },
              borderRadius: BorderRadius.circular(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Image stack with "Guest favourite" badge and Wishlist toggle
                  Stack(
                    children: [
                      PropertyImage(
                        imageUrl:
                            prop.images.isNotEmpty ? prop.images[0] : null,
                        height: 180,
                        width: double.infinity,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      // "Guest favourite" badge (white rounded chip)
                      if (hasRating && prop.rating! >= 4.8)
                        Positioned(
                          top: 12,
                          left: 12,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.1),
                                  blurRadius: 4,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Text(
                              'Guest favourite',
                              style: GoogleFonts.manrope(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: Colors.black87,
                              ),
                            ),
                          ),
                        ),
                      // Wishlist heart icon
                      Positioned(
                        top: 12,
                        right: 12,
                        child: GestureDetector(
                          onTap: () {
                            handleWishlistTap(context, prop.propertyId);
                          },
                          child: Icon(
                            propertyProvider.isWishlisted(prop.propertyId)
                                ? Icons.favorite_rounded
                                : Icons.favorite_border_rounded,
                            color:
                                propertyProvider.isWishlisted(prop.propertyId)
                                    ? Colors.red
                                    : Colors.white,
                            size: 24,
                            shadows: [
                              Shadow(
                                color: Colors.black.withValues(alpha: 0.4),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  // Title
                  Text(
                    prop.title,
                    style: GoogleFonts.manrope(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  _BookingModeChip(property: prop),
                  const SizedBox(height: 4),
                  // Price and rating row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          Text(
                            '${CurrencyFormatter.format(prop.customerDisplayPrice)}${prop.pricingUnitSuffix}',
                            style: GoogleFonts.manrope(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.primary,
                            ),
                          ),
                        ],
                      ),
                      if (hasRating)
                        Row(
                          children: [
                            const Icon(Icons.star_rounded,
                                size: 16, color: Colors.black87),
                            const SizedBox(width: 2),
                            Text(
                              prop.rating!.toStringAsFixed(1),
                              style: GoogleFonts.manrope(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: Colors.black87,
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _WeekendPropertyCard extends StatelessWidget {
  final PropertyModel property;

  const _WeekendPropertyCard({required this.property});

  @override
  Widget build(BuildContext context) {
    final hasRating = property.rating != null && property.rating! > 0;
    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) =>
                PropertyDetailScreen(propertyId: property.propertyId),
          ),
        );
      },
      borderRadius: BorderRadius.circular(18),
      child: Container(
        width: MediaQuery.of(context).size.width - 36,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.07),
              blurRadius: 18,
              offset: const Offset(0, 9),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                PropertyImage(
                  imageUrl:
                      property.images.isNotEmpty ? property.images[0] : null,
                  height: 156,
                  width: double.infinity,
                ),
                const Positioned(
                  top: 12,
                  left: 12,
                  child: _GuestFavouriteBadge(showCrown: true),
                ),
                Positioned(
                  top: 12,
                  right: 12,
                  child: IconButton.filled(
                    onPressed: () =>
                        handleWishlistTap(context, property.propertyId),
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.white.withValues(alpha: 0.92),
                    ),
                    icon: const Icon(Icons.favorite_border_rounded,
                        color: Color(0xFF07142F)),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    property.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.manrope(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF07142F),
                    ),
                  ),
                  const SizedBox(height: 7),
                  Row(
                    children: [
                      Text(
                        '${property.maxGuests} Guests',
                        style: GoogleFonts.manrope(
                            fontSize: 12, color: AppTheme.charcoalMuted),
                      ),
                      const SizedBox(width: 8),
                      const Text('•'),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          property.bhkType,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.manrope(
                              fontSize: 12, color: AppTheme.charcoalMuted),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 9),
                  Row(
                    children: [
                      _BookingModeChip(property: property),
                      const Spacer(),
                      Text(
                        '${CurrencyFormatter.format(property.customerDisplayPrice)}${property.pricingUnitSuffix}',
                        style: GoogleFonts.manrope(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: AppTheme.primary,
                        ),
                      ),
                      if (hasRating) ...[
                        const SizedBox(width: 10),
                        const Icon(Icons.star_rounded,
                            size: 17, color: AppTheme.primary),
                        Text(
                          property.rating!.toStringAsFixed(1),
                          style: GoogleFonts.manrope(
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF07142F),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GuestFavouriteBadge extends StatelessWidget {
  final bool showCrown;

  const _GuestFavouriteBadge({this.showCrown = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.94),
        borderRadius: BorderRadius.circular(999),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.10),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showCrown) ...[
            const Icon(Icons.workspace_premium_rounded,
                size: 14, color: AppTheme.primary),
            const SizedBox(width: 4),
          ],
          Text(
            'Guest favourite',
            style: GoogleFonts.manrope(
              fontSize: 11,
              fontWeight: FontWeight.w900,
              color: AppTheme.primary,
            ),
          ),
        ],
      ),
    );
  }
}

class _BookingModeChip extends StatelessWidget {
  final PropertyModel property;

  const _BookingModeChip({required this.property});

  @override
  Widget build(BuildContext context) {
    final instant = property.isInstantBook;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color:
            instant ? AppTheme.primary.withValues(alpha: 0.10) : AppTheme.stone,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: instant
              ? AppTheme.primary.withValues(alpha: 0.24)
              : AppTheme.border,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            instant
                ? Icons.flash_on_rounded
                : Icons.assignment_turned_in_outlined,
            size: 12,
            color: instant ? AppTheme.primary : AppTheme.charcoalMuted,
          ),
          const SizedBox(width: 4),
          Text(
            instant ? 'Instant Book' : 'Host Approval Required',
            style: GoogleFonts.manrope(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: instant ? AppTheme.primary : AppTheme.charcoalMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _HeaderNotificationButton extends StatelessWidget {
  final int unreadCount;
  final VoidCallback onTap;

  const _HeaderNotificationButton({
    required this.unreadCount,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        IconButton(
          onPressed: onTap,
          icon: const Icon(
            Icons.notifications_none_rounded,
            color: Color(0xFF07142F),
            size: 27,
          ),
        ),
        if (unreadCount > 0)
          Positioned(
            top: 10,
            right: 10,
            child: Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: const Color(0xFFE53935),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 1.5),
              ),
            ),
          ),
      ],
    );
  }
}
