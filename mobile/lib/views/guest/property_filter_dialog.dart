import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBF8F2),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(14, 14, 14, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _Header(
                        onBack: () => Navigator.pop(context),
                        onClear: _clearAll),
                    const SizedBox(height: 18),
                    _DropdownCard(
                        icon: _categoryIcon,
                        title: 'Category',
                        value: _selectedCategory,
                        items: _categories,
                        onChanged: (v) => _setCategory(v ?? '')),
                    const SizedBox(height: 10),
                    _DropdownCard(
                        icon: Icons.apartment_rounded,
                        title: 'Property Type',
                        value: _selectedPropertyType,
                        items: _propertyTypes,
                        onChanged: (v) =>
                            setState(() => _selectedPropertyType = v ?? '')),
                    const SizedBox(height: 10),
                    _DropdownCard(
                        icon: Icons.bed_outlined,
                        title: 'BHK / Configuration',
                        value: _selectedBhkType,
                        items: _bhkTypes,
                        onChanged: (v) =>
                            setState(() => _selectedBhkType = v ?? '')),
                    const SizedBox(height: 10),
                    _PriceCard(
                        minController: _minPriceController,
                        maxController: _maxPriceController),
                    const SizedBox(height: 16),
                    const _SectionTitle('Booking Preferences'),
                    const SizedBox(height: 10),
                    _PreferenceCard(children: [
                      _PreferenceRow(
                          icon: Icons.flash_on_rounded,
                          title: 'Instant Book',
                          subtitle: 'Confirmed automatically after payment verification',
                          trailing: Checkbox(
                              value: _instantBooking,
                              onChanged: (v) => setState(() {
                                    _instantBooking = v ?? false;
                                    _hostApprovalRequired = false;
                                  }))),
                      _PreferenceRow(
                          icon: Icons.pets_rounded,
                          title: 'Pet Friendly',
                          trailing: Switch(
                              value: _petFriendly,
                              activeThumbColor: Colors.white,
                              activeTrackColor: AppTheme.primary,
                              onChanged: (v) =>
                                  setState(() => _petFriendly = v))),
                    ]),
                    const SizedBox(height: 18),
                    const _SectionTitle('Essential Amenities'),
                    const SizedBox(height: 4),
                    Text('Select amenities that matter to you',
                        style: GoogleFonts.inter(
                            fontSize: 12,
                            color: AppTheme.charcoalMuted,
                            fontWeight: FontWeight.w600)),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _amenitiesOptions.map((a) {
                        final selected = _selectedAmenities.contains(a);
                        return _AmenityChip(
                          amenity: a,
                          selected: selected,
                          onSelected: (value) => setState(() {
                            value
                                ? _selectedAmenities.add(a)
                                : _selectedAmenities.remove(a);
                          }),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 22),
                  ],
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(14, 8, 14, 10),
              color: const Color(0xFFFBF8F2),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    height: 52,
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _applyFilters,
                      icon: const Icon(Icons.tune_rounded,
                          color: AppTheme.primary),
                      label: const Text('Apply Filters'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF07142F),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14)),
                        textStyle: GoogleFonts.inter(
                            fontSize: 17, fontWeight: FontWeight.w900),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text('100% Secure  •  Trusted by 10,000+ users',
                      style: GoogleFonts.inter(
                          fontSize: 11,
                          color: AppTheme.charcoalMuted,
                          fontWeight: FontWeight.w700)),
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
