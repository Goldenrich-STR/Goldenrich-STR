import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme.dart';

class AIChatScreen extends StatefulWidget {
  const AIChatScreen({super.key});

  @override
  State<AIChatScreen> createState() => _AIChatScreenState();
}

class _AIChatScreenState extends State<AIChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<_ChatMessage> _messages = [];
  bool _isTyping = false;

  static const Map<String, _ChatFlow> _flows = {
    'main': _ChatFlow(
      message:
          'Welcome to X-Space360 Helpdesk! Let us know how we can assist you today. Please select your role:',
      options: [
        _ChatOption(
          label: 'I am a Guest / Customer',
          next: 'guest_main',
          icon: Icons.person_outline_rounded,
        ),
        _ChatOption(
          label: 'I am a Host / Property Owner',
          next: 'host_main',
          icon: Icons.home_work_outlined,
        ),
        _ChatOption(
          label: 'Contact Support Desk',
          next: 'support',
          icon: Icons.call_outlined,
        ),
      ],
    ),
    'guest_main': _ChatFlow(
      message:
          'Guest Support Menu\nHow can we help you with finding, booking, or managing spaces?',
      options: [
        _ChatOption(
          label: 'How to Browse & Book?',
          next: 'guest_booking',
          icon: Icons.search_rounded,
        ),
        _ChatOption(
          label: 'Property Categories & Rules',
          next: 'guest_categories',
          icon: Icons.layers_outlined,
        ),
        _ChatOption(
          label: 'Payment & Refund Policy',
          next: 'guest_refunds',
          icon: Icons.credit_card_outlined,
        ),
        _ChatOption(
          label: 'Back to Main Menu',
          next: 'main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'guest_booking': _ChatFlow(
      message:
          'How to Book a Space\n\n1. Use the search bar to choose city, check-in/out dates, and guest count.\n2. Filter by category like Residential, Commercial, or Event Venue.\n3. Open a property to see pricing, rules, and amenities.\n4. Click Book Now to submit a booking request.\n5. Once approved, pay securely via Razorpay.',
      options: [
        _ChatOption(
          label: 'How does approval work?',
          next: 'guest_booking_approval',
          icon: Icons.schedule_rounded,
        ),
        _ChatOption(
          label: 'Can I reschedule dates?',
          next: 'guest_booking_reschedule',
          icon: Icons.calendar_month_outlined,
        ),
        _ChatOption(
          label: 'Back to Guest Menu',
          next: 'guest_main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'guest_booking_approval': _ChatFlow(
      message:
          'Booking Approval Policy\n\nHost Approval: Every booking request is sent to the host. The host must approve or reject it within 24 hours.\n\nExpiration: If a host does not respond in 24 hours, the request expires automatically.\n\nNo Advance Fee: You are charged only after the host approves the request.',
      options: [
        _ChatOption(
          label: 'Can I reschedule dates?',
          next: 'guest_booking_reschedule',
          icon: Icons.calendar_month_outlined,
        ),
        _ChatOption(
          label: 'Back to Guest Menu',
          next: 'guest_main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'guest_booking_reschedule': _ChatFlow(
      message:
          'Rescheduling & Modifications\n\nBefore Host Approval: You can cancel and submit a new request with updated dates anytime.\n\nAfter Payment: Modifications require host consent. If the host agrees, support can adjust dates on the backend.\n\nPricing Difference: If the new dates have higher rates, the difference must be paid securely.',
      options: [
        _ChatOption(
          label: 'How does approval work?',
          next: 'guest_booking_approval',
          icon: Icons.schedule_rounded,
        ),
        _ChatOption(
          label: 'Back to Guest Menu',
          next: 'guest_main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'guest_categories': _ChatFlow(
      message:
          'Categories & House Rules\n\nWe list three premium categories:\n1. Residential Stays: Villas, apartments, and farmhouses.\n2. Commercial Spaces: Co-working desks, private cabins, and meeting rooms.\n3. Event Venues: Open lawns, banquet halls, and rooftops.\n\nChoose below to learn specific rules.',
      options: [
        _ChatOption(
          label: 'Rules for Events & Shoots',
          next: 'guest_event_rules',
          icon: Icons.gavel_rounded,
        ),
        _ChatOption(
          label: 'Discounts on Workspaces',
          next: 'guest_workspace_discounts',
          icon: Icons.currency_rupee_rounded,
        ),
        _ChatOption(
          label: 'Back to Guest Menu',
          next: 'guest_main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'guest_event_rules': _ChatFlow(
      message:
          'Event & Shoot Rules\n\nGuest Limit: Every venue has a strict maximum capacity.\n\nMusic & Noise: Outdoor music or DJ must stop by 10:00 PM according to local regulations.\n\nCatering & Decor: External caterers and decorators are allowed only if pre-approved by the host.',
      options: [
        _ChatOption(
          label: 'Discounts on Workspaces',
          next: 'guest_workspace_discounts',
          icon: Icons.currency_rupee_rounded,
        ),
        _ChatOption(
          label: 'Back to Guest Menu',
          next: 'guest_main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'guest_workspace_discounts': _ChatFlow(
      message:
          'Workspace Long-term Discounts\n\nWeekly Desks: Save 10-15% on 7+ day bookings.\n\nMonthly Rates: Save up to 30% on 30+ day bookings.\n\nCorporate Rates: Contact customer.support@x-space360.com for bulk team discounts.',
      options: [
        _ChatOption(
          label: 'Rules for Events & Shoots',
          next: 'guest_event_rules',
          icon: Icons.gavel_rounded,
        ),
        _ChatOption(
          label: 'Back to Guest Menu',
          next: 'guest_main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'guest_refunds': _ChatFlow(
      message:
          'Payments & Refunds\n\nAll transactions are processed via Razorpay.\n\nService Fee: A 10% Premium Service Fee is added at checkout.\n\nCancellation Rules:\n100% Refund: Cancel up to 48 hours before check-in. Service fee is non-refundable.\n50% Refund: Cancel between 24-48 hours before check-in.\nNo Refund: Cancel less than 24 hours before check-in.',
      options: [
        _ChatOption(
          label: 'How to claim a refund?',
          next: 'guest_refund_claim',
          icon: Icons.refresh_rounded,
        ),
        _ChatOption(
          label: 'Security Deposit refunds',
          next: 'guest_security_refund',
          icon: Icons.shield_outlined,
        ),
        _ChatOption(
          label: 'Back to Guest Menu',
          next: 'guest_main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'guest_refund_claim': _ChatFlow(
      message:
          'How to Claim Your Refund\n\n1. Go to Dashboard > My Bookings.\n2. Locate your booking and click Cancel Booking.\n3. The system calculates the refund percentage based on the cancellation window.\n4. Approved refunds are initiated immediately and usually reflect in 5-7 business days.',
      options: [
        _ChatOption(
          label: 'Security Deposit refunds',
          next: 'guest_security_refund',
          icon: Icons.shield_outlined,
        ),
        _ChatOption(
          label: 'Back to Guest Menu',
          next: 'guest_main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'guest_security_refund': _ChatFlow(
      message:
          'Security Deposit Refund Policy\n\nCollection: Hosts may charge a security deposit for high-value properties.\n\nRefund Timing: The deposit is refunded within 48 hours of checkout after inspection.\n\nDisputes: For damage claims, hosts must submit photo evidence to X-Space360 within 24 hours.',
      options: [
        _ChatOption(
          label: 'How to claim a refund?',
          next: 'guest_refund_claim',
          icon: Icons.refresh_rounded,
        ),
        _ChatOption(
          label: 'Back to Guest Menu',
          next: 'guest_main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'host_main': _ChatFlow(
      message:
          'Host Support Menu\nWelcome Host! How can we help you manage your properties, payments, or account verification?',
      options: [
        _ChatOption(
          label: 'Host Onboarding & KYC',
          next: 'host_onboarding',
          icon: Icons.verified_user_outlined,
        ),
        _ChatOption(
          label: 'Listing a Space & Map Pinning',
          next: 'host_listing',
          icon: Icons.add_business_outlined,
        ),
        _ChatOption(
          label: 'Subscription Plans & Free Trial',
          next: 'host_subscriptions',
          icon: Icons.workspace_premium_outlined,
        ),
        _ChatOption(
          label: 'Payouts, Earnings & Taxes',
          next: 'host_payouts',
          icon: Icons.account_balance_wallet_outlined,
        ),
        _ChatOption(
          label: 'Back to Main Menu',
          next: 'main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'host_onboarding': _ChatFlow(
      message:
          'Host Registration & KYC Verification\n\n1. Register as a host.\n2. Open Host Dashboard > Verification.\n3. Upload Aadhaar, PAN, address proof, and Shop Act.\n4. Admin review usually completes within 24-48 hours.',
      options: [
        _ChatOption(
          label: 'Why is Shop Act mandatory?',
          next: 'host_shop_act',
          icon: Icons.info_outline_rounded,
        ),
        _ChatOption(
          label: 'KYC Rejection reasons',
          next: 'host_kyc_rejections',
          icon: Icons.warning_amber_rounded,
        ),
        _ChatOption(
          label: 'Back to Host Menu',
          next: 'host_main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'host_shop_act': _ChatFlow(
      message:
          'Shop Act License Requirement\n\nIt may be required under local commercial laws for short-term renting.\n\nIf you do not have a Shop Act, you can upload a GST certificate or an NOC from the local authority where accepted.',
      options: [
        _ChatOption(
          label: 'KYC Rejection reasons',
          next: 'host_kyc_rejections',
          icon: Icons.warning_amber_rounded,
        ),
        _ChatOption(
          label: 'Back to Host Menu',
          next: 'host_main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'host_kyc_rejections': _ChatFlow(
      message:
          'Common KYC Rejection Reasons\n\n1. Blurred images.\n2. Name mismatch across documents and bank account.\n3. Wrong or incomplete address proof.\n4. Expired licenses or local approvals.',
      options: [
        _ChatOption(
          label: 'Why is Shop Act mandatory?',
          next: 'host_shop_act',
          icon: Icons.info_outline_rounded,
        ),
        _ChatOption(
          label: 'Back to Host Menu',
          next: 'host_main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'host_listing': _ChatFlow(
      message:
          'How to List a Property\n\n1. Open Dashboard and tap List New Property.\n2. Choose category.\n3. Add pricing, deposit, and description.\n4. Add amenities and high-resolution images.\n5. Select your location on the map.',
      options: [
        _ChatOption(
          label: 'Listing Guidelines',
          next: 'host_listing_guidelines',
          icon: Icons.description_outlined,
        ),
        _ChatOption(
          label: 'How to edit active listings?',
          next: 'host_listing_edit',
          icon: Icons.edit_outlined,
        ),
        _ChatOption(
          label: 'Back to Host Menu',
          next: 'host_main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'host_listing_guidelines': _ChatFlow(
      message:
          'Property Listing Guidelines\n\nPhotos: Upload at least 5 clear photos.\n\nAccuracy: Keep map marker precise.\n\nDescription: Clearly mention house rules, check-in/out time, and extra charges.',
      options: [
        _ChatOption(
          label: 'How to edit active listings?',
          next: 'host_listing_edit',
          icon: Icons.edit_outlined,
        ),
        _ChatOption(
          label: 'Back to Host Menu',
          next: 'host_main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'host_listing_edit': _ChatFlow(
      message:
          'Editing Active Listings\n\nSimple Changes: Update description, pricing, and amenities from My Listings.\n\nCalendar Blockout: Use the calendar tab to block dates.\n\nMap Location: Coordinate changes may require admin re-approval.',
      options: [
        _ChatOption(
          label: 'Listing Guidelines',
          next: 'host_listing_guidelines',
          icon: Icons.description_outlined,
        ),
        _ChatOption(
          label: 'Back to Host Menu',
          next: 'host_main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'host_subscriptions': _ChatFlow(
      message:
          'Hosting Fees & Subscription Plans\n\nPromotional Offer: Hosting on X-Space360 is free until December 2026.\n\nPost-promo: Standard BHK-specific plans start from January 2027.',
      options: [
        _ChatOption(
          label: 'Subscription renewals post-promo',
          next: 'host_sub_renewals',
          icon: Icons.sync_rounded,
        ),
        _ChatOption(
          label: 'Upgrading/Downgrading plans',
          next: 'host_sub_changes',
          icon: Icons.tune_rounded,
        ),
        _ChatOption(
          label: 'Back to Host Menu',
          next: 'host_main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'host_sub_renewals': _ChatFlow(
      message:
          'Subscription Renewal\n\nAuto-renewal can apply once paid plans are active.\n\nIf renewal fails, a short grace period may be provided before listings are hidden.',
      options: [
        _ChatOption(
          label: 'Upgrading/Downgrading plans',
          next: 'host_sub_changes',
          icon: Icons.tune_rounded,
        ),
        _ChatOption(
          label: 'Back to Host Menu',
          next: 'host_main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'host_sub_changes': _ChatFlow(
      message:
          'Plan Upgrades and Downgrades\n\nUpgrades may use pro-rata adjustment.\n\nDowngrades generally become active from the next billing cycle.',
      options: [
        _ChatOption(
          label: 'Subscription renewals post-promo',
          next: 'host_sub_renewals',
          icon: Icons.sync_rounded,
        ),
        _ChatOption(
          label: 'Back to Host Menu',
          next: 'host_main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'host_payouts': _ChatFlow(
      message:
          'Payouts & Platform Commission\n\nX-Space360 does not deduct host commission from listed base price.\n\nGuest Booking Fee: A 10% Premium Service Fee is charged to guests.\n\nSchedule: Payouts are transferred to the verified bank account after guest checkout.\n\nTaxes: Government deductions like TDS may apply as per law.',
      options: [
        _ChatOption(
          label: 'GST & Tax Regulations',
          next: 'host_tax_details',
          icon: Icons.account_balance_outlined,
        ),
        _ChatOption(
          label: 'Delayed Payout Troubleshooting',
          next: 'host_delayed_payout',
          icon: Icons.error_outline_rounded,
        ),
        _ChatOption(
          label: 'Back to Host Menu',
          next: 'host_main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'host_tax_details': _ChatFlow(
      message:
          'GST & Indian Tax Regulations\n\nTDS may be deducted as per applicable law.\n\nHosts are responsible for GST compliance where turnover and category rules require it.',
      options: [
        _ChatOption(
          label: 'Delayed Payout Troubleshooting',
          next: 'host_delayed_payout',
          icon: Icons.error_outline_rounded,
        ),
        _ChatOption(
          label: 'Back to Host Menu',
          next: 'host_main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'host_delayed_payout': _ChatFlow(
      message:
          'Delayed Payout Troubleshooting\n\n1. Check bank account and IFSC details.\n2. Consider weekends and bank holidays.\n3. Major guest disputes can temporarily hold payouts until resolution.',
      options: [
        _ChatOption(
          label: 'GST & Tax Regulations',
          next: 'host_tax_details',
          icon: Icons.account_balance_outlined,
        ),
        _ChatOption(
          label: 'Back to Host Menu',
          next: 'host_main',
          icon: Icons.arrow_back_rounded,
        ),
      ],
    ),
    'support': _ChatFlow(
      message:
          'Contact X-Space360 Helpdesk\n\nHelpline: +91 8484826247\nSupport Hours: 9 AM - 7 PM\nEmail Support: customer.support@x-space360.com\nGrievance Desk: customer.support@x-space360.com',
      options: [
        _ChatOption(
          label: 'Main Menu',
          next: 'main',
          icon: Icons.home_rounded,
        ),
      ],
    ),
  };

  @override
  void initState() {
    super.initState();
    final flow = _flows['main']!;
    _messages.add(
      _ChatMessage(
        role: _ChatRole.bot,
        content: flow.message,
        options: flow.options,
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _handleOption(_ChatOption option) async {
    if (_isTyping) return;
    setState(() {
      _messages.add(_ChatMessage(role: _ChatRole.user, content: option.label));
      _isTyping = true;
    });
    _scrollToBottom();

    await Future<void>.delayed(const Duration(milliseconds: 500));
    final next = _flows[option.next] ?? _flows['main']!;

    setState(() {
      _messages.add(
        _ChatMessage(
          role: _ChatRole.bot,
          content: next.message,
          options: next.options,
        ),
      );
      _isTyping = false;
    });
    _scrollToBottom();
  }

  Future<void> _handleTextQuery(String text) async {
    final query = text.trim();
    if (query.isEmpty || _isTyping) return;

    setState(() {
      _messages.add(_ChatMessage(role: _ChatRole.user, content: query));
      _isTyping = true;
    });
    _controller.clear();
    _scrollToBottom();

    await Future<void>.delayed(const Duration(milliseconds: 500));
    final reply = _getLocalResponse(query);

    setState(() {
      _messages.add(
        _ChatMessage(
          role: _ChatRole.bot,
          content: reply.message,
          options: reply.options,
        ),
      );
      _isTyping = false;
    });
    _scrollToBottom();
  }

  _ChatFlow _getLocalResponse(String query) {
    final q = query.toLowerCase();

    if (q.contains('onboard') ||
        q.contains('register') ||
        q.contains('signup') ||
        q.contains('kyc') ||
        q.contains('aadhaar') ||
        q.contains('pan') ||
        q.contains('document')) {
      return _flows['host_onboarding']!;
    }

    if (q.contains('list') ||
        q.contains('property') ||
        q.contains('villa') ||
        q.contains('host') ||
        q.contains('space')) {
      return _flows['host_listing']!;
    }

    if (q.contains('plan') ||
        q.contains('price') ||
        q.contains('fee') ||
        q.contains('charge') ||
        q.contains('subscription')) {
      return _flows['host_subscriptions']!;
    }

    if (q.contains('refund') ||
        q.contains('cancel') ||
        q.contains('booking') ||
        q.contains('book')) {
      return _flows['guest_refunds']!;
    }

    if (q.contains('support') ||
        q.contains('help') ||
        q.contains('contact') ||
        q.contains('phone') ||
        q.contains('email') ||
        q.contains('call')) {
      return _flows['support']!;
    }

    return const _ChatFlow(
      message:
          'X-Space360 Assistant\n\nI could not find a direct match for your question.\n\nTry one of these topics:\n- Host Registration & Verification\n- How to List a Property\n- Subscription Plans\n- Refund Policy\n- Contact Support',
      options: [
        _ChatOption(
          label: 'Host Onboarding',
          next: 'host_onboarding',
          icon: Icons.verified_user_outlined,
        ),
        _ChatOption(
          label: 'List Property',
          next: 'host_listing',
          icon: Icons.add_business_outlined,
        ),
        _ChatOption(
          label: 'Plans',
          next: 'host_subscriptions',
          icon: Icons.workspace_premium_outlined,
        ),
        _ChatOption(
          label: 'Refunds',
          next: 'guest_refunds',
          icon: Icons.receipt_long_outlined,
        ),
        _ChatOption(
          label: 'Contact Support',
          next: 'support',
          icon: Icons.call_outlined,
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F4EE),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.white,
        titleSpacing: 16,
        title: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(
                Icons.support_agent_rounded,
                color: AppTheme.primary,
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'X-Space360 Helpdesk',
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.charcoal,
                  ),
                ),
                Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(
                        color: Color(0xFF2ED08C),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Guided support bot',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.charcoalMuted,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.fromLTRB(16, 18, 16, 12),
              itemCount: _messages.length + (_isTyping ? 1 : 0),
              itemBuilder: (context, index) {
                if (_isTyping && index == _messages.length) {
                  return _TypingBubble();
                }

                final message = _messages[index];
                final isUser = message.role == _ChatRole.user;

                return Align(
                  alignment:
                      isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width * 0.84,
                    ),
                    child: Column(
                      crossAxisAlignment: isUser
                          ? CrossAxisAlignment.end
                          : CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 15,
                            vertical: 13,
                          ),
                          decoration: BoxDecoration(
                            color: isUser ? AppTheme.primary : Colors.white,
                            borderRadius: BorderRadius.only(
                              topLeft: const Radius.circular(20),
                              topRight: const Radius.circular(20),
                              bottomLeft: Radius.circular(isUser ? 20 : 8),
                              bottomRight: Radius.circular(isUser ? 8 : 20),
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.05),
                                blurRadius: 12,
                                offset: const Offset(0, 6),
                              ),
                            ],
                          ),
                          child: Text(
                            message.content,
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              height: 1.55,
                              fontWeight:
                                  isUser ? FontWeight.w700 : FontWeight.w600,
                              color: isUser ? Colors.white : AppTheme.charcoal,
                            ),
                          ),
                        ),
                        if (!isUser &&
                            message.options != null &&
                            message.options!.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: message.options!
                                .map(
                                  (option) => InkWell(
                                    onTap: () => _handleOption(option),
                                    borderRadius: BorderRadius.circular(14),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 10,
                                      ),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(14),
                                        border: Border.all(
                                          color: AppTheme.border,
                                        ),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(
                                            option.icon,
                                            size: 16,
                                            color: AppTheme.primary,
                                          ),
                                          const SizedBox(width: 8),
                                          Flexible(
                                            child: Text(
                                              option.label,
                                              style: GoogleFonts.inter(
                                                fontSize: 12,
                                                fontWeight: FontWeight.w700,
                                                color: AppTheme.charcoal,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                )
                                .toList(),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 16),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(
                top: BorderSide(color: Colors.grey.shade200),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    onSubmitted: _handleTextQuery,
                    style: GoogleFonts.inter(fontSize: 14),
                    decoration: InputDecoration(
                      hintText:
                          'Ask about booking, listing, refund, or support',
                      hintStyle: GoogleFonts.inter(
                        fontSize: 13,
                        color: AppTheme.charcoalMuted,
                      ),
                      filled: true,
                      fillColor: const Color(0xFFF7F4EE),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  width: 48,
                  height: 48,
                  decoration: const BoxDecoration(
                    color: AppTheme.primary,
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    onPressed: () => _handleTextQuery(_controller.text),
                    icon: const Icon(
                      Icons.send_rounded,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TypingBubble extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(
            3,
            (index) => Container(
              width: 7,
              height: 7,
              margin: const EdgeInsets.symmetric(horizontal: 3),
              decoration: const BoxDecoration(
                color: AppTheme.primary,
                shape: BoxShape.circle,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

enum _ChatRole { user, bot }

class _ChatMessage {
  final _ChatRole role;
  final String content;
  final List<_ChatOption>? options;

  const _ChatMessage({
    required this.role,
    required this.content,
    this.options,
  });
}

class _ChatFlow {
  final String message;
  final List<_ChatOption> options;

  const _ChatFlow({
    required this.message,
    required this.options,
  });
}

class _ChatOption {
  final String label;
  final String next;
  final IconData icon;

  const _ChatOption({
    required this.label,
    required this.next,
    required this.icon,
  });
}
