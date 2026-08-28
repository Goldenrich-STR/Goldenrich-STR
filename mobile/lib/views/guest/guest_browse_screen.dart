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
import '../shared/app_logo.dart';
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
  final DateTimeRange? initialDateRange;

  const GuestBrowseScreen({
    super.key,
    this.initialCity,
    this.initialSearchQuery,
    this.initialGuests,
    this.initialCategory,
    this.initialPropertyType,
    this.initialDateRange,
  });

  @override
  State<GuestBrowseScreen> createState() => _GuestBrowseScreenState();
}

class _GuestBrowseScreenState extends State<GuestBrowseScreen> {
  final _searchController = TextEditingController();
  String _selectedCity = '';
  int _activeCategoryIndex = 0;
  DateTimeRange? _selectedDateRange;
  final Set<String> _knownCities = {};
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

  String get _activeCategoryValue {
    if (_activeCategoryIndex == 1) return 'commercial';
    if (_activeCategoryIndex == 2) return 'event_venue';
    return 'residential';
  }

  bool _matchesActiveCategory(PropertyModel property) {
    return _canonicalCategory(property.category) == _activeCategoryValue;
  }

  void _syncCategoryIndex(String? category) {
    final normalized = _canonicalCategory(category ?? '');
    if (normalized == 'commercial') {
      _activeCategoryIndex = 1;
    } else if (normalized == 'event_venue') {
      _activeCategoryIndex = 2;
    } else {
      _activeCategoryIndex = 0;
    }
    _advancedFilters['category'] = _activeCategoryValue;
  }

  String _canonicalCategory(String value) {
    final normalized = value
        .trim()
        .toLowerCase()
        .replaceAll('&', 'and')
        .replaceAll(RegExp(r'[^a-z0-9]+'), '_')
        .replaceAll(RegExp(r'^_+|_+$'), '');
    if (normalized == 'event' ||
        normalized == 'events' ||
        normalized == 'event_venue' ||
        normalized == 'events_venue' ||
        normalized == 'event_venues') {
      return 'event_venue';
    }
    if (normalized == 'commercial' ||
        normalized == 'commercial_space' ||
        normalized == 'commercial_spaces') {
      return 'commercial';
    }
    if (normalized == 'residential' ||
        normalized == 'residential_stay' ||
        normalized == 'residential_stays') {
      return 'residential';
    }
    return normalized;
  }

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
    if (widget.initialDateRange != null) {
      _selectedDateRange = widget.initialDateRange;
      _advancedFilters['check_in_date'] =
          _apiDate(widget.initialDateRange!.start);
      _advancedFilters['check_out_date'] =
          _apiDate(widget.initialDateRange!.end);
    }
    if (widget.initialPropertyType != null &&
        widget.initialPropertyType!.isNotEmpty) {
      _advancedFilters['property_type'] = widget.initialPropertyType;
    }
    if (widget.initialCategory != null && widget.initialCategory!.isNotEmpty) {
      _syncCategoryIndex(widget.initialCategory);
    } else {
      _advancedFilters['category'] = 'residential';
      _activeCategoryIndex = 0;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadProperties();
      _loadKnownCities();
      Provider.of<NotificationProvider>(context, listen: false)
          .loadUnreadCount();
    });
  }

  Future<void> _loadKnownCities() async {
    final provider = Provider.of<PropertyProvider>(context, listen: false);
    final liveProperties = await provider.fetchLivePropertiesForBrowse();
    if (!mounted) return;
    setState(() {
      _knownCities
        ..clear()
        ..addAll(
          liveProperties
              .map((property) => property.city.trim())
              .where((city) => city.isNotEmpty),
        );
    });
  }

  void _loadProperties() {
    final provider = Provider.of<PropertyProvider>(context, listen: false);
    final Map<String, dynamic> params = {'category': _activeCategoryValue};
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
    params['category'] = _activeCategoryValue;

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
        _syncCategoryIndex(result['category']?.toString());
      });
      _loadProperties();
    }
  }

  String _apiDate(DateTime date) {
    final normalized = DateTime(date.year, date.month, date.day);
    return normalized.toIso8601String().split('T').first;
  }

  Widget _propertyDetailRoute(PropertyModel property) {
    return PropertyDetailScreen(
      propertyId: property.propertyId,
      initialCheckInDate: _selectedDateRange?.start,
      initialCheckOutDate: _selectedDateRange?.end,
      initialGuestCount: widget.initialGuests,
    );
  }

  @override
  Widget build(BuildContext context) {
    final propertyProvider = Provider.of<PropertyProvider>(context);
    final authProvider = Provider.of<AuthProvider>(context);
    final unreadCount = context.watch<NotificationProvider>().unreadCount;

    final rawProperties = propertyProvider.properties;
    final properties = _uniqueProperties(
      rawProperties.where(_matchesActiveCategory).toList(),
    );
    for (final prop in rawProperties) {
      final city = prop.city.trim();
      if (city.isNotEmpty) {
        _knownCities.add(city);
      }
    }
    final cityOptions = _knownCities.toList()
      ..sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));

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
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Flexible(
                              child: ConstrainedBox(
                                constraints:
                                    const BoxConstraints(maxWidth: 178),
                                child: const AppLogo(height: 34),
                              ),
                            ),
                            const SizedBox(width: 3),
                            const Icon(Icons.keyboard_arrow_down_rounded,
                                size: 20, color: Color(0xFF07142F)),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Find Your Perfect Space',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.manrope(
                            fontSize: 12,
                            height: 1.1,
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
                  ...cityOptions.map((city) => _buildCityChip(city, city)),
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
                            _buildPropertyCardGrid(properties),
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
            if (cityCode.isEmpty) {
              _selectedCity = '';
              _searchController.clear();
            } else {
              _selectedCity = cityCode;
              _searchController.text = label;
            }
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

  List<PropertyModel> _uniqueProperties(List<PropertyModel> properties) {
    final seen = <String>{};
    final result = <PropertyModel>[];
    for (final property in properties) {
      final key = property.propertyId.trim().isNotEmpty
          ? property.propertyId.trim()
          : '${property.title}-${property.city}-${property.pricePerNight}';
      if (seen.add(key)) {
        result.add(property);
      }
    }
    return result;
  }

  Widget _buildPropertyCardGrid(List<PropertyModel> properties) {
    final crossAxisCount = MediaQuery.sizeOf(context).width >= 520 ? 3 : 2;
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
      itemCount: properties.length,
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        crossAxisSpacing: 14,
        mainAxisSpacing: 18,
        childAspectRatio: 0.68,
      ),
      itemBuilder: (context, index) {
        return _BrowsePropertyGridCard(
          property: properties[index],
          detailRoute: _propertyDetailRoute(properties[index]),
        );
      },
    );
  }
}

