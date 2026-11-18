import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Units of a property for the people who verify listings (broker, RM, branch
/// manager). Read-only, same wording as the website review screens. Flags a
/// unit that is missing a name, price or guest count.
class UnitsReviewCard extends StatelessWidget {
  final bool hasUnits;
  final List<Map<String, dynamic>> units;

  const UnitsReviewCard({super.key, required this.hasUnits, required this.units});

  /// From the raw property JSON the review endpoints return.
  factory UnitsReviewCard.fromProperty(Map<String, dynamic> property) {
    final list = (property['units'] as List? ?? const [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
    return UnitsReviewCard(hasUnits: property['has_units'] == true, units: list);
  }

  /// The host's own price per night (`price_per_night`, older data used `price`).
  static num? _price(Map<String, dynamic> u) =>
      (u['price_per_night'] ?? u['price']) as num?;

  static bool _missing(Map<String, dynamic> u) =>
      (u['name'] ?? '').toString().trim().isEmpty ||
      ((_price(u)) ?? 0) <= 0 ||
      ((u['max_guests'] as num?) ?? 0) <= 0;

  static const _ink = Color(0xFF1B1924);
  static const _muted = Color(0xFF6B7280);

  Widget _kv(String k, String v) => Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(k.toUpperCase(),
                style: GoogleFonts.inter(
                    fontSize: 9.5, fontWeight: FontWeight.w700, color: _muted)),
            const SizedBox(height: 2),
            Text(v,
                style: GoogleFonts.inter(
                    fontSize: 12.5, fontWeight: FontWeight.w700, color: _ink)),
          ],
        ),
      );

  @override
  Widget build(BuildContext context) {
    final listed = hasUnits && units.isNotEmpty;
    final emptyButOn = hasUnits && units.isEmpty;
    final bad = units.where(_missing).length;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE3E3E3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
              listed
                  ? '${units.length} unit${units.length == 1 ? '' : 's'} listed'
                  : 'Units & Pricing',
              style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          if (!listed && !emptyButOn)
            Text('Single property. The host did not split it into units.',
                style: GoogleFonts.inter(fontSize: 12.5, color: _muted)),
          if (emptyButOn)
            Text(
                'Units are switched on but no unit is listed. Ask the host to add the units or turn them off.',
                style: GoogleFonts.inter(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: Colors.red.shade700)),
          if (listed && bad > 0)
            Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                  color: const Color(0xFFFFF4E0),
                  borderRadius: BorderRadius.circular(10)),
              child: Text(
                  '$bad unit${bad == 1 ? ' is' : 's are'} incomplete (name, price or guest count missing). Do not approve until the host fixes it.',
                  style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF8A5A00))),
            ),
          if (listed)
            for (final u in units)
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: _missing(u)
                      ? const Color(0x14FFB300)
                      : const Color(0xFFF7F7F7),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color: _missing(u)
                          ? const Color(0xFFFFC107)
                          : const Color(0xFFE8E8E8)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                              (u['name'] ?? '').toString().isEmpty
                                  ? 'Unnamed unit'
                                  : u['name'].toString(),
                              style: GoogleFonts.inter(
                                  fontSize: 14, fontWeight: FontWeight.w800)),
                        ),
                        Text((u['tier'] ?? 'standard').toString().toUpperCase(),
                            style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: _muted)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(children: [
                      _kv(
                          'Price',
                          ((_price(u)) ?? 0) > 0
                              ? 'Rs. ${_price(u)!.round()} / night'
                              : 'Missing'),
                      _kv(
                          'Max guests',
                          ((u['max_guests'] as num?) ?? 0) > 0
                              ? '${u['max_guests']}'
                              : 'Missing'),
                    ]),
                    const SizedBox(height: 6),
                    Row(children: [
                      _kv(
                          'Configuration',
                          (u['bhk_type'] ?? '').toString().isEmpty
                              ? '-'
                              : u['bhk_type'].toString().replaceAll('_', ' ')),
                      _kv(
                          'Area',
                          ((u['area_sqft'] as num?) ?? 0) > 0
                              ? '${u['area_sqft']} sq ft'
                              : '-'),
                    ]),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}
