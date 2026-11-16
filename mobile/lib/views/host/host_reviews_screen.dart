import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../services/api_service.dart';

const _ink = Color(0xFF1B1924);
const _muted = Color(0xFF6B7280);

/// Guest reviews on the host's properties, with one public reply per review
/// (`/host/reviews`, `/reviews/{id}/host-response`), same as the website.
class HostReviewsScreen extends StatefulWidget {
  const HostReviewsScreen({super.key});

  @override
  State<HostReviewsScreen> createState() => _HostReviewsScreenState();
}

class _HostReviewsScreenState extends State<HostReviewsScreen> {
  final _api = ApiService().dio;
  List<Map<String, dynamic>> _reviews = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await _api.get('/host/reviews');
      final list = (res.data['reviews'] as List?) ?? const [];
      _reviews = list.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
    } catch (_) {
      _reviews = [];
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _reply(Map<String, dynamic> review) async {
    final controller = TextEditingController();
    final text = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reply to review'),
        content: TextField(
          controller: controller,
          maxLines: 4,
          maxLength: 1500,
          decoration: const InputDecoration(hintText: 'Your public reply'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, controller.text.trim()),
              child: const Text('Post')),
        ],
      ),
    );
    if (text == null || text.isEmpty) return;
    try {
      await _api.post('/reviews/${review['review_id']}/host-response',
          data: {'response': text});
      _load();
    } catch (e) {
      var msg = 'Could not post the reply.';
      if (e is DioException && e.response?.data is Map) {
        msg = (e.response!.data['detail'] ?? msg).toString();
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
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
        title: Text('Guest reviews',
            style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: _ink))
          : RefreshIndicator(
              onRefresh: _load,
              child: _reviews.isEmpty
                  ? ListView(children: [
                      Padding(
                        padding: const EdgeInsets.only(top: 80),
                        child: Center(
                            child: Text('No reviews yet.',
                                style: GoogleFonts.inter(color: _muted))),
                      )
                    ])
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _reviews.length,
                      itemBuilder: (_, i) => _card(_reviews[i]),
                    ),
            ),
    );
  }

  Widget _card(Map<String, dynamic> r) {
    final rating = (r['overall_rating'] as num?)?.toInt() ?? 0;
    final property = (r['property'] as Map?) ?? const {};
    final response = (r['host_response'] ?? '').toString();
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
          Text((property['title'] ?? 'Property').toString(),
              style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Row(children: [
            for (var i = 1; i <= 5; i++)
              Icon(i <= rating ? Icons.star_rounded : Icons.star_outline_rounded,
                  size: 18, color: const Color(0xFFF4B400)),
          ]),
          if ((r['comment'] ?? '').toString().isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(r['comment'].toString(),
                style: GoogleFonts.inter(fontSize: 13.5, height: 1.4)),
          ],
          const SizedBox(height: 10),
          if (response.isNotEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                  color: const Color(0xFFF6F6F6),
                  borderRadius: BorderRadius.circular(10)),
              child: Text('Your reply: $response',
                  style: GoogleFonts.inter(fontSize: 12.5, color: _muted)),
            )
          else
            TextButton.icon(
              onPressed: () => _reply(r),
              icon: const Icon(LucideIcons.reply, size: 15),
              label: const Text('Reply'),
              style: TextButton.styleFrom(foregroundColor: _ink),
            ),
        ],
      ),
    );
  }
}
