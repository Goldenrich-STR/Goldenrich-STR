import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../models/property_model.dart';
import '../../providers/property_provider.dart';
import '../../services/api_service.dart';
import '../../utils/currency_formatter.dart';
import '../shared/property_image.dart';
import 'property_detail_screen.dart';

const _ink = Color(0xFF1B1924);
const _sparkColors = [Color(0xFF4285F4), Color(0xFF9B72CB), Color(0xFFD96570)];

/// The website's Gemini-style sparkle: blue, violet and rose.
class AiSparkleIcon extends StatelessWidget {
  final double size;

  const AiSparkleIcon({super.key, this.size = 22});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _SparklePainter()),
    );
  }
}

class _SparklePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 24;
    final path = Path()
      ..moveTo(12 * s, 1.5 * s)
      ..cubicTo(12.6 * s, 7.1 * s, 16.9 * s, 11.4 * s, 22.5 * s, 12 * s)
      ..cubicTo(16.9 * s, 12.6 * s, 12.6 * s, 16.9 * s, 12 * s, 22.5 * s)
      ..cubicTo(11.4 * s, 16.9 * s, 7.1 * s, 12.6 * s, 1.5 * s, 12 * s)
      ..cubicTo(7.1 * s, 11.4 * s, 11.4 * s, 7.1 * s, 12 * s, 1.5 * s)
      ..close();
    final paint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: _sparkColors,
        stops: [0, 0.55, 1],
      ).createShader(Offset.zero & size);
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _Flow {
  final String message;
  final List<List<String>> options; // [label, next]

  const _Flow(this.message, this.options);
}

