import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../models/booking_model.dart';
import '../../models/property_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/booking_provider.dart';
import '../../theme.dart';
import '../../utils/currency_formatter.dart';
import '../shared/property_image.dart';

class BookingFlowScreen extends StatefulWidget {
  final PropertyModel property;
  final DateTime? initialCheckInDate;
  final DateTime? initialCheckOutDate;
  final int? initialGuestCount;
  final String? initialCouponCode;

  const BookingFlowScreen({
    super.key,
    required this.property,
    this.initialCheckInDate,
    this.initialCheckOutDate,
    this.initialGuestCount,
    this.initialCouponCode,
  });

  @override
  State<BookingFlowScreen> createState() => _BookingFlowScreenState();
}

class _BookingFlowScreenState extends State<BookingFlowScreen> {
  late final Razorpay _razorpay;
  final _couponController = TextEditingController();
  final _requestController = TextEditingController();
  int _step = 0;
  DateTime? _checkIn;
  DateTime? _checkOut;
  int _adults = 1;
  int _children = 0;
  String _slot = 'morning';
  String _foodPreference = 'veg';
  String _paymentType = 'full';
  String _paymentMethod = 'razorpay';
  Map<String, dynamic>? _quote;
  BookingModel? _pendingBooking;
  bool _loadingQuote = false;
  bool _preparingPayment = false;
  bool _verifyingPayment = false;
  bool _checkingPayment = false;
  String? _error;

  bool get _isEvent => widget.property.category.toLowerCase() == 'event_venue';
  bool get _isInstantBook => widget.property.isInstantBook;
  int get _guestCount => _adults + _children;
  int get _maxGuests => widget.property.maxGuests;

  @override
  void initState() {
    super.initState();
    _checkIn = widget.initialCheckInDate;
    _checkOut = widget.initialCheckOutDate;
    final initialGuests = widget.initialGuestCount;
    if (initialGuests != null && initialGuests > 0) {
      _adults = initialGuests.clamp(1, _maxGuests);
      _children = 0;
    }
    final initialCoupon = widget.initialCouponCode?.trim().toUpperCase();
    if (initialCoupon != null && initialCoupon.isNotEmpty) {
      _couponController.text = initialCoupon;
    }
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
  }

  @override
  void dispose() {
    _razorpay.clear();
    _couponController.dispose();
    _requestController.dispose();
    super.dispose();
  }

  String _money(num? value, {String? currencyCode}) =>
      CurrencyFormatter.format(value, currencyCode: currencyCode);

  String _apiDate(DateTime date) => DateFormat('yyyy-MM-dd').format(date);

