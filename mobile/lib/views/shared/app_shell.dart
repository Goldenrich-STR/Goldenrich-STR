import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../providers/auth_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/property_provider.dart';
import '../../models/property_model.dart';
import '../../services/localization_service.dart';
import '../../theme.dart';
import '../auth/login_screen.dart';
import '../guest/guest_browse_screen.dart';
import '../guest/guest_bookings_screen.dart';
import '../guest/landing_screen.dart';
import '../guest/property_detail_screen.dart';
import '../guest/ai_chat_screen.dart';
import '../host/host_bookings_screen.dart';
import '../host/host_dashboard_screen.dart';
import '../host/host_my_properties_screen.dart';
import '../host/host_payouts_screen.dart';
import 'app_logo.dart';
import 'notifications_screen.dart';
import 'support_tickets_screen.dart';
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
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    _selectedIndex = widget.initialIndex;

    // Automatically push search/browse page if initial filters are provided
    if (widget.initialSearchCity != null || widget.initialCategory != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => GuestBrowseScreen(
              initialCity: widget.initialSearchCity,
              initialGuests: widget.initialSearchGuests,
              initialCategory: widget.initialCategory,
            ),
          ),
        );
      });
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<NotificationProvider>(context, listen: false)
          .loadUnreadCount();
    });
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  void _openHostMenu() {
    _scaffoldKey.currentState?.openDrawer();
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final notificationProvider = Provider.of<NotificationProvider>(context);
    final user = auth.currentUser;

    // Screens based on roles
    List<Widget> screens = [];
    List<BottomNavigationBarItem> navItems = [];

    if (user == null) {
      screens = [
        const LandingScreen(),
        const _WishlistsTab(isAuthenticated: false),
        const _UnauthenticatedPlaceholder(
          title: 'Trips',
          message: 'Please sign in to view and manage your property bookings.',
        ),
        const AIChatScreen(),
        const _UnauthenticatedPlaceholder(
          title: 'Profile',
          message: 'Please sign in to view your profile and account settings.',
        ),
      ];
      navItems = const [
        BottomNavigationBarItem(
            icon: Icon(Icons.search_rounded), label: 'Explore'),
        BottomNavigationBarItem(
            icon: Icon(Icons.favorite_border_rounded), label: 'Wishlists'),
        BottomNavigationBarItem(
            icon: Icon(Icons.luggage_outlined), label: 'Trips'),
        BottomNavigationBarItem(
            icon: Icon(Icons.chat_bubble_outline_rounded), label: 'AI Chat'),
        BottomNavigationBarItem(
            icon: Icon(Icons.person_outline_rounded), label: 'Log In'),
      ];
    } else {
      final String role = user.role;
      if (role == 'guest') {
        screens = [
          const LandingScreen(),
          const _WishlistsTab(isAuthenticated: true),
          const GuestBookingsScreen(),
          const AIChatScreen(),
          _ProfileTab(user: user, auth: auth),
        ];
        navItems = [
          const BottomNavigationBarItem(
              icon: Icon(Icons.search_rounded), label: 'Explore'),
          const BottomNavigationBarItem(
              icon: Icon(Icons.favorite_border_rounded), label: 'Wishlists'),
          const BottomNavigationBarItem(
              icon: Icon(Icons.luggage_outlined), label: 'Trips'),
          const BottomNavigationBarItem(
              icon: Icon(Icons.chat_bubble_outline_rounded), label: 'AI Chat'),
          BottomNavigationBarItem(
              icon: const Icon(Icons.person_outline_rounded),
              label: user.fullName.split(' ')[0]),
        ];
      } else if (role == 'host') {
        screens = [
          const HostDashboardScreen(),
          _ProfileTab(user: user, auth: auth),
        ];
        navItems = const [
          BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined), label: 'Dashboard'),
          BottomNavigationBarItem(
              icon: Icon(Icons.person_outline), label: 'Profile'),
        ];
      } else if (role == 'broker') {
        screens = [
          const BrokerDashboardScreen(),
          _ProfileTab(user: user, auth: auth),
        ];
        navItems = const [
          BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined), label: 'Dashboard'),
          BottomNavigationBarItem(
              icon: Icon(Icons.person_outline), label: 'Profile'),
        ];
      } else if (role == 'employee') {
        screens = [
          const EmployeeDashboardScreen(),
          _ProfileTab(user: user, auth: auth),
        ];
        navItems = const [
          BottomNavigationBarItem(
              icon: Icon(Icons.rate_review_outlined), label: 'Reviews'),
          BottomNavigationBarItem(
              icon: Icon(Icons.person_outline), label: 'Profile'),
        ];
      } else if (role == 'admin') {
        screens = [
          const AdminDashboardScreen(),
          _ProfileTab(user: user, auth: auth),
        ];
        navItems = const [
          BottomNavigationBarItem(
              icon: Icon(Icons.admin_panel_settings_outlined), label: 'Admin'),
          BottomNavigationBarItem(
              icon: Icon(Icons.person_outline), label: 'Profile'),
        ];
      } else {
        screens = [
          const Center(child: Text('Unknown Role')),
          _ProfileTab(user: user, auth: auth),
        ];
        navItems = const [
          BottomNavigationBarItem(
              icon: Icon(Icons.error_outline), label: 'Home'),
          BottomNavigationBarItem(
              icon: Icon(Icons.person_outline), label: 'Profile'),
        ];
      }
    }

    // Guard selectedIndex if it goes out of bounds
    if (_selectedIndex >= screens.length) {
      _selectedIndex = 0;
    }

    final bool isHost = user?.role == 'host';
    final bool isBroker = user?.role == 'broker';

    return Scaffold(
      key: _scaffoldKey,
      drawer: isHost
          ? _HostProfileDrawer(
              user: user!,
              auth: auth,
              unreadCount: notificationProvider.unreadCount,
              onDashboard: () {
                Navigator.pop(context);
                setState(() => _selectedIndex = 0);
              },
            )
          : isBroker
              ? _BrokerProfileDrawer(
                  user: user!,
                  auth: auth,
                  unreadCount: notificationProvider.unreadCount,
                  onDashboard: () {
                    Navigator.pop(context);
                    setState(() => _selectedIndex = 0);
                  },
                )
              : null,
      body: screens[_selectedIndex],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(color: Colors.grey[200]!, width: 1),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: _selectedIndex,
          onTap: (index) {
            if ((isHost || isBroker) && index == 1) {
              _openHostMenu();
              return;
            }
            _onItemTapped(index);
          },
          selectedItemColor: AppTheme.primary,
          unselectedItemColor: AppTheme.charcoalMuted,
          backgroundColor: AppTheme.white,
          elevation: 0,
          type: BottomNavigationBarType.fixed,
          selectedLabelStyle: GoogleFonts.manrope(
            fontSize: 10,
            fontWeight: FontWeight.bold,
          ),
          unselectedLabelStyle: GoogleFonts.manrope(
            fontSize: 10,
            fontWeight: FontWeight.w500,
          ),
          items: navItems,
        ),
      ),
    );
  }
}

