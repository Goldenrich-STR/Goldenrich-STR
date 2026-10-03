import 'dart:async';

import 'package:geolocator/geolocator.dart';

enum LocationFailureType {
  serviceDisabled,
  denied,
  deniedForever,
  timeout,
  unavailable,
}

class LocationFailure implements Exception {
  final LocationFailureType type;
  final String message;

  const LocationFailure(this.type, this.message);
}

class UserLocationSnapshot {
  final double latitude;
  final double longitude;
  final double accuracy;
  final double speed;
  final double heading;
  final DateTime timestamp;

  const UserLocationSnapshot({
    required this.latitude,
    required this.longitude,
    required this.accuracy,
    required this.speed,
    required this.heading,
    required this.timestamp,
  });

  factory UserLocationSnapshot.fromPosition(Position position) {
    return UserLocationSnapshot(
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      speed: position.speed,
      heading: position.heading,
      timestamp: position.timestamp,
    );
  }
}

class LocationService {
  static const LocationSettings _settings = LocationSettings(
    accuracy: LocationAccuracy.high,
    distanceFilter: 100,
  );

  Future<UserLocationSnapshot> getCurrentLocation() async {
    await _ensurePermission();
    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: _settings,
      ).timeout(const Duration(seconds: 12));
      return UserLocationSnapshot.fromPosition(position);
    } on TimeoutException {
      throw const LocationFailure(
        LocationFailureType.timeout,
        'Location request timed out. Please try again.',
      );
    } catch (_) {
      throw const LocationFailure(
        LocationFailureType.unavailable,
        'Current location is unavailable.',
      );
    }
  }

  Stream<UserLocationSnapshot> watchLocation() async* {
    await _ensurePermission();
    yield* Geolocator.getPositionStream(locationSettings: _settings)
        .map(UserLocationSnapshot.fromPosition);
  }

  Future<void> openSettings() async {
    await Geolocator.openAppSettings();
  }

  Future<void> openLocationSettings() async {
    await Geolocator.openLocationSettings();
  }

  Future<void> _ensurePermission() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw const LocationFailure(
        LocationFailureType.serviceDisabled,
        'Turn on location to explore properties near you.',
      );
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied) {
      throw const LocationFailure(
        LocationFailureType.denied,
        'Location permission is required to discover nearby properties.',
      );
    }
    if (permission == LocationPermission.deniedForever) {
      throw const LocationFailure(
        LocationFailureType.deniedForever,
        'Location permission is permanently denied. Open settings to enable it.',
      );
    }
  }
}
