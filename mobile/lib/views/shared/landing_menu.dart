import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

const _ink = Color(0xFF1B1924);

typedef BrowseCallback = void Function({
  String? category,
  String? city,
  String? propertyType,
  String? searchQuery,
  double? minPrice,
});

class _ExploreItem {
  final String label;
  final String? category;
  final String? propertyType;
  final String? city;
  final double? minPrice;
  final String? query;

  const _ExploreItem(this.label,
      {this.category, this.propertyType, this.city, this.minPrice, this.query});
}

/// Same Explore tabs as the website's mobile menu. Entries that are SEO pages on
/// the website open the matching city + category search here.
const _exploreTabs = <String, List<_ExploreItem>>{
  'Nashik Destinations': [
    _ExploreItem('Villas in Nashik',
        category: 'residential', propertyType: 'villa', city: 'Nashik'),
    _ExploreItem('Luxury Villas in Nashik',
        category: 'residential',
        propertyType: 'villa',
        city: 'Nashik',
        minPrice: 50000),
    _ExploreItem('Homestays in Nashik', category: 'residential', city: 'Nashik'),
    _ExploreItem('Apartments in Nashik',
        category: 'residential', propertyType: 'apartment', city: 'Nashik'),
    _ExploreItem('Farmhouses in Nashik',
        category: 'residential', propertyType: 'farmhouse', city: 'Nashik'),
    _ExploreItem('Wedding Venues in Nashik',
        category: 'event_venue', city: 'Nashik'),
    _ExploreItem('Banquet Halls in Nashik',
        category: 'event_venue', city: 'Nashik'),
    _ExploreItem('Event Lawns in Nashik', category: 'event_venue', city: 'Nashik'),
    _ExploreItem('Corporate Events in Nashik',
        category: 'event_venue', city: 'Nashik'),
    _ExploreItem('Workspaces in Nashik', category: 'commercial', city: 'Nashik'),
    _ExploreItem('Private Offices in Nashik',
        category: 'commercial', city: 'Nashik'),
    _ExploreItem('Team Spaces in Nashik', category: 'commercial', city: 'Nashik'),
    _ExploreItem('Co-working in Nashik', category: 'commercial', city: 'Nashik'),
    _ExploreItem('Meeting Rooms in Nashik',
        category: 'commercial', city: 'Nashik'),
  ],
  'Trimbakeshwar Stays': [
    _ExploreItem('Villas in Trimbak',
        category: 'residential', propertyType: 'villa', city: 'Trimbakeshwar'),
    _ExploreItem('Pool Villas in Trimbak',
        category: 'residential', propertyType: 'villa', city: 'Trimbakeshwar'),
    _ExploreItem('Family Stays in Trimbak',
        category: 'residential', city: 'Trimbakeshwar'),
    _ExploreItem('Apartments in Trimbak',
        category: 'residential', propertyType: 'apartment', city: 'Trimbakeshwar'),
    _ExploreItem('Resorts & Lawns in Trimbak',
        category: 'event_venue', city: 'Trimbakeshwar'),
    _ExploreItem('Office Suites in Trimbak',
        category: 'commercial', city: 'Trimbakeshwar'),
  ],
  'Igatpuri & Bhandardara': [
    _ExploreItem('Villas in Igatpuri',
        category: 'residential', propertyType: 'villa', city: 'Igatpuri'),
    _ExploreItem('Weekend Villas in Igatpuri',
        category: 'residential', propertyType: 'villa', city: 'Igatpuri'),
    _ExploreItem('Homestays in Igatpuri',
        category: 'residential', city: 'Igatpuri'),
    _ExploreItem('Holiday Homes in Igatpuri',
        category: 'residential', city: 'Igatpuri'),
    _ExploreItem('Celebration Venues in Igatpuri',
        category: 'event_venue', city: 'Igatpuri'),
    _ExploreItem('Wedding Venues in Igatpuri',
        category: 'event_venue', city: 'Igatpuri'),
    _ExploreItem('Corporate Spaces in Igatpuri',
        category: 'commercial', city: 'Igatpuri'),
    _ExploreItem('Villas in Bhandardara',
        category: 'residential', propertyType: 'villa', city: 'Bhandardara'),
    _ExploreItem('Scenic Villas in Bhandardara',
        category: 'residential', propertyType: 'villa', city: 'Bhandardara'),
    _ExploreItem('Nature Stays in Bhandardara',
        category: 'residential', city: 'Bhandardara'),
    _ExploreItem('Resorts in Bhandardara',
        category: 'event_venue', city: 'Bhandardara'),
  ],
  'Places & Attractions': [
    _ExploreItem('Sula Vineyards', query: 'Sula Vineyards'),
    _ExploreItem('Trimbakeshwar', city: 'Trimbakeshwar'),
    _ExploreItem('Pandav Leni', query: 'Pandav Leni'),
    _ExploreItem('Gangapur Dam', query: 'Gangapur Dam'),
    _ExploreItem('Anjaneri', query: 'Anjaneri'),
    _ExploreItem('Harihar Fort', query: 'Harihar Fort'),
    _ExploreItem('Bhandardara', city: 'Bhandardara'),
    _ExploreItem('Igatpuri', city: 'Igatpuri'),
  ],
};

