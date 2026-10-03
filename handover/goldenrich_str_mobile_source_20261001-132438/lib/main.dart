import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'theme.dart';
import 'providers/auth_provider.dart';
import 'providers/property_provider.dart';
import 'providers/booking_provider.dart';
import 'providers/verification_provider.dart';
import 'providers/account_provider.dart';
import 'providers/ai_call_provider.dart';
import 'providers/admin_provider.dart';
import 'providers/notification_provider.dart';
import 'providers/support_ticket_provider.dart';
import 'providers/nearby_map_provider.dart';
import 'services/localization_service.dart';
import 'services/api_service.dart';
import 'views/shared/app_shell.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  GoogleFonts.config.allowRuntimeFetching = true;
  await ApiService().init();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => LocaleProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()..loadSession()),
        ChangeNotifierProvider(create: (_) => PropertyProvider()),
        ChangeNotifierProvider(create: (_) => BookingProvider()),
        ChangeNotifierProvider(create: (_) => VerificationProvider()),
        ChangeNotifierProvider(create: (_) => AccountProvider()),
        ChangeNotifierProvider(create: (_) => AICallProvider()),
        ChangeNotifierProvider(create: (_) => AdminProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
        ChangeNotifierProvider(create: (_) => SupportTicketProvider()),
        ChangeNotifierProvider(create: (_) => NearbyMapProvider()),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'X-Space360',
      theme: AppTheme.lightTheme,
      debugShowCheckedModeBanner: false,
      builder: (context, child) => const _ResponsiveAppShell()
          .wrap(context, child ?? const SizedBox.shrink()),
      home: const AppShell(),
    );
  }
}

class _ResponsiveAppShell extends StatelessWidget {
  const _ResponsiveAppShell();

  Widget wrap(BuildContext context, Widget child) =>
      buildWithChild(context, child);

  Widget buildWithChild(BuildContext context, Widget child) {
    final media = MediaQuery.of(context);
    final width = media.size.width;
    final height = media.size.height;
    final shortestSide = media.size.shortestSide;
    final currentScale = media.textScaler.scale(1);

    final maxScale = shortestSide < 340
        ? 0.82
        : shortestSide < 380
            ? 0.88
            : shortestSide < 430
                ? 0.96
                : 1.0;
    final minScale = height < 680 || width < 340 ? 0.78 : 0.84;
    final safeScale = currentScale.clamp(minScale, maxScale).toDouble();

    return ScrollConfiguration(
      behavior: const _MobileScrollBehavior(),
      child: MediaQuery(
        data: media.copyWith(
          textScaler: TextScaler.linear(safeScale),
          boldText: false,
        ),
        child: child,
      ),
    );
  }

  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}

class _MobileScrollBehavior extends ScrollBehavior {
  const _MobileScrollBehavior();

  @override
  ScrollPhysics getScrollPhysics(BuildContext context) {
    return const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics());
  }
}