class _BrowsePropertyGridCard extends StatelessWidget {
  final PropertyModel property;
  final Widget detailRoute;

  const _BrowsePropertyGridCard({
    required this.property,
    required this.detailRoute,
  });

  @override
  Widget build(BuildContext context) {
    final propertyProvider = context.watch<PropertyProvider>();
    final wishlisted = propertyProvider.isWishlisted(property.propertyId);
    final hasRating = property.rating != null && property.rating! > 0;

    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => detailRoute),
        );
      },
      borderRadius: BorderRadius.circular(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Stack(
              children: [
                PropertyImage(
                  imageUrl:
                      property.images.isNotEmpty ? property.images.first : null,
                  width: double.infinity,
                  height: double.infinity,
                  borderRadius: BorderRadius.circular(18),
                ),
                Positioned(
                  top: 10,
                  right: 10,
                  child: GestureDetector(
                    onTap: () =>
                        handleWishlistTap(context, property.propertyId),
                    child: Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.94),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.10),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Icon(
                        wishlisted
                            ? Icons.favorite_rounded
                            : Icons.favorite_border_rounded,
                        color: wishlisted ? Colors.red : AppTheme.charcoalMuted,
                        size: 21,
                      ),
                    ),
                  ),
                ),
                if (hasRating && property.rating! >= 4.8)
                  Positioned(
                    left: 10,
                    bottom: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.94),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.workspace_premium_rounded,
                              size: 12, color: AppTheme.primary),
                          const SizedBox(width: 3),
                          Text(
                            'Guest favourite',
                            style: GoogleFonts.manrope(
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                              color: AppTheme.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            property.title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.manrope(
              fontSize: 13,
              fontWeight: FontWeight.w900,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(Icons.location_on_outlined,
                  size: 13, color: AppTheme.charcoalMuted),
              const SizedBox(width: 3),
              Expanded(
                child: Text(
                  '${property.city}, ${property.state}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.manrope(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.charcoalMuted,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          _BookingModeChip(property: property),
          const SizedBox(height: 5),
          Row(
            children: [
              Expanded(
                child: Text(
                  '${CurrencyFormatter.format(property.customerDisplayPrice)}${property.pricingUnitSuffix}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.manrope(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: AppTheme.primary,
                  ),
                ),
              ),
              if (hasRating) ...[
                const Icon(Icons.star_rounded,
                    size: 14, color: AppTheme.primary),
                const SizedBox(width: 2),
                Text(
                  property.rating!.toStringAsFixed(1),
                  style: GoogleFonts.manrope(
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    color: AppTheme.charcoal,
                  ),
                ),
              ],
            ],
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
