import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../theme.dart';
import 'app_logo.dart';
import 'app_shell.dart';

class AnimatedIntroScreen extends StatefulWidget {
  const AnimatedIntroScreen({super.key});

  @override
  State<AnimatedIntroScreen> createState() => _AnimatedIntroScreenState();
}

class _AnimatedIntroScreenState extends State<AnimatedIntroScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _logoScale;
  late final Animation<double> _logoOpacity;
  late final Animation<double> _titleOpacity;
  late final Animation<Offset> _titleSlide;
  Timer? _timer;
  bool _showHome = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1900),
    )..forward();

    _logoScale = Tween<double>(begin: 0.72, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutBack),
    );
    _logoOpacity = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.05, 0.55)),
    );
    _titleOpacity = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.35, 0.9)),
    );
    _titleSlide = Tween<Offset>(
      begin: const Offset(0, 0.32),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.32, 0.9, curve: Curves.easeOutCubic),
      ),
    );

    _timer = Timer(const Duration(milliseconds: 2800), () {
      if (!mounted) return;
      setState(() => _showHome = true);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 700),
      switchInCurve: Curves.easeOut,
      switchOutCurve: Curves.easeIn,
      child: _showHome
          ? const AppShell()
          : const _IntroScene(key: ValueKey('intro')),
    );
  }
}

class _IntroScene extends StatelessWidget {
  const _IntroScene({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.findAncestorStateOfType<_AnimatedIntroScreenState>();
    final controller = state!._controller;

    return Scaffold(
      backgroundColor: Colors.white,
      body: AnimatedBuilder(
        animation: controller,
        builder: (context, child) {
          final size = MediaQuery.sizeOf(context);
          final logoHeight = size.shortestSide < 360 ? 82.0 : 96.0;

          return SafeArea(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Transform.scale(
                      scale: state._logoScale.value,
                      child: Opacity(
                        opacity: state._logoOpacity.value,
                        child: AppLogo(height: logoHeight),
                      ),
                    ),
                    const SizedBox(height: 18),
                    FadeTransition(
                      opacity: state._titleOpacity,
                      child: SlideTransition(
                        position: state._titleSlide,
                        child: const _AnimatedBrandName(),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _AnimatedBrandName extends StatelessWidget {
  const _AnimatedBrandName();

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final titleSize = width < 360 ? 24.0 : 28.0;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        ShaderMask(
          shaderCallback: (bounds) {
            return const LinearGradient(
              colors: [
                Color(0xFF007E54),
                Color(0xFF0B1B37),
                AppTheme.primary,
                Color(0xFF007E54),
              ],
              stops: [0, 0.42, 0.72, 1],
            ).createShader(bounds);
          },
          child: Text(
            'X-SPACE360',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: titleSize,
              fontWeight: FontWeight.w900,
              color: Colors.white,
              letterSpacing: 1.2,
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Find. Book. Enjoy.',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: AppTheme.charcoalMuted,
            letterSpacing: 0.6,
          ),
        ),
      ],
    );
  }
}
