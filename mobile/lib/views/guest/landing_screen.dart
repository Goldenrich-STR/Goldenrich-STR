import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
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
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. HEADER SECTION
              _buildHeader(context, auth),

              // 2. HERO TYPOGRAPHY & HERO CARD (Row/Column based on size, clean mobile layout)
              _buildHeroSection(context),

              const SizedBox(height: 24),

              // 3. SEARCH CAPSULE
              _buildSearchCapsule(context),

              const SizedBox(height: 32),

              // 4. CATEGORY CIRCULAR BUTTONS
              _buildCategoryQuickLinks(context),

              const SizedBox(height: 40),

              // 5. FEATURED COLLECTIONS
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
                properties: commercialProps,
              ),

              const SizedBox(height: 32),

              // C. Events & Functions
              _buildCollectionSection(
                context,
                title: 'EVENTS & FUNCTIONS',
                subtitle: 'Banquet halls, rooftops, and celebration venues.',
                properties: eventProps,
              ),

              const SizedBox(height: 48),

              // 6. READY TO HOST BANNER
              _buildReadyToHostBanner(context, auth),

              const SizedBox(height: 48),

              // 7. LOVED BY GUESTS (TESTIMONIALS)
              _buildTestimonialsSection(context),

              const SizedBox(height: 48),

              // 8. LATEST FROM THE BLOG
              _buildBlogSection(context),

              const SizedBox(height: 48),

              // 9. FOOTER
              _buildFooter(context),
            ],
          ),
        ),
      ),
    );
  }

  // --- HEADER WIDGET ---
  Widget _buildHeader(BuildContext context, AuthProvider auth) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Brand Logo & Text
          Row(
            children: [
              Image.asset(
                'assets/images/logo.png',
                width: 32,
                height: 32,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) => const Icon(
                  Icons.holiday_village_outlined,
                  color: AppTheme.primary,
                  size: 28,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'X-SPACE360',
                style: GoogleFonts.outfit(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.charcoal,
                  letterSpacing: -0.5,
                ),
              ),
            ],
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
                          color: AppTheme.primary,
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
                              color: AppTheme.charcoal,
                            ),
                          ),
                        ),
                        const SizedBox(width: 4),
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

  // --- HERO SECTION ---
  Widget _buildHeroSection(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Rich Typography centered
          RichText(
            textAlign: TextAlign.center,
            text: TextSpan(
              style: GoogleFonts.outfit(
                fontSize: 32,
                fontWeight: FontWeight.w900,
                color: AppTheme.charcoal,
                height: 1.2,
              ),
              children: [
                const TextSpan(text: 'Elevated '),
                TextSpan(
                  text: 'Living',
                  style: GoogleFonts.outfit(
                    color: AppTheme.primary,
                    fontStyle: FontStyle.italic,
                  ),
                ),
                const TextSpan(text: ' &\nWorking Spaces.'),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Curated residential, commercial, and event space plans for short-term, medium-term and long-term renting.',
            textAlign: TextAlign.center,
            style: GoogleFonts.manrope(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: AppTheme.charcoalLight,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 24),
          // Hero Image Card
          Container(
            height: 240,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              image: const DecorationImage(
                image: NetworkImage('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9'),
                fit: BoxFit.cover,
              ),
            ),
            child: Stack(
              children: [
                Positioned(
                  bottom: 16,
                  left: 16,
                  right: 16,
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.9),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.verified, color: Colors.green, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Nashik, Maharashtra',
                                style: GoogleFonts.outfit(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.charcoal,
                                ),
                              ),
                              Text(
                                'Elite Stay · Top-rated, physically verified space.',
                                style: GoogleFonts.manrope(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
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
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- SEARCH CAPSULE ---
  Widget _buildSearchCapsule(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20.0),
      child: GestureDetector(
        onTap: () {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const AppShell()),
          );
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
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _buildCircularCategoryItem(context, 'Residential', Icons.home_outlined),
        const SizedBox(width: 24),
        _buildCircularCategoryItem(context, 'Commercial', Icons.business_outlined),
        const SizedBox(width: 24),
        _buildCircularCategoryItem(context, 'Events', Icons.celebration_outlined),
      ],
    );
  }

  Widget _buildCircularCategoryItem(BuildContext context, String label, IconData icon) {
    return Column(
      children: [
        Container(
          width: 54,
          height: 54,
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            border: Border.all(color: const Color(0xFFD4AF37), width: 1.5), // Gold border
          ),
          child: Center(
            child: Icon(icon, color: AppTheme.primary, size: 24),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: GoogleFonts.manrope(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: AppTheme.charcoal,
          ),
        ),
      ],
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
          height: 240,
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
                        width: 180,
                        margin: const EdgeInsets.only(right: 12.0, bottom: 4.0),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppTheme.stone),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.01),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
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
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: const Color(0xFF1E1E1E), // Deep Charcoal
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          children: [
            RichText(
              text: TextSpan(
                style: GoogleFonts.outfit(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                ),
                children: [
                  const TextSpan(text: 'Ready to '),
                  TextSpan(
                    text: 'Host',
                    style: GoogleFonts.outfit(
                      color: AppTheme.primary,
                      decoration: TextDecoration.underline,
                      decorationColor: AppTheme.secondary,
                      decorationThickness: 2,
                    ),
                  ),
                  const TextSpan(text: ' with Us?'),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              "Join India's most exclusive short-term rental network and turn your premium space into a high-yielding asset.",
              textAlign: TextAlign.center,
              style: GoogleFonts.manrope(
                fontSize: 11,
                color: Colors.grey.shade400,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const LoginScreen()),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: Text(
                'List Your Property',
                style: GoogleFonts.manrope(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
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
          child: Text(
            'Latest from the Blog',
            style: GoogleFonts.outfit(
              fontSize: 20,
              fontWeight: FontWeight.w900,
              color: AppTheme.charcoal,
            ),
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 220,
          child: ListView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.only(left: 20.0, right: 8.0),
            children: [
              _buildBlogCard(
                'Maximizing Host Revenue',
                'Learn how to set optimal hourly price points based on seasonal regional demands.',
                'https://images.unsplash.com/photo-1560518883-ce09059eeffa',
              ),
              _buildBlogCard(
                'Designing Spaces for Rent',
                'Simple aesthetic changes to increase click conversions on search listings.',
                'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab',
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBlogCard(String title, String summary, String imageUrl) {
    return Container(
      width: 220,
      margin: const EdgeInsets.only(right: 12.0, bottom: 4.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.stone),
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
                const SizedBox(height: 2),
                Text(
                  summary,
                  style: GoogleFonts.manrope(
                    fontSize: 10,
                    color: AppTheme.charcoalMuted,
                    height: 1.2,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- FOOTER WIDGET ---
  Widget _buildFooter(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 32.0),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Image.asset(
                'assets/images/logo.png',
                width: 24,
                height: 24,
                fit: BoxFit.contain,
              ),
              const SizedBox(width: 8),
              Text(
                'X-SPACE360',
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.charcoal,
                ),
              ),
            ],
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
            '© 2026 · All Rights Reserved · Goldenrich STR',
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
