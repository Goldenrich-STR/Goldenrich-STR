import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../models/property_model.dart';
import '../shared/web_property_card.dart';
import 'assistant_chat.dart';

const _ink = Color(0xFF1B1924);

TextStyle _serif(double size, {Color color = _ink}) => GoogleFonts.playfairDisplay(
    fontSize: size, fontWeight: FontWeight.w600, color: color);

// ---------------------------------------------------------------- More Than a Stay
class MoreThanStaySection extends StatefulWidget {
  const MoreThanStaySection({super.key});

  @override
  State<MoreThanStaySection> createState() => _MoreThanStaySectionState();
}

class _MoreThanStaySectionState extends State<MoreThanStaySection> {
  static const _slides = [
    'billiards',
    'shared-dining',
    'cycling-trail',
    'sunset-terrace',
    'garden-picnic',
    'lakeside-picnic',
    'barbecue-evening',
  ];
  static const _features = [
    ['Private Pool', -1.0, -1.0],
    ['Chef Service', -0.3333, -1.0],
    ['Stay Support', 0.3333, -1.0],
    ['Local Trails', 1.0, -1.0],
    ['Games & Fun', -1.0, 1.0],
    ['Open Spaces', -0.3333, 1.0],
    ['Celebrations', 0.3333, 1.0],
    ['Barbeque Nights', 1.0, 1.0],
  ];

