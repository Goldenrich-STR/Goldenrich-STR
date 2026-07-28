import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../models/property_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/property_provider.dart';
import '../../theme.dart';
import '../auth/login_screen.dart';
import '../shared/app_logo.dart';
import '../shared/app_shell.dart';
import 'guest_browse_screen.dart';
import 'property_detail_screen.dart';

class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  final PageController _heroController = PageController(viewportFraction: 1);
  Timer? _heroTimer;
  int _heroIndex = 0;
  String _selectedCity = 'Anywhere';
  String _selectedCategory = 'All Types';
  DateTimeRange? _selectedRange;
  int _guestCount = 2;

  static const List<_HeroSlide> _heroSlides = [
    _HeroSlide(
      image:
          'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80',
      tag: 'COMMERCIAL SPACES',
      titlePrefix: 'Premium Office ',
      titleHighlight: 'Spaces',
      subtitle:
          'Curated short-term work environments designed for teams that value atmosphere and flexibility.',
      badge: '15% OFF On Weekday Bookings*',
      category: 'commercial',
    ),
    _HeroSlide(
      image:
          'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80',
      tag: 'RESIDENTIAL SPACES',
      titlePrefix: 'Cozy Luxury ',
      titleHighlight: 'Homes',
      subtitle:
          'Elegant stays, refined finishes, and seamless booking for elevated city and leisure escapes.',
      badge: '50% OFF on 2nd Night*',
      category: 'residential',
    ),
    _HeroSlide(
      image:
          'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=80',
      tag: 'WEDDING VENUES',
      titlePrefix: 'Beautiful Wedding ',
      titleHighlight: 'Venues',
      subtitle:
          'Statement venues for weddings, celebrations, and memorable guest experiences across India.',
      badge: '26% OFF On All Sunday Events',
      category: 'event',
    ),
  ];

  static const List<_DestinationData> _destinations = [
    _DestinationData('Goa', Icons.waves_outlined),
    _DestinationData('Mumbai', Icons.location_city_outlined),
    _DestinationData('Nashik', Icons.landscape_outlined),
    _DestinationData('Bangalore', Icons.apartment_outlined),
  ];

  static const List<_TestimonialData> _testimonials = [
    _TestimonialData(
      name: 'Riya',
      role: 'Frequent Guest',
      quote:
          'The app feels polished and the stays look exactly as premium as the website promised.',
    ),
    _TestimonialData(
      name: 'Aman',
      role: 'Corporate Booker',
      quote:
          'We found workspace-ready properties quickly, and the booking flow felt smooth from search to confirmation.',
    ),
    _TestimonialData(
      name: 'Priya',
      role: 'Host Partner',
      quote:
          'Branding, presentation, and listing quality all feel high-trust. It matches the platform identity beautifully.',
    ),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PropertyProvider>().searchProperties({});
    });
    _heroTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (!mounted || !_heroController.hasClients) return;
      final nextIndex = (_heroIndex + 1) % _heroSlides.length;
      _heroController.animateToPage(
        nextIndex,
        duration: const Duration(milliseconds: 700),
        curve: Curves.easeInOut,
      );
    });
  }

  @override
  void dispose() {
    _heroTimer?.cancel();
    _heroController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final propertyProvider = context.watch<PropertyProvider>();
    final properties = propertyProvider.properties;
    final residential = _filterByCategory(properties, 'residential');
    final commercial = _filterByCategory(properties, 'commercial');
    final event = _filterEvent(properties);
    final featured = properties.take(6).toList();

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(child: _buildHero(auth)),
          SliverToBoxAdapter(
            child: _buildDestinationStrip(),
          ),
          SliverToBoxAdapter(
            child: _buildCollections(
              title: 'Residential Collection',
              subtitle: 'Luxury homes, apartments, and private stays.',
              properties: residential.isNotEmpty ? residential : featured,
            ),
          ),
          SliverToBoxAdapter(
            child: _buildCollections(
              title: 'Commercial Spaces',
              subtitle: 'Premium offices, co-working spaces, and retail.',
              properties: commercial.isNotEmpty ? commercial : featured,
            ),
          ),
          SliverToBoxAdapter(
            child: _buildCollections(
              title: 'Wedding Venues',
              subtitle: 'Celebration-ready venues with polished hospitality.',
              properties: event.isNotEmpty ? event : featured,
            ),
          ),
          SliverToBoxAdapter(child: _buildHostBanner(auth)),
          SliverToBoxAdapter(child: _buildTestimonialSection()),
          SliverToBoxAdapter(child: _buildFooter()),
          const SliverToBoxAdapter(child: SizedBox(height: 110)),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.secondary,
        foregroundColor: Colors.white,
        onPressed: () {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (_) => const AppShell(initialIndex: 3),
            ),
          );
        },
        label: Text(
          'AI Chat',
          style: GoogleFonts.manrope(fontWeight: FontWeight.w800),
        ),
        icon: const Icon(Icons.auto_awesome_outlined),
      ),
    );
  }

  Widget _buildHero(AuthProvider auth) {
    final topPadding = MediaQuery.of(context).padding.top;
    return SizedBox(
      height: 560 + topPadding,
      child: Stack(
        children: [
          PageView.builder(
            controller: _heroController,
            itemCount: _heroSlides.length,
            onPageChanged: (index) => setState(() => _heroIndex = index),
            itemBuilder: (context, index) {
              final slide = _heroSlides[index];
              return Stack(
                fit: StackFit.expand,
                children: [
                  Image.network(
                    slide.image,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(color: AppTheme.secondary);
                    },
                  ),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.black.withValues(alpha: 0.40),
                          Colors.black.withValues(alpha: 0.18),
                          AppTheme.secondary.withValues(alpha: 0.86),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(18, topPadding + 18, 18, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildHeroHeader(auth),
                const Spacer(),
                _buildHeroCopy(_heroSlides[_heroIndex]),
                const SizedBox(height: 20),
                _buildSearchPanel(),
                const SizedBox(height: 18),
                _buildHeroIndicators(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroHeader(AuthProvider auth) {
    return Row(
      children: [
        const AppLogo(height: 24, white: true, framed: false),
        const Spacer(),
        TextButton(
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) =>
                    auth.isAuthenticated ? const AppShell() : const LoginScreen(),
              ),
            );
          },
          child: Text(
            auth.isAuthenticated ? 'Dashboard' : 'Sign In',
            style: GoogleFonts.manrope(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: 13,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
          ),
          child: IconButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const LoginScreen()),
              );
            },
            icon: const Icon(Icons.menu_rounded, color: Colors.white),
          ),
        ),
      ],
    );
  }

  Widget _buildHeroCopy(_HeroSlide slide) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.10),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: AppTheme.primary.withValues(alpha: 0.55)),
          ),
          child: Text(
            slide.tag,
            style: GoogleFonts.manrope(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 2.4,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 18),
        RichText(
          textAlign: TextAlign.center,
          text: TextSpan(
            style: GoogleFonts.manrope(
              fontSize: 33,
              height: 1.12,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
            children: [
              TextSpan(text: slide.titlePrefix),
              TextSpan(
                text: slide.titleHighlight,
                style: GoogleFonts.manrope(
                  fontSize: 33,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: Colors.white),
              ),
              child: Text(
                slide.badge,
                style: GoogleFonts.manrope(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSearchPanel() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.16),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: InkWell(
              onTap: _openSearchSheet,
              borderRadius: BorderRadius.circular(999),
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                child: Row(
                  children: [
                    const Icon(
                      Icons.location_on_outlined,
                      size: 20,
                      color: AppTheme.charcoalMuted,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Where to?',
                            style: GoogleFonts.manrope(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.charcoal,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            _searchSummary,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.manrope(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.charcoalMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          _SearchIconButton(
            icon: Icons.apartment_outlined,
            onTap: _openSearchSheet,
          ),
          _SearchIconButton(
            icon: Icons.calendar_month_outlined,
            onTap: _openSearchSheet,
          ),
          _SearchIconButton(
            icon: Icons.person_outline_rounded,
            onTap: _openSearchSheet,
          ),
          const SizedBox(width: 6),
          InkWell(
            onTap: _runSearch,
            borderRadius: BorderRadius.circular(999),
            child: Container(
              width: 46,
              height: 46,
              decoration: const BoxDecoration(
                color: Color(0xFF1A1A1A),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.search, color: Colors.white, size: 22),
            ),
          ),
        ],
      ),
    );
  }

  String get _searchSummary {
    final dateText = _selectedRange == null
        ? 'Any week'
        : '${DateFormat('dd MMM').format(_selectedRange!.start)} - ${DateFormat('dd MMM').format(_selectedRange!.end)}';
    return '$_selectedCity · $_selectedCategory · $dateText · $_guestCount guests';
  }

  Widget _buildHeroIndicators() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(_heroSlides.length, (index) {
        final active = index == _heroIndex;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          margin: const EdgeInsets.symmetric(horizontal: 4),
          width: active ? 24 : 7,
          height: 7,
          decoration: BoxDecoration(
            color: active ? AppTheme.primary : Colors.white.withValues(alpha: 0.38),
            borderRadius: BorderRadius.circular(99),
          ),
        );
      }),
    );
  }

  Widget _buildCollections({
    required String title,
    required String subtitle,
    required List<PropertyModel> properties,
  }) {
    if (properties.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.manrope(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.7,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: GoogleFonts.manrope(
              fontSize: 14,
              height: 1.6,
              color: AppTheme.charcoalMuted,
            ),
          ),
          const SizedBox(height: 18),
          SizedBox(
            height: 330,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: properties.length.clamp(0, 8),
              separatorBuilder: (_, __) => const SizedBox(width: 16),
              itemBuilder: (context, index) {
                final property = properties[index];
                return _PropertyCard(property: property);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDestinationStrip() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(20, 26, 20, 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'Pick a Destination',
                style: GoogleFonts.cormorantGaramond(
                  fontSize: 30,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.charcoal,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'Show nearby locations',
                style: GoogleFonts.manrope(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.charcoalMuted,
                ),
              ),
              const Spacer(),
              const Icon(Icons.chevron_left, color: AppTheme.charcoal, size: 20),
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right, color: AppTheme.charcoal, size: 20),
            ],
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 118,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _destinations.length,
              separatorBuilder: (_, __) => const SizedBox(width: 24),
              itemBuilder: (context, index) {
                final destination = _destinations[index];
                return InkWell(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => GuestBrowseScreen(
                          initialCity: destination.city,
                        ),
                      ),
                    );
                  },
                  child: SizedBox(
                    width: 82,
                    child: Column(
                      children: [
                        Container(
                          width: 58,
                          height: 58,
                          decoration: BoxDecoration(
                            color: const Color(0xFFF7F7F7),
                            shape: BoxShape.circle,
                            border: Border.all(color: const Color(0xFFEDEDED)),
                          ),
                          child: Icon(
                            destination.icon,
                            color: AppTheme.charcoal,
                            size: 26,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          destination.city,
                          textAlign: TextAlign.center,
                          style: GoogleFonts.manrope(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.charcoal,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHostBanner(AuthProvider auth) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 28, 20, 0),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(30),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFFFF7EA), Color(0xFFF3ECE3)],
        ),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Ready to Host with Us?',
            style: GoogleFonts.manrope(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Join India\'s premium short-term rental network and turn curated spaces into high-yield assets.',
            style: GoogleFonts.manrope(
              fontSize: 14,
              height: 1.6,
              color: AppTheme.charcoalMuted,
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => auth.isAuthenticated
                            ? const AppShell()
                            : const LoginScreen(),
                      ),
                    );
                  },
                  child: const Text('List Your Property'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTestimonialSection() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 30, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Loved by Guests & Hosts',
            style: GoogleFonts.manrope(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'A premium experience should feel refined on every screen, from discovery to checkout.',
            style: GoogleFonts.manrope(
              fontSize: 14,
              height: 1.6,
              color: AppTheme.charcoalMuted,
            ),
          ),
          const SizedBox(height: 18),
          ..._testimonials.map(
            (item) => Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: List.generate(
                      5,
                      (_) => const Padding(
                        padding: EdgeInsets.only(right: 2),
                        child: Icon(Icons.star_rounded,
                            size: 16, color: AppTheme.primary),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    item.quote,
                    style: GoogleFonts.manrope(
                      fontSize: 14,
                      height: 1.7,
                      color: AppTheme.charcoal,
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    item.name,
                    style: GoogleFonts.manrope(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.charcoal,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    item.role,
                    style: GoogleFonts.manrope(
                      fontSize: 12,
                      color: AppTheme.charcoalMuted,
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

  Widget _buildFooter() {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 28, 20, 0),
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 26),
      decoration: BoxDecoration(
        color: AppTheme.secondary,
        borderRadius: BorderRadius.circular(30),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const AppLogo(height: 22, white: true, framed: false),
          const SizedBox(height: 16),
          Text(
            'Redefining short-term rentals in India through curation, technology, and premium service.',
            style: GoogleFonts.manrope(
              color: Colors.white.withValues(alpha: 0.76),
              fontSize: 13,
              height: 1.6,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Nashik, Maharashtra',
            style: GoogleFonts.manrope(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            '© 2026 X-Space360. Owned & Operated by Golden Rich Financial Solutions & Real Estate Solutions Pvt Ltd.',
            style: GoogleFonts.manrope(
              color: Colors.white.withValues(alpha: 0.54),
              fontSize: 11,
              height: 1.6,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _openSearchSheet() async {
    final result = await showModalBottomSheet<_SearchSelection>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _SearchBottomSheet(
        initialCity: _selectedCity == 'Anywhere' ? '' : _selectedCity,
        initialCategory: _selectedCategory,
        initialRange: _selectedRange,
        initialGuests: _guestCount,
      ),
    );
    if (result == null || !mounted) return;
    setState(() {
      _selectedCity = result.city.isEmpty ? 'Anywhere' : result.city;
      _selectedCategory = result.category;
      _selectedRange = result.range;
      _guestCount = result.guests;
    });
    _runSearch();
  }

  void _runSearch() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => GuestBrowseScreen(
          initialCity: _selectedCity == 'Anywhere' ? null : _selectedCity,
          initialGuests: _guestCount,
          initialCategory: _mapCategoryToBrowseValue(_selectedCategory),
        ),
      ),
    );
  }

  String? _mapCategoryToBrowseValue(String category) {
    switch (category.toLowerCase()) {
      case 'residential':
        return 'residential';
      case 'commercial':
        return 'commercial';
      case 'event venue':
        return 'event_venue';
      default:
        return null;
    }
  }

  List<PropertyModel> _filterByCategory(
    List<PropertyModel> properties,
    String category,
  ) {
    return properties
        .where((property) => property.category.toLowerCase() == category)
        .toList();
  }

  List<PropertyModel> _filterEvent(List<PropertyModel> properties) {
    return properties
        .where((property) {
          final category = property.category.toLowerCase();
          return category == 'event' ||
              category == 'event_venue' ||
              category == 'events_venue';
        })
        .toList();
  }
}

class _PropertyCard extends StatelessWidget {
  final PropertyModel property;

  const _PropertyCard({required this.property});

  @override
  Widget build(BuildContext context) {
    final rating = property.rating ?? 4.8;
    final image = property.images.isNotEmpty ? property.images.first : null;

    return SizedBox(
      width: 250,
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => PropertyDetailScreen(propertyId: property.propertyId),
            ),
          );
        },
        borderRadius: BorderRadius.circular(26),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(26),
                    child: image != null
                        ? Image.network(
                            image,
                            width: double.infinity,
                            height: double.infinity,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) {
                              return Container(
                                color: AppTheme.stone,
                                child: const Center(
                                  child: Icon(Icons.home_work_outlined,
                                      color: AppTheme.charcoalMuted, size: 34),
                                ),
                              );
                            },
                          )
                        : Container(
                            color: AppTheme.stone,
                            child: const Center(
                              child: Icon(Icons.home_work_outlined,
                                  color: AppTheme.charcoalMuted, size: 34),
                            ),
                          ),
                  ),
                  Positioned(
                    top: 12,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 7),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.88),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        property.category.toUpperCase(),
                        style: GoogleFonts.manrope(
                          color: AppTheme.charcoal,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.0,
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 12,
                    right: 12,
                    child: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.90),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.favorite_border_rounded,
                        color: AppTheme.charcoal,
                        size: 18,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    property.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.manrope(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.charcoal,
                      height: 1.35,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Row(
                  children: [
                    const Icon(Icons.star_rounded,
                        color: AppTheme.primary, size: 16),
                    const SizedBox(width: 3),
                    Text(
                      rating.toStringAsFixed(1),
                      style: GoogleFonts.manrope(
                        fontWeight: FontWeight.w700,
                        color: AppTheme.charcoal,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '${property.city}, ${property.state}',
              style: GoogleFonts.manrope(
                fontSize: 12,
                color: AppTheme.charcoalMuted,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              '${NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0).format(property.pricePerNight)} / night',
              style: GoogleFonts.manrope(
                fontSize: 14,
                fontWeight: FontWeight.w800,
                color: AppTheme.charcoal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SearchBottomSheet extends StatefulWidget {
  final String initialCity;
  final String initialCategory;
  final DateTimeRange? initialRange;
  final int initialGuests;

  const _SearchBottomSheet({
    required this.initialCity,
    required this.initialCategory,
    required this.initialRange,
    required this.initialGuests,
  });

  @override
  State<_SearchBottomSheet> createState() => _SearchBottomSheetState();
}

class _SearchBottomSheetState extends State<_SearchBottomSheet> {
  final TextEditingController _cityController = TextEditingController();
  DateTimeRange? _range;
  int _guests = 2;
  String _category = 'All Types';

  static const List<String> _popularCities = [
    'Goa',
    'Mumbai',
    'Nashik',
    'Pune',
    'Bangalore',
  ];

  static const List<String> _categories = [
    'All Types',
    'Residential',
    'Commercial',
    'Event Venue',
  ];

  @override
  void initState() {
    super.initState();
    _cityController.text = widget.initialCity;
    _range = widget.initialRange;
    _guests = widget.initialGuests;
    _category = widget.initialCategory;
  }

  @override
  void dispose() {
    _cityController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            22,
            14,
            22,
            MediaQuery.of(context).viewInsets.bottom + 22,
          ),
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
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Search stays',
                style: GoogleFonts.manrope(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.charcoal,
                ),
              ),
              const SizedBox(height: 18),
              TextField(
                controller: _cityController,
                decoration: const InputDecoration(
                  hintText: 'Search destinations',
                  prefixIcon: Icon(Icons.location_on_outlined),
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                height: 38,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _popularCities.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final city = _popularCities[index];
                    return ChoiceChip(
                      label: Text(city),
                      selected: _cityController.text == city,
                      onSelected: (_) {
                        setState(() => _cityController.text = city);
                      },
                      selectedColor: AppTheme.secondary,
                      labelStyle: GoogleFonts.manrope(
                        color: _cityController.text == city
                            ? Colors.white
                            : AppTheme.charcoal,
                        fontWeight: FontWeight.w700,
                      ),
                      backgroundColor: AppTheme.stone,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(999),
                        side: BorderSide.none,
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                height: 40,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _categories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final category = _categories[index];
                    final selected = _category == category;
                    return ChoiceChip(
                      label: Text(category),
                      selected: selected,
                      onSelected: (_) {
                        setState(() => _category = category);
                      },
                      selectedColor: AppTheme.primary,
                      backgroundColor: AppTheme.stone,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(999),
                        side: BorderSide.none,
                      ),
                      labelStyle: GoogleFonts.manrope(
                        color: selected ? AppTheme.secondary : AppTheme.charcoal,
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),
              InkWell(
                onTap: _pickDates,
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  decoration: BoxDecoration(
                    color: AppTheme.sand,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_month_outlined,
                          color: AppTheme.terracotta),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _range == null
                              ? 'Select dates'
                              : '${DateFormat('dd MMM').format(_range!.start)} - ${DateFormat('dd MMM').format(_range!.end)}',
                          style: GoogleFonts.manrope(
                            color: AppTheme.charcoal,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: AppTheme.sand,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.people_outline, color: AppTheme.sage),
                    const SizedBox(width: 12),
                    Text(
                      'Guests',
                      style: GoogleFonts.manrope(
                        fontWeight: FontWeight.w700,
                        color: AppTheme.charcoal,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      onPressed: _guests > 1
                          ? () => setState(() => _guests--)
                          : null,
                      icon: const Icon(Icons.remove_circle_outline),
                    ),
                    Text(
                      '$_guests',
                      style: GoogleFonts.manrope(
                        fontWeight: FontWeight.w800,
                        color: AppTheme.charcoal,
                      ),
                    ),
                    IconButton(
                      onPressed: () => setState(() => _guests++),
                      icon: const Icon(Icons.add_circle_outline),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(
                      context,
                      _SearchSelection(
                        city: _cityController.text.trim(),
                        category: _category,
                        range: _range,
                        guests: _guests,
                      ),
                    );
                  },
                  child: const Text('Apply & Search'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickDates() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      initialDateRange: _range,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppTheme.primary,
              onPrimary: AppTheme.secondary,
              surface: Colors.white,
              onSurface: AppTheme.charcoal,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _range = picked);
    }
  }
}

class _SearchIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _SearchIconButton({
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        width: 38,
        height: 38,
        margin: const EdgeInsets.symmetric(horizontal: 1.5),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(999),
        ),
        child: Icon(icon, size: 20, color: AppTheme.charcoal),
      ),
    );
  }
}

class _SearchSelection {
  final String city;
  final String category;
  final DateTimeRange? range;
  final int guests;

  const _SearchSelection({
    required this.city,
    required this.category,
    required this.range,
    required this.guests,
  });
}

class _HeroSlide {
  final String image;
  final String tag;
  final String titlePrefix;
  final String titleHighlight;
  final String subtitle;
  final String badge;
  final String? category;

  const _HeroSlide({
    required this.image,
    required this.tag,
    required this.titlePrefix,
    required this.titleHighlight,
    required this.subtitle,
    required this.badge,
    required this.category,
  });
}

class _DestinationData {
  final String city;
  final IconData icon;

  const _DestinationData(this.city, this.icon);
}

class _TestimonialData {
  final String name;
  final String role;
  final String quote;

  const _TestimonialData({
    required this.name,
    required this.role,
    required this.quote,
  });
}
