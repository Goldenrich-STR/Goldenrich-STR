import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../theme.dart';

class PropertyFilterDialog extends StatefulWidget {
  final Map<String, dynamic> initialFilters;

  const PropertyFilterDialog({super.key, required this.initialFilters});

  @override
  State<PropertyFilterDialog> createState() => _PropertyFilterDialogState();
}

class _PropertyFilterDialogState extends State<PropertyFilterDialog> {
  late String _selectedCategory;
  late String _selectedPropertyType;
  late String _selectedBhkType;
  late TextEditingController _minPriceController;
  late TextEditingController _maxPriceController;
  late bool _instantBooking;
  late bool _hostApprovalRequired;
  late bool _petFriendly;
  late List<String> _selectedAmenities;

  final _categories = const [
    {'value': '', 'label': 'Any Category'},
    {'value': 'residential', 'label': 'Residential'},
    {'value': 'commercial', 'label': 'Commercial'},
    {'value': 'event_venue', 'label': 'Event Venue'},
  ];

  List<Map<String, String>> get _propertyTypes =>
      _propertyTypesFor(_selectedCategory);

  List<Map<String, String>> get _bhkTypes => _bhkTypesFor(_selectedCategory);

  List<String> get _amenitiesOptions => _amenitiesFor(_selectedCategory);

  IconData get _categoryIcon {
    switch (_selectedCategory) {
      case 'residential':
        return Icons.home_work_outlined;
      case 'commercial':
        return Icons.apartment_rounded;
      case 'event_venue':
        return Icons.celebration_outlined;
      default:
        return Icons.category_outlined;
    }
  }

  List<Map<String, String>> _propertyTypesFor(String category) {
    const any = {'value': '', 'label': 'Any Type'};
    switch (category) {
      case 'residential':
        return const [
          any,
          {'value': 'apartment', 'label': 'Apartment'},
          {'value': 'villa', 'label': 'Villa'},
          {'value': 'bungalow', 'label': 'Bungalow'},
          {'value': 'farmhouse', 'label': 'Farmhouse'},
          {'value': 'resort', 'label': 'Resort'},
        ];
      case 'commercial':
        return const [
          any,
          {'value': 'private_office', 'label': 'Private Office'},
          {'value': 'co_working', 'label': 'Co-working'},
          {'value': 'meeting_room', 'label': 'Meeting Room'},
          {'value': 'conference_room', 'label': 'Conference Room'},
          {'value': 'showroom', 'label': 'Showroom'},
        ];
      case 'event_venue':
        return const [
          any,
          {'value': 'banquet_hall', 'label': 'Banquet Hall'},
          {'value': 'wedding_venue', 'label': 'Wedding Venue'},
          {'value': 'event_lawn', 'label': 'Event Lawn'},
          {'value': 'rooftop_venue', 'label': 'Rooftop Venue'},
          {'value': 'party_hall', 'label': 'Party Hall'},
        ];
      default:
        return const [
          any,
          {'value': 'apartment', 'label': 'Apartment'},
          {'value': 'villa', 'label': 'Villa'},
          {'value': 'bungalow', 'label': 'Bungalow'},
          {'value': 'private_office', 'label': 'Private Office'},
          {'value': 'co_working', 'label': 'Co-working'},
          {'value': 'meeting_room', 'label': 'Meeting Room'},
          {'value': 'banquet_hall', 'label': 'Banquet Hall'},
          {'value': 'wedding_venue', 'label': 'Wedding Venue'},
        ];
    }
  }

  List<Map<String, String>> _bhkTypesFor(String category) {
    const any = {'value': '', 'label': 'Any Size'};
    switch (category) {
      case 'commercial':
        return const [
          any,
          {'value': 'commercial', 'label': 'Commercial'},
        ];
      case 'event_venue':
        return const [
          any,
          {'value': 'banquet', 'label': 'Banquet'},
          {'value': 'event_hall', 'label': 'Event Hall'},
        ];
      default:
        return const [
          any,
          {'value': 'studio', 'label': 'Studio'},
          {'value': '1bhk', 'label': '1 BHK'},
          {'value': '2bhk', 'label': '2 BHK'},
          {'value': '3bhk', 'label': '3 BHK'},
          {'value': '4bhk', 'label': '4 BHK'},
        ];
    }
  }

