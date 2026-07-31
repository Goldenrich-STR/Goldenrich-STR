import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../providers/support_ticket_provider.dart';
import '../../services/api_service.dart';
import '../../theme.dart';
import '../guest/ai_chat_screen.dart';

class AboutUsScreen extends StatelessWidget {
  const AboutUsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cards = [
      (
        icon: Icons.verified_user_outlined,
        title: 'Absolute Trust',
        body:
            'Every listing goes through physical verification, geolocation checks, and quality review before going live.',
      ),
      (
        icon: Icons.design_services_outlined,
        title: 'Curated Design',
        body:
            'We focus on premium stays, event venues, and business spaces that feel intentional, polished, and guest-ready.',
      ),
      (
        icon: Icons.bolt_outlined,
        title: 'Seamless Experience',
        body:
            'From discovery to booking to support, the platform is built to reduce friction for both guests and hosts.',
      ),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF7F4EE),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          'About Us',
          style: GoogleFonts.manrope(
            color: AppTheme.charcoal,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Redefining short-term rentals in India through curation, technology, and superior service.',
                  style: GoogleFonts.cormorantGaramond(
                    fontSize: 34,
                    height: 1.05,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.charcoal,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'X-Space360 was founded to create a curated portfolio of short-term rentals, event venues, and commercial spaces across India that offer a higher standard of comfort, design, and trust.',
                  style: GoogleFonts.manrope(
                    fontSize: 15,
                    height: 1.7,
                    color: AppTheme.charcoalMuted,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),
          _SectionCard(
            title: 'Our Story',
            body:
                'Backed by Golden Rich Financial Solutions and Real Estate Solutions Pvt Ltd, X-Space360 bridges the gap between traditional leasing and flexible, high-quality rental experiences for guests, hosts, and businesses.',
          ),
          const SizedBox(height: 16),
          _SectionCard(
            title: 'Our Vision',
            body:
                'To become India\'s most trusted destination for curated living, working, and event spaces with strong verification standards and premium presentation.',
          ),
          const SizedBox(height: 16),
          _SectionCard(
            title: 'Our Mission',
            body:
                'To help hosts unlock better yield from quality spaces and help guests discover verified, dependable, well-designed properties through smart technology.',
          ),
          const SizedBox(height: 22),
          Text(
            'Core Values',
            style: GoogleFonts.manrope(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 14),
          ...cards.map(
            (card) => Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: AppTheme.sand,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(card.icon, color: AppTheme.primary),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            card.title,
                            style: GoogleFonts.manrope(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.charcoal,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            card.body,
                            style: GoogleFonts.manrope(
                              fontSize: 13,
                              height: 1.65,
                              color: AppTheme.charcoalMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class SupportCenterScreen extends StatefulWidget {
  const SupportCenterScreen({super.key});

  @override
  State<SupportCenterScreen> createState() => _SupportCenterScreenState();
}

class _SupportCenterScreenState extends State<SupportCenterScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _subjectController = TextEditingController();
  final _messageController = TextEditingController();
  bool _submitting = false;
  String _searchQuery = '';
  String? _expandedFaqId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SupportTicketProvider>().getSupportContent();
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _subjectController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _submitContact() async {
    if (_nameController.text.trim().isEmpty ||
        _emailController.text.trim().isEmpty ||
        _phoneController.text.trim().isEmpty ||
        _subjectController.text.trim().isEmpty ||
        _messageController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill in all the fields.')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      await ApiService().dio.post('/cms/contact', data: {
        'name': _nameController.text.trim(),
        'email': _emailController.text.trim(),
        'phone': _phoneController.text.trim(),
        'subject': _subjectController.text.trim(),
        'message': _messageController.text.trim(),
      });
      if (!mounted) return;
      _nameController.clear();
      _emailController.clear();
      _phoneController.clear();
      _subjectController.clear();
      _messageController.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Support request submitted successfully.')),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to submit your request. Please try again.'),
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _openExternal(String value, String scheme) async {
    final uri = Uri.parse('$scheme:$value');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<SupportTicketProvider>();
    final data = provider.supportContent;
    final cards = (data['cards'] as List?) ?? const [];
    final supportTitle =
        data['title']?.toString() ?? 'How can we help you today?';
    final supportSubtitle = data['subtitle']?.toString() ??
        'We are here to help with bookings, hosts, billing, and support requests.';
    final faqs = provider.faqItems
        .map((item) => Map<String, dynamic>.from(item as Map))
        .where((item) =>
            (item['question'] ?? '').toString().trim().isNotEmpty)
        .toList();
    final filteredFaqs = faqs.where((faq) {
      final q = (faq['question'] ?? '').toString().toLowerCase();
      final a = (faq['answer'] ?? '').toString().toLowerCase();
      final search = _searchQuery.toLowerCase();
      return q.contains(search) || a.contains(search);
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF7F4EE),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          'Support',
          style: GoogleFonts.manrope(
            color: AppTheme.charcoal,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  supportTitle,
                  style: GoogleFonts.cormorantGaramond(
                    fontSize: 34,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.charcoal,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  supportSubtitle,
                  style: GoogleFonts.manrope(
                    fontSize: 14,
                    height: 1.7,
                    color: AppTheme.charcoalMuted,
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  onChanged: (value) => setState(() => _searchQuery = value),
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.search_rounded),
                    hintText: 'Search help articles...',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: cards.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 0.96,
            ),
            itemBuilder: (context, index) {
              final card = Map<String, dynamic>.from(cards[index] as Map);
              final cardId = card['id']?.toString() ?? '';
              return InkWell(
                onTap: () async {
                  final actionValue = card['action_value']?.toString() ?? '';
                  if (cardId == 'live_chat') {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const AIChatScreen()),
                    );
                    return;
                  }
                  if (cardId == 'email_support' && actionValue.isNotEmpty) {
                    await _openExternal(actionValue, 'mailto');
                    return;
                  }
                  if (cardId == 'call_support' && actionValue.isNotEmpty) {
                    await _openExternal(actionValue, 'tel');
                    return;
                  }
                  if (actionValue.startsWith('#faq')) {
                    setState(() => _expandedFaqId = null);
                  }
                },
                borderRadius: BorderRadius.circular(22),
                child: Container(
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
                        child: Icon(
                          cardId == 'email_support'
                              ? Icons.mail_outline_rounded
                              : cardId == 'call_support'
                                  ? Icons.call_outlined
                                  : cardId == 'live_chat'
                                      ? Icons.forum_outlined
                                      : Icons.article_outlined,
                          color: AppTheme.primary,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        card['title']?.toString() ?? '',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.manrope(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.charcoal,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        card['description']?.toString() ?? '',
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.manrope(
                          fontSize: 12,
                          height: 1.5,
                          color: AppTheme.charcoalMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 22),
          Text(
            'Frequently Asked Questions',
            style: GoogleFonts.manrope(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 12),
          ...filteredFaqs.map((faq) {
            final id = faq['id']?.toString() ?? faq['question'].toString();
            final expanded = _expandedFaqId == id;
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppTheme.border),
              ),
              child: ExpansionTile(
                key: PageStorageKey(id),
                initiallyExpanded: expanded,
                onExpansionChanged: (value) {
                  setState(() => _expandedFaqId = value ? id : null);
                },
                tilePadding:
                    const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
                childrenPadding:
                    const EdgeInsets.fromLTRB(18, 0, 18, 18),
                title: Text(
                  faq['question']?.toString() ?? '',
                  style: GoogleFonts.manrope(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.charcoal,
                  ),
                ),
                children: [
                  Text(
                    (faq['answer']?.toString().trim().isNotEmpty == true)
                        ? faq['answer'].toString()
                        : 'Details will be updated soon.',
                    style: GoogleFonts.manrope(
                      fontSize: 13,
                      height: 1.65,
                      color: AppTheme.charcoalMuted,
                    ),
                  ),
                ],
              ),
            );
          }),
          const SizedBox(height: 22),
          Container(
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
                  'Contact Support',
                  style: GoogleFonts.manrope(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.charcoal,
                  ),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _nameController,
                  decoration: const InputDecoration(labelText: 'Name'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Phone'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _subjectController,
                  decoration: const InputDecoration(labelText: 'Subject'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _messageController,
                  minLines: 4,
                  maxLines: 5,
                  decoration: const InputDecoration(labelText: 'Message'),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _submitContact,
                    child: Text(_submitting ? 'Submitting...' : 'Send Request'),
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

class LegalPoliciesScreen extends StatelessWidget {
  final List<LegalPolicyData> policies;

  const LegalPoliciesScreen({
    super.key,
    required this.policies,
  });

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: policies.length,
      child: Scaffold(
        backgroundColor: const Color(0xFFF7F4EE),
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: Text(
            'Legal',
            style: GoogleFonts.manrope(
              color: AppTheme.charcoal,
              fontWeight: FontWeight.w800,
            ),
          ),
          bottom: TabBar(
            isScrollable: true,
            labelColor: AppTheme.primary,
            unselectedLabelColor: AppTheme.charcoalMuted,
            indicatorColor: AppTheme.primary,
            tabs: [
              for (final policy in policies) Tab(text: policy.label),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            for (final policy in policies)
              ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  Container(
                    padding: const EdgeInsets.all(22),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          policy.title,
                          style: GoogleFonts.manrope(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.charcoal,
                          ),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          policy.content,
                          style: GoogleFonts.manrope(
                            fontSize: 14,
                            height: 1.8,
                            color: AppTheme.charcoalMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class LegalPolicyData {
  final String label;
  final String title;
  final String content;

  const LegalPolicyData({
    required this.label,
    required this.title,
    required this.content,
  });
}

class _SectionCard extends StatelessWidget {
  final String title;
  final String body;

  const _SectionCard({
    required this.title,
    required this.body,
  });

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
            style: GoogleFonts.manrope(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            body,
            style: GoogleFonts.manrope(
              fontSize: 14,
              height: 1.75,
              color: AppTheme.charcoalMuted,
            ),
          ),
        ],
      ),
    );
  }
}
