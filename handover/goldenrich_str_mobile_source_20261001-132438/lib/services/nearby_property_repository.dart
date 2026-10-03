import '../models/nearby_property_model.dart';
import 'api_service.dart';

class NearbyPropertyRepository {
  final ApiService _apiService;

  NearbyPropertyRepository({ApiService? apiService})
      : _apiService = apiService ?? ApiService();

  Future<List<NearbyPropertyModel>> fetchNearby({
    required double latitude,
    required double longitude,
    int radiusMeters = 5000,
    int? guests,
    String? category,
    String? propertyType,
    double? minPrice,
    double? maxPrice,
    bool? instantBook,
    String? checkIn,
    String? checkOut,
  }) async {
    final response = await _apiService.dio.get(
      '/properties/nearby',
      queryParameters: {
        'lat': latitude,
        'lng': longitude,
        'radius': radiusMeters,
        if (guests != null) 'guests': guests,
        if (category != null && category.isNotEmpty) 'category': category,
        if (propertyType != null && propertyType.isNotEmpty)
          'propertyType': propertyType,
        if (minPrice != null) 'minPrice': minPrice,
        if (maxPrice != null) 'maxPrice': maxPrice,
        if (instantBook != null) 'instantBook': instantBook,
        if (checkIn != null) 'checkIn': checkIn,
        if (checkOut != null) 'checkOut': checkOut,
      },
    );
    final list = response.data is Map
        ? (response.data['properties'] as List? ?? [])
        : <dynamic>[];
    return list
        .whereType<Map>()
        .map((item) => NearbyPropertyModel.fromJson(
              Map<String, dynamic>.from(item),
            ))
        .where((item) => item.propertyId.isNotEmpty)
        .toList();
  }
}
