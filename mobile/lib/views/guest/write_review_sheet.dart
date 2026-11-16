import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../services/api_service.dart';

const _ink = Color(0xFF1B1924);

/// Asks the backend whether this booking can be reviewed (stay finished, inside
/// the 14-day window, not reviewed yet) and, if so, opens the review form.
/// Same rules and endpoints as the website.
Future<void> showWriteReviewSheet(
    BuildContext context, String bookingId, String propertyTitle) async {
  final api = ApiService().dio;
  final messenger = ScaffoldMessenger.of(context);
  Map<String, dynamic> eligibility;
  try {
    final res = await api.get('/bookings/$bookingId/review-eligibility');
    eligibility = Map<String, dynamic>.from(res.data as Map);
  } catch (_) {
    messenger.showSnackBar(
        const SnackBar(content: Text('Could not check review status.')));
    return;
  }
  if (eligibility['eligible'] != true) {
    const reasons = {
      'already_reviewed': 'You have already reviewed this stay.',
      'booking_not_confirmed': 'Only confirmed bookings can be reviewed.',
      'stay_not_completed': 'You can review after check-out.',
      'window_expired': 'The 14-day review window has ended.',
    };
    messenger.showSnackBar(SnackBar(
        content: Text(reasons[eligibility['reason']] ??
            'This booking cannot be reviewed.')));
    return;
  }
  if (!context.mounted) return;
  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _ReviewForm(
      bookingId: bookingId,
      propertyTitle: propertyTitle,
      daysRemaining: (eligibility['days_remaining'] as num?)?.toInt(),
    ),
  );
}

class _ReviewForm extends StatefulWidget {
  final String bookingId;
  final String propertyTitle;
  final int? daysRemaining;

  const _ReviewForm(
      {required this.bookingId,
      required this.propertyTitle,
      this.daysRemaining});

  @override
  State<_ReviewForm> createState() => _ReviewFormState();
}

class _ReviewFormState extends State<_ReviewForm> {
  static const _fields = [
    ['cleanliness', 'Cleanliness'],
    ['communication', 'Communication'],
    ['check_in', 'Check-in'],
    ['accuracy', 'Accuracy'],
    ['location', 'Location'],
    ['value', 'Value'],
  ];
  int _overall = 0;
  final Map<String, int> _sub = {};
  final _comment = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Widget _stars(int value, void Function(int) onPick, {double size = 30}) {
    return Row(
      children: [
        for (var i = 1; i <= 5; i++)
          GestureDetector(
            onTap: () => onPick(i),
            child: Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Icon(i <= value ? Icons.star_rounded : Icons.star_outline_rounded,
                  size: size,
                  color: i <= value
                      ? const Color(0xFFF4B400)
                      : const Color(0xFFBDBDBD)),
            ),
          ),
      ],
    );
  }

  Future<void> _submit() async {
    if (_overall == 0) {
      setState(() => _error = 'Please give an overall rating.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ApiService().dio.post('/bookings/${widget.bookingId}/review', data: {
        'overall_rating': _overall,
        ..._sub,
        if (_comment.text.trim().isNotEmpty) 'comment': _comment.text.trim(),
      });
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Thanks for your review!')));
    } catch (e) {
      var msg = 'Could not post your review. Please try again.';
      if (e is DioException && e.response?.data is Map) {
        msg = (e.response!.data['detail'] ?? msg).toString();
      }
      if (mounted) {
        setState(() {
          _saving = false;
          _error = msg;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 22),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Rate your stay',
                  style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w600)),
              const SizedBox(height: 2),
              Text(widget.propertyTitle,
                  style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF6B7280))),
              if (widget.daysRemaining != null)
                Text('${widget.daysRemaining} days left to review',
                    style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF6B7280))),
              const SizedBox(height: 14),
              Text('Overall', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              _stars(_overall, (v) => setState(() => _overall = v), size: 36),
              const SizedBox(height: 14),
              for (final f in _fields)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      SizedBox(
                          width: 118,
                          child: Text(f[1], style: GoogleFonts.inter(fontSize: 13))),
                      _stars(_sub[f[0]] ?? 0,
                          (v) => setState(() => _sub[f[0]] = v),
                          size: 24),
                    ],
                  ),
                ),
              const SizedBox(height: 10),
              TextField(
                controller: _comment,
                maxLines: 4,
                maxLength: 2000,
                decoration: const InputDecoration(
                    hintText: 'Tell others about your stay (optional)'),
              ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(_error!, style: TextStyle(color: Colors.red.shade700)),
                ),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _saving ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _ink,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: Text(_saving ? 'Posting...' : 'Post review'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
