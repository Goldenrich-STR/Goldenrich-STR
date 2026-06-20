import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/property_provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme.dart';
import 'package:google_fonts/google_fonts.dart';
import 'property_detail_screen.dart';
import 'property_filter_dialog.dart';
import '../../models/property_model.dart';

class GuestBrowseScreen extends StatefulWidget {
  final String? initialCity;
  final int? initialGuests;
  final String? initialCategory;

  const GuestBrowseScreen({
    super.key,
    this.initialCity,
    this.initialGuests,
    this.initialCategory,
  });

  @override
  State<GuestBrowseScreen> createState() => _GuestBrowseScreenState();
}

class _GuestBrowseScreenState extends State<GuestBrowseScreen> {
  final _searchController = TextEditingController();
  String _selectedCity = '';
  int _activeCategoryIndex = 0;
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
    if (widget.initialGuests != null && widget.initialGuests! > 0) {
      _advancedFilters['guests'] = widget.initialGuests;
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
    });
  }

  void _loadProperties() {
    final provider = Provider.of<PropertyProvider>(context, listen: false);
    final Map<String, dynamic> params = {};
    if (_searchController.text.isNotEmpty) {
      params['city'] = _searchController.text;
    } else if (_selectedCity.isNotEmpty) {
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
        builder: (context) => PropertyFilterDialog(initialFilters: _advancedFilters),
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

    final properties = propertyProvider.properties;

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
            // 1. CAPSULE SEARCH BAR
            Padding(
              padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 12.0, bottom: 8.0),
              child: Container(
                height: 56,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(28),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: TextField(
                  controller: _searchController,
                  onSubmitted: (_) => _loadProperties(),
                  style: GoogleFonts.manrope(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.black87,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Start your search',
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
                              child: Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black87, size: 20),
                            ),
                          )
                        : const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 14.0),
                            child: Icon(Icons.search, color: Colors.black87, size: 22),
                          ),
                    suffixIcon: Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: IconButton(
                        icon: const Icon(Icons.tune, color: AppTheme.primary, size: 22),
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
              color: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 8.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildCategoryItem(0, 'Residential', Icons.home_rounded, isNew: false),
                  _buildCategoryItem(1, 'Commercial', Icons.business_rounded, isNew: true),
                  _buildCategoryItem(2, 'Events', Icons.celebration_rounded, isNew: true),
                ],
              ),
            ),

            // Subtle divider line
            Container(height: 1, color: Colors.grey[200]),

            // 3. CITY CHIPS (PILLS)
            Container(
              height: 48,
              color: Colors.white,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                children: [
                  _buildCityChip('', 'All Cities'),
                  _buildCityChip('Goa', 'Goa'),
                  _buildCityChip('Mumbai', 'Mumbai'),
                  _buildCityChip('Jaipur', 'Jaipur'),
                  _buildCityChip('Bangalore', 'Bangalore'),
                  _buildCityChip('Delhi', 'Delhi'),
                ],
              ),
            ),

            // 4. PROPERTIES LISTING
            Expanded(
              child: propertyProvider.isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                  : properties.isEmpty
                      ? const Center(child: Text('No properties found.'))
                      : ListView(
                          physics: const BouncingScrollPhysics(),
                          padding: const EdgeInsets.only(bottom: 24.0),
                          children: _buildPropertySections(cityGroups),
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryItem(int index, String label, IconData iconData, {bool isNew = false}) {
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
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Icon(
                iconData,
                size: 26,
                color: isActive ? Colors.black : Colors.grey[400],
              ),
              if (isNew)
                Positioned(
                  top: -8,
                  right: -14,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F2C59), // Deep Navy Blue
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'NEW',
                      style: TextStyle(
                        fontSize: 7,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: GoogleFonts.manrope(
              fontSize: 12,
              fontWeight: isActive ? FontWeight.bold : FontWeight.w600,
              color: isActive ? Colors.black : Colors.grey[500],
            ),
          ),
          const SizedBox(height: 6),
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            height: 2,
            width: 36,
            color: isActive ? Colors.black : Colors.transparent,
          ),
        ],
      ),
    );
  }

  Widget _buildCityChip(String cityCode, String label) {
    final isSelected = _selectedCity == cityCode;
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: ChoiceChip(
        label: Text(
          label,
          style: GoogleFonts.manrope(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? Colors.white : Colors.black87,
          ),
        ),
        selected: isSelected,
        onSelected: (selected) {
          setState(() {
            _selectedCity = cityCode;
          });
          _loadProperties();
        },
        selectedColor: AppTheme.primary,
        backgroundColor: Colors.grey[100],
        elevation: 0,
        pressElevation: 0,
        side: BorderSide(
          color: isSelected ? AppTheme.primary : Colors.grey[200]!,
          width: 1,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    );
  }

  List<Widget> _buildPropertySections(Map<String, List<PropertyModel>> cityGroups) {
    final List<Widget> sections = [];
    
    cityGroups.forEach((city, list) {
      if (list.isEmpty) return;

      // popular list: take first half (or at least 1, max all)
      final popularCount = (list.length / 2).round().clamp(1, list.length);
      final popularList = list.take(popularCount).toList();
      
      sections.add(
        _buildSectionHeader('Popular homes in $city'),
      );
      sections.add(
        _buildHorizontalPropertyGrid(popularList),
      );

      // weekend list: remaining properties
      final weekendList = list.skip(popularCount).toList();
      if (weekendList.isNotEmpty) {
        sections.add(
          _buildSectionHeader('Available in $city this weekend'),
        );
        sections.add(
          _buildHorizontalPropertyGrid(weekendList),
        );
      }
    });

    return sections;
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 20.0, bottom: 12.0),
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
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: Colors.grey[100],
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.arrow_forward_rounded,
              size: 16,
              color: Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHorizontalPropertyGrid(List<PropertyModel> properties) {
    final propertyProvider = Provider.of<PropertyProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    return SizedBox(
      height: 270,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16.0),
        itemCount: properties.length,
        itemBuilder: (context, index) {
          final prop = properties[index];
          // Mock a beautiful rating (e.g. between 4.70 and 5.00) based on title hash
          final double rating = 4.7 + (prop.title.hashCode % 31) * 0.01;
          
          return Container(
            width: 230,
            margin: const EdgeInsets.only(right: 16.0, bottom: 8.0),
            child: InkWell(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => PropertyDetailScreen(propertyId: prop.propertyId),
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
                      ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Image.network(
                          prop.images.isNotEmpty
                              ? prop.images[0]
                              : 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85',
                          height: 180,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorBuilder: (context, _, __) => Container(
                            height: 180,
                            color: AppTheme.stone,
                            child: const Icon(Icons.home, size: 40, color: AppTheme.secondary),
                          ),
                        ),
                      ),
                      // "Guest favourite" badge (white rounded chip)
                      if (rating >= 4.8)
                        Positioned(
                          top: 12,
                          left: 12,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
                            Provider.of<PropertyProvider>(context, listen: false).toggleWishlist(prop.propertyId);
                          },
                          child: Icon(
                            propertyProvider.isWishlisted(prop.propertyId)
                                ? Icons.favorite_rounded
                                : Icons.favorite_border_rounded,
                            color: propertyProvider.isWishlisted(prop.propertyId)
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
                  // Price and rating row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          Text(
                            prop.category.toLowerCase() == 'commercial' || prop.category.toLowerCase() == 'event_venue'
                                ? '₹${(prop.pricePerNight * (auth.isPromoClaimed ? 0.9 : 1.0)).toStringAsFixed(0)} total'
                                : '₹${(prop.pricePerNight * (auth.isPromoClaimed ? 0.9 : 1.0)).toStringAsFixed(0)} total',
                            style: GoogleFonts.manrope(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.primary,
                            ),
                          ),
                          if (auth.isPromoClaimed) ...[
                            const SizedBox(width: 4),
                            Text(
                              '₹${prop.pricePerNight.toStringAsFixed(0)}',
                              style: GoogleFonts.manrope(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.charcoalMuted,
                                decoration: TextDecoration.lineThrough,
                              ),
                            ),
                          ],
                        ],
                      ),
                      Row(
                        children: [
                          const Icon(Icons.star_rounded, size: 16, color: Colors.black87),
                          const SizedBox(width: 2),
                          Text(
                            rating.toStringAsFixed(2),
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