const Map<String, _Flow> _flows = {
  'main': _Flow(
    '**Welcome to X-Space360 Helpdesk!**\nHow can we assist you today? Please select your query area below to get started:',
    [
      ['How It Works (Booking & Listing Steps)', 'how_it_works'],
      ['I am a Guest / Customer', 'guest_main'],
      ['I am a Host / Property Owner', 'host_main'],
      ['Grievance & Support Desk', 'support'],
    ],
  ),
  'how_it_works': _Flow(
    '**How X-Space360 Works**\nWhether you are looking to book a space or list your property, we make the process simple and transparent!\n\nSelect what you\'d like to explore:',
    [
      ['How to Book a Space (Guest Steps)', 'how_it_works_guest'],
      ['How to List Your Property (Host Steps)', 'how_it_works_host'],
      ['Back to Main Menu', 'main'],
    ],
  ),
  'how_it_works_guest': _Flow(
    '**How to Book a Space (4 Simple Steps)**\n\n1. **Search & Discover**: Select your city, check-in/out dates, and guest count to find verified villas, workspaces, or event venues.\n2. **Choose & Review**: Explore HD photo galleries, pricing breakdown, rules, and host ratings.\n3. **Request or Instant Book**:\n   - **Instant Book (lightning icon)**: Pay and get immediate confirmation.\n   - **Request Book**: Send a booking request. Host confirms within 24 hrs.\n4. **Secure Payment**: Pay via Razorpay with 100% buyer protection and instant booking voucher!',
    [
      ['How to List Your Property (Host Steps)', 'how_it_works_host'],
      ['Back to Main Menu', 'main'],
    ],
  ),
  'how_it_works_host': _Flow(
    '**How to List Your Property (3 Simple Steps)**\n\n1. **Register & Verify KYC**: Sign up as a host and upload basic documents (Aadhaar, PAN, Property Proof).\n2. **List Your Space**: Set your price, upload photos, add amenities, and block personal dates on calendar.\n3. **Receive Bookings & 100% Payout**: Host guests and get **100% payout with 0% platform commission** within 3 business days of check-out!',
    [
      ['How to Book a Space (Guest Steps)', 'how_it_works_guest'],
      ['Back to Main Menu', 'main'],
    ],
  ),
  'guest_main': _Flow(
    '**Guest Support Menu**\nExplore topics related to finding, booking, and managing your stays on X-Space360:',
    [
      ['How to Browse & Book?', 'guest_booking'],
      ['Property Categories & Rules', 'guest_categories'],
      ['Payments, Cancellations & Refunds', 'guest_refunds'],
      ['Meet our CRM Team (Brokers/RM/BM)', 'guest_crm_info'],
      ['How to Raise a Support Ticket?', 'guest_tickets'],
      ['Back to Main Menu', 'main'],
    ],
  ),
  'guest_booking': _Flow(
    '**How to Book a Space**\nBooking is secure and straightforward:\n\n1. **Search**: Enter the city, dates, and number of guests on the search bar.\n2. **Filter**: Filter by Category (Residential, Commercial, or Event Venue) and property types.\n3. **Request**: Click **Book Now** to submit a booking request.\n4. **Approval**: The host has **24 hours** to approve your request. No charge is made until approved.\n5. **Payment**: Once approved, complete payment securely via Razorpay to confirm.',
    [
      ['Instant Booking vs Request', 'guest_booking_instant'],
      ['Can I reschedule dates?', 'guest_booking_reschedule'],
      ['Back to Guest Menu', 'guest_main'],
    ],
  ),
  'guest_booking_instant': _Flow(
    '**Instant Booking vs Request**\n- **Instant Booking**: Properties with the orange lightning icon are active for instant booking. You pay immediately, and the booking is confirmed instantly without host approval.\n- **Booking Request**: Standard properties require the host to confirm availability. The request is active for **24 hours**. You are only billed after host approval.',
    [
      ['Can I reschedule dates?', 'guest_booking_reschedule'],
      ['Back to Guest Menu', 'guest_main'],
    ],
  ),
  'guest_booking_reschedule': _Flow(
    '**Rescheduling Policy**\n- **Before Payment**: Simply cancel the booking request and submit a new one with your updated dates.\n- **After Payment**: Date modifications require the host\'s consent. Please contact your assigned **Relationship Manager (RM)** or support desk. If approved, we will adjust the reservation on the backend.',
    [
      ['Instant Booking vs Request', 'guest_booking_instant'],
      ['Back to Guest Menu', 'guest_main'],
    ],
  ),
  'guest_categories': _Flow(
    '**Property Categories & Guidelines**\nWe list three premium categories:\n\n1. **Residential Stays**: Villas, Bungalows, Apartments, Studios, Private Houses, and Farmhouses.\n2. **Commercial Spaces**: Private Offices, Co-working Desks, Meeting Rooms, and Conference Rooms.\n3. **Event Venues**: Banquet Halls, Hotel Ballrooms, and Wedding Venues.\n\nChoose below to learn about specific rules:',
    [
      ['Rules for Events & Shoots', 'guest_event_rules'],
      ['Long-term Workspace Discounts', 'guest_workspace_discounts'],
      ['Back to Guest Menu', 'guest_main'],
    ],
  ),
  'guest_event_rules': _Flow(
    '**Event & Shoot Rules**\n- **Capacity Limit**: Exceeding the maximum capacity of a venue without permission will incur extra guest fees.\n- **Music & Noise**: Loud music, sound systems, and DJs must stop by **10:00 PM** in accordance with local regulations.\n- **Decor/Catering**: External caterers and decorators are allowed only after prior written approval from the host.',
    [
      ['Long-term Workspace Discounts', 'guest_workspace_discounts'],
      ['Back to Guest Menu', 'guest_main'],
    ],
  ),
  'guest_workspace_discounts': _Flow(
    '**Workspace Long-term Discounts**\n- **Weekly Stays**: Save **10-15%** on booking co-working desks or private cabins for 7+ consecutive days.\n- **Monthly Stays**: Save up to **30%** on bookings of 30+ days.\n- **Corporate Rates**: Contact customer.support@x-space360.com for special bulk discounts for teams.',
    [
      ['Rules for Events & Shoots', 'guest_event_rules'],
      ['Back to Guest Menu', 'guest_main'],
    ],
  ),
  'guest_refunds': _Flow(
    '**Payments & Refunds**\nAll payments are processed securely through Razorpay. Refunds go back to the **original payment method** only.\n\n- **Guest cancellation**:\n  - **100% refund**: 7 or more days before check-in (and within 24 hours of booking when check-in is more than 7 days away)\n  - **50% refund**: 3 to 6 days before check-in\n  - **No refund**: less than 72 hours before check-in, on check-in day, or for a no-show\n- **If the host cancels**: you get a 100% refund or alternative accommodation, subject to availability.\n- **Non-refundable**: platform convenience fee, payment gateway charges and some taxes, unless approved otherwise.\n- **Timeline**: refunds are verified within 24-48 working hours; banks, cards and UPI can take 8-10 business days to credit.\n\nThe cancellation setting of each property is shown before you book.',
    [
      ['How to claim a refund?', 'guest_refund_claim'],
      ['Security Deposit refunds', 'guest_security_refund'],
      ['Back to Guest Menu', 'guest_main'],
    ],
  ),
  'guest_refund_claim': _Flow(
    '**How to Claim Your Refund**\n1. Go to **My Bookings** and open the booking.\n2. Choose **Cancel Booking**, or contact customer support. A cancellation is valid once X-Space360 confirms it (within 24-48 hours).\n3. The refund percentage follows the cancellation window above.\n4. Disagree with a decision? Submit a **refund review request within 7 days** of the cancellation and we will review it and share our final decision.',
    [
      ['Security Deposit refunds', 'guest_security_refund'],
      ['Back to Guest Menu', 'guest_main'],
    ],
  ),
  'guest_security_refund': _Flow(
    '**Security Deposits and Damage**\n- **Collection**: some hosts may collect a security amount for higher-value properties. It is shown before you pay.\n- **Damage claims**: damage, nuisance or breach of house rules can lead to charges. Before any deduction or refund decision, X-Space360 may review evidence such as photos, chat history and payment records.\n- **Questions**: contact support with your booking ID.',
    [
      ['How to claim a refund?', 'guest_refund_claim'],
      ['Back to Guest Menu', 'guest_main'],
    ],
  ),
  'guest_crm_info': _Flow(
    '**Our CRM Team (Brokers/RM/BM)**\nTo deliver a premium experience, X-Space360 employs a dedicated management team:\n\n- **Broker**: Local partner assigned to inspect properties, assist with site visits, and coordinate listing verification.\n- **Relationship Manager (RM)**: Your dedicated point of contact for issues related to check-in assistance, booking edits, and host disputes.\n- **Branch Manager (BM)**: The regional head supervising all RM and Broker activities, ensuring policy compliance.',
    [
      ['Back to Guest Menu', 'guest_main'],
    ],
  ),
  'guest_tickets': _Flow(
    '**Raising a Support Ticket**\nIf you face an issue during your stay, you can raise an official support ticket:\n\n1. Login to your account.\n2. Go to **Dashboard** > **Support Tickets**.\n3. Click **Raise Support Ticket**.\n4. Enter a subject, description, and category.\n5. Our system automatically assigns a Relationship Manager (RM) who will contact you within **1 hour**.',
    [
      ['Back to Guest Menu', 'guest_main'],
    ],
  ),
  'host_main': _Flow(
    '**Host Support Menu**\nWelcome Host Partner! How can we help you manage your properties, bookings, or payouts?',
    [
      ['Host Onboarding & KYC', 'host_onboarding'],
      ['Listing a Space & Calendar Blockouts', 'host_listing'],
      ['Subscription Plans & Free Trial', 'host_subscriptions'],
      ['Payouts, Earnings & 0% Commission', 'host_payouts'],
      ['Host Support Team & Managers', 'host_crm_info'],
      ['Back to Main Menu', 'main'],
    ],
  ),
  'host_onboarding': _Flow(
    '**Host Onboarding & KYC Verification**\nEvery listing goes live after account verification:\n\n1. Register as a Host on the Registration page.\n2. Navigate to **Host Dashboard** > **Verification** tab.\n3. Upload clear copies of: Aadhaar, PAN, Address Proof, and Municipal NOC/Shop Act.\n4. Admin reviews and approves KYC within 24-48 hours.',
    [
      ['Why is Shop Act mandatory?', 'host_shop_act'],
      ['KYC Rejection reasons', 'host_kyc_rejections'],
      ['Back to Host Menu', 'host_main'],
    ],
  ),
  'host_shop_act': _Flow(
    '**Shop Act License Requirement**\n- **Why is it required?**: Under local commercial laws, commercial leasing of event venues or short-term stays requires registration.\n- **Alternatives**: If you do not have a Shop Act, you can upload a **GST registration certificate**, **Property Tax receipt (commercial)**, or **NOC from the local Gram Panchayat/Municipality**.',
    [
      ['KYC Rejection reasons', 'host_kyc_rejections'],
      ['Back to Host Menu', 'host_main'],
    ],
  ),
  'host_kyc_rejections': _Flow(
    '**Common KYC Rejection Reasons**\n1. **Blurred Images**: Re-upload clear, readable document files.\n2. **Name Mismatch**: The bank account owner name must match the Aadhaar and PAN.\n3. **Address Proof Mismatch**: Utility bill or lease deed must match the listing address.\n4. **Expired Document**: Ensure municipal licenses are current.',
    [
      ['Why is Shop Act mandatory?', 'host_shop_act'],
      ['Back to Host Menu', 'host_main'],
    ],
  ),
  'host_listing': _Flow(
    '**Listing & Calendar Management**\nManaging your listings is quick and simple:\n\n- **Listing a Space**: Head to dashboard, click **+ List New Property**, set pricing, rules, upload photos, and pinpoint your location on the map.\n- **Calendar Blockouts**: Go to **Calendar**, select dates, click **Block Selected Dates** to prevent guest bookings during maintenance or personal use.\n- **Instant Booking**: Toggle this on to allow guests to book instantly without waiting for your manual approval.',
    [
      ['How to edit active listings?', 'host_listing_edit'],
      ['Back to Host Menu', 'host_main'],
    ],
  ),
  'host_listing_edit': _Flow(
    '**Editing Active Listings**\n- **Instant Edits**: Go to **My Listings** and click **Edit** to modify descriptions, change base prices, or toggle amenities instantly.\n- **Address changes**: Changing the map coordinates or street address will temporarily return the listing to a pending verification status for admin check.',
    [
      ['Back to Host Menu', 'host_main'],
    ],
  ),
  'host_subscriptions': _Flow(
    '**Hosting Fees & Subscription Plans**\n- **Promotional Offer**: Hosting on X-Space360 is **completely FREE until December 2026**! No subscription or registration fees apply.\n- **Post-Promo BHK Plans**: Standard BHK-specific plans (₹999/mo for Studio/1BHK, ₹1,999/mo for 2/3BHK) will commence starting January 2027.',
    [
      ['Subscription renewals post-promo', 'host_sub_renewals'],
      ['Back to Host Menu', 'host_main'],
    ],
  ),
  'host_sub_renewals': _Flow(
    '**Subscription Renewal (Post-Promo)**\n- **Auto-Billing**: Subscriptions will auto-renew monthly via stored Razorpay credentials once active in 2027.\n- **Grace Period**: If renewal fails, you receive a **3-day grace period** to clear dues before listings are hidden.',
    [
      ['Back to Host Menu', 'host_main'],
    ],
  ),
  'host_payouts': _Flow(
    '**Payouts & Platform Commission**\n- **0% Host Commission**: X-Space360 does **not deduct any platform fees or commission** from your base rate. You receive **100%** of your listed price!\n- **Schedule**: Payouts are transferred to your verified bank account within **3 business days** after guest check-out.\n- **Government TDS**: 1% TDS is deducted under Section 194O of the IT Act (claimable in your annual ITR).',
    [
      ['GST & Tax Regulations', 'host_tax_details'],
      ['Delayed Payout Troubleshooting', 'host_delayed_payout'],
      ['Back to Host Menu', 'host_main'],
    ],
  ),
  'host_tax_details': _Flow(
    '**GST & Indian Tax Regulations**\n- **TDS under 194O**: As an e-commerce platform, we deduct **1% TDS** on the gross booking amount and file it against your PAN. You can claim this refund during your annual tax filing.\n- **GST**: Hosts are responsible for filing GST on renting commercial/residential properties if their annual turnover exceeds the threshold.',
    [
      ['Delayed Payout Troubleshooting', 'host_delayed_payout'],
      ['Back to Host Menu', 'host_main'],
    ],
  ),
  'host_delayed_payout': _Flow(
    '**Delayed Payout Troubleshooting**\nIf your payout has not arrived in 3 business days, check the following:\n\n1. **Bank Details**: Ensure your IFSC code and account number are correct on your dashboard.\n2. **Bank Holidays**: Payouts are not processed on Saturdays, Sundays, and national holidays.\n3. **Guest Disputes**: If a guest files a dispute regarding amenities, payouts may be temporarily held until resolved.',
    [
      ['GST & Tax Regulations', 'host_tax_details'],
      ['Back to Host Menu', 'host_main'],
    ],
  ),
  'host_crm_info': _Flow(
    '**Meet Your Management Team**\nTo assist hosts in managing listings, X-Space360 assigns a dedicated team:\n\n- **Local Broker**: Conducts physical verification, photographs the property, and answers local guest queries.\n- **Relationship Manager (RM)**: Helps hosts resolve booking conflicts, payout delays, and guest complaints.\n- **Branch Manager (BM)**: The regional leader supervising both Brokers and RMs, ensuring top-tier service.',
    [
      ['Back to Host Menu', 'host_main'],
    ],
  ),
  'support': _Flow(
    '**Contact X-Space360 Helpdesk**\nIf you need direct escalation or phone assistance, contact our support team:\n\n- **Helpline**: +91 9225586010 (9 AM - 7 PM)\n- **Email Support**: customer.support@x-space360.com\n- **Grievance Desk**: Email customer.support@x-space360.com with your booking ID.',
    [
      ['Main Menu', 'main'],
    ],
  ),
};

