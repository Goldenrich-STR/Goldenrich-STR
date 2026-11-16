import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../services/api_service.dart';

const _ink = Color(0xFF1B1924);
const _muted = Color(0xFF6B7280);

/// Calendar sync: a private iCal link per property that Airbnb, Booking.com
/// and Google Calendar can subscribe to, so X-Space bookings block their dates.
/// Uses the same `/calendar/properties/{id}/ical-feed-url` the website host
/// calendar uses.
class HostIcalScreen extends StatefulWidget {
  const HostIcalScreen({super.key});

  @override
  State<HostIcalScreen> createState() => _HostIcalScreenState();
}

class _HostIcalScreenState extends State<HostIcalScreen> {
  final _api = ApiService().dio;
  List<Map<String, dynamic>> _properties = [];
  final Map<String, String> _feeds = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await _api.get('/v1/price-engine/properties');
      final list = res.data is List ? res.data as List : const [];
      _properties = list.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
      final ids = _properties.map((p) => p['property_id'].toString()).toList();
      if (ids.isNotEmpty) {
        final feedRes = await _api
            .post('/calendar/properties/ical-feed-urls', data: {'property_ids': ids});
        final data = feedRes.data;
        final urls = data is Map ? data['feed_urls'] : null;
        if (urls is Map) {
          for (final e in urls.entries) {
            if (e.value is String) _feeds[e.key.toString()] = e.value;
          }
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _fetchOne(String id) async {
    try {
      final res = await _api.get('/calendar/properties/$id/ical-feed-url');
      final url = res.data['feed_url']?.toString();
      if (url != null) setState(() => _feeds[id] = url);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not get the sync link.')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        foregroundColor: _ink,
        title: Text('Calendar sync',
            style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: _ink))
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
              children: [
                Text(
                  'Paste a property\'s link into Airbnb, Booking.com or Google Calendar (Import / Add calendar by URL). X-Space bookings then block those dates there.',
                  style: GoogleFonts.inter(fontSize: 13, height: 1.45, color: _muted),
                ),
                const SizedBox(height: 16),
                if (_properties.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 40),
                    child: Center(
                        child: Text('No properties yet.',
                            style: GoogleFonts.inter(color: _muted))),
                  ),
                for (final p in _properties) _tile(p),
              ],
            ),
    );
  }

  Widget _tile(Map<String, dynamic> p) {
    final id = p['property_id'].toString();
    final url = _feeds[id];
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE3E3E3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text((p['title'] ?? 'Property').toString(),
              style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          if (url == null)
            OutlinedButton.icon(
              onPressed: () => _fetchOne(id),
              icon: const Icon(LucideIcons.link, size: 15),
              label: const Text('Get sync link'),
              style: OutlinedButton.styleFrom(foregroundColor: _ink),
            )
          else ...[
            SelectableText(url,
                style: GoogleFonts.inter(fontSize: 12, color: _muted)),
            const SizedBox(height: 6),
            TextButton.icon(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: url));
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Link copied')));
                }
              },
              icon: const Icon(LucideIcons.copy, size: 15),
              label: const Text('Copy link'),
              style: TextButton.styleFrom(foregroundColor: _ink),
            ),
          ],
        ],
      ),
    );
  }
}
