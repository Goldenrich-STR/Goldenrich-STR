import 'dart:async';
import 'dart:convert';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:share_plus/share_plus.dart';

import '../../models/property_model.dart';
import '../../config.dart';
import '../../providers/auth_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/property_provider.dart';
import '../../services/api_service.dart';
import '../../theme.dart';
import '../../utils/currency_formatter.dart';
import '../../utils/wishlist_action.dart';
import '../auth/login_screen.dart';
import '../shared/app_logo.dart';
import '../shared/app_shell.dart';
import '../shared/notifications_screen.dart';
import '../shared/property_image.dart';
import '../shared/support_tickets_screen.dart';
import 'explore_map_screen.dart';
import 'guest_browse_screen.dart';
import 'offers_screen.dart';
import 'property_detail_screen.dart';

class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  static const String _recentlyVisitedKey = 'recently_visited_properties';
  String _selectedCity = 'Anywhere';
  String _searchQuery = '';
  String _selectedCategory = 'All Types';
  DateTimeRange? _selectedRange;
  int _guestCount = 2;
  late final PageController _heroPageController;
  Timer? _heroTimer;
  int _activeHeroIndex = 0;
  int? _registeredHostCount;
  List<_HeroSlide> _cmsHeroSlides = [];
  List<PropertyModel> _recentlyVisitedProperties = [];
  List<_BlogData> _blogCards = [];
  String _activeHolidayGetawayCity = 'All';

  static final List<_HeroSlide> _fallbackHeroSlides = [
    _HeroSlide(
      image: AppConfig.resolveWebAssetUrl(
          '/videos/hero/pexels-contact-me-923323219715-262056873-12703092.jpg'),
      tag: 'COMMERCIAL SPACES',
      titlePrefix: 'Premium Workspaces in ',
      titleHighlight: 'Nashik',
      subtitle:
          'Find polished offices, co-working spaces, and business-ready venues.',
      badge: 'Office and Workspace Ready',
      category: 'commercial',
      isNetworkImage: true,
    ),
    _HeroSlide(
      image: AppConfig.resolveWebAssetUrl(
          '/videos/hero/hero-villa-mobile-crop.png'),
      tag: 'RESORT VILLAS',
      titlePrefix: "Luxury Villas in India's ",
      titleHighlight: 'Wine Capital',
      subtitle:
          'Premium villa stays for family trips and peaceful weekend getaways.',
      badge: 'Private Pool and Scenic Views',
      category: 'residential',
      isNetworkImage: true,
    ),
    _HeroSlide(
      image: AppConfig.resolveWebAssetUrl(
          '/videos/hero/pexels-thevisionaryvows-33485961.jpg'),
      tag: 'WEDDING VENUES',
      titlePrefix: 'Luxury Weddings, ',
      titleHighlight: 'Beautiful Memories',
      subtitle:
          'Stylish venues for weddings, parties, launches, and memorable gatherings.',
      badge: 'Curated Venue Support Included',
      category: 'event_venue',
      isNetworkImage: true,
    ),
    _HeroSlide(
      image: AppConfig.resolveWebAssetUrl(
          '/videos/hero/pexels-liva-kitchens-and-interiors-2153927697-33452539.jpg'),
      tag: 'RESIDENTIAL SPACES',
      titlePrefix: 'Experience the ',
      titleHighlight: 'Comfort of Home',
      subtitle: 'Elegant homes and apartments designed for smooth short stays.',
      badge: 'Verified Homes and Easy Booking',
      category: 'residential',
      isNetworkImage: true,
    ),
  ];

  static const List<_DestinationData> _destinations = [
    _DestinationData('Nashik', 'nashik'),
    _DestinationData('Trimbakeshwar', 'trimbak'),
    _DestinationData('Mumbai', 'mumbai'),
    _DestinationData('Goa', 'goa'),
    _DestinationData('Gangapur Dam', 'gangapur_dam'),
    _DestinationData('Sula Vineyards', 'sula'),
    _DestinationData('Igatpuri', 'igatpuri'),
    _DestinationData('Anjaneri', 'anjaneri'),
    _DestinationData('Harihar Fort', 'harihar_fort'),
    _DestinationData('Bhandardara', 'bhandardara'),
  ];

  List<_HeroSlide> get _heroSlides =>
      _cmsHeroSlides.isNotEmpty ? _cmsHeroSlides : _fallbackHeroSlides;

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

  static const List<_PromoCardData> _promoCards = [
    _PromoCardData(
      eyebrow: 'LIMITED OFFER',
      title: 'Monsoon getaways with premium add-ons',
      description:
          'Unlock breakfast upgrades, scenic stays, and flexible planning on select homes.',
      icon: Icons.local_offer_outlined,
    ),
    _PromoCardData(
      eyebrow: 'BUSINESS READY',
      title: 'Smart spaces for meetings and team offsites',
      description:
          'Discover curated offices and workcation stays tailored for weekday productivity.',
      icon: Icons.corporate_fare_outlined,
    ),
  ];

  static const List<_CollectionCardData> _collectionCards = [
    _CollectionCardData(
      id: 'luxury-villas',
      label: 'Luxury Villas & Farmhouses',
      detail:
          'From Alibaug to Coorg, our hand-picked villas offer privacy, caretakers, BBQ setups, and breathtaking views for family vacations and weekend escapes.',
      tag: 'Most Booked',
      image: '',
      category: 'residential',
      propertyType: 'villa',
    ),
    _CollectionCardData(
      id: 'hilltop-retreats',
      label: 'Signature Series',
      detail:
          'A curated portfolio of exclusive private estates featuring elevated luxury, premium hospitality, and unforgettable destination-led stays.',
      tag: 'Signature Series',
      image: '',
      category: 'residential',
      propertyType: 'resort',
    ),
    _CollectionCardData(
      id: 'wedding-venues',
      label: 'Intimate Wedding & Event Venues',
      detail:
          'Curated celebration venues with floral courtyards, rooftop terraces, and in-house hospitality for memorable gatherings.',
      tag: 'Trending',
      image: '',
      category: 'event_venue',
      propertyType: 'banquet_hall',
    ),
    _CollectionCardData(
      id: 'residential-stays',
      label: 'Premium Apartments & Homes',
      detail:
          'Fully serviced urban homes with hotel-grade amenities, ideal for business travelers, relocating professionals, and long stays.',
      tag: 'New Launches',
      image: '',
      category: 'residential',
      propertyType: 'apartment',
    ),
    _CollectionCardData(
      id: 'commercial-spaces',
      label: 'Commercial & Co-working Spaces',
      detail:
          'Short-term and long-term rentals for startups, corporate offsites, and growing teams with boardrooms and plug-and-play work setups.',
      tag: 'Corporate Picks',
      image: '',
      category: 'commercial',
    ),
    _CollectionCardData(
      id: 'resort-villas',
      label: 'Resort Villas & Pool Stays',
      detail:
          'Scenic villas, pool stays, and weekend resorts with lawns, caretakers, and premium leisure amenities across top getaway destinations.',
      tag: 'Resort Picks',
      image: '',
      category: 'residential',
      propertyType: 'villa',
    ),
  ];

  static const List<_FooterSectionData> _footerSections = [
    _FooterSectionData(
      title: 'Premium Stays',
      links: ['Residential Homes', 'Weekend Retreats', 'Managed Apartments'],
    ),
    _FooterSectionData(
      title: 'Places To Visit',
      links: ['Sula Vineyards', 'Anjaneri', 'Gangapur Dam'],
    ),
    _FooterSectionData(
      title: 'Top Locations',
      links: ['Stays in Nashik', 'Stays in Igatpuri', 'Stays in Trimbak'],
    ),
    _FooterSectionData(
      title: 'Top Collections',
      links: ['Corporate Stays', 'Wedding Venues', 'Commercial Spaces'],
    ),
    _FooterSectionData(
      title: 'Platform Guide',
      links: ['Booking Tips', 'Host Stories', 'Guest Support'],
    ),
    _FooterSectionData(
      title: 'Support',
      links: ['Help Centre', 'Call Support', 'Terms of Stay'],
    ),
  ];

  @override
  void initState() {
    super.initState();
    _heroPageController = PageController(viewportFraction: 1);
    _heroTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!_heroPageController.hasClients || _heroSlides.length <= 1) return;
      final nextIndex = (_activeHeroIndex + 1) % _heroSlides.length;
      if (mounted) {
        setState(() => _activeHeroIndex = nextIndex);
      }
      _heroPageController.animateToPage(
        nextIndex,
        duration: const Duration(milliseconds: 450),
        curve: Curves.easeInOut,
      );
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadInitialLandingData();
      Provider.of<NotificationProvider>(context, listen: false)
          .loadUnreadCount();
    });
  }

  @override
  void dispose() {
    _heroTimer?.cancel();
    _heroPageController.dispose();
    super.dispose();
  }

  Future<void> _loadRecentlyVisitedProperties() async {
    final prefs = await SharedPreferences.getInstance();
    try {
      final raw = jsonDecode(prefs.getString(_recentlyVisitedKey) ?? '[]');
      if (raw is! List) return;
      final items = raw
          .whereType<Map>()
          .map(
              (item) => PropertyModel.fromJson(Map<String, dynamic>.from(item)))
          .where((item) => item.propertyId.isNotEmpty)
          .toList();
      if (!mounted) return;
      setState(() => _recentlyVisitedProperties = items);
    } catch (_) {
      if (!mounted) return;
      setState(() => _recentlyVisitedProperties = []);
    }
  }

  Future<void> _loadInitialLandingData() async {
    final propertyProvider = context.read<PropertyProvider>();
    await Future.wait([
      propertyProvider.loadLandingSections(),
      _loadRecentlyVisitedProperties(),
      _loadLandingCms(),
    ]);
    if (!mounted) return;
    _precacheLandingImages(propertyProvider);
  }

  void _precacheLandingImages(PropertyProvider propertyProvider) {
    final visibleProperties = <PropertyModel>[
      ..._recentlyVisitedProperties.take(2),
      ...propertyProvider.landingResidential.take(4),
      ...propertyProvider.landingCommercial.take(4),
      ...propertyProvider.landingEvents.take(4),
    ];
    final urls = <String>{
      for (final slide in _heroSlides)
        if (slide.isNetworkImage && slide.image.isNotEmpty) slide.image,
      for (final property in visibleProperties)
        if (property.images.isNotEmpty)
          ...property.images
              .take(2)
              .map(PropertyImage.validPropertyImageUrl)
              .whereType<String>(),
    };

    for (final url in urls.take(18)) {
      precacheImage(CachedNetworkImageProvider(url), context);
    }
  }

  Future<void> _loadLandingCms() async {
    try {
      final response = await ApiService().dio.get('/cms/landing-page');
      final heroData = response.data?['hero'];
      final heroSlides = _parseCmsHeroSlides(heroData);
      final blogPosts = response.data?['blog']?['posts'];
      final hostCount = _parseHostCount(response.data?['stats']);

      final nextBlogs = blogPosts is List
          ? blogPosts
              .whereType<Map>()
              .where((post) => post['is_active'] != false)
              .map((post) {
                final item = Map<String, dynamic>.from(post);
                return _BlogData(
                  imageUrl: item['image_url']?.toString().isNotEmpty == true
                      ? item['image_url'].toString()
                      : item['img']?.toString().isNotEmpty == true
                          ? item['img'].toString()
                          : '',
                  category:
                      (item['category']?.toString().trim().isNotEmpty == true)
                          ? item['category'].toString()
                          : 'X-Space360 Journal',
                  title: (item['title']?.toString().trim().isNotEmpty == true)
                      ? item['title'].toString()
                      : 'Untitled',
                  excerpt: (item['excerpt']?.toString().trim().isNotEmpty ==
                          true)
                      ? item['excerpt'].toString()
                      : (item['content']?.toString().trim().isNotEmpty == true)
                          ? item['content'].toString()
                          : 'Discover more from X-Space360.',
                  content: (item['content']?.toString().trim().isNotEmpty ==
                          true)
                      ? item['content'].toString()
                      : (item['excerpt']?.toString().trim().isNotEmpty == true)
                          ? item['excerpt'].toString()
                          : 'Discover more from X-Space360.',
                );
              })
              .take(6)
              .toList()
          : <_BlogData>[];

      if (!mounted) return;
      setState(() {
        if (heroSlides.isNotEmpty) {
          _cmsHeroSlides = heroSlides;
          _activeHeroIndex = 0;
          if (_heroPageController.hasClients) {
            _heroPageController.jumpToPage(0);
          }
        }
        if (nextBlogs.isNotEmpty) {
          _blogCards = nextBlogs;
        }
        _registeredHostCount = hostCount;
      });
      for (final slide in heroSlides.take(6)) {
        if (slide.image.isNotEmpty) {
          precacheImage(CachedNetworkImageProvider(slide.image), context);
        }
      }
    } catch (_) {}
  }

  int? _parseHostCount(dynamic statsData) {
    if (statsData is! Map) return null;
    final raw = statsData['host_count'] ??
        statsData['hosts_count'] ??
        statsData['total_hosts'] ??
        statsData['hosts'];
    if (raw is num) return raw.toInt();
    return int.tryParse(raw?.toString() ?? '');
  }

  List<_HeroSlide> _parseCmsHeroSlides(dynamic heroData) {
    if (heroData is! Map) return const [];
    final hero = Map<String, dynamic>.from(heroData);
    final rawSlides = hero['slides'];
    final slides = rawSlides is List && rawSlides.isNotEmpty
        ? rawSlides
        : [
            if ((hero['image_url'] ?? '').toString().trim().isNotEmpty)
              {'image_url': hero['image_url']}
          ];

    return slides
        .whereType<Map>()
        .map((rawSlide) {
          final slide = Map<String, dynamic>.from(rawSlide);
          final image =
              (slide['image_url'] ?? slide['src'] ?? slide['image'] ?? '')
                  .toString()
                  .trim();
          if (image.isEmpty) return null;
          final titlePrefix = (slide['titlePrefix'] ??
                  slide['title_prefix'] ??
                  hero['title'] ??
                  '')
              .toString()
              .replaceAll(RegExp(r'<[^>]*>'), ' ')
              .trim();
          final badges = slide['badges'];
          final badge = badges is List && badges.isNotEmpty
              ? badges.first.toString()
              : (slide['badge'] ?? hero['trusted_text'] ?? '').toString();
          return _HeroSlide(
            image: AppConfig.resolveWebAssetUrl(image),
            tag: (slide['tag'] ?? hero['sub_tag'] ?? 'X-SPACE360').toString(),
            titlePrefix:
                titlePrefix.isNotEmpty ? '$titlePrefix ' : 'Find Your ',
            titleHighlight:
                (slide['titleHighlight'] ?? slide['title_highlight'] ?? 'Space')
                    .toString(),
            subtitle: (slide['subtitle'] ?? hero['subtitle'] ?? '').toString(),
            badge: badge,
            category: _categoryFromHeroTag((slide['tag'] ?? '').toString()),
            isNetworkImage: true,
          );
        })
        .whereType<_HeroSlide>()
        .take(6)
        .toList();
  }

  String? _categoryFromHeroTag(String tag) {
    final normalized = tag.toLowerCase();
    if (normalized.contains('commercial') || normalized.contains('workspace')) {
      return 'commercial';
    }
    if (normalized.contains('wedding') ||
        normalized.contains('event') ||
        normalized.contains('venue')) {
      return 'event_venue';
    }
    return 'residential';
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final propertyProvider = context.watch<PropertyProvider>();
    final residential = propertyProvider.landingResidential;
    final commercial = propertyProvider.landingCommercial;
    final event = propertyProvider.landingEvents;
    final properties = [
      ...residential,
      ...commercial,
      ...event,
    ];

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppTheme.primary,
          onRefresh: () async {
            final propertyProvider = context.read<PropertyProvider>();
            await propertyProvider.loadLandingSections();
            await _loadRecentlyVisitedProperties();
            if (mounted) {
              _precacheLandingImages(propertyProvider);
            }
          },
          child: ListView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(18, 12, 18, 28),
            children: [
              _buildCommercialTopBar(auth),
              const SizedBox(height: 18),
              _buildCommercialHero(),
              const SizedBox(height: 16),
              _buildCommercialSearch(),
              const SizedBox(height: 26),
              _buildPopularLocationsCompact(properties),
              const SizedBox(height: 26),
              _buildBecomeHostBanner(auth),
              const SizedBox(height: 26),
              _buildRecentlyViewedCompact(),
              const SizedBox(height: 26),
              _buildFeaturedSpacesCompact(
                title: 'Residential Stays',
                category: 'residential',
                properties: residential,
              ),
              const SizedBox(height: 26),
              _buildFeaturedSpacesCompact(
                title: 'Commercial Spaces',
                category: 'commercial',
                properties: commercial,
              ),
              const SizedBox(height: 26),
              _buildFeaturedSpacesCompact(
                title: 'Event Venues',
                category: 'event_venue',
                properties: event,
              ),
              const SizedBox(height: 22),
              _buildOfferBanner(),
            ],
          ),
        ),
      ),
    );
  }

  void _openHostSignup(AuthProvider auth) {
    final userRole = auth.currentUser?.role.toLowerCase();
    if (userRole == 'host') {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const AppShell(initialIndex: 2)),
      );
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const LoginScreen(
          initialSignUpMode: true,
          initialRole: 'host',
        ),
      ),
    );
  }

  void _openBrowse({
    String? category,
    String? city,
    String? propertyType,
    int? guests,
    String? searchQuery,
    DateTimeRange? dateRange,
  }) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => GuestBrowseScreen(
          initialCity: city,
          initialSearchQuery: searchQuery,
          initialCategory: category,
          initialPropertyType: propertyType,
          initialGuests: guests,
          initialDateRange: dateRange,
        ),
      ),
    );
  }

  void _openCommercialBrowse({
    String? city,
    String? propertyType,
    int? guests,
    String? searchQuery,
  }) {
    _openBrowse(
      category: 'commercial',
      city: city,
      propertyType: propertyType,
      guests: guests,
      searchQuery: searchQuery,
    );
  }

  Widget _buildCommercialTopBar(AuthProvider auth) {
    final user = auth.currentUser;
    final unreadCount = context.watch<NotificationProvider>().unreadCount;
    return Row(
      children: [
        Expanded(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ExploreMapScreen()),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Flexible(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 178),
                        child: const AppLogo(height: 34),
                      ),
                    ),
                    const SizedBox(width: 3),
                    const Icon(Icons.keyboard_arrow_down_rounded,
                        size: 20, color: Color(0xFF07142F)),
                  ],
                ),
                const SizedBox(height: 2),
                Text('Find Your Perfect Space',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.manrope(
                        fontSize: 12,
                        height: 1.1,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.charcoalLight)),
              ],
            ),
          ),
        ),
        _HeaderNotificationButton(
          unreadCount: user == null ? 0 : unreadCount,
          onTap: () {
            if (user == null) {
              Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => const LoginScreen(initialRole: 'guest')),
              );
              return;
            }
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const NotificationsScreen()),
            );
          },
        ),
        const SizedBox(width: 4),
        GestureDetector(
          onTap: () {
            if (user == null) {
              Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => const LoginScreen(initialRole: 'guest')));
            } else {
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(
                    builder: (_) => const AppShell(initialIndex: 4)),
              );
            }
          },
          child: CircleAvatar(
            radius: 24,
            backgroundColor: const Color(0xFF07142F),
            child: Icon(user == null ? Icons.person : Icons.person,
                color: Colors.white),
          ),
        ),
      ],
    );
  }

  Widget _buildCommercialHero() {
    final media = MediaQuery.sizeOf(context);
    final slides = _heroSlides;
    final heroHeight = (media.width * 0.58).clamp(168.0, 235.0);
    final activeIndex = _activeHeroIndex.clamp(0, slides.length - 1).toInt();
    final activeSlide = slides[activeIndex];
    return ClipRRect(
      borderRadius: BorderRadius.circular(22),
      child: SizedBox(
        height: heroHeight,
        child: Stack(
          fit: StackFit.expand,
          children: [
            PageView.builder(
              controller: _heroPageController,
              itemCount: slides.length,
              onPageChanged: (index) =>
                  setState(() => _activeHeroIndex = index),
              itemBuilder: (context, index) {
                return _HeroSlideImage(slide: slides[index]);
              },
            ),
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [
                    Colors.black.withValues(alpha: 0.72),
                    Colors.black.withValues(alpha: 0.22),
                  ],
                ),
              ),
            ),
            Padding(
              padding:
                  EdgeInsets.fromLTRB(20, media.width < 360 ? 14 : 18, 20, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.14),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(
                          color: Colors.white.withValues(alpha: 0.24)),
                    ),
                    child: Text(activeSlide.tag,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.manrope(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w900)),
                  ),
                  SizedBox(height: media.width < 360 ? 7 : 10),
                  Text(
                      '${activeSlide.titlePrefix}\n${activeSlide.titleHighlight}',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.manrope(
                          color: Colors.white,
                          fontSize: media.width < 360 ? 22 : 25,
                          height: 1.04,
                          fontWeight: FontWeight.w900)),
                  SizedBox(height: media.width < 360 ? 6 : 8),
                  Text(activeSlide.badge,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.manrope(
                          color: Colors.white.withValues(alpha: 0.92),
                          fontSize: media.width < 360 ? 11 : 12,
                          fontWeight: FontWeight.w600)),
                  const Spacer(),
                  ElevatedButton.icon(
                    onPressed: () =>
                        _openBrowse(category: activeSlide.category),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF07142F),
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 9),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
                    iconAlignment: IconAlignment.end,
                    icon: const Icon(Icons.arrow_forward, size: 18),
                    label: Text('Explore Now',
                        style: GoogleFonts.manrope(
                            fontSize: 13, fontWeight: FontWeight.w900)),
                  ),
                ],
              ),
            ),
            Positioned(
              bottom: 20,
              right: 24,
              child: Row(
                children: List.generate(
                  slides.length,
                  (i) => Container(
                    width: i == activeIndex ? 10 : 9,
                    height: i == activeIndex ? 10 : 9,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(
                      color: Colors.white
                          .withValues(alpha: i == activeIndex ? 0.95 : 0.38),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCommercialSearch() {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const CircleAvatar(
            radius: 24,
            backgroundColor: Color(0xFF07142F),
            child: Icon(Icons.manage_search, color: Colors.white),
          ),
          const SizedBox(width: 10),
          Expanded(
            flex: 2,
            child: GestureDetector(
              onTap: () => _openSearchSheet(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Where to?',
                      style: GoogleFonts.manrope(
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF07142F))),
                  const SizedBox(height: 2),
                  Text(
                      _selectedCity != 'Anywhere'
                          ? _selectedCity
                          : (_searchQuery.isNotEmpty
                              ? _searchQuery
                              : 'Search city, area\nor property'),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.manrope(
                          fontSize: 10, color: AppTheme.charcoalLight)),
                ],
              ),
            ),
          ),
          _searchMeta(
            Icons.calendar_month,
            'Check In',
            _selectedRange == null
                ? 'Add date'
                : DateFormat('dd MMM').format(_selectedRange!.start),
          ),
          _searchMeta(
            Icons.calendar_month,
            'Check Out',
            _selectedRange == null
                ? 'Add date'
                : DateFormat('dd MMM').format(_selectedRange!.end),
          ),
          _searchMeta(Icons.person_outline, 'Guests', '$_guestCount guest'),
          CircleAvatar(
            radius: 24,
            backgroundColor: const Color(0xFF07142F),
            child: IconButton(
              onPressed: () => _openCommercialBrowse(
                city: _selectedCity == 'Anywhere' ? null : _selectedCity,
                guests: _guestCount,
                searchQuery: _searchQuery.isEmpty ? null : _searchQuery,
              ),
              icon: const Icon(Icons.search, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  Widget _searchMeta(IconData icon, String title, String sub) {
    return Expanded(
      child: InkWell(
        onTap: () => _openSearchSheet(),
        child: Column(
          children: [
            Icon(icon, color: const Color(0xFF07142F), size: 18),
            const SizedBox(height: 5),
            Text(title,
                maxLines: 1,
                style: GoogleFonts.manrope(
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF07142F))),
            Text(sub,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.manrope(
                    fontSize: 8, color: AppTheme.charcoalLight)),
          ],
        ),
      ),
    );
  }

  Widget _buildLegacyCommercialCategoryStrip() {
    final items = [
      (Icons.apartment, 'Office Spaces', 'private_office', Colors.indigo),
      (Icons.groups_2, 'Coworking', 'co_working', Colors.teal),
      (Icons.people_alt, 'Meeting Rooms', 'meeting_room', Colors.orange),
      (Icons.storefront, 'Showrooms', 'shop', Colors.pink),
      (Icons.warehouse, 'Warehouses', 'warehouse', Colors.blue),
    ];
    return Row(
      children: items.map((item) {
        return Expanded(
          child: GestureDetector(
            onTap: () => _openCommercialBrowse(propertyType: item.$3),
            child: Column(
              children: [
                Container(
                  width: 58,
                  height: 58,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: item.$4.withValues(alpha: 0.12),
                  ),
                  child: Icon(item.$1, color: item.$4, size: 26),
                ),
                const SizedBox(height: 8),
                Text(item.$2,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.manrope(
                        fontSize: 10,
                        height: 1.1,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF07142F))),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildBecomeHostBanner(AuthProvider auth) {
    const benefits = [
      _HostBenefit(
        icon: Icons.verified_user_outlined,
        title: 'Trusted',
        subtitle: 'Platform',
      ),
      _HostBenefit(
        icon: Icons.trending_up_rounded,
        title: 'Maximize',
        subtitle: 'Income',
      ),
      _HostBenefit(
        icon: Icons.support_agent_rounded,
        title: '24/7',
        subtitle: 'Support',
      ),
    ];

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFFFFFBF1),
            Color(0xFFFFF4D9),
          ],
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF3DCA9)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 22,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _HostEarnPill(),
          const SizedBox(height: 9),
          const _HostTitle(fontSize: 24),
          const SizedBox(height: 7),
          RichText(
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            text: TextSpan(
              style: GoogleFonts.manrope(
                fontSize: 12,
                height: 1.35,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF3F4652),
              ),
              children: const [
                TextSpan(text: 'List your space and start earning with '),
                TextSpan(
                  text: 'X-SPACE360.',
                  style: TextStyle(
                    color: Color(0xFF07142F),
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          _HostMobileVisual(hostCount: _registeredHostCount),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 11),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.82),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: Colors.white),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 14,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(child: benefits[0]),
                const SizedBox(width: 6),
                Expanded(child: benefits[1]),
                const SizedBox(width: 6),
                Expanded(child: benefits[2]),
              ],
            ),
          ),
          const SizedBox(height: 13),
          _HostListButton(
            fullWidth: true,
            onPressed: () => _openHostSignup(auth),
          ),
        ],
      ),
    );
  }

  Widget _buildPopularLocationsCompact(List<PropertyModel> properties) {
    final locations = _buildDynamicPopularLocations(properties);
    return Column(
      children: [
        _sectionHeader('Popular Locations', () => _openBrowse()),
        const SizedBox(height: 12),
        if (locations.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF8F3F1),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.border),
            ),
            child: Text(
              'No listed locations available yet.',
              style: GoogleFonts.manrope(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppTheme.charcoalMuted,
              ),
            ),
          )
        else
          SizedBox(
            height: 170,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: locations.length,
              separatorBuilder: (_, __) => const SizedBox(width: 14),
              itemBuilder: (_, index) {
                final location = locations[index];
                return GestureDetector(
                  onTap: () => _openBrowse(city: location.city),
                  child: Container(
                    width: 160,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.border),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _LocationCardImage(
                          imagePath: location.imageUrl,
                          height: 92,
                          width: double.infinity,
                        ),
                        Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(location.city,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.manrope(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w900,
                                      color: const Color(0xFF07142F))),
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  const Icon(Icons.location_on_outlined,
                                      size: 15, color: Color(0xFF07142F)),
                                  const SizedBox(width: 4),
                                  Text(
                                      '${location.listingCount}+ ${location.listingCount == 1 ? 'Space' : 'Spaces'}',
                                      style: GoogleFonts.manrope(
                                          fontSize: 12,
                                          color: AppTheme.charcoalLight)),
                                ],
                              ),
                            ],
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
    );
  }

  List<_PopularLocationData> _buildDynamicPopularLocations(
    List<PropertyModel> properties,
  ) {
    final uniqueProperties = <String, PropertyModel>{};
    for (final property in properties) {
      final id = property.propertyId.trim();
      if (id.isEmpty) continue;
      uniqueProperties.putIfAbsent(id, () => property);
    }

    final grouped = <String, List<PropertyModel>>{};
    final labels = <String, String>{};
    for (final property in uniqueProperties.values) {
      final label = _popularLocationLabel(property);
      if (label.isEmpty) continue;
      final key = label.toLowerCase();
      labels.putIfAbsent(key, () => label);
      grouped.putIfAbsent(key, () => <PropertyModel>[]).add(property);
    }

    final liveLocations = grouped.entries.map((entry) {
      final city = labels[entry.key] ?? entry.key;
      final cityProperties = entry.value;
      String? representativeImage;
      for (final property in cityProperties) {
        for (final image in property.images) {
          representativeImage = PropertyImage.validPropertyImageUrl(image);
          if (representativeImage != null) break;
        }
        if (representativeImage != null) break;
      }
      final asset = _destinationIconAssets[_destinationAssetKey(city)];
      return _PopularLocationData(
        city: city,
        listingCount: cityProperties.length,
        imageUrl: representativeImage ?? asset ?? _fallbackDestinationAsset,
      );
    }).toList()
      ..sort((a, b) {
        final byCount = b.listingCount.compareTo(a.listingCount);
        if (byCount != 0) return byCount;
        return a.city.compareTo(b.city);
      });

    return liveLocations.take(8).toList();
  }

  String _popularLocationLabel(PropertyModel property) {
    final city = _cleanLocationName(property.city);
    if (city.isNotEmpty) return city;

    final addressParts = property.address
        .split(RegExp(r'[,/]'))
        .map((part) => _cleanLocationName(part))
        .where((part) => part.isNotEmpty)
        .toList();
    if (addressParts.isNotEmpty) return addressParts.first;

    return _cleanLocationName(property.state);
  }

  String _cleanLocationName(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return '';
    return trimmed
        .split(RegExp(r'[,/]'))
        .first
        .trim()
        .split(RegExp(r'\s+'))
        .map((part) => part.isEmpty
            ? part
            : '${part[0].toUpperCase()}${part.substring(1).toLowerCase()}')
        .join(' ');
  }

  String _destinationAssetKey(String city) {
    return city
        .toLowerCase()
        .replaceAll('&', 'and')
        .replaceAll(RegExp(r'[^a-z0-9]+'), '_')
        .replaceAll(RegExp(r'^_+|_+$'), '');
  }

  Widget _buildRecentlyViewedCompact() {
    return Column(
      children: [
        _sectionHeader('Recently Viewed', () => _openCommercialBrowse()),
        const SizedBox(height: 12),
        if (_recentlyVisitedProperties.isEmpty)
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFFF8F3F1),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Row(
              children: [
                const CircleAvatar(
                  radius: 28,
                  backgroundColor: Color(0xFFF0E3D7),
                  child: Icon(Icons.schedule, color: Color(0xFF07142F)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("You haven’t viewed any spaces yet",
                          style: GoogleFonts.manrope(
                              fontSize: 15,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFF07142F))),
                      const SizedBox(height: 4),
                      Text('Explore and save your favourite spaces.',
                          style: GoogleFonts.manrope(
                              fontSize: 13, color: AppTheme.charcoalLight)),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: Color(0xFF07142F)),
              ],
            ),
          )
        else
          SizedBox(
            height: 210,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _recentlyVisitedProperties.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (_, index) => SizedBox(
                width: 210,
                child: _CommercialFeaturedCard(
                  property: _recentlyVisitedProperties[index],
                  tag: 'Recent',
                  onViewed: _loadRecentlyVisitedProperties,
                  initialDateRange: _selectedRange,
                  initialGuestCount: _guestCount,
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildFeaturedSpacesCompact({
    required String title,
    required String category,
    required List<PropertyModel> properties,
  }) {
    final cards = properties.take(6).toList();
    return Column(
      children: [
        _sectionHeader(title, () => _openBrowse(category: category)),
        const SizedBox(height: 12),
        if (cards.isEmpty)
          _CommercialEmptyCard(
            message: _emptySectionMessage(title),
          )
        else
          SizedBox(
            height: 240,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: cards.length,
              separatorBuilder: (_, __) => const SizedBox(width: 14),
              itemBuilder: (_, index) => SizedBox(
                width: 240,
                child: _CommercialFeaturedCard(
                  property: cards[index],
                  tag: index == 0 ? 'Most Booked' : 'Top Rated',
                  onViewed: _loadRecentlyVisitedProperties,
                  initialDateRange: _selectedRange,
                  initialGuestCount: _guestCount,
                ),
              ),
            ),
          ),
      ],
    );
  }

  String _emptySectionMessage(String title) {
    return '$title will appear here once live properties are available.';
  }

  Widget _buildOfferBanner() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFF5EEFF),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          const CircleAvatar(
            radius: 28,
            backgroundColor: Color(0xFFE8DFFF),
            child: Icon(Icons.percent, color: Color(0xFF5B4BE7)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Special Offers for You!',
                    style: GoogleFonts.manrope(
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF07142F))),
                const SizedBox(height: 4),
                Text('Book now and get up to 20% OFF on selected spaces.',
                    style: GoogleFonts.manrope(
                        fontSize: 13, color: AppTheme.charcoalLight)),
              ],
            ),
          ),
          OutlinedButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const OffersScreen()),
              );
            },
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF5B4BE7),
              side: const BorderSide(color: Color(0xFF5B4BE7)),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('View Offers'),
          ),
        ],
      ),
    );
  }

  Widget _sectionHeader(String title, VoidCallback onViewAll) {
    return Row(
      children: [
        Expanded(
          child: Text(title,
              style: GoogleFonts.manrope(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF07142F))),
        ),
        TextButton.icon(
          onPressed: onViewAll,
          iconAlignment: IconAlignment.end,
          icon: const Icon(Icons.arrow_forward, size: 18),
          label: const Text('View all'),
        ),
      ],
    );
  }

  Widget _buildLegacyHero(AuthProvider auth) {
    final topPadding = MediaQuery.of(context).padding.top;
    return SizedBox(
      height: 420 + topPadding,
      child: Stack(
        children: [
          PageView.builder(
            controller: _heroPageController,
            itemCount: _heroSlides.length,
            onPageChanged: (index) {
              if (!mounted) return;
              setState(() => _activeHeroIndex = index);
            },
            itemBuilder: (context, index) {
              final slide = _heroSlides[index];
              return Stack(
                fit: StackFit.expand,
                children: [
                  slide.image.startsWith('assets/')
                      ? Image.asset(
                          slide.image,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return Container(color: AppTheme.secondary);
                          },
                        )
                      : Image.network(
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
                _buildHeroCopy(_heroSlides[_activeHeroIndex]),
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
    final user = auth.currentUser;
    return Row(
      children: [
        const AppLogo(height: 24, white: true, framed: false),
        const Spacer(),
        if (!auth.isAuthenticated)
          TextButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const LoginScreen()),
              );
            },
            child: Text(
              'Sign In',
              style: GoogleFonts.manrope(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontSize: 13,
              ),
            ),
          )
        else ...[
          InkWell(
            onTap: () => _showAccountSheet(auth),
            borderRadius: BorderRadius.circular(999),
            child: Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.12),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withValues(alpha: 0.24)),
              ),
              child: user?.profileImage?.isNotEmpty == true
                  ? ClipOval(
                      child: Image.network(
                        user!.profileImage!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Icon(
                          Icons.person_outline_rounded,
                          color: Colors.white,
                        ),
                      ),
                    )
                  : const Icon(
                      Icons.person_outline_rounded,
                      color: Colors.white,
                    ),
            ),
          ),
          const SizedBox(width: 12),
          InkWell(
            onTap: () async {
              await auth.logout();
              if (!mounted) return;
              Navigator.pushAndRemoveUntil(
                context,
                MaterialPageRoute(
                  builder: (_) => const AppShell(initialIndex: 0),
                ),
                (route) => false,
              );
            },
            borderRadius: BorderRadius.circular(999),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: BoxDecoration(
                color: AppTheme.primary,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                'Sign Out',
                style: GoogleFonts.manrope(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Future<void> _showAccountSheet(AuthProvider auth) {
    final user = auth.currentUser;
    if (user == null) {
      return Future.value();
    }
    return showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        padding: const EdgeInsets.fromLTRB(22, 18, 22, 28),
        child: SafeArea(
          top: false,
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
              Row(
                children: [
                  Container(
                    width: 54,
                    height: 54,
                    decoration: const BoxDecoration(
                      color: AppTheme.secondary,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.person_outline_rounded,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user.fullName,
                          style: GoogleFonts.manrope(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.charcoal,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          user.email,
                          style: GoogleFonts.manrope(
                            fontSize: 13,
                            color: AppTheme.charcoalMuted,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Role: ${_roleLabel(user.role)}',
                          style: GoogleFonts.manrope(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.primary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              _AccountActionTile(
                icon: Icons.dashboard_outlined,
                label: 'View Full Dashboard',
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => LegacyProfileDashboardScreen(
                        user: user,
                        auth: auth,
                      ),
                    ),
                  );
                },
              ),
              _AccountActionTile(
                icon: Icons.support_agent_outlined,
                label: 'Support',
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const SupportTicketsScreen(),
                    ),
                  );
                },
              ),
              _AccountActionTile(
                icon: Icons.logout_rounded,
                label: 'Logout',
                destructive: true,
                onTap: () async {
                  Navigator.pop(context);
                  await auth.logout();
                  if (!mounted) return;
                  Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const AppShell(initialIndex: 0),
                    ),
                    (route) => false,
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _roleLabel(String role) {
    switch (role.toLowerCase()) {
      case 'host':
        return 'Host';
      case 'broker':
        return 'Broker';
      case 'employee':
        return 'Employee';
      case 'admin':
        return 'Admin';
      default:
        return 'Guest';
    }
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
    final placeText = _searchQuery.isNotEmpty ? _searchQuery : _selectedCity;
    return '$placeText · $_selectedCategory · $dateText · $_guestCount guests';
  }

  Widget _buildHeroIndicators() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(_heroSlides.length, (index) {
        final active = index == _activeHeroIndex;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          margin: const EdgeInsets.symmetric(horizontal: 4),
          width: active ? 24 : 7,
          height: 7,
          decoration: BoxDecoration(
            color: active
                ? AppTheme.primary
                : Colors.white.withValues(alpha: 0.38),
            borderRadius: BorderRadius.circular(99),
          ),
        );
      }),
    );
  }

  Widget _buildLegacyCollections({
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
                return _PropertyCard(
                  property: property,
                  onViewed: _loadRecentlyVisitedProperties,
                  initialDateRange: _selectedRange,
                  initialGuestCount: _guestCount,
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLegacyHolidayGetawaySection(List<PropertyModel> allProperties) {
    if (allProperties.isEmpty) return const SizedBox.shrink();

    final preferredCities = [
      'Nashik',
      'Trimbakeshwar',
      'Igatpuri',
      'Bhandardara'
    ];
    final presentCities = preferredCities
        .where((city) => allProperties
            .any((p) => p.city.trim().toLowerCase() == city.toLowerCase()))
        .toList();
    final tabs = ['All', ...presentCities];

    final filtered = _activeHolidayGetawayCity == 'All'
        ? allProperties.take(8).toList()
        : allProperties
            .where((p) =>
                p.city.trim().toLowerCase() ==
                _activeHolidayGetawayCity.toLowerCase())
            .take(8)
            .toList();

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Holiday Getaway',
            style: GoogleFonts.manrope(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.7,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            child: Row(
              children: tabs.map((tab) {
                final isActive = _activeHolidayGetawayCity == tab;
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _activeHolidayGetawayCity = tab;
                    });
                  },
                  child: Container(
                    margin: const EdgeInsets.only(right: 12),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: isActive ? AppTheme.primary : Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isActive ? AppTheme.primary : AppTheme.border,
                        width: 1,
                      ),
                    ),
                    child: Text(
                      tab,
                      style: GoogleFonts.manrope(
                        fontSize: 13,
                        fontWeight:
                            isActive ? FontWeight.w800 : FontWeight.w600,
                        color: isActive ? Colors.white : AppTheme.charcoalMuted,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 18),
          if (filtered.isEmpty)
            Container(
              height: 120,
              alignment: Alignment.center,
              child: Text(
                'No properties found in this location.',
                style: GoogleFonts.manrope(color: AppTheme.charcoalMuted),
              ),
            )
          else
            SizedBox(
              height: 330,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: filtered.length,
                separatorBuilder: (_, __) => const SizedBox(width: 16),
                itemBuilder: (context, index) {
                  final property = filtered[index];
                  return _PropertyCard(
                    property: property,
                    onViewed: _loadRecentlyVisitedProperties,
                    initialDateRange: _selectedRange,
                    initialGuestCount: _guestCount,
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildLegacyPromoSection() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Offers & Highlights',
            style: GoogleFonts.manrope(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Web-style promo blocks adapted for mobile so guests discover new offers faster.',
            style: GoogleFonts.manrope(
              fontSize: 14,
              height: 1.6,
              color: AppTheme.charcoalMuted,
            ),
          ),
          const SizedBox(height: 18),
          ..._promoCards.map(
            (card) => Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(28),
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF26221C), Color(0xFF3B342A)],
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.12),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(card.icon, color: AppTheme.primary),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          card.eyebrow,
                          style: GoogleFonts.manrope(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.6,
                            color: AppTheme.primary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          card.title,
                          style: GoogleFonts.manrope(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          card.description,
                          style: GoogleFonts.manrope(
                            fontSize: 13,
                            height: 1.6,
                            color: Colors.white.withValues(alpha: 0.72),
                          ),
                        ),
                      ],
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

  Widget _buildLegacyDestinationStrip() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(20, 26, 20, 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LayoutBuilder(
            builder: (context, constraints) {
              final showArrows = constraints.maxWidth >= 390;
              return Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8,
                      runSpacing: 2,
                      children: [
                        Text(
                          'Pick a Destination',
                          style: GoogleFonts.cormorantGaramond(
                            fontSize: 30,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.charcoal,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (showArrows) ...[
                    const SizedBox(width: 8),
                    const Icon(Icons.chevron_left,
                        color: AppTheme.charcoal, size: 20),
                    const SizedBox(width: 8),
                    const Icon(Icons.chevron_right,
                        color: AppTheme.charcoal, size: 20),
                  ],
                ],
              );
            },
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
                        SizedBox(
                          width: 72,
                          height: 72,
                          child: Center(
                            child: _DestinationGlyph(
                              type: destination.type,
                              assetPath:
                                  _destinationIconAssets[destination.type],
                            ),
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

  Widget _buildLegacyHostBanner(AuthProvider auth) {
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

  Widget _buildLegacyTestimonialSection() {
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
          SizedBox(
            height: 230,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _testimonials.length,
              separatorBuilder: (_, __) => const SizedBox(width: 14),
              itemBuilder: (context, index) {
                final item = _testimonials[index];
                return Container(
                  width: 288,
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
                            child: Icon(
                              Icons.star_rounded,
                              size: 16,
                              color: AppTheme.primary,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        item.quote,
                        maxLines: 5,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.manrope(
                          fontSize: 14,
                          height: 1.7,
                          color: AppTheme.charcoal,
                        ),
                      ),
                      const Spacer(),
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
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLegacyBlogSection() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 30, 20, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'From the Blog',
            style: GoogleFonts.manrope(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Content-led trust sections from the website, now shaped for app discovery.',
            style: GoogleFonts.manrope(
              fontSize: 14,
              height: 1.6,
              color: AppTheme.charcoalMuted,
            ),
          ),
          const SizedBox(height: 18),
          SizedBox(
            height: 286,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _blogCards.length,
              separatorBuilder: (_, __) => const SizedBox(width: 14),
              itemBuilder: (context, index) {
                final blog = _blogCards[index];
                return InkWell(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => _BlogDetailScreen(blog: blog),
                      ),
                    );
                  },
                  borderRadius: BorderRadius.circular(24),
                  child: Container(
                    width: 288,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ClipRRect(
                          borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(24),
                          ),
                          child: SizedBox(
                            height: 110,
                            width: double.infinity,
                            child: Image.network(
                              blog.imageUrl,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                color: AppTheme.stone,
                                child: const Center(
                                  child: Icon(
                                    Icons.article_outlined,
                                    color: AppTheme.charcoalMuted,
                                    size: 30,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.all(20),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 6,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppTheme.sand,
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    blog.category,
                                    style: GoogleFonts.manrope(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      color: AppTheme.charcoal,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 14),
                                Text(
                                  blog.title,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.manrope(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w800,
                                    height: 1.25,
                                    color: AppTheme.charcoal,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Expanded(
                                  child: Text(
                                    blog.excerpt,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.manrope(
                                      fontSize: 13,
                                      height: 1.65,
                                      color: AppTheme.charcoalMuted,
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
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLegacyChatbotSection() {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 30, 20, 0),
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Need instant help?',
                  style: GoogleFonts.manrope(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.charcoal,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Use the AI concierge for stay suggestions, booking help, and quick answers anytime.',
                  style: GoogleFonts.manrope(
                    fontSize: 14,
                    height: 1.6,
                    color: AppTheme.charcoalMuted,
                  ),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () {
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const AppShell(initialIndex: 3),
                      ),
                    );
                  },
                  child: const Text('Open AI Concierge'),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: AppTheme.secondary,
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Icon(
              Icons.auto_awesome_outlined,
              color: AppTheme.primary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLegacyFooter() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 28),
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 120),
      decoration: BoxDecoration(
        color: AppTheme.secondary,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(28),
        ),
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
          const SizedBox(height: 14),
          ..._footerSections.map(
            (section) => _FooterAccordion(section: section),
          ),
          const SizedBox(height: 12),
          const Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _FooterChip(label: 'Privacy'),
              _FooterChip(label: 'Terms & Conditions'),
              _FooterChip(label: 'Sitemap'),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'Call Us: +91 8104 954 254',
            style: GoogleFonts.manrope(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: 15,
            ),
          ),
          const SizedBox(height: 14),
          const Row(
            children: [
              _FooterSocial(icon: Icons.chat),
              SizedBox(width: 10),
              _FooterSocial(icon: Icons.camera_alt_outlined),
              SizedBox(width: 10),
              _FooterSocial(icon: Icons.play_arrow_outlined),
              SizedBox(width: 10),
              _FooterSocial(icon: Icons.business_center_outlined),
              SizedBox(width: 10),
              _FooterSocial(icon: Icons.push_pin_outlined),
            ],
          ),
          const SizedBox(height: 18),
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
      _searchQuery = result.searchQuery;
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
          initialSearchQuery: _searchQuery.isEmpty ? null : _searchQuery,
          initialGuests: _guestCount,
          initialCategory: _mapCategoryToBrowseValue(_selectedCategory),
          initialDateRange: _selectedRange,
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
    return properties.where((property) {
      final category = property.category.toLowerCase();
      return category == 'event' ||
          category == 'event_venue' ||
          category == 'events_venue';
    }).toList();
  }

  Widget _buildLegacyRecentlyVisitedSection() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(height: 1, color: const Color(0xFFEDE7DD)),
          const SizedBox(height: 28),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Recently Visited',
                      style: GoogleFonts.cormorantGaramond(
                        fontSize: 30,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.charcoal,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      width: 82,
                      height: 2,
                      color: AppTheme.charcoal,
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_left,
                  color: AppTheme.charcoal, size: 20),
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right,
                  color: AppTheme.charcoal, size: 20),
            ],
          ),
          const SizedBox(height: 18),
          if (_recentlyVisitedProperties.isEmpty)
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0xFFF8F6F1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFEDE7DD)),
              ),
              child: Text(
                'Open any property once and it will appear here just like the website recently visited section.',
                style: GoogleFonts.manrope(
                  fontSize: 13,
                  height: 1.6,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.charcoalMuted,
                ),
              ),
            )
          else
            SizedBox(
              height: 272,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _recentlyVisitedProperties.length,
                separatorBuilder: (_, __) => const SizedBox(width: 14),
                itemBuilder: (context, index) {
                  final property = _recentlyVisitedProperties[index];
                  return _RecentlyVisitedCard(
                    property: property,
                    onViewed: _loadRecentlyVisitedProperties,
                    initialDateRange: _selectedRange,
                    initialGuestCount: _guestCount,
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildLegacyDiscoverCollectionsSection() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Discover Our Collection',
            style: GoogleFonts.cormorantGaramond(
              fontSize: 30,
              fontWeight: FontWeight.w700,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 18),
          SizedBox(
            height: 320,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _collectionCards.length,
              separatorBuilder: (_, __) => const SizedBox(width: 16),
              itemBuilder: (context, index) {
                final card = _collectionCards[index];
                return _DiscoverCollectionCard(card: card);
              },
            ),
          ),
        ],
      ),
    );
  }

  List<PropertyModel> _filterByPropertyType(
    List<PropertyModel> properties,
    List<String> propertyTypes,
  ) {
    final normalizedTypes =
        propertyTypes.map((type) => type.toLowerCase()).toSet();
    return properties.where((property) {
      return normalizedTypes.contains(property.propertyType.toLowerCase());
    }).toList();
  }
}

class _CommercialFeaturedCard extends StatelessWidget {
  final PropertyModel property;
  final String tag;
  final Future<void> Function() onViewed;
  final DateTimeRange? initialDateRange;
  final int? initialGuestCount;

  const _CommercialFeaturedCard({
    required this.property,
    required this.tag,
    required this.onViewed,
    this.initialDateRange,
    this.initialGuestCount,
  });

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<PropertyProvider>();
    final wishlisted = provider.isWishlisted(property.propertyId);
    final rating = property.rating ?? 4.8;
    return InkWell(
      onTap: () async {
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => PropertyDetailScreen(
              propertyId: property.propertyId,
              initialCheckInDate: initialDateRange?.start,
              initialCheckOutDate: initialDateRange?.end,
              initialGuestCount: initialGuestCount,
            ),
          ),
        );
        await onViewed();
      },
      borderRadius: BorderRadius.circular(18),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.12),
              blurRadius: 16,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
            Positioned.fill(
              child: Column(
                children: [
                  Expanded(
                    child: PropertyImage(
                      imageUrl: property.images.isNotEmpty
                          ? property.images.first
                          : null,
                      width: double.infinity,
                      fit: BoxFit.cover,
                    ),
                  ),
                  const SizedBox(height: 74),
                ],
              ),
            ),
            Positioned(
              top: 12,
              left: 12,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: tag == 'Most Booked'
                      ? const Color(0xFF36A853)
                      : const Color(0xFF4E6DF5),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(tag,
                    style: GoogleFonts.manrope(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w900)),
              ),
            ),
            Positioned(
              top: 10,
              right: 10,
              child: GestureDetector(
                onTap: () => handleWishlistTap(context, property.propertyId),
                child: CircleAvatar(
                  radius: 20,
                  backgroundColor: Colors.white,
                  child: Icon(
                    wishlisted ? Icons.favorite : Icons.favorite_border,
                    color:
                        wishlisted ? AppTheme.primary : const Color(0xFF07142F),
                  ),
                ),
              ),
            ),
            Positioned(
              left: 12,
              right: 12,
              bottom: 12,
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(property.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.manrope(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF07142F))),
                    const SizedBox(height: 5),
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined,
                            size: 14, color: Color(0xFF07142F)),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text('${property.city}, ${property.state}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.manrope(
                                  fontSize: 11, color: AppTheme.charcoalLight)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.star,
                            color: Color(0xFFFFB000), size: 16),
                        const SizedBox(width: 4),
                        Text(rating.toStringAsFixed(1),
                            style: GoogleFonts.manrope(
                                fontSize: 12,
                                fontWeight: FontWeight.w900,
                                color: const Color(0xFF07142F))),
                        const Spacer(),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              '${CurrencyFormatter.format(property.customerDisplayPrice)} / ${property.pricingUnitLabel}',
                              style: GoogleFonts.manrope(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w900,
                                  color: const Color(0xFF07142F)),
                            ),
                            Text('Starts from',
                                style: GoogleFonts.manrope(
                                    fontSize: 10,
                                    color: AppTheme.charcoalMuted)),
                          ],
                        ),
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
}

class _CommercialEmptyCard extends StatelessWidget {
  final String message;

  const _CommercialEmptyCard({
    this.message =
        'Spaces will appear here once live properties are available.',
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          const CircleAvatar(
            backgroundColor: AppTheme.stone,
            child: Icon(Icons.business_outlined, color: AppTheme.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: GoogleFonts.manrope(
                  fontWeight: FontWeight.w700, color: AppTheme.charcoalLight),
            ),
          ),
        ],
      ),
    );
  }
}

class _PropertyCard extends StatelessWidget {
  final PropertyModel property;
  final Future<void> Function() onViewed;
  final DateTimeRange? initialDateRange;
  final int? initialGuestCount;

  const _PropertyCard({
    required this.property,
    required this.onViewed,
    this.initialDateRange,
    this.initialGuestCount,
  });

  bool get _isSignatureSeries {
    final type = property.propertyType.toLowerCase();
    return property.pricePerNight >= 50000 &&
        (type.contains('villa') ||
            type.contains('resort') ||
            property.category.toLowerCase() == 'residential');
  }

  @override
  Widget build(BuildContext context) {
    final rating = property.rating ?? 4.8;
    final image = property.images.isNotEmpty ? property.images.first : null;

    return SizedBox(
      width: 250,
      child: InkWell(
        onTap: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => PropertyDetailScreen(
                propertyId: property.propertyId,
                initialCheckInDate: initialDateRange?.start,
                initialCheckOutDate: initialDateRange?.end,
                initialGuestCount: initialGuestCount,
              ),
            ),
          );
          await onViewed();
        },
        borderRadius: BorderRadius.circular(26),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                children: [
                  PropertyImage(
                    imageUrl: image,
                    width: double.infinity,
                    height: double.infinity,
                    borderRadius: BorderRadius.circular(26),
                  ),
                  Positioned(
                    top: 12,
                    left: 12,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
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
                        if (_isSignatureSeries) ...[
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.92),
                              borderRadius: BorderRadius.circular(999),
                              border:
                                  Border.all(color: const Color(0xFFD4AF37)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.workspace_premium_rounded,
                                  color: Color(0xFFD4AF37),
                                  size: 12,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'SIGNATURE SERIES',
                                  style: GoogleFonts.manrope(
                                    color: const Color(0xFFD4AF37),
                                    fontSize: 8.5,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 1.0,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  Positioned(
                    top: 12,
                    right: 54,
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () async {
                        final String shareText =
                            'Check out ${property.title} in ${property.city} on X-Space360. Starting from ${CurrencyFormatter.format(property.customerDisplayPrice)}/${property.pricingUnitLabel}.\nhttps://x-space360.in/property/${Uri.encodeComponent(property.propertyId)}';
                        await Share.share(shareText, subject: property.title);
                      },
                      child: Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.90),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.share_outlined,
                          color: AppTheme.charcoal,
                          size: 18,
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 12,
                    right: 12,
                    child: Consumer<PropertyProvider>(
                      builder: (context, propertyProvider, _) {
                        final isWishlisted =
                            propertyProvider.isWishlisted(property.propertyId);
                        return GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: () =>
                              handleWishlistTap(context, property.propertyId),
                          child: Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.90),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              isWishlisted
                                  ? Icons.favorite_rounded
                                  : Icons.favorite_border_rounded,
                              color: isWishlisted
                                  ? Colors.red.shade600
                                  : AppTheme.charcoal,
                              size: 18,
                            ),
                          ),
                        );
                      },
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
            _BookingModeChip(property: property),
            const SizedBox(height: 6),
            Text(
              '${CurrencyFormatter.format(property.customerDisplayPrice)}${property.pricingUnitSuffix}',
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

class _DiscoverCollectionCard extends StatelessWidget {
  final _CollectionCardData card;

  const _DiscoverCollectionCard({required this.card});

  @override
  Widget build(BuildContext context) {
    final isLocalAsset = card.image.startsWith('assets/');
    final isSignature = card.tag == 'Signature Series';

    return SizedBox(
      width: 240,
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => GuestBrowseScreen(
                initialCategory: card.category,
                initialPropertyType: card.propertyType,
              ),
            ),
          );
        },
        borderRadius: BorderRadius.circular(24),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: Stack(
            children: [
              Positioned.fill(
                child: isLocalAsset
                    ? Image.asset(card.image, fit: BoxFit.cover)
                    : Image.network(
                        card.image,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          color: AppTheme.stone,
                        ),
                      ),
              ),
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.black.withValues(alpha: 0.10),
                        Colors.black.withValues(alpha: 0.32),
                        Colors.black.withValues(alpha: 0.92),
                      ],
                    ),
                  ),
                ),
              ),
              Positioned(
                top: 14,
                left: 14,
                child: isSignature
                    ? Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 7,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.92),
                          border: Border.all(color: const Color(0xFFD4AF37)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.workspace_premium_rounded,
                              size: 12,
                              color: Color(0xFFD4AF37),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'Signature Series',
                              style: GoogleFonts.manrope(
                                fontSize: 8.5,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.8,
                                color: const Color(0xFFD4AF37),
                              ),
                            ),
                          ],
                        ),
                      )
                    : Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.96),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          card.tag,
                          style: GoogleFonts.manrope(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.0,
                            color: AppTheme.charcoal,
                          ),
                        ),
                      ),
              ),
              Positioned(
                left: 18,
                right: 18,
                bottom: 18,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Explore',
                      style: GoogleFonts.manrope(
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.6,
                        color: Colors.white.withValues(alpha: 0.66),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      card.label,
                      style: GoogleFonts.manrope(
                        fontSize: 19,
                        height: 1.2,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      card.detail,
                      maxLines: 5,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.manrope(
                        fontSize: 11.5,
                        height: 1.55,
                        color: Colors.white.withValues(alpha: 0.80),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RecentlyVisitedCard extends StatelessWidget {
  final PropertyModel property;
  final Future<void> Function() onViewed;
  final DateTimeRange? initialDateRange;
  final int? initialGuestCount;

  const _RecentlyVisitedCard({
    required this.property,
    required this.onViewed,
    this.initialDateRange,
    this.initialGuestCount,
  });

  @override
  Widget build(BuildContext context) {
    final image = property.images.isNotEmpty ? property.images.first : null;
    final rating = property.rating ?? 4.8;

    return SizedBox(
      width: 258,
      child: InkWell(
        onTap: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => PropertyDetailScreen(
                propertyId: property.propertyId,
                initialCheckInDate: initialDateRange?.start,
                initialCheckOutDate: initialDateRange?.end,
                initialGuestCount: initialGuestCount,
              ),
            ),
          );
          await onViewed();
        },
        borderRadius: BorderRadius.circular(22),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: const Color(0xFFEDEDED)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 12,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              PropertyImage(
                imageUrl: image,
                height: 152,
                width: double.infinity,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(22),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            property.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.manrope(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.charcoal,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Row(
                          children: [
                            const Icon(Icons.star_rounded,
                                size: 15, color: AppTheme.primary),
                            const SizedBox(width: 3),
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
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined,
                            size: 14, color: AppTheme.charcoalMuted),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            '${property.city}${property.state.isNotEmpty ? ', ${property.state}' : ''}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.manrope(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.charcoalMuted,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.only(top: 10),
                      decoration: const BoxDecoration(
                        border: Border(
                          top: BorderSide(color: Color(0xFFF0F0F0)),
                        ),
                      ),
                      child: Text(
                        'Up to ${property.maxGuests} Guests - ${property.bhkType.isNotEmpty ? property.bhkType.toUpperCase() : property.propertyType.replaceAll('_', ' ')}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.manrope(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.charcoalMuted,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
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
  Timer? _suggestionDebounce;
  DateTimeRange? _range;
  int _guests = 2;
  String _category = 'All Types';
  bool _pickedCityFromChip = false;
  bool _loadingSuggestions = false;
  List<_PropertySuggestion> _suggestions = [];

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
    _pickedCityFromChip = widget.initialCity.isNotEmpty;
    _range = widget.initialRange;
    _guests = widget.initialGuests;
    _category = widget.initialCategory;
  }

  @override
  void dispose() {
    _suggestionDebounce?.cancel();
    _cityController.dispose();
    super.dispose();
  }

  void _onSearchTextChanged(String value) {
    setState(() => _pickedCityFromChip = false);
    _suggestionDebounce?.cancel();
    final query = value.trim();
    if (query.length < 2) {
      setState(() {
        _suggestions = [];
        _loadingSuggestions = false;
      });
      return;
    }
    _suggestionDebounce = Timer(const Duration(milliseconds: 280), () {
      _loadSuggestions(query);
    });
  }

  Future<void> _loadSuggestions(String query) async {
    if (!mounted) return;
    setState(() => _loadingSuggestions = true);
    try {
      final response = await ApiService().dio.get(
        '/properties/search',
        queryParameters: {
          'search': query,
          'limit': 8,
          if (_category != 'All Types') 'category': _categoryValue(_category),
        },
      );
      final rows = response.data?['properties'];
      final suggestions = rows is List
          ? rows
              .whereType<Map>()
              .map((row) => _PropertySuggestion.fromJson(
                    Map<String, dynamic>.from(row),
                  ))
              .where((item) => item.title.isNotEmpty)
              .toList()
          : <_PropertySuggestion>[];
      if (!mounted || _cityController.text.trim() != query) return;
      setState(() {
        _suggestions = suggestions;
        _loadingSuggestions = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _suggestions = [];
        _loadingSuggestions = false;
      });
    }
  }

  String _categoryValue(String label) {
    switch (label) {
      case 'Residential':
        return 'residential';
      case 'Commercial':
        return 'commercial';
      case 'Event Venue':
        return 'event_venue';
      default:
        return '';
    }
  }

  void _selectSuggestion(_PropertySuggestion suggestion) {
    setState(() {
      _cityController.text = suggestion.title;
      _pickedCityFromChip = false;
      _suggestions = [];
    });
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final maxHeight = media.size.height * 0.94;
    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: maxHeight),
      child: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(
              24,
              12,
              24,
              media.viewInsets.bottom + 26,
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
                const SizedBox(height: 24),
                _buildSearchSheetHeader(),
                const SizedBox(height: 26),
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: TextField(
                    controller: _cityController,
                    onChanged: _onSearchTextChanged,
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      hintText: 'Search property name or destination',
                      prefixIcon: const Icon(Icons.search_rounded, size: 30),
                      suffixIcon: _loadingSuggestions
                          ? const Padding(
                              padding: EdgeInsets.all(14),
                              child: SizedBox(
                                width: 16,
                                height: 16,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2),
                              ),
                            )
                          : _cityController.text.isNotEmpty
                              ? IconButton(
                                  onPressed: () {
                                    setState(() {
                                      _cityController.clear();
                                      _suggestions = [];
                                      _pickedCityFromChip = false;
                                    });
                                  },
                                  icon: const Icon(Icons.close_rounded),
                                )
                              : null,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20),
                        borderSide: BorderSide.none,
                      ),
                      filled: true,
                      fillColor: Colors.white,
                    ),
                  ),
                ),
                if (_suggestions.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  _SuggestionDropdown(
                    suggestions: _suggestions,
                    onSelected: _selectSuggestion,
                  ),
                ],
                const SizedBox(height: 28),
                _sectionTitle('Popular Destinations', action: 'View all'),
                const SizedBox(height: 14),
                _buildDestinationCards(),
                const SizedBox(height: 28),
                _sectionTitle('Property Type'),
                const SizedBox(height: 14),
                _buildPropertyTypeButtons(),
                const SizedBox(height: 24),
                _buildDateRow(),
                const SizedBox(height: 14),
                _buildGuestRow(),
                const SizedBox(height: 24),
                _buildTrustStrip(),
                const SizedBox(height: 28),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(
                        context,
                        _SearchSelection(
                          city: _pickedCityFromChip
                              ? _cityController.text.trim()
                              : '',
                          searchQuery: _pickedCityFromChip
                              ? ''
                              : _cityController.text.trim(),
                          category: _category,
                          range: _range,
                          guests: _guests,
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 20),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.search_rounded, size: 28),
                        const SizedBox(width: 14),
                        Text(
                          'Search Stays',
                          style: GoogleFonts.manrope(
                            fontSize: 19,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSearchSheetHeader() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Find Your Perfect Stay',
                style: GoogleFonts.manrope(
                  fontSize: 28,
                  height: 1.05,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF07142F),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Search top properties in your favorite destinations',
                style: GoogleFonts.manrope(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.charcoalMuted,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 18),
        Container(
          width: 68,
          height: 68,
          decoration: BoxDecoration(
            color: const Color(0xFF07142F),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF07142F).withValues(alpha: 0.20),
                blurRadius: 18,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: const Icon(
            Icons.location_on_outlined,
            color: AppTheme.primary,
            size: 38,
          ),
        ),
      ],
    );
  }

  Widget _sectionTitle(String title, {String? action}) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: GoogleFonts.manrope(
              fontSize: 19,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF07142F),
            ),
          ),
        ),
        if (action != null)
          Text(
            '$action  >',
            style: GoogleFonts.manrope(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: AppTheme.primary,
            ),
          ),
      ],
    );
  }

  Widget _buildDestinationCards() {
    final destinations = _popularCities.take(5).toList();
    return SizedBox(
      height: 162,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: destinations.length,
        separatorBuilder: (_, __) => const SizedBox(width: 14),
        itemBuilder: (context, index) {
          final city = destinations[index];
          final selected = _cityController.text.trim() == city;
          final assetKey = city.toLowerCase() == 'bangalore'
              ? 'bengaluru'
              : city.toLowerCase();
          return GestureDetector(
            onTap: () {
              setState(() {
                _cityController.text = city;
                _pickedCityFromChip = true;
                _suggestions = [];
              });
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              width: 138,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: selected ? AppTheme.primary : AppTheme.border,
                  width: selected ? 1.6 : 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.07),
                    blurRadius: 14,
                    offset: const Offset(0, 7),
                  ),
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Image.asset(
                      _destinationAssetFor(assetKey),
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: AppTheme.stone,
                        alignment: Alignment.center,
                        child: const Icon(Icons.location_city_outlined),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.location_on_outlined,
                                size: 17, color: Color(0xFF07142F)),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                city,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.manrope(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w900,
                                  color: const Color(0xFF07142F),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 3),
                        Text(
                          'Explore stays',
                          style: GoogleFonts.manrope(
                            fontSize: 12,
                            color: AppTheme.charcoalMuted,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildPropertyTypeButtons() {
    final items = [
      ('All Types', Icons.check_circle_outline),
      ('Residential', Icons.home_outlined),
      ('Commercial', Icons.apartment_outlined),
      ('Event Venue', Icons.celebration_outlined),
    ];
    return SizedBox(
      height: 56,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final item = items[index];
          final selected = _category == item.$1;
          return InkWell(
            onTap: () {
              setState(() => _category = item.$1);
              final query = _cityController.text.trim();
              if (query.length >= 2) {
                _loadSuggestions(query);
              }
            },
            borderRadius: BorderRadius.circular(16),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.symmetric(horizontal: 18),
              decoration: BoxDecoration(
                color: selected ? const Color(0xFF07142F) : Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: selected ? const Color(0xFF07142F) : AppTheme.border,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    item.$2,
                    color: selected ? Colors.white : AppTheme.charcoalMuted,
                  ),
                  const SizedBox(width: 10),
                  Text(
                    item.$1,
                    style: GoogleFonts.manrope(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: selected ? Colors.white : AppTheme.charcoal,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildDateRow() {
    final label = _range == null
        ? 'Check-in  -  Check-out'
        : '${DateFormat('dd MMM').format(_range!.start)}  -  ${DateFormat('dd MMM').format(_range!.end)}';
    return _SearchOptionRow(
      icon: Icons.calendar_month_outlined,
      title: 'Select Dates',
      subtitle: label,
      trailing: const Icon(Icons.chevron_right_rounded, size: 30),
      onTap: _pickDates,
    );
  }

  Widget _buildGuestRow() {
    return _SearchOptionRow(
      icon: Icons.people_outline,
      title: 'Guests',
      subtitle: 'Select number of guests',
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _StepperButton(
            icon: Icons.remove,
            onTap: _guests > 1 ? () => setState(() => _guests--) : null,
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18),
            child: Text(
              '$_guests',
              style: GoogleFonts.manrope(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: const Color(0xFF07142F),
              ),
            ),
          ),
          _StepperButton(
            icon: Icons.add,
            onTap: () => setState(() => _guests++),
          ),
        ],
      ),
    );
  }

  Widget _buildTrustStrip() {
    final items = [
      (Icons.verified_user_outlined, 'Verified Properties', 'Quality checked'),
      (Icons.support_agent_outlined, '24/7 Support', 'We are here'),
      (Icons.currency_rupee, 'Best Price', 'Great deals'),
    ];
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF8EA),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          for (int i = 0; i < items.length; i++) ...[
            Expanded(
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: Colors.white,
                    child: Icon(items[i].$1, size: 18, color: AppTheme.primary),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          items[i].$2,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.manrope(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF07142F),
                          ),
                        ),
                        Text(
                          items[i].$3,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.manrope(
                            fontSize: 10,
                            color: AppTheme.charcoalMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (i != items.length - 1)
              Container(width: 1, height: 34, color: AppTheme.border),
          ],
        ],
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

class _SuggestionDropdown extends StatelessWidget {
  final List<_PropertySuggestion> suggestions;
  final ValueChanged<_PropertySuggestion> onSelected;

  const _SuggestionDropdown({
    required this.suggestions,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxHeight: 250),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppTheme.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ListView.separated(
        shrinkWrap: true,
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: suggestions.length,
        separatorBuilder: (_, __) => Divider(
          height: 1,
          indent: 58,
          color: Colors.grey.shade100,
        ),
        itemBuilder: (context, index) {
          final suggestion = suggestions[index];
          return InkWell(
            onTap: () => onSelected(suggestion),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.home_work_outlined,
                      color: AppTheme.primary,
                      size: 19,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          suggestion.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.manrope(
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            color: AppTheme.charcoal,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          [
                            suggestion.city,
                            suggestion.categoryLabel,
                          ].where((part) => part.trim().isNotEmpty).join(' - '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.manrope(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.charcoalMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(
                    Icons.north_west_rounded,
                    color: AppTheme.charcoalMuted,
                    size: 16,
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

class _SearchOptionRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Widget trailing;
  final VoidCallback? onTap;

  const _SearchOptionRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.trailing,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: const Color(0xFF07142F),
              child: Icon(icon, color: Colors.white, size: 22),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.manrope(
                      fontSize: 17,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF07142F),
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.manrope(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.charcoalMuted,
                    ),
                  ),
                ],
              ),
            ),
            trailing,
          ],
        ),
      ),
    );
  }
}

class _StepperButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;

  const _StepperButton({
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: AppTheme.border),
          color: onTap == null ? AppTheme.stone : Colors.white,
        ),
        child: Icon(
          icon,
          color:
              onTap == null ? AppTheme.charcoalMuted : const Color(0xFF07142F),
        ),
      ),
    );
  }
}

String _destinationAssetFor(String key) {
  return _destinationIconAssets[key] ??
      _destinationIconAssets['nashik'] ??
      'assets/images/destinations/nashik.png';
}

class _PropertySuggestion {
  final String title;
  final String city;
  final String category;

  const _PropertySuggestion({
    required this.title,
    required this.city,
    required this.category,
  });

  factory _PropertySuggestion.fromJson(Map<String, dynamic> json) {
    return _PropertySuggestion(
      title: json['title']?.toString().trim() ?? '',
      city: json['city']?.toString().trim() ?? '',
      category: json['category']?.toString().trim() ?? '',
    );
  }

  String get categoryLabel {
    if (category == 'event_venue') return 'Event Venue';
    if (category.isEmpty) return '';
    return category
        .replaceAll('_', ' ')
        .split(' ')
        .where((part) => part.isNotEmpty)
        .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
        .join(' ');
  }
}

class _SearchSelection {
  final String city;
  final String searchQuery;
  final String category;
  final DateTimeRange? range;
  final int guests;

  const _SearchSelection({
    required this.city,
    required this.searchQuery,
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
  final bool isNetworkImage;

  const _HeroSlide({
    required this.image,
    required this.tag,
    required this.titlePrefix,
    required this.titleHighlight,
    required this.subtitle,
    required this.badge,
    required this.category,
    this.isNetworkImage = false,
  });
}

class _HeroSlideImage extends StatelessWidget {
  final _HeroSlide slide;

  const _HeroSlideImage({required this.slide});

  @override
  Widget build(BuildContext context) {
    Widget fallback() {
      return Container(
        color: AppTheme.stone,
        alignment: Alignment.center,
        child: const AppLogo(height: 44),
      );
    }

    if (slide.isNetworkImage || slide.image.startsWith('http')) {
      return CachedNetworkImage(
        imageUrl: slide.image,
        fit: BoxFit.cover,
        fadeInDuration: const Duration(milliseconds: 180),
        memCacheWidth: 900,
        placeholder: (_, __) => fallback(),
        errorWidget: (_, __, ___) => fallback(),
      );
    }

    return Image.asset(
      slide.image,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => fallback(),
    );
  }
}

class _DestinationData {
  final String city;
  final String type;

  const _DestinationData(this.city, this.type);
}

class _PopularLocationData {
  final String city;
  final int listingCount;
  final String imageUrl;

  const _PopularLocationData({
    required this.city,
    required this.listingCount,
    required this.imageUrl,
  });
}

class _LocationCardImage extends StatelessWidget {
  final String imagePath;
  final double width;
  final double height;

  const _LocationCardImage({
    required this.imagePath,
    required this.width,
    required this.height,
  });

  bool get _isNetwork =>
      imagePath.startsWith('http://') || imagePath.startsWith('https://');

  @override
  Widget build(BuildContext context) {
    if (_isNetwork) {
      return PropertyImage(
        imageUrl: imagePath,
        width: width,
        height: height,
        fit: BoxFit.cover,
        semanticLabel: 'Location image',
      );
    }
    return Image.asset(
      imagePath,
      width: width,
      height: height,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => Image.asset(
        _fallbackDestinationAsset,
        width: width,
        height: height,
        fit: BoxFit.cover,
      ),
    );
  }
}

const String _fallbackDestinationAsset =
    'assets/images/destinations/nashik.png';

const Map<String, String> _destinationIconAssets = {
  'nashik': 'assets/images/destinations/nashik.png',
  'trimbak': 'assets/images/destinations/trimbakeshwar.png',
  'gangapur_dam': 'assets/images/destinations/gangapur-dam.png',
  'igatpuri': 'assets/images/destinations/igatpuri.png',
  'sula': 'assets/images/destinations/sula-vineyards.png',
  'anjaneri': 'assets/images/destinations/anjaneri.png',
  'harihar_fort': 'assets/images/destinations/harihar-fort.png',
  'bhandardara': 'assets/images/destinations/bhandardara.png',
  'mumbai': 'assets/images/destinations/mumbai.png',
  'pune': 'assets/images/destinations/pune.png',
  'karjat': 'assets/images/destinations/karjat.png',
  'alibaug': 'assets/images/destinations/alibaug.png',
  'goa': 'assets/images/destinations/goa.png',
  'lonavala': 'assets/images/destinations/lonavala.png',
  'mahabaleshwar': 'assets/images/destinations/mahabaleshwar.png',
  'kokan': 'assets/images/destinations/kokan.png',
};

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

class _PromoCardData {
  final String eyebrow;
  final String title;
  final String description;
  final IconData icon;

  const _PromoCardData({
    required this.eyebrow,
    required this.title,
    required this.description,
    required this.icon,
  });
}

class _BlogData {
  final String imageUrl;
  final String category;
  final String title;
  final String excerpt;
  final String content;

  const _BlogData({
    required this.imageUrl,
    required this.category,
    required this.title,
    required this.excerpt,
    required this.content,
  });
}

class _CollectionCardData {
  final String id;
  final String label;
  final String detail;
  final String tag;
  final String image;
  final String category;
  final String? propertyType;

  const _CollectionCardData({
    required this.id,
    required this.label,
    required this.detail,
    required this.tag,
    required this.image,
    required this.category,
    this.propertyType,
  });
}

class _CategoryGlyph extends StatelessWidget {
  final String type;

  const _CategoryGlyph({required this.type});

  @override
  Widget build(BuildContext context) {
    switch (type) {
      case 'commercial':
        return SizedBox(
          width: 22,
          height: 22,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Positioned(
                left: 3,
                top: 5,
                child: Container(
                  width: 6,
                  height: 11,
                  decoration: BoxDecoration(
                    border: Border.all(color: AppTheme.charcoal, width: 1.6),
                    borderRadius: BorderRadius.circular(1.5),
                  ),
                ),
              ),
              Positioned(
                right: 3,
                top: 3,
                child: Container(
                  width: 9,
                  height: 13,
                  decoration: BoxDecoration(
                    border: Border.all(color: AppTheme.charcoal, width: 1.6),
                    borderRadius: BorderRadius.circular(1.5),
                  ),
                ),
              ),
              Positioned(
                bottom: 2,
                child: Container(
                  width: 16,
                  height: 2,
                  color: AppTheme.charcoal,
                ),
              ),
            ],
          ),
        );
      case 'events':
        return SizedBox(
          width: 22,
          height: 22,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Positioned(
                top: 2,
                child: Container(
                  width: 8,
                  height: 5,
                  decoration: BoxDecoration(
                    border: Border.all(color: AppTheme.charcoal, width: 1.6),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
              Positioned(
                bottom: 4,
                left: 4,
                child: Container(
                  width: 5,
                  height: 9,
                  decoration: BoxDecoration(
                    border: Border.all(color: AppTheme.charcoal, width: 1.6),
                    borderRadius: BorderRadius.circular(1.5),
                  ),
                ),
              ),
              Positioned(
                bottom: 4,
                right: 4,
                child: Container(
                  width: 9,
                  height: 9,
                  decoration: BoxDecoration(
                    border: Border.all(color: AppTheme.charcoal, width: 1.6),
                    borderRadius: BorderRadius.circular(1.5),
                  ),
                ),
              ),
            ],
          ),
        );
      case 'villas':
        return SizedBox(
          width: 22,
          height: 22,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Positioned(
                top: 3,
                child: Transform.rotate(
                  angle: 0.78,
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      border: Border.all(color: AppTheme.charcoal, width: 1.6),
                    ),
                  ),
                ),
              ),
              Positioned(
                bottom: 3,
                child: Container(
                  width: 14,
                  height: 9,
                  decoration: BoxDecoration(
                    border: Border.all(color: AppTheme.charcoal, width: 1.6),
                    borderRadius: BorderRadius.circular(1.5),
                  ),
                ),
              ),
              Positioned(
                bottom: 4,
                child: Container(
                  width: 4,
                  height: 5,
                  decoration: BoxDecoration(
                    border: Border.all(color: AppTheme.charcoal, width: 1.4),
                    borderRadius: BorderRadius.circular(1),
                  ),
                ),
              ),
            ],
          ),
        );
      case 'residential':
      default:
        return SizedBox(
          width: 22,
          height: 22,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Positioned(
                top: 3,
                child: Transform.rotate(
                  angle: 0.78,
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      border: Border.all(color: AppTheme.charcoal, width: 1.6),
                    ),
                  ),
                ),
              ),
              Positioned(
                bottom: 3,
                child: Container(
                  width: 14,
                  height: 10,
                  decoration: BoxDecoration(
                    border: Border.all(color: AppTheme.charcoal, width: 1.6),
                    borderRadius: BorderRadius.circular(1.5),
                  ),
                ),
              ),
              Positioned(
                bottom: 4,
                left: 7,
                child: Container(
                  width: 3.5,
                  height: 5,
                  decoration: BoxDecoration(
                    border: Border.all(color: AppTheme.charcoal, width: 1.4),
                    borderRadius: BorderRadius.circular(1),
                  ),
                ),
              ),
              Positioned(
                bottom: 8,
                right: 5,
                child: Container(
                  width: 3,
                  height: 3,
                  decoration: BoxDecoration(
                    border: Border.all(color: AppTheme.charcoal, width: 1.2),
                  ),
                ),
              ),
            ],
          ),
        );
    }
  }
}