  Future<void> _persistRecoveryContext(BookingModel booking) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('pending_booking_id', booking.bookingId);
    await prefs.setString('pending_property_id', widget.property.propertyId);
    await prefs.setString(
        'pending_razorpay_order_id', booking.razorpayOrderId ?? '');
  }

  Future<void> _clearRecoveryContext() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('pending_booking_id');
    await prefs.remove('pending_property_id');
    await prefs.remove('pending_razorpay_order_id');
  }

  Future<void> _pickDate({required bool checkout}) async {
    final now = DateTime.now();
    final firstDate = checkout && _checkIn != null
        ? _checkIn!.add(const Duration(days: 1))
        : now;
    final picked = await showDatePicker(
      context: context,
      initialDate:
          firstDate.isAfter(now) ? firstDate : now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked == null) return;
    setState(() {
      if (checkout) {
        _checkOut = picked;
      } else {
        _checkIn = picked;
        _checkOut = _isEvent ? picked : null;
      }
      _quote = null;
      _error = null;
    });
  }

  Map<String, dynamic>? _bookingPayload({String? coupon}) {
    if (_checkIn == null || _checkOut == null) return null;
    return {
      'property_id': widget.property.propertyId,
      'check_in_date': _apiDate(_checkIn!),
      'check_out_date': _apiDate(_checkOut!),
      'number_of_guests': _guestCount,
      'payment_type': _isEvent ? _paymentType : 'full',
      if (_isEvent) 'selected_slot': _slot,
      if (_isEvent) 'food_preference': _foodPreference,
      if (coupon != null && coupon.trim().isNotEmpty)
        'coupon_code': coupon.trim().toUpperCase(),
    };
  }

  Future<bool> _refreshQuote({String? coupon}) async {
    final payload = _bookingPayload(coupon: coupon);
    if (payload == null) {
      setState(() => _error = _isEvent
          ? 'Select event date first.'
          : 'Select check-in and check-out dates first.');
      return false;
    }
    setState(() {
      _loadingQuote = true;
      _error = null;
    });
    final provider = Provider.of<BookingProvider>(context, listen: false);
    final quote = await provider.createQuote(payload);
    if (!mounted) return false;
    setState(() {
      _loadingQuote = false;
      _quote = quote;
      _error = quote == null
          ? provider.lastError ??
              'Could not confirm availability or pricing. Please adjust your selection.'
          : null;
    });
    return quote != null;
  }

  Future<void> _continue() async {
    if (_step == 0) {
      if (await _refreshQuote()) setState(() => _step = 1);
      return;
    }
    if (_step == 1) {
      if (_guestCount > _maxGuests) {
        setState(() => _error = 'Maximum $_maxGuests guests allowed.');
        return;
      }
      if (await _refreshQuote(coupon: _couponController.text)) {
        setState(() => _step = 2);
      }
      return;
    }
    if (_step < 4) {
      setState(() => _step += 1);
    }
  }

  Future<void> _applyCoupon() async {
    final ok = await _refreshQuote(coupon: _couponController.text);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
            ok ? 'Coupon applied to quote.' : 'Coupon could not be applied.'),
        backgroundColor: ok ? Colors.green : AppTheme.primary,
      ),
    );
  }

  Future<void> _pay() async {
    if (_preparingPayment || _checkingPayment || _quote == null) return;
    final payload = _bookingPayload(coupon: _couponController.text);
    if (payload == null) return;
    setState(() {
      _preparingPayment = true;
      _error = null;
    });
    final provider = Provider.of<BookingProvider>(context, listen: false);
    var booking = _pendingBooking;
    if (booking == null) {
      booking = await provider.createBooking(payload);
      final coupon = _couponController.text.trim();
      if (booking != null &&
          coupon.isNotEmpty &&
          (booking.couponCode == null || booking.couponCode!.isEmpty)) {
        final applied = await provider.applyCoupon(booking.bookingId, coupon);
        if (applied) booking = provider.currentBooking;
      }
    }
    if (!mounted) return;
    if (booking == null) {
      setState(() {
        _preparingPayment = false;
        _error = provider.lastError ??
            'Unable to create a secure booking hold. Please retry.';
      });
      return;
    }
    final keyId = booking.razorpayKeyId;
    final orderId = booking.razorpayOrderId;
    if (keyId == null || keyId.isEmpty || orderId == null || orderId.isEmpty) {
      setState(() {
        _preparingPayment = false;
        _error =
            'Payments are temporarily unavailable. Please try again later.';
      });
      return;
    }
    final payable =
        (booking.paymentType == 'advance' && (booking.advanceAmount ?? 0) > 0)
            ? booking.advanceAmount!
            : booking.totalAmount;
    await _openRazorpayForBooking(
      booking: booking,
      orderId: orderId,
      keyId: keyId,
      amount: payable,
    );
  }

  Future<void> _openRazorpayForBooking({
    required BookingModel booking,
    required String orderId,
    required String keyId,
    required num amount,
  }) async {
    _pendingBooking = booking;
    final auth = Provider.of<AuthProvider>(context, listen: false);
    await _persistRecoveryContext(booking);
    try {
      _razorpay.open({
        'key': keyId,
        'amount': (amount * 100).round(),
        'currency': booking.currency ?? 'INR',
        'name': 'X-Space360',
        'description': booking.propertyTitle ?? widget.property.title,
        'order_id': orderId,
        'prefill': {
          'name': auth.currentUser?.fullName ?? '',
          'email': auth.currentUser?.email ?? '',
          'contact': auth.currentUser?.phone ?? '',
        },
        'theme': {'color': '#C05C4F'},
      });
    } catch (_) {
      setState(() {
        _preparingPayment = false;
        _error = 'Unable to open secure payment. Please try again.';
      });
    }
  }

  Future<void> _retryPayment() async {
    final booking = _pendingBooking;
    if (booking == null || _checkingPayment || _preparingPayment) return;
    setState(() {
      _checkingPayment = true;
      _error = 'Checking previous payment and booking hold...';
    });
    final provider = Provider.of<BookingProvider>(context, listen: false);
    final status = await provider.getPaymentStatus(booking.bookingId);
    if (!mounted) return;
    if (status?['payment_status'] == 'PAID') {
      setState(() {
        _checkingPayment = false;
        _error = null;
      });
      await _clearRecoveryContext();
      _showPaymentResult(
        title: 'Booking Confirmed',
        message:
            'Your payment is already successful and the booking is confirmed.',
        success: true,
      );
      return;
    }
    if (status?['payment_status'] == 'PAYMENT_PENDING') {
      setState(() {
        _checkingPayment = false;
        _error = null;
      });
      _showRecoverySheet(
        title: 'Payment Verification Pending',
        message:
            "We're checking the status of your payment. Please don't make another payment yet.",
        allowRetry: false,
      );
      return;
    }

    final retry = await provider.retryPayment(booking.bookingId);
    if (!mounted) return;
    setState(() {
      _checkingPayment = false;
      _preparingPayment = false;
      _error = null;
    });
    if (retry == null) {
      setState(() =>
          _error = provider.lastError ?? 'Unable to retry payment safely.');
      return;
    }
    if (retry['payment_status'] == 'PAID') {
      await _clearRecoveryContext();
      _showPaymentResult(
        title: 'Booking Confirmed',
        message: retry['message']?.toString() ?? 'Payment already successful.',
        success: true,
      );
      return;
    }
    if (retry['payment_status'] == 'PAYMENT_PENDING') {
      _showRecoverySheet(
        title: 'Payment Verification Pending',
        message: retry['message']?.toString() ??
            "We're checking the status of your payment. Please don't make another payment yet.",
        allowRetry: false,
      );
      return;
    }
    await _openRazorpayForBooking(
      booking: booking,
      orderId: retry['razorpay_order_id']?.toString() ??
          booking.razorpayOrderId ??
          '',
      keyId:
          retry['razorpay_key_id']?.toString() ?? booking.razorpayKeyId ?? '',
      amount: ((retry['amount'] as num?) ?? booking.razorpayAmount ?? 0) / 100,
    );
  }

  Future<void> _handlePaymentSuccess(PaymentSuccessResponse response) async {
    final booking = _pendingBooking;
    if (booking == null) return;
    setState(() {
      _preparingPayment = false;
      _verifyingPayment = true;
    });
    final success = await Provider.of<BookingProvider>(context, listen: false)
        .confirmPayment({
      'booking_id': booking.bookingId,
      'razorpay_payment_id': response.paymentId,
      'razorpay_order_id': response.orderId ?? booking.razorpayOrderId,
      'razorpay_signature': response.signature,
    });
    if (!mounted) return;
    setState(() {
      _verifyingPayment = false;
      _pendingBooking = null;
    });
    if (success) {
      await _clearRecoveryContext();
      _showPaymentResult(
        title: 'Booking Confirmed',
        message:
            'Your booking ${booking.bookingId} is confirmed. A confirmation has been sent to your profile contact details.',
        success: true,
      );
    } else {
      _showRecoverySheet(
        title: 'Payment Verification Pending',
        message:
            'We received the payment callback, but secure verification did not complete. Please do not retry payment until support confirms the status.',
        allowRetry: false,
      );
    }
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    setState(() {
      _preparingPayment = false;
    });
    _showRecoverySheet(
      title: response.code == Razorpay.PAYMENT_CANCELLED
          ? 'Payment Cancelled'
          : 'Payment Failed',
      message: response.message?.isNotEmpty == true
          ? response.message!
          : 'Your booking has not been confirmed. You can retry payment from the review step.',
      allowRetry: true,
    );
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
          content: Text(
              'External wallet selected: ${response.walletName ?? 'wallet'}')),
    );
  }

  void _showPaymentResult(
      {required String title, required String message, required bool success}) {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              if (success) Navigator.pop(context);
            },
            child: Text(success ? 'View Booking' : 'Back to Review'),
          ),
        ],
      ),
    );
  }

  void _showRecoverySheet({
    required String title,
    required String message,
    required bool allowRetry,
  }) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(title,
                  style: GoogleFonts.inter(
                      fontSize: 22, fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              Text(message,
                  style: GoogleFonts.inter(
                      color: AppTheme.charcoalMuted, height: 1.4)),
              const SizedBox(height: 16),
              _summaryHeader(),
              _priceBreakdown(),
              const SizedBox(height: 16),
              if (allowRetry)
                ElevatedButton(
                  onPressed: _checkingPayment
                      ? null
                      : () {
                          Navigator.pop(context);
                          _retryPayment();
                        },
                  child: Text(_checkingPayment
                      ? 'Checking payment...'
                      : 'Retry Payment'),
                ),
              OutlinedButton(
                onPressed: () {
                  Navigator.pop(context);
                  setState(() => _step = 4);
                },
                child: const Text('Choose Another Method'),
              ),
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  _showSupportDialog();
                },
                child: const Text('Contact Support'),
              ),
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  setState(() => _step = 3);
                },
                child: const Text('Back to Booking Review'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showSupportDialog() {
    final booking = _pendingBooking;
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Payment Support'),
        content: Text(
          'Booking Reference: ${booking?.bookingId ?? 'Not created yet'}\n'
          'Payment Reference: ${booking?.razorpayOrderId ?? 'Pending'}\n'
          'Amount: ${_money(_quote?['payable_now'] as num?)}\n'
          'Status: Pending',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final payable = (_quote?['payable_now'] as num?) ?? 0;
    final finalPayLabel =
        _isInstantBook ? 'Pay ${_money(payable)}' : 'Pay & Send Request';
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(_isInstantBook ? 'Reserve' : 'Request to Book',
            style: GoogleFonts.inter(fontWeight: FontWeight.w800)),
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.charcoal,
        elevation: 0,
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: AppTheme.border))),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_step == 4 ? 'Payable now' : 'Current quote',
                        style: GoogleFonts.inter(
                            fontSize: 12, color: AppTheme.charcoalMuted)),
                    Text(
                        payable > 0
                            ? _money(payable,
                                currencyCode:
                                    (_quote?['currency'] ?? 'INR').toString())
                            : '${_money(widget.property.customerDisplayPrice)} + taxes & fees',
                        style: GoogleFonts.inter(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: AppTheme.charcoal)),
                  ],
                ),
              ),
              ElevatedButton(
                onPressed: (_loadingQuote ||
                        _preparingPayment ||
                        _verifyingPayment ||
                        _checkingPayment)
                    ? null
                    : (_step == 4 ? _pay : _continue),
                style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 14)),
                child: Text(
                  _verifyingPayment
                      ? 'Verifying...'
                      : _checkingPayment
                          ? 'Checking...'
                          : _preparingPayment
                              ? 'Preparing...'
                              : _step == 4
                                  ? finalPayLabel
                                  : 'Continue',
                  style: GoogleFonts.inter(
                      fontWeight: FontWeight.w800, color: Colors.white),
                ),
              ),
            ],
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _buildStepper(),
          const SizedBox(height: 20),
          if (_error != null)
            _notice(_error!, Icons.error_outline, AppTheme.primary),
          if (_loadingQuote || _verifyingPayment)
            _notice(
                _verifyingPayment
                    ? "We're securely confirming your booking. Please don't close the app."
                    : 'Checking latest availability and pricing...',
                Icons.lock_clock,
                AppTheme.secondary),
          if (_step == 0) _buildDatesStep(),
          if (_step == 1) _buildGuestsStep(),
          if (_step == 2) _buildPriceStep(),
          if (_step == 3) _buildReviewStep(),
          if (_step == 4) _buildPaymentStep(),
        ],
      ),
    );
  }

  Widget _buildStepper() {
    const labels = ['Trip', 'Guests', 'Price', 'Review', 'Pay'];
    return Row(
      children: List.generate(labels.length, (index) {
        final active = index <= _step;
        return Expanded(
          child: Column(
            children: [
              Container(
                height: 4,
                margin: const EdgeInsets.symmetric(horizontal: 2),
                color: active ? AppTheme.primary : AppTheme.border,
              ),
              const SizedBox(height: 6),
              Text(labels[index],
                  style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color:
                          active ? AppTheme.primary : AppTheme.charcoalMuted)),
            ],
          ),
        );
      }),
    );
  }

  Widget _buildDatesStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle(_isEvent ? 'Event date and slot' : 'Select dates'),
        _dateTile(_isEvent ? 'Event date' : 'Check-in', _checkIn,
            () => _pickDate(checkout: false)),
        if (!_isEvent)
          _dateTile('Check-out', _checkOut, () => _pickDate(checkout: true)),
        if (_isEvent) ...[
          const SizedBox(height: 12),
          _choice(
              'Slot',
              _slot,
              const {
                'morning': 'Morning 9 AM - 3 PM',
                'evening': 'Evening 5 PM - 11 PM',
                'full_day': 'Full day 9 AM - 11 PM'
              },
              (v) => setState(() => _slot = v)),
          _choice(
              'Food preference',
              _foodPreference,
              const {'veg': 'Vegetarian', 'non_veg': 'Non-vegetarian'},
              (v) => setState(() => _foodPreference = v)),
          _choice(
              'Payment option',
              _paymentType,
              const {'full': 'Full payment', 'advance': 'Advance payment'},
              (v) => setState(() => _paymentType = v)),
        ],
      ],
    );
  }

  Widget _buildGuestsStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Guests'),
        _counter('Adults', _adults, 1, _maxGuests,
            (v) => setState(() => _adults = v)),
        _counter('Children', _children, 0, _maxGuests,
            (v) => setState(() => _children = v)),
        const SizedBox(height: 8),
        Text('Maximum $_maxGuests guests',
            style: GoogleFonts.inter(color: AppTheme.charcoalMuted)),
      ],
    );
  }

  Widget _buildPriceStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Price details'),
        _priceBreakdown(),
        const SizedBox(height: 18),
        _sectionTitle('Offers & coupons'),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _couponController,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(
                    hintText: 'Enter coupon code',
                    border: OutlineInputBorder()),
              ),
            ),
            const SizedBox(width: 10),
            ElevatedButton(onPressed: _applyCoupon, child: const Text('Apply')),
          ],
        ),
      ],
    );
  }

  Widget _buildReviewStep() {
    final user = Provider.of<AuthProvider>(context, listen: false).currentUser;
    final fullName = user?.fullName ?? '';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Review your booking'),
        _summaryHeader(),
        _bookingModeNotice(),
        _line('Trip',
            '${_quote?['check_in_date'] ?? '-'} -> ${_quote?['check_out_date'] ?? '-'}'),
        _line('Guests', '$_guestCount guests'),
        _line(
            'Primary guest', fullName.isNotEmpty ? fullName : 'Profile guest'),
        _line('Mobile', user?.phone ?? ''),
        _line('Email', user?.email ?? ''),
        TextField(
          controller: _requestController,
          maxLines: 3,
          decoration: const InputDecoration(
              labelText: 'Special request', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 18),
        _sectionTitle('Cancellation policy'),
        _notice(
            'Cancellation and refund rules are applied from the host policy configured for this property.',
            Icons.policy_outlined,
            AppTheme.secondary),
        if (widget.property.houseRules?.isNotEmpty == true) ...[
          _sectionTitle('Property rules'),
          Text(widget.property.houseRules!,
              style: GoogleFonts.inter(
                  color: AppTheme.charcoalMuted, height: 1.5)),
        ],
        const SizedBox(height: 18),
        _priceBreakdown(),
      ],
    );
  }

  Widget _buildPaymentStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Payment method'),
        RadioListTile<String>(
          value: 'razorpay',
          groupValue: _paymentMethod,
          onChanged: (v) => setState(() => _paymentMethod = v ?? 'razorpay'),
          title: const Text('Secure Payment via Razorpay'),
          subtitle: const Text('UPI, cards, net banking and supported wallets'),
        ),
        const SizedBox(height: 18),
        _notice(
            "Razorpay will open only after you tap Pay. Booking is confirmed only after backend payment verification.",
            Icons.verified_user_outlined,
            AppTheme.secondary),
        const SizedBox(height: 18),
        _priceBreakdown(),
        const SizedBox(height: 18),
        Text(
            "By confirming this booking, you agree to X-Space360's Terms, Cancellation Policy and applicable Property Rules.",
            style: GoogleFonts.inter(
                fontSize: 12, color: AppTheme.charcoalMuted, height: 1.5)),
      ],
    );
  }

  Widget _summaryHeader() {
    return Container(
      padding: const EdgeInsets.all(14),
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
          color: AppTheme.stone, borderRadius: BorderRadius.circular(8)),
      child: Row(
        children: [
          PropertyImage(
            imageUrl: widget.property.images.isNotEmpty
                ? widget.property.images.first
                : null,
            width: 72,
            height: 72,
            borderRadius: BorderRadius.circular(8),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(widget.property.title,
                    style: GoogleFonts.inter(fontWeight: FontWeight.w900)),
                Text('${widget.property.city}, ${widget.property.state}',
                    style: GoogleFonts.inter(color: AppTheme.charcoalMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _bookingModeNotice() {
    return _notice(
      'Booking Type: Instant Book. Your booking will be confirmed after successful payment verification.',
      Icons.flash_on_rounded,
      AppTheme.primary,
    );
  }

  Widget _priceBreakdown() {
    final q = _quote;
    if (q == null) {
      return _notice('Select trip details to see backend-confirmed pricing.',
          Icons.receipt_long, AppTheme.secondary);
    }
    final duration = q['duration_units'] ?? 1;
    final label = q['duration_label'] ?? 'night';
    final depositOnline = q['security_deposit_collected_online'] == true;
    final deposit = (q['security_deposit'] as num?) ?? 0;
    final customerUnitPrice =
        (q['customer_unit_price'] as num?) ?? (q['unit_price'] as num?);
    final customerRateAmount = (q['customer_rate_amount'] as num?) ??
        (((q['base_amount'] as num?) ?? 0) + ((q['service_fee'] as num?) ?? 0));
    return Column(
      children: [
        _line(
            '${_money(customerUnitPrice)} x $duration $label${duration == 1 ? '' : 's'}',
            _money(customerRateAmount)),
        _lineIf('Cleaning fee', q['cleaning_fee'] as num?),
        _lineIf('Convenience fee', q['convenience_fee'] as num?),
        _lineIf('Extra guest fee', q['extra_guest_fee'] as num?),
        _lineIf('Taxes & GST', q['taxes'] as num?),
        if (((q['discount_amount'] as num?) ?? 0) > 0)
          _line('Discount',
              CurrencyFormatter.format(-((q['discount_amount'] as num?) ?? 0))),
        if (deposit > 0)
          _line(
              depositOnline
                  ? 'Refundable security deposit'
                  : 'Refundable security deposit (payable at property)',
              _money(deposit)),
        const Divider(height: 28),
        _line('Total booking cost', _money(q['total_amount'] as num?),
            strong: true),
        _line('Payable now', _money(q['payable_now'] as num?), strong: true),
      ],
    );
  }

  Widget _sectionTitle(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 12, top: 8),
        child: Text(text,
            style: GoogleFonts.inter(
                fontSize: 20,
                fontWeight: FontWeight.w900,
                color: AppTheme.charcoal)),
      );

  Widget _dateTile(String label, DateTime? value, VoidCallback onTap) =>
      ListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(label),
        subtitle: Text(
            value == null ? 'Select' : DateFormat('dd MMM yyyy').format(value)),
        trailing: const Icon(Icons.calendar_today_outlined),
        onTap: onTap,
      );

  Widget _choice(String label, String value, Map<String, String> options,
          ValueChanged<String> onChanged) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: DropdownButtonFormField<String>(
          value: value,
          decoration: InputDecoration(
              labelText: label, border: const OutlineInputBorder()),
          items: options.entries
              .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
              .toList(),
          onChanged: (v) {
            if (v != null) onChanged(v);
          },
        ),
      );

  Widget _counter(String label, int value, int min, int max,
          ValueChanged<int> onChanged) =>
      ListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(label),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
                onPressed: value > min ? () => onChanged(value - 1) : null,
                icon: const Icon(Icons.remove_circle_outline)),
            SizedBox(width: 32, child: Center(child: Text('$value'))),
            IconButton(
                onPressed:
                    _guestCount < max ? () => onChanged(value + 1) : null,
                icon: const Icon(Icons.add_circle_outline)),
          ],
        ),
      );

  Widget _line(String label, String value, {bool strong = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          children: [
            Expanded(
                child: Text(label,
                    style: GoogleFonts.inter(
                        fontWeight:
                            strong ? FontWeight.w800 : FontWeight.w500))),
            Text(value,
                style: GoogleFonts.inter(
                    fontWeight: strong ? FontWeight.w900 : FontWeight.w700)),
          ],
        ),
      );

  Widget _lineIf(String label, num? value) {
    if ((value ?? 0) <= 0) return const SizedBox.shrink();
    return _line(label, _money(value));
  }

  Widget _notice(String text, IconData icon, Color color) => Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(8)),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 10),
            Expanded(
                child: Text(text,
                    style: GoogleFonts.inter(
                        color: AppTheme.charcoal, height: 1.4))),
          ],
        ),
      );
}
