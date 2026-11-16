import 'dart:ui' show ImageFilter;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../providers/auth_provider.dart';

import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../config.dart';
import '../../models/property_model.dart';
import '../../services/api_service.dart';
import '../shared/web_property_card.dart';
import '../../utils/currency_formatter.dart';
import '../shared/app_logo.dart';
import '../shared/property_image.dart';

const _ink = Color(0xFF1B1924);
const _muted = Color(0xFF6B7280);
const _blue = Color(0xFF2563EB);

TextStyle _serif(double size) => GoogleFonts.playfairDisplay(
    fontSize: size, fontWeight: FontWeight.w600, color: _ink);

String _titleCase(String raw) {
  final text = raw.replaceAll('custom_', '').replaceAll('_', ' ').trim();
  return text
      .split(' ')
      .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
      .join(' ');
}

const _amenityLabels = {
  'wifi': 'WiFi',
  'ac': 'Air Conditioning',
  'tv': 'Smart TV',
  'av_system': 'AV System',
  'live_music': 'Live Music Setup',
  'fireplace': 'Indoor Fireplace',
  'food_court': 'Food Court / Dining Area',
  'parking': 'Parking Space',
  'kitchen': 'Fully-Equipped Kitchen',
  'birthday_celebration': 'Birthday & Event Setup',
  'indoor_games': 'Indoor Games',
  'gym': 'Fitness Center/Gym',
  'washing_machine': 'Washing Machine',
  'heating': 'Heating System',
  'pool': 'Swimming Pool',
};

String amenityLabel(String key) =>
    _amenityLabels[key.toLowerCase()] ?? _titleCase(key);

IconData amenityIcon(String key) {
  final k = key.toLowerCase();
  if (k.startsWith('custom_')) return LucideIcons.circleCheck;
  if (k.contains('wifi')) return LucideIcons.wifi;
  if (k == 'ac' || k.contains('air')) return LucideIcons.wind;
  if (k.contains('tv')) return LucideIcons.tv;
  if (k.contains('music') || k.contains('av')) return LucideIcons.mic;
  if (k.contains('fire') || k.contains('heat')) return LucideIcons.flame;
  if (k.contains('food') || k.contains('kitchen') || k.contains('dining')) {
    return LucideIcons.utensils;
  }
  if (k.contains('park')) return LucideIcons.car;
  if (k.contains('game') || k.contains('birthday') || k.contains('event')) {
    return LucideIcons.sparkles;
  }
  if (k.contains('gym') || k.contains('fitness')) return LucideIcons.dumbbell;
  if (k.contains('wash')) return LucideIcons.washingMachine;
  if (k.contains('pool')) return LucideIcons.waves;
  if (k.contains('cctv') || k.contains('secur')) return LucideIcons.shieldCheck;
  return LucideIcons.circleCheck;
}

class PropertyWebBody extends StatefulWidget {
  final PropertyModel property;
  final DateTime? checkIn;
  final DateTime? checkOut;
  final bool wishlisted;
  final VoidCallback onBack;
  final VoidCallback onShare;
  final VoidCallback onWishlist;
  final void Function(List<String> images, int index) onOpenGallery;
  final void Function(PropertyUnit unit) onSelectUnit;
  final String? selectedUnitId;
  final List<Widget> trailingSections;
  final List<PropertyModel> similar;
  final void Function(PropertyModel)? onOpenSimilar;

  const PropertyWebBody({
    this.similar = const [],
    this.onOpenSimilar,
    super.key,
    required this.property,
    required this.checkIn,
    required this.checkOut,
    required this.wishlisted,
    required this.onBack,
    required this.onShare,
    required this.onWishlist,
    required this.onOpenGallery,
    required this.onSelectUnit,
    required this.selectedUnitId,
    this.trailingSections = const [],
  });

  @override
  State<PropertyWebBody> createState() => PropertyWebBodyState();
}

class PropertyWebBodyState extends State<PropertyWebBody> {
  bool _unitNotice = false;

