import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../models/booking_model.dart';
import '../../providers/booking_provider.dart';
import '../../providers/ai_call_provider.dart';
import '../../theme.dart';
import '../../utils/currency_formatter.dart';
import '../shared/property_image.dart';
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

  Widget _buildTabButton(
      String label, int count, bool isActive, VoidCallback onTap) {
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
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: isActive ? AppTheme.primary : AppTheme.charcoalLight,
                letterSpacing: 0,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: isActive
                    ? AppTheme.primary.withValues(alpha: 0.1)
                    : AppTheme.border,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: GoogleFonts.inter(
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

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    final cancelled = bookingProvider.guestBookings
        .where((bk) => bk.statusUi.isCancelledGroup)
        .toList();

    final past = bookingProvider.guestBookings.where((bk) {
      if (bk.statusUi.isCancelledGroup) return false;
      if (bk.statusUi.isCompletedGroup) return true;
      try {
        final checkOut = DateTime.parse(bk.checkOutDate);
        return checkOut.isBefore(today);
      } catch (_) {
        return false;
      }
    }).toList();

    final upcoming = bookingProvider.guestBookings.where((bk) {
      if (bk.statusUi.isCancelledGroup || bk.statusUi.isCompletedGroup) {
        return false;
      }
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
          style: GoogleFonts.inter(
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
              border:
                  Border(bottom: BorderSide(color: AppTheme.border, width: 1)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildTabButton(
                    'UPCOMING', upcoming.length, _activeTab == 'upcoming', () {
                  setState(() => _activeTab = 'upcoming');
                }),
                _buildTabButton('PAST', past.length, _activeTab == 'past', () {
                  setState(() => _activeTab = 'past');
                }),
                _buildTabButton(
                    'CANCELLED', cancelled.length, _activeTab == 'cancelled',
                    () {
                  setState(() => _activeTab = 'cancelled');
                }),
              ],
            ),
          ),
        ),
      ),
      body: bookingProvider.isLoading || aiCallProvider.isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppTheme.primary))
          : listToDisplay.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.bookmark_outline,
                          size: 48, color: AppTheme.charcoalMuted),
                      const SizedBox(height: 12),
                      Text(
                        'You have no bookings yet.',
                        style: GoogleFonts.inter(
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
                    final statusUi = bk.statusUi;

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
                        side:
                            const BorderSide(color: AppTheme.border, width: 1),
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
                                PropertyImage(
                                  imageUrl: (bk.propertyImages != null &&
                                          bk.propertyImages!.isNotEmpty)
                                      ? bk.propertyImages![0]
                                      : null,
                                  width: 100,
                                  height: 100,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                const SizedBox(width: 16),

                                // Text Details
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      // Location Tag & Status Badge
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Text(
                                              (bk.propertyCity != null &&
                                                      bk.propertyState != null)
                                                  ? '${bk.propertyCity!.toUpperCase()}, ${bk.propertyState!.toUpperCase()}'
                                                  : (bk.propertyCategory ??
                                                          'STAY')
                                                      .toUpperCase(),
                                              style: TextStyle(
                                                fontSize: 9,
                                                fontWeight: FontWeight.w800,
                                                color: Colors.orange.shade800,
                                                letterSpacing: 0,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 8, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: statusUi.color
                                                  .withValues(alpha: 0.10),
                                              borderRadius:
                                                  BorderRadius.circular(12),
                                              border: Border.all(
                                                color: statusUi.color
                                                    .withValues(alpha: 0.35),
                                                width: 0.5,
                                              ),
                                            ),
                                            child: Text(
                                              statusUi.label,
                                              style: TextStyle(
                                                color: statusUi.color,
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
                                        style: GoogleFonts.inter(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w800,
                                          color: AppTheme.charcoal,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 8),
                                      _bookingModeChip(bk),
                                      const SizedBox(height: 8),

                                      // Dates & Guest Count
                                      Row(
                                        children: [
                                          const Icon(
                                              Icons.calendar_today_outlined,
                                              size: 12,
                                              color: AppTheme.charcoalLight),
                                          const SizedBox(width: 6),
                                          Expanded(
                                            child: Text(
                                              '${bk.checkInDate} - ${bk.checkOutDate}  |  ${bk.numberOfGuests} Guest${bk.numberOfGuests > 1 ? 's' : ''}',
                                              style: GoogleFonts.inter(
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
                                        style: GoogleFonts.inter(
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
                                            final parsedDate =
                                                DateTime.parse(bk.createdAt)
                                                    .toLocal();
                                            formattedBookedOn = DateFormat(
                                                    'dd MMM yyyy, hh:mm a')
                                                .format(parsedDate);
                                          } catch (_) {
                                            formattedBookedOn = bk.createdAt;
                                          }
                                          return Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 6, vertical: 3),
                                            decoration: BoxDecoration(
                                              color: Colors.red.shade50
                                                  .withValues(alpha: 0.5),
                                              borderRadius:
                                                  BorderRadius.circular(4),
                                            ),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(Icons.access_time,
                                                    size: 10,
                                                    color: Colors.red.shade700),
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
                                      builder: (context) => AICallLogDialog(
                                          call: Map<String, dynamic>.from(
                                              matchingCall)),
                                    );
                                  },
                                  icon: const Icon(Icons.phone_in_talk,
                                      size: 14, color: Colors.green),
                                  label: const Text(
                                    'AI VOICE CALL LOG 📞',
                                    style: TextStyle(
                                        color: Colors.green,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 11),
                                  ),
                                  style: OutlinedButton.styleFrom(
                                    side: BorderSide(
                                        color: Colors.green.shade200),
                                    backgroundColor: Colors.green.shade50
                                        .withValues(alpha: 0.3),
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 10),
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
                                      style: GoogleFonts.inter(
                                        fontSize: 9,
                                        color: AppTheme.charcoalMuted,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      CurrencyFormatter.format(bk.totalAmount),
                                      style: GoogleFonts.inter(
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
                                        showDialog(
                                          context: context,
                                          builder: (context) =>
                                              _BookingDetailsDialog(
                                            booking: bk,
                                          ),
                                        );
                                      },
                                      child: Text(
                                        'VIEW DETAILS',
                                        style: GoogleFonts.inter(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w800,
                                          color: AppTheme.charcoalLight,
                                        ),
                                      ),
                                    ),

                                    // Cancel Button
                                    if (!bk.statusUi.isCancelledGroup) ...[
                                      const SizedBox(width: 8),
                                      TextButton(
                                        onPressed: () async {
                                          // Confirm cancel
                                          final confirm =
                                              await showDialog<bool>(
                                            context: context,
                                            builder: (context) => AlertDialog(
                                              title:
                                                  const Text('Cancel Booking?'),
                                              content: const Text(
                                                  'Are you sure you want to cancel this booking?'),
                                              actions: [
                                                TextButton(
                                                    onPressed: () =>
                                                        Navigator.pop(
                                                            context, false),
                                                    child: const Text('No')),
                                                TextButton(
                                                    onPressed: () =>
                                                        Navigator.pop(
                                                            context, true),
                                                    child: const Text(
                                                        'Yes, Cancel',
                                                        style: TextStyle(
                                                            color:
                                                                Colors.red))),
                                              ],
                                            ),
                                          );

                                          if (confirm == true &&
                                              context.mounted) {
                                            final success = await Provider.of<
                                                        BookingProvider>(
                                                    context,
                                                    listen: false)
                                                .cancelBooking(bk.bookingId);
                                            if (success && context.mounted) {
                                              ScaffoldMessenger.of(context)
                                                  .showSnackBar(
                                                const SnackBar(
                                                    content: Text(
                                                        'Booking Cancelled successfully.')),
                                              );
                                            }
                                          }
                                        },
                                        child: Text(
                                          'CANCEL',
                                          style: GoogleFonts.inter(
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

  Widget _bookingModeChip(bk) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.primary.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: AppTheme.primary.withValues(alpha: 0.25),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.flash_on_rounded, size: 12, color: AppTheme.primary),
          const SizedBox(width: 4),
          Text(
            'Instant Book',
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: AppTheme.primary,
            ),
          ),
        ],
      ),
    );
  }
}

class _BookingDetailsDialog extends StatelessWidget {
  final BookingModel booking;

  const _BookingDetailsDialog({required this.booking});

  @override
  Widget build(BuildContext context) {
    final statusUi = booking.statusUi;
    final coupon = booking.couponCode?.trim();
    final hasDiscount = booking.discountAmount > 0;
    final screen = MediaQuery.sizeOf(context);

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
      backgroundColor: Colors.transparent,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: 420,
          maxHeight: screen.height * 0.82,
        ),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(28),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.18),
                blurRadius: 32,
                offset: const Offset(0, 18),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(18, 18, 12, 16),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFFFFFBF1), Color(0xFFFFF4DD)],
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CircleAvatar(
                      radius: 24,
                      backgroundColor: AppTheme.primary.withValues(alpha: 0.14),
                      child: const Icon(Icons.receipt_long_rounded,
                          color: AppTheme.primary, size: 25),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            booking.propertyTitle ?? 'Booking Details',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(
                              fontSize: 19,
                              height: 1.15,
                              fontWeight: FontWeight.w900,
                              color: AppTheme.charcoal,
                            ),
                          ),
                          const SizedBox(height: 7),
                          Wrap(
                            spacing: 8,
                            runSpacing: 6,
                            children: [
                              _DetailStatusChip(
                                label: statusUi.label,
                                color: statusUi.color,
                              ),
                              _DetailStatusChip(
                                label: _paymentLabel(booking.paymentType),
                                color: AppTheme.primary,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
              ),
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(18, 16, 18, 4),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _DetailSection(
                        title: 'Trip Details',
                        children: [
                          _DetailRow(
                            icon: Icons.confirmation_number_outlined,
                            label: 'Booking ID',
                            value: booking.bookingId,
                          ),
                          _DetailRow(
                            icon: Icons.login_rounded,
                            label: 'Check-in',
                            value: _formatDate(booking.checkInDate),
                          ),
                          _DetailRow(
                            icon: Icons.logout_rounded,
                            label: 'Check-out',
                            value: _formatDate(booking.checkOutDate),
                          ),
                          _DetailRow(
                            icon: Icons.group_outlined,
                            label: 'Guests',
                            value: '${booking.numberOfGuests}',
                          ),
                          if (statusUi.description.trim().isNotEmpty)
                            _DetailNote(text: statusUi.description),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _DetailSection(
                        title: 'Payment Summary',
                        children: [
                          _AmountRow(
                            label: 'Base amount',
                            value: CurrencyFormatter.format(booking.baseAmount),
                          ),
                          if (coupon != null && coupon.isNotEmpty)
                            _AmountRow(label: 'Coupon', value: coupon),
                          if (hasDiscount)
                            _AmountRow(
                              label: 'Discount',
                              value:
                                  '-${CurrencyFormatter.format(booking.discountAmount)}',
                              valueColor: Colors.green.shade700,
                            ),
                          const Divider(height: 22, color: AppTheme.border),
                          _AmountRow(
                            label: 'Total paid',
                            value: CurrencyFormatter.format(
                              booking.totalAmount,
                              currencyCode: booking.currency,
                            ),
                            isTotal: true,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
                child: SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF07142F),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: Text(
                      'Close',
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
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

  static String _paymentLabel(String? value) {
    return value == 'advance' ? 'Advance Payment' : 'Full Payment';
  }

  static String _formatDate(String value) {
    final parsed = DateTime.tryParse(value);
    if (parsed == null) return value;
    return DateFormat('dd MMM yyyy').format(parsed);
  }
}

class _DetailSection extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _DetailSection({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFAF8F4),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w900,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 10),
          ...children,
        ],
      ),
    );
  }
}

class _DetailStatusChip extends StatelessWidget {
  final String label;
  final Color color;

  const _DetailStatusChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.11),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.22)),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w900,
          color: color,
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 9),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 17, color: AppTheme.primary),
          const SizedBox(width: 9),
          Expanded(
            child: Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: AppTheme.charcoalMuted,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Flexible(
            flex: 2,
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: GoogleFonts.inter(
                fontSize: 12.5,
                fontWeight: FontWeight.w900,
                color: AppTheme.charcoal,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailNote extends StatelessWidget {
  final String text;

  const _DetailNote({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 3),
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.border),
      ),
      child: Text(
        text,
        style: GoogleFonts.inter(
          fontSize: 12,
          height: 1.35,
          fontWeight: FontWeight.w600,
          color: AppTheme.charcoalMuted,
        ),
      ),
    );
  }
}

class _AmountRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isTotal;
  final Color? valueColor;

  const _AmountRow({
    required this.label,
    required this.value,
    this.isTotal = false,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: GoogleFonts.inter(
                fontSize: isTotal ? 14 : 12.5,
                fontWeight: isTotal ? FontWeight.w900 : FontWeight.w700,
                color: isTotal ? AppTheme.charcoal : AppTheme.charcoalMuted,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Flexible(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerRight,
              child: Text(
                value,
                style: GoogleFonts.inter(
                  fontSize: isTotal ? 17 : 13,
                  fontWeight: FontWeight.w900,
                  color: valueColor ?? AppTheme.charcoal,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
