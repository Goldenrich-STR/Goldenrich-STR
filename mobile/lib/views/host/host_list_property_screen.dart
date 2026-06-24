import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import 'dart:convert';
import 'dart:io';
import '../../providers/property_provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme.dart';
import '../../models/property_model.dart';

class HostListPropertyScreen extends StatefulWidget {
  final PropertyModel? property;
  const HostListPropertyScreen({super.key, this.property});

  @override
  State<HostListPropertyScreen> createState() => _HostListPropertyScreenState();
}

class _HostListPropertyScreenState extends State<HostListPropertyScreen> {
  int _currentStep = 0;
  final _formKey = GlobalKey<FormState>();

  // Step 1: Basics
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  String _category = 'residential';
  String _propertyType = 'apartment';
  String _bhkType = '2bhk';
  final _areaController = TextEditingController();
  final _minGuestsController = TextEditingController(text: '1');
  final _maxGuestsController = TextEditingController(text: '6');

  // Step 2: Location
  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  final _pincodeController = TextEditingController();
  final _mapsUrlController = TextEditingController();
  double _latitude = 19.0760;
  double _longitude = 72.8777;

  // Step 3: Pricing & Rules
  final _priceController = TextEditingController();
  final _vegPriceController = TextEditingController();
  final _nonVegPriceController = TextEditingController();

  final List<PackageItem> _vegPackageItems = [
    PackageItem(name: 'Chaat Counter', count: 0),
    PackageItem(name: 'Welcome Drinks', count: 0),
    PackageItem(name: 'Soups', count: 0),
    PackageItem(name: 'Veg Starter', count: 0),
    PackageItem(name: 'Veg Main Courses', count: 0),
    PackageItem(name: 'Salads', count: 0),
    PackageItem(name: 'Raita', count: 0),
    PackageItem(name: 'Dal', count: 0),
    PackageItem(name: 'Rice/Biryani', count: 0),
    PackageItem(name: 'Assorted Breads/Rotis', count: 0),
    PackageItem(name: 'Desserts', count: 0),
  ];
  
  final List<PackageItem> _nonVegPackageItems = [
    PackageItem(name: 'Chaat Counter', count: 0),
    PackageItem(name: 'Welcome Drinks', count: 0),
    PackageItem(name: 'Soups', count: 0),
    PackageItem(name: 'Veg Starter', count: 0),
    PackageItem(name: 'Non-Veg Starter', count: 0),
    PackageItem(name: 'Veg Main Courses', count: 0),
    PackageItem(name: 'Salads', count: 0),
    PackageItem(name: 'Non-Veg Main Courses', count: 0),
    PackageItem(name: 'Raita', count: 0),
    PackageItem(name: 'Dal', count: 0),
    PackageItem(name: 'Rice/Biryani', count: 0),
    PackageItem(name: 'Assorted Breads/Rotis', count: 0),
    PackageItem(name: 'Desserts', count: 0),
  ];

  final _minStayController = TextEditingController(text: '1');
  final List<TextEditingController> _rulesControllers = [];
  String _pricingCycle = 'day';
  final _rulesController = TextEditingController();
  bool _petFriendly = false;
  bool _smokingAllowed = false;
  bool _instantBooking = false;
  bool _hasCook = false;
  final _cookPriceController = TextEditingController();
  bool _hasSelfCook = false;

  // Step 4: Amenities
  final List<String> _selectedAmenities = [];

  // Step 4: Event Venue specific policies & details
  final Map<String, dynamic> _venuePolicies = {
    'timings_morning_start': '',
    'timings_morning_end': '',
    'timings_afternoon_start': '',
    'timings_afternoon_end': '',
    'timings_evening_start': '',
    'timings_evening_end': '',
    'rooms_available': false,
    'rooms_count': '',
    'room_price': '',
    'food_venue': false,
    'food_outside': false,
    'food_nonveg': false,
    'decor_venue': false,
    'decor_outside': false,
    'alcohol_allowed': false,
    'alcohol_outside': false,
    'parking_valet': false,
    'parking_space': '',
    'changing_room_ac': false,
    'other_music': false,
    'other_ac': false,
    'other_baarat': false,
    'other_firecrackers': false,
    'other_hawan': false,
    'other_overnight': false,
  };

  final _taxesController = TextEditingController(text: '18.00');
  final _advanceController = TextEditingController(text: '20');
  final _roomsCountController = TextEditingController();
  final _roomPriceController = TextEditingController();
  final _parkingSpaceController = TextEditingController();

  // Step 5: Photos & Videos
  final List<String> _uploadedImages = [];
  bool _isUploadingPhoto = false;
  String? _videoUrl;
  bool _isUploadingVideo = false;
  final _youtubeShortController = TextEditingController();
  final _youtubeLongController = TextEditingController();

  bool _isSubmitting = false;
  bool _isGeneratingAI = false;
  bool _isDetectingLocation = false;
  bool _isParsingMapsUrl = false;

  final List<Map<String, dynamic>> _stepHeaders = [
    {'title': 'Basics', 'icon': Icons.info_outline},
    {'title': 'Location', 'icon': Icons.map_outlined},
    {'title': 'Pricing', 'icon': Icons.monetization_on_outlined},
    {'title': 'Amenities', 'icon': Icons.room_service_outlined},
    {'title': 'Photos', 'icon': Icons.image_outlined},
    {'title': 'Review', 'icon': Icons.check_circle_outline},
  ];

  final Map<String, List<Map<String, String>>> _propertyTypesByCategory = {
    'residential': [
      {'value': 'apartment', 'label': 'Apartment'},
      {'value': 'villa', 'label': 'Villa'},
      {'value': 'studio', 'label': 'Studio'},
      {'value': 'independent_house', 'label': 'Independent House'},
      {'value': 'pg', 'label': 'PG'},
      {'value': 'co_living', 'label': 'Co-living'},
      {'value': 'farmhouse', 'label': 'Farmhouse'},
    ],
    'commercial': [
      {'value': 'private_office', 'label': 'Private Office'},
      {'value': 'co_working', 'label': 'Co-working'},
      {'value': 'meeting_room', 'label': 'Meeting Room'},
      {'value': 'shop', 'label': 'Shop/Showroom'},
      {'value': 'warehouse', 'label': 'Warehouse'},
    ],
    'event_venue': [
      {'value': 'banquet_hall', 'label': 'Banquet Hall'},
      {'value': 'rooftop', 'label': 'Rooftop'},
      {'value': 'hotel_ballroom', 'label': 'Hotel Ballroom'},
      {'value': 'garden', 'label': 'Garden/Lawn'},
      {'value': 'party_plot', 'label': 'Party Plot'},
    ]
  };

  final Map<String, List<Map<String, String>>> _bhkTypesByCategory = {
    'residential': [
      {'value': 'studio', 'label': 'Studio'},
      {'value': '1bhk', 'label': '1 BHK'},
      {'value': '2bhk', 'label': '2 BHK'},
      {'value': '3bhk', 'label': '3 BHK'},
      {'value': '4bhk', 'label': '4 BHK'},
      {'value': '5bhk', 'label': '5+ BHK'},
    ],
    'commercial': [
      {'value': 'small', 'label': 'Small (< 500 sqft)'},
      {'value': 'medium', 'label': 'Medium (500-2000 sqft)'},
      {'value': 'large', 'label': 'Large (2000-5000 sqft)'},
      {'value': 'extra_large', 'label': 'Extra Large (5000+ sqft)'},
    ],
    'event_venue': [
      {'value': 'small_event', 'label': 'Mini (up to 50 guests)'},
      {'value': 'medium_event', 'label': 'Standard (50-200 guests)'},
      {'value': 'large_event', 'label': 'Grand (200-500 guests)'},
      {'value': 'mega_event', 'label': 'Mega (500+ guests)'},
    ]
  };

  List<Map<String, dynamic>> _getAmenitiesForCategory(String category) {
    if (category == 'commercial') {
      return [
        {'value': 'enterprise_wifi', 'label': 'Enterprise High-speed WiFi', 'icon': Icons.wifi},
        {'value': 'central_ac', 'label': 'Centralized AC / Air Conditioning', 'icon': Icons.ac_unit},
        {'value': 'business_parking', 'label': 'Reserved Business Parking', 'icon': Icons.local_parking},
        {'value': 'printer_scanner', 'label': 'High-speed Printer & Scanner', 'icon': Icons.print},
        {'value': 'coffee_station', 'label': 'Coffee & Tea Station', 'icon': Icons.coffee},
        {'value': 'executive_restrooms', 'label': 'Executive Restrooms', 'icon': Icons.wc},
        {'value': 'dedicated_workstations', 'label': 'Dedicated Workstations', 'icon': Icons.computer},
        {'value': 'projector_screen', 'label': 'HD Projector & Screen', 'icon': Icons.videocam},
        {'value': 'collaboration_whiteboards', 'label': 'Collaboration Whiteboards', 'icon': Icons.developer_board},
        {'value': 'generator_backup', 'label': '24/7 Power Generator Backup', 'icon': Icons.power},
      ];
    } else if (category == 'event_venue') {
      return [
        {'value': 'guest_wifi', 'label': 'High-capacity Guest WiFi', 'icon': Icons.wifi},
        {'value': 'banquet_ac', 'label': 'Banquet Hall AC', 'icon': Icons.ac_unit},
        {'value': 'valet_parking', 'label': 'Valet & Guest Parking', 'icon': Icons.local_parking},
        {'value': 'sound_av', 'label': 'Professional Sound & AV System', 'icon': Icons.volume_up},
        {'value': 'stage', 'label': 'Performance Stage / Podium', 'icon': Icons.mic},
        {'value': 'prep_kitchen', 'label': 'Catering Prep Kitchen', 'icon': Icons.kitchen},
        {'value': 'bar_lounge', 'label': 'Premium Bar Lounge Setup', 'icon': Icons.local_bar},
        {'value': 'rooftop', 'label': 'Scenic Rooftop Access', 'icon': Icons.roofing},
        {'value': 'changing_rooms', 'label': 'VIP/Groom Changing Rooms', 'icon': Icons.meeting_room},
        {'value': 'security', 'label': 'Professional Event Security', 'icon': Icons.security},
      ];
    } else {
      return [
        {'value': 'wifi', 'label': 'WiFi', 'icon': Icons.wifi},
        {'value': 'ac', 'label': 'Air Conditioning', 'icon': Icons.ac_unit},
        {'value': 'parking', 'label': 'Parking Space', 'icon': Icons.local_parking},
        {'value': 'kitchen', 'label': 'Fully-Equipped Kitchen', 'icon': Icons.kitchen},
        {'value': 'pool', 'label': 'Swimming Pool', 'icon': Icons.pool},
        {'value': 'gym', 'label': 'Fitness Center/Gym', 'icon': Icons.fitness_center},
        {'value': 'tv', 'label': 'Smart TV', 'icon': Icons.tv},
        {'value': 'washer', 'label': 'Washing Machine', 'icon': Icons.local_laundry_service},
        {'value': 'heating', 'label': 'Heating System', 'icon': Icons.thermostat},
        {'value': 'fireplace', 'label': 'Indoor Fireplace', 'icon': Icons.fireplace},
      ];
    }
  }

