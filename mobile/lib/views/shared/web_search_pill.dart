import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

/// The website's mobile search pill: a Google-colour gradient outline, the
/// "Search for a property in <city>" line typing and cycling cities, and a
/// search icon at the end. Tapping anywhere opens the search.
class WebSearchPill extends StatefulWidget {
  final VoidCallback onTap;

  /// What the guest already chose (place, dates, guests). Replaces the typing line.
  final String? value;
  final String? summary;
  final List<String> cities;

  const WebSearchPill({
    super.key,
    required this.onTap,
    this.value,
    this.summary,
    this.cities = const [
      'Nashik',
      'Lonavala',
      'Igatpuri',
      'Goa',
      'Manali',
      'Udaipur',
      'Pune',
      'Karjat',
    ],
  });

  @override
  State<WebSearchPill> createState() => _WebSearchPillState();
}

class _WebSearchPillState extends State<WebSearchPill> {
  Timer? _timer;
  String _typed = '';
  int _index = 0;
  int _count = 0;
  bool _deleting = false;
  bool _caret = true;
  Timer? _caretTimer;

  bool get _hasValue => (widget.value ?? '').isNotEmpty;

  @override
  void initState() {
    super.initState();
    _timer = Timer(const Duration(milliseconds: 500), _tick);
    _caretTimer = Timer.periodic(const Duration(milliseconds: 550), (_) {
      if (mounted) setState(() => _caret = !_caret);
    });
  }

  void _tick() {
    if (!mounted) return;
    final list = widget.cities.isEmpty ? const ['Nashik'] : widget.cities;
    final target = list[_index % list.length];
    Duration next;
    if (!_deleting) {
      _count += 1;
      if (_count >= target.length) {
        _count = target.length;
        _deleting = true;
        next = const Duration(milliseconds: 1500);
      } else {
        next = const Duration(milliseconds: 90);
      }
    } else {
      _count -= 1;
      if (_count <= 0) {
        _count = 0;
        _deleting = false;
        _index += 1;
        next = const Duration(milliseconds: 300);
      } else {
        next = const Duration(milliseconds: 45);
      }
    }
    setState(() => _typed = target.substring(0, _count.clamp(0, target.length)));
    _timer = Timer(next, _tick);
  }

  @override
  void dispose() {
    _timer?.cancel();
    _caretTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const ink = Color(0xFF1B1924);
    final base = GoogleFonts.inter(fontSize: 14, color: const Color(0xFF5F6368));
    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        padding: const EdgeInsets.all(1.5),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(999),
          gradient: const LinearGradient(
            colors: [Color(0xFF4285F4), Color(0xFFD96570), Color(0xFFF4B400)],
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x2E141414),
              blurRadius: 24,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: Container(
          height: 52,
          padding: const EdgeInsets.only(left: 20, right: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(999),
          ),
          child: Row(
            children: [
              Expanded(
                child: _hasValue
                    ? Text.rich(
                        TextSpan(children: [
                          TextSpan(
                            text: widget.value,
                            style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: ink),
                          ),
                          if ((widget.summary ?? '').isNotEmpty)
                            TextSpan(
                              text: '   ${widget.summary}',
                              style: GoogleFonts.inter(
                                  fontSize: 12, color: const Color(0xFF80868B)),
                            ),
                        ]),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      )
                    : Text.rich(
                        TextSpan(children: [
                          TextSpan(text: 'Search for a property in ', style: base),
                          TextSpan(
                            text: _typed,
                            style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: ink),
                          ),
                          TextSpan(
                            text: '|',
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              color: _caret
                                  ? const Color(0xFF9B72CB)
                                  : Colors.transparent,
                            ),
                          ),
                        ]),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
              ),
              const SizedBox(width: 12),
              const Icon(LucideIcons.search, size: 20, color: ink),
            ],
          ),
        ),
      ),
    );
  }
}
