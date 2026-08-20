import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../providers/account_provider.dart';
import '../../theme.dart';
import '../../utils/currency_formatter.dart';

class HostPayoutsScreen extends StatefulWidget {
  const HostPayoutsScreen({super.key});

  @override
  State<HostPayoutsScreen> createState() => _HostPayoutsScreenState();
}

class _HostPayoutsScreenState extends State<HostPayoutsScreen>
    with SingleTickerProviderStateMixin {
  static const String _payoutCycle = 'weekly';

  late final TabController _tabController;
  final _prefFormKey = GlobalKey<FormState>();
  final _upiIdController = TextEditingController();
  final _bankNameController = TextEditingController();
  final _accNumController = TextEditingController();
  final _accHolderController = TextEditingController();
  final _ifscController = TextEditingController();

  String _preferred = 'upi';
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _upiIdController.dispose();
    _bankNameController.dispose();
    _accNumController.dispose();
    _accHolderController.dispose();
    _ifscController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    final accountProvider =
        Provider.of<AccountProvider>(context, listen: false);
    await accountProvider.getHostPayoutPreference();
    await accountProvider.getHostPayouts();
    final pref = accountProvider.payoutPreference;
    if (!mounted) return;
    setState(() {
      _preferred = (pref['preferred'] ?? 'upi').toString();
      _upiIdController.text = (pref['upi_vpa'] ?? '').toString();
      _bankNameController.text = (pref['bank_name'] ?? '').toString();
      _accNumController.text = (pref['bank_account_number'] ?? '').toString();
      _accHolderController.text =
          (pref['bank_account_holder'] ?? '').toString();
      _ifscController.text = (pref['bank_ifsc'] ?? '').toString();
      _loading = false;
    });
  }

  int _paise(dynamic value) {
    if (value is num) return value.round();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  String _moneyFromPaise(dynamic value) =>
      CurrencyFormatter.formatPaise(_paise(value));

  List<dynamic> _payouts(BuildContext context) =>
      Provider.of<AccountProvider>(context).payouts;

  Map<String, num> _summary(List<dynamic> payouts) {
    final paid = payouts.where((p) => p['status'] == 'paid');
    final upcoming = payouts.where((p) => {
          'pending',
          'eligible',
          'processing',
          'needs_destination',
        }.contains((p['status'] ?? '').toString().toLowerCase()));
    final gross = payouts.fold<int>(0, (s, p) => s + _paise(p['gross_amount']));
    final platform =
        payouts.fold<int>(0, (s, p) => s + _paise(p['platform_fee']));
    final tds = payouts.fold<int>(0, (s, p) => s + _paise(p['tds_amount']));
    final net = payouts.fold<int>(0, (s, p) => s + _paise(p['net_amount']));
    final paidNet = paid.fold<int>(0, (s, p) => s + _paise(p['net_amount']));
    final upcomingNet =
        upcoming.fold<int>(0, (s, p) => s + _paise(p['net_amount']));
    return {
      'gross': gross,
      'platform': platform,
      'tds': tds,
      'net': net,
      'paid': paidNet,
      'upcoming': upcomingNet,
    };
  }

  String _destinationLabel(Map<String, dynamic> pref) {
    final preferred = (pref['preferred'] ?? _preferred).toString();
    if (preferred == 'bank') {
      final masked = pref['bank_account_number_masked'] ??
          _maskAccount(_accNumController.text);
      return masked.toString().isEmpty ? 'Bank not added' : 'Bank $masked';
    }
    final upi = (pref['upi_vpa'] ?? _upiIdController.text).toString();
    return upi.isEmpty ? 'UPI not added' : upi;
  }

  String _maskAccount(String value) {
    final clean = value.trim();
    if (clean.length <= 4) return clean;
    return '${'*' * (clean.length - 4)}${clean.substring(clean.length - 4)}';
  }

  Future<void> _savePreferences() async {
    if (!_prefFormKey.currentState!.validate()) return;
    final payload = <String, dynamic>{
      'preferred': _preferred,
      'payout_cycle': _payoutCycle,
    };
    if (_preferred == 'upi') {
      payload['upi_vpa'] = _upiIdController.text.trim();
      payload['bank_account_holder'] = '';
      payload['bank_account_number'] = '';
      payload['bank_ifsc'] = '';
    } else {
      payload['upi_vpa'] = '';
      payload['bank_name'] = _bankNameController.text.trim();
      payload['bank_account_holder'] = _accHolderController.text.trim();
      payload['bank_account_number'] = _accNumController.text.trim();
      payload['bank_ifsc'] = _ifscController.text.trim().toUpperCase();
    }

    setState(() => _loading = true);
    final success = await Provider.of<AccountProvider>(context, listen: false)
        .updateHostPayoutPreference(payload);
    await _loadData();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(success
            ? 'Payout preference saved'
            : 'Failed to update payout preference'),
      ),
    );
  }

  Widget _statCard({
    required String label,
    required String value,
    required IconData icon,
    required Color color,
    String? sub,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.22)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: GoogleFonts.manrope(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.charcoalMuted)),
                const SizedBox(height: 8),
                Text(value,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.manrope(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: AppTheme.charcoal)),
                if (sub != null) ...[
                  const SizedBox(height: 3),
                  Text(sub,
                      style: GoogleFonts.manrope(
                          fontSize: 10, color: AppTheme.charcoalLight)),
                ],
              ],
            ),
          ),
          CircleAvatar(
            radius: 17,
            backgroundColor: color.withValues(alpha: 0.14),
            child: Icon(icon, size: 17, color: color),
          ),
        ],
      ),
    );
  }

  Widget _overview() {
    final payouts = _payouts(context);
    final pref = Provider.of<AccountProvider>(context).payoutPreference;
    final summary = _summary(payouts);
    final rows = payouts.take(6).toList();

    return RefreshIndicator(
      color: AppTheme.primary,
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              SizedBox(
                width: 160,
                child: _statCard(
                  label: 'Total Earnings',
                  value: _moneyFromPaise(summary['gross']),
                  icon: Icons.account_balance_wallet_outlined,
                  color: Colors.blue,
                  sub: 'This month',
                ),
              ),
              SizedBox(
                width: 160,
                child: _statCard(
                  label: 'Net Payout',
                  value: _moneyFromPaise(summary['net']),
                  icon: Icons.payments_outlined,
                  color: Colors.green,
                  sub: 'After deductions',
                ),
              ),
              SizedBox(
                width: 160,
                child: _statCard(
                  label: 'Upcoming Payout',
                  value: _moneyFromPaise(summary['upcoming']),
                  icon: Icons.calendar_month_outlined,
                  color: AppTheme.primary,
                  sub: 'Pending 7-day cycle',
                ),
              ),
              SizedBox(
                width: 160,
                child: _statCard(
                  label: 'Payout Frequency',
                  value: 'Weekly',
                  icon: Icons.schedule,
                  color: Colors.deepPurple,
                  sub: 'After 7 day cycle',
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _sectionCard(
            title: 'Earnings Overview',
            child: Column(
              children: [
                _amountRow('Booking Revenue', summary['gross']),
                _amountRow('Platform Commission (10%)', summary['platform']),
                _amountRow('TDS Deducted (1%)', summary['tds']),
                const Divider(height: 20),
                _amountRow('Total Net Earnings', summary['net'], bold: true),
                _amountRow('Paid Payout Received', summary['paid']),
                _amountRow('Pending / Upcoming Payout', summary['upcoming']),
              ],
            ),
          ),
          const SizedBox(height: 14),
          _sectionCard(
            title: 'Net Earnings Trend',
            trailing: Text('Last ${rows.isEmpty ? 0 : rows.length} payouts',
                style: GoogleFonts.manrope(
                    fontSize: 11, color: AppTheme.charcoalMuted)),
            child: rows.isEmpty
                ? const _EmptyBox(text: 'No payout trend yet')
                : SizedBox(
                    height: 150,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: rows.map((p) {
                        final maxNet = rows
                            .map((e) => _paise(e['net_amount']))
                            .fold<int>(1, (a, b) => b > a ? b : a);
                        final height =
                            18 + (110 * (_paise(p['net_amount']) / maxNet));
                        return Expanded(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                Container(
                                  height: height,
                                  decoration: BoxDecoration(
                                    color: AppTheme.primary,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  _shortDate(p['eligible_at'] ??
                                      p['processed_at'] ??
                                      p['created_at']),
                                  style: const TextStyle(fontSize: 9),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
          ),
          const SizedBox(height: 14),
          _sectionCard(
            title: 'Payout Destination',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Platform fee is 10%; TDS 1% is deducted per booking.',
                  style: GoogleFonts.manrope(
                      fontSize: 11, color: AppTheme.charcoalMuted),
                ),
                const SizedBox(height: 10),
                Text(_destinationLabel(pref),
                    style: GoogleFonts.manrope(
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        color: AppTheme.charcoal)),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: () => _tabController.animateTo(1),
                  icon: const Icon(Icons.edit_outlined),
                  label: const Text('Edit payout destination'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          _sectionCard(
            title: 'Payout Information',
            child: const Column(
              children: [
                _InfoLine(
                    'Payouts are released after completed paid bookings.'),
                _InfoLine('Settlement eligibility starts after 7 days.'),
                _InfoLine('10% platform commission and 1% TDS are deducted.'),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _actionTile(
                  'Download Reports',
                  'Download statement',
                  Icons.download_outlined,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _actionTile(
                  'Tax Information',
                  'View tax documents',
                  Icons.description_outlined,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _preferenceForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _prefFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _sectionCard(
              title: 'Choose Payout Destination',
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(child: _methodChip('upi', 'UPI / VPA')),
                      const SizedBox(width: 10),
                      Expanded(child: _methodChip('bank', 'Bank')),
                    ],
                  ),
                  const SizedBox(height: 14),
                  if (_preferred == 'upi')
                    TextFormField(
                      controller: _upiIdController,
                      decoration: const InputDecoration(
                        labelText: 'UPI ID (e.g. mobile@upi)',
                        prefixIcon: Icon(Icons.qr_code),
                        border: OutlineInputBorder(),
                      ),
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) {
                          return 'UPI ID required';
                        }
                        if (!v.contains('@')) return 'Invalid UPI ID format';
                        return null;
                      },
                    )
                  else ...[
                    TextFormField(
                      controller: _accHolderController,
                      decoration: const InputDecoration(
                        labelText: 'Account holder name',
                        prefixIcon: Icon(Icons.person_outline),
                        border: OutlineInputBorder(),
                      ),
                      validator: (v) => v == null || v.trim().isEmpty
                          ? 'Account holder name required'
                          : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _bankNameController,
                      decoration: const InputDecoration(
                        labelText: 'Bank name',
                        prefixIcon: Icon(Icons.account_balance_outlined),
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _accNumController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Account number',
                        prefixIcon: Icon(Icons.credit_card_outlined),
                        border: OutlineInputBorder(),
                      ),
                      validator: (v) => v == null || v.trim().isEmpty
                          ? 'Account number required'
                          : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _ifscController,
                      textCapitalization: TextCapitalization.characters,
                      decoration: const InputDecoration(
                        labelText: 'IFSC code',
                        prefixIcon: Icon(Icons.code),
                        border: OutlineInputBorder(),
                      ),
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) {
                          return 'IFSC code required';
                        }
                        if (v.trim().length != 11) {
                          return 'IFSC code must be 11 characters';
                        }
                        return null;
                      },
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 14),
            _sectionCard(
              title: 'Payout Cycle',
              child: Row(
                children: [
                  const Icon(Icons.schedule, color: AppTheme.primary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Weekly payout after 7 day settlement cycle',
                      style: GoogleFonts.manrope(fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: _savePreferences,
              child: Text('Save Preference',
                  style: GoogleFonts.manrope(
                      color: Colors.white, fontWeight: FontWeight.w900)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _history() {
    final payouts = _payouts(context);
    if (payouts.isEmpty)
      return const _EmptyBox(text: 'No payouts recorded yet');
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: payouts.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, index) {
        final payout = payouts[index];
        final status = (payout['status'] ?? 'pending').toString();
        return _sectionCard(
          title: payout['property']?['title']?.toString() ?? 'Payout',
          trailing: _statusBadge(status),
          child: Column(
            children: [
              _amountRow('Gross', payout['gross_amount']),
              _amountRow('Platform Fee', payout['platform_fee']),
              _amountRow('TDS', payout['tds_amount']),
              const Divider(height: 18),
              _amountRow('Net Payout', payout['net_amount'], bold: true),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Eligible: ${_date(payout['eligible_at'])}',
                      style: GoogleFonts.manrope(
                          fontSize: 11, color: AppTheme.charcoalMuted),
                    ),
                  ),
                  Text(
                    payout['payout_id']?.toString() ?? '',
                    style: GoogleFonts.manrope(
                        fontSize: 10, color: AppTheme.charcoalMuted),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _methodChip(String value, String label) {
    final selected = _preferred == value;
    return InkWell(
      onTap: () => setState(() => _preferred = value),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? AppTheme.primary.withValues(alpha: 0.12) : null,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? AppTheme.primary : AppTheme.border,
            width: selected ? 1.4 : 1,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (selected)
              const Padding(
                padding: EdgeInsets.only(right: 6),
                child: Icon(Icons.check, size: 15, color: AppTheme.primary),
              ),
            Text(label,
                style: GoogleFonts.manrope(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color:
                        selected ? AppTheme.primary : AppTheme.charcoalLight)),
          ],
        ),
      ),
    );
  }

  Widget _sectionCard({
    required String title,
    required Widget child,
    Widget? trailing,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(title,
                    style: GoogleFonts.manrope(
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        color: AppTheme.charcoal)),
              ),
              if (trailing != null) trailing,
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  Widget _amountRow(String label, dynamic paise, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: Text(label,
                style: GoogleFonts.manrope(
                    fontSize: 12,
                    fontWeight: bold ? FontWeight.w900 : FontWeight.w700,
                    color: AppTheme.charcoalLight)),
          ),
          Text(_moneyFromPaise(paise),
              style: GoogleFonts.manrope(
                  fontSize: 12,
                  fontWeight: bold ? FontWeight.w900 : FontWeight.w800,
                  color: bold ? AppTheme.primary : AppTheme.charcoal)),
        ],
      ),
    );
  }

  Widget _actionTile(String title, String buttonLabel, IconData icon) {
    return _sectionCard(
      title: title,
      child: OutlinedButton.icon(
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('$buttonLabel will be available soon.')),
          );
        },
        icon: Icon(icon, size: 16),
        label: Text(buttonLabel),
      ),
    );
  }

  Widget _statusBadge(String status) {
    final lower = status.toLowerCase();
    final color = lower == 'paid'
        ? Colors.green
        : lower == 'failed'
            ? Colors.red
            : Colors.orange;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(lower.toUpperCase(),
          style: TextStyle(
              fontSize: 9, fontWeight: FontWeight.w900, color: color)),
    );
  }

  String _date(dynamic value) {
    if (value == null) return 'Pending';
    final parsed = DateTime.tryParse(value.toString());
    if (parsed == null) return value.toString();
    return DateFormat('dd MMM yyyy').format(parsed.toLocal());
  }

  String _shortDate(dynamic value) {
    final parsed = DateTime.tryParse(value?.toString() ?? '');
    if (parsed == null) return '-';
    return DateFormat('dd MMM').format(parsed.toLocal());
  }

  @override
  Widget build(BuildContext context) {
    final payouts = _payouts(context);
    final summary = _summary(payouts);

    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FA),
      appBar: AppBar(
        title: Text('Payouts',
            style: GoogleFonts.manrope(
                fontWeight: FontWeight.w900,
                fontSize: 22,
                color: AppTheme.charcoal)),
        backgroundColor: Colors.white,
        elevation: 0.5,
        actions: [
          IconButton(
            tooltip: 'Download statement',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                    content: Text('Statement download coming soon.')),
              );
            },
            icon: const Icon(Icons.download_outlined),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primary,
          unselectedLabelColor: AppTheme.charcoalLight,
          indicatorColor: AppTheme.primary,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Preferences'),
            Tab(text: 'History'),
          ],
        ),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppTheme.primary))
          : Column(
              children: [
                Container(
                  width: double.infinity,
                  color: Colors.white,
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('TOTAL PAID OUT',
                                style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.charcoalLight)),
                            const SizedBox(height: 4),
                            Text(_moneyFromPaise(summary['paid']),
                                style: GoogleFonts.manrope(
                                    fontSize: 24,
                                    fontWeight: FontWeight.w900,
                                    color: AppTheme.primary)),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(color: Colors.green.shade200),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.verified,
                                color: Colors.green.shade700, size: 15),
                            const SizedBox(width: 5),
                            Text('VERIFIED HOST',
                                style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.green.shade800)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _overview(),
                      _preferenceForm(),
                      _history(),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}

class _InfoLine extends StatelessWidget {
  final String text;
  const _InfoLine(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 5),
            child: Icon(Icons.circle, size: 5, color: AppTheme.primary),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text,
                style: GoogleFonts.manrope(
                    fontSize: 12, color: AppTheme.charcoalLight)),
          ),
        ],
      ),
    );
  }
}

class _EmptyBox extends StatelessWidget {
  final String text;
  const _EmptyBox({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 140,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        border: Border.all(color: AppTheme.border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(text,
          style: GoogleFonts.manrope(
              color: AppTheme.charcoalMuted, fontWeight: FontWeight.w700)),
    );
  }
}