  List<String> _amenitiesFor(String category) {
    switch (category) {
      case 'residential':
        return const [
          'wifi',
          'ac',
          'parking',
          'kitchen',
          'pool',
          'gym',
          'tv',
          'fireplace',
          'rooftop',
          'coffee',
        ];
      case 'commercial':
        return const [
          'wifi',
          'ac',
          'parking',
          'coffee',
          'printer',
          'restrooms',
          'av_system',
          'food_court',
        ];
      case 'event_venue':
        return const [
          'parking',
          'stage',
          'catering',
          'restrooms',
          'live_music',
          'food_court',
          'birthday_celebration',
          'indoor_games',
          'bar',
          'rooftop',
          'pool',
        ];
      default:
        return const [
          'wifi',
          'ac',
          'parking',
          'kitchen',
          'pool',
          'gym',
          'tv',
          'fireplace',
          'rooftop',
          'bar',
          'av_system',
          'stage',
          'catering',
          'coffee',
          'printer',
          'restrooms',
          'live_music',
          'food_court',
          'birthday_celebration',
          'indoor_games',
        ];
    }
  }

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.initialFilters['category'] ?? '';
    _selectedPropertyType = widget.initialFilters['property_type'] ?? '';
    _selectedBhkType = widget.initialFilters['bhk_type'] ?? '';
    _minPriceController = TextEditingController(
        text: widget.initialFilters['min_price']?.toString() ?? '');
    _maxPriceController = TextEditingController(
        text: widget.initialFilters['max_price']?.toString() ?? '');
    _instantBooking = widget.initialFilters['instant_booking'] == true;
    _hostApprovalRequired = widget.initialFilters['instant_booking'] == false;
    _petFriendly = widget.initialFilters['pet_friendly'] == true;
    final amenities = widget.initialFilters['amenities'];
    _selectedAmenities = amenities is String && amenities.isNotEmpty
        ? amenities.split(',').where((item) => item.isNotEmpty).toList()
        : [];
  }

  @override
  void dispose() {
    _minPriceController.dispose();
    _maxPriceController.dispose();
    super.dispose();
  }

  void _clearAll() {
    setState(() {
      _selectedCategory = '';
      _selectedPropertyType = '';
      _selectedBhkType = '';
      _minPriceController.clear();
      _maxPriceController.clear();
      _instantBooking = false;
      _hostApprovalRequired = false;
      _petFriendly = false;
      _selectedAmenities.clear();
    });
  }

  void _setCategory(String value) {
    setState(() {
      _selectedCategory = value;
      final propertyTypeValues =
          _propertyTypesFor(value).map((item) => item['value']).toSet();
      final bhkValues =
          _bhkTypesFor(value).map((item) => item['value']).toSet();
      final amenities = _amenitiesFor(value).toSet();
      if (!propertyTypeValues.contains(_selectedPropertyType)) {
        _selectedPropertyType = '';
      }
      if (!bhkValues.contains(_selectedBhkType)) {
        _selectedBhkType = '';
      }
      _selectedAmenities.removeWhere((item) => !amenities.contains(item));
    });
  }

  void _applyFilters() {
    Navigator.pop(context, {
      'category': _selectedCategory,
      'property_type': _selectedPropertyType,
      'bhk_type': _selectedBhkType,
      'min_price': _minPriceController.text.isNotEmpty
          ? double.tryParse(_minPriceController.text)
          : null,
      'max_price': _maxPriceController.text.isNotEmpty
          ? double.tryParse(_maxPriceController.text)
          : null,
      'instant_booking': _instantBooking
          ? true
          : _hostApprovalRequired
              ? false
              : null,
      'pet_friendly': _petFriendly ? true : null,
      'amenities':
          _selectedAmenities.isNotEmpty ? _selectedAmenities.join(',') : '',
    });
  }

  String _labelFor(List<Map<String, String>> options, String value) {
    for (final o in options) {
      if (o['value'] == value) return o['label'] ?? value;
    }
    return value;
  }

  List<String> get _selectedSummary {
    final out = <String>[];
    if (_selectedCategory.isNotEmpty) {
      out.add(_labelFor(
          _categories.map((e) => Map<String, String>.from(e)).toList(),
          _selectedCategory));
    }
    if (_selectedPropertyType.isNotEmpty) {
      out.add(_labelFor(_propertyTypes, _selectedPropertyType));
    }
    if (_selectedBhkType.isNotEmpty) {
      out.add(_labelFor(_bhkTypes, _selectedBhkType));
    }
    if (_minPriceController.text.isNotEmpty ||
        _maxPriceController.text.isNotEmpty) {
      out.add(
          '\u20b9${_minPriceController.text.isEmpty ? '0' : _minPriceController.text} - ${_maxPriceController.text.isEmpty ? 'Any' : _maxPriceController.text}');
    }
    if (_instantBooking) out.add('Instant Book');
    if (_petFriendly) out.add('Pet friendly');
    out.addAll(_selectedAmenities.map(_amenityLabel));
    return out;
  }

  String _amenityLabel(String raw) {
    final text = raw.replaceAll('_', ' ');
    return text.isEmpty ? raw : '${text[0].toUpperCase()}${text.substring(1)}';
  }

  Widget _title(String title, [String? sub]) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF1B1924))),
          if (sub != null)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(sub,
                  style: GoogleFonts.inter(
                      fontSize: 12, color: const Color(0xFF6B6B6B))),
            ),
        ],
      ),
    );
  }

  Widget _chip(String label, bool active, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: active ? const Color(0xFF1B1924) : Colors.white,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
              color: active
                  ? const Color(0xFF1B1924)
                  : const Color(0xFFD5D5D5)),
        ),
        child: Text(label,
            style: GoogleFonts.inter(
                fontSize: 13.5,
                fontWeight: FontWeight.w500,
                color: active ? Colors.white : const Color(0xFF1B1924))),
      ),
    );
  }

  Widget _divider() => const Padding(
        padding: EdgeInsets.symmetric(vertical: 22),
        child: Divider(height: 1, color: Color(0xFFEDEDED)),
      );

  Widget _priceField(TextEditingController c, String hint) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: const Color(0xFFF6F6F6),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFD5D5D5)),
        ),
        child: TextField(
          controller: c,
          keyboardType: TextInputType.number,
          onChanged: (_) => setState(() {}),
          style: GoogleFonts.inter(fontSize: 14),
          decoration: InputDecoration(
            border: InputBorder.none,
            prefixText: '\u20b9 ',
            hintText: hint,
            hintStyle: GoogleFonts.inter(
                fontSize: 14, color: const Color(0xFF9AA0A6)),
          ),
        ),
      ),
    );
  }

  void _setPriceBand(String? min, String? max) {
    setState(() {
      _minPriceController.text = min ?? '';
      _maxPriceController.text = max ?? '';
    });
  }

  @override
  Widget build(BuildContext context) {
    final summary = _selectedSummary;
    final bands = const [
      ['Under \u20b95,000', null, '5000'],
      ['\u20b95,000 - \u20b915,000', '5000', '15000'],
      ['\u20b915,000 - \u20b930,000', '15000', '30000'],
      ['\u20b930,000+', '30000', null],
    ];
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 16, 8),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(LucideIcons.arrowLeft, size: 22),
                  ),
                  Expanded(
                    child: Text('Filters',
                        style: GoogleFonts.inter(
                            fontSize: 17,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF1B1924))),
                  ),
                  GestureDetector(
                    onTap: _clearAll,
                    child: Text('Clear',
                        style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            decoration: TextDecoration.underline,
                            color: const Color(0xFF1B1924))),
                  ),
                ],
              ),
            ),
            const Divider(height: 1, color: Color(0xFFEDEDED)),
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _title('Selected Filters'),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: (summary.isEmpty ? ['All Results'] : summary)
                          .map((t) => Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 7),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF1F1F1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(t,
                                    style: GoogleFonts.inter(
                                        fontSize: 12.5,
                                        color: const Color(0xFF1B1924))),
                              ))
                          .toList(),
                    ),
                    _divider(),
                    _title('Category'),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: _categories
                          .map((c) => _chip(
                                c['value']!.isEmpty
                                    ? 'All'
                                    : c['label']!,
                                _selectedCategory == c['value'],
                                () => _setCategory(c['value']!),
                              ))
                          .toList(),
                    ),
                    _divider(),
                    _title('Price Range', 'Per night, in rupees'),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: bands.map((b) {
                        final min = b[1];
                        final max = b[2];
                        final active = _minPriceController.text == (min ?? '') &&
                            _maxPriceController.text == (max ?? '');
                        return _chip(b[0]!, active, () {
                          _setPriceBand(active ? null : min, active ? null : max);
                        });
                      }).toList(),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        _priceField(_minPriceController, 'Min'),
                        const SizedBox(width: 12),
                        _priceField(_maxPriceController, 'Max'),
                      ],
                    ),
                    _divider(),
                    _title('Property Type'),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: _propertyTypes
                          .where((t) => t['value']!.isNotEmpty)
                          .map((t) => _chip(
                                t['label']!,
                                _selectedPropertyType == t['value'],
                                () => setState(() => _selectedPropertyType =
                                    _selectedPropertyType == t['value']
                                        ? ''
                                        : t['value']!),
                              ))
                          .toList(),
                    ),
                    _divider(),
                    _title('Size'),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: _bhkTypes
                          .where((t) => t['value']!.isNotEmpty)
                          .map((t) => _chip(
                                t['label']!,
                                _selectedBhkType == t['value'],
                                () => setState(() => _selectedBhkType =
                                    _selectedBhkType == t['value']
                                        ? ''
                                        : t['value']!),
                              ))
                          .toList(),
                    ),
                    _divider(),
                    _title('Booking Preferences'),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        _chip('Instant Book', _instantBooking, () {
                          setState(() {
                            _instantBooking = !_instantBooking;
                            if (_instantBooking) _hostApprovalRequired = false;
                          });
                        }),
                        _chip('Pet friendly', _petFriendly,
                            () => setState(() => _petFriendly = !_petFriendly)),
                      ],
                    ),
                    _divider(),
                    _title('Amenities', 'Select amenities that matter to you'),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: _amenitiesOptions
                          .map((a) => _chip(
                                _amenityLabel(a),
                                _selectedAmenities.contains(a),
                                () => setState(() {
                                  _selectedAmenities.contains(a)
                                      ? _selectedAmenities.remove(a)
                                      : _selectedAmenities.add(a);
                                }),
                              ))
                          .toList(),
                    ),
                  ],
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Color(0xFFEDEDED))),
              ),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: _clearAll,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Text('CLEAR ALL',
                          style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF1B1924))),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: SizedBox(
                      height: 50,
                      child: ElevatedButton(
                        onPressed: _applyFilters,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1B1924),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8)),
                        ),
                        child: Text('APPLY FILTER',
                            style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.4)),
                      ),
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