const _propertyTypes = <_ExploreItem>[
  _ExploreItem('Villas', category: 'residential', propertyType: 'villa'),
  _ExploreItem('Homestays', category: 'residential'),
  _ExploreItem('Apartments', category: 'residential', propertyType: 'apartment'),
  _ExploreItem('Farmhouses', category: 'residential', propertyType: 'farmhouse'),
  _ExploreItem('Commercial Spaces', category: 'commercial'),
  _ExploreItem('Event Venues', category: 'event_venue'),
];

/// The website's hamburger menu for phones, as a drawer from the right:
/// Discover, List your Property, Explore (tabs), Property Types, Download App,
/// My Bookings, Wishlist and Help & Support.
Future<void> showLandingMenu(
  BuildContext context, {
  required String? userName,
  required BrowseCallback onBrowse,
  required VoidCallback onListProperty,
  required VoidCallback onSignIn,
  required VoidCallback onBookings,
  required VoidCallback onWishlist,
  required VoidCallback onSupport,
  required VoidCallback onDownload,
}) {
  return showGeneralDialog<void>(
    context: context,
    barrierDismissible: true,
    barrierLabel: 'Menu',
    barrierColor: Colors.black.withValues(alpha: 0.45),
    transitionDuration: const Duration(milliseconds: 220),
    pageBuilder: (ctx, _, __) => Align(
      alignment: Alignment.centerRight,
      child: Material(
        color: Colors.white,
        child: SizedBox(
          width: (MediaQuery.sizeOf(ctx).width * 0.86).clamp(0, 360),
          height: double.infinity,
          child: _MenuBody(
            userName: userName,
            onBrowse: onBrowse,
            onListProperty: onListProperty,
            onSignIn: onSignIn,
            onBookings: onBookings,
            onWishlist: onWishlist,
            onSupport: onSupport,
            onDownload: onDownload,
          ),
        ),
      ),
    ),
    transitionBuilder: (ctx, anim, _, child) => SlideTransition(
      position: Tween(begin: const Offset(1, 0), end: Offset.zero)
          .animate(CurvedAnimation(parent: anim, curve: Curves.easeOutCubic)),
      child: child,
    ),
  );
}

class _MenuBody extends StatefulWidget {
  final String? userName;
  final BrowseCallback onBrowse;
  final VoidCallback onListProperty,
      onSignIn,
      onBookings,
      onWishlist,
      onSupport,
      onDownload;

  const _MenuBody({
    required this.userName,
    required this.onBrowse,
    required this.onListProperty,
    required this.onSignIn,
    required this.onBookings,
    required this.onWishlist,
    required this.onSupport,
    required this.onDownload,
  });

  @override
  State<_MenuBody> createState() => _MenuBodyState();
}

class _MenuBodyState extends State<_MenuBody> {
  bool _exploreOpen = false;
  bool _typesOpen = false;
  String _tab = _exploreTabs.keys.first;

  void _go(_ExploreItem i) {
    Navigator.pop(context);
    widget.onBrowse(
      category: i.category,
      city: i.city,
      propertyType: i.propertyType,
      searchQuery: i.query,
      minPrice: i.minPrice,
    );
  }

