import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

/// Website card ribbons, shared by every property card: the ribbon overhangs the
/// photo's left edge and has a small dark folded corner under it (3D look).
/// Place inside a Stack with `clipBehavior: Clip.none`, outside any ClipRRect.
class CardRibbon extends StatelessWidget {
  final String label;
  final bool series;

  const CardRibbon({super.key, required this.label, this.series = false});

  @override
  Widget build(BuildContext context) {
    const gold = Color(0xFFD4AF37);
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(10, 5, 10, 5),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: series
                  ? const [Color(0xFF2B2B2B), Color(0xFF161616), Color(0xFF070707)]
                  : const [Color(0xFFE9C16A), Color(0xFFD29A35)],
            ),
            border: series
                ? Border(
                    top: BorderSide(color: gold.withValues(alpha: 0.8)),
                    bottom: BorderSide(color: gold.withValues(alpha: 0.8)),
                    right: BorderSide(color: gold.withValues(alpha: 0.8)),
                  )
                : null,
            borderRadius:
                const BorderRadius.horizontal(right: Radius.circular(999)),
            boxShadow: const [
              BoxShadow(
                  color: Color(0x40000000), blurRadius: 5, offset: Offset(0, 2)),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(series ? LucideIcons.crown : LucideIcons.badgeCheck,
                  size: 12, color: series ? gold : Colors.white),
              const SizedBox(width: 4),
              Text(label,
                  style: GoogleFonts.inter(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: series ? const Color(0xFFE8C766) : Colors.white)),
            ],
          ),
        ),
        // folded corner
        Positioned(
          left: 0,
          bottom: -4,
          child: CustomPaint(
              size: const Size(6, 5), painter: _Fold(const Color(0xFF8A5F17), false)),
        ),
      ],
    );
  }
}

/// The dark "Best Rated" tag that overhangs the photo's right edge, with a fold.
class BestRatedTag extends StatelessWidget {
  const BestRatedTag({super.key});

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(8, 6, 12, 6),
          decoration: const BoxDecoration(
            color: Color(0xFF1E1E1E),
            borderRadius: BorderRadius.horizontal(left: Radius.circular(6)),
            boxShadow: [
              BoxShadow(
                  color: Color(0x40000000), blurRadius: 5, offset: Offset(0, 2)),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.star_rounded, size: 13, color: Color(0xFFFBD5A0)),
              const SizedBox(width: 5),
              Text('Best Rated',
                  style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.white)),
            ],
          ),
        ),
        Positioned(
          right: 0,
          bottom: -6,
          child: CustomPaint(
              size: const Size(6, 7), painter: _Fold(Colors.black, true)),
        ),
      ],
    );
  }
}

class _Fold extends CustomPainter {
  final Color color;
  final bool right;
  const _Fold(this.color, this.right);

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path();
    if (right) {
      path
        ..moveTo(0, 0)
        ..lineTo(size.width, 0)
        ..lineTo(0, size.height)
        ..close();
    } else {
      path
        ..moveTo(0, 0)
        ..lineTo(size.width, 0)
        ..lineTo(size.width, size.height)
        ..close();
    }
    canvas.drawPath(path, Paint()..color = color);
  }

  @override
  bool shouldRepaint(covariant _Fold old) => false;
}