class _Header extends StatelessWidget {
  final VoidCallback onBack;
  final VoidCallback onClear;
  const _Header({required this.onBack, required this.onClear});
  @override
  Widget build(BuildContext context) => Row(children: [
        IconButton.filled(
            onPressed: onBack,
            icon: const Icon(Icons.arrow_back_rounded),
            style: IconButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: const Color(0xFF07142F))),
        const SizedBox(width: 10),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Filters',
              style: GoogleFonts.inter(
                  fontSize: 30,
                  height: 1,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF07142F))),
          const SizedBox(height: 5),
          Text('Refine your search to find the perfect space',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(
                  fontSize: 12,
                  color: AppTheme.charcoalMuted,
                  fontWeight: FontWeight.w600)),
        ])),
        TextButton(
            onPressed: onClear,
            child: Text('Clear All',
                style: GoogleFonts.inter(
                    color: AppTheme.primary, fontWeight: FontWeight.w900))),
      ]);
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);
  @override
  Widget build(BuildContext context) => Text(text,
      style: GoogleFonts.inter(
          fontSize: 17, fontWeight: FontWeight.w900, color: AppTheme.charcoal));
}

class _DropdownCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final List<Map<String, String>> items;
  final ValueChanged<String?> onChanged;
  const _DropdownCard(
      {required this.icon,
      required this.title,
      required this.value,
      required this.items,
      required this.onChanged});
  @override
  Widget build(BuildContext context) => _FilterCard(
        icon: icon,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _SectionTitle(title),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            initialValue: value,
            isExpanded: true,
            decoration: _inputDecoration(),
            items: items
                .map((e) => DropdownMenuItem(
                    value: e['value'], child: Text(e['label']!)))
                .toList(),
            onChanged: onChanged,
          ),
        ]),
      );
}

