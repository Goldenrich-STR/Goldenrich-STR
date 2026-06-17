import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/property_provider.dart';
import '../../services/localization_service.dart';
import '../../theme.dart';
import 'property_detail_screen.dart';
import 'property_filter_dialog.dart';

class GuestBrowseScreen extends StatefulWidget {
  final String? initialCity;
  final int? initialGuests;
  final String? initialCategory;

  const GuestBrowseScreen({
    super.key,
    this.initialCity,
    this.initialGuests,
    this.initialCategory,
  });

  @override
  State<GuestBrowseScreen> createState() => _GuestBrowseScreenState();
}

class _GuestBrowseScreenState extends State<GuestBrowseScreen> {
  final _searchController = TextEditingController();
  String _selectedCity = '';
  Map<String, dynamic> _advancedFilters = {
    'category': '',
    'property_type': '',
    'bhk_type': '',
    'min_price': null,
    'max_price': null,
    'instant_booking': null,
    'pet_friendly': null,
    'amenities': '',
  };

  @override
  void initState() {
    super.initState();
    if (widget.initialCity != null && widget.initialCity!.isNotEmpty) {
      _searchController.text = widget.initialCity!;
      _selectedCity = widget.initialCity!;
    }
    if (widget.initialGuests != null && widget.initialGuests! > 0) {
      _advancedFilters['guests'] = widget.initialGuests;
    }
    if (widget.initialCategory != null && widget.initialCategory!.isNotEmpty) {
      _advancedFilters['category'] = widget.initialCategory;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadProperties();
    });
  }

  void _loadProperties() {
    final provider = Provider.of<PropertyProvider>(context, listen: false);
    final Map<String, dynamic> params = {};
    if (_searchController.text.isNotEmpty) {
      params['city'] = _searchController.text;
    } else if (_selectedCity.isNotEmpty) {
      params['city'] = _selectedCity;
    }

    _advancedFilters.forEach((key, value) {
      if (value != null && value.toString().isNotEmpty) {
        params[key] = value;
      }
    });

    provider.searchProperties(params);
  }

  Future<void> _openFilters() async {
    final result = await Navigator.push<Map<String, dynamic>>(
      context,
      MaterialPageRoute(
        builder: (context) => PropertyFilterDialog(initialFilters: _advancedFilters),
      ),
    );
    if (result != null) {
      setState(() {
        _advancedFilters = result;
      });
      _loadProperties();
    }
  }

  @override
  Widget build(BuildContext context) {
    final propertyProvider = Provider.of<PropertyProvider>(context);
    final localeProvider = Provider.of<LocaleProvider>(context);
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text(
          localeProvider.translate('app_title'),
          style: textTheme.displayMedium?.copyWith(color: AppTheme.primary),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Search properties...',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.send),
                        onPressed: _loadProperties,
                      ),
                    ),
                    onSubmitted: (_) => _loadProperties(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.tune, color: AppTheme.primary),
                  onPressed: _openFilters,
                ),
              ],
            ),
          ),
          // City Chips
          SizedBox(
            height: 50,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              children: [
                _buildCityChip('', 'All Cities'),
                _buildCityChip('Goa', 'Goa'),
                _buildCityChip('Mumbai', 'Mumbai'),
                _buildCityChip('Jaipur', 'Jaipur'),
                _buildCityChip('Bangalore', 'Bangalore'),
                _buildCityChip('Delhi', 'Delhi'),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: propertyProvider.isLoading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                : propertyProvider.properties.isEmpty
                    ? const Center(child: Text('No properties found.'))
                    : ListView.builder(
                        itemCount: propertyProvider.properties.length,
                        padding: const EdgeInsets.symmetric(horizontal: 16.0),
                        itemBuilder: (context, index) {
                          final prop = propertyProvider.properties[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 16.0),
                            child: InkWell(
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => PropertyDetailScreen(propertyId: prop.propertyId),
                                  ),
                                );
                              },
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  ClipRRect(
                                    borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                                    child: Image.network(
                                      prop.images.isNotEmpty
                                          ? prop.images[0]
                                          : 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85',
                                      height: 180,
                                      fit: BoxFit.cover,
                                      errorBuilder: (context, _, __) => Container(
                                        height: 180,
                                        color: AppTheme.stone,
                                        child: const Icon(Icons.home, size: 50, color: AppTheme.secondary),
                                      ),
                                    ),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.all(16.0),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          prop.title,
                                          style: textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${prop.city}, ${prop.state}',
                                          style: textTheme.bodyMedium,
                                        ),
                                        const SizedBox(height: 12),
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              prop.category.toLowerCase() == 'commercial' || prop.category.toLowerCase() == 'event_venue'
                                                  ? '₹${prop.pricePerNight.toStringAsFixed(0)} / day'
                                                  : '₹${prop.pricePerNight.toStringAsFixed(0)} / night',
                                              style: textTheme.bodyLarge?.copyWith(
                                                color: AppTheme.primary,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            Row(
                                              children: [
                                                const Icon(Icons.bed_outlined, size: 16, color: AppTheme.secondary),
                                                const SizedBox(width: 4),
                                                Text(prop.bhkType.toUpperCase()),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildCityChip(String cityCode, String label) {
    final isSelected = _selectedCity == cityCode;
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (selected) {
          setState(() {
            _selectedCity = cityCode;
          });
          _loadProperties();
        },
        selectedColor: AppTheme.primary,
        labelStyle: TextStyle(
          color: isSelected ? Colors.white : AppTheme.charcoal,
        ),
      ),
    );
  }
}
