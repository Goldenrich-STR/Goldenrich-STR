import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../providers/booking_provider.dart';
import '../../providers/ai_call_provider.dart';
import '../../theme.dart';
import 'ai_call_log_dialog.dart';

class GuestBookingsScreen extends StatefulWidget {
  const GuestBookingsScreen({super.key});

  @override
  State<GuestBookingsScreen> createState() => _GuestBookingsScreenState();
}

class _GuestBookingsScreenState extends State<GuestBookingsScreen> {
  String _activeTab = 'upcoming';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<BookingProvider>(context, listen: false).getGuestBookings();
      Provider.of<AICallProvider>(context, listen: false).getMyCalls();
    });
  }

  Widget _buildTabButton(String label, int count, bool isActive, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: isActive ? AppTheme.primary : Colors.transparent,
              width: 3,
            ),
          ),
        ),
        child: Row(
          children: [
            Text(
              label,
              style: GoogleFonts.manrope(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: isActive ? AppTheme.primary : AppTheme.charcoalLight,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: isActive ? AppTheme.primary.withOpacity(0.1) : AppTheme.border,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: GoogleFonts.manrope(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: isActive ? AppTheme.primary : AppTheme.charcoalLight,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bookingProvider = Provider.of<BookingProvider>(context);
    final aiCallProvider = Provider.of<AICallProvider>(context);
    final textTheme = Theme.of(context).textTheme;

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    final cancelled = bookingProvider.guestBookings.where((bk) => bk.bookingStatus.toLowerCase() == 'cancelled').toList();

    final past = bookingProvider.guestBookings.where((bk) {
      if (bk.bookingStatus.toLowerCase() == 'cancelled') return false;
      try {
        final checkOut = DateTime.parse(bk.checkOutDate);
        return checkOut.isBefore(today);
      } catch (_) {
        return false;
      }
    }).toList();

    final upcoming = bookingProvider.guestBookings.where((bk) {
      if (bk.bookingStatus.toLowerCase() == 'cancelled') return false;
      try {
        final checkOut = DateTime.parse(bk.checkOutDate);
        return !checkOut.isBefore(today);
      } catch (_) {
        return true;
      }
    }).toList();

    final listToDisplay = _activeTab == 'upcoming'
        ? upcoming
        : _activeTab == 'past'
            ? past
            : cancelled;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(
          'My Bookings',
          style: GoogleFonts.manrope(
            fontWeight: FontWeight.w800,
            fontSize: 24,
            color: AppTheme.primary,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: AppTheme.border, width: 1)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildTabButton('UPCOMING', upcoming.length, _activeTab == 'upcoming', () {
                  setState(() => _activeTab = 'upcoming');
                }),
                _buildTabButton('PAST', past.length, _activeTab == 'past', () {
                  setState(() => _activeTab = 'past');
                }),
                _buildTabButton('CANCELLED', cancelled.length, _activeTab == 'cancelled', () {
                  setState(() => _activeTab = 'cancelled');
                }),
              ],
            ),
          ),
        ),
      ),
      body: bookingProvider.isLoading || aiCallProvider.isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : listToDisplay.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.bookmark_outline, size: 48, color: AppTheme.charcoalMuted),
                      const SizedBox(height: 12),
                      Text(
                        'You have no bookings yet.',
                        style: GoogleFonts.manrope(
                          fontSize: 14,
                          color: AppTheme.charcoalMuted,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  itemCount: listToDisplay.length,
                  padding: const EdgeInsets.all(16.0),
                  itemBuilder: (context, index) {
                    final bk = listToDisplay[index];
                    final isConfirmed = bk.bookingStatus.toLowerCase() == 'confirmed' || bk.bookingStatus.toLowerCase() == 'paid';

                    // Match AI Calls
                    final matchingCall = aiCallProvider.myCalls.firstWhere(
                      (c) => c['booking_id'] == bk.bookingId,
                      orElse: () => null,
                    );

                    return Card(
                      margin: const EdgeInsets.only(bottom: 16.0),
                      elevation: 0,
                      color: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: const BorderSide(color: AppTheme.border, width: 1),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // TOP SECTION: Image & Main Details
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Property Image
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(12),
                                  child: Image.network(
                                    (bk.propertyImages != null && bk.propertyImages!.isNotEmpty)
                                        ? bk.propertyImages![0]
                                        : 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
                                    width: 100,
                                    height: 100,
                                    fit: BoxFit.cover,
                                    errorBuilder: (context, error, stackTrace) {
                                      return Container(
                                        width: 100,
                                        height: 100,
                                        color: AppTheme.border,
                                        child: const Icon(Icons.image, color: AppTheme.charcoalMuted),
                                      );
                                    },
                                  ),
                                ),
                                const SizedBox(width: 16),

                                // Text Details
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      // Location Tag & Status Badge
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Text(
                                              (bk.propertyCity != null && bk.propertyState != null)
                                                  ? '${bk.propertyCity!.toUpperCase()}, ${bk.propertyState!.toUpperCase()}'
                                                  : (bk.propertyCategory ?? 'STAY').toUpperCase(),
                                              style: TextStyle(
                                                fontSize: 9,
                                                fontWeight: FontWeight.w800,
                                                color: Colors.orange.shade800,
                                                letterSpacing: 0.5,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: isConfirmed
                                                  ? Colors.green.shade50
                                                  : (bk.bookingStatus.toLowerCase() == 'cancelled'
                                                      ? Colors.red.shade50
                                                      : Colors.orange.shade50),
                                              borderRadius: BorderRadius.circular(12),
                                              border: Border.all(
                                                color: isConfirmed
                                                    ? Colors.green.shade200
                                                    : (bk.bookingStatus.toLowerCase() == 'cancelled'
                                                        ? Colors.red.shade200
                                                        : Colors.orange.shade200),
                                                width: 0.5,
                                              ),
                                            ),
                                            child: Text(
                                              bk.bookingStatus.toUpperCase(),
                                              style: TextStyle(
                                                color: isConfirmed
                                                    ? Colors.green.shade700
                                                    : (bk.bookingStatus.toLowerCase() == 'cancelled'
                                                        ? Colors.red.shade700
                                                        : Colors.orange.shade700),
                                                fontWeight: FontWeight.bold,
                                                fontSize: 8,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),

                                      // Property Title
                                      Text(
                                        bk.propertyTitle ?? 'Property Rental',
                                        style: GoogleFonts.manrope(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w800,
                                          color: AppTheme.charcoal,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 8),

                                      // Dates & Guest Count
                                      Row(
                                        children: [
                                          const Icon(Icons.calendar_today_outlined, size: 12, color: AppTheme.charcoalLight),
                                          const SizedBox(width: 6),
                                          Expanded(
                                            child: Text(
                                              '${bk.checkInDate} - ${bk.checkOutDate}  |  ${bk.numberOfGuests} Guest${bk.numberOfGuests > 1 ? 's' : ''}',
                                              style: GoogleFonts.manrope(
                                                fontSize: 11,
                                                color: AppTheme.charcoalLight,
                                                fontWeight: FontWeight.w500,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),

                                      // Booking ID
                                      Text(
                                        'BOOKING ID: ${bk.bookingId}',
                                        style: GoogleFonts.manrope(
                                          fontSize: 9,
                                          color: AppTheme.charcoalMuted,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      const SizedBox(height: 6),

                                      // Booked On Badge
                                      if (bk.createdAt.isNotEmpty) ...[
                                        Builder(builder: (context) {
                                          String formattedBookedOn = '';
                                          try {
                                            final parsedDate = DateTime.parse(bk.createdAt).toLocal();
                                            formattedBookedOn = DateFormat('dd MMM yyyy, hh:mm a').format(parsedDate);
                                          } catch (_) {
                                            formattedBookedOn = bk.createdAt;
                                          }
                                          return Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                            decoration: BoxDecoration(
                                              color: Colors.red.shade50.withOpacity(0.5),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(Icons.access_time, size: 10, color: Colors.red.shade700),
                                                const SizedBox(width: 4),
                                                Text(
                                                  'BOOKED ON: $formattedBookedOn',
                                                  style: TextStyle(
                                                    fontSize: 8,
                                                    color: Colors.red.shade700,
                                                    fontWeight: FontWeight.w800,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          );
                                        }),
                                      ],
                                    ],
                                  ),
                                ),
                              ],
                            ),

                            // AI Voice Call Log Button
                            if (matchingCall != null) ...[
                              const SizedBox(height: 12),
                              SizedBox(
                                width: double.infinity,
                                child: OutlinedButton.icon(
                                  onPressed: () {
                                    showDialog(
                                      context: context,
                                      builder: (context) => AICallLogDialog(call: Map<String, dynamic>.from(matchingCall)),
                                    );
                                  },
                                  icon: const Icon(Icons.phone_in_talk, size: 14, color: Colors.green),
                                  label: const Text(
                                    'AI VOICE CALL LOG 📞',
                                    style: TextStyle(color: Colors.green, fontWeight: FontWeight.w800, fontSize: 11),
                                  ),
                                  style: OutlinedButton.styleFrom(
                                    side: BorderSide(color: Colors.green.shade200),
                                    backgroundColor: Colors.green.shade50.withOpacity(0.3),
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                ),
                              ),
                            ],

                            const SizedBox(height: 12),
                            const Divider(color: AppTheme.border, height: 1),
                            const SizedBox(height: 12),

                            // BOTTOM SECTION: Price & Action Buttons
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                // Price Details
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'TOTAL PAID',
                                      style: GoogleFonts.manrope(
                                        fontSize: 9,
                                        color: AppTheme.charcoalMuted,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '₹${NumberFormat('#,##,###').format(bk.totalAmount)}',
                                      style: GoogleFonts.manrope(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w800,
                                        color: AppTheme.charcoal,
                                      ),
                                    ),
                                  ],
                                ),

                                // Buttons Row
                                Row(
                                  children: [
                                    // View Details Button
                                    TextButton(
                                      onPressed: () {
                                        // Show a quick details dialog
                                        showDialog(
                                          context: context,
                                          builder: (context) => AlertDialog(
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                            title: Text(bk.propertyTitle ?? 'Booking Details'),
                                            content: SingleChildScrollView(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  Text('Booking ID: ${bk.bookingId}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                                  const SizedBox(height: 8),
                                                  Text('Check In: ${bk.checkInDate}'),
                                                  Text('Check Out: ${bk.checkOutDate}'),
                                                  Text('Guests: ${bk.numberOfGuests}'),
                                                  Text('Payment Status: ${bk.paymentStatus ?? "Paid"}'),
                                                  Text('Payment Type: ${(bk.paymentType ?? "Full").toUpperCase()}'),
                                                  if (bk.couponCode != null) Text('Coupon Applied: ${bk.couponCode}'),
                                                  const Divider(),
                                                  Text('Base Amount: ₹${NumberFormat('#,##,###').format(bk.baseAmount)}'),
                                                  if (bk.discountAmount > 0) Text('Discount: -₹${NumberFormat('#,##,###').format(bk.discountAmount)}'),
                                                  Text('Total Paid: ₹${NumberFormat('#,##,###').format(bk.totalAmount)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                                ],
                                              ),
                                            ),
                                            actions: [
                                              TextButton(
                                                onPressed: () => Navigator.pop(context),
                                                child: const Text('Close'),
                                              )
                                            ],
                                          ),
                                        );
                                      },
                                      child: Text(
                                        'VIEW DETAILS',
                                        style: GoogleFonts.manrope(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w800,
                                          color: AppTheme.charcoalLight,
                                        ),
                                      ),
                                    ),

                                    // Cancel Button
                                    if (bk.bookingStatus.toLowerCase() != 'cancelled') ...[
                                      const SizedBox(width: 8),
                                      TextButton(
                                        onPressed: () async {
                                          // Confirm cancel
                                          final confirm = await showDialog<bool>(
                                            context: context,
                                            builder: (context) => AlertDialog(
                                              title: const Text('Cancel Booking?'),
                                              content: const Text('Are you sure you want to cancel this booking?'),
                                              actions: [
                                                TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('No')),
                                                TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Yes, Cancel', style: TextStyle(color: Colors.red))),
                                              ],
                                            ),
                                          );

                                          if (confirm == true && context.mounted) {
                                            final success = await Provider.of<BookingProvider>(context, listen: false)
                                                .cancelBooking(bk.bookingId);
                                            if (success && context.mounted) {
                                              ScaffoldMessenger.of(context).showSnackBar(
                                                const SnackBar(content: Text('Booking Cancelled successfully.')),
                                              );
                                            }
                                          }
                                        },
                                        child: Text(
                                          'CANCEL',
                                          style: GoogleFonts.manrope(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w800,
                                            color: Colors.red.shade700,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