class _DestinationGlyph extends StatelessWidget {
  final String type;
  final String? assetPath;

  const _DestinationGlyph({required this.type, this.assetPath});

  @override
  Widget build(BuildContext context) {
    if (assetPath != null) {
      return Image.asset(
        assetPath!,
        width: 62,
        height: 62,
        fit: BoxFit.contain,
        errorBuilder: (context, error, stackTrace) {
          return SizedBox(
            width: 62,
            height: 62,
            child: CustomPaint(
              painter: _DestinationIconPainter(type),
            ),
          );
        },
      );
    }

    return SizedBox(
      width: 62,
      height: 62,
      child: CustomPaint(
        painter: _DestinationIconPainter(type),
      ),
    );
  }
}

class _DestinationIconPainter extends CustomPainter {
  final String type;

  _DestinationIconPainter(this.type);

  static const Color _stroke = Color(0xFF232323);
  static const Color _blush = Color(0xFFE8A2B1);
  static const Color _sand = Color(0xFFF4CB98);
  static const Color _cream = Color(0xFFFBF7EF);

  @override
  void paint(Canvas canvas, Size size) {
    final strokePaint = Paint()
      ..color = _stroke
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final sandPaint = Paint()..color = _sand;
    final blushPaint = Paint()..color = _blush;
    final creamPaint = Paint()..color = _cream;
    final fillStrokePaint = Paint()
      ..color = _stroke
      ..style = PaintingStyle.fill;

    final scaleX = size.width / 72;
    final scaleY = size.height / 72;
    canvas.scale(scaleX, scaleY);

    canvas.drawRRect(
      RRect.fromRectAndRadius(
          const Rect.fromLTWH(50, 8, 12, 34), const Radius.circular(6)),
      sandPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
          const Rect.fromLTWH(38, 8, 14, 34), const Radius.circular(7)),
      blushPaint,
    );

