import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';

import '../../config.dart';
import '../../models/nearby_property_model.dart';
import '../../providers/nearby_map_provider.dart';
import '../../theme.dart';
import '../../utils/currency_formatter.dart';
import '../shared/property_image.dart';
import 'property_detail_screen.dart';

class ExploreMapScreen extends StatefulWidget {
  const ExploreMapScreen({super.key});

  @override
  State<ExploreMapScreen> createState() => _ExploreMapScreenState();
}

class _ExploreMapScreenState extends State<ExploreMapScreen>
    with WidgetsBindingObserver {
  final MapController _mapController = MapController();
  bool _showSearchThisArea = false;
  bool _mapReady = false;
  LatLng _cameraCenter = const LatLng(20.5937, 78.9629);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NearbyMapProvider>().enableLocation();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      context.read<NearbyMapProvider>().enableLocation();
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NearbyMapProvider>();
    final current = provider.currentLocation;
    final center = current == null
        ? _cameraCenter
        : LatLng(current.latitude, current.longitude);

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Stack(
          children: [
            FlutterMap(
              mapController: _mapController,
              options: MapOptions(
                initialCenter: center,
                initialZoom: 13.5,
                minZoom: 4,
                maxZoom: 18,
                onMapReady: () {
                  _mapReady = true;
                  if (current != null) {
                    _moveTo(LatLng(current.latitude, current.longitude));
                  }
                },
                onPositionChanged: (position, hasGesture) {
                  _cameraCenter = position.center;
                  if (hasGesture) {
                    provider.markManualMapMove();
                    if (!_showSearchThisArea) {
                      setState(() => _showSearchThisArea = true);
                    }
                  }
                },
              ),
              children: [
                TileLayer(
                  urlTemplate: AppConfig.mapTileUrl,
                  userAgentPackageName: AppConfig.mapUserAgent,
                  retinaMode: RetinaMode.isHighDensity(context),
                  subdomains: const ['a', 'b', 'c', 'd'],
                ),
                RichAttributionWidget(
                  showFlutterMapAttribution: false,
                  alignment: AttributionAlignment.bottomLeft,
                  attributions: [
                    TextSourceAttribution(AppConfig.mapAttribution),
                  ],
                ),
                CircleLayer(
                  circles: [
                    if (current != null)
                      CircleMarker(
                        point: LatLng(current.latitude, current.longitude),
                        radius: provider.radiusMeters.toDouble(),
                        useRadiusInMeter: true,
                        color: AppTheme.primary.withValues(alpha: 0.08),
                        borderColor: AppTheme.primary.withValues(alpha: 0.20),
                        borderStrokeWidth: 1,
                      ),
                  ],
                ),
                MarkerLayer(markers: _markers(provider)),
              ],
            ),
            Positioned(
              top: 14,
              left: 14,
              right: 14,
              child: _TopMapBar(onBack: () => Navigator.pop(context)),
            ),
            Positioned(
              top: 78,
              left: 14,
              right: 14,
              child: _RadiusSelector(
                radiusMeters: provider.radiusMeters,
                onChanged: provider.setRadius,
              ),
            ),
            if (_showSearchThisArea)
              Positioned(
                top: 132,
                left: 0,
                right: 0,
                child: Center(
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      setState(() => _showSearchThisArea = false);
                      await provider.searchThisArea(
                        latitude: _cameraCenter.latitude,
                        longitude: _cameraCenter.longitude,
                      );
                    },
                    icon: const Icon(Icons.search, size: 18),
                    label: const Text('Search this area'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF07142F),
                      foregroundColor: Colors.white,
                      elevation: 8,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),
                ),
              ),
            Positioned(
              right: 14,
              bottom: provider.selectedProperty == null ? 104 : 236,
              child: FloatingActionButton.small(
                heroTag: 'recenter_map',
                backgroundColor: Colors.white,
                foregroundColor: const Color(0xFF07142F),
                onPressed: () async {
                  setState(() => _showSearchThisArea = false);
                  await provider.recenter();
                  final fresh = provider.currentLocation;
                  if (fresh != null) {
                    _moveTo(LatLng(fresh.latitude, fresh.longitude));
                  }
                },
                child: const Icon(Icons.my_location),
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: _BottomPanel(
                provider: provider,
                onSelect: (property) {
                  provider.selectProperty(property);
                  _moveTo(LatLng(property.latitude, property.longitude));
                },
              ),
            ),
            if (_needsPermissionState(provider.status))
              Positioned.fill(child: _PermissionOverlay(provider: provider)),
            if (provider.isBusy)
              Positioned(
                left: 14,
                right: 14,
                top: 132,
                child: _LoadingBanner(
                  text: provider.status == NearbyMapStatus.locating
                      ? 'Detecting your location...'
                      : 'Loading nearby spaces...',
                ),
              ),
          ],
        ),
      ),
    );
  }

  List<Marker> _markers(NearbyMapProvider provider) {
    final markers = <Marker>[];
    final current = provider.currentLocation;
    if (current != null) {
      markers.add(
        Marker(
          point: LatLng(current.latitude, current.longitude),
          width: 46,
          height: 46,
          child: const _UserLocationMarker(),
        ),
      );
      if (provider.followMe) {
        _moveTo(LatLng(current.latitude, current.longitude));
      }
    }

    for (final property in provider.properties) {
      final selected =
          provider.selectedProperty?.propertyId == property.propertyId;
      markers.add(
        Marker(
          point: LatLng(property.latitude, property.longitude),
          width: selected ? 92 : 78,
          height: 42,
          child: GestureDetector(
            onTap: () {
              provider.selectProperty(property);
              _moveTo(LatLng(property.latitude, property.longitude));
            },
            child: _PriceMarker(property: property, selected: selected),
          ),
        ),
      );
    }
    return markers;
  }

  bool _needsPermissionState(NearbyMapStatus status) {
    return status == NearbyMapStatus.idle ||
        status == NearbyMapStatus.denied ||
        status == NearbyMapStatus.deniedForever ||
        status == NearbyMapStatus.serviceDisabled;
  }

  void _moveTo(LatLng point) {
    if (!_mapReady) return;
    _mapController.move(point, _mapController.camera.zoom);
  }
}