class _PriceCard extends StatelessWidget {
  final TextEditingController minController;
  final TextEditingController maxController;
  const _PriceCard({required this.minController, required this.maxController});
  @override
  Widget build(BuildContext context) => _FilterCard(
        icon: Icons.currency_rupee_rounded,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const _SectionTitle('Price Range (₹)'),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(
                child: TextFormField(
                    controller: minController,
                    keyboardType: TextInputType.number,
                    decoration:
                        _inputDecoration(label: 'Min Price', hint: '₹ 0'))),
            const Padding(
                padding: EdgeInsets.symmetric(horizontal: 12),
                child:
                    Text('-', style: TextStyle(color: AppTheme.charcoalMuted))),
            Expanded(
                child: TextFormField(
                    controller: maxController,
                    keyboardType: TextInputType.number,
                    decoration: _inputDecoration(
                        label: 'Max Price', hint: '₹ 1,00,000+'))),
          ]),
        ]),
      );
}

class _FilterCard extends StatelessWidget {
  final IconData icon;
  final Widget child;
  const _FilterCard({required this.icon, required this.child});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppTheme.border)),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          CircleAvatar(
              radius: 23,
              backgroundColor: const Color(0xFFF8F0E6),
              child: Icon(icon, color: const Color(0xFF07142F), size: 20)),
          const SizedBox(width: 12),
          Expanded(child: child),
        ]),
      );
}

