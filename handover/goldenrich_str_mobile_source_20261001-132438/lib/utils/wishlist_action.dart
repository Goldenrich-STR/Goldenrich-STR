import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../providers/property_provider.dart';
import '../theme.dart';
import '../views/auth/login_screen.dart';

Future<void> handleWishlistTap(
  BuildContext context,
  String propertyId,
) async {
  final auth = context.read<AuthProvider>();
  final propertyProvider = context.read<PropertyProvider>();

  if (auth.isAuthenticated) {
    propertyProvider.toggleWishlist(propertyId);
    return;
  }

  final signedIn = await Navigator.push<bool>(
    context,
    MaterialPageRoute(
      builder: (_) => const _WishlistSignInRequiredScreen(),
    ),
  );

  if (signedIn == true && context.mounted) {
    context.read<PropertyProvider>().addWishlist(propertyId);
  }
}

class _WishlistSignInRequiredScreen extends StatelessWidget {
  const _WishlistSignInRequiredScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Wishlists'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: const BoxDecoration(
                  color: AppTheme.stone,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.favorite_border_rounded,
                  size: 64,
                  color: AppTheme.primary,
                ),
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Sign In Required',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: AppTheme.charcoal,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Log in to create and view wishlists of your favorite stays.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: AppTheme.charcoalMuted,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () async {
                final result = await Navigator.push<bool>(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const LoginScreen(popOnSuccess: true),
                  ),
                );
                if (!context.mounted) return;
                if (result == true) {
                  Navigator.pop(context, true);
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: const Text(
                'Sign In Now',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