  Widget _row(IconData icon, String label,
      {VoidCallback? onTap, Widget? trailing, bool pop = true}) {
    return InkWell(
      onTap: () {
        if (pop) Navigator.pop(context);
        onTap?.call();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 15),
        decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: Color(0xFFF1F1F1)))),
        child: Row(
          children: [
            Icon(icon, size: 20, color: _ink),
            const SizedBox(width: 14),
            Expanded(
              child: Text(label,
                  style: GoogleFonts.inter(
                      fontSize: 16, fontWeight: FontWeight.w500, color: _ink)),
            ),
            if (trailing != null) trailing,
          ],
        ),
      ),
    );
  }

  Widget _chevron(bool open) => AnimatedRotation(
        turns: open ? 0.5 : 0,
        duration: const Duration(milliseconds: 180),
        child: const Icon(LucideIcons.chevronDown,
            size: 20, color: Color(0xFF6B7280)),
      );

  @override
  Widget build(BuildContext context) {
    final items = _exploreTabs[_tab]!;
    return SafeArea(
      child: Column(
        children: [
          Container(
            width: double.infinity,
            color: const Color(0xFF1F1F1F),
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Align(
                  alignment: Alignment.centerRight,
                  child: GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: const Icon(LucideIcons.x, color: Colors.white70),
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: const BoxDecoration(
                          color: Colors.white, shape: BoxShape.circle),
                      child: const Icon(LucideIcons.user, color: _ink),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: widget.userName == null
                          ? GestureDetector(
                              onTap: () {
                                Navigator.pop(context);
                                widget.onSignIn();
                              },
                              child: Text('Sign in / Sign up',
                                  style: GoogleFonts.inter(
                                      color: Colors.white,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600)),
                            )
                          : Text(widget.userName!,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.inter(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              children: [
                _row(LucideIcons.compass, 'Discover',
                    onTap: () => widget.onBrowse()),
                _row(LucideIcons.building2, 'List your Property',
                    onTap: widget.onListProperty),
                _row(LucideIcons.mapPin, 'Explore',
                    pop: false,
                    trailing: _chevron(_exploreOpen),
                    onTap: () => setState(() {
                          _exploreOpen = !_exploreOpen;
                          if (_exploreOpen) _typesOpen = false;
                        })),
                if (_exploreOpen)
                  Container(
                    margin: const EdgeInsets.only(top: 6, bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFAF7F2),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFEEE6D8)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: [
                              for (final t in _exploreTabs.keys)
                                GestureDetector(
                                  onTap: () => setState(() => _tab = t),
                                  child: Container(
                                    margin: const EdgeInsets.only(right: 18),
                                    padding:
                                        const EdgeInsets.only(bottom: 8),
                                    decoration: BoxDecoration(
                                      border: Border(
                                        bottom: BorderSide(
                                          color: _tab == t
                                              ? _ink
                                              : Colors.transparent,
                                          width: 2,
                                        ),
                                      ),
                                    ),
                                    child: Text(t,
                                        style: GoogleFonts.inter(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w600,
                                            color: _tab == t
                                                ? _ink
                                                : const Color(0xFF6B7280))),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        const Divider(height: 1, color: Color(0xFFE9DFCF)),
                        ConstrainedBox(
                          constraints: const BoxConstraints(maxHeight: 300),
                          child: ListView(
                            shrinkWrap: true,
                            padding: const EdgeInsets.only(top: 8),
                            children: [
                              for (final i in items)
                                InkWell(
                                  onTap: () => _go(i),
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 9),
                                    child: Text(i.label,
                                        style: GoogleFonts.inter(
                                            fontSize: 15, color: _ink)),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                _row(LucideIcons.house, 'Property Types',
                    pop: false,
                    trailing: _chevron(_typesOpen),
                    onTap: () => setState(() {
                          _typesOpen = !_typesOpen;
                          if (_typesOpen) _exploreOpen = false;
                        })),
                if (_typesOpen)
                  Padding(
                    padding: const EdgeInsets.only(left: 34, bottom: 8),
                    child: Column(
                      children: [
                        for (final t in _propertyTypes)
                          InkWell(
                            onTap: () => _go(t),
                            child: Container(
                              width: double.infinity,
                              padding:
                                  const EdgeInsets.symmetric(vertical: 11),
                              child: Text(t.label,
                                  style: GoogleFonts.inter(
                                      fontSize: 15, color: _ink)),
                            ),
                          ),
                      ],
                    ),
                  ),
                _row(LucideIcons.smartphone, 'Download App',
                    onTap: widget.onDownload,
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFF4E6D),
                        borderRadius: BorderRadius.circular(2),
                      ),
                      child: Text('APP',
                          style: GoogleFonts.inter(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w800)),
                    )),
                _row(LucideIcons.calendar, 'My Bookings',
                    onTap: widget.onBookings),
                _row(LucideIcons.heart, 'Wishlist', onTap: widget.onWishlist),
                _row(LucideIcons.headphones, 'Help & Support',
                    onTap: widget.onSupport),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
