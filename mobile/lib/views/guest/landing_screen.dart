import 'dart:async';
import 'dart:convert';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'stay_date_picker_page.dart';
import '../shared/web_property_card.dart';
import 'home_web_sections.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
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
import '../shared/landing_menu.dart';
import '../shared/web_search_pill.dart';
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
  final ScrollController _pageScroll = ScrollController();
  final GlobalKey _pillKey = GlobalKey();
  bool _stickyPill = false;
  Timer? _heroTimer;
  int _activeHeroIndex = 0;
  int? _registeredHostCount;
  List<_HeroSlide> _cmsHeroSlides = [];
  List<PropertyModel> _recentlyVisitedProperties = [];
  List<PropertyModel> _signatureProperties = [];

  Future<void> _loadSignatureProperties() async {
    final list =
        await context.read<PropertyProvider>().fetchSignatureProperties();
    if (mounted) setState(() => _signatureProperties = list);
  }

  List<HomeBlogItem> _homeBlogItems() {
    return _blogCards
        .map((blog) => HomeBlogItem(
              imageUrl: blog.imageUrl,
              title: blog.title,
              excerpt: blog.excerpt,
              meta: blog.category,
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => _BlogDetailScreen(blog: blog)),
              ),
            ))
        .toList();
  }
  List<_BlogData> _blogCards = [];
  String _activeHolidayGetawayCity = 'All';
  String _weekendCity = 'All';

  static final List<_HeroSlide> _fallbackHeroSlides = [
    _HeroSlide(
      image: 'assets/images/hero/vineyard-retreat.webp',
      tag: '',
      titlePrefix: "Vineyard Stays near Nashik",
      titleHighlight: '',
      subtitle: "Comfortable villas for weekends, families and small groups.",
      badge: "Comfortable villas for weekends, families and small groups.",
      category: 'residential',
    ),
    _HeroSlide(
      image: 'assets/images/hero/lakeside-retreat.webp',
      tag: '',
      titlePrefix: "Lakeside Stays for a Quiet Break",
      titleHighlight: '',
      subtitle: "Choose a stay with open views, fresh air and room to unwind.",
      badge: "Choose a stay with open views, fresh air and room to unwind.",
      category: 'residential',
    ),
    _HeroSlide(
      image: 'assets/images/hero/group-stay.webp',
      tag: '',
      titlePrefix: "Get Together, Stay Together",
      titleHighlight: '',
      subtitle: "Spacious homes for friends, families and celebrations.",
      badge: "Spacious homes for friends, families and celebrations.",
      category: 'residential',
    ),
    _HeroSlide(
      image: 'assets/images/hero/heritage-homestay.webp',
      tag: '',
      titlePrefix: "Homestays with a Personal Touch",
      titleHighlight: '',
      subtitle: "Comfortable homes for relaxed family stays and longer visits.",
      badge: "Comfortable homes for relaxed family stays and longer visits.",
      category: 'residential',
    ),
    _HeroSlide(
      image: 'assets/images/hero/courtyard-villa.webp',
      tag: '',
      titlePrefix: "Courtyard Villas with Old-World Charm",
      titleHighlight: '',
      subtitle: "Quiet courtyards, tall pillars and rooms that open to the garden.",
      badge: "Quiet courtyards, tall pillars and rooms that open to the garden.",
      category: 'residential',
    ),
    _HeroSlide(
      image: 'assets/images/hero/garden-gate-bungalow.webp',
      tag: '',
      titlePrefix: "Heritage Homes Behind Garden Gates",
      titleHighlight: '',
      subtitle: "Step through the arch into a calm, tree-lined bungalow.",
      badge: "Step through the arch into a calm, tree-lined bungalow.",
      category: 'residential',
    ),
    _HeroSlide(
      image: 'assets/images/hero/game-room-villa.webp',
      tag: '',
      titlePrefix: "Game Rooms for Every Get-Together",
      titleHighlight: '',
      subtitle: "Pool tables, music and a pool view for friends and families.",
      badge: "Pool tables, music and a pool view for friends and families.",
      category: 'residential',
    ),
    _HeroSlide(
      image: 'assets/images/hero/sunset-garden-villa.webp',
      tag: '',
      titlePrefix: "Garden Sunsets near the Hills",
      titleHighlight: '',
      subtitle: "Stone paths, flower beds and golden evenings away from the city.",
      badge: "Stone paths, flower beds and golden evenings away from the city.",
      category: 'residential',
    ),
    _HeroSlide(
      image: 'assets/images/hero/heritage-hall-stay.webp',
      tag: '',
      titlePrefix: "Rustic Heritage Stays with Hill Views",
      titleHighlight: '',
      subtitle: "Brick walls, wooden beams and a long verandah to sit back on.",
      badge: "Brick walls, wooden beams and a long verandah to sit back on.",
      category: 'residential',
    ),
  ];

  static const List<_DestinationData> _destinations = [
    _DestinationData('Nashik', 'nashik'),
    _DestinationData('Sula Vineyards', 'sula'),
    _DestinationData('Trimbakeshwar', 'trimbak'),
    _DestinationData('Gangapur Dam', 'gangapur_dam'),
    _DestinationData('Igatpuri', 'igatpuri'),
    _DestinationData('Anjaneri', 'anjaneri'),
    _DestinationData('Harihar Fort', 'harihar_fort'),
    _DestinationData('Bhandardara', 'bhandardara'),
  ];

  List<_HeroSlide> get _heroSlides => _fallbackHeroSlides;

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
    _pageScroll.addListener(_updateStickyPill);
    _loadRecentSearches();
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
      _loadSignatureProperties();
      Provider.of<NotificationProvider>(context, listen: false)
          .loadUnreadCount();
    });
  }

  @override
  void dispose() {
    _heroTimer?.cancel();
    _heroPageController.dispose();
    _pageScroll.dispose();
    super.dispose();
  }

  /// Like the website on phones: once the search pill scrolls off the top it
  /// stays pinned there.
  void _updateStickyPill() {
    final box = _pillKey.currentContext?.findRenderObject();
    if (box is! RenderBox || !box.attached) return;
    final top = box.localToGlobal(Offset.zero).dy;
    final pinned = top < MediaQuery.paddingOf(context).top + 4;
    if (pinned != _stickyPill) setState(() => _stickyPill = pinned);
  }

  String? get _pillValue {
    if (_searchQuery.isNotEmpty) return _searchQuery;
    if (_selectedCity != 'Anywhere') return _selectedCity;
    return null;
  }

  String get _pillSummary => [
        if (_selectedRange != null)
          '${DateFormat('dd MMM').format(_selectedRange!.start)} - ${DateFormat('dd MMM').format(_selectedRange!.end)}',
        '$_guestCount ${_guestCount == 1 ? 'guest' : 'guests'}',
      ].join('  |  ');

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
      floatingActionButton: const AssistantButton(),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      body: SafeArea(
        top: false,
        child: Stack(
        children: [
        RefreshIndicator(
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
            controller: _pageScroll,
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 28),
            children: [
              _buildWebHero(auth),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
              const SizedBox(height: 16),
              KeyedSubtree(key: _pillKey, child: _buildCommercialSearch()),
              const SizedBox(height: 18),
              _buildContinueBrowsing(),
              const SizedBox(height: 26),
              _buildPickDestination(),
              const SizedBox(height: 26),
              _buildRecentlyViewedCompact(),
                  ],
                ),
              ),
              const SizedBox(height: 30),
              _buildWebCollections(),
              const SizedBox(height: 28),
              _buildAvailableThisWeekend(properties),
              const SizedBox(height: 28),
              PartnerBannerSection(
                onExplore: (search) => _openBrowse(searchQuery: search),
              ),
              const SizedBox(height: 30),
              ExploreSpacesSection(
                residential: residential,
                commercial: commercial,
                events: event,
                onOpen: _openPropertyFromHome,
                onViewAll: (category) => _openBrowse(category: category),
              ),
              const SizedBox(height: 10),
              const MoreThanStaySection(),
              XSpaceSeriesSection(
                properties: _signatureProperties,
                onOpen: _openPropertyFromHome,
                onViewAll: () => _openBrowse(
                  category: 'residential',
                  propertyType: 'villa',
                  minPrice: 50000,
                  title: 'X-Space Series',
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 30, 18, 0),
                child: _buildHostStrip(auth),
              ),
              const SizedBox(height: 30),
              BlogsSection(items: _homeBlogItems()),
              _buildWebFooter(auth),
            ],
          ),
        ),
        if (_stickyPill)
          Positioned(
            left: 0,
            right: 0,
            top: 0,
            child: Container(
              padding: EdgeInsets.fromLTRB(
                  16, MediaQuery.paddingOf(context).top + 10, 16, 10),
              decoration: const BoxDecoration(
                color: Color(0xF2FFFFFF),
                boxShadow: [
                  BoxShadow(
                    color: Color(0x14141414),
                    blurRadius: 20,
                    offset: Offset(0, 6),
                  ),
                ],
              ),
              child: _buildCommercialSearch(),
            ),
          ),
        ],
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
    double? minPrice,
    String? title,
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
          initialMinPrice: minPrice,
          title: title,
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
                    style: GoogleFonts.inter(
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

  Widget _buildWebHero(AuthProvider auth) {
    final media = MediaQuery.sizeOf(context);
    final topInset = MediaQuery.paddingOf(context).top;
    final slides = _heroSlides;
    final heroHeight = (media.width * 0.92).clamp(320.0, 430.0) + topInset;
    final activeIndex = _activeHeroIndex.clamp(0, slides.length - 1).toInt();
    final activeSlide = slides[activeIndex];
    final user = auth.currentUser;
    final unreadCount = context.watch<NotificationProvider>().unreadCount;

    Widget roundButton(IconData icon, VoidCallback onTap, {int badge = 0}) {
      return GestureDetector(
        onTap: onTap,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.16),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withValues(alpha: 0.28)),
              ),
              child: Icon(icon, size: 19, color: Colors.white),
            ),
            if (badge > 0)
              Positioned(
                right: -2,
                top: -2,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE53935),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(badge > 9 ? '9+' : '$badge',
                      style: GoogleFonts.inter(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.w700)),
                ),
              ),
          ],
        ),
      );
    }

    return ClipRRect(
      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(28)),
      child: SizedBox(
        height: heroHeight,
        child: Stack(
          fit: StackFit.expand,
          children: [
            PageView.builder(
              controller: _heroPageController,
              itemCount: slides.length,
              onPageChanged: (index) => setState(() => _activeHeroIndex = index),
              itemBuilder: (context, index) =>
                  _HeroSlideImage(slide: slides[index]),
            ),
            IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withValues(alpha: 0.5),
                      Colors.black.withValues(alpha: 0.12),
                      Colors.black.withValues(alpha: 0.2),
                      Colors.black.withValues(alpha: 0.72),
                    ],
                    stops: const [0, 0.3, 0.55, 1],
                  ),
                ),
              ),
            ),
            Positioned(
              left: 18,
              right: 18,
              top: topInset + 12,
              child: Row(
                children: [
                  const AppLogo(height: 30, white: true),
                  const Spacer(),
                  roundButton(
                    LucideIcons.bell,
                    () {
                      if (user == null) {
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
                    badge: user == null ? 0 : unreadCount,
                  ),
                  const SizedBox(width: 10),
                  roundButton(LucideIcons.user, () {
                    if (user == null) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) =>
                                const LoginScreen(initialRole: 'guest')),
                      );
                    } else {
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const AppShell(initialIndex: 4)),
                      );
                    }
                  }),
                ],
              ),
            ),
            Positioned(
              left: 24,
              right: 24,
              bottom: 42,
              child: GestureDetector(
                onTap: () => _openBrowse(category: activeSlide.category),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '${activeSlide.titlePrefix}${activeSlide.titleHighlight}',
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.playfairDisplay(
                          color: Colors.white,
                          fontSize: media.width < 360 ? 23 : 26,
                          height: 1.15,
                          fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      activeSlide.subtitle,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                          color: Colors.white.withValues(alpha: 0.92),
                          fontSize: 12,
                          height: 1.35,
                          fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
            ),
            Positioned(
              bottom: 16,
              left: 0,
              right: 0,
              child: IgnorePointer(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(
                    slides.length,
                    (i) => AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      width: i == activeIndex ? 18 : 6,
                      height: 6,
                      margin: const EdgeInsets.symmetric(horizontal: 2.5),
                      decoration: BoxDecoration(
                        color: Colors.white
                            .withValues(alpha: i == activeIndex ? 0.95 : 0.5),
                        borderRadius: BorderRadius.circular(999),
                      ),
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

  static const String _recentSearchKey = 'xspace_recent_location_searches';
  List<String> _recentSearches = [];

  Future<void> _loadRecentSearches() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = prefs.getStringList(_recentSearchKey) ?? [];
      if (mounted) setState(() => _recentSearches = list);
    } catch (_) {}
  }

  Future<void> _saveRecentSearch(String value) async {
    final cleaned = value.trim();
    if (cleaned.isEmpty) return;
    final next = [cleaned, ..._recentSearches.where((e) => e != cleaned)]
        .take(5)
        .toList();
    if (mounted) setState(() => _recentSearches = next);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(_recentSearchKey, next);
    } catch (_) {}
  }

  /// "Continue browsing...": the guest's last searches, one tap to repeat them
  /// (Nashik, Igatpuri and Pune until they have searched for something).
  Widget _buildContinueBrowsing() {
    final items = _recentSearches.isNotEmpty
        ? _recentSearches
        : const ['Nashik', 'Igatpuri', 'Pune'];
    Widget chip(String label) {
      return GestureDetector(
        onTap: () {
          final m = RegExp(r'\sin\s(.+)$', caseSensitive: false).firstMatch(label);
          final city = (m?.group(1) ?? label).trim();
          setState(() {
            _selectedCity = city;
            _searchQuery = '';
          });
          _runSearch();
        },
        child: Container(
          padding: const EdgeInsets.fromLTRB(10, 8, 16, 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: const Color(0xFFE8ECF1)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: const BoxDecoration(
                    color: Color(0xFFF4F7FC), shape: BoxShape.circle),
                padding: const EdgeInsets.all(2),
                child: Image.asset(
                  'assets/images/ui/recent-search-home.webp',
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const Icon(LucideIcons.house,
                      size: 16, color: Color(0xFFD96570)),
                ),
              ),
              const SizedBox(width: 8),
              Text(label,
                  style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF1B1924))),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Continue browsing...',
            style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF64748B))),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x0D0F172A), blurRadius: 10, offset: Offset(0, 2))
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      for (final item in items) ...[
                        chip(item),
                        const SizedBox(width: 8),
                      ],
                    ],
                  ),
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4),
                child: Icon(LucideIcons.chevronRight,
                    size: 20, color: Color(0xFF64748B)),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPickDestination() {
    const files = {
      'trimbak': 'trimbakeshwar',
      'sula': 'sula-vineyards',
      'gangapur_dam': 'gangapur-dam',
      'harihar_fort': 'harihar-fort',
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text('Pick a Destination',
                style: GoogleFonts.playfairDisplay(
                    fontSize: 22,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF1B1924))),
            const SizedBox(width: 8),
            Text('Swipe',
                style: GoogleFonts.inter(
                    fontSize: 12, color: const Color(0xFF6B6B6B))),
            const Icon(LucideIcons.chevronRight,
                size: 14, color: Color(0xFF6B6B6B)),
          ],
        ),
        const SizedBox(height: 14),
        SizedBox(
          height: 124,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _destinations.length,
            separatorBuilder: (_, __) => const SizedBox(width: 16),
            itemBuilder: (context, index) {
              final d = _destinations[index];
              final file = files[d.type] ?? d.type;
              return GestureDetector(
                onTap: () => _openBrowse(city: d.city),
                child: SizedBox(
                  width: 88,
                  child: Column(
                    children: [
                      SizedBox(
                        width: 78,
                        height: 88,
                        child: Image.asset(
                          'assets/images/destinations/$file.png',
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => const Icon(
                              LucideIcons.mapPin,
                              size: 32,
                              color: Color(0xFF9A9A9A)),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(d.city,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: const Color(0xFF1B1924))),
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

  Widget _buildCommercialHero() {
    final media = MediaQuery.sizeOf(context);
    final slides = _heroSlides;
    final heroHeight = (media.width * 0.64).clamp(200.0, 280.0);
    final activeIndex = _activeHeroIndex.clamp(0, slides.length - 1).toInt();
    final activeSlide = slides[activeIndex];
    final title = '${activeSlide.titlePrefix}${activeSlide.titleHighlight}';
    return GestureDetector(
      onTap: () => _openBrowse(category: activeSlide.category),
      child: ClipRRect(
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
              IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Colors.black.withValues(alpha: 0.12),
                        Colors.black.withValues(alpha: 0.68),
                      ],
                      stops: const [0.35, 0.6, 1],
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 18,
                right: 18,
                bottom: 34,
                child: IgnorePointer(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                              color: Colors.white,
                              fontSize: media.width < 360 ? 20 : 22,
                              height: 1.15,
                              fontWeight: FontWeight.w500)),
                      const SizedBox(height: 6),
                      Text(activeSlide.subtitle,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                              color: Colors.white.withValues(alpha: 0.9),
                              fontSize: 12,
                              height: 1.35,
                              fontWeight: FontWeight.w400)),
                    ],
                  ),
                ),
              ),
              Positioned(
                bottom: 14,
                left: 0,
                right: 0,
                child: IgnorePointer(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(
                      slides.length,
                      (i) => AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        width: i == activeIndex ? 18 : 6,
                        height: 6,
                        margin: const EdgeInsets.symmetric(horizontal: 2.5),
                        decoration: BoxDecoration(
                          color: Colors.white
                              .withValues(alpha: i == activeIndex ? 0.95 : 0.5),
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCommercialSearch() {
    return WebSearchPill(
      onTap: () => _openSearchSheet(),
      value: _pillValue,
      summary: _pillSummary,
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
                style: GoogleFonts.inter(
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF07142F))),
            Text(sub,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(
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
                    style: GoogleFonts.inter(
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
              style: GoogleFonts.inter(
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
              style: GoogleFonts.inter(
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
                                  style: GoogleFonts.inter(
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
                                      style: GoogleFonts.inter(
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

  Widget _webSectionTitle(String title, VoidCallback? onViewAll) {
    return Row(
      children: [
        Expanded(
          child: Text(title,
              style: GoogleFonts.playfairDisplay(
                  fontSize: 24,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF1B1924))),
        ),
        if (onViewAll != null)
          GestureDetector(
            onTap: onViewAll,
            child: Row(
              children: [
                Text('View all',
                    style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF2563EB))),
                const SizedBox(width: 4),
                const Icon(LucideIcons.arrowRight,
                    size: 15, color: Color(0xFF2563EB)),
              ],
            ),
          ),
      ],
    );
  }

  void _openPropertyFromHome(PropertyModel property) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PropertyDetailScreen(
          propertyId: property.propertyId,
          initialCheckInDate: _selectedRange?.start,
          initialCheckOutDate: _selectedRange?.end,
          initialGuestCount: _guestCount,
        ),
      ),
    ).then((_) => _loadRecentlyVisitedProperties());
  }

  /// "Available This Weekend": the website's city tabs (All, Nashik, Pune, Goa,
  /// Alibaug, Discover All) over the same live properties.
  Widget _buildAvailableThisWeekend(List<PropertyModel> all) {
    if (all.isEmpty) return const SizedBox.shrink();
    const preferred = ['Nashik', 'Pune', 'Goa', 'Alibaug'];
    final present = preferred
        .where((c) => all.any((p) => p.city.trim().toLowerCase() == c.toLowerCase()))
        .toList();
    final tabs = ['All', ...present, 'Discover All'];
    final active = tabs.contains(_weekendCity) ? _weekendCity : 'All';
    final shown = (active == 'All'
            ? all
            : all.where((p) => p.city.trim().toLowerCase() == active.toLowerCase()))
        .take(10)
        .toList();
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 0, 0, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Available This Weekend',
              style: GoogleFonts.playfairDisplay(
                  fontSize: 22,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF1E1E1E))),
          const SizedBox(height: 14),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final tab in tabs)
                  GestureDetector(
                    onTap: () {
                      if (tab == 'Discover All') {
                        _openBrowse();
                        return;
                      }
                      setState(() => _weekendCity = tab);
                    },
                    child: Container(
                      margin: const EdgeInsets.only(right: 22),
                      padding: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: active == tab
                                ? const Color(0xFF1B1924)
                                : Colors.transparent,
                            width: 2,
                          ),
                        ),
                      ),
                      child: Text(tab,
                          style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: active == tab
                                  ? const Color(0xFF1B1924)
                                  : const Color(0xFF64748B))),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _webCardRow(shown),
        ],
      ),
    );
  }

  Widget _webCardRow(List<PropertyModel> cards) {
    return SizedBox(
      height: 410,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        clipBehavior: Clip.none,
        padding: const EdgeInsets.only(top: 4, bottom: 18, right: 18),
        itemCount: cards.length,
        separatorBuilder: (_, __) => const SizedBox(width: 16),
        itemBuilder: (_, index) => SizedBox(
          width: 292,
          child: WebPropertyCard(
            property: cards[index],
            onTap: () => _openPropertyFromHome(cards[index]),
          ),
        ),
      ),
    );
  }

  Widget _buildRecentlyViewedCompact() {
    if (_recentlyVisitedProperties.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _webSectionTitle('Recently Visited', null),
        const SizedBox(height: 14),
        _webCardRow(_recentlyVisitedProperties),
      ],
    );
  }

  Widget _buildFeaturedSpacesCompact({
    required String title,
    required String category,
    required List<PropertyModel> properties,
  }) {
    final cards = properties.take(8).toList();
    if (cards.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _webSectionTitle(title, () => _openBrowse(category: category)),
        const SizedBox(height: 14),
        _webCardRow(cards),
      ],
    );
  }

  Widget _buildWebCollections() {
    // the website's five "Discover Our Collection" cards: same photos and wording
    // [photo, title, subtitle, category, property_type filter] (same filters as the website)
    const items = [
      ['villas', 'Villas', 'Private pools, lush lawns & royal stays across India', 'residential', 'villa,farmhouse'],
      ['xspace-series', 'X-Space Series', 'The ultimate pinnacle of private luxury stays', 'residential', 'villa'],
      ['banquet-halls', 'Banquet Halls', 'Magical backdrops for your dream celebration', 'event_venue', ''],
      ['homestays', 'Homestays', 'Fully serviced urban homes with hotel-grade amenities', 'residential', 'not:villa,farmhouse'],
      ['coworking', 'Coworking Spaces', 'Premium offices and collaborative work studios', 'commercial', 'co_working'],
    ];
    return Container(
      width: double.infinity,
      color: const Color(0xFFF8F3E8),
      padding: const EdgeInsets.fromLTRB(16, 30, 0, 30),
      child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _webSectionTitle('Discover Our Collection', null),
        const SizedBox(height: 16),
        SizedBox(
          height: 290,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.only(right: 16),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(width: 14),
            itemBuilder: (context, index) {
              final c = items[index];
              return GestureDetector(
                onTap: () => _openBrowse(
                  category: c[3],
                  propertyType: c[4].isEmpty ? null : c[4],
                  // the X-Space Series is only the premium villas
                  minPrice: c[0] == 'xspace-series' ? 50000 : null,
                  title: c[1],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: SizedBox(
                    width: 214,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        Image.asset(
                          'assets/images/collections/${c[0]}.jpg',
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) =>
                              Container(color: const Color(0xFF3A3A3A)),
                        ),
                        DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.transparent,
                                Colors.black.withValues(alpha: 0.78),
                              ],
                              stops: const [0.35, 1],
                            ),
                          ),
                        ),
                        Positioned(
                          left: 16,
                          right: 16,
                          bottom: 16,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(c[1],
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.playfairDisplay(
                                      fontSize: 15,
                                      height: 1.2,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.white)),
                              const SizedBox(height: 6),
                              Text(c[2],
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.inter(
                                      fontSize: 11,
                                      height: 1.35,
                                      color:
                                          Colors.white.withValues(alpha: 0.9))),
                            ],
                          ),
                        ),
                      ],
                    ),
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

  Widget _buildWebFooter(AuthProvider auth) {
    Widget link(String text, VoidCallback onTap) => InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(text,
                  style: GoogleFonts.inter(
                      fontSize: 13, color: const Color(0xFF4A5568))),
            ),
          ),
        );

    Widget group(String title, List<Widget> children) => Theme(
          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
          child: ExpansionTile(
            tilePadding: EdgeInsets.zero,
            childrenPadding: const EdgeInsets.only(bottom: 8),
            iconColor: const Color(0xFF1B1924),
            collapsedIconColor: const Color(0xFF1B1924),
            title: Text(title,
                style: GoogleFonts.inter(
                    fontSize: 13,
                    letterSpacing: 0.6,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF1B1924))),
            children: children,
          ),
        );

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 34),
      padding: const EdgeInsets.fromLTRB(20, 26, 20, 28),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFEDEDED))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const AppLogo(height: 30),
          const SizedBox(height: 12),
          Text(
            'Redefining short-term rentals in India through curation, technology, and premium service.',
            style: GoogleFonts.inter(
                fontSize: 13, height: 1.55, color: const Color(0xFF4A5568)),
          ),
          const SizedBox(height: 20),
          Text('CONNECT WITH US',
              style: GoogleFonts.inter(
                  fontSize: 11,
                  letterSpacing: 0.8,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF6B6B6B))),
          const SizedBox(height: 10),
          Row(
            // same pages as the website footer; the website has no YouTube page yet
            children: const [
              _WebSocialDot(
                  icon: FontAwesomeIcons.linkedinIn,
                  url: 'https://www.linkedin.com/company/139624194/'),
              SizedBox(width: 10),
              _WebSocialDot(
                  icon: FontAwesomeIcons.instagram,
                  url: 'https://www.instagram.com/xspace360.in'),
              SizedBox(width: 10),
              _WebSocialDot(
                  icon: FontAwesomeIcons.facebookF,
                  url: 'https://www.facebook.com/share/1H3z56BJu4/'),
              SizedBox(width: 10),
              _WebSocialDot(icon: FontAwesomeIcons.youtube),
            ],
          ),
          const SizedBox(height: 10),
          const Divider(height: 1, color: Color(0xFFEDEDED)),
          group('X-SPACE360 STAYS', [
            link('Residential Stays', () => _openBrowse(category: 'residential')),
            link('Commercial Spaces', () => _openBrowse(category: 'commercial')),
            link('Event Venues', () => _openBrowse(category: 'event_venue')),
          ]),
          const Divider(height: 1, color: Color(0xFFEDEDED)),
          group('HOSTS', [
            link('List your space', () => _openHostSignup(auth)),
          ]),
          const Divider(height: 1, color: Color(0xFFEDEDED)),
          group('CONTACT US', [
            link('Call Us: +91 8104 954 254', () {}),
            link('support@x-space360.in', () {}),
          ]),
          const Divider(height: 1, color: Color(0xFFEDEDED)),
          const SizedBox(height: 18),
          Text(
            '\u00a9 2026 X-Space360. Owned & Operated by Golden Rich Financial Solutions & Real Estate Solutions Pvt Ltd. All rights reserved.',
            style: GoogleFonts.inter(
                fontSize: 11, height: 1.55, color: const Color(0xFF6B6B6B)),
          ),
          const SizedBox(height: 70),
        ],
      ),
    );
  }

  /// Short host call-to-action in place of the old tall "Become a Host" block.
  Widget _buildHostStrip(AuthProvider auth) {
    return GestureDetector(
      onTap: () => _openHostSignup(auth),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        decoration: BoxDecoration(
          color: const Color(0xFFFBF1D6),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE6CF8A)),
        ),
        child: Row(
          children: [
            const Icon(LucideIcons.house, size: 22, color: Color(0xFF1B1924)),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('List your space',
                      style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF1B1924))),
                  const SizedBox(height: 2),
                  Text('Host guests and start earning with X-Space360.',
                      style: GoogleFonts.inter(
                          fontSize: 12, color: const Color(0xFF6B6B6B))),
                ],
              ),
            ),
            const Icon(LucideIcons.arrowRight,
                size: 18, color: Color(0xFF1B1924)),
          ],
        ),
      ),
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
                    style: GoogleFonts.inter(
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF07142F))),
                const SizedBox(height: 4),
                Text('Book now and get up to 20% OFF on selected spaces.',
                    style: GoogleFonts.inter(
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
              style: GoogleFonts.inter(
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

  Future<void> _openMenu(AuthProvider auth) {
    final user = auth.currentUser;
    void toLogin() => Navigator.push(
        context, MaterialPageRoute(builder: (_) => const LoginScreen()));
    return showLandingMenu(
      context,
      userName: user?.fullName,
      onBrowse: ({category, city, propertyType, searchQuery, minPrice}) =>
          _openBrowse(
              category: category,
              city: city,
              propertyType: propertyType,
              searchQuery: searchQuery,
              minPrice: minPrice),
      onListProperty: () => _openHostSignup(auth),
      onSignIn: toLogin,
      onBookings: () {
        if (user == null) return toLogin();
        Navigator.push(
            context,
            MaterialPageRoute(
                builder: (_) => const AppShell(initialIndex: 2)));
      },
      onWishlist: () {
        if (user == null) return toLogin();
        Navigator.push(
            context,
            MaterialPageRoute(
                builder: (_) => const AppShell(initialIndex: 1)));
      },
      onSupport: () => Navigator.push(context,
          MaterialPageRoute(builder: (_) => const SupportTicketsScreen())),
      onDownload: () => launchUrl(
          Uri.parse(
              'https://play.google.com/store/apps/details?id=com.xspace360.app'),
          mode: LaunchMode.externalApplication),
    );
  }

  Widget _buildHeroHeader(AuthProvider auth) {
    final user = auth.currentUser;
    return Row(
      children: [
        const AppLogo(height: 24, white: true, framed: false),
        const Spacer(),
        if (auth.isAuthenticated) ...[
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
        ],
        const SizedBox(width: 6),
        IconButton(
          onPressed: () => _openMenu(auth),
          icon: const Icon(LucideIcons.menu, color: Colors.white, size: 28),
          tooltip: 'Menu',
        ),
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
                          style: GoogleFonts.inter(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.charcoal,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          user.email,
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            color: AppTheme.charcoalMuted,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Role: ${_roleLabel(user.role)}',
                          style: GoogleFonts.inter(
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
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 18),
        RichText(
          textAlign: TextAlign.center,
          text: TextSpan(
            style: GoogleFonts.inter(
              fontSize: 33,
              height: 1.12,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
            children: [
              TextSpan(text: slide.titlePrefix),
              TextSpan(
                text: slide.titleHighlight,
                style: GoogleFonts.inter(
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
                style: GoogleFonts.inter(
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
                            style: GoogleFonts.inter(
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
                            style: GoogleFonts.inter(
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
            style: GoogleFonts.inter(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              letterSpacing: 0,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: GoogleFonts.inter(
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
            style: GoogleFonts.inter(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              letterSpacing: 0,
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
                      style: GoogleFonts.inter(
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
                style: GoogleFonts.inter(color: AppTheme.charcoalMuted),
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
            style: GoogleFonts.inter(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Web-style promo blocks adapted for mobile so guests discover new offers faster.',
            style: GoogleFonts.inter(
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
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0,
                            color: AppTheme.primary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          card.title,
                          style: GoogleFonts.inter(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          card.description,
                          style: GoogleFonts.inter(
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
                          style: GoogleFonts.inter(
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
                          style: GoogleFonts.inter(
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
            style: GoogleFonts.inter(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Join India\'s premium short-term rental network and turn curated spaces into high-yield assets.',
            style: GoogleFonts.inter(
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
            style: GoogleFonts.inter(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'A premium experience should feel refined on every screen, from discovery to checkout.',
            style: GoogleFonts.inter(
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
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          height: 1.7,
                          color: AppTheme.charcoal,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        item.name,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.charcoal,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        item.role,
                        style: GoogleFonts.inter(
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
            style: GoogleFonts.inter(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Content-led trust sections from the website, now shaped for app discovery.',
            style: GoogleFonts.inter(
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
                                    style: GoogleFonts.inter(
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
                                  style: GoogleFonts.inter(
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
                                    style: GoogleFonts.inter(
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
                  style: GoogleFonts.inter(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.charcoal,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Use the AI concierge for stay suggestions, booking help, and quick answers anytime.',
                  style: GoogleFonts.inter(
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
            style: GoogleFonts.inter(
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
            style: GoogleFonts.inter(
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
            style: GoogleFonts.inter(
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
    final result = await Navigator.of(context).push<_SearchSelection>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => _SearchStayPage(
          initialCity: _selectedCity == 'Anywhere' ? '' : _selectedCity,
          initialQuery: _searchQuery,
          initialCategory: _selectedCategory,
          initialRange: _selectedRange,
          initialGuests: _guestCount,
        ),
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
    _saveRecentSearch(result.city.isNotEmpty ? result.city : result.searchQuery);
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
                      style: GoogleFonts.inter(
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
                style: GoogleFonts.inter(
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
            style: GoogleFonts.inter(
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
                    style: GoogleFonts.inter(
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
                        style: GoogleFonts.inter(
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
                              style: GoogleFonts.inter(
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
                            style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w900,
                                color: const Color(0xFF07142F))),
                        const Spacer(),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              '${CurrencyFormatter.format(property.customerDisplayPrice)} / ${property.pricingUnitLabel}',
                              style: GoogleFonts.inter(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w900,
                                  color: const Color(0xFF07142F)),
                            ),
                            Text('Starts from',
                                style: GoogleFonts.inter(
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
              style: GoogleFonts.inter(
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
                            style: GoogleFonts.inter(
                              color: AppTheme.charcoal,
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0,
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
                                  style: GoogleFonts.inter(
                                    color: const Color(0xFFD4AF37),
                                    fontSize: 8.5,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0,
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
                    style: GoogleFonts.inter(
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
                      style: GoogleFonts.inter(
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
              style: GoogleFonts.inter(
                fontSize: 12,
                color: AppTheme.charcoalMuted,
              ),
            ),
            const SizedBox(height: 6),
            _BookingModeChip(property: property),
            const SizedBox(height: 6),
            Text(
              '${CurrencyFormatter.format(property.customerDisplayPrice)}${property.pricingUnitSuffix}',
              style: GoogleFonts.inter(
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
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.primary.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: AppTheme.primary.withValues(alpha: 0.24),
        ),
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
                              style: GoogleFonts.inter(
                                fontSize: 8.5,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0,
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
                          style: GoogleFonts.inter(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0,
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
                      style: GoogleFonts.inter(
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0,
                        color: Colors.white.withValues(alpha: 0.66),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      card.label,
                      style: GoogleFonts.inter(
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
                      style: GoogleFonts.inter(
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
                            style: GoogleFonts.inter(
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
                              style: GoogleFonts.inter(
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
                            style: GoogleFonts.inter(
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
                        style: GoogleFonts.inter(
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

class _SearchStayPage extends StatefulWidget {
  final String initialCity;
  final String initialQuery;
  final String initialCategory;
  final DateTimeRange? initialRange;
  final int initialGuests;

  const _SearchStayPage({
    required this.initialCity,
    required this.initialQuery,
    required this.initialCategory,
    required this.initialRange,
    required this.initialGuests,
  });

  @override
  State<_SearchStayPage> createState() => _SearchStayPageState();
}

class _SearchStayPageState extends State<_SearchStayPage> {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focus = FocusNode();
  DateTimeRange? _range;
  int _guests = 2;
  String _city = '';

  static const List<String> _cities = [
    'Nashik',
    'Pune',
    'Mumbai',
    'Igatpuri',
    'Trimbakeshwar',
    'Alibaug',
    'Lonavala',
    'Goa',
  ];

  @override
  void initState() {
    super.initState();
    _city = widget.initialCity;
    _controller.text = widget.initialCity.isNotEmpty
        ? widget.initialCity
        : widget.initialQuery;
    _range = widget.initialRange;
    _guests = widget.initialGuests;
  }

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _pickDates() async {
    final picked = await Navigator.of(context).push<DateTimeRange>(
      MaterialPageRoute(
        builder: (_) => StayDatePickerPage(initialRange: _range),
      ),
    );
    if (picked != null && mounted) setState(() => _range = picked);
  }

  void _submit() {
    final text = _controller.text.trim();
    final isCity = _cities.any((c) => c.toLowerCase() == text.toLowerCase());
    Navigator.pop(
      context,
      _SearchSelection(
        city: isCity ? text : (text.isEmpty ? '' : _city),
        searchQuery: isCity ? '' : text,
        category: widget.initialCategory,
        range: _range,
        guests: _guests,
      ),
    );
  }

  Widget _tile({
    required IconData icon,
    required Widget child,
    VoidCallback? onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: const Color(0xFFF6F6F6),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Icon(icon, size: 20, color: const Color(0xFF4A4A4A)),
            const SizedBox(width: 14),
            Expanded(child: child),
          ],
        ),
      ),
    );
  }

  Widget _label(String text) => Text(text,
      style: GoogleFonts.inter(
          fontSize: 12,
          fontWeight: FontWeight.w400,
          color: const Color(0xFF6B6B6B)));

  Widget _stepper(IconData icon, VoidCallback? onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 34,
        height: 34,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
              color: onTap == null
                  ? const Color(0xFFE0E0E0)
                  : const Color(0xFF1B1924)),
        ),
        child: Icon(icon,
            size: 16,
            color: onTap == null
                ? const Color(0xFFBDBDBD)
                : const Color(0xFF1B1924)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    String dateText(DateTime? d) =>
        d == null ? 'Select date' : DateFormat('dd MMM yyyy').format(d);
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 16, 4),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(LucideIcons.arrowLeft, size: 22),
                  ),
                  Text('Search your Stay',
                      style: GoogleFonts.inter(
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF1B1924))),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
                children: [
                  _tile(
                    icon: LucideIcons.mapPin,
                    onTap: () => _focus.requestFocus(),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _label('Location/Villas/Landmark'),
                        TextField(
                          controller: _controller,
                          focusNode: _focus,
                          textInputAction: TextInputAction.search,
                          onSubmitted: (_) => _submit(),
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            isDense: true,
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.only(top: 2),
                            hintText: 'Select location',
                            hintStyle: GoogleFonts.inter(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF1B1924)),
                          ),
                          style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF1B1924)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _cities.map((c) {
                      final active =
                          _controller.text.trim().toLowerCase() ==
                              c.toLowerCase();
                      return GestureDetector(
                        onTap: () => setState(() {
                          _city = c;
                          _controller.text = c;
                        }),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: active
                                ? const Color(0xFF1B1924)
                                : Colors.white,
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(
                                color: active
                                    ? const Color(0xFF1B1924)
                                    : const Color(0xFFD9D9D9)),
                          ),
                          child: Text(c,
                              style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: active
                                      ? Colors.white
                                      : const Color(0xFF1B1924))),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 14),
                  _tile(
                    icon: LucideIcons.calendar,
                    onTap: _pickDates,
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _label('Check-In Date'),
                              const SizedBox(height: 2),
                              Text(dateText(_range?.start),
                                  style: GoogleFonts.inter(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                      color: _range == null
                                          ? const Color(0xFF6B6B6B)
                                          : const Color(0xFF1B1924))),
                            ],
                          ),
                        ),
                        Container(
                            width: 1, height: 34, color: const Color(0xFFDADADA)),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _label('Check-Out Date'),
                              const SizedBox(height: 2),
                              Text(dateText(_range?.end),
                                  style: GoogleFonts.inter(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                      color: _range == null
                                          ? const Color(0xFF6B6B6B)
                                          : const Color(0xFF1B1924))),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  _tile(
                    icon: LucideIcons.users,
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _label('Total Guests'),
                              const SizedBox(height: 2),
                              Text('$_guests ${_guests == 1 ? 'Guest' : 'Guests'}',
                                  style: GoogleFonts.inter(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                      color: const Color(0xFF1B1924))),
                            ],
                          ),
                        ),
                        _stepper(LucideIcons.minus,
                            _guests > 1 ? () => setState(() => _guests--) : null),
                        const SizedBox(width: 10),
                        _stepper(LucideIcons.plus,
                            _guests < 30 ? () => setState(() => _guests++) : null),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Color(0xFFEDEDED))),
              ),
              child: SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1B1924),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                  child: Text('Search Stays',
                      style: GoogleFonts.inter(
                          fontSize: 15, fontWeight: FontWeight.w600)),
                ),
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
                          style: GoogleFonts.inter(
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
                style: GoogleFonts.inter(
                  fontSize: 28,
                  height: 1.05,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF07142F),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Search top properties in your favorite destinations',
                style: GoogleFonts.inter(
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
            style: GoogleFonts.inter(
              fontSize: 19,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF07142F),
            ),
          ),
        ),
        if (action != null)
          Text(
            '$action  >',
            style: GoogleFonts.inter(
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
                                style: GoogleFonts.inter(
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
                          style: GoogleFonts.inter(
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
                    style: GoogleFonts.inter(
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
              style: GoogleFonts.inter(
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
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF07142F),
                          ),
                        ),
                        Text(
                          items[i].$3,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
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
                          style: GoogleFonts.inter(
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
                          style: GoogleFonts.inter(
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
                    style: GoogleFonts.inter(
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
                    style: GoogleFonts.inter(
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
          style: GoogleFonts.inter(
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
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.charcoal,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              blog.title,
              style: GoogleFonts.inter(
                fontSize: 28,
                height: 1.2,
                fontWeight: FontWeight.w800,
                color: AppTheme.charcoal,
              ),
            ),
            const SizedBox(height: 14),
            Text(
              blog.excerpt,
              style: GoogleFonts.inter(
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
                style: GoogleFonts.inter(
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
            style: GoogleFonts.inter(
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
        style: GoogleFonts.inter(
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
                style: GoogleFonts.inter(
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
                  style: GoogleFonts.inter(
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
              style: GoogleFonts.inter(
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
          style: GoogleFonts.inter(
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
          style: GoogleFonts.inter(
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

class _WebSocialDot extends StatelessWidget {
  final FaIconData icon;
  final String? url;

  const _WebSocialDot({required this.icon, this.url});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: url == null
          ? null
          : () => launchUrl(Uri.parse(url!), mode: LaunchMode.externalApplication),
      child: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: const Color(0xFFD9D9D9)),
        ),
        alignment: Alignment.center,
        child: FaIcon(icon, size: 17, color: const Color(0xFF1B1924)),
      ),
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
        style: GoogleFonts.inter(
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
            style: GoogleFonts.inter(
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
          style: GoogleFonts.inter(
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