class _TopMapBar extends StatelessWidget {
  final VoidCallback onBack;

  const _TopMapBar({required this.onBack});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.10),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: onBack,
            icon: const Icon(Icons.arrow_back),
            color: const Color(0xFF07142F),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Explore nearby',
                    style: GoogleFonts.manrope(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF07142F))),
                Text('Stays, workspaces and venues around you',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.manrope(
                        fontSize: 11, color: AppTheme.charcoalLight)),
              ],
            ),
          ),
          const Icon(Icons.tune, color: Color(0xFF07142F)),
          const SizedBox(width: 10),
        ],
      ),
    );
  }
}

class _RadiusSelector extends StatelessWidget {
  final int radiusMeters;
  final ValueChanged<int> onChanged;

  const _RadiusSelector({
    required this.radiusMeters,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final options = const [1000, 3000, 5000, 10000, 20000];
    return SizedBox(
      height: 38,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: options.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, index) {
          final value = options[index];
          final selected = value == radiusMeters;
          return ChoiceChip(
            selected: selected,
            label: Text('${(value / 1000).round()} KM'),
            onSelected: (_) => onChanged(value),
            selectedColor: AppTheme.primary,
            backgroundColor: Colors.white,
            labelStyle: GoogleFonts.manrope(
              color: selected ? Colors.white : const Color(0xFF07142F),
              fontWeight: FontWeight.w900,
              fontSize: 12,
            ),
            side: BorderSide(
              color: selected ? AppTheme.primary : AppTheme.border,
            ),
          );
        },
      ),
    );
  }
}

class _BottomPanel extends StatelessWidget {
  final NearbyMapProvider provider;
  final ValueChanged<NearbyPropertyModel> onSelect;

  const _BottomPanel({
    required this.provider,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final selected = provider.selectedProperty;
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 18),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(
                color: AppTheme.border,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
          const SizedBox(height: 12),
          if (selected != null) _PreviewCard(property: selected),
          if (provider.properties.isNotEmpty) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 96,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: provider.properties.length,
                separatorBuilder: (_, __) => const SizedBox(width: 10),
                itemBuilder: (_, index) {
                  final property = provider.properties[index];
                  final active = selected?.propertyId == property.propertyId;
                  return GestureDetector(
                    onTap: () => onSelect(property),
                    child: Container(
                      width: 220,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: active
                            ? AppTheme.primary.withValues(alpha: 0.08)
                            : Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: active ? AppTheme.primary : AppTheme.border,
                        ),
                      ),
                      child: Row(
                        children: [
                          PropertyImage(
                            imageUrl: property.thumbnail,
                            width: 62,
                            height: 62,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(property.propertyName,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.manrope(
                                        fontWeight: FontWeight.w900,
                                        color: const Color(0xFF07142F))),
                                const SizedBox(height: 4),
                                Text('${property.distanceKm} KM away',
                                    style: GoogleFonts.manrope(
                                        fontSize: 11,
                                        color: AppTheme.charcoalLight)),
                                const SizedBox(height: 4),
                                Text(CurrencyFormatter.format(property.price),
                                    style: GoogleFonts.manrope(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w900,
                                        color: const Color(0xFF07142F))),
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
          ] else
            _EmptyState(provider: provider),
        ],
      ),
    );
  }
}

class _PreviewCard extends StatelessWidget {
  final NearbyPropertyModel property;