class _HostProfileDrawer extends StatelessWidget {
  final dynamic user;
  final AuthProvider auth;
  final int unreadCount;
  final VoidCallback onDashboard;

  const _HostProfileDrawer({
    required this.user,
    required this.auth,
    required this.unreadCount,
    required this.onDashboard,
  });

  String get _initials {
    final parts = user.fullName
        .toString()
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();
    if (parts.isEmpty) return 'HM';
    if (parts.length == 1) {
      return parts.first.substring(0, 1).toUpperCase();
    }
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }

  void _push(BuildContext context, Widget screen) {
    Navigator.pop(context);
    Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
  }

  Future<void> _logout(BuildContext context) async {
    Navigator.pop(context);
    await auth.logout();
    if (!context.mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final drawerWidth = screenWidth < 420 ? screenWidth * 0.82 : 360.0;

    return Drawer(
      width: drawerWidth,
      backgroundColor: AppTheme.white,
      elevation: 18,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.horizontal(right: Radius.circular(30)),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(22, 22, 18, 18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const AppLogo(
                    height: 28,
                    tintColor: Colors.black,
                    framed: false,
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded),
                    color: AppTheme.primaryHover,
                    iconSize: 30,
                    tooltip: 'Close',
                  ),
                ],
              ),
              const SizedBox(height: 42),
              Row(
                children: [
                  CircleAvatar(
                    radius: 31,
                    backgroundColor: AppTheme.primary,
                    child: Text(
                      _initials,
                      style: GoogleFonts.manrope(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user.fullName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.manrope(
                            color: AppTheme.charcoal,
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          user.email,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.manrope(
                            color: AppTheme.charcoalMuted,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 34),
              const Divider(height: 1, color: AppTheme.border),
              const SizedBox(height: 20),
              Expanded(
                child: ListView(
                  padding: EdgeInsets.zero,
                  children: [
                    _HostDrawerItem(
                      icon: Icons.dashboard_outlined,
                      label: 'Dashboard',
                      selected: true,
                      onTap: onDashboard,
                    ),
                    _HostDrawerItem(
                      icon: Icons.home_outlined,
                      label: 'My Properties',
                      onTap: () => _push(
                        context,
                        const HostMyPropertiesScreen(),
                      ),
                    ),
                    _HostDrawerItem(
                      icon: Icons.calendar_month_outlined,
                      label: 'Bookings',
                      onTap: () => _push(context, const HostBookingsScreen()),
                    ),
                    _HostDrawerItem(
                      icon: Icons.account_balance_wallet_outlined,
                      label: 'Payouts',
                      onTap: () => _push(context, const HostPayoutsScreen()),
                    ),
                    _HostDrawerItem(
                      icon: Icons.notifications_none_rounded,
                      label: 'Notifications',
                      badge: unreadCount > 0 ? unreadCount.toString() : null,
                      onTap: () => _push(context, const NotificationsScreen()),
                    ),
                    _HostDrawerItem(
                      icon: Icons.chat_bubble_outline_rounded,
                      label: 'Support',
                      onTap: () => _push(context, const SupportTicketsScreen()),
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 18),
                      child: Divider(height: 1, color: AppTheme.border),
                    ),
                    _HostDrawerItem(
                      icon: Icons.person_outline_rounded,
                      label: 'Profile',
                      onTap: () =>
                          _push(context, _ProfileTab(user: user, auth: auth)),
                    ),
                    _HostDrawerItem(
                      icon: Icons.logout_rounded,
                      label: 'Logout',
                      destructive: true,
                      onTap: () => _logout(context),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BrokerProfileDrawer extends StatelessWidget {
  final dynamic user;
  final AuthProvider auth;
  final int unreadCount;
  final VoidCallback onDashboard;

  const _BrokerProfileDrawer({
    required this.user,
    required this.auth,
    required this.unreadCount,
    required this.onDashboard,
  });

  List<Map<String, dynamic>> get _sections => const [
        {
          'tab': 'owners',
          'label': 'My Hosts',
          'icon': Icons.people_outline,
        },
        {
          'tab': 'properties',
          'label': 'Properties',
          'icon': Icons.business_outlined,
        },
        {
          'tab': 'verifications',
          'label': 'Verifications',
          'icon': Icons.verified_user_outlined,
        },
        {
          'tab': 'leads',
          'label': 'Leads',
          'icon': Icons.track_changes_outlined,
        },
        {
          'tab': 'commissions',
          'label': 'Commissions',
          'icon': Icons.monetization_on_outlined,
        },
      ];

  String get _initials {
    final parts = user.fullName
        .toString()
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();
    if (parts.isEmpty) return 'BR';
    if (parts.length == 1) {
      return parts.first.substring(0, 1).toUpperCase();
    }
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }

  void _push(BuildContext context, Widget screen) {
    Navigator.pop(context);
    Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
  }

  Future<void> _logout(BuildContext context) async {
    Navigator.pop(context);
    await auth.logout();
    if (!context.mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final drawerWidth = screenWidth < 420 ? screenWidth * 0.82 : 360.0;

    return Drawer(
      width: drawerWidth,
      backgroundColor: AppTheme.white,
      elevation: 18,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.horizontal(right: Radius.circular(30)),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(22, 22, 18, 18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const AppLogo(
                    height: 28,
                    tintColor: Colors.black,
                    framed: false,
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded),
                    color: AppTheme.primaryHover,
                    iconSize: 30,
                    tooltip: 'Close',
                  ),
                ],
              ),
              const SizedBox(height: 42),
              Row(
                children: [
                  CircleAvatar(
                    radius: 31,
                    backgroundColor: AppTheme.primary,
                    child: Text(
                      _initials,
                      style: GoogleFonts.manrope(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user.fullName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.manrope(
                            color: AppTheme.charcoal,
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          user.email,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.manrope(
                            color: AppTheme.charcoalMuted,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 34),
              const Divider(height: 1, color: AppTheme.border),
              const SizedBox(height: 20),
              Expanded(
                child: ListView(
                  padding: EdgeInsets.zero,
                  children: [
                    _HostDrawerItem(
                      icon: Icons.dashboard_outlined,
                      label: 'Dashboard',
                      selected: true,
                      onTap: onDashboard,
                    ),
                    ..._sections.map(
                      (section) => _HostDrawerItem(
                        icon: section['icon'] as IconData,
                        label: section['label'] as String,
                        onTap: () => _push(
                          context,
                          BrokerDashboardScreen(
                            initialTab: section['tab'] as String,
                          ),
                        ),
                      ),
                    ),
                    _HostDrawerItem(
                      icon: Icons.notifications_none_rounded,
                      label: 'Notifications',
                      badge: unreadCount > 0 ? unreadCount.toString() : null,
                      onTap: () => _push(context, const NotificationsScreen()),
                    ),
                    _HostDrawerItem(
                      icon: Icons.chat_bubble_outline_rounded,
                      label: 'Support',
                      onTap: () => _push(context, const SupportTicketsScreen()),
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 18),
                      child: Divider(height: 1, color: AppTheme.border),
                    ),
                    _HostDrawerItem(
                      icon: Icons.person_outline_rounded,
                      label: 'Profile',
                      onTap: () =>
                          _push(context, _ProfileTab(user: user, auth: auth)),
                    ),
                    _HostDrawerItem(
                      icon: Icons.logout_rounded,
                      label: 'Logout',
                      destructive: true,
                      onTap: () => _logout(context),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HostDrawerItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final bool destructive;
  final String? badge;
  final VoidCallback onTap;

  const _HostDrawerItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.selected = false,
    this.destructive = false,
    this.badge,
  });

  @override
  Widget build(BuildContext context) {
    final foreground = destructive
        ? Colors.redAccent
        : selected
            ? AppTheme.primary
            : AppTheme.charcoal;
    final iconColor = destructive
        ? Colors.redAccent
        : selected
            ? AppTheme.primary
            : AppTheme.charcoalLight;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Material(
        color: selected
            ? AppTheme.primary.withValues(alpha: 0.10)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: SizedBox(
            height: 54,
            child: Row(
              children: [
                const SizedBox(width: 18),
                Icon(icon, color: iconColor, size: 25),
                const SizedBox(width: 20),
                Expanded(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.manrope(
                      color: foreground,
                      fontSize: 17,
                      fontWeight: selected ? FontWeight.w800 : FontWeight.w700,
                    ),
                  ),
                ),
                if (badge != null)
                  Container(
                    height: 32,
                    constraints: const BoxConstraints(minWidth: 32),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: Colors.redAccent.withValues(alpha: 0.28),
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      badge!,
                      style: GoogleFonts.manrope(
                        color: Colors.redAccent,
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                const SizedBox(width: 18),
              ],
            ),
          ),
        ),
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
              style:
                  ElevatedButton.styleFrom(backgroundColor: AppTheme.secondary),
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

  const _UnauthenticatedPlaceholder(
      {required this.title, required this.message});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    IconData getIcon() {
      if (title == 'Wishlists') {
        return Icons.favorite_border_rounded;
      } else if (title == 'Trips') {
        return Icons.luggage_outlined;
      } else if (title == 'Messages') {
        return Icons.chat_bubble_outline_rounded;
      } else {
        return Icons.person_outline_rounded;
      }
    }

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
                  getIcon(),
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

class _WishlistsTab extends StatelessWidget {
  final bool isAuthenticated;
  const _WishlistsTab({required this.isAuthenticated});

  @override
  Widget build(BuildContext context) {
    if (!isAuthenticated) {
      return const _UnauthenticatedPlaceholder(
        title: 'Wishlists',
        message: 'Log in to create and view wishlists of your favorite stays.',
      );
    }

    final propertyProvider = Provider.of<PropertyProvider>(context);
    final wishlist = propertyProvider.wishlistProperties;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(
          'Wishlists',
          style: GoogleFonts.manrope(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: wishlist.isEmpty
          ? Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(
                    Icons.favorite_border_rounded,
                    size: 64,
                    color: AppTheme.primary,
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Create your first wishlist',
                    style: GoogleFonts.manrope(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'As you search, tap the heart icon on any stay to save it to a wishlist.',
                    style: GoogleFonts.manrope(
                      fontSize: 14,
                      color: Colors.grey[600],
                      height: 1.5,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            )
          : ListView.builder(
              padding:
                  const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
              itemCount: wishlist.length,
              itemBuilder: (context, index) {
                final PropertyModel prop = wishlist[index];
                final double rating = 4.7 + (prop.title.hashCode % 31) * 0.01;
                return Container(
                  margin: const EdgeInsets.only(bottom: 24.0),
                  child: InkWell(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) =>
                              PropertyDetailScreen(propertyId: prop.propertyId),
                        ),
                      );
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Stack(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(16),
                              child: Image.network(
                                prop.images.isNotEmpty
                                    ? prop.images[0]
                                    : 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85',
                                height: 200,
                                width: double.infinity,
                                fit: BoxFit.cover,
                                errorBuilder: (context, _, __) => Container(
                                  height: 200,
                                  width: double.infinity,
                                  color: AppTheme.stone,
                                  child: const Icon(Icons.home,
                                      size: 40, color: AppTheme.secondary),
                                ),
                              ),
                            ),
                            Positioned(
                              top: 12,
                              right: 12,
                              child: GestureDetector(
                                onTap: () {
                                  propertyProvider
                                      .toggleWishlist(prop.propertyId);
                                },
                                child: Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: const BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.favorite_rounded,
                                    color: Colors.red,
                                    size: 20,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                prop.title,
                                style: GoogleFonts.manrope(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black87,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Row(
                              children: [
                                const Icon(Icons.star_rounded,
                                    size: 18, color: Colors.black87),
                                const SizedBox(width: 2),
                                Text(
                                  rating.toStringAsFixed(2),
                                  style: GoogleFonts.manrope(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.black87,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${prop.city}, ${prop.state}',
                          style: GoogleFonts.manrope(
                            fontSize: 14,
                            color: Colors.grey[600],
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '₹${prop.pricePerNight.toStringAsFixed(0)} / night',
                          style: GoogleFonts.manrope(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}

// ignore: unused_element
class _MessagesTab extends StatelessWidget {
  final bool isAuthenticated;
  const _MessagesTab({required this.isAuthenticated});

  @override
  Widget build(BuildContext context) {
    if (!isAuthenticated) {
      return const _UnauthenticatedPlaceholder(
        title: 'Messages',
        message: 'Please sign in to read and send messages.',
      );
    }
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(
          'Inbox',
          style: GoogleFonts.manrope(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(
              Icons.chat_bubble_outline_rounded,
              size: 64,
              color: AppTheme.primary,
            ),
            const SizedBox(height: 24),
            Text(
              'No new messages',
              style: GoogleFonts.manrope(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'When you contact hosts or book properties, your messages will appear here.',
              style: GoogleFonts.manrope(
                fontSize: 14,
                color: Colors.grey[600],
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
