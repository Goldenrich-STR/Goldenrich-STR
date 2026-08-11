import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:share_plus/share_plus.dart';

import '../../models/property_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/property_provider.dart';
import '../../services/api_service.dart';
import '../../theme.dart';
import '../auth/login_screen.dart';
import '../shared/app_logo.dart';
import '../shared/app_shell.dart';
import '../shared/support_tickets_screen.dart';
import 'guest_browse_screen.dart';
import 'property_detail_screen.dart';

class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  static const String _recentlyVisitedKey = 'recently_visited_properties';
  String _selectedCity = 'Anywhere';
  String _selectedCategory = 'All Types';
  DateTimeRange? _selectedRange;
  int _guestCount = 2;
  late final PageController _heroPageController;
  Timer? _heroTimer;
  int _activeHeroIndex = 0;
  List<PropertyModel> _recentlyVisitedProperties = [];
  List<_BlogData> _blogCards = _defaultBlogCards;
  String _activeHolidayGetawayCity = 'All';

  static const List<_HeroSlide> _heroSlides = [
    _HeroSlide(
      image: 'assets/images/hero_villa.jpg',
      tag: 'VILLA ESCAPES',
      titlePrefix: 'Luxury Private ',
      titleHighlight: 'Villas',
      subtitle:
          'Premium villa stays for family trips, celebrations, and peaceful weekend getaways.',
      badge: 'Private Pool and Scenic Views',
      category: 'residential',
    ),
    _HeroSlide(
      image:
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80',
      tag: 'RESIDENTIAL STAYS',
      titlePrefix: 'Comfortable Premium ',
      titleHighlight: 'Stays',
      subtitle:
          'Elegant homes and apartments designed for smooth short stays and longer city breaks.',
      badge: 'Verified Homes and Easy Booking',
      category: 'residential',
    ),
    _HeroSlide(
      image: 'assets/images/hero_commercial_office.jpg',
      tag: 'COMMERCIAL SPACES',
      titlePrefix: 'Smart Business ',
      titleHighlight: 'Spaces',
      subtitle:
          'Modern offices and work-ready spaces for meetings, teams, and professional stays.',
      badge: 'Office and Workspace Ready',
      category: 'commercial',
    ),
    _HeroSlide(
      image:
          'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=80',
      tag: 'EVENT DESTINATIONS',
      titlePrefix: 'Celebrate Special ',
      titleHighlight: 'Events',
      subtitle:
          'Stylish venues for weddings, parties, launches, and memorable gatherings.',
      badge: 'Curated Venue Support Included',
      category: 'event_venue',
    ),
  ];

  static const List<_DestinationData> _destinations = [
    _DestinationData('Nashik', 'nashik'),
    _DestinationData('Trimbakeshwar', 'trimbak'),
    _DestinationData('Gangapur Dam', 'gangapur_dam'),
    _DestinationData('Igatpuri', 'igatpuri'),
    _DestinationData('Sula Vineyards', 'sula'),
    _DestinationData('Anjaneri', 'anjaneri'),
    _DestinationData('Harihar Fort', 'harihar_fort'),
    _DestinationData('Bhandardara', 'bhandardara'),
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

  static const List<_BlogData> _defaultBlogCards = [
    _BlogData(
      imageUrl:
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80',
      category: 'X-Space360 Guide',
      title: 'How to choose the right stay on X-Space360',
      excerpt:
          'Compare location, space type, amenities, and host quality before locking your next booking.',
      content:
          'Compare location, property type, host credibility, amenities, and booking flexibility before confirming your next stay on X-Space360. Focus on the purpose of your trip first, then shortlist spaces that match your guest count, budget, and experience expectations.',
    ),
    _BlogData(
      imageUrl:
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1400&q=80',
      category: 'Host Success',
      title:
          'How better presentation helps Goldenrich host partners win more bookings',
      excerpt:
          'Cleaner listing photos, better pricing clarity, and stronger trust signals improve conversions faster.',
      content:
          'Cleaner visuals, sharper pricing presentation, and stronger trust signals help host partners convert more visitors into bookings. Well-structured listing descriptions and polished imagery can directly improve guest confidence and booking intent.',
    ),
    _BlogData(
      imageUrl:
          'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80',
      category: 'Local Picks',
      title: 'Top Nashik stays for weekends, events, and work trips',
      excerpt:
          'Explore curated homes, venues, and commercial spaces across Nashik and nearby destinations.',
      content:
          'Explore curated homes, event venues, villas, and work-friendly spaces across Nashik and nearby destinations. Whether you are planning a weekend break, a celebration, or a professional visit, the right space can shape the whole experience.',
    ),
  ];

  static const List<_CollectionCardData> _collectionCards = [
    _CollectionCardData(
      id: 'luxury-villas',
      label: 'Luxury Villas & Farmhouses',
      detail:
          'From Alibaug to Coorg, our hand-picked villas offer privacy, caretakers, BBQ setups, and breathtaking views for family vacations and weekend escapes.',
      tag: 'Most Booked',
      image:
          'https://images.unsplash.com/photo-1744448365250-9b6aa1a7e4a3?auto=format&fit=crop&q=80&w=900',
      category: 'residential',
      propertyType: 'villa',
    ),
    _CollectionCardData(
      id: 'hilltop-retreats',
      label: 'Signature Series',
      detail:
          'A curated portfolio of exclusive private estates featuring elevated luxury, premium hospitality, and unforgettable destination-led stays.',
      tag: 'Signature Series',
      image:
          'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=900',
      category: 'residential',
      propertyType: 'resort',
    ),
    _CollectionCardData(
      id: 'wedding-venues',
      label: 'Intimate Wedding & Event Venues',
      detail:
          'Curated celebration venues with floral courtyards, rooftop terraces, and in-house hospitality for memorable gatherings.',
      tag: 'Trending',
      image:
          'https://images.pexels.com/photos/12153938/pexels-photo-12153938.jpeg?auto=compress&cs=tinysrgb&w=900',
      category: 'event_venue',
      propertyType: 'banquet_hall',
    ),
    _CollectionCardData(
      id: 'residential-stays',
      label: 'Premium Apartments & Homes',
      detail:
          'Fully serviced urban homes with hotel-grade amenities, ideal for business travelers, relocating professionals, and long stays.',
      tag: 'New Launches',
      image:
          'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=900',
      category: 'residential',
      propertyType: 'apartment',
    ),
    _CollectionCardData(
      id: 'commercial-spaces',
      label: 'Commercial & Co-working Spaces',
      detail:
          'Short-term and long-term rentals for startups, corporate offsites, and growing teams with boardrooms and plug-and-play work setups.',
      tag: 'Corporate Picks',
      image:
          'https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&q=80&w=900',
      category: 'commercial',
    ),
    _CollectionCardData(
      id: 'resort-villas',
      label: 'Resort Villas & Pool Stays',
      detail:
          'Scenic villas, pool stays, and weekend resorts with lawns, caretakers, and premium leisure amenities across top getaway destinations.',
      tag: 'Resort Picks',
      image: 'assets/images/hero_villa.jpg',
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
      _heroPageController.animateToPage(
        nextIndex,
        duration: const Duration(milliseconds: 450),
        curve: Curves.easeInOut,
      );
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PropertyProvider>().searchProperties({});
      _loadRecentlyVisitedProperties();
      _loadCmsBlogs();
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

  Future<void> _loadCmsBlogs() async {
    try {
      final response = await ApiService().dio.get('/cms/landing-page');
      final blogPosts = response.data?['blog']?['posts'];
      if (blogPosts is! List) return;

      final nextBlogs = blogPosts
          .whereType<Map>()
          .where((post) => post['is_active'] != false)
          .map((post) {
            final item = Map<String, dynamic>.from(post);
            return _BlogData(
              imageUrl: item['image_url']?.toString().isNotEmpty == true
                  ? item['image_url'].toString()
                  : item['img']?.toString().isNotEmpty == true
                      ? item['img'].toString()
                      : _defaultBlogCards.first.imageUrl,
              category: (item['category']?.toString().trim().isNotEmpty == true)
                  ? item['category'].toString()
                  : 'X-Space360 Journal',
              title: (item['title']?.toString().trim().isNotEmpty == true)
                  ? item['title'].toString()
                  : 'Untitled',
              excerpt: (item['excerpt']?.toString().trim().isNotEmpty == true)
                  ? item['excerpt'].toString()
                  : (item['content']?.toString().trim().isNotEmpty == true)
                      ? item['content'].toString()
                      : 'Discover more from X-Space360.',
              content: (item['content']?.toString().trim().isNotEmpty == true)
                  ? item['content'].toString()
                  : (item['excerpt']?.toString().trim().isNotEmpty == true)
                      ? item['excerpt'].toString()
                      : 'Discover more from X-Space360.',
            );
          })
          .take(6)
          .toList();

      if (!mounted || nextBlogs.isEmpty) return;
      setState(() => _blogCards = nextBlogs);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final propertyProvider = context.watch<PropertyProvider>();
    final properties = propertyProvider.properties;
    final residential = _filterByCategory(properties, 'residential');
    final commercial = _filterByCategory(properties, 'commercial');
    final event = _filterEvent(properties);
    final villas = _filterByPropertyType(properties, const ['villa', 'resort']);
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
            child: _buildRecentlyVisitedSection(),
          ),
          SliverToBoxAdapter(
            child: _buildDiscoverCollectionsSection(),
          ),
          SliverToBoxAdapter(
            child: _buildHolidayGetawaySection(properties),
          ),
          SliverToBoxAdapter(
            child: _buildCollections(
              title: 'Villas & Resorts',
              subtitle:
                  'Private pool villas, vineyard escapes, and destination-led premium stays.',
              properties: villas.isNotEmpty ? villas : residential,
            ),
          ),
          SliverToBoxAdapter(
            child: _buildCollections(
              title: 'Residential Collection',
              subtitle:
                  'Managed homes, elegant apartments, and private family stays.',
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
          SliverToBoxAdapter(child: _buildBlogSection()),
        ],
      ),
      floatingActionButton: GestureDetector(
        onTap: () {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (_) => const AppShell(initialIndex: 3),
            ),
          );
        },
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primary,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.18),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: const Icon(
                Icons.chat_bubble_outline_rounded,
                color: Colors.white,
                size: 24,
              ),
            ),
            Positioned(
              right: 1,
              top: 1,
              child: Container(
                width: 11,
                height: 11,
                decoration: BoxDecoration(
                  color: const Color(0xFF2ED08C),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 1.5),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHero(AuthProvider auth) {
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
    return '$_selectedCity · $_selectedCategory · $dateText · $_guestCount guests';
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
                return _PropertyCard(
                  property: property,
                  onViewed: _loadRecentlyVisitedProperties,
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHolidayGetawaySection(List<PropertyModel> allProperties) {
    if (allProperties.isEmpty) return const SizedBox.shrink();

    final preferredCities = ['Nashik', 'Trimbakeshwar', 'Igatpuri', 'Bhandardara'];
    final presentCities = preferredCities.where((city) =>
      allProperties.any((p) => p.city.trim().toLowerCase() == city.toLowerCase())
    ).toList();
    final tabs = ['All', ...presentCities];

    final filtered = _activeHolidayGetawayCity == 'All'
        ? allProperties.take(8).toList()
        : allProperties.where((p) => p.city.trim().toLowerCase() == _activeHolidayGetawayCity.toLowerCase()).take(8).toList();

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
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
                        fontWeight: isActive ? FontWeight.w800 : FontWeight.w600,
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
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPromoSection() {
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

  Widget _buildDestinationStrip() {
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

  Widget _buildBlogSection() {
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

  Widget _buildChatbotSection() {
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

  Widget _buildFooter() {
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
    return properties.where((property) {
      final category = property.category.toLowerCase();
      return category == 'event' ||
          category == 'event_venue' ||
          category == 'events_venue';
    }).toList();
  }

  Widget _buildRecentlyVisitedSection() {
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
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildDiscoverCollectionsSection() {
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

class _PropertyCard extends StatelessWidget {
  final PropertyModel property;
  final Future<void> Function() onViewed;

  const _PropertyCard({required this.property, required this.onViewed});

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
              builder: (_) =>
                  PropertyDetailScreen(propertyId: property.propertyId),
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
                        final String shareText = 'Check out ${property.title} in ${property.city} on X-Space360. Starting from Rs ${NumberFormat.currency(locale: 'en_IN', symbol: '', decimalDigits: 0).format(property.pricePerNight).trim()}/night.\nhttps://x-space360.in/property/${Uri.encodeComponent(property.propertyId)}';
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
                          onTap: () {
                            propertyProvider
                                .toggleWishlist(property.propertyId);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  isWishlisted
                                      ? 'Removed from wishlist.'
                                      : 'Added to wishlist.',
                                ),
                                duration: const Duration(seconds: 1),
                              ),
                            );
                          },
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

  const _RecentlyVisitedCard({
    required this.property,
    required this.onViewed,
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
              builder: (_) =>
                  PropertyDetailScreen(propertyId: property.propertyId),
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
              ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(22),
                ),
                child: SizedBox(
                  height: 152,
                  width: double.infinity,
                  child: image != null
                      ? Image.network(
                          image,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: AppTheme.stone,
                            child: const Icon(
                              Icons.home_work_outlined,
                              color: AppTheme.charcoalMuted,
                              size: 32,
                            ),
                          ),
                        )
                      : Container(
                          color: AppTheme.stone,
                          child: const Icon(
                            Icons.home_work_outlined,
                            color: AppTheme.charcoalMuted,
                            size: 32,
                          ),
                        ),
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
                        color:
                            selected ? AppTheme.secondary : AppTheme.charcoal,
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
                      onPressed:
                          _guests > 1 ? () => setState(() => _guests--) : null,
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
  final String type;

  const _DestinationData(this.city, this.type);
}

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
