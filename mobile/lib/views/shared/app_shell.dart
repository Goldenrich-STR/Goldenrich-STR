import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../providers/auth_provider.dart';
import '../../services/localization_service.dart';
import '../../theme.dart';
import '../auth/login_screen.dart';
import '../guest/guest_browse_screen.dart';
import '../guest/guest_bookings_screen.dart';
import '../host/host_dashboard_screen.dart';
import '../broker/broker_dashboard_screen.dart';
import '../employee/employee_dashboard_screen.dart';
import '../admin/admin_dashboard_screen.dart';

class AppShell extends StatefulWidget {
  final int initialIndex;
  final String? initialSearchCity;
  final int? initialSearchGuests;
  final String? initialCategory;

  const AppShell({
    super.key,
    this.initialIndex = 0,
    this.initialSearchCity,
    this.initialSearchGuests,
    this.initialCategory,
  });

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  late int _selectedIndex;

  @override
  void initState() {
    super.initState();
    _selectedIndex = widget.initialIndex;
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;

    // Screens based on roles
    List<Widget> screens = [];
    List<BottomNavigationBarItem> navItems = [];

    if (user == null) {
      screens = [
        GuestBrowseScreen(
          initialCity: widget.initialSearchCity,
          initialGuests: widget.initialSearchGuests,
          initialCategory: widget.initialCategory,
        ),
        const _UnauthenticatedPlaceholder(
          title: 'Bookings',
          message: 'Please sign in to view and manage your property bookings.',
        ),
        const _UnauthenticatedPlaceholder(
          title: 'Profile',
          message: 'Please sign in to view your profile and account settings.',
        ),
      ];
      navItems = const [
        BottomNavigationBarItem(icon: Icon(Icons.search), label: 'Explore'),
        BottomNavigationBarItem(icon: Icon(Icons.bookmark_border), label: 'Bookings'),
        BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profile'),
      ];
    } else {
      final String role = user.role;
      if (role == 'guest') {
        screens = [
          GuestBrowseScreen(
            initialCity: widget.initialSearchCity,
            initialGuests: widget.initialSearchGuests,
            initialCategory: widget.initialCategory,
          ),
          const GuestBookingsScreen(),
          _ProfileTab(user: user, auth: auth),
        ];
        navItems = const [
          BottomNavigationBarItem(icon: Icon(Icons.search), label: 'Explore'),
          BottomNavigationBarItem(icon: Icon(Icons.bookmark_border), label: 'Bookings'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profile'),
        ];
      } else if (role == 'host') {
        screens = [
          const HostDashboardScreen(),
          _ProfileTab(user: user, auth: auth),
        ];
        navItems = const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profile'),
        ];
      } else if (role == 'broker') {
        screens = [
          const BrokerDashboardScreen(),
          _ProfileTab(user: user, auth: auth),
        ];
        navItems = const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profile'),
        ];
      } else if (role == 'employee') {
        screens = [
          const EmployeeDashboardScreen(),
          _ProfileTab(user: user, auth: auth),
        ];
        navItems = const [
          BottomNavigationBarItem(icon: Icon(Icons.rate_review_outlined), label: 'Reviews'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profile'),
        ];
      } else if (role == 'admin') {
        screens = [
          const AdminDashboardScreen(),
          _ProfileTab(user: user, auth: auth),
        ];
        navItems = const [
          BottomNavigationBarItem(icon: Icon(Icons.admin_panel_settings_outlined), label: 'Admin'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profile'),
        ];
      } else {
        screens = [
          const Center(child: Text('Unknown Role')),
          _ProfileTab(user: user, auth: auth),
        ];
        navItems = const [
          BottomNavigationBarItem(icon: Icon(Icons.error_outline), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profile'),
        ];
      }
    }

    // Guard selectedIndex if it goes out of bounds
    if (_selectedIndex >= screens.length) {
      _selectedIndex = 0;
    }

    return Scaffold(
      body: screens[_selectedIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: _onItemTapped,
        selectedItemColor: AppTheme.primary,
        unselectedItemColor: AppTheme.charcoalMuted,
        backgroundColor: AppTheme.white,
        elevation: 8,
        items: navItems,
      ),
    );
  }
}

class _ProfileTab extends StatelessWidget {
  final dynamic user;
  final AuthProvider auth;

  const _ProfileTab({required this.user, required this.auth});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final localeProvider = Provider.of<LocaleProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(localeProvider.translate('profile')),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const CircleAvatar(
              radius: 50,
              backgroundColor: AppTheme.stone,
              child: Icon(Icons.person, size: 50, color: AppTheme.secondary),
            ),
            const SizedBox(height: 16),
            Text(
              user.fullName,
              style: textTheme.displayMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              'Role: ${user.role.toUpperCase()}',
              style: textTheme.labelLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ListTile(
              leading: const Icon(Icons.email_outlined),
              title: Text(localeProvider.translate('email')),
              subtitle: Text(user.email),
            ),
            ListTile(
              leading: const Icon(Icons.phone_outlined),
              title: Text(localeProvider.translate('phone')),
              subtitle: Text(user.phone),
            ),
            ListTile(
              leading: const Icon(Icons.location_city_outlined),
              title: Text(localeProvider.translate('city')),
              subtitle: Text(user.city),
            ),
            const SizedBox(height: 16),
            // Language selector dropdown
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: DropdownButtonFormField<String>(
                initialValue: localeProvider.currentLocale,
                decoration: const InputDecoration(
                  labelText: 'App Language / भाषा / भाषा',
                  prefixIcon: Icon(Icons.language),
                ),
                items: const [
                  DropdownMenuItem(value: 'en', child: Text('English')),
                  DropdownMenuItem(value: 'hi', child: Text('हिंदी (Hindi)')),
                  DropdownMenuItem(value: 'mr', child: Text('मराठी (Marathi)')),
                ],
                onChanged: (val) {
                  if (val != null) {
                    localeProvider.setLocale(val);
                  }
                },
              ),
            ),
            const Spacer(),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.secondary),
              onPressed: () {
                auth.logout();
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (context) => const LoginScreen()),
                  (route) => false,
                );
              },
              child: Text(localeProvider.translate('sign_out')),
            ),
          ],
        ),
      ),
    );
  }
}

class _UnauthenticatedPlaceholder extends StatelessWidget {
  final String title;
  final String message;

  const _UnauthenticatedPlaceholder({required this.title, required this.message});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text(
          title,
          style: textTheme.displayMedium?.copyWith(color: AppTheme.charcoal),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32.0),
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
                child: Icon(
                  title == 'Bookings' ? Icons.bookmark_border : Icons.person_outline,
                  size: 64,
                  color: AppTheme.primary,
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Sign In Required',
              style: GoogleFonts.outfit(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: AppTheme.charcoal,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: GoogleFonts.manrope(
                fontSize: 14,
                color: AppTheme.charcoalMuted,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const LoginScreen()),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: Text(
                'Sign In Now',
                style: GoogleFonts.manrope(
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