/// topic -> words (English, Hindi and Marathi written in English letters)
const Map<String, List<String>> _topics = {
  'support': ['contact', 'call', 'phone', 'number', 'email', 'mail', 'helpline', 'support', 'complaint', 'grievance', 'talk', 'human', 'agent', 'madat', 'sampark', 'whatsapp', 'customer care', 'help me', 'speak'],
  'how_it_works': ['how it works', 'process', 'platform', 'overview', 'kaise kaam', 'kasa chalta', 'who are you'],
  'how_it_works_guest': ['steps', 'step', 'how to book', 'how do i book', 'kasa book', 'kaise book'],
  'guest_booking': ['book', 'booking', 'reserve', 'reservation', 'approval', 'approve', 'booked'],
  'guest_booking_instant': ['instant', 'request booking', 'confirmation', 'immediately', 'turant'],
  'guest_booking_reschedule': ['reschedule', 'change date', 'change dates', 'modify', 'postpone', 'prepone', 'date change'],
  'guest_categories': ['categories', 'category', 'guidelines', 'residential', 'what types'],
  'guest_event_rules': ['shoot', 'dj', 'music', 'catering', 'decor', 'decoration', 'noise', 'capacity', 'party rules', 'event rules', 'loud', 'sound'],
  'guest_workspace_discounts': ['discount', 'discounts', 'monthly', 'weekly', 'long term', 'corporate', 'bulk', 'offer', 'offers', 'coupon', 'deal'],
  'guest_refunds': ['refund', 'refunds', 'cancel', 'cancellation', 'cancelled', 'payment', 'payments', 'razorpay', 'money back', 'paise wapas', 'pay', 'charge', 'charges', 'fee', 'fees'],
  'guest_security_refund': ['deposit', 'security deposit', 'damage', 'damages'],
  'guest_tickets': ['ticket', 'tickets', 'raise ticket', 'complain'],
  'host_onboarding': ['kyc', 'verification', 'onboarding', 'aadhaar', 'pan', 'register host', 'become host', 'list property'],
  'host_listing': ['listing', 'calendar', 'block dates', 'blockout', 'list my', 'add property'],
  'host_subscriptions': ['subscription', 'plan', 'plans', 'free trial', 'hosting fee', 'registration fee'],
  'host_payouts': ['payout', 'payouts', 'earning', 'earnings', 'commission', 'bank transfer'],
  'host_tax_details': ['tds', 'gst', 'tax', 'taxes'],
};

