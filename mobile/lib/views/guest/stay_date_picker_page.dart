import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../services/api_service.dart';

/// Full-screen check-in / check-out calendar, laid out like the website's
/// mobile calendar: holiday chips on top, Mon-Sun header, months one under
/// the other, and a Check-In / nights / Check-Out bar with a Next button.
class StayDatePickerPage extends StatefulWidget {
  final DateTimeRange? initialRange;

  /// When set (property page), the calendar shows this property's own
  /// availability and nightly prices; for a multi-unit property, those of the unit.
  final String? propertyId;
  final String? unitId;
  final double? defaultPrice;

  const StayDatePickerPage({
    super.key,
    this.initialRange,
    this.propertyId,
    this.unitId,
    this.defaultPrice,
  });

  @override
  State<StayDatePickerPage> createState() => _StayDatePickerPageState();
}

class _StayDatePickerPageState extends State<StayDatePickerPage> {
  static const _months = [
    'January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'
  ];
  static const _short = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct',
    'Nov', 'Dec'
  ];
  static const _weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  static const _weekdayLong = [
    'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  ];

  late final DateTime _today;
  DateTime? _start;
  DateTime? _end;
  final Map<String, String> _holidays = {};

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _today = DateTime(now.year, now.month, now.day);
    _start = widget.initialRange?.start;
    _end = widget.initialRange?.end;
    _loadHolidays();
    _loadAvailability();
  }

  final List<List<String>> _blocked = []; // [start, end] inclusive, ISO dates
  final Map<String, double> _prices = {};

  bool _isBlocked(DateTime day) {
    final iso = _iso(day);
    for (final b in _blocked) {
      if (iso.compareTo(b[0]) >= 0 && iso.compareTo(b[1]) <= 0) return true;
    }
    return false;
  }

  Future<void> _loadAvailability() async {
    final id = widget.propertyId;
    if (id == null) return;
    final api = ApiService().dio;
    try {
      final res = await api.get('/calendar/properties/$id/blocked-dates',
          queryParameters: {if (widget.unitId != null) 'unit_id': widget.unitId});
      final list = res.data is Map ? res.data['blocked_dates'] : null;
      if (list is List && mounted) {
        setState(() {
          for (final b in list) {
            if (b is Map && b['start_date'] != null && b['end_date'] != null) {
              _blocked.add([b['start_date'].toString(), b['end_date'].toString()]);
            }
          }
        });
      }
    } catch (_) {}
    for (var i = 0; i < 6; i++) {
      final m = DateTime(_today.year, _today.month + i, 1);
      final key = '${m.year.toString().padLeft(4, '0')}-${m.month.toString().padLeft(2, '0')}';
      try {
        final res = await api.get('/v1/price-engine/public-calendar/$id',
            queryParameters: {'month': key, if (widget.unitId != null) 'unit_id': widget.unitId});
        final days = res.data is Map ? res.data['days'] : null;
        if (days is List && mounted) {
          setState(() {
            for (final d in days) {
              if (d is Map && d['date'] != null) {
                final v = (d['final_price'] ?? d['price'] ?? d['display_price']) as num?;
                if (v != null) _prices[d['date'].toString()] = v.toDouble();
              }
            }
          });
        }
      } catch (_) {}
    }
  }

  String _priceLabel(double v) =>
      v >= 1000 ? '₹${(v / 1000).toStringAsFixed(v % 1000 == 0 ? 0 : 1)}k' : '₹${v.round()}';

  /// Festivals and public holidays come from the server so they follow every year.
  Future<void> _loadHolidays() async {
    for (final year in {_today.year, _today.year + 1}) {
      try {
        final res = await ApiService().dio.get('/holidays/$year');
        final data = res.data is Map ? res.data['holidays'] : null;
        if (data is Map && mounted) {
          setState(() {
            data.forEach((k, v) => _holidays[k.toString()] = v.toString());
          });
        }
      } catch (_) {
        // calendar still works without holiday chips
      }
    }
  }

  String _iso(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  void _onTap(DateTime day) {
    setState(() {
      if (_start == null || (_start != null && _end != null)) {
        _start = day;
        _end = null;
      } else if (day.isBefore(_start!) || day == _start) {
        _start = day;
      } else {
        _end = day;
      }
    });
  }

  List<MapEntry<String, String>> get _upcomingHolidays {
    final from = _iso(_today);
    final list = _holidays.entries.where((e) => e.key.compareTo(from) >= 0).toList()
      ..sort((a, b) => a.key.compareTo(b.key));
    return list.take(8).toList();
  }

  String _label(DateTime? d) {
    if (d == null) return 'Select date';
    final wd = _weekdayLong[d.weekday - 1];
    return '${d.day} ${_short[d.month - 1]}, $wd';
  }

  @override
  Widget build(BuildContext context) {
    final nights = (_start != null && _end != null)
        ? _end!.difference(_start!).inDays
        : 0;
    final monthCount = 12;
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 16, 4),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(LucideIcons.arrowLeft, size: 22),
                  ),
                  Text(
                    _start == null || _end != null
                        ? 'Select Check-In Date'
                        : 'Select Check-Out Date',
                    style: GoogleFonts.inter(
                        fontSize: 17,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF1B1924)),
                  ),
                ],
              ),
            ),
            if (_upcomingHolidays.isNotEmpty)
              SizedBox(
                height: 84,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                  itemCount: _upcomingHolidays.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, i) {
                    final e = _upcomingHolidays[i];
                    final d = DateTime.parse(e.key);
                    return GestureDetector(
                      onTap: () => _onTap(d),
                      child: Container(
                        width: 136,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE8F2FD),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Holiday',
                                style: GoogleFonts.inter(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: const Color(0xFF3B9CF5))),
                            const SizedBox(height: 2),
                            Text('${d.day} ${_short[d.month - 1]}',
                                style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF1B1924))),
                            Text(e.value,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.inter(
                                    fontSize: 11,
                                    color: const Color(0xFF6B6B6B))),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: List.generate(7, (i) {
                  final weekend = i >= 5;
                  return Expanded(
                    child: Center(
                      child: Text(_weekdays[i],
                          style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: weekend
                                  ? const Color(0xFFE11D48)
                                  : const Color(0xFF1B1924))),
                    ),
                  );
                }),
              ),
            ),
            const Divider(height: 14, color: Color(0xFFEDEDED)),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                itemCount: monthCount,
                itemBuilder: (context, index) {
                  final month =
                      DateTime(_today.year, _today.month + index, 1);
                  return _buildMonth(month);
                },
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Color(0xFFEDEDED))),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Expanded(child: _dateBox('Check-In Date', _label(_start))),
                      Container(
                        margin: const EdgeInsets.symmetric(horizontal: 8),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE8F2FD),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          nights > 0
                              ? '$nights ${nights == 1 ? 'Night' : 'Nights'}'
                              : '0 Night',
                          style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF3B9CF5)),
                        ),
                      ),
                      Expanded(child: _dateBox('Check-Out Date', _label(_end))),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: (_start != null && _end != null)
                          ? () => Navigator.pop(
                              context, DateTimeRange(start: _start!, end: _end!))
                          : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1B1924),
                        disabledBackgroundColor: const Color(0xFFBDBDBD),
                        foregroundColor: Colors.white,
                        disabledForegroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14)),
                      ),
                      child: Text('Next',
                          style: GoogleFonts.inter(
                              fontSize: 15, fontWeight: FontWeight.w600)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _dateBox(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: const Color(0xFFF6F6F6),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: GoogleFonts.inter(
                  fontSize: 10.5, color: const Color(0xFF3B9CF5))),
          const SizedBox(height: 2),
          Text(value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF1B1924))),
        ],
      ),
    );
  }

  Widget _buildMonth(DateTime month) {
    final first = DateTime(month.year, month.month, 1);
    final daysInMonth = DateTime(month.year, month.month + 1, 0).day;
    final leading = first.weekday - 1; // Monday first
    final cells = leading + daysInMonth;
    final rows = (cells / 7).ceil();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(0, 18, 0, 10),
          child: Text('${_months[month.month - 1]} ${month.year}',
              style: GoogleFonts.inter(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF1B1924))),
        ),
        for (var r = 0; r < rows; r++)
          Row(
            children: List.generate(7, (c) {
              final n = r * 7 + c - leading + 1;
              if (n < 1 || n > daysInMonth) {
                return const Expanded(child: SizedBox(height: 46));
              }
              final day = DateTime(month.year, month.month, n);
              return Expanded(child: _dayCell(day));
            }),
          ),
      ],
    );
  }

  Widget _dayCell(DateTime day) {
    final past = day.isBefore(_today);
    final isStart = _start != null && day == _start;
    final isEnd = _end != null && day == _end;
    final inRange = _start != null &&
        _end != null &&
        day.isAfter(_start!) &&
        day.isBefore(_end!);
    final holiday = _holidays.containsKey(_iso(day));
    final selected = isStart || isEnd;
    final isToday = day == _today;

    final blocked = !past && _isBlocked(day);
    final price = _prices[_iso(day)] ?? widget.defaultPrice;
    Color textColor = const Color(0xFF1B1924);
    if (past || blocked) textColor = const Color(0xFFB5B5B5);
    if (holiday && !past && !blocked && !selected) {
      textColor = const Color(0xFF3B9CF5);
    }
    if (selected) textColor = Colors.white;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: (past || blocked) ? null : () => _onTap(day),
      child: SizedBox(
        height: 46,
        child: Stack(
          alignment: Alignment.center,
          children: [
            if (inRange || (isStart && _end != null) || (isEnd && _start != null))
              Positioned.fill(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFE8F2FD),
                      borderRadius: BorderRadius.horizontal(
                        left: Radius.circular(isStart ? 999 : 0),
                        right: Radius.circular(isEnd ? 999 : 0),
                      ),
                    ),
                  ),
                ),
              ),
            Container(
              width: 38,
              height: 38,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: selected ? const Color(0xFF1B1924) : null,
                shape: BoxShape.circle,
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '${day.day}',
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      height: 1.1,
                      fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                      color: textColor,
                      decoration: blocked
                          ? TextDecoration.lineThrough
                          : (isToday && !selected
                              ? TextDecoration.underline
                              : TextDecoration.none),
                    ),
                  ),
                  if (price != null && !past && !blocked)
                    Text(
                      _priceLabel(price),
                      style: GoogleFonts.inter(
                        fontSize: 8,
                        height: 1.1,
                        color: selected
                            ? Colors.white70
                            : const Color(0xFFB07A00),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
