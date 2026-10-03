import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

import '../models/nearby_property_model.dart';
import '../config.dart';
import '../services/location_service.dart';
import '../services/nearby_property_repository.dart';

enum NearbyMapStatus {
  idle,
  requestingPermission,
  locating,
  loadingProperties,
  ready,
  empty,
  denied,
  deniedForever,
  serviceDisabled,
  error,
}

class NearbyMapProvider with ChangeNotifier {
  final LocationService _locationService;
  final NearbyPropertyRepository _repository;

  NearbyMapProvider({
    LocationService? locationService,
    NearbyPropertyRepository? repository,
  })  : _locationService = locationService ?? LocationService(),
        _repository = repository ?? NearbyPropertyRepository();

  NearbyMapStatus _status = NearbyMapStatus.idle;
  UserLocationSnapshot? _currentLocation;
  List<NearbyPropertyModel> _properties = [];
  NearbyPropertyModel? _selectedProperty;
  String? _message;
  bool _followMe = true;
  int _radiusMeters = AppConfig.nearbyDefaultRadiusMeters;
  int _requestVersion = 0;
  DateTime? _lastFetchAt;
  UserLocationSnapshot? _lastFetchLocation;
  StreamSubscription<UserLocationSnapshot>? _locationSub;

  NearbyMapStatus get status => _status;
  UserLocationSnapshot? get currentLocation => _currentLocation;
  List<NearbyPropertyModel> get properties => List.unmodifiable(_properties);
  NearbyPropertyModel? get selectedProperty => _selectedProperty;
  String? get message => _message;
  bool get followMe => _followMe;
  int get radiusMeters => _radiusMeters;

  bool get isBusy =>
      _status == NearbyMapStatus.requestingPermission ||
      _status == NearbyMapStatus.locating ||
      _status == NearbyMapStatus.loadingProperties;

  Future<void> enableLocation() async {
    _setStatus(NearbyMapStatus.requestingPermission);
    try {
      _setStatus(NearbyMapStatus.locating);
      final location = await _locationService.getCurrentLocation();
      _currentLocation = location;
      notifyListeners();
      await fetchNearbyForLocation(location, force: true);
      await _startLocationStream();
    } on LocationFailure catch (failure) {
      _handleLocationFailure(failure);
    } catch (_) {
      _message = 'Unable to load nearby properties.';
      _setStatus(NearbyMapStatus.error);
    }
  }

  Future<void> fetchNearbyForLocation(
    UserLocationSnapshot location, {
    bool force = false,
  }) async {
    if (!force && !_shouldRefresh(location)) return;
    _lastFetchAt = DateTime.now();
    _lastFetchLocation = location;
    final requestId = ++_requestVersion;
    _setStatus(NearbyMapStatus.loadingProperties);
    try {
      final result = await _repository.fetchNearby(
        latitude: location.latitude,
        longitude: location.longitude,
        radiusMeters: _radiusMeters,
      );
      if (requestId != _requestVersion) return;
      _properties = result;
      _selectedProperty = result.isNotEmpty ? result.first : null;
      _message = result.isEmpty
          ? 'No properties found within ${(_radiusMeters / 1000).round()} KM.'
          : null;
      _setStatus(
          result.isEmpty ? NearbyMapStatus.empty : NearbyMapStatus.ready);
    } catch (_) {
      if (requestId != _requestVersion) return;
      _message = 'Unable to load nearby properties.';
      _setStatus(NearbyMapStatus.error);
    }
  }

  Future<void> searchThisArea({
    required double latitude,
    required double longitude,
  }) async {
    final synthetic = UserLocationSnapshot(
      latitude: latitude,
      longitude: longitude,
      accuracy: _currentLocation?.accuracy ?? 0,
      speed: 0,
      heading: 0,
      timestamp: DateTime.now(),
    );
    _followMe = false;
    await fetchNearbyForLocation(synthetic, force: true);
  }

  Future<void> recenter() async {
    _followMe = true;
    if (_currentLocation != null) {
      await fetchNearbyForLocation(_currentLocation!, force: true);
    } else {
      await enableLocation();
    }
  }

  Future<void> setRadius(int meters) async {
    _radiusMeters = meters;
    if (_currentLocation != null) {
      await fetchNearbyForLocation(_currentLocation!, force: true);
    } else {
      notifyListeners();
    }
  }

  void selectProperty(NearbyPropertyModel property) {
    _selectedProperty = property;
    notifyListeners();
  }

  void markManualMapMove() {
    if (_followMe) {
      _followMe = false;
      notifyListeners();
    }
  }

  Future<void> openAppSettings() => _locationService.openSettings();
  Future<void> openLocationSettings() =>
      _locationService.openLocationSettings();

  bool _shouldRefresh(UserLocationSnapshot location) {
    final lastFetchAt = _lastFetchAt;
    final lastLocation = _lastFetchLocation;
    if (lastFetchAt == null || lastLocation == null) return true;
    if (DateTime.now().difference(lastFetchAt) > const Duration(seconds: 45)) {
      return true;
    }
    final movedMeters = Geolocator.distanceBetween(
      lastLocation.latitude,
      lastLocation.longitude,
      location.latitude,
      location.longitude,
    );
    return movedMeters >= 150;
  }

  Future<void> _startLocationStream() async {
    await _locationSub?.cancel();
    try {
      _locationSub = _locationService.watchLocation().listen((location) {
        _currentLocation = location;
        if (_followMe) {
          fetchNearbyForLocation(location);
        } else {
          notifyListeners();
        }
      }, onError: (_) {
        _message = 'Location updates are unavailable.';
        _setStatus(NearbyMapStatus.error);
      });
    } on LocationFailure catch (failure) {
      _handleLocationFailure(failure);
    }
  }

  void _handleLocationFailure(LocationFailure failure) {
    _message = failure.message;
    switch (failure.type) {
      case LocationFailureType.serviceDisabled:
        _setStatus(NearbyMapStatus.serviceDisabled);
        break;
      case LocationFailureType.denied:
        _setStatus(NearbyMapStatus.denied);
        break;
      case LocationFailureType.deniedForever:
        _setStatus(NearbyMapStatus.deniedForever);
        break;
      case LocationFailureType.timeout:
      case LocationFailureType.unavailable:
        _setStatus(NearbyMapStatus.error);
        break;
    }
  }

  void _setStatus(NearbyMapStatus value) {
    _status = value;
    notifyListeners();
  }

  @override
  void dispose() {
    _locationSub?.cancel();
    super.dispose();
  }
}
