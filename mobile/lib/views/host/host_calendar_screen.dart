import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:flutter/services.dart';
import '../../providers/property_provider.dart';
import '../../models/property_model.dart';
import '../../theme.dart';

class HostCalendarScreen extends StatefulWidget {
  const HostCalendarScreen({super.key});

  @override
  State<HostCalendarScreen> createState() => _HostCalendarScreenState();
}

class _HostCalendarScreenState extends State<HostCalendarScreen> {
  PropertyModel? _selectedProperty;
  DateTime _currentMonth = DateTime.now();
  DateTime? _selectedDate;
  bool _initializing = true;

  // Form controllers for blocking dates
  final _blockFormKey = GlobalKey<FormState>();
  final _startDateController = TextEditingController();
  final _endDateController = TextEditingController();
  final _reasonController = TextEditingController();

  // Form controllers for external calendars
  final _calFormKey = GlobalKey<FormState>();
  final _calNameController = TextEditingController();
  final _calUrlController = TextEditingController();
  String _calColor = '#D4AF37';

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  @override
  void dispose() {
    _startDateController.dispose();
    _endDateController.dispose();
    _reasonController.dispose();
    _calNameController.dispose();
    _calUrlController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    final propertyProvider = Provider.of<PropertyProvider>(context, listen: false);
    await propertyProvider.getHostProperties();
    if (propertyProvider.hostProperties.isNotEmpty) {
      _selectedProperty = propertyProvider.hostProperties.first;
      await _fetchCalendarData();
    }
    setState(() {
      _initializing = false;
    });
  }

  Future<void> _fetchCalendarData() async {
    if (_selectedProperty == null) return;
    final propertyProvider = Provider.of<PropertyProvider>(context, listen: false);
    await propertyProvider.getUnifiedCalendar(
      _selectedProperty!.propertyId,
      _currentMonth.month,
      _currentMonth.year,
    );
    await propertyProvider.listExternalCalendars(_selectedProperty!.propertyId);
  }

  void _nextMonth() async {
    setState(() {
      _currentMonth = DateTime(_currentMonth.year, _currentMonth.month + 1);
      _selectedDate = null;
    });
    await _fetchCalendarData();
  }

  void _previousMonth() async {
    setState(() {
      _currentMonth = DateTime(_currentMonth.year, _currentMonth.month - 1);
      _selectedDate = null;
    });
    await _fetchCalendarData();
  }

  // Parse hex colors safely
  Color _colorFromHex(String hexString) {
    try {
      final buffer = StringBuffer();
      if (hexString.length == 6 || hexString.length == 7) buffer.write('ff');
      buffer.write(hexString.replaceFirst('#', ''));
      return Color(int.parse(buffer.toString(), radix: 16));
    } catch (_) {
      return AppTheme.primary;
    }
  }

  // Find booking or block on a specific date
  Map<String, dynamic>? _getEventForDate(DateTime date) {
    final provider = Provider.of<PropertyProvider>(context, listen: false);
    final calendar = provider.unifiedCalendar;
    if (calendar.isEmpty) return null;

    final dateStr = DateFormat('yyyy-MM-dd').format(date);
    final events = calendar['events'] as List<dynamic>? ?? [];

    for (var event in events) {
      final start = event['start_date']?.toString().split('T')[0];
      final end = event['end_date']?.toString().split('T')[0];
      if (start != null && end != null) {
        final source = event['source']?.toString().toLowerCase();

        // For bookings, check-out day is open for next booking. For blocks, the block is inclusive of the end date.
        final bool isMatch = source == 'booking'
            ? (dateStr.compareTo(start) >= 0 && dateStr.compareTo(end) < 0)
            : (dateStr.compareTo(start) >= 0 && dateStr.compareTo(end) <= 0);

        if (isMatch) {
          final colorHex = event['color']?.toString() ??
              (source == 'booking' ? '#10B981' : (source == 'manual' ? '#EF4444' : '#F59E0B'));
          final eventColor = _colorFromHex(colorHex);

          return {
            'type': source,
            'data': event,
            'color': eventColor,
          };
        }
      }
    }

    return null;
  }

