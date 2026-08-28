import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../models/property_model.dart';
import '../../providers/property_provider.dart';
import '../../theme.dart';
import '../../utils/currency_formatter.dart';
import '../shared/property_image.dart';
import 'property_detail_screen.dart';

class OffersScreen extends StatelessWidget {
  const OffersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.charcoal,
        elevation: 0,
        title: Text(
          'Offers',
          style: GoogleFonts.manrope(fontWeight: FontWeight.w900),
        ),
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: context.read<PropertyProvider>().fetchBookingOffers(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(color: AppTheme.primary),
            );
          }
          final offers = snapshot.data ?? const [];
          if (offers.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(28),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircleAvatar(
                      radius: 34,
                      backgroundColor: AppTheme.primary.withValues(alpha: 0.10),
                      child: const Icon(Icons.local_offer_outlined,
                          color: AppTheme.primary, size: 34),
                    ),
                    const SizedBox(height: 18),
                    Text(
                      'No live offers right now',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.manrope(
                        fontSize: 19,
                        fontWeight: FontWeight.w900,
                        color: AppTheme.charcoal,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Admin-applied property offers will appear here.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.manrope(
                        fontSize: 13,
                        height: 1.4,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.charcoalMuted,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
            itemCount: offers.length,
            separatorBuilder: (_, __) => const SizedBox(height: 14),
            itemBuilder: (context, index) {
              final offer = offers[index];
              final propertyJson =
                  Map<String, dynamic>.from(offer['property'] as Map);
              final property = PropertyModel.fromJson(propertyJson);
              final couponCode = (offer['coupon_code'] ?? '').toString();
              final discountLabel =
                  (offer['discount_label'] ?? 'Offer available').toString();
              return _OfferPropertyCard(
                property: property,
                discountLabel: discountLabel,
                couponCode: couponCode,
              );
            },
          );
        },
      ),
    );
  }
}

class _OfferPropertyCard extends StatelessWidget {
  final PropertyModel property;
  final String discountLabel;
  final String couponCode;

  const _OfferPropertyCard({
    required this.property,
    required this.discountLabel,
    required this.couponCode,
  });

  @override
  Widget build(BuildContext context) {
    final hasRating = property.rating != null && property.rating! > 0;
    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => PropertyDetailScreen(
              propertyId: property.propertyId,
              initialCouponCode: couponCode,
            ),
          ),
        );
      },
      borderRadius: BorderRadius.circular(22),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: AppTheme.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 18,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                PropertyImage(
                  imageUrl:
                      property.images.isNotEmpty ? property.images.first : null,
                  width: double.infinity,
                  height: 172,
                  borderRadius: BorderRadius.zero,
                ),
                Positioned(
                  left: 12,
                  top: 12,
                  child: _OfferBadge(label: discountLabel),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    property.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.manrope(
                      fontSize: 17,
                      height: 1.18,
                      fontWeight: FontWeight.w900,
                      color: AppTheme.charcoal,
                    ),
                  ),
                  const SizedBox(height: 7),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined,
                          size: 15, color: AppTheme.charcoalMuted),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          '${property.city}, ${property.state}',
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
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${CurrencyFormatter.format(property.customerDisplayPrice)}${property.pricingUnitSuffix}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.manrope(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: AppTheme.primary,
                          ),
                        ),
                      ),
                      if (hasRating) ...[
                        const Icon(Icons.star_rounded,
                            size: 17, color: AppTheme.primary),
                        const SizedBox(width: 3),
                        Text(
                          property.rating!.toStringAsFixed(1),
                          style: GoogleFonts.manrope(
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            color: AppTheme.charcoal,
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (couponCode.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(
                      'Code $couponCode will be applied at booking.',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.manrope(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.charcoalMuted,
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
}

class _OfferBadge extends StatelessWidget {
  final String label;

  const _OfferBadge({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: AppTheme.primary,
        borderRadius: BorderRadius.circular(999),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.local_offer_rounded, size: 14, color: Colors.white),
          const SizedBox(width: 5),
          Text(
            label.toUpperCase(),
            style: GoogleFonts.manrope(
              fontSize: 11,
              fontWeight: FontWeight.w900,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}