  /// Like the website: asks the guest to pick a unit first and takes them to the list.
  void promptForUnit() {
    setState(() => _unitNotice = true);
    final ctx = _keys['Units']?.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(ctx,
          duration: const Duration(milliseconds: 350), alignment: 0.02);
    }
  }

  final Map<String, GlobalKey> _keys = <String, GlobalKey>{
    'Overview': GlobalKey(),
    'Units': GlobalKey(),
    'Refund Policy': GlobalKey(),
    'Reviews': GlobalKey(),
    'Amenities': GlobalKey(),
    'Meals': GlobalKey(),
  };
  String _tab = 'Overview';
  bool _descExpanded = false;
  Map<String, dynamic>? _availability;

  PropertyModel get p => widget.property;

  @override
  void initState() {
    super.initState();
    _loadAvailability();
  }

  @override
  void didUpdateWidget(covariant PropertyWebBody old) {
    super.didUpdateWidget(old);
    if (old.checkIn != widget.checkIn || old.checkOut != widget.checkOut) {
      _loadAvailability();
    }
  }

  String _iso(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Future<void> _loadAvailability() async {
    if (p.units.isEmpty) return;
    try {
      final params = <String, dynamic>{};
      if (widget.checkIn != null && widget.checkOut != null) {
        params['check_in'] = _iso(widget.checkIn!);
        params['check_out'] = _iso(widget.checkOut!);
      }
      final res = await ApiService().dio.get(
          '/calendar/properties/${p.propertyId}/unit-availability',
          queryParameters: params);
      if (mounted && res.data is Map) {
        setState(() => _availability = Map<String, dynamic>.from(res.data));
      }
    } catch (_) {}
  }

  void _jump(String tab) {
    setState(() => _tab = tab);
    final ctx = _keys[tab]?.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(ctx,
          duration: const Duration(milliseconds: 350), alignment: 0.02);
    }
  }

  // ------------------------------------------------------------ pieces
  Widget _header() {
    return Container(
      padding: EdgeInsets.fromLTRB(
          6, MediaQuery.paddingOf(context).top + 6, 14, 8),
      color: Colors.white,
      child: Row(
        children: [
          IconButton(
            onPressed: widget.onBack,
            icon: const Icon(LucideIcons.arrowLeft, size: 22, color: _ink),
          ),
          const AppLogo(height: 28),
          const Spacer(),
        ],
      ),
    );
  }

  Widget _breadcrumb() {
    final cat = _titleCase(p.category);
    final type = _titleCase(p.propertyType);
    TextStyle link = GoogleFonts.inter(fontSize: 12, color: const Color(0xFF8A6100));
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
      child: Row(
        children: [
          Text('Home', style: link),
          const Icon(LucideIcons.chevronRight, size: 14, color: _muted),
          Text(cat, style: link),
          const Icon(LucideIcons.chevronRight, size: 14, color: _muted),
          Text(type, style: GoogleFonts.inter(fontSize: 12, color: _ink)),
        ],
      ),
    );
  }

  Widget _hero() {
    final images = p.images;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: SizedBox(
          height: 270,
          child: Stack(
            fit: StackFit.expand,
            children: [
              GestureDetector(
                onTap: images.isEmpty
                    ? null
                    : () => widget.onOpenGallery(images, 0),
                child: PropertyImage(
                  imageUrl: images.isEmpty ? null : images.first,
                  width: double.infinity,
                  height: 270,
                ),
              ),
              Positioned(
                left: 12,
                top: 12,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.95),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(_titleCase(p.propertyType),
                      style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: _ink)),
                ),
              ),
              Positioned(
                right: 12,
                top: 12,
                child: Row(
                  children: [
                    _roundBtn(LucideIcons.share2, widget.onShare),
                    const SizedBox(width: 8),
                    _roundBtn(LucideIcons.heart, widget.onWishlist,
                        active: widget.wishlisted),
                  ],
                ),
              ),
              if (images.length > 1)
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 14,
                  child: Center(
                    child: GestureDetector(
                      onTap: () => widget.onOpenGallery(images, 0),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 18, vertical: 11),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.85),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(LucideIcons.layoutGrid,
                                size: 15, color: Color(0xFF8A6100)),
                            const SizedBox(width: 8),
                            Text('SHOW ALL PHOTOS',
                                style: GoogleFonts.inter(
                                    fontSize: 12,
                                    letterSpacing: 0.6,
                                    fontWeight: FontWeight.w700,
                                    color: _ink)),
                          ],
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

  Widget _roundBtn(IconData icon, VoidCallback onTap, {bool active = false}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 38,
        height: 38,
        decoration: const BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
        ),
        child: Icon(icon,
            size: 17,
            color: active ? Colors.red : _ink,
            fill: active ? 1 : 0),
      ),
    );
  }

  Widget _tabs() {
    final names = [
      'Overview',
      if (p.units.isNotEmpty) 'Units',
      'Refund Policy',
      'Reviews',
      'Amenities',
      if (p.vegPrice != null || p.nonVegPrice != null || p.hasCook) 'Meals',
    ];
    return Container(
      margin: const EdgeInsets.only(top: 18),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFE5E5E5))),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(
          children: [
            for (final n in names)
              GestureDetector(
                onTap: () => _jump(n),
                child: Container(
                  margin: const EdgeInsets.only(right: 24),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    border: Border(
                      bottom: BorderSide(
                          width: 2,
                          color: _tab == n ? _ink : Colors.transparent),
                    ),
                  ),
                  child: Text(n,
                      style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight:
                              _tab == n ? FontWeight.w600 : FontWeight.w500,
                          color: _tab == n ? _ink : _muted)),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _titleBlock() {
    final address = [p.address, p.city, p.state]
        .where((e) => e.trim().isNotEmpty)
        .join(', ');
    final reviews = p.reviewCount ?? 0;
    return Padding(
      key: _keys['Overview'],
      padding: const EdgeInsets.fromLTRB(16, 26, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(p.title,
              style: GoogleFonts.playfairDisplay(
                  fontSize: 30,
                  height: 1.15,
                  fontWeight: FontWeight.w600,
                  color: _ink)),
          const SizedBox(height: 10),
          Text(address,
              style: GoogleFonts.inter(
                  fontSize: 14, height: 1.45, color: _muted)),
          if (reviews > 0 && (p.rating ?? 0) > 0) ...[
            const SizedBox(height: 6),
            GestureDetector(
              onTap: () => _jump('Reviews'),
              child: Text(
                  '${p.rating!.toStringAsFixed(1)} · $reviews ${reviews == 1 ? 'Review' : 'Reviews'}',
                  style: GoogleFonts.inter(fontSize: 14, color: _blue)),
            ),
          ],
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _factChip(LucideIcons.users,
                  'Up to ${p.maxGuests} ${p.participantLabel[0].toUpperCase()}${p.participantLabel.substring(1)}'),
              if (p.areaSqft > 0)
                _factChip(LucideIcons.layoutGrid, '${p.areaSqft.round()} sq.ft'),
              if (p.petFriendly) _factChip(LucideIcons.pawPrint, 'Pet Friendly'),
              if (p.hasCook ||
                  p.hasSelfCook ||
                  p.packages.isNotEmpty)
                _factChip(LucideIcons.utensilsCrossed, 'Meals Available'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _factChip(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F7FF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFCFE2FA)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 17, color: _ink),
          const SizedBox(width: 9),
          Text(text,
              style: GoogleFonts.inter(
                  fontSize: 14, fontWeight: FontWeight.w500, color: _ink)),
        ],
      ),
    );
  }

  Widget _amenityBadge(String key) {
    return Row(
      children: [
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            border: Border.all(color: const Color(0xFFD5D5D5)),
          ),
          child: Icon(amenityIcon(key), size: 19, color: _ink),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(amenityLabel(key),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(
                  fontSize: 13.5, fontWeight: FontWeight.w500, color: _ink)),
        ),
      ],
    );
  }

  void _showAllAmenities() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _SheetFrame(
        title: 'All amenities',
        child: GridView.count(
          crossAxisCount: 1,
          shrinkWrap: true,
          mainAxisSpacing: 14,
          childAspectRatio: 7,
          physics: const NeverScrollableScrollPhysics(),
          children: [for (final a in p.amenities) _amenityBadge(a)],
        ),
      ),
    );
  }

  Widget _amenityStrip() {
    if (p.amenities.isEmpty) return const SizedBox.shrink();
    final shown = p.amenities.take(5).toList();
    final more = p.amenities.length - shown.length;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 22, 16, 0),
      child: Wrap(
        spacing: 14,
        runSpacing: 14,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          for (final a in shown)
            SizedBox(
              width: 76,
              child: Column(
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFFD5D5D5)),
                    ),
                    child: Icon(amenityIcon(a), size: 20, color: _ink),
                  ),
                  const SizedBox(height: 6),
                  Text(amenityLabel(a),
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                          fontSize: 11.5, height: 1.2, color: _ink)),
                ],
              ),
            ),
          if (more > 0)
            GestureDetector(
              onTap: _showAllAmenities,
              child: Text('+$more Amenities',
                  style: GoogleFonts.inter(
                      fontSize: 14, fontWeight: FontWeight.w500, color: _blue)),
            ),
        ],
      ),
    );
  }

  Widget _hostCard() {
    final name = p.hostName.isEmpty ? 'your host' : p.hostName;
    final initials = name
        .split(' ')
        .where((e) => e.isNotEmpty)
        .take(2)
        .map((e) => e[0].toUpperCase())
        .join();
    final joined = p.hostJoined != null && p.hostJoined!.length >= 4
        ? 'Joined ${p.hostJoined!.substring(0, 4)}'
        : '';
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFE8F1FD),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: const Color(0xFFD81B60),
                child: Text(initials.isEmpty ? 'H' : initials,
                    style: GoogleFonts.inter(
                        fontSize: 20,
                        fontWeight: FontWeight.w500,
                        color: Colors.white)),
              ),
              Positioned(
                right: -2,
                bottom: -2,
                child: Container(
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F6B3F),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  child: const Icon(LucideIcons.shieldCheck,
                      size: 10, color: Colors.white),
                ),
              ),
            ],
          ),
          const SizedBox(width: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Hosted by $name',
                  style: GoogleFonts.inter(
                      fontSize: 17, fontWeight: FontWeight.w600, color: _ink)),
              if (joined.isNotEmpty)
                Text(joined,
                    style: GoogleFonts.inter(fontSize: 13, color: _muted)),
            ],
          ),
        ],
      ),
    );
  }

  // ------------------------------------------------------------ units
  static const _tierStyles = {
    'standard': [Color(0xFF9AA7B4), Color(0xFF6B7A89), Color(0xFF3F4B57)],
    'deluxe': [Color(0xFF5AA9F5), Color(0xFF2F6FD0), Color(0xFF1C4A94)],
    'premium': [Color(0xFFA78BFA), Color(0xFF7C3AED), Color(0xFF4C1D95)],
  };

  Widget _tierRibbon(String tier) {
    final c = _tierStyles[tier];
    if (c == null) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [c[0], c[1]],
        ),
        borderRadius: const BorderRadius.horizontal(right: Radius.circular(999)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(LucideIcons.badgeCheck, size: 10, color: Colors.white),
          const SizedBox(width: 3),
          Text(_titleCase(tier),
              style: GoogleFonts.inter(
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  color: Colors.white)),
        ],
      ),
    );
  }

  Widget _unitCard(PropertyUnit u) {
    final selected = widget.selectedUnitId == u.unitId;
    final booked = (_availability?['booked_unit_ids'] as List?)
            ?.contains(u.unitId) ??
        false;
    final details = [
      if (u.areaSqft != null && u.areaSqft! > 0) '${u.areaSqft!.round()} sq.ft',
      'Up to ${u.maxGuests} guests',
      if (u.bhkType.isNotEmpty) _titleCase(u.bhkType),
    ].join(' · ');
    return GestureDetector(
      onTap: () => widget.onSelectUnit(u),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 14),
            padding: const EdgeInsets.fromLTRB(14, 16, 14, 16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFFFBF1D6), Color(0xFFFCF9EF), Color(0xFFE1EFE6)],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                  color: selected ? _ink : const Color(0xFFD0D0D0),
                  width: selected ? 1.6 : 1),
            ),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.85),
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFFD0D0D0)),
                  ),
                  child: const Icon(LucideIcons.bedDouble, size: 19, color: _ink),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(u.name,
                          style: GoogleFonts.inter(
                              fontSize: 14.5,
                              height: 1.25,
                              fontWeight: FontWeight.w600,
                              color: _ink)),
                      const SizedBox(height: 4),
                      Text(details,
                          style: GoogleFonts.inter(
                              fontSize: 11.5, height: 1.3, color: _muted)),
                      if (booked)
                        Padding(
                          padding: const EdgeInsets.only(top: 3),
                          child: Text('Booked for these dates',
                              style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.red.shade600)),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(CurrencyFormatter.format(u.price),
                        style: GoogleFonts.inter(
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            color: _ink)),
                    Text('/ NIGHT',
                        style: GoogleFonts.inter(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.5,
                            color: _muted)),
                  ],
                ),
              ],
            ),
          ),
          if (u.tier.isNotEmpty)
            Positioned(left: -6, top: 4, child: _tierRibbon(u.tier)),
        ],
      ),
    );
  }

  void _showAllUnits() {
    var sort = 'low';
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => StatefulBuilder(
        builder: (context, setSheet) {
          final list = [...p.units]
            ..sort((a, b) =>
                sort == 'low' ? a.price.compareTo(b.price) : b.price.compareTo(a.price));
          return _SheetFrame(
            title: 'All units',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    for (final o in const [
                      ['low', 'Price: Low to High'],
                      ['high', 'Price: High to Low']
                    ])
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: GestureDetector(
                          onTap: () => setSheet(() => sort = o[0]),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: sort == o[0]
                                  ? const Color(0xFFEAF4FF)
                                  : Colors.white,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                  color: sort == o[0]
                                      ? const Color(0xFF3B9CF5)
                                      : const Color(0xFFD5D5D5)),
                            ),
                            child: Text(o[1],
                                style: GoogleFonts.inter(
                                    fontSize: 12,
                                    color: sort == o[0] ? _blue : _ink)),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 14),
                for (final u in list)
                  GestureDetector(
                    onTap: () {
                      Navigator.pop(context);
                      widget.onSelectUnit(u);
                    },
                    child: _unitCard(u),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _unitsSection() {
    if (p.units.isEmpty) return const SizedBox.shrink();
    final avail = _availability;
    final inline = p.units.take(4).toList();
    final more = p.units.length - inline.length;
    final total = (avail?['total'] as num?)?.toInt() ?? p.units.length;
    final free = (avail?['available'] as num?)?.toInt();
    final datesChosen = widget.checkIn != null && widget.checkOut != null;
    return Padding(
      key: _keys['Units'],
      padding: const EdgeInsets.fromLTRB(16, 34, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Available units', style: _serif(26)),
          const SizedBox(height: 8),
          if (free != null)
            Text.rich(TextSpan(children: [
              TextSpan(
                text: free > 0
                    ? '$free of $total units available'
                    : (avail?['host_blocked'] == true
                        ? 'Not available'
                        : 'All units are booked'),
                style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: free > 0
                        ? const Color(0xFF1F8A4C)
                        : Colors.red.shade600),
              ),
              TextSpan(
                text: datesChosen ? ' for your dates' : ' tonight',
                style: GoogleFonts.inter(fontSize: 13, color: _muted),
              ),
            ])),
          const SizedBox(height: 2),
          Text('Select a unit to see its availability and book it.',
              style: GoogleFonts.inter(fontSize: 12, color: _muted)),
          if (_unitNotice && widget.selectedUnitId == null)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(top: 10),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F3EC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFB7DEC6)),
              ),
              child: Text('Please select a unit first, then choose your dates.',
                  style: GoogleFonts.inter(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF1F6B3F))),
            ),
          const SizedBox(height: 14),
          for (final u in inline) _unitCard(u),
          if (more > 0)
            GestureDetector(
              onTap: _showAllUnits,
              child: Text('+$more more ${more == 1 ? 'unit' : 'units'}',
                  style: GoogleFonts.inter(
                      fontSize: 14, fontWeight: FontWeight.w500, color: _blue)),
            ),
        ],
      ),
    );
  }

  // ------------------------------------------------------------ details
  Widget _detailsSection() {
    Widget row(IconData icon, String label, String value) => Padding(
          padding: const EdgeInsets.only(bottom: 14),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFD5D5D5)),
                ),
                child: Icon(icon, size: 19, color: _ink),
              ),
              const SizedBox(width: 14),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: GoogleFonts.inter(fontSize: 12, color: _muted)),
                  Text(value,
                      style: GoogleFonts.inter(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w600,
                          color: _ink)),
                ],
              ),
            ],
          ),
        );
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 34, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Property details', style: _serif(26)),
          const SizedBox(height: 8),
          Text(
            '${p.title} is a ${_titleCase(p.propertyType)} in ${p.city} with pricing, guest capacity and booking details shown below.',
            style: GoogleFonts.inter(fontSize: 13, height: 1.45, color: _muted),
          ),
          const SizedBox(height: 18),
          row(LucideIcons.mapPin, 'Location', '${p.city}, ${p.state}'),
          row(LucideIcons.building, 'Property type', _titleCase(p.propertyType)),
          row(LucideIcons.users, 'Guest capacity', '${p.maxGuests} guests'),
          row(LucideIcons.moon, 'Minimum stay',
              '${p.minimumStayDays} night${p.minimumStayDays == 1 ? '' : 's'}'),
          row(LucideIcons.logIn, 'Check-in time', _time(p.checkInTime)),
          row(LucideIcons.logOut, 'Check-out time', _time(p.checkOutTime)),
          row(LucideIcons.tag, 'Starting price',
              'Rs ${p.customerDisplayPrice.round()}'),
        ],
      ),
    );
  }

  String _time(String hhmm) {
    final parts = hhmm.split(':');
    if (parts.length < 2) return hhmm;
    var h = int.tryParse(parts[0]) ?? 12;
    final m = parts[1];
    final suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12 == 0 ? 12 : h % 12;
    return '$h:$m $suffix';
  }

  Widget _aboutSection() {
    final text = p.description.trim();
    if (text.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 34, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('About this space', style: _serif(26)),
          const SizedBox(height: 12),
          Text(text,
              maxLines: _descExpanded ? null : 6,
              overflow: _descExpanded ? TextOverflow.visible : TextOverflow.ellipsis,
              style: GoogleFonts.inter(
                  fontSize: 14, height: 1.6, color: const Color(0xFF3B4250))),
          if (text.length > 280)
            GestureDetector(
              onTap: () => setState(() => _descExpanded = !_descExpanded),
              child: Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(_descExpanded ? 'Show less' : 'Read more',
                    style: GoogleFonts.inter(
                        fontSize: 14, fontWeight: FontWeight.w500, color: _blue)),
              ),
            ),
        ],
      ),
    );
  }

  Widget _policySection() {
    Widget tile(Color bg, Color fg, IconData icon, String title, String sub) =>
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
                child: Icon(icon, size: 17, color: fg),
              ),
              const SizedBox(height: 10),
              Text(title,
                  style: GoogleFonts.inter(
                      fontSize: 13.5, fontWeight: FontWeight.w700, color: _ink)),
              const SizedBox(height: 3),
              Text(sub,
                  style: GoogleFonts.inter(
                      fontSize: 11.5, height: 1.3, color: _muted)),
            ],
          ),
        );
    return Padding(
      key: _keys['Refund Policy'],
      padding: const EdgeInsets.fromLTRB(16, 34, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Rules & Refund Policy', style: _serif(26)),
          const SizedBox(height: 18),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              tile(const Color(0xFFD9F7E5), const Color(0xFF1F8A4C),
                  LucideIcons.check, '100% Refund', '7 or more days before check-in'),
              const SizedBox(width: 10),
              tile(const Color(0xFFFFF0C9), const Color(0xFFC98A00),
                  LucideIcons.clock, '50% Refund', '3 to 6 days before check-in'),
              const SizedBox(width: 10),
              tile(const Color(0xFFFFDDDD), Colors.red.shade600, LucideIcons.x,
                  'No Refund', 'Less than 72 hours before check-in'),
            ],
          ),
          const SizedBox(height: 18),
          Text(
              'Check-in time: ${_time(p.checkInTime)}, Check-out time: ${_time(p.checkOutTime)}',
              style: GoogleFonts.inter(fontSize: 13, color: _muted)),
          const SizedBox(height: 8),
          Text(
              'Refunds go back to the original payment method and take 8-10 business days to credit after approval. The platform convenience fee and payment gateway charges are non-refundable.',
              style: GoogleFonts.inter(
                  fontSize: 13, height: 1.5, color: const Color(0xFF3B4250))),
        ],
      ),
    );
  }

  // ------------------------------------------------------------ spaces
  Widget _spacesSection() {
    final groups = <String, List<String>>{};
    for (final raw in p.taggedImages) {
      final parts = raw.split('#');
      final cat = parts.length > 1 && parts[1].trim().isNotEmpty
          ? parts[1].trim()
          : 'Other';
      (groups[cat] ??= []).add(parts.first);
    }
    if (groups.length < 2) return const SizedBox.shrink();
    const order = ['Exterior', 'Living area', 'Bedroom', 'Kitchen', 'Bathroom', 'Balcony', 'Other'];
    final names = groups.keys.toList()
      ..sort((a, b) {
        int i(String x) => order.indexOf(x) == -1 ? 99 : order.indexOf(x);
        return i(a).compareTo(i(b));
      });
    const keywords = {
      'Bedroom': ['air', 'ac', 'wifi', 'tv', 'heat'],
      'Bathroom': ['geyser', 'hot', 'bath', 'shower'],
      'Kitchen': ['kitchen', 'fridge', 'food', 'dining'],
      'Living area': ['tv', 'wifi', 'game', 'fire', 'music', 'ac'],
      'Balcony': ['balcony', 'view', 'terrace', 'garden'],
      'Exterior': ['park', 'pool', 'garden', 'cctv', 'secur'],
    };
    String includes(String name) {
      final keys = keywords[name] ?? const [];
      final hit = p.amenities
          .where((a) => keys.any((k) => a.toLowerCase().contains(k)))
          .take(4)
          .map(amenityLabel)
          .toList();
      if (hit.isEmpty) return '';
      return hit.length == 1
          ? hit.first
          : '${hit.sublist(0, hit.length - 1).join(', ')} and ${hit.last}';
    }

    return Padding(
      padding: const EdgeInsets.only(top: 34),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text('Spaces', style: _serif(26)),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 270,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: names.length,
              separatorBuilder: (_, __) => const SizedBox(width: 14),
              itemBuilder: (_, i) {
                final name = names[i];
                final list = groups[name]!;
                final inc = includes(name);
                return GestureDetector(
                  onTap: () => widget.onOpenGallery(list, 0),
                  child: Container(
                    width: 240,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFD0D0D0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ClipRRect(
                          borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(13)),
                          child: SizedBox(
                            height: 140,
                            width: double.infinity,
                            child: Stack(
                              fit: StackFit.expand,
                              children: [
                                PropertyImage(
                                    imageUrl: list.first,
                                    width: double.infinity,
                                    height: 140),
                                DecoratedBox(
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      begin: Alignment.topCenter,
                                      end: Alignment.bottomCenter,
                                      colors: [
                                        Colors.transparent,
                                        Colors.black.withValues(alpha: 0.7),
                                      ],
                                      stops: const [0.4, 1],
                                    ),
                                  ),
                                ),
                                Positioned(
                                  right: 0,
                                  top: 10,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 10, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: Colors.black
                                          .withValues(alpha: 0.55),
                                      borderRadius: const BorderRadius.horizontal(
                                          left: Radius.circular(6)),
                                    ),
                                    child: Text(
                                        '${list.length} ${list.length == 1 ? 'photo' : 'photos'}',
                                        style: GoogleFonts.inter(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                            color: Colors.white)),
                                  ),
                                ),
                                Positioned(
                                  left: 12,
                                  bottom: 10,
                                  child: Text(name,
                                      style: GoogleFonts.inter(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w600,
                                          color: Colors.white)),
                                ),
                              ],
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                  '•  ${list.length} ${list.length == 1 ? 'photo' : 'photos'} of the ${name.toLowerCase()}.',
                                  style: GoogleFonts.inter(
                                      fontSize: 12, color: _muted)),
                              if (inc.isNotEmpty) ...[
                                const SizedBox(height: 3),
                                Text('•  Includes $inc.',
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.inter(
                                        fontSize: 12, color: _muted)),
                              ],
                              const SizedBox(height: 8),
                              Text(
                                  list.length > 1
                                      ? '+${list.length - 1} more photos'
                                      : 'View photo',
                                  style: GoogleFonts.inter(
                                      fontSize: 12, color: _blue)),
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
      ),
    );
  }

  // ------------------------------------------------------------ amenities + meals
  Widget _amenitiesSection() {
    if (p.amenities.isEmpty) return const SizedBox.shrink();
    final first = p.amenities.take(6).toList();
    return Padding(
      key: _keys['Amenities'],
      padding: const EdgeInsets.fromLTRB(16, 34, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Amenities', style: _serif(26)),
          const SizedBox(height: 18),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            crossAxisSpacing: 10,
            mainAxisSpacing: 16,
            childAspectRatio: 3.3,
            children: [for (final a in first) _amenityBadge(a)],
          ),
          if (p.amenities.length > 6) ...[
            const SizedBox(height: 14),
            GestureDetector(
              onTap: _showAllAmenities,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 18, vertical: 11),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFCFCFCF)),
                ),
                child: Text('Show all ${p.amenities.length} Amenities',
                    style: GoogleFonts.inter(
                        fontSize: 14, fontWeight: FontWeight.w500, color: _ink)),
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ------------------------------------------------------------ restored sections
  Future<void> _open(String url) async {
    final uri = Uri.tryParse(url);
    if (uri != null) await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Widget _sectionShell(String title, Widget child, {GlobalKey? key}) {
    return Padding(
      key: key,
      padding: const EdgeInsets.fromLTRB(16, 34, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: _serif(26)),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }

  /// YouTube Short / long video, the uploaded clip and the virtual tour: each opens outside the app.
  Widget _videosSection() {
    final items = <List<String>>[
      if ((p.youtubeShortUrl ?? '').isNotEmpty) ['Watch the short', p.youtubeShortUrl!],
      if ((p.youtubeLongUrl ?? '').isNotEmpty) ['Watch the video tour', p.youtubeLongUrl!],
      if ((p.videoUrl ?? '').isNotEmpty) ['Play the property video', p.videoUrl!],
      if ((p.virtualTourLink ?? '').isNotEmpty) ['Take the virtual tour', p.virtualTourLink!],
    ];
    if (items.isEmpty) return const SizedBox.shrink();
    return _sectionShell(
      'Videos & Virtual Tours',
      Column(
        children: [
          for (final it in items)
            GestureDetector(
              onTap: () => _open(it[1]),
              child: Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF6F6F6),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE3E3E3)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: const BoxDecoration(
                          color: _ink, shape: BoxShape.circle),
                      child: const Icon(LucideIcons.play,
                          size: 18, color: Colors.white),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Text(it[0],
                          style: GoogleFonts.inter(
                              fontSize: 15, fontWeight: FontWeight.w600)),
                    ),
                    const Icon(LucideIcons.externalLink, size: 18, color: _muted),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _servicesSection() {
    final rows = <List<dynamic>>[
      if (p.hasTaxi)
        [LucideIcons.car, 'Taxi service available', 'Taxi or transportation assistance is available at this property (charges may apply).'],
      if (p.hasCook)
        [LucideIcons.chefHat, 'Personal cook', 'Home-cooked meals by a cook${(p.cookPrice ?? 0) > 0 ? ' at ${CurrencyFormatter.format(p.cookPrice)} per day' : ''}.'],
      if (p.hasSelfCook)
        [LucideIcons.utensils, 'Kitchen for guests', 'Guests can use the kitchen to prepare their own meals (free, included).'],
    ];
    if (rows.isEmpty) return const SizedBox.shrink();
    return _sectionShell(
      'Services & Kitchen',
      Column(
        children: [
          for (final r in rows)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFFD5D5D5)),
                    ),
                    child: Icon(r[0] as IconData, size: 19, color: _ink),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(r[1] as String,
                            style: GoogleFonts.inter(
                                fontSize: 15, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 2),
                        Text(r[2] as String,
                            style: GoogleFonts.inter(
                                fontSize: 12.5, height: 1.4, color: _muted)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _rulesSection() {
    final raw = (p.houseRules ?? '').trim();
    final lines = <String>[
      if (!p.isEventVenue && raw.isNotEmpty && !raw.startsWith('{'))
        ...raw.split('\n').map((e) => e.trim()).where((e) => e.isNotEmpty),
      if (p.petFriendly) 'Pets are welcome.',
    ];
    if (lines.isEmpty) return const SizedBox.shrink();
    return _sectionShell(
      'House rules',
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final l in lines)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('•  ',
                      style: GoogleFonts.inter(fontSize: 14, color: _muted)),
                  Expanded(
                    child: Text(l,
                        style: GoogleFonts.inter(
                            fontSize: 13.5, height: 1.45, color: const Color(0xFF3B4250))),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  /// Questions answered from the listing's own data, like the website's FAQ.
  bool _stayOpen = false;

  String _clockLabel(String raw) {
    final m = RegExp(r'^(\d{1,2}):(\d{2})').firstMatch(raw.trim());
    if (m == null) return raw.trim();
    var h = int.parse(m.group(1)!);
    final suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12 == 0 ? 12 : h % 12;
    return '$h:${m.group(2)} $suffix';
  }

  /// "Explore Your Stay": the whole property in plain words, written from the
  /// details the host entered (same sections as the website, nothing invented).
  Widget _exploreStaySection() {
    final who = p.isCommercial ? 'staff' : 'guests';
    final place = [p.city, p.state].where((e) => e.trim().isNotEmpty).join(', ');
    final type = p.propertyType.trim().replaceAll('_', ' ').toLowerCase();
    final intro = StringBuffer(
        '${p.title} is ${type.isEmpty ? 'a property' : 'a $type'}${place.isEmpty ? '' : ' in $place'}');
    if (p.maxGuests > 0) intro.write(', hosting up to ${p.maxGuests} $who');
    if (p.areaSqft > 0) intro.write(', across ${p.areaSqft.round()} sq.ft');
    intro.write('.');

    final sections = <MapEntry<String, List<String>>>[];
    final space = <String>[
      if (p.bhkType.trim().isNotEmpty) p.bhkType.trim(),
      if (p.maxGuests > 0) 'Comfortably sleeps up to ${p.maxGuests} $who.',
      if (p.areaSqft > 0) 'Built-up area of ${p.areaSqft.round()} sq.ft.',
    ];
    if (space.isNotEmpty) {
      sections.add(MapEntry(p.isEventVenue ? 'The venue' : 'The space', space));
    }
    if (p.amenities.isNotEmpty) {
      sections.add(MapEntry(
          'Amenities and facilities', p.amenities.map(amenityLabel).toList()));
    }
    final food = <String>[
      if (p.hasCook)
        'A personal cook is available for home-cooked meals${(p.cookPrice ?? 0) > 0 ? ' (₹${p.cookPrice!.round()} per day)' : ''}.',
      if (p.hasSelfCook)
        'Guests can use the kitchen to prepare their own meals, free of charge.',
      if ((p.vegPrice ?? 0) > 0) 'Veg plates from ₹${p.vegPrice!.round()} per plate.',
      if ((p.nonVegPrice ?? 0) > 0)
        'Non-veg plates from ₹${p.nonVegPrice!.round()} per plate.',
    ];
    if (food.isNotEmpty) sections.add(MapEntry('Food', food));

    final stay = <String>[
      if (p.checkInTime.trim().isNotEmpty)
        'Check-in from ${_clockLabel(p.checkInTime)}.',
      if (p.checkOutTime.trim().isNotEmpty)
        'Check-out by ${_clockLabel(p.checkOutTime)}.',
      if (p.minimumStayDays > 1) 'Minimum stay: ${p.minimumStayDays} nights.',
      p.petFriendly
          ? 'Pets are welcome.'
          : 'This is not a pet-friendly property.',
      p.isInstantBook
          ? 'Instant booking: your stay is confirmed as soon as you pay.'
          : "Booking needs the host's approval; you pay only after they accept.",
    ];
    sections.add(MapEntry('Stay details', stay));

    final raw = (p.houseRules ?? '').trim();
    if (!p.isEventVenue && raw.isNotEmpty && !raw.startsWith('{')) {
      final rules = raw
          .split('\n')
          .map((l) => l.replaceFirst(RegExp(r'^[-•\s]+'), '').trim())
          .where((l) => l.isNotEmpty)
          .toList();
      if (rules.isNotEmpty) sections.add(MapEntry('House rules', rules));
    }
    sections.add(const MapEntry('Cancellation and refunds', [
      '100% refund if you cancel 7 or more days before check-in.',
      '50% refund if you cancel 3 to 6 days before check-in.',
      'No refund if you cancel within 3 days of check-in.',
    ]));
    if (p.nearbyPlaces.isNotEmpty) {
      sections.add(MapEntry('Nearby', p.nearbyPlaces));
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Container(
        decoration: const BoxDecoration(
          border: Border.symmetric(
              horizontal: BorderSide(color: Color(0xFFE3E3E3))),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => setState(() => _stayOpen = !_stayOpen),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 18),
                child: Row(
                  children: [
                    Expanded(
                        child: Text('Explore Your Stay', style: _serif(22))),
                    AnimatedRotation(
                      turns: _stayOpen ? 0.5 : 0,
                      duration: const Duration(milliseconds: 180),
                      child: const Icon(LucideIcons.chevronDown, size: 20),
                    ),
                  ],
                ),
              ),
            ),
            if (_stayOpen)
              Padding(
                padding: const EdgeInsets.only(bottom: 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(intro.toString(),
                        style: GoogleFonts.inter(
                            fontSize: 13.5,
                            height: 1.5,
                            color: const Color(0xFF3B4250))),
                    for (final s in sections) ...[
                      const SizedBox(height: 16),
                      Text(s.key.toUpperCase(),
                          style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: _ink)),
                      const SizedBox(height: 6),
                      for (final line in s.value)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('•  ',
                                  style: GoogleFonts.inter(
                                      fontSize: 13.5, color: _muted)),
                              Expanded(
                                child: Text(line,
                                    style: GoogleFonts.inter(
                                        fontSize: 13.5,
                                        height: 1.45,
                                        color: const Color(0xFF3B4250))),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _faqSection() {
    final cat = _titleCase(p.propertyType);
    final qa = <List<String>>[
      [
        'What type of property is ${p.title}?',
        '${p.title} is a $cat in ${p.city}, ${p.state}.'
      ],
      [
        'How many guests can stay at ${p.title}?',
        'Up to ${p.maxGuests} ${p.participantLabel}${p.areaSqft > 0 ? ' in ${p.areaSqft.round()} sq.ft' : ''}.'
      ],
      [
        'What is the starting price per night?',
        'Prices start at ${CurrencyFormatter.format(p.customerDisplayPrice)} ${p.pricingUnitSuffix.trim()} plus taxes.'
      ],
      [
        'What are the check-in and check-out times?',
        'Check-in is at ${_time(p.checkInTime)} and check-out is at ${_time(p.checkOutTime)}.'
      ],
      [
        'Is instant booking available?',
        p.isInstantBook
            ? 'Yes. Your booking is confirmed as soon as you pay.'
            : 'The host confirms each request within 24 hours; you pay after approval.'
      ],
      [
        'Where is ${p.title} located?',
        [p.address, p.city, p.state].where((e) => e.trim().isNotEmpty).join(', ') + '.'
      ],
    ];
    return _sectionShell(
      'Frequently asked questions',
      Column(
        children: [
          for (final item in qa)
            Theme(
              data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
              child: ExpansionTile(
                tilePadding: EdgeInsets.zero,
                childrenPadding: const EdgeInsets.only(bottom: 12),
                title: Text(item[0],
                    style: GoogleFonts.inter(
                        fontSize: 14.5, fontWeight: FontWeight.w600)),
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(item[1],
                        style: GoogleFonts.inter(
                            fontSize: 13.5, height: 1.5, color: _muted)),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  /// "Great for" cards worked out from what the host filled in, like the website.
  Widget _greatForSection() {
    final amenities = p.amenities.map((a) => a.toLowerCase()).toList();
    final text =
        '${p.title} ${p.description} ${p.propertyType}'.toLowerCase();
    bool has(List<String> words) =>
        amenities.any((a) => words.any(a.contains)) ||
        words.any(text.contains);
    final items = <List<dynamic>>[];
    if (p.isEventVenue) {
      items.add([LucideIcons.partyPopper, 'Celebrations',
        'Weddings, parties and get-togethers']);
    }
    if (p.isCommercial) {
      items.add([LucideIcons.laptop, 'Work', 'A space to focus and meet']);
    }
    if (has(['view', 'lake', 'hill', 'mountain', 'valley', 'sunset', 'garden'])) {
      items.add([LucideIcons.mountain, 'View', 'Surroundings worth waking up to']);
    }
    if (p.petFriendly) {
      items.add([LucideIcons.pawPrint, 'Pets', 'Your furry friends are welcome']);
    }
    if (has(['kids', 'play', 'swing', 'family', 'pool'])) {
      items.add([LucideIcons.baby, 'Kids', 'Space for little ones to enjoy']);
    }
    if (p.maxGuests >= 8) {
      items.add([LucideIcons.users, 'Groups',
        'Comfortable for up to ${p.maxGuests} guests']);
    }
    if (!p.isCommercial && has(['wifi', 'workspace', 'desk'])) {
      items.add([LucideIcons.laptop, 'Work', 'Fast WiFi for a workation']);
    }
    if (has(['design', 'architect', 'heritage', 'luxury', 'bungalow'])) {
      items.add([LucideIcons.building2, 'Design',
        "Interiors you'll want to photograph"]);
    }
    final shown = items.take(4).toList();
    if (shown.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 22, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Great for:',
              style: GoogleFonts.inter(
                  fontSize: 14, fontWeight: FontWeight.w700, color: _ink)),
          const SizedBox(height: 10),
          for (final i in shown)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE3E3E3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(i[0] as IconData, size: 20, color: _ink),
                  const SizedBox(height: 10),
                  Text(i[1] as String,
                      style: GoogleFonts.inter(
                          fontSize: 15, fontWeight: FontWeight.w500, color: _ink)),
                  const SizedBox(height: 2),
                  Text(i[2] as String,
                      style: GoogleFonts.inter(fontSize: 13, color: _muted)),
                ],
              ),
            ),
        ],
      ),
    );
  }

  /// Map: the exact pin unlocks once the guest has a confirmed booking (the
  /// same rule as the host's phone number); before that it is a locked card.
  /// Location, like the website: a map with the nearby attractions under it.
  /// The exact pin unlocks with a confirmed booking (same rule as the host's
  /// phone); before that the area map is shown wide and blurred with a lock.
  Widget _locationSection() {
    final loggedIn = context.read<AuthProvider>().isAuthenticated;
    final hasPoint = p.latitude != 0 && p.longitude != 0;
    final unlocked = p.locationUnlocked;

    // Google Maps (Static Maps API) when a key is configured; OpenStreetMap otherwise.
    Widget googleMap(double zoom) => Image.network(
          'https://maps.googleapis.com/maps/api/staticmap'
          '?center=${p.latitude},${p.longitude}&zoom=${zoom.round()}'
          '&size=640x460&scale=2&maptype=roadmap'
          '${unlocked ? '&markers=color:red%7C${p.latitude},${p.longitude}' : ''}'
          '&key=${AppConfig.googleMapsKey}',
          fit: BoxFit.cover,
          width: double.infinity,
          height: double.infinity,
          errorBuilder: (_, __, ___) =>
              Container(color: const Color(0xFFEEF2EE)),
        );

    Widget osmMap(double zoom) => FlutterMap(
          options: MapOptions(
            initialCenter: LatLng(p.latitude, p.longitude),
            initialZoom: zoom,
            interactionOptions: InteractionOptions(
                flags: unlocked
                    ? InteractiveFlag.pinchZoom | InteractiveFlag.drag
                    : InteractiveFlag.none),
          ),
          children: [
            TileLayer(
              urlTemplate: AppConfig.mapTileUrl,
              userAgentPackageName: AppConfig.mapUserAgent,
              subdomains: const ['a', 'b', 'c', 'd'],
            ),
            if (unlocked)
              MarkerLayer(markers: [
                Marker(
                  point: LatLng(p.latitude, p.longitude),
                  width: 40,
                  height: 40,
                  child: const Icon(Icons.location_on,
                      size: 40, color: Color(0xFFE53935)),
                ),
              ]),
          ],
        );

    Widget map(double zoom) =>
        AppConfig.googleMapsKey.isNotEmpty ? googleMap(zoom) : osmMap(zoom);

    return _sectionShell(
      'Location',
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: SizedBox(
              height: 230,
              width: double.infinity,
              child: !hasPoint
                  ? Container(color: const Color(0xFFEEF2EE))
                  : unlocked
                      ? map(15)
                      : Stack(
                          fit: StackFit.expand,
                          children: [
                            ImageFiltered(
                              imageFilter:
                                  ImageFilter.blur(sigmaX: 4, sigmaY: 4),
                              child: map(11),
                            ),
                            Container(color: Colors.white.withValues(alpha: 0.4)),
                            Padding(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 22),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    width: 42,
                                    height: 42,
                                    decoration: const BoxDecoration(
                                        color: _ink, shape: BoxShape.circle),
                                    child: const Icon(LucideIcons.lock,
                                        size: 19, color: Colors.white),
                                  ),
                                  const SizedBox(height: 8),
                                  Text('Exact location unlocks after booking',
                                      textAlign: TextAlign.center,
                                      style: GoogleFonts.inter(
                                          fontSize: 14.5,
                                          fontWeight: FontWeight.w600,
                                          color: _ink)),
                                  const SizedBox(height: 3),
                                  Text(
                                      loggedIn
                                          ? 'Once your booking is confirmed, the exact pin appears here.'
                                          : 'Log in and confirm a booking to see the exact pin.',
                                      textAlign: TextAlign.center,
                                      style: GoogleFonts.inter(
                                          fontSize: 12.5, color: _ink)),
                                ],
                              ),
                            ),
                          ],
                        ),
            ),
          ),
          if (p.nearbyPlaces.isNotEmpty) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
              decoration: BoxDecoration(
                  color: _ink, borderRadius: BorderRadius.circular(999)),
              child: Text('Nearby Attractions',
                  style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Colors.white)),
            ),
            const SizedBox(height: 10),
            for (final place in p.nearbyPlaces)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 8),
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFE3E3E3)),
                ),
                child: Row(
                  children: [
                    const Icon(LucideIcons.mapPin, size: 15, color: _muted),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(place,
                          style: GoogleFonts.inter(fontSize: 14, color: _ink)),
                    ),
                  ],
                ),
              ),
          ],
          const SizedBox(height: 6),
          Text(
            unlocked
                ? (p.address.isNotEmpty ? p.address : '${p.city}, ${p.state}')
                : '${[p.city, p.state].where((e) => e.trim().isNotEmpty).join(', ')}. The full address and directions are shared once your booking is confirmed.',
            style: GoogleFonts.inter(fontSize: 13.5, height: 1.5, color: _muted),
          ),
          if (unlocked && hasPoint) ...[
            const SizedBox(height: 6),
            GestureDetector(
              onTap: () => _open(
                  'https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}'),
              child: Text('Open in Google Maps',
                  style: GoogleFonts.inter(
                      fontSize: 14, fontWeight: FontWeight.w600, color: _blue)),
            ),
          ],
        ],
      ),
    );
  }

  Widget _nearbySection() {
    if (p.nearbyPlaces.isEmpty) return const SizedBox.shrink();
    return _sectionShell(
      'Nearby Attractions',
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Famous places near this property',
              style: GoogleFonts.inter(fontSize: 12.5, color: _muted)),
          const SizedBox(height: 12),
          for (final place in p.nearbyPlaces)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE3E3E3)),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.mapPin, size: 16, color: Color(0xFF1F8A4C)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(place,
                        style: GoogleFonts.inter(fontSize: 14, color: _ink)),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _similarSection() {
    if (widget.similar.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 34),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text('Similar Properties in ${p.city}', style: _serif(24)),
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: 410,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 18),
              itemCount: widget.similar.length,
              separatorBuilder: (_, __) => const SizedBox(width: 16),
              itemBuilder: (_, i) => SizedBox(
                width: 292,
                child: WebPropertyCard(
                  property: widget.similar[i],
                  onTap: () => widget.onOpenSimilar?.call(widget.similar[i]),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  bool _vegMeal = true;

  Widget _mealsSection() {
    final veg = p.vegPrice ?? 0;
    final nonVeg = p.nonVegPrice ?? 0;
    if (veg <= 0 && nonVeg <= 0 && !p.hasCook && !p.hasSelfCook) {
      return const SizedBox.shrink();
    }
    final options = [if (veg > 0) true, if (nonVeg > 0) false];
    final isVeg = options.isEmpty ? true : (options.contains(_vegMeal) ? _vegMeal : options.first);
    final price = isVeg ? veg : nonVeg;
    Map<String, dynamic>? pkg;
    for (final e in p.packages) {
      if ((e['type'] == 'veg') == isVeg) pkg = e;
    }
    final items = <MapEntry<String, dynamic>>[];
    final raw = pkg?['items'];
    if (raw is Map) {
      for (final e in raw.entries) {
        if ((e.value is num) && (e.value as num) > 0) {
          items.add(MapEntry(e.key.toString(), e.value));
        }
      }
    }
    final left = <MapEntry<String, dynamic>>[];
    final right = <MapEntry<String, dynamic>>[];
    for (var i = 0; i < items.length; i++) {
      (i < (items.length + 1) ~/ 2 ? left : right).add(items[i]);
    }

    Widget itemRow(MapEntry<String, dynamic> e) => Padding(
          padding: const EdgeInsets.only(bottom: 11),
          child: Row(
            children: [
              const Icon(LucideIcons.circleCheck, size: 18, color: _ink),
              const SizedBox(width: 10),
              Expanded(
                child: Text(e.key,
                    style: GoogleFonts.inter(fontSize: 13.5, color: _ink)),
              ),
              Text('x${(e.value as num).round()}',
                  style: GoogleFonts.inter(fontSize: 11.5, color: _muted)),
            ],
          ),
        );

    Widget bullet(String t) => Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('•  ', style: GoogleFonts.inter(fontSize: 13, color: _muted)),
              Expanded(
                child: Text(t,
                    style: GoogleFonts.inter(
                        fontSize: 12.5, height: 1.4, color: const Color(0xFF3B4250))),
              ),
            ],
          ),
        );

    Widget pill(bool v, double amount) {
      final active = isVeg == v;
      final dot = v ? const Color(0xFF1F8A4C) : Colors.red.shade600;
      return GestureDetector(
        onTap: () => setState(() => _vegMeal = v),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: active ? _ink : Colors.white,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: active ? _ink : const Color(0xFFD5D5D5)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 15,
                height: 15,
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: dot, width: 1.6),
                  borderRadius: BorderRadius.circular(3),
                ),
                child: Center(
                  child: Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(color: dot, shape: BoxShape.circle)),
                ),
              ),
              const SizedBox(width: 8),
              Text(v ? 'Veg' : 'Non-Veg',
                  style: GoogleFonts.inter(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                      color: active ? Colors.white : _ink)),
              const SizedBox(width: 8),
              Text(CurrencyFormatter.format(amount),
                  style: GoogleFonts.inter(
                      fontSize: 12.5,
                      color: active ? Colors.white70 : _muted)),
            ],
          ),
        ),
      );
    }

    return Padding(
      key: _keys['Meals'],
      padding: const EdgeInsets.fromLTRB(16, 34, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Meals', style: _serif(26)),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFFFBF1D6), Color(0xFFFCF9EF), Color(0xFFE1EFE6)],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFD0D0D0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: SizedBox(
                    height: 150,
                    width: double.infinity,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        Image.asset('assets/images/meals-banner.webp',
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) =>
                                Container(color: const Color(0xFF3A3A3A))),
                        DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.transparent,
                                Colors.black.withValues(alpha: 0.65)
                              ],
                            ),
                          ),
                        ),
                        Positioned(
                          left: 14,
                          bottom: 12,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                  options.isNotEmpty ? 'Choose your menu' : 'Home-style meals',
                                  style: GoogleFonts.playfairDisplay(
                                      fontSize: 20, color: Colors.white)),
                              Text(
                                  options.isNotEmpty
                                      ? 'Veg and non-veg plates'
                                      : 'Cooked fresh at the property',
                                  style: GoogleFonts.inter(
                                      fontSize: 11.5, color: Colors.white)),
                            ],
                          ),
                        ),
                        if (price > 0)
                          Positioned(
                            right: 12,
                            bottom: 12,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.95),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text.rich(TextSpan(children: [
                                TextSpan(
                                    text: CurrencyFormatter.format(price),
                                    style: GoogleFonts.inter(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: _ink)),
                                TextSpan(
                                    text: ' / plate',
                                    style: GoogleFonts.inter(
                                        fontSize: 10.5, color: _muted)),
                              ])),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
                if (options.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 10,
                    runSpacing: 8,
                    children: [
                      if (veg > 0) pill(true, veg),
                      if (nonVeg > 0) pill(false, nonVeg),
                    ],
                  ),
                ],
                if (items.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(child: Column(children: [for (final e in left) itemRow(e)])),
                      const SizedBox(width: 16),
                      Expanded(child: Column(children: [for (final e in right) itemRow(e)])),
                    ],
                  ),
                ],
                const SizedBox(height: 6),
                if (options.isNotEmpty) bullet('Rates are per plate.'),
                if (p.hasCook) bullet('Personal cook available for home-cooked meals. Rate: ${CurrencyFormatter.format(p.cookPrice ?? 0)} per day.'),
                if (p.hasSelfCook) bullet('Guests can use the kitchen facility to prepare their own meals (free, included).'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ignore: unused_element
  Widget _mealsSectionOld() {
    final veg = p.vegPrice ?? 0;
    final nonVeg = p.nonVegPrice ?? 0;
    if (veg <= 0 && nonVeg <= 0 && !p.hasCook) return const SizedBox.shrink();
    return Padding(
      key: _keys['Meals'],
      padding: const EdgeInsets.fromLTRB(16, 34, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Meals', style: _serif(26)),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFFFBF1D6), Color(0xFFFCF9EF), Color(0xFFE1EFE6)],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFD0D0D0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: SizedBox(
                    height: 150,
                    width: double.infinity,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        Image.asset('assets/images/hero/group-stay.webp',
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) =>
                                Container(color: const Color(0xFF3A3A3A))),
                        DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.transparent,
                                Colors.black.withValues(alpha: 0.65)
                              ],
                            ),
                          ),
                        ),
                        Positioned(
                          left: 14,
                          bottom: 12,
                          child: Text(
                              veg > 0 || nonVeg > 0
                                  ? 'Choose your menu'
                                  : 'Home-style meals',
                              style: GoogleFonts.playfairDisplay(
                                  fontSize: 20, color: Colors.white)),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 10,
                  runSpacing: 8,
                  children: [
                    if (veg > 0)
                      _mealChip('Veg', veg, const Color(0xFF1F8A4C)),
                    if (nonVeg > 0)
                      _mealChip('Non-Veg', nonVeg, Colors.red.shade600),
                  ],
                ),
                if (p.hasCook)
                  Padding(
                    padding: const EdgeInsets.only(top: 10),
                    child: Text(
                        'Personal cook available for home-cooked meals.',
                        style: GoogleFonts.inter(fontSize: 12.5, color: _muted)),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _mealChip(String label, double price, Color dot) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0xFFD5D5D5)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 14,
            height: 14,
            decoration: BoxDecoration(
              border: Border.all(color: dot, width: 1.6),
              borderRadius: BorderRadius.circular(3),
            ),
            child: Center(
              child: Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(color: dot, shape: BoxShape.circle)),
            ),
          ),
          const SizedBox(width: 8),
          Text(label,
              style: GoogleFonts.inter(
                  fontSize: 13.5, fontWeight: FontWeight.w500, color: _ink)),
          const SizedBox(width: 8),
          Text(CurrencyFormatter.format(price),
              style: GoogleFonts.inter(
                  fontSize: 13, fontWeight: FontWeight.w600, color: _ink)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _header(),
        _breadcrumb(),
        _hero(),
        _tabs(),
        _titleBlock(),
        _amenityStrip(),
        _greatForSection(),
        _hostCard(),
        if (p.hostPhone != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
            child: GestureDetector(
              onTap: () => _open('tel:${p.hostPhone}'),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 13),
                decoration: BoxDecoration(
                  color: _ink,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(LucideIcons.phone, size: 17, color: Colors.white),
                    const SizedBox(width: 10),
                    Text(p.hostPhone!,
                        style: GoogleFonts.inter(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w600,
                            color: Colors.white)),
                  ],
                ),
              ),
            ),
          ),
        _unitsSection(),
        _detailsSection(),
        _aboutSection(),
        _policySection(),
        _spacesSection(),
        _videosSection(),
        _servicesSection(),
        _rulesSection(),
        _amenitiesSection(),
        _mealsSection(),
        _locationSection(),
        _faqSection(),
        _exploreStaySection(),

        Padding(
          key: _keys['Reviews'],
          padding: const EdgeInsets.fromLTRB(16, 34, 16, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: widget.trailingSections,
          ),
        ),
        _similarSection(),
        const SizedBox(height: 120),
      ],
    );
  }
}

class _SheetFrame extends StatelessWidget {
  final String title;
  final Widget child;

  const _SheetFrame({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    final h = MediaQuery.sizeOf(context).height;
    return Container(
      constraints: BoxConstraints(maxHeight: h * 0.88),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 14, 10),
            child: Row(
              children: [
                Expanded(child: Text(title, style: _serif(22))),
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    width: 34,
                    height: 34,
                    decoration: const BoxDecoration(
                        color: Color(0xFFF1F1F1), shape: BoxShape.circle),
                    child: const Icon(LucideIcons.x, size: 16, color: _ink),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFEDEDED)),
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
              child: child,
            ),
          ),
        ],
      ),
    );
  }
}
