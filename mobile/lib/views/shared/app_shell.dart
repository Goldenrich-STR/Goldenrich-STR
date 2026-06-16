import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
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
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _selectedIndex = 0;

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;

    if (user == null) {
      return const LoginScreen();
    }

    final String role = user.role;
    
    // Screens based on roles
    List<Widget> screens = [];
    List<BottomNavigationBarItem> navItems = [];

    if (role == 'guest') {
      screens = [
        const GuestBrowseScreen(),
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