    switch (type) {
      case 'sula':
        _drawWine(canvas, strokePaint, creamPaint, fillStrokePaint);
        break;
      case 'trimbak':
        _drawTempleTown(canvas, strokePaint, creamPaint);
        break;
      case 'igatpuri':
        _drawWaterfall(canvas, strokePaint);
        break;
      case 'nashik':
      default:
        _drawGrapes(canvas, strokePaint, creamPaint, sandPaint);
        break;
    }
  }

  void _drawGrapes(
      Canvas canvas, Paint strokePaint, Paint creamPaint, Paint sandPaint) {
    final stem = Path()
      ..moveTo(27, 17)
      ..quadraticBezierTo(30, 13, 34, 15);
    canvas.drawPath(stem, strokePaint);

    void circle(double x, double y, Paint fill) {
      canvas.drawCircle(Offset(x, y), 4.2, fill);
      canvas.drawCircle(Offset(x, y), 4.2, strokePaint);
    }

    circle(23, 24, creamPaint);
    circle(29, 24, sandPaint);
    circle(20, 31, sandPaint);
    circle(26, 31, creamPaint);
    circle(32, 31, sandPaint);
    circle(23, 38, creamPaint);
    circle(29, 38, sandPaint);
  }

  void _drawWine(Canvas canvas, Paint strokePaint, Paint creamPaint,
      Paint fillStrokePaint) {
    canvas.drawLine(const Offset(21, 46), const Offset(21, 25), strokePaint);
    final glass = Path()
      ..moveTo(16, 25)
      ..lineTo(26, 25)
      ..quadraticBezierTo(25.5, 31, 21, 34.5)
      ..quadraticBezierTo(16.5, 31, 16, 25);
    canvas.drawPath(glass, creamPaint);
    canvas.drawPath(glass, strokePaint);
    canvas.drawLine(const Offset(17, 46), const Offset(25, 46), strokePaint);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
          const Rect.fromLTWH(34, 18, 10, 24), const Radius.circular(2.5)),
      creamPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
          const Rect.fromLTWH(34, 18, 10, 24), const Radius.circular(2.5)),
      strokePaint,
    );
    canvas.drawLine(const Offset(39, 18), const Offset(39, 13), strokePaint);
  }

  void _drawTempleTown(Canvas canvas, Paint strokePaint, Paint creamPaint) {
    canvas.drawLine(const Offset(16, 47), const Offset(47, 47), strokePaint);
    final roof = Path()
      ..moveTo(30, 17)
      ..lineTo(20, 29)
      ..lineTo(40, 29)
      ..close();
    canvas.drawPath(roof, creamPaint);
    canvas.drawPath(roof, strokePaint);
    canvas.drawRect(const Rect.fromLTWH(23, 29, 14, 18), creamPaint);
    canvas.drawRect(const Rect.fromLTWH(23, 29, 14, 18), strokePaint);
    final wave = Path()
      ..moveTo(44, 24)
      ..quadraticBezierTo(47, 27, 49, 34);
    canvas.drawPath(wave, strokePaint);
    canvas.drawCircle(const Offset(50, 18), 3, creamPaint);
    canvas.drawCircle(const Offset(50, 18), 3, strokePaint);
  }

  void _drawWaterfall(Canvas canvas, Paint strokePaint) {
    final mountain = Path()
      ..moveTo(12, 44)
      ..lineTo(24, 24)
      ..lineTo(36, 36)
      ..lineTo(48, 20)
      ..lineTo(58, 44);
    canvas.drawPath(mountain, strokePaint);
    canvas.drawLine(const Offset(46, 18), const Offset(46, 39), strokePaint);
    final base = Path()
      ..moveTo(14, 47)
      ..cubicTo(20, 44, 26, 44, 32, 47)
      ..cubicTo(38, 50, 44, 50, 50, 47);
    canvas.drawPath(base, strokePaint);
  }

  @override
  bool shouldRepaint(covariant _DestinationIconPainter oldDelegate) {
    return oldDelegate.type != type;
  }
}

