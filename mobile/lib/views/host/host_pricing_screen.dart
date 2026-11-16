import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../services/api_service.dart';
import '../../utils/currency_formatter.dart';

const _ink = Color(0xFF1B1924);
const _muted = Color(0xFF6B7280);

/// Weekend, festival and seasonal price rules for the host's properties:
/// the same Price Engine the website's host "Pricing" page uses.
class HostPricingScreen extends StatefulWidget {
  const HostPricingScreen({super.key});

  @override
  State<HostPricingScreen> createState() => _HostPricingScreenState();
}

class _HostPricingScreenState extends State<HostPricingScreen> {
  final _api = ApiService().dio;
  List<Map<String, dynamic>> _properties = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  String _errorText(Object e) {
    if (e is DioException) {
      final d = e.response?.data;
      if (d is Map && d['detail'] != null) {
        final detail = d['detail'];
        if (detail is Map && detail['message'] != null) return detail['message'].toString();
        return detail.toString();
      }
    }
    return 'Something went wrong. Please try again.';
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _api.get('/v1/price-engine/properties');
      final list = res.data is List ? res.data as List : const [];
      setState(() {
        _properties = list.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = _errorText(e);
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        foregroundColor: _ink,
        title: Text('Pricing',
            style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: _ink))
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        OutlinedButton(onPressed: _load, child: const Text('Retry')),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
                    children: [
                      Text(
                        'Set weekend, festival and seasonal prices. Guests see the new price automatically, for every unit of the property.',
                        style: GoogleFonts.inter(fontSize: 13, height: 1.45, color: _muted),
                      ),
                      const SizedBox(height: 16),
                      if (_properties.isEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 40),
                          child: Center(
                            child: Text('No properties available for pricing yet.',
                                style: GoogleFonts.inter(color: _muted)),
                          ),
                        ),
                      for (final p in _properties) _propertyCard(p),
                    ],
                  ),
                ),
    );
  }

  Widget _propertyCard(Map<String, dynamic> p) {
    final base = (p['base_price'] as num?)?.toDouble() ?? 0;
    final today = (p['today_price'] as num?)?.toDouble() ?? base;
    final active = (p['active_rule_count'] as num?)?.toInt() ?? 0;
    final upcoming = (p['upcoming_rule_count'] as num?)?.toInt() ?? 0;
    final changed = (today - base).abs() > 0.5;
    return GestureDetector(
      onTap: () async {
        await Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => _PropertyRulesScreen(property: p)),
        );
        _load();
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE3E3E3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text((p['title'] ?? 'Property').toString(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600)),
                ),
                const Icon(LucideIcons.chevronRight, size: 18, color: _muted),
              ],
            ),
            const SizedBox(height: 2),
            Text('${p['city'] ?? ''}, ${p['state'] ?? ''}',
                style: GoogleFonts.inter(fontSize: 12.5, color: _muted)),
            const SizedBox(height: 14),
            Row(
              children: [
                _stat('Base price', CurrencyFormatter.format(base)),
                const SizedBox(width: 12),
                _stat('Today', CurrencyFormatter.format(today),
                    highlight: changed),
                const SizedBox(width: 12),
                _stat('Rules', '$active active${upcoming > 0 ? ' · $upcoming upcoming' : ''}'),
              ],
            ),
            if ((p['current_rule']?['rule_name'] ?? 'Base') != 'Base') ...[
              const SizedBox(height: 10),
              Text('Running now: ${p['current_rule']['rule_name']}',
                  style: GoogleFonts.inter(
                      fontSize: 12, color: const Color(0xFF1F6B3F), fontWeight: FontWeight.w600)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _stat(String label, String value, {bool highlight = false}) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: GoogleFonts.inter(fontSize: 11, color: _muted)),
          const SizedBox(height: 3),
          Text(value,
              style: GoogleFonts.inter(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                  color: highlight ? const Color(0xFFB45309) : _ink)),
        ],
      ),
    );
  }
}

class _PropertyRulesScreen extends StatefulWidget {
  final Map<String, dynamic> property;

  const _PropertyRulesScreen({required this.property});

  @override
  State<_PropertyRulesScreen> createState() => _PropertyRulesScreenState();
}

class _PropertyRulesScreenState extends State<_PropertyRulesScreen> {
  final _api = ApiService().dio;
  List<Map<String, dynamic>> _rules = [];
  List<Map<String, dynamic>> _days = [];
  bool _loading = true;

