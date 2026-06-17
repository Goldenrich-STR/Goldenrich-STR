import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../providers/account_provider.dart';
import '../../theme.dart';

class HostPayoutsScreen extends StatefulWidget {
  const HostPayoutsScreen({super.key});

  @override
  State<HostPayoutsScreen> createState() => _HostPayoutsScreenState();
}

class _HostPayoutsScreenState extends State<HostPayoutsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _prefFormKey = GlobalKey<FormState>();

  // State fields
  String _payoutMethod = 'upi';
  final _upiIdController = TextEditingController();
  final _bankNameController = TextEditingController();
  final _accNumController = TextEditingController();
  final _accHolderController = TextEditingController();
  final _ifscController = TextEditingController();

  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
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
    final accountProvider = Provider.of<AccountProvider>(context, listen: false);
    await accountProvider.getHostPayoutPreference();
    await accountProvider.getHostPayouts();

    // Populate controllers with existing preference values
    final pref = accountProvider.payoutPreference;
    if (pref.isNotEmpty) {
      setState(() {
        _payoutMethod = pref['payout_method'] ?? 'upi';
        _upiIdController.text = pref['upi_id'] ?? '';
        _bankNameController.text = pref['bank_name'] ?? '';
        _accNumController.text = pref['account_number'] ?? '';
        _accHolderController.text = pref['account_holder_name'] ?? '';
        _ifscController.text = pref['ifsc_code'] ?? '';
      });
    }

    setState(() {
      _loading = false;
    });
  }

  Future<void> _savePreferences() async {
    if (!_prefFormKey.currentState!.validate()) return;

    final Map<String, dynamic> data = {
      'payout_method': _payoutMethod,
    };

    if (_payoutMethod == 'upi') {
      data['upi_id'] = _upiIdController.text;
    } else {
      data['bank_name'] = _bankNameController.text;
      data['account_number'] = _accNumController.text;
      data['account_holder_name'] = _accHolderController.text;
      data['ifsc_code'] = _ifscController.text;
    }

    setState(() => _loading = true);
    final success = await Provider.of<AccountProvider>(context, listen: false)
        .updateHostPayoutPreference(data);
    setState(() => _loading = false);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Payout preferences updated successfully')),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to update payout preferences')),
      );
    }
  }

  Widget _buildPreferenceForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _prefFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Choose Payout Destination',
              style: GoogleFonts.manrope(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: AppTheme.charcoal,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ChoiceChip(
                    label: const Center(child: Text('UPI Feed')),
                    selected: _payoutMethod == 'upi',
                    selectedColor: AppTheme.primary.withOpacity(0.12),
                    checkmarkColor: AppTheme.primary,
                    labelStyle: TextStyle(
                      color: _payoutMethod == 'upi' ? AppTheme.primary : AppTheme.charcoalLight,
                      fontWeight: FontWeight.bold,
                    ),
                    onSelected: (val) {
                      if (val) setState(() => _payoutMethod = 'upi');
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ChoiceChip(
                    label: const Center(child: Text('Bank Transfer')),
                    selected: _payoutMethod == 'bank',
                    selectedColor: AppTheme.primary.withOpacity(0.12),
                    checkmarkColor: AppTheme.primary,
                    labelStyle: TextStyle(
                      color: _payoutMethod == 'bank' ? AppTheme.primary : AppTheme.charcoalLight,
                      fontWeight: FontWeight.bold,
                    ),
                    onSelected: (val) {
                      if (val) setState(() => _payoutMethod = 'bank');
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            if (_payoutMethod == 'upi') ...[
              TextFormField(
                controller: _upiIdController,
                decoration: const InputDecoration(
                  labelText: 'UPI ID (e.g. mobile@upi)',
                  prefixIcon: Icon(Icons.qr_code),
                  border: OutlineInputBorder(),
                ),
                validator: (v) {
                  if (v == null || v.isEmpty) return 'UPI ID required';
                  if (!v.contains('@')) return 'Invalid UPI ID format';
                  return null;
                },
              ),
            ] else ...[
              TextFormField(
                controller: _accHolderController,
                decoration: const InputDecoration(
                  labelText: 'Account Holder Name',
                  prefixIcon: Icon(Icons.person),
                  border: OutlineInputBorder(),
                ),
                validator: (v) => v == null || v.isEmpty ? 'Account holder name required' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _bankNameController,
                decoration: const InputDecoration(
                  labelText: 'Bank Name',
                  prefixIcon: Icon(Icons.account_balance),
                  border: OutlineInputBorder(),
                ),
                validator: (v) => v == null || v.isEmpty ? 'Bank name required' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _accNumController,
                decoration: const InputDecoration(
                  labelText: 'Account Number',
                  prefixIcon: Icon(Icons.credit_card),
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
                validator: (v) => v == null || v.isEmpty ? 'Account number required' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _ifscController,
                decoration: const InputDecoration(
                  labelText: 'IFSC Code',
                  prefixIcon: Icon(Icons.code),
                  border: OutlineInputBorder(),
                ),
                textCapitalization: TextCapitalization.characters,
                validator: (v) {
                  if (v == null || v.isEmpty) return 'IFSC code required';
                  if (v.length != 11) return 'IFSC code must be 11 characters';
                  return null;
                },
              ),
            ],
            const SizedBox(height: 32),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: _savePreferences,
              child: Text(
                'Save Payout Settings',
                style: GoogleFonts.manrope(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPayoutHistory() {
    final accountProvider = Provider.of<AccountProvider>(context);
    final payouts = accountProvider.payouts;

    if (payouts.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.receipt_long_outlined, size: 54, color: AppTheme.charcoalMuted),
              const SizedBox(height: 12),
              Text(
                'No payouts recorded yet.',
                style: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.charcoalMuted),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      itemCount: payouts.length,
      padding: const EdgeInsets.all(16),
      itemBuilder: (context, index) {
        final p = payouts[index];
        final amount = (p['amount'] as num?)?.toDouble() ?? 0.0;
        final status = p['status']?.toString().toLowerCase() ?? 'pending';
        final method = p['payout_method']?.toString().toUpperCase() ?? 'UPI';

        String dateStr = 'Pending';
        if (p['created_at'] != null) {
          try {
            final parsed = DateTime.parse(p['created_at']).toLocal();
            dateStr = DateFormat('dd MMM yyyy, hh:mm a').format(parsed);
          } catch (_) {
            dateStr = p['created_at'].toString();
          }
        }

        Color statusColor = Colors.orange;
        if (status == 'paid') statusColor = Colors.green;
        if (status == 'failed') statusColor = Colors.red;

        return Card(
          elevation: 0,
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: AppTheme.stone),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: statusColor.withOpacity(0.1),
                  child: Icon(
                    status == 'paid' ? Icons.check_circle_outline : (status == 'failed' ? Icons.error_outline : Icons.schedule),
                    color: statusColor,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Payout: ${p['payout_id'] ?? 'ID N/A'}',
                        style: GoogleFonts.manrope(fontWeight: FontWeight.bold, fontSize: 13),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Method: $method | Date: $dateStr',
                        style: const TextStyle(fontSize: 11, color: AppTheme.charcoalLight),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '₹${NumberFormat('#,##,###').format(amount)}',
                      style: GoogleFonts.manrope(fontWeight: FontWeight.w800, fontSize: 15, color: AppTheme.charcoal),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        status.toUpperCase(),
                        style: TextStyle(color: statusColor, fontSize: 8, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final accountProvider = Provider.of<AccountProvider>(context);

    // Calculate sum of payouts
    final totalPaid = accountProvider.payouts
        .where((p) => p['status']?.toString().toLowerCase() == 'paid')
        .fold<double>(0.0, (sum, p) => sum + ((p['amount'] as num?)?.toDouble() ?? 0.0));

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(
          'Payouts Manager',
          style: GoogleFonts.manrope(
            fontWeight: FontWeight.w800,
            fontSize: 22,
            color: AppTheme.primary,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primary,
          unselectedLabelColor: AppTheme.charcoalLight,
          indicatorColor: AppTheme.primary,
          labelStyle: GoogleFonts.manrope(fontWeight: FontWeight.bold, fontSize: 14),
          tabs: const [
            Tab(text: 'Preferences'),
            Tab(text: 'History'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : Column(
              children: [
                // Summary Panel
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50.withOpacity(0.3),
                    border: const Border(bottom: BorderSide(color: AppTheme.stone)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'TOTAL PAID OUT',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.charcoalLight,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '₹${NumberFormat('#,##,###').format(totalPaid)}',
                            style: GoogleFonts.manrope(
                              fontSize: 24,
                              fontWeight: FontWeight.w900,
                              color: AppTheme.primary,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.green.shade200),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.verified, color: Colors.green.shade700, size: 16),
                            const SizedBox(width: 6),
                            Text(
                              'VERIFIED HOST',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: Colors.green.shade800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // Tab Content
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildPreferenceForm(),
                      _buildPayoutHistory(),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}