class _Msg {
  final bool fromUser;
  final String text;
  final List<List<String>> options;
  final List<PropertyModel> properties;

  const _Msg(this.fromUser, this.text,
      {this.options = const [], this.properties = const []});
}

class AssistantChatSheet extends StatefulWidget {
  const AssistantChatSheet({super.key});

  @override
  State<AssistantChatSheet> createState() => _AssistantChatSheetState();
}

class _AssistantChatSheetState extends State<AssistantChatSheet> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scroll = ScrollController();
  final List<_Msg> _messages = [];
  bool _thinking = false;

  static const _prompts = [
    ['Find a villa for a weekend', 'Suggestions with photo and price'],
    ['Show co-working spaces', 'Desks, cabins and meeting rooms'],
    ['How does booking work?', 'Search, request and payment steps'],
    ['Cancellation and refund policy', 'Percentages, timelines and how to cancel'],
  ];

  static const _cities = [
    'nashik', 'pune', 'mumbai', 'igatpuri', 'trimbakeshwar', 'alibaug',
    'lonavla', 'goa', 'karjat', 'mahabaleshwar', 'panchgani',
  ];
  static const _cityAlias = {
    'nasik': 'nashik', 'puna': 'pune', 'poona': 'pune', 'bombay': 'mumbai',
    'alibag': 'alibaug', 'alibagh': 'alibaug', 'lonavala': 'lonavla',
    'trimbak': 'trimbakeshwar',
  };

  @override
  void dispose() {
    _controller.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _scrollDown() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(_scroll.position.maxScrollExtent + 200,
            duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
      }
    });
  }

  String _normalize(String raw) {
    return raw
        .toLowerCase()
        .replaceAll(RegExp(r"[’']"), '')
        .replaceAll(RegExp(r'co[\s-]?working'), 'coworking')
        .replaceAll(RegExp(r'[^a-z0-9.\s₹]'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  int _distance(String a, String b) {
    if (a == b) return 0;
    if ((a.length - b.length).abs() > 1) return 2;
    final prev = List<int>.generate(b.length + 1, (i) => i);
    for (var i = 1; i <= a.length; i++) {
      var last = prev[0];
      prev[0] = i;
      for (var j = 1; j <= b.length; j++) {
        final tmp = prev[j];
        prev[j] = [
          prev[j] + 1,
          prev[j - 1] + 1,
          last + (a[i - 1] == b[j - 1] ? 0 : 1),
        ].reduce((x, y) => x < y ? x : y);
        last = tmp;
      }
    }
    return prev[b.length];
  }

  bool _sameWord(String token, String keyword) {
    if (token == keyword) return true;
    if (keyword.length >= 6 && token.length >= 5) {
      return token[0] == keyword[0] && _distance(token, keyword) <= 1;
    }
    return false;
  }

  String? _topicFor(String text) {
    final tokens = text.split(' ').where((e) => e.isNotEmpty).toList();
    String? best;
    var bestScore = 0;
    _topics.forEach((key, words) {
      var score = 0;
      for (final w in words) {
        if (w.contains(' ')) {
          if (text.contains(w)) score += 2;
        } else if (tokens.any((t) => _sameWord(t, w))) {
          score += 1;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = key;
      }
    });
    return bestScore > 0 ? best : null;
  }

  Map<String, dynamic>? _propertyQuery(String text) {
    final tokens = text.split(' ');
    String? city;
    for (final t in tokens) {
      final c = _cityAlias[t] ?? t;
      if (_cities.contains(c)) city = c;
    }
    String? category;
    String? type;
    if (text.contains('coworking') || text.contains('office') || text.contains('workspace') || text.contains('meeting')) {
      category = 'commercial';
    } else if (text.contains('venue') || text.contains('banquet') || text.contains('wedding') || text.contains('event') || text.contains('party')) {
      category = 'event_venue';
    } else if (text.contains('villa') || text.contains('stay') || text.contains('apartment') || text.contains('home') || text.contains('weekend') || text.contains('bungalow') || text.contains('property') || text.contains('flat')) {
      category = 'residential';
    }
    if (text.contains('villa')) type = 'villa';
    if (text.contains('apartment') || text.contains('flat')) type = 'apartment';
    double? maxPrice;
    final m = RegExp(r'(?:under|below|within|upto|up to|max)\s*₹?\s*(\d+(?:\.\d+)?)\s*(k|lakh|l)?').firstMatch(text);
    if (m != null) {
      var v = double.tryParse(m.group(1)!) ?? 0;
      final unit = m.group(2);
      if (unit == 'k') v *= 1000;
      if (unit == 'lakh' || unit == 'l') v *= 100000;
      if (v > 0) maxPrice = v;
    }
    if (category == null && city == null) return null;
    final looksLikeSearch = text.contains('find') ||
        text.contains('show') ||
        text.contains('near') ||
        text.contains('under') ||
        text.contains('looking') ||
        text.contains('want') ||
        text.contains('need') ||
        text.contains('suggest') ||
        text.contains(' in ') ||
        city != null ||
        text.contains('villa') ||
        text.contains('coworking') ||
        text.contains('venue');
    if (!looksLikeSearch) return null;
    return {
      if (city != null) 'city': city[0].toUpperCase() + city.substring(1),
      if (category != null) 'category': category,
      if (type != null) 'property_type': type,
      if (maxPrice != null) 'max_price': maxPrice,
      'limit': 5,
    };
  }

  Future<void> _ask(String raw) async {
    final text = raw.trim();
    if (text.isEmpty || _thinking) return;
    _controller.clear();
    setState(() {
      _messages.add(_Msg(true, text));
      _thinking = true;
    });
    _scrollDown();
    await Future<void>.delayed(const Duration(milliseconds: 450));

    final normalized = _normalize(text);
    _Msg reply;
    final topic = _topicFor(normalized);
    final query = _propertyQuery(normalized);
    final wantsSearch = query != null &&
        (topic == null || topic == 'guest_booking' || topic == 'how_it_works_guest');

    if (wantsSearch) {
      List<PropertyModel> found = [];
      try {
        found = await context.read<PropertyProvider>().searchForAssistant(query);
      } catch (_) {}
      reply = found.isEmpty
          ? const _Msg(false,
              'I could not find a matching space right now. Try another city or budget, or open Browse to see every live listing.',
              options: [['Main Menu', 'main']])
          : _Msg(false, 'Here are ${found.length} spaces that match:',
              properties: found);
    } else if (topic != null) {
      final flow = _flows[topic]!;
      reply = _Msg(false, flow.message, options: flow.options);
    } else {
      reply = const _Msg(false,
          'I can help with bookings, refunds, hosting and finding a space. Pick a topic or ask me something like "villas in Nashik under 20k".',
          options: [
            ['How It Works (Booking & Listing Steps)', 'how_it_works'],
            ['I am a Guest / Customer', 'guest_main'],
            ['I am a Host / Property Owner', 'host_main'],
            ['Grievance & Support Desk', 'support'],
          ]);
    }
    if (!mounted) return;
    setState(() {
      _thinking = false;
      _messages.add(reply);
    });
    _scrollDown();
  }

  void _openFlow(String label, String next) {
    final flow = _flows[next];
    if (flow == null) return;
    setState(() {
      _messages.add(_Msg(true, label));
      _messages.add(_Msg(false, flow.message, options: flow.options));
    });
    _scrollDown();
  }

  List<InlineSpan> _spans(String text, TextStyle base) {
    final spans = <InlineSpan>[];
    final parts = text.split('**');
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].isEmpty) continue;
      spans.add(TextSpan(
        text: parts[i],
        style: i.isOdd ? base.copyWith(fontWeight: FontWeight.w700) : base,
      ));
    }
    return spans;
  }

  Widget _bubble(_Msg m) {
    final base = GoogleFonts.inter(
        fontSize: 13.5, height: 1.45, color: m.fromUser ? Colors.white : _ink);
    return Align(
      alignment: m.fromUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
            maxWidth: MediaQuery.sizeOf(context).width * 0.8),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(
          color: m.fromUser ? _ink : const Color(0xFFF3F3F5),
          borderRadius: BorderRadius.circular(16),
        ),
        child: RichText(text: TextSpan(children: _spans(m.text, base))),
      ),
    );
  }

  Widget _propertyRow(PropertyModel p) {
    return GestureDetector(
      onTap: () {
        Navigator.pop(context);
        Navigator.push(
          context,
          MaterialPageRoute(
              builder: (_) => PropertyDetailScreen(propertyId: p.propertyId)),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE5E5E5)),
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius:
                  const BorderRadius.horizontal(left: Radius.circular(14)),
              child: SizedBox(
                width: 92,
                height: 80,
                child: PropertyImage(
                  imageUrl: p.images.isNotEmpty ? p.images.first : null,
                  width: 92,
                  height: 80,
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(p.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w600,
                            color: _ink)),
                    const SizedBox(height: 3),
                    Text('${p.city}, ${p.state}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                            fontSize: 11.5, color: const Color(0xFF6B6B6B))),
                    const SizedBox(height: 4),
                    Text(
                        '${p.hasUnits ? 'From ' : ''}${CurrencyFormatter.format(p.customerDisplayPrice)}${p.pricingUnitSuffix}',
                        style: GoogleFonts.inter(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            color: _ink)),
                  ],
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
    final media = MediaQuery.of(context);
    final empty = _messages.isEmpty;
    return Padding(
      padding: EdgeInsets.fromLTRB(14, 0, 14, 14 + media.viewInsets.bottom),
      child: Container(
        constraints: BoxConstraints(maxHeight: media.size.height * 0.86),
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                const AiSparkleIcon(size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text('X-Space360 Assistant',
                      style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                          color: _ink)),
                ),
                if (!empty)
                  GestureDetector(
                    onTap: () => setState(() => _messages.clear()),
                    child: const Padding(
                      padding: EdgeInsets.only(right: 14),
                      child: Icon(LucideIcons.rotateCcw, size: 18, color: _ink),
                    ),
                  ),
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: const Icon(LucideIcons.x, size: 20, color: _ink),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Flexible(
              child: SingleChildScrollView(
                controller: _scroll,
                child: empty
                    ? Column(
                        children: [
                          const SizedBox(height: 8),
                          RichText(
                            textAlign: TextAlign.center,
                            text: TextSpan(
                              style: GoogleFonts.inter(fontSize: 22, color: _ink),
                              children: [
                                TextSpan(
                                  text: 'Hello, ',
                                  style: TextStyle(
                                    foreground: Paint()
                                      ..shader = const LinearGradient(
                                              colors: _sparkColors)
                                          .createShader(const Rect.fromLTWH(
                                              0, 0, 80, 28)),
                                  ),
                                ),
                                const TextSpan(text: 'where should we start?'),
                              ],
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Ask me about stays, workspaces and venues, bookings, refunds or hosting.',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.inter(
                                fontSize: 12.5,
                                height: 1.4,
                                color: const Color(0xFF6B6B6B)),
                          ),
                          const SizedBox(height: 16),
                          for (var i = 0; i < _prompts.length; i++)
                            GestureDetector(
                              onTap: () => _ask(_prompts[i][0]),
                              child: Container(
                                width: double.infinity,
                                margin: const EdgeInsets.only(bottom: 10),
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 14, vertical: 12),
                                decoration: BoxDecoration(
                                  color: i == 0
                                      ? const Color(0xFFF3EEFF)
                                      : Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                      color: i == 0
                                          ? const Color(0xFFB9A6F5)
                                          : const Color(0xFFE5E5E5)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(_prompts[i][0],
                                        style: GoogleFonts.inter(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w500,
                                            color: _ink)),
                                    const SizedBox(height: 2),
                                    Text(_prompts[i][1],
                                        style: GoogleFonts.inter(
                                            fontSize: 11.5,
                                            color: const Color(0xFF6B6B6B))),
                                  ],
                                ),
                              ),
                            ),
                        ],
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          for (final m in _messages) ...[
                            _bubble(m),
                            for (final p in m.properties) _propertyRow(p),
                            if (m.options.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: [
                                    for (final o in m.options)
                                      GestureDetector(
                                        onTap: () => _openFlow(o[0], o[1]),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 12, vertical: 8),
                                          decoration: BoxDecoration(
                                            color: Colors.white,
                                            borderRadius:
                                                BorderRadius.circular(999),
                                            border: Border.all(
                                                color:
                                                    const Color(0xFFB9A6F5)),
                                          ),
                                          child: Text(o[0],
                                              style: GoogleFonts.inter(
                                                  fontSize: 12.5,
                                                  color: _ink)),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                          ],
                          if (_thinking)
                            const Padding(
                              padding: EdgeInsets.only(bottom: 10),
                              child: AiSparkleIcon(size: 22),
                            ),
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.fromLTRB(14, 4, 6, 4),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: const Color(0xFFD9D9D9)),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.plus, size: 20, color: _ink),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      onSubmitted: _ask,
                      onChanged: (_) => setState(() {}),
                      textInputAction: TextInputAction.send,
                      style: GoogleFonts.inter(fontSize: 13.5, color: _ink),
                      decoration: InputDecoration(
                        // the app theme fills text fields; this one must stay flat
                        filled: false,
                        fillColor: Colors.transparent,
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        disabledBorder: InputBorder.none,
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(vertical: 10),
                        hintText: 'Ask about villas near Nashik under ₹',
                        hintStyle: GoogleFonts.inter(
                            fontSize: 13.5, color: const Color(0xFF8A8A8A)),
                      ),
                    ),
                  ),
                  // like Gemini: sparkle while empty, solid send arrow once typed
                  GestureDetector(
                    onTap: () => _ask(_controller.text),
                    child: Container(
                      width: 40,
                      height: 40,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        // always the send arrow; grey until something is typed
                        color: _controller.text.trim().isEmpty
                            ? const Color(0xFFE5E7EB)
                            : _ink,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(LucideIcons.arrowUp,
                          size: 20,
                          color: _controller.text.trim().isEmpty
                              ? const Color(0xFF9CA3AF)
                              : Colors.white),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Answers come from X-Space360 help topics and live listings. Confirm important details with support.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                  fontSize: 10.5, color: const Color(0xFF8A8A8A)),
            ),
          ],
        ),
      ),
    );
  }
}
