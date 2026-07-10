import 'package:flutter/material.dart';
import '../../theme.dart';

class AppLogo extends StatelessWidget {
  final double height;
  final bool white;
  final bool framed;
  final Color? tintColor;
  final EdgeInsetsGeometry padding;

  const AppLogo({
    super.key,
    this.height = 40,
    this.white = false,
    this.framed = false,
    this.tintColor,
    this.padding = const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
  });

  @override
  Widget build(BuildContext context) {
    final logo = Image.asset(
      'assets/images/logo.png',
      height: height,
      fit: BoxFit.contain,
      errorBuilder: (context, error, stackTrace) {
        return Icon(
          Icons.location_on_rounded,
          size: height,
          color: white ? Colors.white : AppTheme.primary,
        );
      },
    );

    final Color? effectiveTint = tintColor ?? (white ? Colors.white : null);
    final renderedLogo = effectiveTint != null
        ? ColorFiltered(
            colorFilter: ColorFilter.mode(effectiveTint, BlendMode.srcIn),
            child: logo,
          )
        : logo;

    if (!framed) return renderedLogo;

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: const Color(0xFF4D5758),
        borderRadius: BorderRadius.circular(6),
      ),
      child: renderedLogo,
    );
  }
}
