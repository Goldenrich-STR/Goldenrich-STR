import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../providers/account_provider.dart';
import '../../providers/booking_provider.dart';
import '../../providers/property_provider.dart';
import '../../theme.dart';

class HostPerformanceScreen extends StatefulWidget {
  const HostPerformanceScreen({super.key});

  @override
  State<HostPerformanceScreen> createState() => _HostPerformanceScreenState();
}

class _HostPerformanceScreenState extends State<HostPerformanceScreen> {
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final bookingProvider = context.read<BookingProvider>();
    final propertyProvider = context.read<PropertyProvider>();
    final accountProvider = context.read<AccountProvider>();
    await bookingProvider.getHostBookings();
    await propertyProvider.getHostProperties();
    await accountProvider.getHostPayouts();
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final bookingProvider = context.watch<BookingProvider>();
    final propertyProvider = context.watch<PropertyProvider>();
    final accountProvider = context.watch<AccountProvider>();
    final bookings = bookingProvider.hostBookings;
    final properties = propertyProvider.hostProperties;
    final payouts = accountProvider.payouts;

    final liveProperties = properties.where((p) => p.status == 'live').length;
    final confirmedOrCompleted = bookings
        .where((b) => ['confirmed', 'completed'].contains(b.bookingStatus))
        .toList();
    final cancelled =
        bookings.where((b) => b.bookingStatus == 'cancelled').length;
    final totalEarningsPaise = payouts
        .where((p) => p is Map && p['status'] == 'paid')
        .fold<num>(0, (sum, p) => sum + ((p['net_amount'] as num?) ?? 0));
    final upcomingPaise = payouts
        .where((p) =>
            p is Map &&
            ['eligible', 'processing', 'needs_destination']
                .contains(p['status']))
        .fold<num>(0, (sum, p) => sum + ((p['net_amount'] as num?) ?? 0));
    final cancellationRate =
        bookings.isEmpty ? 0.0 : (cancelled / bookings.length) * 100;

    int totalBookedDays = 0;
    final today = DateTime.now();
    final thirtyDaysAgo = today.subtract(const Duration(days: 30));
    for (final booking in confirmedOrCompleted) {
      try {
        final checkIn = DateTime.parse(booking.checkInDate);
        final checkOut = DateTime.parse(booking.checkOutDate);
        final start = checkIn.isBefore(thirtyDaysAgo) ? thirtyDaysAgo : checkIn;
        final end = checkOut.isAfter(today) ? today : checkOut;
        if (end.isAfter(start)) {
          totalBookedDays += end.difference(start).inDays;
        }
      } catch (_) {}
    }
    final totalAvailableDays = liveProperties * 30;
    final occupancyRate = totalAvailableDays == 0
        ? 0
        : ((totalBookedDays / totalAvailableDays) * 100).round().clamp(0, 100);

    final ratings = properties
        .where((p) => p.rating != null)
        .map((p) => p.rating!)
        .toList();
    final avgRating = ratings.isEmpty
        ? 0.0
        : ratings.reduce((a, b) => a + b) / ratings.length;

    final currency =
        NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
    final topReviews = confirmedOrCompleted.take(5).map((booking) {
      return {
        'guest': booking.guestName ?? 'Guest',
        'property': booking.propertyTitle ?? 'Property',
        'date': booking.createdAt,
      };
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF7F4EE),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          'Host Performance',
          style: GoogleFonts.inter(
            color: AppTheme.charcoal,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
                children: [
                  Text(
                    'Detailed insights into your earnings, occupancy, and guest momentum.',
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      height: 1.7,
                      color: AppTheme.charcoalMuted,
                    ),
                  ),
                  const SizedBox(height: 18),
                  GridView.count(
                    shrinkWrap: true,
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.05,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      _MetricCard(
                        title: 'Net Earnings',
                        value: currency.format(totalEarningsPaise / 100),
                        subtitle: 'Paid payouts',
                        icon: Icons.currency_rupee_rounded,
                      ),
                      _MetricCard(
                        title: 'Upcoming Payouts',
                        value: currency.format(upcomingPaise / 100),
                        subtitle: 'Awaiting release',
                        icon: Icons.account_balance_wallet_outlined,
                      ),
                      _MetricCard(
                        title: 'Occupancy Rate',
                        value: '$occupancyRate%',
                        subtitle: 'Last 30 days',
                        icon: Icons.percent_rounded,
                      ),
                      _MetricCard(
                        title: 'Cancellation Rate',
                        value: '${cancellationRate.toStringAsFixed(1)}%',
                        subtitle: 'Across bookings',
                        icon: Icons.cancel_outlined,
                      ),
                      _MetricCard(
                        title: 'Guest Rating',
                        value: avgRating == 0
                            ? '--'
                            : avgRating.toStringAsFixed(1),
                        subtitle: 'Average property rating',
                        icon: Icons.star_border_rounded,
                      ),
                      _MetricCard(
                        title: 'Live Properties',
                        value: '$liveProperties',
                        subtitle: '${properties.length} total listed',
                        icon: Icons.home_work_outlined,
                      ),
                    ],
                  ),
                  const SizedBox(height: 22),
                  _SummaryBlock(
                    title: 'Booking Snapshot',
                    children: [
                      _SummaryRow(
                        label: 'Total bookings',
                        value: '${bookings.length}',
                      ),
                      _SummaryRow(
                        label: 'Confirmed / Completed',
                        value: '${confirmedOrCompleted.length}',
                      ),
                      _SummaryRow(
                        label: 'Cancelled',
                        value: '$cancelled',
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _SummaryBlock(
                    title: 'Recent Guest Activity',
                    children: topReviews.isEmpty
                        ? [
                            Text(
                              'No recent completed booking activity yet.',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                color: AppTheme.charcoalMuted,
                              ),
                            ),
                          ]
                        : topReviews
                            .map(
                              (review) => Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      width: 38,
                                      height: 38,
                                      decoration: BoxDecoration(
                                        color: AppTheme.sand,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: const Icon(
                                        Icons.person_outline_rounded,
                                        color: AppTheme.primary,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            review['guest'] ?? '',
                                            style: GoogleFonts.inter(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w800,
                                              color: AppTheme.charcoal,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            review['property'] ?? '',
                                            style: GoogleFonts.inter(
                                              fontSize: 12,
                                              color: AppTheme.charcoalMuted,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            )
                            .toList(),
                  ),
                ],
              ),
            ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final IconData icon;

  const _MetricCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: AppTheme.sand,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: AppTheme.primary),
          ),
          const Spacer(),
          Text(
            title,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppTheme.charcoalMuted,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: GoogleFonts.inter(
              fontSize: 11,
              color: AppTheme.charcoalMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryBlock extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _SummaryBlock({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;

  const _SummaryRow({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 13,
                color: AppTheme.charcoalMuted,
              ),
            ),
          ),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoal,
            ),
          ),
        ],
      ),
    );
  }
}
