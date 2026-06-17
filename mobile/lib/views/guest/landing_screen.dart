import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../providers/property_provider.dart';
import '../../theme.dart';
import '../auth/login_screen.dart';
import '../shared/app_shell.dart';
import 'property_detail_screen.dart';

class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<PropertyProvider>(context, listen: false).searchProperties({});
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final propertyProvider = Provider.of<PropertyProvider>(context);

    // Group properties by category for the collections view
    final residentialProps = propertyProvider.properties
        .where((p) => p.category.toLowerCase() == 'residential')
        .toList();
    final commercialProps = propertyProvider.properties
        .where((p) => p.category.toLowerCase() == 'commercial')
        .toList();
    final eventProps = propertyProvider.properties
        .where((p) => p.category.toLowerCase() == 'event' || 
                      p.category.toLowerCase() == 'event_venue' || 
                      p.category.toLowerCase() == 'events_venue')
        .toList();

    return Scaffold(
      backgroundColor: const Color(0xFFFAF9F6), // Warm white background
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. HERO SECTION WITH IMAGE BACKGROUND AND OVERLAYS
            _buildTopHeroSection(context, auth),

            const SizedBox(height: 32),

            // 2. CATEGORY CIRCULAR BUTTONS
            _buildCategoryQuickLinks(context),

            const SizedBox(height: 40),

            // 3. FEATURED COLLECTIONS
            // A. Residential Collection
            _buildCollectionSection(
              context,
              title: 'RESIDENTIAL COLLECTION',
              subtitle: 'Luxury homes, apartments, and private stays.',
              properties: residentialProps,
            ),

            const SizedBox(height: 32),

            // B. Commercial Spaces
            _buildCollectionSection(
              context,
              title: 'COMMERCIAL SPACES',
              subtitle: 'Premium offices, co-working spaces, and retail.',
              properties: residentialProps, // fallback just in case commercial is empty
            ),

            const SizedBox(height: 32),

            // C. Events & Functions
            _buildCollectionSection(
              context,
              title: 'FITNESS & FUNCTIONS',
              subtitle: 'Banquet halls, rooftops, and celebration venues.',
              properties: eventProps,
            ),

            const SizedBox(height: 48),

            // 4. READY TO HOST BANNER
            _buildReadyToHostBanner(context, auth),

            const SizedBox(height: 48),

            // 5. LOVED BY GUESTS (TESTIMONIALS)
            _buildTestimonialsSection(context),

            const SizedBox(height: 48),

            // 6. LATEST FROM THE BLOG
            _buildBlogSection(context),

            const SizedBox(height: 48),

            // 7. FOOTER
            _buildFooter(context),
          ],
        ),
      ),
    );
  }

  Widget _buildTopHeroSection(BuildContext context, AuthProvider auth) {
    final double statusBarHeight = MediaQuery.of(context).padding.top;
    return Stack(
      children: [
        // Background image
        Container(
          height: 380 + statusBarHeight,
          width: double.infinity,
          decoration: const BoxDecoration(
            image: DecorationImage(
              image: NetworkImage('https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200'),
              fit: BoxFit.cover,
            ),
          ),
        ),
        // Dark/gold gradient overlay
        Container(
          height: 380 + statusBarHeight,
          width: double.infinity,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Colors.black.withOpacity(0.6),
                Colors.black.withOpacity(0.3),
                Colors.black.withOpacity(0.7),
              ],
            ),
          ),
        ),
        // Content
        Padding(
          padding: EdgeInsets.only(top: statusBarHeight),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header inside the Stack
              _buildHeaderTranslucent(context, auth),
              const SizedBox(height: 40),
              // Gold indicator
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFD4AF37).withOpacity(0.5)),
                  ),
                  child: Text(
                    'LUXURY PROPERTY RENTALS',
                    style: GoogleFonts.outfit(
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFFD4AF37),
                      letterSpacing: 1.5,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              // Explore your place to stay
              Text(
                'Explore your place\nto stay',
                textAlign: TextAlign.center,
                style: GoogleFonts.outfit(
                  fontSize: 34,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  height: 1.2,
                  shadows: [
                    Shadow(
                      color: Colors.black.withOpacity(0.3),
                      offset: const Offset(0, 2),
                      blurRadius: 4,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 30),
              // Search capsule overlay
              _buildSearchCapsule(context),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildHeaderTranslucent(BuildContext context, AuthProvider auth) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Brand Logo & Text
          Text(
            'X-Space360.in',
            style: GoogleFonts.outfit(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: Colors.white,
              letterSpacing: -0.5,
            ),
          ),
          // Action Buttons
          Row(
            children: [
              auth.isAuthenticated
                  ? TextButton(
                      onPressed: () {
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(builder: (context) => const AppShell()),
                        );
                      },
                      child: Text(
                        'Dashboard',
                        style: GoogleFonts.manrope(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFFD4AF37),
                        ),
                      ),
                    )
                  : Row(
                      children: [
                        TextButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (context) => const LoginScreen()),
                            );
                          },
                          child: Text(
                            'Sign In',
                            style: GoogleFonts.manrope(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        ElevatedButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (context) => const LoginScreen()),
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: Text(
                            'Get Started',
                            style: GoogleFonts.manrope(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
            ],
          ),
        ],
      ),
    );
  }

  void _showSearchBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return const _SearchBottomSheet();
      },
    );
  }

  // --- SEARCH CAPSULE ---
  Widget _buildSearchCapsule(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20.0),
      child: GestureDetector(
        onTap: () {
          _showSearchBottomSheet(context);
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: const Color(0xFFE5E5DF)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 15,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Row(
            children: [
              const Icon(Icons.search, color: AppTheme.primary, size: 22),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Where to next?',
                      style: GoogleFonts.outfit(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        color: AppTheme.charcoal,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Search destinations...',
                      style: GoogleFonts.manrope(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.charcoalMuted,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const CircleAvatar(
                radius: 20,
                backgroundColor: AppTheme.primary,
                child: Icon(Icons.arrow_forward_ios, size: 14, color: Colors.white),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --- CATEGORY QUICK LINKS ---
  Widget _buildCategoryQuickLinks(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _buildCircularCategoryItem(context, 'RESIDENTIAL', 'Resort Villa', Icons.hotel_outlined, 'residential'),
        _buildCircularCategoryItem(context, 'COMMERCIAL', 'Office & Coworking', Icons.business_outlined, 'commercial'),
        _buildCircularCategoryItem(context, 'EVENTS', 'Hall & Garden', Icons.park_outlined, 'event_venue'),
      ],
    );
  }

  Widget _buildCircularCategoryItem(BuildContext context, String label, String subtitle, IconData icon, String categoryValue) {
    return GestureDetector(
      onTap: () {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => AppShell(
              initialIndex: 0,
              initialCategory: categoryValue,
            ),
          ),
        );
      },
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFFD4AF37), width: 1.5), // Gold border
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Icon(icon, color: AppTheme.primary, size: 24),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: GoogleFonts.outfit(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              color: AppTheme.charcoal,
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: GoogleFonts.manrope(
              fontSize: 9,
              fontWeight: FontWeight.bold,
              color: AppTheme.charcoalMuted,
            ),
          ),
        ],
      ),
    );
  }

  // --- COLLECTION SECTION ---
  Widget _buildCollectionSection(
    BuildContext context, {
    required String title,
    required String subtitle,
    required List<dynamic> properties,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.charcoal,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: GoogleFonts.manrope(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.charcoalMuted,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 260,
          child: properties.isEmpty
              ? Container(
                  margin: const EdgeInsets.symmetric(horizontal: 20.0),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.stone),
                  ),
                  child: Center(
                    child: Text(
                      'No verified listings in this collection.',
                      style: GoogleFonts.manrope(
                        fontSize: 12,
                        color: AppTheme.charcoalMuted,
                      ),
                    ),
                  ),
                )
              : ListView.builder(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.only(left: 20.0, right: 8.0),
                  itemCount: properties.length,
                  itemBuilder: (context, index) {
                    final prop = properties[index];
                    return GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => PropertyDetailScreen(propertyId: prop.propertyId),
                          ),
                        );
                      },
                      child: Container(
                        width: 200,
                        margin: const EdgeInsets.only(right: 14.0, bottom: 6.0),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppTheme.stone),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.03),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Expanded(
                              child: Stack(
                                children: [
                                  Positioned.fill(
                                    child: ClipRRect(
                                      borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                                      child: Image.network(
                                        prop.images.isNotEmpty
                                            ? prop.images[0]
                                            : 'https://images.unsplash.com/photo-1503174971373-b1f69850bded',
                                        fit: BoxFit.cover,
                                        errorBuilder: (context, error, stackTrace) => Container(
                                          color: AppTheme.stone,
                                          child: const Icon(Icons.holiday_village_outlined, color: AppTheme.primary, size: 24),
                                        ),
                                      ),
                                    ),
                                  ),
                                  // Rating Badge Top Left
                                  Positioned(
                                    top: 10,
                                    left: 10,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withOpacity(0.9),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(Icons.star, color: Color(0xFFD4AF37), size: 12),
                                          const SizedBox(width: 2),
                                          Text(
                                            '4.8',
                                            style: GoogleFonts.manrope(
                                              fontSize: 10,
                                              fontWeight: FontWeight.w800,
                                              color: AppTheme.charcoal,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                  // Action Buttons Top Right
                                  Positioned(
                                    top: 10,
                                    right: 10,
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(5),
                                          decoration: BoxDecoration(
                                            color: Colors.white.withOpacity(0.9),
                                            shape: BoxShape.circle,
                                          ),
                                          child: const Icon(Icons.share_outlined, color: AppTheme.charcoal, size: 14),
                                        ),
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.all(5),
                                          decoration: BoxDecoration(
                                            color: Colors.white.withOpacity(0.9),
                                            shape: BoxShape.circle,
                                          ),
                                          child: const Icon(Icons.favorite_border, color: AppTheme.charcoal, size: 14),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(12.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    prop.title,
                                    style: GoogleFonts.outfit(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: AppTheme.charcoal,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    prop.category.toLowerCase() == 'commercial' || prop.category.toLowerCase() == 'event_venue'
                                        ? '₹${prop.pricePerNight.toStringAsFixed(0)} / day'
                                        : '₹${prop.pricePerNight.toStringAsFixed(0)} / night',
                                    style: GoogleFonts.manrope(
                                      fontSize: 12,
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
                    );
                  },
                ),
        ),
      ],
    );
  }

  // --- READY TO HOST BANNER ---
  Widget _buildReadyToHostBanner(BuildContext context, AuthProvider auth) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20.0),
      child: Container(
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: const LinearGradient(
            colors: [Color(0xFF262626), Color(0xFF121212)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 15,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          children: [
            Text(
              'Ready to Host with Us?',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 22,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'An initialization process that transforms your premium space into a lifestyle placement.',
              textAlign: TextAlign.center,
              style: GoogleFonts.manrope(
                fontSize: 11,
                color: Colors.grey.shade400,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const LoginScreen()),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: Text(
                    'List Your Property',
                    style: GoogleFonts.manrope(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                OutlinedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const LoginScreen()),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.white24),
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: Text(
                    'Learn More',
                    style: GoogleFonts.manrope(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // --- LOVED BY GUESTS (TESTIMONIALS) ---
  Widget _buildTestimonialsSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Loved by Guests & Hosts',
                style: GoogleFonts.outfit(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.charcoal,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'Hear from our community members about their experience.',
                style: GoogleFonts.manrope(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.charcoalMuted,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 160,
          child: ListView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.only(left: 20.0, right: 8.0),
            children: [
              _buildTestimonialCard(
                'Mayur Patil',
                'Amazing stay! The property was highly clean and geofenced coordinates matched perfectly.',
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
              ),
              _buildTestimonialCard(
                'Vishwas More',
                'Excellent host panel. Payout calculations are seamless and direct bank settlement works instantly.',
                'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61',
              ),
              _buildTestimonialCard(
                'Mayur More',
                'Super simple booking. Verified badge gives absolute trust. Razorpay lock security is awesome.',
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTestimonialCard(String name, String review, String avatarUrl) {
    return Container(
      width: 240,
      margin: const EdgeInsets.only(right: 12.0, bottom: 4.0),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.stone),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: List.generate(
              5,
              (index) => const Icon(Icons.star, color: Color(0xFFD4AF37), size: 14),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: Text(
              review,
              style: GoogleFonts.manrope(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: AppTheme.charcoalLight,
                height: 1.3,
              ),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              CircleAvatar(
                radius: 12,
                backgroundImage: NetworkImage(avatarUrl),
              ),
              const SizedBox(width: 8),
              Text(
                name,
                style: GoogleFonts.outfit(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.charcoal,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --- LATEST FROM THE BLOG ---
  Widget _buildBlogSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'LATEST FROM THE BLOG',
                style: GoogleFonts.outfit(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFFD4AF37),
                  letterSpacing: 1.5,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Insights, trends, and hosting tips for your STR business.',
                style: GoogleFonts.manrope(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.charcoalMuted,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 290,
          child: ListView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.only(left: 20.0, right: 8.0),
            children: [
              _buildBlogCard(
                context,
                title: 'The Future of Short-Term Rentals in India',
                summary: 'Insights and projections on how guest expectations and micro-vacation trends are transforming properties.',
                imageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6',
                author: 'Aarav Sharma',
                date: 'June 12, 2026',
                readTime: '4 mins read',
                content: 'The short-term rental (STR) landscape in India is undergoing a massive transformation. Driven by rising disposable incomes, high-speed mobile connectivity, and a desire for experiential travel, guests are moving away from traditional hotels towards curated, private luxury villas.\n\nA key driver is the "workation" and "micro-vacation" trend, where urban professionals seek premium retreats within a 3-hour driving distance from major hubs like Mumbai, Pune, Delhi, and Bangalore. This shift demands that hosts invest in high-speed Wi-Fi, dedicated workstations, and wellness amenities.\n\nFurthermore, technology integration (such as automated self check-ins, geofenced access, and digital host panels) is no longer a luxury but an expectation. Property owners who align their listings with these trends stand to experience substantial growth in yields and occupancy rates.',
              ),
              _buildBlogCard(
                context,
                title: 'Design Guidelines for Your Property Yard',
                summary: 'Turn your outdoor space into an oasis that drives higher booking conversions and premium rates.',
                imageUrl: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf',
                author: 'Riya Mehta',
                date: 'June 08, 2026',
                readTime: '6 mins read',
                content: 'Your property\'s yard is the first visual impression guests receive when browsing online. Creating a beautifully designed yard is one of the most effective strategies to increase booking conversions and command premium night rates.\n\nStart by defining distinct functional zones. Establish a relaxation zone with weather-resistant luxury loungers, an entertainment zone with a fire pit or outdoor BBQ station, and a scenic zone utilizing native plants and soft lighting.\n\nLighting is crucial. Integrate warm LED path lights, fairy lights on trees, and soft uplighting on architectural features to create an enchanting evening atmosphere. A well-designed yard turns a standard property into a memorable lifestyle placement, prompting guests to share their experience on social media.',
              ),
              _buildBlogCard(
                context,
                title: 'Top 5 Outdoor Escapes Near Mumbai & Nashik',
                summary: 'Discover the most beautiful villas and properties offering premium escapes and resort-style living.',
                imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
                author: 'Kabir Malhotra',
                date: 'May 29, 2026',
                readTime: '5 mins read',
                content: 'Escaping the hustle of Mumbai and Nashik has never been more alluring. The region offers stunning landscapes from the mist-covered hills of Lonavala to the serene vineyards of Nashik. Here are the top five curated escapes that define luxury:\n\n1. The Goldenrich Glasshouse (Nashik): A stunning contemporary villa overlooking the backwaters, featuring floor-to-ceiling glass windows and a private infinity pool.\n2. Whispering Palms Estate (Karjat): A sprawling rustic villa set in a coconut grove, featuring open-air showers and private lawn access.\n3. Cliffside Retreat (Lonavala): Perched on a cliff, offering panoramic valley views and premium wooden deck areas.\n4. Stone Oasis (Igathpuri): Built with local stone, blending traditional architecture with modern amenities.\n5. Vineyard Villa (Nashik): Located inside a private vineyard, offering wine tasting sessions and private lounge decks.\n\nEach of these estates offers a curated placement that ensures privacy, high-end hospitality, and a perfect weekend escape.',
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBlogCard(
    BuildContext context, {
    required String title,
    required String summary,
    required String imageUrl,
    required String content,
    required String author,
    required String date,
    required String readTime,
  }) {
    return GestureDetector(
      onTap: () => _showBlogDetailModal(
        context,
        title: title,
        summary: summary,
        imageUrl: imageUrl,
        content: content,
        author: author,
        date: date,
        readTime: readTime,
      ),
      child: Container(
        width: 240,
        margin: const EdgeInsets.only(right: 14.0, bottom: 6.0),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.stone),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                child: Image.network(
                  imageUrl,
                  fit: BoxFit.cover,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.outfit(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.charcoal,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    summary,
                    style: GoogleFonts.manrope(
                      fontSize: 10,
                      color: AppTheme.charcoalLight,
                      height: 1.3,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  const Divider(height: 1, color: AppTheme.stone),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '$date · $readTime',
                        style: GoogleFonts.manrope(
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.charcoalMuted,
                        ),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'READ ARTICLE',
                            style: GoogleFonts.outfit(
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFFD4AF37),
                            ),
                          ),
                          const SizedBox(width: 2),
                          const Icon(
                            Icons.chevron_right,
                            size: 11,
                            color: Color(0xFFD4AF37),
                          ),
                        ],
                      ),
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

  void _showBlogDetailModal(
    BuildContext context, {
    required String title,
    required String summary,
    required String imageUrl,
    required String content,
    required String author,
    required String date,
    required String readTime,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.85,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  margin: const EdgeInsets.symmetric(vertical: 12),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppTheme.stone,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'EDITORIAL JOURNAL',
                      style: GoogleFonts.outfit(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFFD4AF37),
                        letterSpacing: 1.5,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: AppTheme.charcoal, size: 20),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 8.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        title,
                        style: GoogleFonts.outfit(
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                          color: AppTheme.charcoal,
                          height: 1.2,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 18,
                            backgroundColor: AppTheme.stone,
                            child: Text(
                              author.substring(0, 1),
                              style: GoogleFonts.outfit(
                                fontWeight: FontWeight.bold,
                                color: AppTheme.charcoal,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'By $author',
                                style: GoogleFonts.manrope(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.charcoal,
                                ),
                              ),
                              Text(
                                '$date · $readTime',
                                style: GoogleFonts.manrope(
                                  fontSize: 10,
                                  color: AppTheme.charcoalMuted,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Image.network(
                          imageUrl,
                          height: 200,
                          width: double.infinity,
                          fit: BoxFit.cover,
                        ),
                      ),
                      const SizedBox(height: 24),
                      RichText(
                        text: TextSpan(
                          children: [
                            TextSpan(
                              text: content.substring(0, 1),
                              style: GoogleFonts.outfit(
                                fontSize: 44,
                                fontWeight: FontWeight.w900,
                                color: const Color(0xFFD4AF37),
                                height: 0.8,
                              ),
                            ),
                            TextSpan(
                              text: content.substring(1),
                              style: GoogleFonts.manrope(
                                fontSize: 13,
                                color: AppTheme.charcoal,
                                height: 1.6,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // --- FOOTER WIDGET ---
  Widget _buildFooter(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 32.0),
      child: Column(
        children: [
          Text(
            'X-Space360.in',
            style: GoogleFonts.outfit(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Redefining short-term rentals in India through curation, technology, and superior service.',
            textAlign: TextAlign.center,
            style: GoogleFonts.manrope(
              fontSize: 11,
              color: AppTheme.charcoalMuted,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 24),
          const Divider(color: AppTheme.stone),
          const SizedBox(height: 16),
          Text(
            '© 2026 · All Rights Reserved · X-Space360.in',
            style: GoogleFonts.manrope(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: AppTheme.charcoalMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchBottomSheet extends StatefulWidget {
  const _SearchBottomSheet();

  @override
  State<_SearchBottomSheet> createState() => _SearchBottomSheetState();
}

class _SearchBottomSheetState extends State<_SearchBottomSheet> {
  final TextEditingController _cityController = TextEditingController();
  DateTimeRange? _selectedDateRange;
  int _guests = 1;

  final List<String> _popularCities = [
    'Goa',
    'Mumbai',
    'Nashik',
    'Udaipur',
    'Manali',
    'Pune',
  ];

  @override
  void dispose() {
    _cityController.dispose();
    super.dispose();
  }

  Future<void> _selectDates(BuildContext context) async {
    final DateTimeRange? picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      initialDateRange: _selectedDateRange,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppTheme.primary,
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: AppTheme.charcoal,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _selectedDateRange = picked;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Handle bar
              Align(
                alignment: Alignment.center,
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Text(
                'Search stays',
                style: GoogleFonts.outfit(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.charcoal,
                ),
              ),
              const SizedBox(height: 20),

              // Location Input
              Text(
                'WHERE TO?',
                style: GoogleFonts.outfit(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.charcoalMuted,
                  letterSpacing: 1.0,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _cityController,
                style: GoogleFonts.manrope(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.charcoal,
                ),
                decoration: InputDecoration(
                  hintText: 'Search destinations',
                  prefixIcon: const Icon(Icons.location_on_outlined, color: AppTheme.primary),
                  contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey[200]!),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey[200]!),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppTheme.primary, width: 1.5),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Popular city chips
              SizedBox(
                height: 38,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _popularCities.length,
                  itemBuilder: (context, index) {
                    final city = _popularCities[index];
                    return Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: ActionChip(
                        label: Text(city),
                        labelStyle: GoogleFonts.manrope(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: _cityController.text == city ? Colors.white : AppTheme.charcoal,
                        ),
                        backgroundColor: _cityController.text == city ? AppTheme.primary : Colors.grey[100],
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(18),
                          side: const BorderSide(color: Colors.transparent),
                        ),
                        onPressed: () {
                          setState(() {
                            _cityController.text = city;
                          });
                        },
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 24),

              // Date Selection
              Text(
                'WHEN?',
                style: GoogleFonts.outfit(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.charcoalMuted,
                  letterSpacing: 1.0,
                ),
              ),
              const SizedBox(height: 8),
              InkWell(
                onTap: () => _selectDates(context),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey[200]!),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_today_outlined, color: AppTheme.primary, size: 20),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _selectedDateRange == null
                              ? 'Select dates'
                              : '${DateFormat('dd MMM').format(_selectedDateRange!.start)} - ${DateFormat('dd MMM').format(_selectedDateRange!.end)}',
                          style: GoogleFonts.manrope(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: _selectedDateRange == null ? AppTheme.charcoalMuted : AppTheme.charcoal,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Guest selection
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'WHO?',
                        style: GoogleFonts.outfit(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: AppTheme.charcoalMuted,
                          letterSpacing: 1.0,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Number of Guests',
                        style: GoogleFonts.manrope(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.charcoal,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.remove_circle_outline, color: AppTheme.primary, size: 28),
                        onPressed: _guests > 1
                            ? () {
                                setState(() {
                                  _guests--;
                                });
                              }
                            : null,
                      ),
                      Text(
                        '$_guests',
                        style: GoogleFonts.manrope(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.charcoal,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.add_circle_outline, color: AppTheme.primary, size: 28),
                        onPressed: () {
                          setState(() {
                            _guests++;
                          });
                        },
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 32),

              // Search Button
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(context); // close bottom sheet
                  Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(
                      builder: (context) => AppShell(
                        initialIndex: 0,
                        initialSearchCity: _cityController.text.trim(),
                        initialSearchGuests: _guests,
                      ),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: Text(
                  'Search properties',
                  style: GoogleFonts.manrope(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