class _PreferenceCard extends StatelessWidget {
  final List<Widget> children;
  const _PreferenceCard({required this.children});
  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppTheme.border)),
        child: Column(children: [
          for (int i = 0; i < children.length; i++) ...[
            children[i],
            if (i != children.length - 1)
              const Divider(height: 1, color: AppTheme.border)
          ]
        ]),
      );
}

class _PreferenceRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget trailing;
  const _PreferenceRow(
      {required this.icon,
      required this.title,
      this.subtitle,
      required this.trailing});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(12),
        child: Row(children: [
          CircleAvatar(
              radius: 20,
              backgroundColor: const Color(0xFFF8F0E6),
              child: Icon(icon, color: AppTheme.primary, size: 18)),
          const SizedBox(width: 12),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(title,
                    style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        color: AppTheme.charcoal)),
                if (subtitle != null)
                  Text(subtitle!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                          fontSize: 11, color: AppTheme.charcoalMuted)),
              ])),
          trailing,
        ]),
      );
}

class _AmenityChip extends StatelessWidget {
  final String amenity;
  final bool selected;
  final ValueChanged<bool> onSelected;
  const _AmenityChip(
      {required this.amenity,
      required this.selected,
      required this.onSelected});
  @override
  Widget build(BuildContext context) {
    final label = amenity
        .replaceAll('_', ' ')
        .split(' ')
        .map((p) => p.isEmpty ? p : '${p[0].toUpperCase()}${p.substring(1)}')
        .join(' ');
    final icon = _amenityIcon(amenity);
    return ChoiceChip(
      selected: selected,
      onSelected: onSelected,
      avatar: Icon(icon,
          size: 15, color: selected ? AppTheme.primary : AppTheme.charcoal),
      label: Text(label),
      selectedColor: const Color(0xFFFFF5DF),
      backgroundColor: Colors.white,
      side: BorderSide(color: selected ? AppTheme.primary : AppTheme.border),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      labelStyle: GoogleFonts.inter(
          fontSize: 12, fontWeight: FontWeight.w800, color: AppTheme.charcoal),
    );
  }
}

InputDecoration _inputDecoration({String? label, String? hint}) =>
    InputDecoration(
      labelText: label,
      hintText: hint,
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppTheme.border)),
      enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppTheme.border)),
      focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppTheme.primary)),
    );

IconData _amenityIcon(String value) {
  switch (value) {
    case 'wifi':
      return Icons.wifi_rounded;
    case 'ac':
      return Icons.ac_unit_rounded;
    case 'parking':
      return Icons.local_parking_rounded;
    case 'kitchen':
      return Icons.restaurant_rounded;
    case 'pool':
      return Icons.pool_rounded;
    case 'gym':
      return Icons.fitness_center_rounded;
    case 'tv':
      return Icons.tv_rounded;
    case 'bar':
      return Icons.local_bar_rounded;
    case 'coffee':
      return Icons.coffee_rounded;
    case 'printer':
      return Icons.print_rounded;
    case 'stage':
      return Icons.mic_external_on_rounded;
    default:
      return Icons.check_circle_outline_rounded;
  }
}
