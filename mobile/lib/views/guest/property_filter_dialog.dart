import 'package:flutter/material.dart';
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
  late bool _petFriendly;
  late List<String> _selectedAmenities;

  final List<Map<String, String>> _categories = [
    {'value': '', 'label': 'Any Category'},
    {'value': 'residential', 'label': 'Residential'},
    {'value': 'commercial', 'label': 'Commercial'},
    {'value': 'event_venue', 'label': 'Event Venue'},
  ];

  final List<Map<String, String>> _propertyTypes = [
    {'value': '', 'label': 'Any type'},
    {'value': 'apartment', 'label': 'Apartment'},
    {'value': 'villa', 'label': 'Villa'},
    {'value': 'studio', 'label': 'Studio'},
    {'value': 'independent_house', 'label': 'Independent House'},
    {'value': 'pg', 'label': 'PG'},
    {'value': 'co_living', 'label': 'Co-living'},
    {'value': 'private_office', 'label': 'Private Office'},
    {'value': 'co_working', 'label': 'Co-working'},
    {'value': 'meeting_room', 'label': 'Meeting Room'},
    {'value': 'banquet_hall', 'label': 'Banquet Hall'},
    {'value': 'farmhouse', 'label': 'Farmhouse'},
    {'value': 'rooftop', 'label': 'Rooftop'},
    {'value': 'hotel_ballroom', 'label': 'Hotel Ballroom'},
  ];

  final List<Map<String, String>> _bhkTypes = [
    {'value': '', 'label': 'Any size'},
    {'value': 'studio', 'label': 'Studio'},
    {'value': '1bhk', 'label': '1 BHK'},
    {'value': '2bhk', 'label': '2 BHK'},
    {'value': '3bhk', 'label': '3 BHK'},
    {'value': '4bhk', 'label': '4 BHK'},
    {'value': 'commercial', 'label': 'Commercial'},
    {'value': 'banquet', 'label': 'Banquet'},
  ];

  final List<String> _amenitiesOptions = [
    'wifi', 'ac', 'parking', 'kitchen', 'pool', 'gym', 'tv',
    'fireplace', 'rooftop', 'bar', 'av_system', 'stage', 'catering',
    'coffee', 'printer', 'restrooms',
  ];

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.initialFilters['category'] ?? '';
    _selectedPropertyType = widget.initialFilters['property_type'] ?? '';
    _selectedBhkType = widget.initialFilters['bhk_type'] ?? '';
    _minPriceController = TextEditingController(text: widget.initialFilters['min_price']?.toString() ?? '');
    _maxPriceController = TextEditingController(text: widget.initialFilters['max_price']?.toString() ?? '');
    _instantBooking = widget.initialFilters['instant_booking'] ?? false;
    _petFriendly = widget.initialFilters['pet_friendly'] ?? false;
    
    final initialAmenities = widget.initialFilters['amenities'];
    if (initialAmenities is List<String>) {
      _selectedAmenities = List.from(initialAmenities);
    } else if (initialAmenities is String && initialAmenities.isNotEmpty) {
      _selectedAmenities = initialAmenities.split(',').where((s) => s.isNotEmpty).toList();
    } else {
      _selectedAmenities = [];
    }
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
      _petFriendly = false;
      _selectedAmenities.clear();
    });
  }

  void _applyFilters() {
    final Map<String, dynamic> results = {
      'category': _selectedCategory,
      'property_type': _selectedPropertyType,
      'bhk_type': _selectedBhkType,
      'min_price': _minPriceController.text.isNotEmpty ? double.tryParse(_minPriceController.text) : null,
      'max_price': _maxPriceController.text.isNotEmpty ? double.tryParse(_maxPriceController.text) : null,
      'instant_booking': _instantBooking ? true : null,
      'pet_friendly': _petFriendly ? true : null,
      'amenities': _selectedAmenities.isNotEmpty ? _selectedAmenities.join(',') : '',
    };
    Navigator.pop(context, results);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text('Filters', style: textTheme.displayMedium?.copyWith(color: AppTheme.charcoal)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          TextButton(
            onPressed: _clearAll,
            child: const Text('Clear All', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Category
                    Text('Category', style: textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedCategory,
                      decoration: const InputDecoration(prefixIcon: Icon(Icons.category_outlined)),
                      items: _categories.map((c) => DropdownMenuItem(
                        value: c['value'],
                        child: Text(c['label']!),
                      )).toList(),
                      onChanged: (val) => setState(() => _selectedCategory = val ?? ''),
                    ),
                    const SizedBox(height: 20),

                    // Property Type
                    Text('Property Type', style: textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedPropertyType,
                      decoration: const InputDecoration(prefixIcon: Icon(Icons.home_work_outlined)),
                      items: _propertyTypes.map((p) => DropdownMenuItem(
                        value: p['value'],
                        child: Text(p['label']!),
                      )).toList(),
                      onChanged: (val) => setState(() => _selectedPropertyType = val ?? ''),
                    ),
                    const SizedBox(height: 20),

                    // BHK Config
                    Text('BHK / Configuration', style: textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedBhkType,
                      decoration: const InputDecoration(prefixIcon: Icon(Icons.bed_outlined)),
                      items: _bhkTypes.map((b) => DropdownMenuItem(
                        value: b['value'],
                        child: Text(b['label']!),
                      )).toList(),
                      onChanged: (val) => setState(() => _selectedBhkType = val ?? ''),
                    ),
                    const SizedBox(height: 20),

                    // Price Range
                    Text('Price Range (₹)', style: textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _minPriceController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Min Price',
                              hintText: 'e.g. 1000',
                            ),
                          ),
                        ),
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 12.0),
                          child: Text('—', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.charcoalMuted)),
                        ),
                        Expanded(
                          child: TextFormField(
                            controller: _maxPriceController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Max Price',
                              hintText: 'e.g. 10000',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Toggles
                    SwitchListTile(
                      title: const Text('Instant Booking', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      subtitle: const Text('Book without waiting for host approval'),
                      value: _instantBooking,
                      onChanged: (val) => setState(() => _instantBooking = val),
                    ),
                    SwitchListTile(
                      title: const Text('Pet Friendly', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      value: _petFriendly,
                      onChanged: (val) => setState(() => _petFriendly = val),
                    ),
                    const SizedBox(height: 20),

                    // Amenities
                    Text('Essential Amenities', style: textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8.0,
                      runSpacing: 8.0,
                      children: _amenitiesOptions.map((a) {
                        final isSelected = _selectedAmenities.contains(a);
                        final displayName = a.replaceAll('_', ' ').replaceFirst(a[0], a[0].toUpperCase());
                        return ChoiceChip(
                          label: Text(displayName),
                          selected: isSelected,
                          onSelected: (selected) {
                            setState(() {
                              if (selected) {
                                _selectedAmenities.add(a);
                              } else {
                                _selectedAmenities.remove(a);
                              }
                            });
                          },
                          selectedColor: AppTheme.primary,
                          labelStyle: TextStyle(
                            color: isSelected ? Colors.white : AppTheme.charcoal,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size.fromHeight(50),
                ),
                onPressed: _applyFilters,
                child: const Text('Apply Filters'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
