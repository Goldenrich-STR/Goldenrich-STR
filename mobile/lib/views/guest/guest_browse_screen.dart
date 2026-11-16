import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/property_provider.dart';
import '../../theme.dart';
import '../../utils/currency_formatter.dart';
import '../../utils/wishlist_action.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'explore_map_screen.dart';
import '../shared/card_badges.dart';
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

  /// Used by collections such as the X-Space Series (villas from this price).
  final double? initialMinPrice;

  /// Heading shown instead of "N Spaces Available" (e.g. the collection name).
  final String? title;

  const GuestBrowseScreen({
    super.key,
    this.initialCity,
    this.initialSearchQuery,
    this.initialGuests,
    this.initialCategory,
    this.initialPropertyType,
    this.initialDateRange,
    this.initialMinPrice,
    this.title,
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
    if (widget.initialMinPrice != null) {
      _advancedFilters['min_price'] = widget.initialMinPrice;
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
            // search summary pill, like the website's mobile results page
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 16, 8),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.maybePop(context),
                    icon: const Icon(LucideIcons.arrowLeft, size: 22),
                  ),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.fromLTRB(14, 6, 6, 6),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFDADADA)),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                TextField(
                                  controller: _searchController,
                                  onChanged: (_) {
                                    if (_selectedCity.isNotEmpty &&
                                        _searchController.text.trim() !=
                                            _selectedCity) {
                                      setState(() => _selectedCity = '');
                                    }
                                  },
                                  onSubmitted: (_) => _loadProperties(),
                                  textInputAction: TextInputAction.search,
                                  style: GoogleFonts.inter(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                      color: const Color(0xFF1B1924)),
                                  decoration: InputDecoration(
                                    isDense: true,
                                    filled: false,
                                    border: InputBorder.none,
                                    enabledBorder: InputBorder.none,
                                    focusedBorder: InputBorder.none,
                                    disabledBorder: InputBorder.none,
                                    errorBorder: InputBorder.none,
                                    focusedErrorBorder: InputBorder.none,
                                    contentPadding: EdgeInsets.zero,
                                    hintText: 'Search property or destination',
                                    hintStyle: GoogleFonts.inter(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                        color: const Color(0xFF8A8A8A)),
                                  ),
                                ),
                                if (_selectedDateRange != null ||
                                    widget.initialGuests != null)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 2),
                                    child: Text(
                                      [
                                        if (_selectedDateRange != null)
                                          '${_shortDate(_selectedDateRange!.start)} - ${_shortDate(_selectedDateRange!.end)}',
                                        if (widget.initialGuests != null)
                                          '${widget.initialGuests.toString().padLeft(2, '0')} Guests',
                                      ].join(', '),
                                      style: GoogleFonts.inter(
                                          fontSize: 11,
                                          color: const Color(0xFF6B6B6B)),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          TextButton.icon(
                            onPressed: _loadProperties,
                            style: TextButton.styleFrom(
                                foregroundColor: const Color(0xFF2563EB),
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 8),
                                minimumSize: const Size(0, 32)),
                            icon: const Icon(LucideIcons.search, size: 14),
                            label: Text('Go',
                                style: GoogleFonts.inter(
                                    fontSize: 12, fontWeight: FontWeight.w600)),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Container(
              height: 1,
              color: const Color(0xFFEDEDED),
            ),

            // filter chips: map, filter, categories, cities
            SizedBox(
              height: 62,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                children: [
                  _toolChip(LucideIcons.mapPin, 'Map', false, () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => const ExploreMapScreen()),
                    );
                  }),
                  _toolChip(
                      LucideIcons.slidersHorizontal, 'Filter', false, _openFilters),
                  _categoryChip(0, 'Residential'),
                  _categoryChip(1, 'Commercial'),
                  _categoryChip(2, 'Events'),
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
                      ? Center(
                          child: Text('No properties found.',
                              style: GoogleFonts.inter(
                                  fontSize: 14, color: const Color(0xFF6B6B6B))))
                      : ListView(
                          physics: const BouncingScrollPhysics(),
                          padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
                          children: [
                            Text(
                              widget.title ??
                                  '${properties.length} ${properties.length == 1 ? 'Space' : 'Spaces'} Available',
                              style: GoogleFonts.inter(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF1B1924)),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${properties.length} ${properties.length == 1 ? 'space' : 'spaces'} found${_selectedCity.isNotEmpty ? ' \u00b7 Curated results for $_selectedCity' : ''}',
                              style: GoogleFonts.inter(
                                  fontSize: 14, color: const Color(0xFF6B6B6B)),
                            ),
                            const SizedBox(height: 16),
                            for (final property in properties)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 26),
                                child: _BrowsePropertyGridCard(
                                  property: property,
                                  detailRoute: _propertyDetailRoute(property),
                                ),
                              ),
                          ],
                        ),
            ),
          ],
        ),
      ),
    );
  }

  String _shortDate(DateTime d) {
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${d.day} ${m[d.month - 1]}';
  }

  Widget _toolChip(IconData icon, String label, bool active, VoidCallback onTap,
      {bool dropdown = false}) {
    return Padding(
      padding: const EdgeInsets.only(right: 10),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: active ? const Color(0xFF1B1924) : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
                color: active
                    ? const Color(0xFF1B1924)
                    : const Color(0xFFDADADA)),
          ),
          child: Row(
            children: [
              Icon(icon,
                  size: 16,
                  color: active ? Colors.white : const Color(0xFF1B1924)),
              const SizedBox(width: 8),
              Text(label,
                  style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: active ? Colors.white : const Color(0xFF1B1924))),
            ],
          ),
        ),
      ),
    );
  }

  Widget _categoryChip(int index, String label) {
    final active = _activeCategoryIndex == index;
    return Padding(
      padding: const EdgeInsets.only(right: 10),
      child: GestureDetector(
        onTap: () {
          setState(() {
            _activeCategoryIndex = index;
            _advancedFilters['category'] =
                const ['residential', 'commercial', 'event_venue'][index];
          });
          _loadProperties();
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: active ? const Color(0xFF1B1924) : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
                color: active
                    ? const Color(0xFF1B1924)
                    : const Color(0xFFDADADA)),
          ),
          child: Text(label,
              style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: active ? Colors.white : const Color(0xFF1B1924))),
        ),
      ),
    );
  }

  Widget _buildCityChip(String cityCode, String label) {
    final isSelected = _selectedCity == cityCode;
    return _toolChip(
      cityCode.isEmpty ? LucideIcons.map : LucideIcons.mapPin,
      label,
      isSelected,
      () {
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

  String get _typeLabel {
    final raw = property.propertyType.trim().replaceAll('_', ' ');
    if (raw.isEmpty) return '';
    return raw
        .split(' ')
        .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
        .join(' ');
  }

  @override
  Widget build(BuildContext context) {
    final propertyProvider = context.watch<PropertyProvider>();
    final wishlisted = propertyProvider.isWishlisted(property.propertyId);
    final hasRating = property.rating != null && property.rating! > 0;
    final bestRated = hasRating && property.rating! >= 4.5;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => detailRoute),
        );
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              AspectRatio(
                aspectRatio: 16 / 10,
                child: PropertyImage(
                  imageUrl:
                      property.images.isNotEmpty ? property.images.first : null,
                  width: double.infinity,
                  height: double.infinity,
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              if (_typeLabel.isNotEmpty)
                Positioned(
                  left: -6,
                  top: 12,
                  child: CardRibbon(label: _typeLabel),
                ),
              Positioned(
                top: 10,
                right: 12,
                child: GestureDetector(
                  onTap: () => handleWishlistTap(context, property.propertyId),
                  child: Icon(
                    LucideIcons.heart,
                    size: 24,
                    color: wishlisted ? Colors.red : Colors.white,
                    fill: wishlisted ? 1 : 0,
                    shadows: const [Shadow(color: Colors.black45, blurRadius: 6)],
                  ),
                ),
              ),
              if (hasRating)
                Positioned(
                  left: 12,
                  bottom: 12,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.55),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(property.rating!.toStringAsFixed(1),
                            style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: Colors.white)),
                        const SizedBox(width: 3),
                        const Icon(Icons.star_rounded,
                            size: 13, color: Color(0xFFFBBF24)),
                      ],
                    ),
                  ),
                ),
              if (bestRated)
                const Positioned(right: -6, bottom: 12, child: BestRatedTag()),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            property.title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.inter(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF8A6100),
            ),
          ),
          const SizedBox(height: 5),
          Row(
            children: [
              const Icon(LucideIcons.mapPin, size: 14, color: Color(0xFF1F8A4C)),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  [property.address, property.city, property.state]
                      .where((e) => e.trim().isNotEmpty)
                      .join(', '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFF6B6B6B),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              if (property.hasUnits)
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: Text('Starting from',
                      style: GoogleFonts.inter(
                          fontSize: 11, color: const Color(0xFF6B6B6B))),
                ),
              Text(
                CurrencyFormatter.format(property.customerDisplayPrice),
                style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF1B1924),
                ),
              ),
              const SizedBox(width: 4),
              Text(
                property.pricingUnitSuffix.toUpperCase(),
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.6,
                  color: const Color(0xFF6B6B6B),
                ),
              ),
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
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.primary.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppTheme.primary.withValues(alpha: 0.24)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.flash_on_rounded, size: 12, color: AppTheme.primary),
          const SizedBox(width: 4),
          Text(
            'Instant Book',
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: AppTheme.primary,
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