class _BlogDetailScreen extends StatelessWidget {
  final _BlogData blog;

  const _BlogDetailScreen({required this.blog});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F4EE),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF7F4EE),
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              color: AppTheme.charcoal),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Blog',
          style: GoogleFonts.manrope(
            color: AppTheme.charcoal,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(28),
              child: AspectRatio(
                aspectRatio: 16 / 10,
                child: Image.network(
                  blog.imageUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: AppTheme.stone,
                    child: const Center(
                      child: Icon(
                        Icons.article_outlined,
                        size: 38,
                        color: AppTheme.charcoalMuted,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
              decoration: BoxDecoration(
                color: AppTheme.sand,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                blog.category,
                style: GoogleFonts.manrope(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.charcoal,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              blog.title,
              style: GoogleFonts.manrope(
                fontSize: 28,
                height: 1.2,
                fontWeight: FontWeight.w800,
                color: AppTheme.charcoal,
              ),
            ),
            const SizedBox(height: 14),
            Text(
              blog.excerpt,
              style: GoogleFonts.manrope(
                fontSize: 15,
                height: 1.7,
                color: AppTheme.charcoalMuted,
              ),
            ),
            const SizedBox(height: 24),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppTheme.border),
              ),
              child: Text(
                blog.content,
                style: GoogleFonts.manrope(
                  fontSize: 15,
                  height: 1.85,
                  color: AppTheme.charcoal,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HostEarnPill extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(8, 5, 12, 5),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFE2A90D), Color(0xFFF4C333)],
        ),
        borderRadius: BorderRadius.circular(999),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primary.withValues(alpha: 0.20),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 18,
            height: 18,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 1.4),
            ),
            child:
                const Icon(Icons.star_rounded, size: 12, color: Colors.white),
          ),
          const SizedBox(width: 6),
          Text(
            'EARN MORE',
            style: GoogleFonts.manrope(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

class _HostTitle extends StatelessWidget {
  final double fontSize;

  const _HostTitle({required this.fontSize});

  @override
  Widget build(BuildContext context) {
    return RichText(
      maxLines: 2,
      overflow: TextOverflow.ellipsis,
      text: TextSpan(
        style: GoogleFonts.manrope(
          fontSize: fontSize,
          height: 1.05,
          fontWeight: FontWeight.w900,
          color: const Color(0xFF07142F),
        ),
        children: const [
          TextSpan(text: 'Become a '),
          TextSpan(
            text: 'Host',
            style: TextStyle(color: AppTheme.primary),
          ),
        ],
      ),
    );
  }
}

class _HostMobileVisual extends StatelessWidget {
  final int? hostCount;

  const _HostMobileVisual({this.hostCount});

  String get _hostCountLabel {
    final count = hostCount;
    if (count == null || count <= 0) return 'Join hosts';
    return 'Join $count ${count == 1 ? 'host' : 'hosts'}';
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: SizedBox(
        height: 104,
        width: double.infinity,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.asset(
              'assets/images/hero_villa.jpg',
              fit: BoxFit.cover,
            ),
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [
                    const Color(0xFF07142F).withValues(alpha: 0.78),
                    const Color(0xFF07142F).withValues(alpha: 0.20),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
            Positioned(
              left: 12,
              top: 12,
              child: Container(
                width: 58,
                height: 58,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFFE2A90D), Color(0xFFF3BE20)],
                  ),
                  borderRadius: BorderRadius.circular(19),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.18),
                      blurRadius: 14,
                      offset: const Offset(0, 7),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.home_work_rounded,
                  color: Colors.white,
                  size: 28,
                ),
              ),
            ),
            Positioned(
              left: 14,
              bottom: 12,
              child: Text(
                'Verified spaces earn better',
                style: GoogleFonts.manrope(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            Positioned(
              right: 12,
              bottom: 10,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.92),
                  borderRadius: BorderRadius.circular(999),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.10),
                      blurRadius: 10,
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                child: Text(
                  _hostCountLabel,
                  style: GoogleFonts.manrope(
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF07142F),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HostListButton extends StatelessWidget {
  final bool fullWidth;
  final VoidCallback onPressed;

  const _HostListButton({
    this.fullWidth = false,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: fullWidth ? double.infinity : 78,
      height: fullWidth ? 48 : 40,
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor:
              fullWidth ? const Color(0xFFE6A90D) : const Color(0xFF07142F),
          foregroundColor: Colors.white,
          elevation: fullWidth ? 3 : 0,
          shadowColor: AppTheme.primary.withValues(alpha: 0.35),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (fullWidth) ...[
              Container(
                width: 28,
                height: 28,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.home_rounded,
                  color: Color(0xFFE6A90D),
                  size: 17,
                ),
              ),
              const SizedBox(width: 12),
            ],
            Text(
              fullWidth ? 'List Your Space' : 'List',
              style: GoogleFonts.manrope(
                fontSize: fullWidth ? 15 : 13,
                fontWeight: FontWeight.w900,
              ),
            ),
            SizedBox(width: fullWidth ? 8 : 4),
            Icon(Icons.arrow_forward_rounded, size: fullWidth ? 21 : 17),
          ],
        ),
      ),
    );
  }
}