  int _index = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (mounted) setState(() => _index = (_index + 1) % _slides.length);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Widget _icon(double ax, double ay) {
    const size = 52.0;
    return SizedBox(
      width: size,
      height: size,
      child: ClipRect(
        child: OverflowBox(
          alignment: Alignment(ax, ay),
          minWidth: size * 4,
          maxWidth: size * 4,
          minHeight: size * 2,
          maxHeight: size * 2,
          child: Image.asset(
            'assets/images/experiences/xspace-feature-icons-source.png',
            width: size * 4,
            height: size * 2,
            fit: BoxFit.fill,
            errorBuilder: (_, __, ___) => const SizedBox(),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFF5F2EB),
      padding: const EdgeInsets.symmetric(vertical: 26, horizontal: 16),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: SizedBox(
          height: 390,
          child: Stack(
            fit: StackFit.expand,
            children: [
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 700),
                child: Image.asset(
                  'assets/images/experiences/${_slides[_index]}.webp',
                  key: ValueKey(_index),
                  fit: BoxFit.cover,
                  width: double.infinity,
                  height: double.infinity,
                  errorBuilder: (_, __, ___) =>
                      Container(color: const Color(0xFF3A3A3A)),
                ),
              ),
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                    colors: [
                      Colors.black.withValues(alpha: 0.7),
                      Colors.black.withValues(alpha: 0.25),
                      Colors.black.withValues(alpha: 0.1),
                    ],
                  ),
                ),
              ),
              Positioned(
                right: 12,
                top: 0,
                bottom: 0,
                child: Center(
                  child: GestureDetector(
                    onTap: () =>
                        setState(() => _index = (_index + 1) % _slides.length),
                    child: Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.28),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white54),
                      ),
                      child: const Icon(LucideIcons.chevronRight,
                          size: 18, color: Colors.white),
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 18,
                right: 56,
                bottom: 26,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('More Than a Stay',
                        style: GoogleFonts.playfairDisplay(
                            fontSize: 27,
                            fontWeight: FontWeight.w500,
                            color: Colors.white)),
                    const SizedBox(height: 8),
                    Text(
                      'Thoughtful comforts, local moments and space to make your stay your own.',
                      style: GoogleFonts.inter(
                          fontSize: 12,
                          height: 1.4,
                          color: Colors.white.withValues(alpha: 0.9)),
                    ),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 6,
                      runSpacing: 12,
                      children: [
                        for (final f in _features)
                          SizedBox(
                            width: 64,
                            child: Column(
                              children: [
                                _icon(f[1] as double, f[2] as double),
                                const SizedBox(height: 4),
                                Text(f[0] as String,
                                    textAlign: TextAlign.center,
                                    maxLines: 2,
                                    style: GoogleFonts.inter(
                                        fontSize: 9.5,
                                        height: 1.15,
                                        fontWeight: FontWeight.w500,
                                        color: Colors.white)),
                              ],
                            ),
                          ),
                      ],
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

// ---------------------------------------------------------------- X-Space Series
class XSpaceSeriesSection extends StatelessWidget {
  final List<PropertyModel> properties;
  final void Function(PropertyModel) onOpen;
  final VoidCallback onViewAll;

  const XSpaceSeriesSection({
    super.key,
    required this.properties,
    required this.onOpen,
    required this.onViewAll,
  });

  @override
  Widget build(BuildContext context) {
    if (properties.isEmpty) return const SizedBox.shrink();
    return Container(
      color: const Color(0xFFF5F2EB),
      padding: const EdgeInsets.fromLTRB(16, 4, 0, 26),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: const BoxDecoration(
                    color: Color(0xFF111111), shape: BoxShape.circle),
                child: const Icon(LucideIcons.crown,
                    size: 16, color: Color(0xFFE8C766)),
              ),
              const SizedBox(width: 10),
              Expanded(child: Text('X-Space Series', style: _serif(22))),
              GestureDetector(
                onTap: onViewAll,
                child: Padding(
                  padding: const EdgeInsets.only(right: 16),
                  child: Text('View all',
                      style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF2563EB))),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Private villas curated for elevated weekends and unhurried stays.',
            style: GoogleFonts.inter(fontSize: 12.5, color: const Color(0xFF4A5568)),
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: 410,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.only(right: 16, bottom: 18, top: 4),
              itemCount: properties.length,
              separatorBuilder: (_, __) => const SizedBox(width: 16),
              itemBuilder: (_, i) => SizedBox(
                width: 292,
                child: WebPropertyCard(
                  property: properties[i],
                  seriesRibbon: 'X-Space Series',
                  onTap: () => onOpen(properties[i]),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------- partner strips
class _Partner {
  final String name;
  final String logo;
  final String headline;
  final String subline;
  final String search;
  final Color surface;
  final Color text;
  final bool darkLogo;

  const _Partner(this.name, this.logo, this.headline, this.subline, this.search,
      this.surface, this.text, this.darkLogo);
}

class PartnerBannerSection extends StatefulWidget {
  final void Function(String search) onExplore;

  const PartnerBannerSection({super.key, required this.onExplore});

  @override
  State<PartnerBannerSection> createState() => _PartnerBannerSectionState();
}

class _PartnerBannerSectionState extends State<PartnerBannerSection> {
  static const _partners = [
    _Partner(
        'Radisson Blu',
        'radisson-blu.jpg',
        'Radisson Blu for polished Nashik city breaks',
        'A familiar address for refined rooms, business travel and special celebrations.',
        'Radisson Blu',
        Color(0xFF24252A),
        Colors.white,
        true),
    _Partner(
        'SSK Solitaire',
        'ssk-solitaire.png',
        'SSK Solitaire for easy stays and beautiful celebrations',
        'A Nashik hotel and banqueting destination for family functions and get-togethers.',
        'SSK Solitaire',
        Color(0xFFF7EFD9),
        Color(0xFF42241E),
        false),
    _Partner(
        'Bon Vivant',
        'bon-vivant.jpg',
        'Bon Vivant makes dining an occasion',
        'A warm choice for leisurely meals, close celebrations and memorable evenings.',
        'Bon Vivant',
        Color(0xFF1D1B1D),
        Colors.white,
        true),
    _Partner(
        'Enrise by Sayaji',
        'enrise-sayaji.jpg',
        'Enrise by Sayaji offers a relaxed Nashik welcome',
        'Thoughtful rooms and event-ready spaces for effortless work trips and weekends.',
        'Enrise Sayaji',
        Color(0xFFEDF1EB),
        Color(0xFF3F4542),
        false),
    _Partner(
        'Pegasus',
        'pegasus.jpg',
        'Pegasus brings global cuisine to good company',
        'A distinctive spot in Nashik for dinner plans, celebrations and shared tables.',
        'Pegasus',
        Color(0xFF211D1E),
        Colors.white,
        true),
  ];

  int _index = 0;
  Timer? _timer;
  final PageController _controller = PageController();

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (!mounted || !_controller.hasClients) return;
      _controller.animateToPage((_index + 1) % _partners.length,
          duration: const Duration(milliseconds: 450), curve: Curves.easeInOut);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 262,
      child: PageView.builder(
        controller: _controller,
        itemCount: _partners.length,
        onPageChanged: (i) => setState(() => _index = i),
        itemBuilder: (_, i) {
          final p = _partners[i];
          return Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 14),
            decoration: BoxDecoration(
              color: p.surface,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  height: 50,
                  child: Center(
                    child: Image.asset(
                      'assets/images/partners/${p.logo}',
                      height: 46,
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => Text(p.name,
                          style: _serif(20, color: p.text)),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text('OUR PARTNER',
                    style: GoogleFonts.inter(
                        fontSize: 10,
                        letterSpacing: 0.9,
                        fontWeight: FontWeight.w700,
                        color: p.text.withValues(alpha: 0.65))),
                const SizedBox(height: 4),
                Text(p.headline,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                        fontSize: 16,
                        height: 1.25,
                        fontWeight: FontWeight.w700,
                        color: p.text)),
                const SizedBox(height: 6),
                Text(p.subline,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                        fontSize: 11.5,
                        height: 1.35,
                        color: p.text.withValues(alpha: 0.65))),
                const Spacer(),
                Row(
                  children: [
                    GestureDetector(
                      onTap: () => widget.onExplore(p.search),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(999),
                          border:
                              Border.all(color: p.text.withValues(alpha: 0.5)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('Explore spaces',
                                style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: p.text)),
                            const SizedBox(width: 6),
                            Icon(LucideIcons.arrowRight,
                                size: 14, color: p.text),
                          ],
                        ),
                      ),
                    ),
                    const Spacer(),
                    Row(
                      children: List.generate(
                        _partners.length,
                        (d) => Container(
                          width: d == _index ? 16 : 5,
                          height: 5,
                          margin: const EdgeInsets.only(left: 4),
                          decoration: BoxDecoration(
                            color: p.text
                                .withValues(alpha: d == _index ? 0.95 : 0.4),
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

// ---------------------------------------------------------------- Explore Spaces tabs
class ExploreSpacesSection extends StatefulWidget {
  final List<PropertyModel> residential;
  final List<PropertyModel> commercial;
  final List<PropertyModel> events;
  final void Function(PropertyModel) onOpen;
  final void Function(String category) onViewAll;

  const ExploreSpacesSection({
    super.key,
    required this.residential,
    required this.commercial,
    required this.events,
    required this.onOpen,
    required this.onViewAll,
  });

  @override
  State<ExploreSpacesSection> createState() => _ExploreSpacesSectionState();
}

class _ExploreSpacesSectionState extends State<ExploreSpacesSection> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    const labels = ['Residential', 'Commercial', 'Event Venues'];
    const cats = ['residential', 'commercial', 'event_venue'];
    final lists = [widget.residential, widget.commercial, widget.events];
    final cards = lists[_tab].take(8).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Expanded(child: Text('Explore Spaces', style: _serif(24))),
              GestureDetector(
                onTap: () => widget.onViewAll(cats[_tab]),
                child: Text('View all',
                    style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF2563EB))),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: Color(0xFFE3E3E3))),
          ),
          child: Row(
            children: [
              for (var i = 0; i < labels.length; i++)
                GestureDetector(
                  onTap: () => setState(() => _tab = i),
                  child: Container(
                    margin: const EdgeInsets.only(right: 20),
                    padding: const EdgeInsets.only(bottom: 10),
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(
                            width: 2,
                            color: _tab == i ? _ink : Colors.transparent),
                      ),
                    ),
                    child: Text(labels[i],
                        style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight:
                                _tab == i ? FontWeight.w600 : FontWeight.w500,
                            color: _tab == i
                                ? _ink
                                : const Color(0xFF6B7A90))),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        if (cards.isEmpty)
          Padding(
            padding: const EdgeInsets.all(24),
            child: Text('No spaces in this category yet.',
                style: GoogleFonts.inter(
                    fontSize: 13, color: const Color(0xFF6B6B6B))),
          )
        else
          SizedBox(
            height: 410,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.only(left: 16, right: 16, bottom: 18),
              itemCount: cards.length,
              separatorBuilder: (_, __) => const SizedBox(width: 16),
              itemBuilder: (_, i) => SizedBox(
                width: 292,
                child: WebPropertyCard(
                  property: cards[i],
                  onTap: () => widget.onOpen(cards[i]),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

// ---------------------------------------------------------------- blogs
class HomeBlogItem {
  final String imageUrl;
  final String title;
  final String excerpt;
  final String meta;
  final VoidCallback onTap;

  const HomeBlogItem({
    required this.imageUrl,
    required this.title,
    required this.excerpt,
    required this.meta,
    required this.onTap,
  });
}

class BlogsSection extends StatelessWidget {
  final List<HomeBlogItem> items;

  const BlogsSection({super.key, required this.items});

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('STAY INFORMED',
                  style: GoogleFonts.inter(
                      fontSize: 10.5,
                      letterSpacing: 1.1,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF8A94A6))),
              const SizedBox(height: 4),
              Text('Top Blogs', style: _serif(24)),
            ],
          ),
        ),
        const SizedBox(height: 14),
        SizedBox(
          height: 150,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(width: 14),
            itemBuilder: (_, i) {
              final b = items[i];
              return GestureDetector(
                onTap: b.onTap,
                child: Container(
                  width: 310,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFEDEDED)),
                    boxShadow: [
                      BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 14,
                          offset: const Offset(0, 5)),
                    ],
                  ),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: const BorderRadius.horizontal(
                            left: Radius.circular(16)),
                        child: SizedBox(
                          width: 112,
                          height: double.infinity,
                          child: Image.network(
                            b.imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) =>
                                Container(color: const Color(0xFFEDEDED)),
                          ),
                        ),
                      ),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(b.title,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.inter(
                                      fontSize: 14,
                                      height: 1.25,
                                      fontWeight: FontWeight.w600,
                                      color: _ink)),
                              const SizedBox(height: 5),
                              Text(b.meta,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.inter(
                                      fontSize: 11,
                                      color: const Color(0xFF2563EB))),
                              const SizedBox(height: 5),
                              Text(b.excerpt,
                                  maxLines: 3,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.inter(
                                      fontSize: 11.5,
                                      height: 1.35,
                                      color: const Color(0xFF6B7A90))),
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
    );
  }
}

// ---------------------------------------------------------------- assistant button + sheet
class AssistantButton extends StatelessWidget {
  const AssistantButton({super.key});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => showAssistantSheet(context),
      child: Container(
        width: 52,
        height: 52,
        decoration: BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
          border: Border.all(color: const Color(0xFFE4E0F5)),
          boxShadow: [
            BoxShadow(
                color: const Color(0xFF8B5CF6).withValues(alpha: 0.25),
                blurRadius: 16,
                offset: const Offset(0, 6)),
          ],
        ),
        alignment: Alignment.center,
        child: const AiSparkleIcon(size: 26),
      ),
    );
  }
}

Future<void> showAssistantSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => const AssistantChatSheet(),
  );
}