  void _showBlockDatesSheet() {
    _startDateController.text = '';
    _endDateController.text = '';
    _reasonController.text = '';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            top: 24,
            left: 24,
            right: 24,
          ),
          child: SingleChildScrollView(
            child: Form(
              key: _blockFormKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Block Dates',
                        style: GoogleFonts.manrope(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.charcoal,
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _startDateController,
                    readOnly: true,
                    decoration: const InputDecoration(
                      labelText: 'Start Date',
                      prefixIcon: Icon(Icons.calendar_today),
                      border: OutlineInputBorder(),
                    ),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: DateTime.now(),
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (picked != null) {
                        _startDateController.text = DateFormat('yyyy-MM-dd').format(picked);
                      }
                    },
                    validator: (v) => v == null || v.isEmpty ? 'Select start date' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _endDateController,
                    readOnly: true,
                    decoration: const InputDecoration(
                      labelText: 'End Date',
                      prefixIcon: Icon(Icons.calendar_today),
                      border: OutlineInputBorder(),
                    ),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _startDateController.text.isNotEmpty
                            ? DateTime.parse(_startDateController.text)
                            : DateTime.now(),
                        firstDate: _startDateController.text.isNotEmpty
                            ? DateTime.parse(_startDateController.text)
                            : DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (picked != null) {
                        _endDateController.text = DateFormat('yyyy-MM-dd').format(picked);
                      }
                    },
                    validator: (v) => v == null || v.isEmpty ? 'Select end date' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _reasonController,
                    decoration: const InputDecoration(
                      labelText: 'Reason for Block',
                      prefixIcon: Icon(Icons.note),
                      border: OutlineInputBorder(),
                    ),
                    validator: (v) => v == null || v.isEmpty ? 'Reason required' : null,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: AppTheme.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () async {
                      if (!_blockFormKey.currentState!.validate()) return;
                      final success = await Provider.of<PropertyProvider>(context, listen: false)
                          .blockDates(
                            _selectedProperty!.propertyId,
                            _startDateController.text,
                            _endDateController.text,
                            _reasonController.text,
                          );
                      if (success && context.mounted) {
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Dates blocked successfully')),
                        );
                        _fetchCalendarData();
                      }
                    },
                    child: Text(
                      'Confirm Block',
                      style: GoogleFonts.manrope(
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  void _showAddExternalCalendarSheet() {
    _calNameController.text = '';
    _calUrlController.text = '';
    _calColor = '#D4AF37';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setStateModal) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
                top: 24,
                left: 24,
                right: 24,
              ),
              child: SingleChildScrollView(
                child: Form(
                  key: _calFormKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Import External iCal Calendar',
                            style: GoogleFonts.manrope(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.charcoal,
                            ),
                          ),
                          IconButton(
                            onPressed: () => Navigator.pop(context),
                            icon: const Icon(Icons.close),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _calNameController,
                        decoration: const InputDecoration(
                          labelText: 'Calendar Name (e.g. Airbnb)',
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) => v == null || v.isEmpty ? 'Name required' : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _calUrlController,
                        decoration: const InputDecoration(
                          labelText: 'iCal Feed URL (.ics)',
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) {
                          if (v == null || v.isEmpty) return 'URL required';
                          if (!v.startsWith('http')) return 'Invalid URL';
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Select Color Badge',
                        style: GoogleFonts.manrope(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          '#D4AF37',
                          '#E056FD',
                          '#30336B',
                          '#22A6B3',
                          '#EB4C4B',
                          '#2ECC71'
                        ].map((colorHex) {
                          final isSelected = _calColor == colorHex;
                          return GestureDetector(
                            onTap: () {
                              setStateModal(() {
                                _calColor = colorHex;
                              });
                            },
                            child: CircleAvatar(
                              backgroundColor: _colorFromHex(colorHex),
                              radius: 18,
                              child: isSelected
                                  ? const Icon(Icons.check, color: Colors.white, size: 16)
                                  : null,
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          backgroundColor: AppTheme.primary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () async {
                          if (!_calFormKey.currentState!.validate()) return;
                          final success = await Provider.of<PropertyProvider>(context, listen: false)
                              .addExternalCalendar(
                                _selectedProperty!.propertyId,
                                _calNameController.text,
                                _calUrlController.text,
                                _calColor,
                              );
                          if (success && context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('External Calendar sync initiated')),
                            );
                            _fetchCalendarData();
                          }
                        },
                        child: Text(
                          'Sync Calendar',
                          style: GoogleFonts.manrope(
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showExportLinkDialog() async {
    final provider = Provider.of<PropertyProvider>(context, listen: false);
    String? exportUrl = await provider.getIcalFeedUrl(_selectedProperty!.propertyId);

    if (exportUrl == null && context.mounted) {
      // If it doesn't exist, try rotating to create it
      exportUrl = await provider.rotateIcalFeedUrl(_selectedProperty!.propertyId);
    }

    if (!context.mounted) return;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: Text(
                'Export Calendar (iCal)',
                style: GoogleFonts.manrope(fontWeight: FontWeight.w800),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Use this feed link to sync your X-Space360 bookings to external channels like Airbnb or Vrbo.',
                    style: TextStyle(fontSize: 13, color: AppTheme.charcoalLight),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.stone.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppTheme.stone),
                    ),
                    child: Text(
                      exportUrl ?? 'No link available. Click Rotate to generate.',
                      style: GoogleFonts.sourceCodePro(fontSize: 11),
                      maxLines: 4,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      TextButton.icon(
                        icon: const Icon(Icons.copy, size: 16, color: AppTheme.primary),
                        label: const Text('COPY LINK', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold)),
                        onPressed: () {
                          if (exportUrl != null) {
                            Clipboard.setData(ClipboardData(text: exportUrl!));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Feed link copied to clipboard')),
                            );
                          }
                        },
                      ),
                      TextButton.icon(
                        icon: const Icon(Icons.refresh, size: 16, color: Colors.red),
                        label: const Text('ROTATE LINK', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                        onPressed: () async {
                          final newUrl = await provider.rotateIcalFeedUrl(_selectedProperty!.propertyId);
                          if (newUrl != null) {
                            setStateDialog(() {
                              exportUrl = newUrl;
                            });
                          }
                        },
                      ),
                    ],
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('CLOSE'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: color.withOpacity(0.15),
            shape: BoxShape.circle,
            border: Border.all(color: color, width: 1.5),
          ),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: GoogleFonts.manrope(
            fontSize: 9,
            fontWeight: FontWeight.w800,
            color: AppTheme.charcoalLight,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final propertyProvider = Provider.of<PropertyProvider>(context);
    final textTheme = Theme.of(context).textTheme;

    // Calendar logic
    final firstDayOfMonth = DateTime(_currentMonth.year, _currentMonth.month, 1);
    final totalDaysInMonth = DateTime(_currentMonth.year, _currentMonth.month + 1, 0).day;
    final leadingEmptyDays = firstDayOfMonth.weekday % 7; // Sunday starting

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(
          'Property Calendar',
          style: GoogleFonts.manrope(
            fontWeight: FontWeight.w800,
            fontSize: 22,
            color: AppTheme.primary,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
      ),
      body: _initializing
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : propertyProvider.hostProperties.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.calendar_today_outlined, size: 60, color: AppTheme.charcoalMuted),
                        const SizedBox(height: 16),
                        Text(
                          'No properties listed yet.',
                          style: GoogleFonts.manrope(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                )
              : SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // 1. Selector Bar
                      Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          decoration: BoxDecoration(
                            border: Border.all(color: AppTheme.stone),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<PropertyModel>(
                              value: _selectedProperty,
                              isExpanded: true,
                              items: propertyProvider.hostProperties.map((p) {
                                return DropdownMenuItem(
                                  value: p,
                                  child: Text(
                                    p.title,
                                    style: GoogleFonts.manrope(fontWeight: FontWeight.w600, fontSize: 14),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                );
                              }).toList(),
                              onChanged: (p) async {
                                if (p != null) {
                                  setState(() {
                                    _selectedProperty = p;
                                    _selectedDate = null;
                                  });
                                  await _fetchCalendarData();
                                }
                              },
                            ),
                          ),
                        ),
                      ),

                      // 2. Calendar Header (Month + Nav)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            IconButton(
                              onPressed: _previousMonth,
                              icon: const Icon(Icons.chevron_left, size: 28),
                            ),
                            Text(
                              DateFormat('MMMM yyyy').format(_currentMonth),
                              style: GoogleFonts.manrope(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.charcoal,
                              ),
                            ),
                            IconButton(
                              onPressed: _nextMonth,
                              icon: const Icon(Icons.chevron_right, size: 28),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 12),

                      // 3. Weekday Titles
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0),
                        child: Row(
                          children: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) {
                            return Expanded(
                              child: Center(
                                child: Text(
                                  day,
                                  style: GoogleFonts.manrope(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                    color: AppTheme.charcoalLight,
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ),

                      const SizedBox(height: 8),

                      // 4. Monthly Grid
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0),
                        child: GridView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 7,
                            mainAxisSpacing: 8,
                            crossAxisSpacing: 8,
                          ),
                          itemCount: leadingEmptyDays + totalDaysInMonth,
                          itemBuilder: (context, index) {
                            if (index < leadingEmptyDays) {
                              return const SizedBox();
                            }

                            final day = index - leadingEmptyDays + 1;
                            final date = DateTime(_currentMonth.year, _currentMonth.month, day);
                            final isSelected = _selectedDate != null &&
                                _selectedDate!.year == date.year &&
                                _selectedDate!.month == date.month &&
                                _selectedDate!.day == date.day;

                            final event = _getEventForDate(date);
                            final isToday = DateTime.now().year == date.year &&
                                DateTime.now().month == date.month &&
                                DateTime.now().day == date.day;

                            Color dayBg = Colors.transparent;
                            Color borderCol = isToday ? AppTheme.primary : AppTheme.stone;
                            Color textCol = AppTheme.charcoal;

                            if (event != null) {
                              dayBg = event['color'].withOpacity(0.12);
                              borderCol = event['color'];
                            }

                            if (isSelected) {
                              dayBg = AppTheme.primary;
                              textCol = Colors.white;
                              borderCol = AppTheme.primary;
                            }

                            return GestureDetector(
                              onTap: () {
                                setState(() {
                                  _selectedDate = date;
                                });
                              },
                              child: Container(
                                decoration: BoxDecoration(
                                  color: dayBg,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: borderCol, width: isSelected || isToday ? 2 : 1),
                                ),
                                child: Stack(
                                  alignment: Alignment.center,
                                  children: [
                                    Text(
                                      '$day',
                                      style: GoogleFonts.manrope(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: textCol,
                                      ),
                                    ),
                                    if (event != null && !isSelected)
                                      Positioned(
                                        bottom: 4,
                                        child: CircleAvatar(
                                          radius: 3,
                                          backgroundColor: event['color'],
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),

                      // 4.5 Legend Indicators
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 8.0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            _buildLegendItem('Booked', const Color(0xFF10B981)),
                            _buildLegendItem('Blocked', const Color(0xFFEF4444)),
                            _buildLegendItem('iCal Sync', const Color(0xFFF59E0B)),
                            _buildLegendItem('Available', Colors.grey.shade400),
                          ],
                        ),
                      ),

                      const SizedBox(height: 16),

                      // 5. Selected Day Details
                      if (_selectedDate != null) ...[
                        Builder(builder: (context) {
                          final event = _getEventForDate(_selectedDate!);
                          return Container(
                            margin: const EdgeInsets.symmetric(horizontal: 16.0),
                            padding: const EdgeInsets.all(16.0),
                            decoration: BoxDecoration(
                              color: AppTheme.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppTheme.stone),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.03),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                )
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  DateFormat('EEEE, dd MMM yyyy').format(_selectedDate!),
                                  style: GoogleFonts.manrope(fontWeight: FontWeight.w800, fontSize: 15),
                                ),
                                const SizedBox(height: 10),
                                if (event == null) ...[
                                  Text(
                                    'This date is open and available for reservations.',
                                    style: TextStyle(color: Colors.green.shade700, fontSize: 13, fontWeight: FontWeight.w600),
                                  ),
                                  const SizedBox(height: 12),
                                  ElevatedButton.icon(
                                    onPressed: _showBlockDatesSheet,
                                    icon: const Icon(Icons.block, size: 16, color: Colors.white),
                                    label: const Text('BLOCK THIS DATE', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppTheme.primary,
                                      elevation: 0,
                                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                  ),
                                ] else ...[
                                  Row(
                                    children: [
                                      Icon(
                                        event['type'] == 'booking' ? Icons.bookmark : Icons.block,
                                        color: event['color'],
                                        size: 20,
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        event['type'] == 'booking'
                                            ? 'RESERVATION'
                                            : (event['type'] == 'manual' ? 'MANUAL BLOCK' : 'EXTERNAL BLOCK'),
                                        style: TextStyle(
                                          fontWeight: FontWeight.w800,
                                          fontSize: 12,
                                          color: event['color'],
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  if (event['type'] == 'booking') ...[
                                    Text(
                                      'Guest: ${event['data']['details']?['guest']?['full_name'] ?? 'STR Guest'}',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                    ),
                                    Text('Booking ID: ${event['data']['event_id']}'),
                                    Text('Nights: ${event['data']['start_date'].toString().split('T')[0]} to ${event['data']['end_date'].toString().split('T')[0]}'),
                                    Text('Total Value: ₹${event['data']['details']?['total_amount'] ?? "0"}'),
                                  ] else if (event['type'] == 'manual') ...[
                                    Text('Reason: ${event['data']['details']?['reason'] ?? 'Blocked by host'}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                    Text('Dates: ${event['data']['start_date']} to ${event['data']['end_date']}'),
                                    const SizedBox(height: 12),
                                    OutlinedButton.icon(
                                      onPressed: () async {
                                        final success = await propertyProvider.unblockDates(event['data']['event_id']);
                                        if (success && context.mounted) {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            const SnackBar(content: Text('Dates unblocked successfully')),
                                          );
                                          _fetchCalendarData();
                                        }
                                      },
                                      icon: const Icon(Icons.refresh, size: 14),
                                      label: const Text('UNBLOCK DATES', style: TextStyle(fontWeight: FontWeight.bold)),
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: Colors.red,
                                        side: const BorderSide(color: Colors.red),
                                      ),
                                    ),
                                  ] else ...[
                                    Text('Source: ${event['data']['title'] ?? 'External Feed'}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                    Text('Dates: ${event['data']['start_date']} to ${event['data']['end_date']}'),
                                    if (event['data']['details']?['reason'] != null) Text('Detail: ${event['data']['details']?['reason']}'),
                                  ]
                                ],
                              ],
                            ),
                          );
                        }),
                      ],

                      const SizedBox(height: 20),

                      // 6. External Calendar Manager
                      Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'iCal Sync Channels',
                                  style: GoogleFonts.manrope(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800,
                                    color: AppTheme.charcoal,
                                  ),
                                ),
                                Row(
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.share, color: AppTheme.primary, size: 20),
                                      tooltip: 'Export Feed URL',
                                      onPressed: _showExportLinkDialog,
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.add_link, color: AppTheme.primary, size: 22),
                                      tooltip: 'Import Feed URL',
                                      onPressed: _showAddExternalCalendarSheet,
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            if (propertyProvider.externalCalendars.isEmpty)
                              Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: AppTheme.stone.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Center(
                                  child: Text(
                                    'No external iCal channels synced yet.',
                                    style: TextStyle(fontSize: 12, color: AppTheme.charcoalLight),
                                  ),
                                ),
                              )
                            else
                              ListView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: propertyProvider.externalCalendars.length,
                                itemBuilder: (context, index) {
                                  final cal = propertyProvider.externalCalendars[index];
                                  final color = _colorFromHex(cal['color'] ?? '#D4AF37');
                                  return Card(
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      side: const BorderSide(color: AppTheme.stone),
                                    ),
                                    margin: const EdgeInsets.only(bottom: 8),
                                    child: ListTile(
                                      leading: CircleAvatar(
                                        backgroundColor: color,
                                        radius: 6,
                                      ),
                                      title: Text(
                                        cal['name'] ?? 'External iCal',
                                        style: GoogleFonts.manrope(fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                      subtitle: Text(
                                        'Last Synced: ${cal['last_synced_at'] != null ? DateFormat('dd MMM, hh:mm a').format(DateTime.parse(cal['last_synced_at']).toLocal()) : "Never"}',
                                        style: const TextStyle(fontSize: 11),
                                      ),
                                      trailing: IconButton(
                                        icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                                        onPressed: () async {
                                          final confirm = await showDialog<bool>(
                                            context: context,
                                            builder: (context) => AlertDialog(
                                              title: const Text('Delete Channel?'),
                                              content: const Text('Are you sure you want to stop syncing with this calendar?'),
                                              actions: [
                                                TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                                                TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete', style: TextStyle(color: Colors.red))),
                                              ],
                                            ),
                                          );
                                          if (confirm == true && context.mounted) {
                                            final success = await propertyProvider.removeExternalCalendar(cal['calendar_id']);
                                            if (success && context.mounted) {
                                              ScaffoldMessenger.of(context).showSnackBar(
                                                const SnackBar(content: Text('External calendar deleted')),
                                              );
                                              _fetchCalendarData();
                                            }
                                          }
                                        },
                                      ),
                                    ),
                                  );
                                },
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