  String get _id => widget.property['property_id'].toString();

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _toast(String text) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(text)));

  String _errorText(Object e) {
    if (e is DioException) {
      final d = e.response?.data;
      if (d is Map && d['detail'] != null) {
        final detail = d['detail'];
        if (detail is Map && detail['message'] != null) return detail['message'].toString();
        if (detail is List && detail.isNotEmpty && detail.first is Map) {
          return (detail.first['msg'] ?? 'Check the values and try again.').toString();
        }
        return detail.toString();
      }
    }
    return 'Something went wrong. Please try again.';
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final month = DateFormat('yyyy-MM').format(DateTime.now());
      final results = await Future.wait([
        _api.get('/v1/price-engine/rules', queryParameters: {'property_id': _id}),
        _api.get('/v1/price-engine/calendar/$_id', queryParameters: {'month': month}),
      ]);
      final rules = results[0].data is List ? results[0].data as List : const [];
      final days = results[1].data is Map ? (results[1].data['days'] as List? ?? const []) : const [];
      if (!mounted) return;
      setState(() {
        _rules = rules.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
        _days = days.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      _toast(_errorText(e));
    }
  }

  Future<void> _toggle(Map<String, dynamic> rule) async {
    try {
      await _api.patch('/v1/price-engine/rules/${rule['rule_id']}',
          data: {'is_active': !(rule['is_active'] == true)});
      _load();
    } catch (e) {
      _toast(_errorText(e));
    }
  }

  Future<void> _delete(Map<String, dynamic> rule) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete this rule?'),
        content: Text('"${rule['rule_name']}" will stop applying to new prices.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _api.delete('/v1/price-engine/rules/${rule['rule_id']}');
      _load();
    } catch (e) {
      _toast(_errorText(e));
    }
  }

  Future<void> _addRule() async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AddRuleSheet(propertyId: _id, api: _api, errorText: _errorText),
    );
    if (created == true) _load();
  }

  @override
  Widget build(BuildContext context) {
    final base = (widget.property['base_price'] as num?)?.toDouble() ?? 0;
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        foregroundColor: _ink,
        title: Text((widget.property['title'] ?? 'Pricing').toString(),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w600)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addRule,
        backgroundColor: _ink,
        foregroundColor: Colors.white,
        icon: const Icon(LucideIcons.plus, size: 18),
        label: const Text('Add rule'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: _ink))
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 96),
              children: [
                Text('Base price ${CurrencyFormatter.format(base)} per night',
                    style: GoogleFonts.inter(fontSize: 13, color: _muted)),
                const SizedBox(height: 16),
                Text('Rules',
                    style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600)),
                const SizedBox(height: 10),
                if (_rules.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    child: Text('No rules yet. Tap "Add rule" for weekends, festivals or a season.',
                        style: GoogleFonts.inter(fontSize: 13, color: _muted)),
                  ),
                for (final r in _rules) _ruleCard(r),
                const SizedBox(height: 22),
                Text('This month',
                    style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600)),
                const SizedBox(height: 10),
                _calendarGrid(),
              ],
            ),
    );
  }

  Widget _ruleCard(Map<String, dynamic> r) {
    final unit = (r['adjustment_unit'] ?? 'PERCENTAGE').toString().toUpperCase();
    final decrease = (r['adjustment_type'] ?? 'INCREASE').toString().toUpperCase() == 'DECREASE';
    final value = unit == 'FLAT'
        ? CurrencyFormatter.format((r['adjustment_amount'] as num?) ?? 0)
        : '${(r['adjustment_percentage'] as num?) ?? 0}%';
    final status = (r['status'] ?? 'active').toString();
    final dates = r['start_date'] != null
        ? '${r['start_date']}  to  ${r['end_date']}'
        : 'Every ${((r['days_of_week'] as List?) ?? const [5, 6]).map((d) => const ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][(d as num).toInt() % 7]).join(', ')}';
    final statusColor = status == 'active'
        ? const Color(0xFF1F6B3F)
        : status == 'upcoming'
            ? const Color(0xFF2563EB)
            : _muted;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE3E3E3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text((r['rule_name'] ?? 'Rule').toString(),
                    style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(status,
                    style: GoogleFonts.inter(
                        fontSize: 11, fontWeight: FontWeight.w700, color: statusColor)),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text('${decrease ? '-' : '+'}$value  ·  ${(r['rule_type'] ?? '').toString().toLowerCase()}  ·  $dates',
              style: GoogleFonts.inter(fontSize: 12.5, color: _muted)),
          const SizedBox(height: 8),
          Row(
            children: [
              TextButton.icon(
                onPressed: () => _toggle(r),
                icon: Icon(r['is_active'] == true ? LucideIcons.pause : LucideIcons.play, size: 15),
                label: Text(r['is_active'] == true ? 'Stop' : 'Start'),
                style: TextButton.styleFrom(foregroundColor: _ink),
              ),
              TextButton.icon(
                onPressed: () => _delete(r),
                icon: const Icon(LucideIcons.trash2, size: 15),
                label: const Text('Delete'),
                style: TextButton.styleFrom(foregroundColor: Colors.red.shade700),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _calendarGrid() {
    if (_days.isEmpty) return const SizedBox.shrink();
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final d in _days)
          Builder(builder: (_) {
            final date = DateTime.tryParse((d['date'] ?? '').toString());
            final price = (d['final_price'] as num?)?.toDouble() ?? 0;
            final base = (d['base_price'] as num?)?.toDouble() ?? price;
            final higher = price > base + 0.5;
            final lower = price < base - 0.5;
            return Container(
              width: 62,
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(
                color: higher
                    ? const Color(0xFFFFF4E0)
                    : lower
                        ? const Color(0xFFE6F4EA)
                        : const Color(0xFFF6F6F6),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                children: [
                  Text(date == null ? '' : DateFormat('d MMM').format(date),
                      style: GoogleFonts.inter(fontSize: 10.5, color: _muted)),
                  const SizedBox(height: 2),
                  Text(
                      price >= 1000
                          ? '₹${(price / 1000).toStringAsFixed(price % 1000 == 0 ? 0 : 1)}k'
                          : '₹${price.round()}',
                      style: GoogleFonts.inter(fontSize: 12.5, fontWeight: FontWeight.w700)),
                ],
              ),
            );
          }),
      ],
    );
  }
}

class _AddRuleSheet extends StatefulWidget {
  final String propertyId;
  final Dio api;
  final String Function(Object) errorText;

  const _AddRuleSheet({required this.propertyId, required this.api, required this.errorText});

  @override
  State<_AddRuleSheet> createState() => _AddRuleSheetState();
}

class _AddRuleSheetState extends State<_AddRuleSheet> {
  String _type = 'WEEKEND';
  String _direction = 'INCREASE';
  String _unit = 'PERCENTAGE';
  final _name = TextEditingController();
  final _value = TextEditingController();
  DateTimeRange? _range;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _value.dispose();
    super.dispose();
  }

  Future<void> _pickRange() async {
    final now = DateTime.now();
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: now.add(const Duration(days: 730)),
      initialDateRange: _range,
    );
    if (picked != null) setState(() => _range = picked);
  }

  Future<void> _save() async {
    final value = double.tryParse(_value.text.trim());
    if (value == null || value <= 0) {
      setState(() => _error = 'Enter how much to change the price.');
      return;
    }
    if (_type != 'WEEKEND' && _range == null) {
      setState(() => _error = 'Choose the dates the rule applies to.');
      return;
    }
    final fmt = DateFormat('yyyy-MM-dd');
    final name = _name.text.trim().isNotEmpty
        ? _name.text.trim()
        : (_type == 'WEEKEND' ? 'Weekend' : (_type == 'SEASON' ? 'Season' : 'Festival'));
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.api.post('/v1/price-engine/rules', data: {
        'property_ids': [widget.propertyId],
        'rule_type': _type,
        'rule_name': name,
        'adjustment_type': _direction,
        'adjustment_unit': _unit,
        if (_unit == 'PERCENTAGE') 'adjustment_percentage': value else 'adjustment_amount': value,
        if (_type != 'WEEKEND') 'start_date': fmt.format(_range!.start),
        if (_type != 'WEEKEND') 'end_date': fmt.format(_range!.end),
        if (_type == 'WEEKEND') 'days_of_week': [5, 6],
      });
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = widget.errorText(e);
      });
    }
  }

  Widget _chips(List<List<String>> options, String value, void Function(String) onPick) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final o in options)
          GestureDetector(
            onTap: () => onPick(o[0]),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: value == o[0] ? _ink : Colors.white,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: value == o[0] ? _ink : const Color(0xFFD5D5D5)),
              ),
              child: Text(o[1],
                  style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: value == o[0] ? Colors.white : _ink)),
            ),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('d MMM yyyy');
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 22),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Add a pricing rule',
                  style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w600)),
              const SizedBox(height: 16),
              Text('Applies to', style: GoogleFonts.inter(fontSize: 12, color: _muted)),
              const SizedBox(height: 6),
              _chips(const [
                ['WEEKEND', 'Weekends (Sat, Sun)'],
                ['SEASON', 'A season'],
                ['CUSTOM', 'Festival / custom dates'],
              ], _type, (v) => setState(() => _type = v)),
              const SizedBox(height: 14),
              TextField(
                controller: _name,
                decoration: const InputDecoration(
                    hintText: 'Rule name, e.g. Diwali 2026', isDense: true),
              ),
              if (_type != 'WEEKEND') ...[
                const SizedBox(height: 12),
                GestureDetector(
                  onTap: _pickRange,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFD5D5D5)),
                    ),
                    child: Row(
                      children: [
                        const Icon(LucideIcons.calendar, size: 17),
                        const SizedBox(width: 10),
                        Text(
                          _range == null
                              ? 'Choose dates'
                              : '${fmt.format(_range!.start)}  to  ${fmt.format(_range!.end)}',
                          style: GoogleFonts.inter(fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 14),
              Text('Change', style: GoogleFonts.inter(fontSize: 12, color: _muted)),
              const SizedBox(height: 6),
              _chips(const [
                ['INCREASE', 'Increase'],
                ['DECREASE', 'Decrease'],
              ], _direction, (v) => setState(() => _direction = v)),
              const SizedBox(height: 10),
              _chips(const [
                ['PERCENTAGE', 'By %'],
                ['FLAT', 'By ₹ amount'],
              ], _unit, (v) => setState(() => _unit = v)),
              const SizedBox(height: 10),
              TextField(
                controller: _value,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  hintText: _unit == 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 5000',
                  prefixText: _unit == 'FLAT' ? '₹ ' : null,
                  suffixText: _unit == 'PERCENTAGE' ? '%' : null,
                  isDense: true,
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(_error!, style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
              ],
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _saving ? null : _save,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _ink,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: Text(_saving ? 'Saving...' : 'Save rule',
                      style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