  String? _createdPropertyId;

  @override
  void initState() {
    super.initState();
    
    if (widget.property != null) {
      final p = widget.property!;
      _createdPropertyId = p.propertyId;
      _titleController.text = p.title;
      _descController.text = p.description;
      _category = p.category;
      _propertyType = p.propertyType;
      _bhkType = p.bhkType;
      _areaController.text = p.areaSqft.toString();
      _minGuestsController.text = (p.guestSize ?? 1).toString();
      _maxGuestsController.text = p.maxGuests.toString();
      _addressController.text = p.address;
      _cityController.text = p.city;
      _stateController.text = p.state;
      _pincodeController.text = p.pinCode;
      _latitude = p.latitude;
      _longitude = p.longitude;
      _priceController.text = p.pricePerNight.toString();
      _videoUrl = p.videoUrl;
      _youtubeShortController.text = p.youtubeShortUrl ?? '';
      _youtubeLongController.text = p.youtubeLongUrl ?? '';
      
      _selectedAmenities.addAll(p.amenities);
      _uploadedImages.addAll(p.images);
      _petFriendly = p.petFriendly;
      _instantBooking = p.instantBooking;
      _hasCook = p.hasCook;
      if (p.cookPrice != null) _cookPriceController.text = p.cookPrice.toString();
      _hasSelfCook = p.hasSelfCook;
      
      if (p.vegPrice != null) _vegPriceController.text = p.vegPrice.toString();
      if (p.nonVegPrice != null) _nonVegPriceController.text = p.nonVegPrice.toString();
      
      if (p.houseRules != null && p.houseRules!.isNotEmpty) {
        if (_category == 'event_venue') {
          try {
            final Map<String, dynamic> decoded = jsonDecode(p.houseRules!);
            _venuePolicies.addAll(decoded);
            _taxesController.text = _venuePolicies['taxes'] ?? '18.00';
            _advanceController.text = _venuePolicies['advance'] ?? '20';
            _roomsCountController.text = _venuePolicies['rooms_count'] ?? '';
            _roomPriceController.text = _venuePolicies['room_price'] ?? '';
            _parkingSpaceController.text = _venuePolicies['parking_space'] ?? '';
          } catch (e) {
            // Fallback
            _rulesControllers.add(TextEditingController(text: p.houseRules));
          }
        } else {
          final rules = p.houseRules!.split('\n');
          for (final rule in rules) {
            if (rule.trim().isNotEmpty) {
              _rulesControllers.add(TextEditingController(text: rule));
            }
          }
        }
      }
    }
    
    if (_rulesControllers.isEmpty) {
      _rulesControllers.add(TextEditingController());
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    _areaController.dispose();
    _minGuestsController.dispose();
    _maxGuestsController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _pincodeController.dispose();
    _mapsUrlController.dispose();
    _priceController.dispose();
    _minStayController.dispose();
    _rulesController.dispose();
    _vegPriceController.dispose();
    _nonVegPriceController.dispose();
    _taxesController.dispose();
    _advanceController.dispose();
    _roomsCountController.dispose();
    _roomPriceController.dispose();
    _parkingSpaceController.dispose();
    _youtubeShortController.dispose();
    _youtubeLongController.dispose();
    _cookPriceController.dispose();
    for (final controller in _rulesControllers) {
      controller.dispose();
    }
    super.dispose();
  }

  void _generateAIDescription() async {
    if (_titleController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a Title first to generate description.')),
      );
      return;
    }

    setState(() => _isGeneratingAI = true);
    
    final payload = {
      'title': _titleController.text.trim(),
      'category': _category,
      'property_type': _propertyType,
      'bhk_type': _bhkType,
      'city': _cityController.text.trim().isNotEmpty ? _cityController.text.trim() : 'Mumbai',
      'amenities': _selectedAmenities,
      'area_sqft': _areaController.text.isNotEmpty ? double.tryParse(_areaController.text) : 1000.0,
      'guest_size': _minGuestsController.text.isNotEmpty ? int.tryParse(_minGuestsController.text) : 1,
      'max_guests': _maxGuestsController.text.isNotEmpty ? int.tryParse(_maxGuestsController.text) : 4,
    };

    final result = await Provider.of<PropertyProvider>(context, listen: false).generateDescription(payload);
    
    if (mounted) {
      setState(() => _isGeneratingAI = false);
      if (result != null) {
        setState(() {
          _descController.text = result;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('AI Description generated!')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to generate description. Simulated description applied.')),
        );
        setState(() {
          _descController.text = 'Welcome to this premium $_bhkType $_propertyType located in the heart of ${_cityController.text.isNotEmpty ? _cityController.text : "the city"}. This luxury space offers high-speed WiFi, modern air conditioning, comfortable furnishings, and a peaceful locality perfect for families or business travellers. Enjoy convenient access to popular local attractions, cafes, and business hubs.';
        });
      }
    }
  }

  void _autofillLocationMock() {
    setState(() {
      _addressController.text = 'Flat 402, Golden Crest Apartments, Sector 15';
      _cityController.text = 'Pune';
      _stateController.text = 'Maharashtra';
      _pincodeController.text = '411001';
      _latitude = 18.5204;
      _longitude = 73.8567;
      _mapsUrlController.text = 'https://www.google.com/maps/place/18.5204,73.8567';
    });
  }

  void _detectCurrentLocation() async {
    setState(() => _isDetectingLocation = true);
    try {
      final response = await Dio().get('https://ipapi.co/json/', options: Options(receiveTimeout: const Duration(seconds: 4), sendTimeout: const Duration(seconds: 4)));
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        setState(() {
          _cityController.text = data['city'] ?? 'Pune';
          _stateController.text = data['region'] ?? 'Maharashtra';
          _pincodeController.text = data['postal'] ?? '411001';
          _latitude = double.tryParse(data['latitude']?.toString() ?? '') ?? 18.5204;
          _longitude = double.tryParse(data['longitude']?.toString() ?? '') ?? 73.8567;
          _addressController.text = 'My Location Near ${data['org'] ?? 'Network Area'}';
          _mapsUrlController.text = 'https://www.google.com/maps/place/$_latitude,$_longitude';
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Detected location: ${_cityController.text}, ${_stateController.text}')),
        );
      } else {
        throw Exception('Location API error');
      }
    } catch (e) {
      _autofillLocationMock();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('GPS unavailable. Pune coordinates applied.')),
      );
    } finally {
      setState(() => _isDetectingLocation = false);
    }
  }

  void _onMapsUrlChanged(String url) async {
    final trimmedUrl = url.trim();
    if (trimmedUrl.isEmpty) return;

    // To prevent infinite recursive trigger or duplicate parallel calls
    if (_isParsingMapsUrl) return;

    // Check if it looks like a valid maps link
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return;
    }

    setState(() {
      _isParsingMapsUrl = true;
    });

    try {
      String resolvedUrl = trimmedUrl;

      // 1. Resolve redirect if shortened link (maps.app.goo.gl or goo.gl/maps)
      if (trimmedUrl.contains('maps.app.goo.gl') || trimmedUrl.contains('goo.gl/maps')) {
        try {
          final redirectResponse = await Dio().get(
            trimmedUrl,
            options: Options(
              followRedirects: true,
              maxRedirects: 5,
              validateStatus: (status) => status != null && status < 400,
            ),
          );
          resolvedUrl = redirectResponse.realUri.toString();
        } catch (e) {
          print("Redirect resolve error: $e");
        }
      }

      double? parsedLat;
      double? parsedLng;

      // Try parsing coordinates from resolved URL
      // Pattern 1: @lat,lng (most common in Google Maps)
      final atCoordsRegExp = RegExp(r'@(-?\d+\.\d+),(-?\d+\.\d+)');
      final atMatch = atCoordsRegExp.firstMatch(resolvedUrl);
      if (atMatch != null) {
        parsedLat = double.tryParse(atMatch.group(1) ?? '');
        parsedLng = double.tryParse(atMatch.group(2) ?? '');
      }

      // Pattern 2: place/lat,lng
      if (parsedLat == null || parsedLng == null) {
        final placeCoordsRegExp = RegExp(r'place/(-?\d+\.\d+),(-?\d+\.\d+)');
        final placeMatch = placeCoordsRegExp.firstMatch(resolvedUrl);
        if (placeMatch != null) {
          parsedLat = double.tryParse(placeMatch.group(1) ?? '');
          parsedLng = double.tryParse(placeMatch.group(2) ?? '');
        }
      }

      // Pattern 3: q=lat,lng
      if (parsedLat == null || parsedLng == null) {
        final qCoordsRegExp = RegExp(r'[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)');
        final qMatch = qCoordsRegExp.firstMatch(resolvedUrl);
        if (qMatch != null) {
          parsedLat = double.tryParse(qMatch.group(1) ?? '');
          parsedLng = double.tryParse(qMatch.group(2) ?? '');
        }
      }

      // 2. Perform reverse geocoding via OpenStreetMap Nominatim API to get full address fields
      if (parsedLat != null && parsedLng != null) {
        setState(() {
          _latitude = parsedLat!;
          _longitude = parsedLng!;
        });

        final geoResponse = await Dio().get(
          'https://nominatim.openstreetmap.org/reverse',
          queryParameters: {
            'format': 'json',
            'lat': parsedLat,
            'lon': parsedLng,
            'zoom': 18,
            'addressdetails': 1,
          },
          options: Options(
            headers: {
              'User-Agent': 'GoldenrichSTRMobileApp/1.0',
            },
            receiveTimeout: const Duration(seconds: 4000),
            sendTimeout: const Duration(seconds: 4000),
          ),
        );

        if (geoResponse.statusCode == 200 && geoResponse.data != null) {
          final data = geoResponse.data;
          final address = data['address'] as Map<String, dynamic>?;
          final displayName = data['display_name']?.toString() ?? '';

          if (address != null) {
            final street = address['road'] ?? address['suburb'] ?? address['neighbourhood'] ?? '';
            final building = address['building'] ?? address['house_number'] ?? '';
            final fullStreet = building.isNotEmpty && street.isNotEmpty
                ? '$building, $street'
                : (building.isNotEmpty ? building : street);

            final city = address['city'] ?? address['town'] ?? address['village'] ?? address['city_district'] ?? '';
            final state = address['state'] ?? address['state_district'] ?? '';
            final pincode = address['postcode'] ?? '';

            setState(() {
              if (fullStreet.isNotEmpty) {
                _addressController.text = fullStreet;
              } else {
                _addressController.text = displayName.split(',').take(2).join(',').trim();
              }
              if (city.isNotEmpty) _cityController.text = city;
              if (state.isNotEmpty) _stateController.text = state;
              if (pincode.isNotEmpty) _pincodeController.text = pincode;
            });

            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Auto-filled address: ${city.isNotEmpty ? city : "Success"}')),
              );
            }
            return;
          }
        }
      }

      // 3. Fallback: Parse details from the URL path if reverse geocoding fails or is slow
      final placeTextRegExp = RegExp(r'/place/([^/]+)');
      final placeTextMatch = placeTextRegExp.firstMatch(resolvedUrl);
      if (placeTextMatch != null) {
        final rawPlace = placeTextMatch.group(1) ?? '';
        final decodedPlace = Uri.decodeComponent(rawPlace.replaceAll('+', ' '));
        final parts = decodedPlace.split(',').map((e) => e.trim()).toList();

        if (parts.isNotEmpty) {
          String city = '';
          String state = '';
          String pincode = '';
          List<String> streetParts = [];

          for (var part in parts) {
            final pinMatch = RegExp(r'\b\d{6}\b').firstMatch(part);
            if (pinMatch != null) {
              pincode = pinMatch.group(0)!;
              final cleanedState = part.replaceAll(pincode, '').trim();
              if (cleanedState.isNotEmpty) {
                state = cleanedState;
              }
            } else if (part.toLowerCase().contains('pune') || part.toLowerCase().contains('mumbai') || part.toLowerCase().contains('delhi') || part.toLowerCase().contains('nashik') || part.toLowerCase().contains('bangalore')) {
              city = part;
            } else if (part.toLowerCase() == 'maharashtra' || part.toLowerCase() == 'goa' || part.toLowerCase() == 'karnataka') {
              state = part;
            } else {
              streetParts.add(part);
            }
          }

          setState(() {
            if (streetParts.isNotEmpty) _addressController.text = streetParts.join(', ');
            if (city.isNotEmpty) _cityController.text = city;
            if (state.isNotEmpty) _stateController.text = state;
            if (pincode.isNotEmpty) _pincodeController.text = pincode;
          });

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Auto-filled address details from Map link.')),
            );
          }
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not extract details from URL. Try using a detailed place link.')),
          );
        }
      }
    } catch (e) {
      print('Google Maps Link Parsing Error: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isParsingMapsUrl = false;
        });
      }
    }
  }

  void _openUploadSourceSelection() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Upload Photo', style: Theme.of(context).textTheme.displayMedium?.copyWith(fontSize: 18)),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.photo_library, color: AppTheme.primary),
              title: const Text('Choose from Gallery'),
              onTap: () async {
                Navigator.pop(context);
                final picked = await ImagePicker().pickImage(source: ImageSource.gallery);
                if (picked != null) {
                  _addImagePath(picked.path);
                }
              },
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt, color: AppTheme.primary),
              title: const Text('Take Photo with Camera'),
              onTap: () async {
                Navigator.pop(context);
                final picked = await ImagePicker().pickImage(source: ImageSource.camera);
                if (picked != null) {
                  _addImagePath(picked.path);
                }
              },
            ),
            ListTile(
              leading: const Icon(Icons.developer_mode, color: AppTheme.primary),
              title: const Text('Add Demo / Mock Property Photo'),
              onTap: () {
                Navigator.pop(context);
                _addImagePath('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=600&q=80');
              },
            ),
          ],
        ),
      ),
    );
  }

  void _addImagePath(String path) async {
    setState(() => _isUploadingPhoto = true);
    await Future.delayed(const Duration(milliseconds: 600));
    if (mounted) {
      setState(() {
        _uploadedImages.add('$path#Other');
        _isUploadingPhoto = false;
      });
    }
  }

  bool _validateCurrentStep() {
    if (_currentStep == 0) {
      if (_titleController.text.trim().length < 5) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Title must be at least 5 characters.')));
        return false;
      }
      if (_descController.text.trim().length < 15) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Description must be at least 15 characters.')));
        return false;
      }
      if (_areaController.text.isEmpty || double.tryParse(_areaController.text) == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid area size.')));
        return false;
      }
    }
    if (_currentStep == 1) {
      if (_addressController.text.isEmpty || _cityController.text.isEmpty || _stateController.text.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill out Address, City and State.')));
        return false;
      }
      if (_pincodeController.text.length != 6 || int.tryParse(_pincodeController.text) == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pincode must be exactly 6 digits.')));
        return false;
      }
    }
    if (_currentStep == 2) {
      if (_priceController.text.isEmpty || double.tryParse(_priceController.text) == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid price.')));
        return false;
      }
      if (_hasCook && (_cookPriceController.text.isEmpty || double.tryParse(_cookPriceController.text) == null || double.parse(_cookPriceController.text) <= 0)) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid cook price.')));
        return false;
      }
    }
    if (_currentStep == 3) {
      if (_selectedAmenities.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select at least one amenity.')));
        return false;
      }
    }
    if (_currentStep == 4) {
      if (_uploadedImages.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please upload at least one photo of your property.')));
        return false;
      }
    }
    return true;
  }

  void _nextStep() {
    if (_validateCurrentStep()) {
      setState(() {
        _currentStep++;
      });
    }
  }

  void _prevStep() {
    if (_currentStep > 0) {
      setState(() {
        _currentStep--;
      });
    }
  }

  void _savePropertyAsDraft() async {
    setState(() => _isSubmitting = true);

    if (_category == 'event_venue') {
      _venuePolicies['taxes'] = _taxesController.text.trim();
      _venuePolicies['advance'] = _advanceController.text.trim();
      _venuePolicies['rooms_count'] = _roomsCountController.text.trim();
      _venuePolicies['room_price'] = _roomPriceController.text.trim();
      _venuePolicies['parking_space'] = _parkingSpaceController.text.trim();
    }

    final payload = {
      'title': _titleController.text.trim().isNotEmpty ? _titleController.text.trim() : 'Untitled Draft',
      'description': _descController.text.trim(),
      'property_type': _propertyType,
      'category': _category,
      'bhk_type': _bhkType,
      'address': _addressController.text.trim(),
      'city': _cityController.text.trim(),
      'state': _stateController.text.trim(),
      'pin_code': _pincodeController.text.trim(),
      'latitude': _latitude,
      'longitude': _longitude,
      'google_maps_url': _mapsUrlController.text.trim().isNotEmpty ? _mapsUrlController.text.trim() : null,
      'area_sqft': double.tryParse(_areaController.text) ?? 0.0,
      'guest_size': int.tryParse(_minGuestsController.text) ?? 1,
      'max_guests': int.tryParse(_maxGuestsController.text) ?? 6,
      'price_per_night': double.tryParse(_priceController.text) ?? 0.0,
      'pricing_cycle': _pricingCycle,
      'minimum_stay_days': int.tryParse(_minStayController.text) ?? 1,
      'amenities': _selectedAmenities,
      'images': _uploadedImages,
      'video_url': _videoUrl,
      'youtube_short_url': _youtubeShortController.text.trim().isNotEmpty ? _youtubeShortController.text.trim() : null,
      'youtube_long_url': _youtubeLongController.text.trim().isNotEmpty ? _youtubeLongController.text.trim() : null,
      'house_rules': _category == 'event_venue'
          ? jsonEncode(_venuePolicies)
          : (_rulesControllers
                  .map((c) => c.text.trim())
                  .where((t) => t.isNotEmpty)
                  .join('\n')
                  .isNotEmpty
              ? _rulesControllers
                  .map((c) => c.text.trim())
                  .where((t) => t.isNotEmpty)
                  .join('\n')
              : (_category == 'commercial' ? 'Please follow the office decorum.' : 'Please keep the space clean.')),
      'pet_friendly': _petFriendly,
      'smoking_allowed': _smokingAllowed,
      'instant_booking': _instantBooking,
      'has_cook': _hasCook,
      'cook_price': _hasCook && _cookPriceController.text.isNotEmpty ? double.tryParse(_cookPriceController.text) : null,
      'has_self_cook': _hasSelfCook,
      'veg_price': _category == 'event_venue' ? double.tryParse(_vegPriceController.text) : null,
      'non_veg_price': _category == 'event_venue' ? double.tryParse(_nonVegPriceController.text) : null,
      'packages': _category == 'event_venue' ? [
        {
          'type': 'veg',
          'items': Map.fromEntries(_vegPackageItems.map((item) => MapEntry(item.name, item.count.toString()))),
        },
        {
          'type': 'non_veg',
          'items': Map.fromEntries(_nonVegPackageItems.map((item) => MapEntry(item.name, item.count.toString()))),
        }
      ] : null,
    };

    String? createdPropertyId;
    if (_createdPropertyId != null) {
      final success = await Provider.of<PropertyProvider>(context, listen: false)
          .updateProperty(_createdPropertyId!, payload);
      if (success) {
        createdPropertyId = _createdPropertyId;
      }
    } else {
      createdPropertyId = await Provider.of<PropertyProvider>(context, listen: false)
          .createProperty(payload);
      if (createdPropertyId != null) {
        _createdPropertyId = createdPropertyId;
      }
    }

    setState(() => _isSubmitting = false);

    if (mounted) {
      if (createdPropertyId != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Listing saved as draft successfully!')),
        );
        Navigator.pop(context, true); // Return to dashboard
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to save draft. Please try again.')),
        );
      }
    }
  }

  void _submitPropertyListing() async {
    setState(() => _isSubmitting = true);

    if (_category == 'event_venue') {
      _venuePolicies['taxes'] = _taxesController.text.trim();
      _venuePolicies['advance'] = _advanceController.text.trim();
      _venuePolicies['rooms_count'] = _roomsCountController.text.trim();
      _venuePolicies['room_price'] = _roomPriceController.text.trim();
      _venuePolicies['parking_space'] = _parkingSpaceController.text.trim();
    }

    final payload = {
      'title': _titleController.text.trim(),
      'description': _descController.text.trim(),
      'property_type': _propertyType,
      'category': _category,
      'bhk_type': _bhkType,
      'address': _addressController.text.trim(),
      'city': _cityController.text.trim(),
      'state': _stateController.text.trim(),
      'pin_code': _pincodeController.text.trim(),
      'latitude': _latitude,
      'longitude': _longitude,
      'google_maps_url': _mapsUrlController.text.trim().isNotEmpty ? _mapsUrlController.text.trim() : null,
      'area_sqft': double.parse(_areaController.text),
      'guest_size': int.tryParse(_minGuestsController.text) ?? 1,
      'max_guests': int.parse(_maxGuestsController.text),
      'price_per_night': double.parse(_priceController.text),
      'pricing_cycle': _pricingCycle,
      'minimum_stay_days': int.tryParse(_minStayController.text) ?? 1,
      'amenities': _selectedAmenities,
      'images': _uploadedImages,
      'video_url': _videoUrl,
      'youtube_short_url': _youtubeShortController.text.trim().isNotEmpty ? _youtubeShortController.text.trim() : null,
      'youtube_long_url': _youtubeLongController.text.trim().isNotEmpty ? _youtubeLongController.text.trim() : null,
      'house_rules': _category == 'event_venue'
          ? jsonEncode(_venuePolicies)
          : (_rulesControllers
                  .map((c) => c.text.trim())
                  .where((t) => t.isNotEmpty)
                  .join('\n')
                  .isNotEmpty
              ? _rulesControllers
                  .map((c) => c.text.trim())
                  .where((t) => t.isNotEmpty)
                  .join('\n')
              : (_category == 'commercial' ? 'Please follow the office decorum.' : 'Please keep the space clean.')),
      'pet_friendly': _petFriendly,
      'smoking_allowed': _smokingAllowed,
      'instant_booking': _instantBooking,
      'has_cook': _hasCook,
      'cook_price': _hasCook && _cookPriceController.text.isNotEmpty ? double.tryParse(_cookPriceController.text) : null,
      'has_self_cook': _hasSelfCook,
      'veg_price': _category == 'event_venue' ? double.tryParse(_vegPriceController.text) : null,
      'non_veg_price': _category == 'event_venue' ? double.tryParse(_nonVegPriceController.text) : null,
      'packages': _category == 'event_venue' ? [
        {
          'type': 'veg',
          'items': Map.fromEntries(_vegPackageItems.map((item) => MapEntry(item.name, item.count.toString()))),
        },
        {
          'type': 'non_veg',
          'items': Map.fromEntries(_nonVegPackageItems.map((item) => MapEntry(item.name, item.count.toString()))),
        }
      ] : null,
    };

    String? createdPropertyId;
    if (_createdPropertyId != null) {
      final success = await Provider.of<PropertyProvider>(context, listen: false)
          .updateProperty(_createdPropertyId!, payload);
      if (success) {
        createdPropertyId = _createdPropertyId;
      }
    } else {
      createdPropertyId = await Provider.of<PropertyProvider>(context, listen: false)
          .createProperty(payload);
      if (createdPropertyId != null) {
        _createdPropertyId = createdPropertyId;
      }
    }

    if (mounted) {
      if (createdPropertyId == null) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Submission failed. Please try again.')),
        );
        return;
      }
      
      try {
        final propProvider = Provider.of<PropertyProvider>(context, listen: false);
        
        // Check if property is already subscribed to avoid double charge/double subscription
        bool isAlreadySubscribed = false;
        if (widget.property != null) {
          if (widget.property!.subscriptionId != null && widget.property!.subscriptionId!.isNotEmpty) {
            isAlreadySubscribed = true;
          } else if (widget.property!.subscriptionStatus == 'active') {
            isAlreadySubscribed = true;
          }
        }

        if (isAlreadySubscribed) {
          final verificationSuccess = await propProvider.submitForVerification(createdPropertyId);
          setState(() => _isSubmitting = false);
          
          if (verificationSuccess) {
            if (mounted) {
              _showFinalSuccessDialog(alreadySubscribed: true);
            }
          } else {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Listing updated, but verification submission failed.')),
              );
            }
          }
          return;
        }

        final plans = await propProvider.getSubscriptionPlans();
        
        // Filter based on BHK / Sizing type
        const bhkPlanMap = { 
          'studio': 'studio', 
          '1bhk': '1bhk', 
          '2bhk': '2bhk', 
          '3bhk': '3bhk', 
          '4bhk': '4bhk_plus',
          '5bhk': '4bhk_plus',
          'small': 'commercial',
          'medium': 'commercial',
          'large': 'commercial',
          'extra_large': 'commercial',
          'custom': 'commercial',
          'small_event': 'banquet',
          'medium_event': 'banquet',
          'large_event': 'banquet',
          'mega_event': 'banquet'
        };
        
        final targetPlanType = bhkPlanMap[_bhkType.toLowerCase()] ?? '1bhk';
        List<dynamic> matchingPlans = plans.where((p) => p['plan_type'] == targetPlanType).toList();
        if (matchingPlans.isEmpty) {
          matchingPlans = plans; // Fallback to all active plans
        }
        
        setState(() => _isSubmitting = false);
        
        if (mounted) {
          _showSubscriptionPlanSelector(createdPropertyId, matchingPlans);
        }
      } catch (e) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading subscription plans: $e')),
        );
      }
    }
  }

  void _showSubscriptionPlanSelector(String propertyId, List<dynamic> plans) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (BuildContext context) {
        List<dynamic> coupons = [];
        bool isLoadingCoupons = true;
        String? appliedCouponCode;
        double discountAmount = 0.0;
        String couponError = '';
        final couponController = TextEditingController();

        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setModalState) {
            final textTheme = Theme.of(context).textTheme;
            final propProvider = Provider.of<PropertyProvider>(context, listen: false);

            if (isLoadingCoupons) {
              propProvider.getSubscriptionCoupons().then((list) {
                setModalState(() {
                  coupons = list;
                  isLoadingCoupons = false;
                });
              });
            }

            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(24),
                  topRight: Radius.circular(24),
                ),
              ),
              padding: EdgeInsets.only(
                top: 24,
                left: 24,
                right: 24,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.grey[300],
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Select Subscription Plan',
                      textAlign: TextAlign.center,
                      style: textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppTheme.charcoal,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Filtered matching plan for your BHK Configuration: ${_bhkType.toUpperCase()}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppTheme.charcoalLight,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 20),
                    ConstrainedBox(
                      constraints: const BoxConstraints(maxHeight: 520),
                      child: ListView.separated(
                        shrinkWrap: true,
                        itemCount: plans.length,
                        separatorBuilder: (context, index) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final plan = plans[index];
                          final planId = plan['plan_id'] ?? '';
                          final name = plan['plan_name'] ?? 'STR Plan';
                          final desc = plan['description'] ?? 'Plan details';
                          final monthlyPrice = (plan['price_monthly'] as num?)?.toDouble() ?? 0.0;
                          final annualPrice = (plan['price_annual'] as num?)?.toDouble() ?? 0.0;

                          final activePrice = monthlyPrice;
                          final discountedPrice = appliedCouponCode != null 
                              ? (activePrice - discountAmount).clamp(0.0, activePrice) 
                              : activePrice;

                          return Container(
                            decoration: BoxDecoration(
                              border: Border.all(color: AppTheme.primary.withOpacity(0.5), width: 1.5),
                              borderRadius: BorderRadius.circular(16),
                              color: AppTheme.primary.withOpacity(0.04),
                            ),
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      name,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                        color: AppTheme.charcoal,
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: AppTheme.primary,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: const Text(
                                        'RECOMMENDED',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  desc,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: AppTheme.charcoalLight,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        if (appliedCouponCode != null) ...[
                                          Text(
                                            '₹$monthlyPrice',
                                            style: const TextStyle(
                                              fontSize: 14,
                                              color: Colors.grey,
                                              decoration: TextDecoration.lineThrough,
                                            ),
                                          ),
                                          Text(
                                            '₹$discountedPrice',
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 20,
                                              color: Colors.green,
                                            ),
                                          ),
                                        ] else ...[
                                          Text(
                                            '₹$monthlyPrice',
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 20,
                                              color: AppTheme.primary,
                                            ),
                                          ),
                                        ],
                                        const Text(
                                          'Monthly Billing',
                                          style: TextStyle(fontSize: 11, color: AppTheme.charcoalLight),
                                        ),
                                      ],
                                    ),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text(
                                          '₹$annualPrice',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 20,
                                            color: AppTheme.charcoal,
                                          ),
                                        ),
                                        const Text(
                                          'Annual Billing',
                                          style: TextStyle(fontSize: 11, color: AppTheme.charcoalLight),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                // Coupon Section
                                Row(
                                  children: [
                                    Expanded(
                                      child: TextField(
                                        controller: couponController,
                                        decoration: InputDecoration(
                                          hintText: 'Enter Coupon Code',
                                          labelText: 'Promo / Coupon Code',
                                          isDense: true,
                                          errorText: couponError.isNotEmpty ? couponError : null,
                                          border: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(10),
                                          ),
                                        ),
                                        style: const TextStyle(fontSize: 13),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    ElevatedButton(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppTheme.charcoal,
                                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                      ),
                                      onPressed: () async {
                                        final enteredCode = couponController.text.trim();
                                        if (enteredCode.isEmpty) return;
                                        
                                        setModalState(() {
                                          couponError = '';
                                        });
                                        
                                        final validation = await propProvider.validateSubscriptionCoupon(enteredCode, planId);
                                        if (validation != null && validation['valid'] == true) {
                                          setModalState(() {
                                            appliedCouponCode = enteredCode;
                                            discountAmount = (validation['discount_amount'] as num).toDouble();
                                            couponError = '';
                                          });
                                        } else {
                                          setModalState(() {
                                            appliedCouponCode = null;
                                            discountAmount = 0.0;
                                            couponError = 'Invalid coupon';
                                          });
                                        }
                                      },
                                      child: const Text('Apply', style: TextStyle(color: Colors.white, fontSize: 13)),
                                    ),
                                  ],
                                ),
                                if (appliedCouponCode != null) ...[
                                  const SizedBox(height: 8),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text('Coupon "$appliedCouponCode" Applied', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 12)),
                                      Text('-₹$discountAmount', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 13)),
                                    ],
                                  ),
                                ],
                                if (isLoadingCoupons) ...[
                                  const SizedBox(height: 8),
                                  const Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary))),
                                ] else if (coupons.isNotEmpty) ...[
                                  const SizedBox(height: 12),
                                  const Text('Available Coupons:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.charcoal)),
                                  const SizedBox(height: 6),
                                  SizedBox(
                                    height: 38,
                                    child: ListView.separated(
                                      scrollDirection: Axis.horizontal,
                                      itemCount: coupons.length,
                                      separatorBuilder: (context, idx) => const SizedBox(width: 8),
                                      itemBuilder: (context, idx) {
                                        final coupon = coupons[idx];
                                        final code = coupon['code'] ?? '';
                                        final value = coupon['discount_value'] ?? 0.0;
                                        final type = coupon['discount_type'] ?? 'fixed';
                                        final label = type == 'percentage' ? '$value% Off' : '₹$value Off';
                                        
                                        return ActionChip(
                                          label: Text('$code ($label)', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primary)),
                                          backgroundColor: AppTheme.primary.withOpacity(0.08),
                                          side: const BorderSide(color: AppTheme.primary, width: 0.5),
                                          onPressed: () async {
                                            couponController.text = code;
                                            final validation = await propProvider.validateSubscriptionCoupon(code, planId);
                                            if (validation != null && validation['valid'] == true) {
                                              setModalState(() {
                                                appliedCouponCode = code;
                                                discountAmount = (validation['discount_amount'] as num).toDouble();
                                                couponError = '';
                                              });
                                            } else {
                                              setModalState(() {
                                                appliedCouponCode = null;
                                                discountAmount = 0.0;
                                                couponError = 'Invalid coupon';
                                              });
                                            }
                                          },
                                        );
                                      },
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 16),
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppTheme.primary,
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                  ),
                                  onPressed: () {
                                    Navigator.pop(context);
                                    _processSubscriptionAndMockPay(
                                      propertyId, 
                                      planId, 
                                      name, 
                                      monthlyPrice,
                                      couponCode: appliedCouponCode,
                                    );
                                  },
                                  child: const Center(
                                    child: Text(
                                      'Subscribe & Pay',
                                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 10),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _processSubscriptionAndMockPay(
      String propertyId, String planId, String planName, double amount, {String? couponCode}) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(color: AppTheme.primary),
      ),
    );

    try {
      final propProvider = Provider.of<PropertyProvider>(context, listen: false);
      final subResult = await propProvider.subscribeToPlan(planId, propertyId, couponCode: couponCode);
      
      if (mounted) Navigator.pop(context); // Close loader

      if (subResult == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to initiate subscription. Please try again.')),
          );
        }
        return;
      }

      final subscriptionId = subResult['subscription_id'] ?? '';
      final razorpayOrderId = subResult['razorpay_order_id'] ?? '';
      final finalAmount = (subResult['amount'] ?? (amount * 100)) / 100.0;

      if (mounted) {
        _showMockPaymentGateway(
          propertyId: propertyId,
          subscriptionId: subscriptionId,
          razorpayOrderId: razorpayOrderId,
          planName: planName,
          amount: finalAmount,
        );
      }
    } catch (e) {
      if (mounted) Navigator.pop(context);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error initiating subscription: $e')),
        );
      }
    }
  }

  void _showMockPaymentGateway({
    required String propertyId,
    required String subscriptionId,
    required String razorpayOrderId,
    required String planName,
    required double amount,
  }) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.account_balance_wallet_outlined,
                        color: AppTheme.primary,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Text(
                      'STR Secure Pay',
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                        color: AppTheme.charcoal,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                const Divider(height: 1),
                const SizedBox(height: 16),
                const Text(
                  'MOCK PAYMENT GATEWAY',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                    color: Colors.red,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Subscription: $planName',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: AppTheme.charcoal,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Amount: ₹$amount',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 22,
                    color: AppTheme.primary,
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Order ID: $razorpayOrderId',
                        style: TextStyle(fontSize: 10, color: Colors.grey[600], fontFamily: 'monospace'),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Sub ID: $subscriptionId',
                        style: TextStyle(fontSize: 10, color: Colors.grey[600], fontFamily: 'monospace'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    Navigator.pop(context);
                    _confirmSubscriptionPayment(
                      propertyId: propertyId,
                      subscriptionId: subscriptionId,
                      razorpayOrderId: razorpayOrderId,
                    );
                  },
                  child: const Text(
                    'PAY SUCCESSFUL',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Payment cancelled by user.')),
                    );
                  },
                  child: const Text(
                    'Cancel Payment',
                    style: TextStyle(color: AppTheme.charcoalLight, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _confirmSubscriptionPayment({
    required String propertyId,
    required String subscriptionId,
    required String razorpayOrderId,
  }) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(color: AppTheme.primary),
      ),
    );

    try {
      final propProvider = Provider.of<PropertyProvider>(context, listen: false);
      final paymentSuccess = await propProvider.mockPaySubscription(subscriptionId, razorpayOrderId);
      
      if (!paymentSuccess) {
        if (mounted) Navigator.pop(context); // Close loader
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Payment verification failed on server.')),
          );
        }
        return;
      }

      final verificationSuccess = await propProvider.submitForVerification(propertyId);

      if (mounted) Navigator.pop(context); // Close loader

      if (verificationSuccess) {
        if (mounted) {
          _showFinalSuccessDialog();
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Property payment verified, but verification submission failed.')),
          );
        }
      }
    } catch (e) {
      if (mounted) Navigator.pop(context);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error completing subscription: $e')),
        );
      }
    }
  }

  void _showFinalSuccessDialog({bool alreadySubscribed = false}) {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final hostEmail = authProvider.currentUser?.email ?? 'your registered email';
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_circle_outline,
                    color: Colors.green,
                    size: 48,
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  alreadySubscribed ? 'Listing Updated!' : 'Listing Submitted!',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 20,
                    color: AppTheme.charcoal,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  alreadySubscribed 
                      ? 'Your property details have been updated successfully and submitted for verification.'
                      : 'Property payment successful and listing submitted for verification. An invoice has been emailed to:',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey[600],
                  ),
                ),
                if (!alreadySubscribed) ...[
                  const SizedBox(height: 6),
                  Text(
                    hostEmail,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primary,
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                Text(
                  alreadySubscribed 
                      ? 'In-App notification has been sent.'
                      : 'Confirmation SMS and In-App notification have been sent.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    fontStyle: FontStyle.italic,
                    color: Colors.grey[500],
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    Navigator.pop(context); // Dialog
                    Navigator.pop(context); // Wizard Screen
                  },
                  child: const Text(
                    'Go to Dashboard',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildFieldLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0, top: 12.0),
      child: Text(
        label.toUpperCase(),
        style: const TextStyle(
          fontWeight: FontWeight.w800,
          color: AppTheme.charcoalLight,
          fontSize: 11,
          letterSpacing: 1.0,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('List Your Property', style: TextStyle(color: AppTheme.charcoal, fontWeight: FontWeight.bold)),
        backgroundColor: AppTheme.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.charcoal),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        children: [
          // Step progress indicator bar
          _buildProgressStepper(),
          
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Form(
                key: _formKey,
                child: _buildActiveStepView(textTheme),
              ),
            ),
          ),
          
          // Navigation control buttons
          _buildNavigationControls(),
        ],
      ),
    );
  }

  Widget _buildProgressStepper() {
    return Container(
      color: AppTheme.white,
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(_stepHeaders.length, (index) {
              final stepInfo = _stepHeaders[index];
              final isActive = index == _currentStep;
              final isDone = index < _currentStep;
              
              return Expanded(
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 15,
                      backgroundColor: isDone 
                          ? Colors.green 
                          : isActive ? AppTheme.primary : AppTheme.stone,
                      child: isDone
                          ? const Icon(Icons.check, size: 14, color: Colors.white)
                          : Text(
                              '${index + 1}',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: isActive ? Colors.white : AppTheme.charcoalMuted,
                              ),
                            ),
                    ),
                    if (index < _stepHeaders.length - 1)
                      Expanded(
                        child: Container(
                          height: 2,
                          color: index < _currentStep ? Colors.green : AppTheme.stone,
                        ),
                      ),
                  ],
                ),
              );
            }),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Step ${_currentStep + 1} of ${_stepHeaders.length}: ${_stepHeaders[_currentStep]['title']}',
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppTheme.charcoal),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActiveStepView(TextTheme textTheme) {
    switch (_currentStep) {
      case 0:
        return _buildStepBasics(textTheme);
      case 1:
        return _buildStepLocation(textTheme);
      case 2:
        return _buildStepPricing(textTheme);
      case 3:
        return _buildStepAmenities(textTheme);
      case 4:
        return _buildStepPhotos(textTheme);
      case 5:
        return _buildStepReview(textTheme);
      default:
        return Container();
    }
  }

  Widget _buildStepBasics(TextTheme textTheme) {
    final types = _propertyTypesByCategory[_category] ?? [];
    final bhks = _bhkTypesByCategory[_category] ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Tell us about your place', style: textTheme.displayMedium?.copyWith(fontSize: 20)),
        const SizedBox(height: 4),
        const Text('Enter the basics and general parameters of your property.', style: TextStyle(fontSize: 13, color: AppTheme.charcoalLight)),
        const SizedBox(height: 20),

        _buildFieldLabel('Title'),
        TextFormField(
          controller: _titleController,
          decoration: const InputDecoration(
            hintText: 'e.g., Cozy 2BHK with a sunset view',
          ),
        ),
        const SizedBox(height: 8),

        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildFieldLabel('Description'),
            _isGeneratingAI
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary))
                : TextButton.icon(
                    style: TextButton.styleFrom(
                      foregroundColor: AppTheme.primary,
                      padding: EdgeInsets.zero,
                      minimumSize: const Size(50, 30),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    icon: const Icon(Icons.auto_awesome, size: 12),
                    label: const Text('GENERATE WITH AI', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800)),
                    onPressed: _generateAIDescription,
                  ),
          ],
        ),
        TextFormField(
          controller: _descController,
          maxLines: 4,
          decoration: const InputDecoration(
            hintText: 'Describe your space, neighbourhood, and what makes it special...',
          ),
        ),
        const SizedBox(height: 8),

        _buildFieldLabel('Category'),
        DropdownButtonFormField<String>(
          value: _category,
          isExpanded: true,
          decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12)),
          items: const [
            DropdownMenuItem(value: 'residential', child: Text('Residential')),
            DropdownMenuItem(value: 'commercial', child: Text('Commercial')),
            DropdownMenuItem(value: 'event_venue', child: Text('Event Venue')),
          ],
          onChanged: (val) {
            if (val != null) {
              setState(() {
                _category = val;
                _propertyType = _propertyTypesByCategory[_category]!.first['value']!;
                _bhkType = _bhkTypesByCategory[_category]!.first['value']!;
              });
            }
          },
        ),
        const SizedBox(height: 8),

        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildFieldLabel('Property Type'),
                  DropdownButtonFormField<String>(
                    value: _propertyType,
                    isExpanded: true,
                    decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12)),
                    items: types.map((t) => DropdownMenuItem(value: t['value'], child: Text(t['label']!))).toList(),
                    onChanged: (val) => setState(() => _propertyType = val!),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildFieldLabel('BHK / Size'),
                  DropdownButtonFormField<String>(
                    value: _bhkType,
                    isExpanded: true,
                    decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12)),
                    items: bhks.map((t) => DropdownMenuItem(value: t['value'], child: Text(t['label']!))).toList(),
                    onChanged: (val) => setState(() => _bhkType = val!),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),

        _buildFieldLabel('Area (sqft)'),
        TextFormField(
          controller: _areaController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            hintText: 'e.g., 950',
          ),
        ),
        const SizedBox(height: 8),

        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildFieldLabel('Min Guests'),
                  TextFormField(
                    controller: _minGuestsController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      hintText: 'e.g., 1',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildFieldLabel('Max Guests'),
                  TextFormField(
                    controller: _maxGuestsController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      hintText: 'e.g., 6',
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStepLocation(TextTheme textTheme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Where is your place?', style: textTheme.displayMedium?.copyWith(fontSize: 20)),
            TextButton.icon(
              style: TextButton.styleFrom(
                foregroundColor: AppTheme.primary,
                padding: EdgeInsets.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              icon: const Icon(Icons.location_searching, size: 12),
              label: const Text('AUTOFILL DEMO', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
              onPressed: _autofillLocationMock,
            ),
          ],
        ),
        const SizedBox(height: 4),
        const Text('Enter location coordinates or address info to assist guests.', style: TextStyle(fontSize: 13, color: AppTheme.charcoalLight)),
        const SizedBox(height: 16),

        GestureDetector(
          onTap: _isDetectingLocation ? null : _detectCurrentLocation,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppTheme.stone,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppTheme.primary.withOpacity(0.3), width: 1),
            ),
            child: Row(
              children: [
                _isDetectingLocation
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
                      )
                    : const Icon(Icons.my_location, color: AppTheme.primary, size: 18),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Detect Current Location',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.charcoal),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _isDetectingLocation ? 'Fetching GPS coordinates...' : 'Auto-fill using your network/GPS location',
                        style: const TextStyle(fontSize: 11, color: AppTheme.charcoalMuted),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: AppTheme.charcoalMuted, size: 20),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        _buildFieldLabel('Street Address'),
        TextFormField(
          controller: _addressController,
          decoration: const InputDecoration(
            hintText: 'Flat/House No, Building, Road details',
          ),
        ),
        const SizedBox(height: 8),

        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildFieldLabel('City'),
                  TextFormField(
                    controller: _cityController,
                    decoration: const InputDecoration(
                      hintText: 'e.g., Pune',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildFieldLabel('State'),
                  TextFormField(
                    controller: _stateController,
                    decoration: const InputDecoration(
                      hintText: 'e.g., Maharashtra',
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),

        _buildFieldLabel('Pincode'),
        TextFormField(
          controller: _pincodeController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            hintText: '6 digit postal code',
          ),
        ),
        const SizedBox(height: 8),

        _buildFieldLabel('Google Maps Link (Optional)'),
        TextFormField(
          controller: _mapsUrlController,
          onChanged: _onMapsUrlChanged,
          decoration: InputDecoration(
            hintText: 'Paste shared maps.google.com URL',
            suffixIcon: _isParsingMapsUrl
                ? const Padding(
                    padding: EdgeInsets.all(12.0),
                    child: SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
                    ),
                  )
                : IconButton(
                    icon: const Icon(Icons.flash_on, color: AppTheme.primary, size: 20),
                    onPressed: () => _onMapsUrlChanged(_mapsUrlController.text),
                    tooltip: 'Auto-fill from URL',
                  ),
          ),
        ),
        const SizedBox(height: 16),
        
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: AppTheme.stone,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              const Icon(Icons.pin_drop, color: AppTheme.primary, size: 18),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Geo Coordinates: ${_latitude.toStringAsFixed(4)}, ${_longitude.toStringAsFixed(4)}',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.charcoalLight),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStepPricing(TextTheme textTheme) {
    List<DropdownMenuItem<String>> pricingCycleItems = [];
    if (_category == 'residential') {
      pricingCycleItems = const [
        DropdownMenuItem(value: 'day', child: Text('Per Day/Night')),
      ];
    } else if (_category == 'commercial') {
      pricingCycleItems = const [
        DropdownMenuItem(value: 'day', child: Text('Per Day')),
        DropdownMenuItem(value: 'hourly', child: Text('Hourly')),
      ];
    } else { // event_venue
      pricingCycleItems = const [
        DropdownMenuItem(value: 'day', child: Text('Per Day')),
      ];
    }

    // Ensure the current pricing cycle selection is valid for this category
    if (_category == 'residential' && _pricingCycle != 'day') {
      _pricingCycle = 'day';
    } else if (_category == 'event_venue' && _pricingCycle != 'day') {
      _pricingCycle = 'day';
    } else if (_category == 'commercial' && _pricingCycle != 'day' && _pricingCycle != 'hourly') {
      _pricingCycle = 'day';
    }

    final isEventVenue = _category == 'event_venue';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Pricing & Reservation Rules', style: textTheme.displayMedium?.copyWith(fontSize: 20)),
        const SizedBox(height: 4),
        const Text('Configure nightly rate, minimum duration, and booking policies.', style: TextStyle(fontSize: 13, color: AppTheme.charcoalLight)),
        const SizedBox(height: 20),

        if (isEventVenue) ...[
          // Veg & Non-Veg plate prices side-by-side
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildFieldLabel('Veg Price (Per Plate ₹)'),
                    TextFormField(
                      controller: _vegPriceController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        prefixText: '₹ ',
                        hintText: 'e.g., 1200',
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildFieldLabel('Non-Veg Price (Per Plate ₹)'),
                    TextFormField(
                      controller: _nonVegPriceController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        prefixText: '₹ ',
                        hintText: 'e.g., 1500',
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Venue Price per day & Cycle side-by-side
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildFieldLabel('Venue Price Per Day (₹)'),
                    TextFormField(
                      controller: _priceController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        prefixText: '₹ ',
                        hintText: 'e.g., 15000',
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildFieldLabel('Pricing Cycle'),
                    DropdownButtonFormField<String>(
                      value: _pricingCycle,
                      isExpanded: true,
                      decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12)),
                      items: pricingCycleItems,
                      onChanged: null, // Disabled, always Per Day
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Package details header
          _buildFieldLabel('Package Details (Veg & Non-Veg Inclusions)'),
          const SizedBox(height: 10),

          // Veg package customizer
          _buildPackageCustomizer(
            'veg',
            _vegPackageItems,
            Colors.green.shade50,
            Colors.green.shade900,
            AppTheme.white,
          ),

          // Non-Veg package customizer
          _buildPackageCustomizer(
            'non_veg',
            _nonVegPackageItems,
            Colors.red.shade50,
            Colors.red.shade900,
            AppTheme.white,
          ),
        ] else ...[
          // Standard Price & Cycle input
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildFieldLabel('Price'),
                    TextFormField(
                      controller: _priceController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        prefixText: '₹ ',
                        hintText: 'e.g., 2500',
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildFieldLabel('Pricing Cycle'),
                    DropdownButtonFormField<String>(
                      value: _pricingCycle,
                      isExpanded: true,
                      decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12)),
                      items: pricingCycleItems,
                      onChanged: pricingCycleItems.length > 1
                          ? (val) => setState(() => _pricingCycle = val!)
                          : null,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
        if (!isEventVenue) ...[
          const SizedBox(height: 8),

          _buildFieldLabel('Minimum Stay (Duration)'),
          TextFormField(
            controller: _minStayController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              hintText: 'e.g., 1 (night/hour)',
            ),
          ),
          const SizedBox(height: 8),

          _buildFieldLabel(_category == 'commercial' ? 'Office Rules / Terms (Optional)' : 'House Rules / Terms (Optional)'),
          const SizedBox(height: 6),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _rulesControllers.length,
            itemBuilder: (context, idx) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12.0),
                child: Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _rulesControllers[idx],
                        decoration: InputDecoration(
                          hintText: _category == 'commercial'
                              ? 'e.g., Dress code, No external visitors...'
                              : 'e.g., No smoking, no pets...',
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          filled: true,
                          fillColor: AppTheme.stone,
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: const BorderSide(color: AppTheme.primary, width: 1.0),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: const BorderSide(color: AppTheme.primary, width: 1.5),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, color: AppTheme.primary, size: 24),
                      onPressed: () {
                        setState(() {
                          _rulesControllers[idx].dispose();
                          _rulesControllers.removeAt(idx);
                        });
                      },
                    ),
                  ],
                ),
              );
            },
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              icon: const Icon(Icons.add, size: 18, color: AppTheme.primary),
              label: Text(
                _category == 'commercial' ? 'Add Office Rule' : 'Add House Rule',
                style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold, fontSize: 13),
              ),
              style: TextButton.styleFrom(
                padding: EdgeInsets.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              onPressed: () {
                setState(() {
                  _rulesControllers.add(TextEditingController());
                });
              },
            ),
          ),
          const SizedBox(height: 16),

          _buildCustomSwitchRow(
            'Pet Friendly',
            _petFriendly,
            (val) => setState(() => _petFriendly = val),
          ),
          _buildCustomSwitchRow(
            'Smoking Allowed',
            _smokingAllowed,
            (val) => setState(() => _smokingAllowed = val),
          ),
          _buildCustomSwitchRow(
            'Instant Booking (Guests book immediately)',
            _instantBooking,
            (val) => setState(() => _instantBooking = val),
          ),
          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 12),
          const Text(
            'Cook Service',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
          ),
          const SizedBox(height: 8),
          _buildCustomSwitchRow(
            'Cook Service Available',
            _hasCook,
            (val) => setState(() {
              _hasCook = val;
              if (!val) _cookPriceController.clear();
            }),
          ),
          if (_hasCook) ...[
            const SizedBox(height: 8),
            _buildFieldLabel('Cook Price per day (₹)'),
            TextFormField(
              controller: _cookPriceController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                prefixText: '₹ ',
                hintText: 'e.g., 500',
              ),
            ),
          ],
          const SizedBox(height: 8),
          _buildCustomSwitchRow(
            'Self Cooking Option Available',
            _hasSelfCook,
            (val) => setState(() {
              _hasSelfCook = val;
            }),
          ),
        ],
      ],
    );
  }

  Widget _buildPackageCustomizer(String type, List<PackageItem> items, Color headerColor, Color headerTextColor, Color bgColor) {
    final title = type == 'veg' ? 'Vegetarian' : 'Non Vegetarian';
    final dotColor = type == 'veg' ? Colors.green : Colors.red;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppTheme.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: headerColor,
              borderRadius: const BorderRadius.only(topLeft: Radius.circular(11), topRight: Radius.circular(11)),
              border: const Border(bottom: BorderSide(color: AppTheme.border)),
            ),
            child: Row(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: dotColor,
                    shape: type == 'veg' ? BoxShape.rectangle : BoxShape.circle,
                    borderRadius: type == 'veg' ? BorderRadius.circular(2) : null,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: TextStyle(fontWeight: FontWeight.bold, color: headerTextColor, fontSize: 14),
                ),
              ],
            ),
          ),

          // Items list
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: items.length,
            separatorBuilder: (context, index) => const Divider(height: 1, color: AppTheme.border),
            itemBuilder: (context, index) {
              final item = items[index];

              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: TextFormField(
                        initialValue: item.name,
                        style: const TextStyle(fontSize: 13, color: AppTheme.charcoal, fontWeight: FontWeight.w500),
                        decoration: const InputDecoration(
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.primary, width: 1.0)),
                          contentPadding: EdgeInsets.zero,
                          filled: false,
                        ),
                        onChanged: (val) {
                          item.name = val;
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.remove_circle_outline, size: 20, color: AppTheme.charcoalLight),
                          onPressed: item.count > 0
                              ? () => setState(() => item.count--)
                              : null,
                        ),
                        Container(
                          constraints: const BoxConstraints(minWidth: 24),
                          alignment: Alignment.center,
                          child: Text(
                            '${item.count}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.charcoal),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.add_circle_outline, size: 20, color: AppTheme.primary),
                          onPressed: () => setState(() => item.count++),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildCustomSwitchRow(String label, bool value, ValueChanged<bool> onChanged) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
            ),
          ),
          const SizedBox(width: 12),
          GestureDetector(
            onTap: () => onChanged(!value),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: 44,
              height: 24,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.black, width: 1.5),
                color: Colors.white,
              ),
              child: Stack(
                children: [
                  AnimatedPositioned(
                    duration: const Duration(milliseconds: 150),
                    curve: Curves.easeIn,
                    left: value ? 22.0 : 2.0,
                    top: 2.0,
                    child: Container(
                      width: 17,
                      height: 17,
                      decoration: const BoxDecoration(
                        color: Colors.black,
                        shape: BoxShape.circle,
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

  Widget _buildTimingRow({
    required String title,
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String startKey,
    required String endKey,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Icon(icon, size: 16, color: iconColor),
              ),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.charcoal),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: Row(
                  children: [
                    const Text('Start', style: TextStyle(fontSize: 12, color: AppTheme.charcoalLight)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildTimePickerField(startKey),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Row(
                  children: [
                    const Text('End', style: TextStyle(fontSize: 12, color: AppTheme.charcoalLight)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildTimePickerField(endKey),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTimePickerField(String key) {
    final timeStr = _venuePolicies[key] as String? ?? '';
    return InkWell(
      onTap: () async {
        TimeOfDay initial = const TimeOfDay(hour: 9, minute: 0);
        if (timeStr.isNotEmpty) {
          final parts = timeStr.split(':');
          if (parts.length == 2) {
            final hh = int.tryParse(parts[0]) ?? 9;
            final mmParts = parts[1].split(' ');
            final mm = int.tryParse(mmParts[0]) ?? 0;
            initial = TimeOfDay(hour: hh, minute: mm);
          }
        }
        final selected = await showTimePicker(
          context: context,
          initialTime: initial,
        );
        if (selected != null) {
          setState(() {
            _venuePolicies[key] = selected.format(context);
          });
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        decoration: BoxDecoration(
          border: Border.all(color: AppTheme.border),
          borderRadius: BorderRadius.circular(8),
          color: AppTheme.white,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              timeStr.isNotEmpty ? timeStr : '- : -',
              style: const TextStyle(fontSize: 12, color: AppTheme.charcoal, fontWeight: FontWeight.bold),
            ),
            const Icon(Icons.access_time, size: 14, color: AppTheme.charcoalLight),
          ],
        ),
      ),
    );
  }

  Widget _buildStepAmenities(TextTheme textTheme) {
    final isEvent = _category == 'event_venue';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Select Amenities', style: textTheme.displayMedium?.copyWith(fontSize: 20)),
        const SizedBox(height: 4),
        const Text('Mark what features are available at your listing.', style: TextStyle(fontSize: 13, color: AppTheme.charcoalLight)),
        const SizedBox(height: 20),

        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: _getAmenitiesForCategory(_category).map((amenity) {
            final value = amenity['value'] as String;
            final isSelected = _selectedAmenities.contains(value);
            return FilterChip(
              avatar: Icon(amenity['icon'] as IconData, size: 16, color: isSelected ? Colors.white : AppTheme.charcoalLight),
              label: Text(amenity['label'] as String),
              selected: isSelected,
              selectedColor: AppTheme.primary,
              checkmarkColor: Colors.white,
              backgroundColor: AppTheme.stone,
              side: BorderSide.none,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              labelStyle: TextStyle(
                color: isSelected ? Colors.white : AppTheme.charcoal,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                fontSize: 13,
              ),
              onSelected: (selected) {
                setState(() {
                  if (selected) {
                    _selectedAmenities.add(value);
                  } else {
                    _selectedAmenities.remove(value);
                  }
                });
              },
            );
          }).toList(),
        ),

        if (isEvent) ...[
          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 16),
          Text('Venue policies', style: textTheme.displayMedium?.copyWith(fontSize: 18)),
          const SizedBox(height: 16),

          // Morning / Afternoon / Evening Timings
          _buildTimingRow(
            title: 'Morning Timing',
            icon: Icons.wb_sunny_outlined,
            iconBg: Colors.amber.withOpacity(0.1),
            iconColor: Colors.amber,
            startKey: 'timings_morning_start',
            endKey: 'timings_morning_end',
          ),
          const SizedBox(height: 12),
          _buildTimingRow(
            title: 'Afternoon Timing',
            icon: Icons.wb_twilight,
            iconBg: Colors.orange.withOpacity(0.1),
            iconColor: Colors.orange,
            startKey: 'timings_afternoon_start',
            endKey: 'timings_afternoon_end',
          ),
          const SizedBox(height: 12),
          _buildTimingRow(
            title: 'Evening Timing',
            icon: Icons.nightlight_round,
            iconBg: Colors.indigo.withOpacity(0.1),
            iconColor: Colors.indigo,
            startKey: 'timings_evening_start',
            endKey: 'timings_evening_end',
          ),
          const SizedBox(height: 16),

          // Taxes & Advance
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('TAXES (%)', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppTheme.charcoalLight)),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: _taxesController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.border)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.border)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primary)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        hintText: '18.00',
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('ADVANCE BOOKING (%)', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppTheme.charcoalLight)),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: _advanceController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.border)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.border)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primary)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        hintText: '20',
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Lodging & Rooms
          const Text('Lodging & Rooms', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.charcoal)),
          const SizedBox(height: 10),
          _buildCustomSwitchRow(
            'Rooms Available',
            _venuePolicies['rooms_available'] as bool? ?? false,
            (v) => setState(() => _venuePolicies['rooms_available'] = v),
          ),
          if (_venuePolicies['rooms_available'] == true) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _roomsCountController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.border)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.border)),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primary)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      hintText: 'No. of rooms',
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _roomPriceController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.border)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.border)),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primary)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      hintText: 'Avg price per room (₹)',
                    ),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 20),

          // Food & Decor
          const Text('Food & Decor', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.charcoal)),
          const SizedBox(height: 10),
          _buildCustomSwitchRow('Food provided by venue', _venuePolicies['food_venue'] as bool? ?? false, (v) => setState(() => _venuePolicies['food_venue'] = v)),
          _buildCustomSwitchRow('No outside food allowed', _venuePolicies['food_outside'] as bool? ?? false, (v) => setState(() => _venuePolicies['food_outside'] = v)),
          _buildCustomSwitchRow('Non-Veg allowed', _venuePolicies['food_nonveg'] as bool? ?? false, (v) => setState(() => _venuePolicies['food_nonveg'] = v)),
          _buildCustomSwitchRow('Decor provided by venue', _venuePolicies['decor_venue'] as bool? ?? false, (v) => setState(() => _venuePolicies['decor_venue'] = v)),
          _buildCustomSwitchRow('Outside decorators allowed', _venuePolicies['decor_outside'] as bool? ?? false, (v) => setState(() => _venuePolicies['decor_outside'] = v)),
          const SizedBox(height: 20),

          // Alcohol & Parking
          const Text('Alcohol & Parking', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.charcoal)),
          const SizedBox(height: 10),
          _buildCustomSwitchRow('Alcohol allowed', _venuePolicies['alcohol_allowed'] as bool? ?? false, (v) => setState(() => _venuePolicies['alcohol_allowed'] = v)),
          _buildCustomSwitchRow('Outside alcohol allowed', _venuePolicies['alcohol_outside'] as bool? ?? false, (v) => setState(() => _venuePolicies['alcohol_outside'] = v)),
          _buildCustomSwitchRow('Valet parking provided', _venuePolicies['parking_valet'] as bool? ?? false, (v) => setState(() => _venuePolicies['parking_valet'] = v)),
          const SizedBox(height: 8),
          TextFormField(
            controller: _parkingSpaceController,
            decoration: InputDecoration(
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.border)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.border)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primary)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              hintText: 'Parking space (e.g. 200 vehicles)',
            ),
          ),
          const SizedBox(height: 20),

          // Other Policies
          const Text('Other Policies', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.charcoal)),
          const SizedBox(height: 10),
          _buildCustomSwitchRow('Changing Room A/C', _venuePolicies['changing_room_ac'] as bool? ?? false, (v) => setState(() => _venuePolicies['changing_room_ac'] = v)),
          _buildCustomSwitchRow('Music allowed late', _venuePolicies['other_music'] as bool? ?? false, (v) => setState(() => _venuePolicies['other_music'] = v)),
          _buildCustomSwitchRow('Halls are air conditioned', _venuePolicies['other_ac'] as bool? ?? false, (v) => setState(() => _venuePolicies['other_ac'] = v)),
          _buildCustomSwitchRow('Baarat allowed', _venuePolicies['other_baarat'] as bool? ?? false, (v) => setState(() => _venuePolicies['other_baarat'] = v)),
          _buildCustomSwitchRow('Fire crackers allowed', _venuePolicies['other_firecrackers'] as bool? ?? false, (v) => setState(() => _venuePolicies['other_firecrackers'] = v)),
          _buildCustomSwitchRow('Hawan allowed', _venuePolicies['other_hawan'] as bool? ?? false, (v) => setState(() => _venuePolicies['other_hawan'] = v)),
          _buildCustomSwitchRow('Overnight wedding allowed', _venuePolicies['other_overnight'] as bool? ?? false, (v) => setState(() => _venuePolicies['other_overnight'] = v)),
        ],
      ],
    );
  }

  void _showPasteUrlDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Paste Photo URL', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.charcoal)),
          content: TextField(
            controller: controller,
            decoration: InputDecoration(
              hintText: 'https://example.com/image.jpg',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: AppTheme.charcoalLight)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () {
                final url = controller.text.trim();
                if (url.isNotEmpty) {
                  Navigator.pop(context);
                  _addImagePath(url);
                }
              },
              child: const Text('Add', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
  }

  void _showPasteVideoUrlDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Paste Video URL', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.charcoal)),
          content: TextField(
            controller: controller,
            decoration: InputDecoration(
              hintText: 'https://example.com/video.mp4',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: AppTheme.charcoalLight)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () {
                final url = controller.text.trim();
                if (url.isNotEmpty) {
                  setState(() {
                    _videoUrl = url;
                  });
                }
                Navigator.pop(context);
              },
              child: const Text('Add', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  void _openVideoUploadSourceSelection() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Upload Video', style: Theme.of(context).textTheme.displayMedium?.copyWith(fontSize: 18)),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.video_library, color: AppTheme.primary),
              title: const Text('Choose Video from Gallery'),
              onTap: () async {
                Navigator.pop(context);
                final picked = await ImagePicker().pickVideo(source: ImageSource.gallery);
                if (picked != null) {
                  _addVideoPath(picked.path);
                }
              },
            ),
            ListTile(
              leading: const Icon(Icons.videocam, color: AppTheme.primary),
              title: const Text('Record Video with Camera'),
              onTap: () async {
                Navigator.pop(context);
                final picked = await ImagePicker().pickVideo(source: ImageSource.camera);
                if (picked != null) {
                  _addVideoPath(picked.path);
                }
              },
            ),
            ListTile(
              leading: const Icon(Icons.developer_mode, color: AppTheme.primary),
              title: const Text('Add Demo / Mock Property Video'),
              onTap: () {
                Navigator.pop(context);
                setState(() {
                  _videoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-luxury-resort-with-swimming-pool-41662-large.mp4';
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  void _addVideoPath(String path) async {
    setState(() => _isUploadingVideo = true);
    await Future.delayed(const Duration(milliseconds: 600));
    if (mounted) {
      setState(() {
        _videoUrl = path;
        _isUploadingVideo = false;
      });
    }
  }

  Widget _buildStepPhotos(TextTheme textTheme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Add photos', style: textTheme.displayMedium?.copyWith(fontSize: 20)),
        const SizedBox(height: 4),
        const Text('Upload device photos or paste image URLs. The first photo is your cover.', style: TextStyle(fontSize: 13, color: AppTheme.charcoalLight)),
        const SizedBox(height: 20),

        Row(
          children: [
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                elevation: 0,
              ),
              icon: _isUploadingPhoto
                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.upload, size: 16),
              label: Text(_isUploadingPhoto ? 'Uploading…' : 'Upload from device', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
              onPressed: _isUploadingPhoto ? null : _openUploadSourceSelection,
            ),
            const SizedBox(width: 8),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF5D6B77),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                elevation: 0,
              ),
              icon: const Icon(Icons.image_outlined, size: 16),
              label: const Text('Paste URL', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
              onPressed: _showPasteUrlDialog,
            ),
          ],
        ),
        const SizedBox(height: 24),

        if (_uploadedImages.isEmpty)
          Container(
            height: 120,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppTheme.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.border, style: BorderStyle.solid),
            ),
            child: const Text(
              'No photos yet',
              style: TextStyle(color: AppTheme.charcoalMuted, fontSize: 14, fontWeight: FontWeight.w500),
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _uploadedImages.length,
            separatorBuilder: (context, index) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final parts = _uploadedImages[index].split('#');
              final imgPath = parts[0];
              final availableCategories = _getPhotoCategoriesForCategory(_category);
              String imgCategory = parts.length > 1 ? parts[1] : 'Other';
              if (!availableCategories.contains(imgCategory)) {
                imgCategory = 'Other';
              }
              final isNetwork = imgPath.startsWith('http');
              final isCover = index == 0;

              return Container(
                decoration: BoxDecoration(
                  color: AppTheme.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Left side: Image preview
                    Stack(
                      children: [
                        Container(
                          width: 100,
                          height: 100,
                          decoration: BoxDecoration(
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(15),
                              bottomLeft: Radius.circular(15),
                            ),
                            image: DecorationImage(
                              image: isNetwork 
                                  ? NetworkImage(imgPath) as ImageProvider
                                  : FileImage(File(imgPath)),
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                        if (isCover)
                          Positioned(
                            top: 6,
                            left: 6,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.primary,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'COVER',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 8,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                    
                    // Right side: Category Dropdown & Details
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'PHOTO CATEGORY',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.charcoalLight,
                                letterSpacing: 0.8,
                              ),
                            ),
                            const SizedBox(height: 4),
                            DropdownButtonFormField<String>(
                              value: imgCategory,
                              isExpanded: true,
                              decoration: InputDecoration(
                                contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: const BorderSide(color: AppTheme.border),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: const BorderSide(color: AppTheme.border),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: const BorderSide(color: AppTheme.primary),
                                ),
                              ),
                              items: availableCategories.map((cat) {
                                return DropdownMenuItem(value: cat, child: Text(cat, style: const TextStyle(fontSize: 12)));
                              }).toList(),
                              onChanged: (newVal) {
                                if (newVal != null) {
                                  setState(() {
                                    _uploadedImages[index] = '$imgPath#$newVal';
                                  });
                                }
                              },
                            ),
                          ],
                        ),
                      ),
                    ),
                    
                    // Delete Button
                    Padding(
                      padding: const EdgeInsets.only(top: 8.0, right: 8.0),
                      child: IconButton(
                        constraints: const BoxConstraints(),
                        padding: EdgeInsets.zero,
                        icon: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 20),
                        onPressed: () {
                          setState(() {
                            _uploadedImages.removeAt(index);
                          });
                        },
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 24),
          const Divider(color: AppTheme.border),
          const SizedBox(height: 16),
          Text('Add Videos', style: textTheme.displayMedium?.copyWith(fontSize: 18)),
          const SizedBox(height: 4),
          const Text(
            'Upload property video clips or add YouTube links (Shorts & Long videos) to showcase your space.',
            style: TextStyle(fontSize: 12, color: AppTheme.charcoalLight),
          ),
          const SizedBox(height: 16),

          // 1. Upload Video section
          Text('Property Video Clip', style: textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(height: 8),
          Row(
            children: [
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  elevation: 0,
                ),
                icon: _isUploadingVideo
                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.video_library_outlined, size: 16),
                label: Text(_isUploadingVideo ? 'Uploading…' : 'Upload from device', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                onPressed: _isUploadingVideo ? null : _openVideoUploadSourceSelection,
              ),
              const SizedBox(width: 8),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF5D6B77),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  elevation: 0,
                ),
                icon: const Icon(Icons.link, size: 16),
                label: const Text('Paste Video URL', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                onPressed: _showPasteVideoUrlDialog,
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Display current video url if not null
          if (_videoUrl != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppTheme.stone,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.border),
              ),
              child: Row(
                children: [
                  const Icon(Icons.play_circle_fill, color: AppTheme.primary, size: 28),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Property Video Clip', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 2),
                        Text(
                          _videoUrl!.startsWith('http') ? _videoUrl! : 'Local video file: ${_videoUrl!.split("/").last}',
                          style: const TextStyle(fontSize: 10, color: AppTheme.charcoalMuted),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 20),
                    onPressed: () {
                      setState(() {
                        _videoUrl = null;
                      });
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          const Divider(color: AppTheme.border),
          const SizedBox(height: 12),

          // 2. YouTube links section
          Text('YouTube Shorts Link', style: textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(height: 6),
          TextFormField(
            controller: _youtubeShortController,
            decoration: const InputDecoration(
              hintText: 'https://youtube.com/shorts/...',
              prefixIcon: Icon(Icons.play_arrow_outlined, color: AppTheme.primary, size: 20),
            ),
          ),
          const SizedBox(height: 12),

          Text('YouTube Long Video Link', style: textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(height: 6),
          TextFormField(
            controller: _youtubeLongController,
            decoration: const InputDecoration(
              hintText: 'https://youtube.com/watch?v=...',
              prefixIcon: Icon(Icons.video_collection_outlined, color: AppTheme.primary, size: 20),
            ),
          ),
      ],
    );
  }

  List<String> _getPhotoCategoriesForCategory(String category) {
    if (category == 'commercial') {
      return [
        'Conference Room',
        'Office Space',
        'Reception / Lobby',
        'Cafeteria / Pantry',
        'Exterior',
        'Other',
      ];
    } else if (category == 'event_venue') {
      return [
        'Main Hall / Stage',
        'Seating Area',
        'Dining Area / Buffet',
        'Entrance / Decor',
        'Lawn / Outdoor',
        'Changing Room',
        'Other',
      ];
    } else {
      return [
        'Living Room',
        'Bedroom',
        'Bathroom',
        'Kitchen',
        'Exterior',
        'Other',
      ];
    }
  }

  Widget _buildStepReview(TextTheme textTheme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Review your Listing', style: textTheme.displayMedium?.copyWith(fontSize: 20)),
        const SizedBox(height: 4),
        const Text('Please double check the details before submitting to STR.', style: TextStyle(fontSize: 13, color: AppTheme.charcoalLight)),
        const SizedBox(height: 20),

        Card(
          elevation: 0,
          color: AppTheme.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: AppTheme.border)),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                _buildReviewRow('Title', _titleController.text),
                _buildReviewRow('Category', _category.toUpperCase()),
                _buildReviewRow('Type', '$_bhkType $_propertyType'),
                _buildReviewRow('Area size', '${_areaController.text} sqft'),
                _buildReviewRow('Guests', '${_minGuestsController.text} Min / ${_maxGuestsController.text} Max'),
                _buildReviewRow('City / Location', '${_cityController.text}, ${_stateController.text}'),
                if (_category == 'event_venue') ...[
                  _buildReviewRow('Veg Price', '₹${_vegPriceController.text} / plate'),
                  _buildReviewRow('Non-Veg Price', '₹${_nonVegPriceController.text} / plate'),
                  _buildReviewRow('Venue Price', '₹${_priceController.text} / day'),
                ] else ...[
                  _buildReviewRow('Price', '₹${_priceController.text} / $_pricingCycle'),
                ],
                _buildReviewRow('Cook Available', _hasCook ? 'Yes (₹${_cookPriceController.text}/day)' : 'No'),
                _buildReviewRow('Self Cook Allowed', _hasSelfCook ? 'Yes' : 'No'),
                _buildReviewRow('Amenities', '${_selectedAmenities.length} selected'),
                _buildReviewRow('Photos', '${_uploadedImages.length} uploaded'),
              ],
            ),
          ),
        ),
        if (_uploadedImages.isNotEmpty) ...[
          const SizedBox(height: 20),
          const Text(
            'Uploaded Photos Preview',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 90,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _uploadedImages.length,
              separatorBuilder: (context, index) => const SizedBox(width: 10),
              itemBuilder: (context, index) {
                final parts = _uploadedImages[index].split('#');
                final imgPath = parts[0];
                final isNetwork = imgPath.startsWith('http');
                final isCover = index == 0;

                return Container(
                  width: 90,
                  height: 90,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(11),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        Image(
                          image: isNetwork
                              ? NetworkImage(imgPath) as ImageProvider
                              : FileImage(File(imgPath)),
                          fit: BoxFit.cover,
                        ),
                        if (isCover)
                          Positioned(
                            top: 4,
                            left: 4,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                              decoration: BoxDecoration(
                                color: AppTheme.primary,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'COVER',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 7,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
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
      ],
    );
  }

  Widget _buildReviewRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.charcoalLight, fontSize: 13)),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.charcoal, fontSize: 13),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavigationControls() {
    final isLastStep = _currentStep == _stepHeaders.length - 1;

    return Container(
      padding: const EdgeInsets.all(20),
      color: AppTheme.white,
      child: Row(
        children: [
          if (_currentStep > 0) ...[
            Expanded(
              child: OutlinedButton(
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: _prevStep,
                child: const Text('BACK', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: OutlinedButton(
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                foregroundColor: AppTheme.charcoal,
                side: const BorderSide(color: AppTheme.border),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: _isSubmitting ? null : _savePropertyAsDraft,
              child: const Text('SAVE DRAFT', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: AppTheme.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: _isSubmitting ? null : (isLastStep ? _submitPropertyListing : _nextStep),
              child: _isSubmitting
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(isLastStep ? 'SUBMIT PROPERTY' : 'NEXT', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }
}

class PackageItem {
  String name;
  int count;
  PackageItem({required this.name, required this.count});
}
