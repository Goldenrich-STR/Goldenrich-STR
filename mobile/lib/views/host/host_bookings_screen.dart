import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../providers/booking_provider.dart';
import '../../providers/ai_call_provider.dart';
import '../../theme.dart';
import '../guest/ai_call_log_dialog.dart';

class HostBookingsScreen extends StatefulWidget {
  const HostBookingsScreen({super.key});

  @override
  State<HostBookingsScreen> createState() => _HostBookingsScreenState();
}

class _HostBookingsScreenState extends State<HostBookingsScreen> {
  String _activeTab = 'all';
  String _searchQuery = '';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<BookingProvider>(context, listen: false).getHostBookings();
      Provider.of<AICallProvider>(context, listen: false).getMyCalls();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Widget _buildTabButton(String key, String label, int count) {
    final isActive = _activeTab == key;
    return GestureDetector(
      onTap: () => setState(() => _activeTab = key),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 14),
        decoration: BoxDecoration(
          color: isActive ? AppTheme.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isActive ? AppTheme.primary : AppTheme.stone,
            width: 1,
          ),
        ),
        child: Row(
          children: [
            Text(
              label,
              style: GoogleFonts.manrope(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: isActive ? Colors.white : AppTheme.charcoalLight,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
              decoration: BoxDecoration(
                color: isActive ? Colors.white.withOpacity(0.2) : AppTheme.stone,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: GoogleFonts.manrope(
                  fontSize: 9,
                  fontWeight: FontWeight.w800,
                  color: isActive ? Colors.white : AppTheme.charcoal,
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

    // Apply filters
    final allBookings = bookingProvider.hostBookings;

    final filteredBySearch = allBookings.where((bk) {
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      final title = (bk.propertyTitle ?? '').toLowerCase();
      final guest = (bk.guestName ?? '').toLowerCase();
      final id = bk.bookingId.toLowerCase();
      return title.contains(q) || guest.contains(q) || id.contains(q);
    }).toList();

    final pending = filteredBySearch.where((bk) => bk.bookingStatus.toLowerCase() == 'pending' || bk.bookingStatus.toLowerCase() == 'soft_lock').toList();
    final confirmed = filteredBySearch.where((bk) => bk.bookingStatus.toLowerCase() == 'confirmed' || bk.bookingStatus.toLowerCase() == 'paid').toList();
    final cancelled = filteredBySearch.where((bk) => bk.bookingStatus.toLowerCase() == 'cancelled').toList();

    final listToDisplay = _activeTab == 'confirmed'
        ? confirmed
        : _activeTab == 'pending'
            ? pending
            : _activeTab == 'cancelled'
                ? cancelled
                : filteredBySearch;

    // Aggregates
    final totalEarnings = allBookings
        .where((bk) => bk.bookingStatus.toLowerCase() == 'confirmed' || bk.bookingStatus.toLowerCase() == 'paid')
        .fold<double>(0.0, (sum, bk) => sum + bk.totalAmount);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(
          'Booking Manager',
          style: GoogleFonts.manrope(
            fontWeight: FontWeight.w800,
            fontSize: 22,
            color: AppTheme.primary,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
      ),
      body: bookingProvider.isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : Column(
              children: [
                // 1. Stats Bar
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50.withOpacity(0.2),
                    border: const Border(bottom: BorderSide(color: AppTheme.stone)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'RESERVATIONS VALUE',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.charcoalLight,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '₹${NumberFormat('#,##,###').format(totalEarnings)}',
                            style: GoogleFonts.manrope(
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                              color: AppTheme.primary,
                            ),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text(
                            'TOTAL BOOKINGS',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.charcoalLight,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${allBookings.length}',
                            style: GoogleFonts.manrope(
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                              color: AppTheme.charcoal,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // 2. Search & Filters Bar
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Search by Guest, Property, or Booking ID',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _searchQuery = '');
                              },
                            )
                          : null,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                    ),
                    onChanged: (val) => setState(() => _searchQuery = val.trim()),
                  ),
                ),

                // Tab selectors
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
                  child: Row(
                    children: [
                      _buildTabButton('all', 'ALL', filteredBySearch.length),
                      const SizedBox(width: 8),
                      _buildTabButton('confirmed', 'CONFIRMED', confirmed.length),
                      const SizedBox(width: 8),
                      _buildTabButton('pending', 'PENDING', pending.length),
                      const SizedBox(width: 8),
                      _buildTabButton('cancelled', 'CANCELLED', cancelled.length),
                    ],
                  ),
                ),

                const Divider(height: 1, color: AppTheme.stone),

                // 3. Bookings List
                Expanded(
                  child: listToDisplay.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.book_online_outlined, size: 48, color: AppTheme.charcoalMuted),
                              const SizedBox(height: 12),
                              Text(
                                'No bookings match filters.',
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
                            final isCancelled = bk.bookingStatus.toLowerCase() == 'cancelled';

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
                                side: const BorderSide(color: AppTheme.stone, width: 1),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.all(16.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Status Badge & Location Row
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
                                                : (isCancelled ? Colors.red.shade50 : Colors.orange.shade50),
                                            borderRadius: BorderRadius.circular(12),
                                            border: Border.all(
                                              color: isConfirmed
                                                  ? Colors.green.shade200
                                                  : (isCancelled ? Colors.red.shade200 : Colors.orange.shade200),
                                              width: 0.5,
                                            ),
                                          ),
                                          child: Text(
                                            bk.bookingStatus.toUpperCase(),
                                            style: TextStyle(
                                              color: isConfirmed
                                                  ? Colors.green.shade700
                                                  : (isCancelled ? Colors.red.shade700 : Colors.orange.shade700),
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
                                      bk.propertyTitle ?? 'Property Listing',
                                      style: GoogleFonts.manrope(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w800,
                                        color: AppTheme.charcoal,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 8),

                                    // Guest Contact Card
                                    Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: AppTheme.stone.withOpacity(0.2),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Row(
                                        children: [
                                          CircleAvatar(
                                            backgroundColor: AppTheme.primary.withOpacity(0.1),
                                            radius: 18,
                                            child: const Icon(Icons.person, color: AppTheme.primary, size: 18),
                                          ),
                                          const SizedBox(width: 10),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  bk.guestName ?? 'STR Guest',
                                                  style: GoogleFonts.manrope(fontWeight: FontWeight.bold, fontSize: 13),
                                                ),
                                                Text(
                                                  '${bk.guestPhone ?? "No Phone"}  |  ${bk.guestEmail ?? "No Email"}',
                                                  style: const TextStyle(fontSize: 10, color: AppTheme.charcoalLight),
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),

                                    const SizedBox(height: 12),

                                    // Dates & Guest Count
                                    Row(
                                      children: [
                                        const Icon(Icons.calendar_today_outlined, size: 12, color: AppTheme.charcoalLight),
                                        const SizedBox(width: 6),
                                        Expanded(
                                          child: Text(
                                            '${bk.checkInDate} - ${bk.checkOutDate}  |  ${bk.numberOfGuests} Guest${bk.numberOfGuests > 1 ? "s" : ""}',
                                            style: GoogleFonts.manrope(
                                              fontSize: 11,
                                              color: AppTheme.charcoalLight,
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),

                                    // Booking ID
                                    const SizedBox(height: 4),
                                    Text(
                                      'BOOKING ID: ${bk.bookingId}',
                                      style: GoogleFonts.manrope(
                                        fontSize: 9,
                                        color: AppTheme.charcoalMuted,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),

                                    // AI Call Log button
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
                                            'PLAY AI CALL LOG 📞',
                                            style: TextStyle(color: Colors.green, fontWeight: FontWeight.w800, fontSize: 11),
                                          ),
                                          style: OutlinedButton.styleFrom(
                                            side: BorderSide(color: Colors.green.shade200),
                                            backgroundColor: Colors.green.shade50.withOpacity(0.3),
                                            padding: const EdgeInsets.symmetric(vertical: 10),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                          ),
                                        ),
                                      ),
                                    ],

                                    const SizedBox(height: 12),
                                    const Divider(color: AppTheme.stone, height: 1),
                                    const SizedBox(height: 12),

                                    // Total value & details
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'RESERVATION VALUE',
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
                                        TextButton(
                                          onPressed: () {
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
                                                      Text('Guest: ${bk.guestName ?? "Guest"}'),
                                                      Text('Email: ${bk.guestEmail ?? "N/A"}'),
                                                      Text('Phone: ${bk.guestPhone ?? "N/A"}'),
                                                      const Divider(),
                                                      Text('Check In: ${bk.checkInDate}'),
                                                      Text('Check Out: ${bk.checkOutDate}'),
                                                      Text('Guests: ${bk.numberOfGuests}'),
                                                      Text('Status: ${bk.bookingStatus.toUpperCase()}'),
                                                      Text('Payment Status: ${bk.paymentStatus ?? "Paid"}'),
                                                      const Divider(),
                                                      Text('Base Price: ₹${NumberFormat('#,##,###').format(bk.baseAmount)}'),
                                                      if (bk.discountAmount > 0) Text('Discount: -₹${NumberFormat('#,##,###').format(bk.discountAmount)}'),
                                                      Text('Total Amount: ₹${NumberFormat('#,##,###').format(bk.totalAmount)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
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
                                            'DETAILS',
                                            style: GoogleFonts.manrope(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w800,
                                              color: AppTheme.primary,
                                            ),
                                          ),
                                        ),
                                      ],
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
}