  const _PreviewCard({required this.property});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => PropertyDetailScreen(propertyId: property.propertyId),
        ),
      ),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppTheme.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 18,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          children: [
            PropertyImage(
              imageUrl: property.thumbnail,
              width: 92,
              height: 92,
              borderRadius: BorderRadius.circular(14),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(property.propertyName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.manrope(
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF07142F))),
                  const SizedBox(height: 5),
                  Text('${property.city}, ${property.state}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.manrope(
                          fontSize: 12, color: AppTheme.charcoalLight)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.star,
                          size: 16, color: Color(0xFFFFB000)),
                      const SizedBox(width: 4),
                      Text(property.rating.toStringAsFixed(1),
                          style:
                              GoogleFonts.manrope(fontWeight: FontWeight.w900)),
                      const SizedBox(width: 8),
                      Text('${property.distanceKm} KM',
                          style: GoogleFonts.manrope(
                              fontSize: 12, color: AppTheme.charcoalLight)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                      '${CurrencyFormatter.format(property.price)} / ${property.pricingUnitLabel}',
                      style: GoogleFonts.manrope(
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF07142F))),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Color(0xFF07142F)),
          ],
        ),
      ),
    );
  }
}

class _PriceMarker extends StatelessWidget {
  final NearbyPropertyModel property;
  final bool selected;

  const _PriceMarker({
    required this.property,
    required this.selected,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: selected ? const Color(0xFF07142F) : Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: selected ? const Color(0xFF07142F) : AppTheme.border,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: selected ? 0.20 : 0.12),
            blurRadius: selected ? 14 : 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Text(
          CurrencyFormatter.format(property.price),
          style: GoogleFonts.manrope(
            color: selected ? Colors.white : const Color(0xFF07142F),
            fontWeight: FontWeight.w900,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}

class _UserLocationMarker extends StatelessWidget {
  const _UserLocationMarker();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.18),
              blurRadius: 12,
              offset: const Offset(0, 5),
            ),
          ],
        ),
        child: Center(
          child: Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF07142F),
              border: Border.all(color: AppTheme.primary, width: 2),
            ),
            child: const Icon(
              Icons.person_rounded,
              color: Colors.white,
              size: 18,
            ),
          ),
        ),
      ),
    );
  }
}

class _PermissionOverlay extends StatelessWidget {
  final NearbyMapProvider provider;

  const _PermissionOverlay({required this.provider});

  @override
  Widget build(BuildContext context) {
    final deniedForever = provider.status == NearbyMapStatus.deniedForever;
    final serviceDisabled = provider.status == NearbyMapStatus.serviceDisabled;
    return Container(
      color: Colors.white.withValues(alpha: 0.94),
      padding: const EdgeInsets.all(28),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 74,
              height: 74,
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.my_location,
                  color: AppTheme.primary, size: 34),
            ),
            const SizedBox(height: 18),
            Text('Explore places near you',
                textAlign: TextAlign.center,
                style: GoogleFonts.manrope(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF07142F))),
            const SizedBox(height: 8),
            Text(
              provider.message ??
                  'Enable location to discover stays, workspaces and event venues around you.',
              textAlign: TextAlign.center,
              style: GoogleFonts.manrope(
                  fontSize: 14, color: AppTheme.charcoalLight, height: 1.5),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: deniedForever
                  ? provider.openAppSettings
                  : serviceDisabled
                      ? provider.openLocationSettings
                      : provider.enableLocation,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                foregroundColor: Colors.white,
                minimumSize: const Size(190, 48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: Text(
                deniedForever || serviceDisabled
                    ? 'Open Settings'
                    : 'Enable Location',
                style: GoogleFonts.manrope(fontWeight: FontWeight.w900),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final NearbyMapProvider provider;

  const _EmptyState({required this.provider});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.stone,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          const Icon(Icons.location_off_outlined, color: AppTheme.primary),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              provider.message ?? 'No properties found nearby.',
              style: GoogleFonts.manrope(
                  fontWeight: FontWeight.w700, color: AppTheme.charcoalLight),
            ),
          ),
          TextButton(
            onPressed: () => provider.setRadius(
              provider.radiusMeters >= 10000 ? 20000 : 10000,
            ),
            child: const Text('Increase Radius'),
          ),
        ],
      ),
    );
  }
}

class _LoadingBanner extends StatelessWidget {
  final String text;

  const _LoadingBanner({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.10),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          const SizedBox(width: 10),
          Text(text,
              style: GoogleFonts.manrope(
                  fontWeight: FontWeight.w800, color: const Color(0xFF07142F))),
        ],
      ),
    );
  }
}
