import 'dart:async';

import 'package:flutter/material.dart';

import '../../theme.dart';
import '../web/website_mirror_screen.dart';
import 'app_logo.dart';

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
          ? const WebsiteMirrorScreen()
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
          return Center(
            child: Transform.scale(
              scale: state._logoScale.value,
              child: Opacity(
                opacity: state._logoOpacity.value,
                child: const AppLogo(height: 96),
              ),
            ),
          );
        },
      ),
    );
  }
}
