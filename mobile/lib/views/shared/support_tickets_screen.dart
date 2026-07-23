import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../providers/support_ticket_provider.dart';
import '../../theme.dart';

class SupportTicketsScreen extends StatefulWidget {
  const SupportTicketsScreen({super.key});

  @override
  State<SupportTicketsScreen> createState() => _SupportTicketsScreenState();
}

class _SupportTicketsScreenState extends State<SupportTicketsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _subjectController = TextEditingController();
  final _messageController = TextEditingController();

  String _category = 'general';
  String _priority = 'normal';
  String _activeTab = 'tickets';
  bool _showTicketForm = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider =
          Provider.of<SupportTicketProvider>(context, listen: false);
      provider.getMyTickets();
      provider.getSupportContent();
    });
  }

  @override
  void dispose() {
    _subjectController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  String _formatDate(dynamic value) {
    if (value == null) return '';
    try {
      return DateFormat('d MMM yyyy, hh:mm a')
          .format(DateTime.parse(value.toString()).toLocal());
    } catch (_) {
      return value.toString();
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'resolved':
      case 'closed':
        return Colors.green.shade700;
      case 'in_progress':
        return Colors.blue.shade700;
      default:
        return AppTheme.primary;
    }
  }

  Future<void> _submitTicket() async {
    if (!_formKey.currentState!.validate()) return;
    final messenger = ScaffoldMessenger.of(context);
    final ok = await Provider.of<SupportTicketProvider>(context, listen: false)
        .createTicket({
      'subject': _subjectController.text.trim(),
      'message': _messageController.text.trim(),
      'category': _category,
      'priority': _priority,
    });

    if (!mounted) return;
    messenger.showSnackBar(
      SnackBar(
        content: Text(ok ? 'Ticket submitted.' : 'Unable to submit ticket.'),
      ),
    );
    if (ok) {
      setState(() {
        _subjectController.clear();
        _messageController.clear();
        _category = 'general';
        _priority = 'normal';
        _showTicketForm = false;
      });
    }
  }

  Future<void> _refreshSupport() async {
    final provider = Provider.of<SupportTicketProvider>(context, listen: false);
    await Future.wait([
      provider.getMyTickets(),
      provider.getSupportContent(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<SupportTicketProvider>(context);

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppTheme.primary,
          onRefresh: _refreshSupport,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(22, 18, 22, 28),
            children: [
              _SupportHeader(
                onBack: () => Navigator.maybePop(context),
                onNewTicket: () {
                  setState(() {
                    _activeTab = 'tickets';
                    _showTicketForm = true;
                  });
                },
              ),
              const SizedBox(height: 24),
              _SupportTabs(
                activeTab: _activeTab,
                onChanged: (value) => setState(() => _activeTab = value),
              ),
              const SizedBox(height: 22),
              if (_activeTab == 'tickets') ...[
                if (provider.isLoading)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 80),
                    child: Center(
                      child: CircularProgressIndicator(
                        color: AppTheme.primary,
                      ),
                    ),
                  )
                else if (provider.myTickets.isEmpty)
                  const _EmptyTickets()
                else
                  ...provider.myTickets.map(
                    (ticket) => _SupportTicketCard(
                      ticket: ticket,
                      statusColor:
                          _statusColor((ticket['status'] ?? 'open').toString()),
                      formatDate: _formatDate,
                    ),
                  ),
                if (_showTicketForm) ...[
                  const SizedBox(height: 22),
                  _InlineSupportTicketForm(
                    formKey: _formKey,
                    subjectController: _subjectController,
                    messageController: _messageController,
                    category: _category,
                    priority: _priority,
                    onCategoryChanged: (value) =>
                        setState(() => _category = value),
                    onPriorityChanged: (value) =>
                        setState(() => _priority = value),
                    onClose: () => setState(() => _showTicketForm = false),
                    onSubmit: _submitTicket,
                  ),
                ],
              ] else if (_activeTab == 'faqs')
                _CmsFaqPanel(
                  title: provider.supportContent['faq_title'] ?? 'FAQs',
                  subtitle: provider.supportContent['subtitle'] ??
                      'Find answers from the support page CMS.',
                  faqItems: provider.faqItems,
                )
              else
                _ContactUsPanel(
                  supportContent: provider.supportContent,
                  onRaiseTicket: () {
                    setState(() {
                      _activeTab = 'tickets';
                      _showTicketForm = true;
                    });
                  },
                  onViewFaqs: () => setState(() => _activeTab = 'faqs'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SupportHeader extends StatelessWidget {
  final VoidCallback onBack;
  final VoidCallback onNewTicket;

  const _SupportHeader({required this.onBack, required this.onNewTicket});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        IconButton(
          onPressed: onBack,
          icon: const Icon(Icons.arrow_back_rounded),
          color: AppTheme.primaryHover,
          iconSize: 30,
          tooltip: 'Back',
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            'Support',
            style: GoogleFonts.manrope(
              fontSize: 30,
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoal,
            ),
          ),
        ),
        TextButton.icon(
          onPressed: onNewTicket,
          icon: const Icon(Icons.add_rounded, size: 24),
          label: const Text('New Ticket'),
          style: TextButton.styleFrom(
            foregroundColor: AppTheme.primaryHover,
            backgroundColor: AppTheme.primary.withValues(alpha: 0.10),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            textStyle: GoogleFonts.manrope(
              fontSize: 15,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ],
    );
  }
}

class _SupportTabs extends StatelessWidget {
  final String activeTab;
  final ValueChanged<String> onChanged;

  const _SupportTabs({required this.activeTab, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final tabs = [
      ('tickets', Icons.confirmation_number_outlined, 'My Tickets'),
      ('faqs', Icons.help_outline_rounded, 'FAQs'),
      ('contact', Icons.headset_mic_outlined, 'Contact Us'),
    ];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: tabs.map((tab) {
          final selected = activeTab == tab.$1;
          return Expanded(
            child: InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: () => onChanged(tab.$1),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(
                      color: selected ? AppTheme.primary : Colors.transparent,
                      width: 3,
                    ),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      tab.$2,
                      size: 21,
                      color: selected
                          ? AppTheme.primaryHover
                          : AppTheme.charcoalMuted,
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        tab.$3,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.manrope(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: selected
                              ? AppTheme.primaryHover
                              : AppTheme.charcoalLight,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _SupportTicketCard extends StatelessWidget {
  final dynamic ticket;
  final Color statusColor;
  final String Function(dynamic) formatDate;

  const _SupportTicketCard({
    required this.ticket,
    required this.statusColor,
    required this.formatDate,
  });

  IconData _iconForCategory(String category) {
    switch (category) {
      case 'booking':
        return Icons.calendar_month_outlined;
      case 'property':
        return Icons.home_work_outlined;
      case 'payout':
        return Icons.account_balance_wallet_outlined;
      case 'verification':
        return Icons.verified_user_outlined;
      default:
        return Icons.support_agent_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = (ticket['status'] ?? 'open').toString();
    final category = (ticket['category'] ?? 'general').toString();
    final response = (ticket['admin_response'] ?? '').toString();

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppTheme.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              color: AppTheme.primary.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(
              _iconForCategory(category),
              color: AppTheme.primaryHover,
              size: 28,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        ticket['subject'] ?? 'Support ticket',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.manrope(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.charcoal,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 11, vertical: 6),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        status.replaceAll('_', ' ').toUpperCase(),
                        style: GoogleFonts.manrope(
                          color: statusColor,
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 7),
                Text(
                  ticket['message'] ?? '',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.manrope(
                    color: AppTheme.charcoalLight,
                    fontSize: 14,
                    height: 1.45,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (response.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withValues(alpha: 0.11),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      'ADMIN RESPONSE',
                      style: GoogleFonts.manrope(
                        color: AppTheme.primaryHover,
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    response,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.manrope(
                      color: AppTheme.charcoalLight,
                      fontSize: 14,
                      height: 1.45,
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(Icons.calendar_month_outlined,
                        size: 18, color: AppTheme.charcoalMuted),
                    const SizedBox(width: 6),
                    Text(
                      formatDate(ticket['created_at']),
                      style: GoogleFonts.manrope(
                        color: AppTheme.charcoalLight,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          const Icon(Icons.chevron_right_rounded,
              color: AppTheme.secondary, size: 34),
        ],
      ),
    );
  }
}

class _InlineSupportTicketForm extends StatelessWidget {
  final GlobalKey<FormState> formKey;
  final TextEditingController subjectController;
  final TextEditingController messageController;
  final String category;
  final String priority;
  final ValueChanged<String> onCategoryChanged;
  final ValueChanged<String> onPriorityChanged;
  final VoidCallback onClose;
  final VoidCallback onSubmit;

  const _InlineSupportTicketForm({
    required this.formKey,
    required this.subjectController,
    required this.messageController,
    required this.category,
    required this.priority,
    required this.onCategoryChanged,
    required this.onPriorityChanged,
    required this.onClose,
    required this.onSubmit,
  });

  InputDecoration _fieldDecoration(String hint, IconData icon,
      {bool message = false}) {
    return InputDecoration(
      hintText: hint,
      prefixIcon:
          message ? null : Icon(icon, color: AppTheme.charcoalMuted, size: 22),
      filled: true,
      fillColor: AppTheme.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppTheme.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppTheme.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppTheme.primary, width: 1.5),
      ),
      hintStyle: GoogleFonts.manrope(
        color: AppTheme.charcoalMuted,
        fontSize: 14,
        fontWeight: FontWeight.w600,
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.red.shade300, width: 1.2),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.red.shade400, width: 1.4),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<SupportTicketProvider>(context);

    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: AppTheme.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Form(
        key: formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Raise Support Ticket',
                    style: GoogleFonts.manrope(
                      fontSize: 21,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.charcoal,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: onClose,
                  icon: const Icon(Icons.close_rounded),
                  color: AppTheme.charcoal,
                  iconSize: 28,
                  tooltip: 'Close',
                ),
              ],
            ),
            const SizedBox(height: 18),
            const _RequiredLabel('Subject'),
            const SizedBox(height: 8),
            TextFormField(
              controller: subjectController,
              textInputAction: TextInputAction.next,
              decoration:
                  _fieldDecoration('Enter subject', Icons.description_outlined),
              style: GoogleFonts.manrope(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: AppTheme.charcoal,
              ),
              validator: (value) => value == null || value.trim().length < 3
                  ? 'Enter a subject'
                  : null,
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const _RequiredLabel('Category'),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        initialValue: category,
                        decoration: _fieldDecoration(
                            'General', Icons.format_list_bulleted_rounded),
                        icon: const Icon(Icons.keyboard_arrow_down_rounded),
                        style: GoogleFonts.manrope(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.charcoal,
                        ),
                        items: const [
                          DropdownMenuItem(
                              value: 'general', child: Text('General')),
                          DropdownMenuItem(
                              value: 'booking', child: Text('Booking')),
                          DropdownMenuItem(
                              value: 'property', child: Text('Property')),
                          DropdownMenuItem(
                              value: 'payout', child: Text('Payout')),
                          DropdownMenuItem(
                              value: 'verification',
                              child: Text('Verification')),
                        ],
                        onChanged: (value) =>
                            onCategoryChanged(value ?? 'general'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const _RequiredLabel('Priority'),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        initialValue: priority,
                        decoration:
                            _fieldDecoration('Normal', Icons.flag_outlined),
                        icon: const Icon(Icons.keyboard_arrow_down_rounded),
                        style: GoogleFonts.manrope(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.charcoal,
                        ),
                        items: const [
                          DropdownMenuItem(value: 'low', child: Text('Low')),
                          DropdownMenuItem(
                              value: 'normal', child: Text('Normal')),
                          DropdownMenuItem(value: 'high', child: Text('High')),
                          DropdownMenuItem(
                              value: 'urgent', child: Text('Urgent')),
                        ],
                        onChanged: (value) =>
                            onPriorityChanged(value ?? 'normal'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            const _RequiredLabel('Message'),
            const SizedBox(height: 8),
            ValueListenableBuilder<TextEditingValue>(
              valueListenable: messageController,
              builder: (context, value, child) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    TextFormField(
                      controller: messageController,
                      minLines: 7,
                      maxLines: 9,
                      maxLength: 1000,
                      textInputAction: TextInputAction.newline,
                      decoration: _fieldDecoration(
                              'Type your message here...', Icons.message,
                              message: true)
                          .copyWith(counterText: ''),
                      style: GoogleFonts.manrope(
                        fontSize: 15,
                        height: 1.4,
                        color: AppTheme.charcoal,
                      ),
                      validator: (text) =>
                          text == null || text.trim().length < 5
                              ? 'Describe your issue'
                              : null,
                    ),
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        '${value.text.length}/1000',
                        style: GoogleFonts.manrope(
                          color: AppTheme.charcoalMuted,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 16),
            Container(
              height: 72,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.border, width: 1),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.attach_file_rounded,
                      color: AppTheme.charcoal, size: 26),
                  const SizedBox(width: 12),
                  Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Attach files (Optional)',
                        style: GoogleFonts.manrope(
                          color: AppTheme.charcoal,
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        'PNG, JPG, PDF up to 10MB',
                        style: GoogleFonts.manrope(
                          color: AppTheme.charcoalMuted,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            SizedBox(
              height: 56,
              child: ElevatedButton.icon(
                onPressed: provider.isLoading ? null : onSubmit,
                icon: provider.isLoading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.send_rounded,
                        color: Colors.white, size: 24),
                label: Text(
                  provider.isLoading ? 'Submitting...' : 'Submit Ticket',
                  style: GoogleFonts.manrope(
                    color: Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  disabledBackgroundColor:
                      AppTheme.primary.withValues(alpha: 0.55),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  elevation: 0,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RequiredLabel extends StatelessWidget {
  final String text;

  const _RequiredLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return RichText(
      text: TextSpan(
        text: text,
        style: GoogleFonts.manrope(
          color: AppTheme.charcoal,
          fontSize: 14,
          fontWeight: FontWeight.w700,
        ),
        children: [
          TextSpan(
            text: ' *',
            style: GoogleFonts.manrope(
              color: Colors.red.shade600,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyTickets extends StatelessWidget {
  const _EmptyTickets();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 80, horizontal: 24),
      decoration: BoxDecoration(
        color: AppTheme.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          const Icon(Icons.support_agent_rounded,
              size: 64, color: AppTheme.charcoalMuted),
          const SizedBox(height: 16),
          Text(
            'No support tickets yet.',
            style: GoogleFonts.manrope(
              color: AppTheme.charcoalLight,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _CmsFaqPanel extends StatelessWidget {
  final String title;
  final String subtitle;
  final List<dynamic> faqItems;

  const _CmsFaqPanel({
    required this.title,
    required this.subtitle,
    required this.faqItems,
  });

  @override
  Widget build(BuildContext context) {
    final visibleItems = faqItems.where((item) {
      if (item is! Map) return false;
      return (item['question'] ?? '').toString().trim().isNotEmpty;
    }).toList();

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppTheme.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppTheme.primary.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.help_outline_rounded,
              color: AppTheme.primaryHover,
              size: 25,
            ),
          ),
          const SizedBox(height: 14),
          Text(
            title,
            style: GoogleFonts.manrope(
              color: AppTheme.charcoal,
              fontSize: 20,
              fontWeight: FontWeight.w800,
            ),
          ),
          if (subtitle.trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: GoogleFonts.manrope(
                color: AppTheme.charcoalMuted,
                fontSize: 14,
                height: 1.45,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
          const SizedBox(height: 16),
          if (visibleItems.isEmpty)
            Text(
              'No FAQs added yet.',
              style: GoogleFonts.manrope(
                color: AppTheme.charcoalMuted,
                fontWeight: FontWeight.w700,
              ),
            )
          else
            ...visibleItems.map((item) {
              final faq = item as Map;
              final answer = (faq['answer'] ?? '').toString().trim();
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  color: AppTheme.background,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Theme(
                  data: Theme.of(context).copyWith(
                    dividerColor: Colors.transparent,
                    splashColor: Colors.transparent,
                  ),
                  child: ExpansionTile(
                    tilePadding: const EdgeInsets.symmetric(horizontal: 14),
                    childrenPadding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                    iconColor: AppTheme.primaryHover,
                    collapsedIconColor: AppTheme.charcoalMuted,
                    title: Text(
                      (faq['question'] ?? '').toString(),
                      style: GoogleFonts.manrope(
                        color: AppTheme.charcoal,
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    children: [
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          answer.isEmpty
                              ? 'Details will be updated soon.'
                              : answer,
                          style: GoogleFonts.manrope(
                            color: AppTheme.charcoalLight,
                            fontSize: 13,
                            height: 1.5,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}

class _ContactUsPanel extends StatelessWidget {
  final Map<String, dynamic> supportContent;
  final VoidCallback onRaiseTicket;
  final VoidCallback onViewFaqs;

  const _ContactUsPanel({
    required this.supportContent,
    required this.onRaiseTicket,
    required this.onViewFaqs,
  });

  String _cardValue(String id, String fallback) {
    final cards = supportContent['cards'];
    if (cards is List) {
      for (final item in cards) {
        if (item is Map && item['id'] == id) {
          final value = (item['action_value'] ?? item['button_text'] ?? '')
              .toString()
              .trim();
          if (value.isNotEmpty && value != '#') return value;
        }
      }
    }
    return fallback;
  }

  String _hoursValue() {
    final hours = supportContent['support_hours'];
    if (hours is List && hours.isNotEmpty && hours.first is Map) {
      final first = hours.first as Map;
      final value = (first['hours'] ?? '').toString().trim();
      if (value.isNotEmpty) return value;
    }
    return '9:00 AM - 7:00 PM';
  }

  @override
  Widget build(BuildContext context) {
    final email = _cardValue('email_support', 'support@x-space360.com');
    final phone = _cardValue('call_support', '+91 8484826247');
    final hours = _hoursValue();

    return Container(
      padding: EdgeInsets.zero,
      decoration: BoxDecoration(
        color: AppTheme.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(24),
            child: Row(
              children: [
                Container(
                  width: 86,
                  height: 86,
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.10),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.headset_mic_outlined,
                    color: AppTheme.primaryHover,
                    size: 44,
                  ),
                ),
                const SizedBox(width: 18),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Contact Us',
                        style: GoogleFonts.manrope(
                          color: AppTheme.charcoal,
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        "We're here to help! Reach out to us through any of the following channels.",
                        style: GoogleFonts.manrope(
                          color: AppTheme.charcoalLight,
                          fontSize: 14,
                          height: 1.45,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: AppTheme.border),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Get in Touch',
                  style: GoogleFonts.manrope(
                    color: AppTheme.charcoal,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 14),
                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Column(
                    children: [
                      _ContactActionRow(
                        icon: Icons.mail_outline_rounded,
                        title: 'Email',
                        value: email,
                      ),
                      const Divider(height: 1, color: AppTheme.border),
                      _ContactActionRow(
                        icon: Icons.phone_in_talk_outlined,
                        title: 'Helpline',
                        value: phone,
                      ),
                      const Divider(height: 1, color: AppTheme.border),
                      _ContactActionRow(
                        icon: Icons.schedule_rounded,
                        title: 'Working Hours',
                        value: hours,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
            child: Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppTheme.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Need Immediate Help?',
                              style: GoogleFonts.manrope(
                                color: AppTheme.charcoal,
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Raise a support ticket and our team will get back to you as soon as possible.',
                              style: GoogleFonts.manrope(
                                color: AppTheme.charcoalLight,
                                fontSize: 14,
                                height: 1.45,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withValues(alpha: 0.10),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.support_agent_rounded,
                          color: AppTheme.primaryHover,
                          size: 38,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton.icon(
                      onPressed: onRaiseTicket,
                      icon: const Icon(Icons.confirmation_number_outlined,
                          color: Colors.white),
                      label: Text(
                        'Raise a Ticket',
                        style: GoogleFonts.manrope(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 22),
            child: Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppTheme.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'FAQs',
                              style: GoogleFonts.manrope(
                                color: AppTheme.charcoal,
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Find quick answers to common questions.',
                              style: GoogleFonts.manrope(
                                color: AppTheme.charcoalLight,
                                fontSize: 14,
                                height: 1.45,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        width: 66,
                        height: 66,
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withValues(alpha: 0.10),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.help_outline_rounded,
                          color: AppTheme.primaryHover,
                          size: 36,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: OutlinedButton(
                      onPressed: onViewFaqs,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.primaryHover,
                        side: const BorderSide(
                          color: AppTheme.primary,
                          width: 1.4,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'View FAQs',
                            style: GoogleFonts.manrope(
                              color: AppTheme.primaryHover,
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(width: 12),
                          const Icon(Icons.chevron_right_rounded, size: 28),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ContactActionRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;

  const _ContactActionRow({
    required this.icon,
    required this.title,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      child: Row(
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: AppTheme.primary.withValues(alpha: 0.10),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: AppTheme.primaryHover, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.manrope(
                    color: AppTheme.charcoal,
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.manrope(
                    color: AppTheme.charcoalLight,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          const Icon(
            Icons.chevron_right_rounded,
            color: AppTheme.primaryHover,
            size: 30,
          ),
        ],
      ),
    );
  }
}
