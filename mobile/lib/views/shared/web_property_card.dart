import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../models/property_model.dart';
import '../../providers/property_provider.dart';
import '../../utils/currency_formatter.dart';
import '../../utils/wishlist_action.dart';
import 'card_badges.dart';
import 'property_image.dart';

/// Property card laid out like the website's cards: photo with type ribbon,
/// heart and rating, then title, place, guests line and "Starting from" price.
class WebPropertyCard extends StatelessWidget {
  final PropertyModel property;
  final VoidCallback onTap;

  /// When set, the gold type ribbon is replaced by a dark "series" ribbon.
  final String? seriesRibbon;

  const WebPropertyCard({
    super.key,
    required this.property,
    required this.onTap,
    this.seriesRibbon,
  });

  String get _typeLabel {
    final raw = property.propertyType.trim().replaceAll('_', ' ');
    if (raw.isEmpty) return '';
    return raw
        .split(' ')
        .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
        .join(' ');
  }

  @override
  Widget build(BuildContext context) {
    final wishlisted =
        context.watch<PropertyProvider>().isWishlisted(property.propertyId);
    final hasRating = property.rating != null && property.rating! > 0;
    final bestRated = hasRating && property.rating! >= 4.5;
    final place = [property.city, property.state]
        .where((e) => e.trim().isNotEmpty)
        .join(', ');

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                ClipRRect(
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(16)),
                  child: AspectRatio(
                    aspectRatio: 16 / 10,
                    child: PropertyImage(
                      imageUrl: property.images.isNotEmpty
                          ? property.images.first
                          : null,
                      width: double.infinity,
                      height: double.infinity,
                    ),
                  ),
                ),
                if (seriesRibbon != null || _typeLabel.isNotEmpty)
                  Positioned(
                    left: -6,
                    top: 12,
                    child: CardRibbon(
                        label: seriesRibbon ?? _typeLabel,
                        series: seriesRibbon != null),
                  ),
                Positioned(
                  top: 10,
                  right: 12,
                  child: GestureDetector(
                    onTap: () =>
                        handleWishlistTap(context, property.propertyId),
                    child: Icon(
                      LucideIcons.heart,
                      size: 22,
                      color: wishlisted ? Colors.red : Colors.white,
                      fill: wishlisted ? 1 : 0,
                      shadows: const [
                        Shadow(color: Colors.black45, blurRadius: 6)
                      ],
                    ),
                  ),
                ),
                if (hasRating)
                  Positioned(
                    left: 12,
                    bottom: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 9, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.55),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(property.rating!.toStringAsFixed(1),
                              style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white)),
                          const SizedBox(width: 3),
                          const Icon(Icons.star_rounded,
                              size: 13, color: Color(0xFFFBBF24)),
                        ],
                      ),
                    ),
                  ),
                if (bestRated)
                  const Positioned(right: -6, bottom: 12, child: BestRatedTag()),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(property.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF1B1924))),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(LucideIcons.mapPin,
                          size: 14, color: Color(0xFF4A5568)),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(place,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(
                                fontSize: 12.5,
                                color: const Color(0xFF4A5568))),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Upto ${property.maxGuests} ${property.participantLabel[0].toUpperCase()}${property.participantLabel.substring(1)}'
                    '${property.areaSqft > 0 ? '  ✦  ${property.areaSqft.round()} sq.ft' : ''}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                        fontSize: 12, color: const Color(0xFF4A5568)),
                  ),
                  const SizedBox(height: 12),
                  const Divider(height: 1, color: Color(0xFFEDEDED)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (property.hasUnits)
                              Text('Starting from',
                                  style: GoogleFonts.inter(
                                      fontSize: 11,
                                      color: const Color(0xFF6B6B6B))),
                            Text(
                              CurrencyFormatter.format(
                                  property.customerDisplayPrice),
                              style: GoogleFonts.inter(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF1B1924)),
                            ),
                            const SizedBox(height: 2),
                            Text(
                                'For Per ${property.pricingUnitLabel[0].toUpperCase()}${property.pricingUnitLabel.substring(1)} + Taxes',
                                style: GoogleFonts.inter(
                                    fontSize: 11.5,
                                    color: const Color(0xFF6B6B6B))),
                          ],
                        ),
                      ),
                      const Icon(LucideIcons.arrowRight,
                          size: 20, color: Color(0xFF1B1924)),
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
}