class _HostBenefit extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _HostBenefit({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            color: const Color(0xFFFFF8EA),
            shape: BoxShape.circle,
            border: Border.all(color: const Color(0xFFF0DFC5)),
          ),
          child: Icon(icon, size: 18, color: const Color(0xFF07142F)),
        ),
        const SizedBox(height: 6),
        Text(
          title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: GoogleFonts.manrope(
            fontSize: 10,
            height: 1,
            fontWeight: FontWeight.w900,
            color: const Color(0xFF07142F),
          ),
        ),
        const SizedBox(height: 3),
        Text(
          subtitle,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: GoogleFonts.manrope(
            fontSize: 9,
            height: 1,
            fontWeight: FontWeight.w700,
            color: const Color(0xFF3F4652),
          ),
        ),
      ],
    );
  }
}

class _FooterSectionData {
  final String title;
  final List<String> links;

  const _FooterSectionData({
    required this.title,
    required this.links,
  });
}

class _FooterChip extends StatelessWidget {
  final String label;

  const _FooterChip({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      ),
      child: Text(
        label,
        style: GoogleFonts.manrope(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _FooterAccordion extends StatelessWidget {
  final _FooterSectionData section;

  const _FooterAccordion({required this.section});

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
      child: Material(
        color: Colors.transparent,
        child: ExpansionTile(
          tilePadding: EdgeInsets.zero,
          childrenPadding: const EdgeInsets.only(bottom: 12),
          iconColor: Colors.white,
          collapsedIconColor: Colors.white,
          title: Text(
            section.title,
            style: GoogleFonts.manrope(
              color: Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
          children: [
            SizedBox(
              height: 38,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: section.links.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  return _FooterChip(label: section.links[index]);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FooterSocial extends StatelessWidget {
  final IconData icon;

  const _FooterSocial({required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.09),
        shape: BoxShape.circle,
      ),
      child: Icon(icon, color: Colors.white, size: 20),
    );
  }
}

class _AccountActionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool destructive;
  final VoidCallback onTap;

  const _AccountActionTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.destructive = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = destructive ? Colors.redAccent : AppTheme.charcoal;
    return Material(
      color: Colors.transparent,
      child: ListTile(
        contentPadding: EdgeInsets.zero,
        leading: Icon(icon, color: color),
        title: Text(
          label,
          style: GoogleFonts.manrope(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
        onTap: onTap,
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
            size: 28,
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
