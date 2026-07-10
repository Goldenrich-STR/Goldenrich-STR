import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../shared/app_shell.dart';
import '../shared/app_logo.dart';
import 'login_screen.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> with TickerProviderStateMixin {
  late AnimationController _entryController;
  late AnimationController _idleController;

  // Entry animations
  late Animation<double> _logoScale;
  late Animation<Offset> _logoSlide;
  late Animation<double> _logoOpacity;

  // Idle animations
  late Animation<double> _idleFloat;

  @override
  void initState() {
    super.initState();

    // Entry transition controller
    _entryController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    );

    // Floating idle animation controller
    _idleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3000),
    );

    // Config animations
    _logoScale = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(
        parent: _entryController,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOutBack),
      ),
    );

    _logoSlide = Tween<Offset>(begin: const Offset(0, 0.2), end: Offset.zero).animate(
      CurvedAnimation(
        parent: _entryController,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOutCubic),
      ),
    );

    _logoOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _entryController,
        curve: const Interval(0.0, 0.45, curve: Curves.easeIn),
      ),
    );

    _idleFloat = Tween<double>(begin: -6.0, end: 6.0).animate(
      CurvedAnimation(
        parent: _idleController,
        curve: Curves.easeInOut,
      ),
    );

    // Run animations
    _entryController.forward();
    _idleController.repeat(reverse: true);

    // Timeout redirection
    Timer(const Duration(milliseconds: 3200), () {
      if (mounted) {
        final auth = Provider.of<AuthProvider>(context, listen: false);
        Navigator.pushReplacement(
          context,
          PageRouteBuilder(
            pageBuilder: (context, animation, secondaryAnimation) =>
                auth.isAuthenticated ? const AppShell() : const LoginScreen(),
            transitionsBuilder: (context, animation, secondaryAnimation, child) {
              return FadeTransition(opacity: animation, child: child);
            },
            transitionDuration: const Duration(milliseconds: 800),
          ),
        );
      }
    });
  }

  @override
  void dispose() {
    _entryController.dispose();
    _idleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(0.0, -0.3),
            radius: 1.3,
            colors: [
              Colors.white,
              Color(0xFFFAFAFC),
              Color(0xFFF2F2F6),
            ],
          ),
        ),
        child: AnimatedBuilder(
          animation: Listenable.merge([_entryController, _idleController]),
          builder: (context, child) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Spacer(flex: 4),

                    // Floating Logo Box
                    Transform.translate(
                      offset: Offset(0, _idleFloat.value),
                      child: Transform.scale(
                        scale: _logoScale.value,
                        child: SlideTransition(
                          position: _logoSlide,
                          child: Opacity(
                            opacity: _logoOpacity.value,
                            child: Container(
                              padding: EdgeInsets.zero,
                              child: const AppLogo(
                                height: 64,
                                tintColor: Color(0xFFC7C9CF),
                                framed: false,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const Spacer(flex: 4),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
