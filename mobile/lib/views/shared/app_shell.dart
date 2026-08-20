import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../providers/auth_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/property_provider.dart';
import '../../models/property_model.dart';
import '../../config.dart';
import '../../services/api_service.dart';
import '../../services/localization_service.dart';
import '../../theme.dart';
import '../../utils/currency_formatter.dart';
import '../auth/login_screen.dart';
import '../guest/guest_browse_screen.dart';
import '../guest/landing_screen.dart';
import '../guest/guest_bookings_screen.dart';
import '../guest/property_detail_screen.dart';
import '../guest/ai_chat_screen.dart';
import '../host/host_bookings_screen.dart';
import '../host/host_dashboard_screen.dart';
import '../host/host_my_properties_screen.dart';
import '../host/host_performance_screen.dart';
import '../host/host_payouts_screen.dart';
import 'app_logo.dart';
import 'notifications_screen.dart';
import 'property_image.dart';
import 'public_info_screens.dart';
import 'support_tickets_screen.dart';
import '../broker/broker_dashboard_screen.dart';
import '../employee/employee_dashboard_screen.dart';
import '../admin/admin_dashboard_screen.dart';
import 'package:url_launcher/url_launcher.dart';

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
      final notifications =
          Provider.of<NotificationProvider>(context, listen: false);
      notifications.loadUnreadCount();
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
        _ModernProfileTab(user: null, auth: auth),
      ];
      navItems = const [
        BottomNavigationBarItem(icon: Icon(Icons.home_filled), label: 'Home'),
        BottomNavigationBarItem(
            icon: Icon(Icons.favorite_border_rounded), label: 'Wishlist'),
        BottomNavigationBarItem(
            icon: Icon(Icons.luggage_outlined), label: 'Trips'),
        BottomNavigationBarItem(
            icon: Icon(Icons.forum_outlined), label: 'Messages'),
        BottomNavigationBarItem(
            icon: Icon(Icons.person_outline_rounded), label: 'Profile'),
      ];
    } else {
      final String role = user.role;
      if (role == 'guest') {
        screens = [
          const LandingScreen(),
          const _WishlistsTab(isAuthenticated: true),
          const GuestBookingsScreen(),
          const AIChatScreen(),
          _ModernProfileTab(user: user, auth: auth),
        ];
        navItems = [
          const BottomNavigationBarItem(
              icon: Icon(Icons.home_filled), label: 'Home'),
          const BottomNavigationBarItem(
              icon: Icon(Icons.favorite_border_rounded), label: 'Wishlist'),
          const BottomNavigationBarItem(
              icon: Icon(Icons.luggage_outlined), label: 'Trips'),
          const BottomNavigationBarItem(
              icon: Icon(Icons.forum_outlined), label: 'Messages'),
          const BottomNavigationBarItem(
              icon: Icon(Icons.person_outline_rounded), label: 'Profile'),
        ];
      } else if (role == 'host') {
        screens = [
          const LandingScreen(),
          const _WishlistsTab(isAuthenticated: true),
          const HostDashboardScreen(),
          const AIChatScreen(),
          _ModernProfileTab(user: user, auth: auth),
        ];
        navItems = const [
          BottomNavigationBarItem(icon: Icon(Icons.home_filled), label: 'Home'),
          BottomNavigationBarItem(
              icon: Icon(Icons.favorite_border_rounded), label: 'Wishlist'),
          BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined), label: 'Dashboard'),
          BottomNavigationBarItem(
              icon: Icon(Icons.forum_outlined), label: 'Messages'),
          BottomNavigationBarItem(
              icon: Icon(Icons.person_outline), label: 'Profile'),
        ];
      } else if (role == 'broker') {
        screens = [
          const LandingScreen(),
          const _WishlistsTab(isAuthenticated: true),
          const BrokerDashboardScreen(),
          const AIChatScreen(),
          _ModernProfileTab(user: user, auth: auth),
        ];
        navItems = const [
          BottomNavigationBarItem(icon: Icon(Icons.home_filled), label: 'Home'),
          BottomNavigationBarItem(
              icon: Icon(Icons.favorite_border_rounded), label: 'Wishlist'),
          BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined), label: 'Broker'),
          BottomNavigationBarItem(
              icon: Icon(Icons.forum_outlined), label: 'Messages'),
          BottomNavigationBarItem(
              icon: Icon(Icons.person_outline), label: 'Profile'),
        ];
      } else if (role == 'employee') {
        final String? adminRole = user.adminRoleKey;
        final bool isRm =
            adminRole == 'rm' || adminRole == 'relationship_manager';
        screens = [
          const LandingScreen(),
          const _WishlistsTab(isAuthenticated: true),
          isRm
              ? const BrokerDashboardScreen()
              : const EmployeeDashboardScreen(),
          const AIChatScreen(),
          _ModernProfileTab(user: user, auth: auth),
        ];
        navItems = [
          const BottomNavigationBarItem(
              icon: Icon(Icons.home_filled), label: 'Home'),
          const BottomNavigationBarItem(
              icon: Icon(Icons.favorite_border_rounded), label: 'Wishlist'),
          BottomNavigationBarItem(
              icon: Icon(
                  isRm ? Icons.dashboard_outlined : Icons.rate_review_outlined),
              label: isRm ? 'Broker' : 'Reviews'),
          const BottomNavigationBarItem(
              icon: Icon(Icons.forum_outlined), label: 'Messages'),
          const BottomNavigationBarItem(
              icon: Icon(Icons.person_outline), label: 'Profile'),
        ];
      } else if (role == 'admin') {
        screens = [
          const LandingScreen(),
          const _WishlistsTab(isAuthenticated: true),
          const AdminDashboardScreen(),
          const AIChatScreen(),
          _ModernProfileTab(user: user, auth: auth),
        ];
        navItems = const [
          BottomNavigationBarItem(icon: Icon(Icons.home_filled), label: 'Home'),
          BottomNavigationBarItem(
              icon: Icon(Icons.favorite_border_rounded), label: 'Wishlist'),
          BottomNavigationBarItem(
              icon: Icon(Icons.admin_panel_settings_outlined), label: 'Admin'),
          BottomNavigationBarItem(
              icon: Icon(Icons.forum_outlined), label: 'Messages'),
          BottomNavigationBarItem(
              icon: Icon(Icons.person_outline), label: 'Profile'),
        ];
      } else {
        screens = [
          const Center(child: Text('Unknown Role')),
          _ModernProfileTab(user: user, auth: auth),
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
    final bool isBroker = user?.role == 'broker' ||
        (user?.role == 'employee' &&
            (user?.adminRoleKey == 'rm' ||
                user?.adminRoleKey == 'relationship_manager'));

    return Scaffold(
      key: _scaffoldKey,
      drawer: isHost
          ? _HostProfileDrawer(
              user: user!,
              auth: auth,
              unreadCount: notificationProvider.unreadCount,
              onDashboard: () {
                Navigator.pop(context);
                setState(() => _selectedIndex = 2);
              },
            )
          : isBroker
              ? _BrokerProfileDrawer(
                  user: user!,
                  auth: auth,
                  unreadCount: notificationProvider.unreadCount,
                  onDashboard: () {
                    Navigator.pop(context);
                    setState(() => _selectedIndex = 2);
                  },
                )
              : null,
      body: screens[_selectedIndex],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(
            top: BorderSide(color: Colors.grey[200]!, width: 1),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 18,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _selectedIndex,
          onTap: (index) {
            if ((isHost || isBroker) && index == 4) {
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
          iconSize: 22,
          selectedLabelStyle: GoogleFonts.manrope(
            fontSize: 11,
            fontWeight: FontWeight.w800,
          ),
          unselectedLabelStyle: GoogleFonts.manrope(
            fontSize: 11,
            fontWeight: FontWeight.w600,
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
  final String roleLabel = 'Host';

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
                        const SizedBox(height: 4),
                        Text(
                          '$roleLabel Dashboard',
                          style: GoogleFonts.manrope(
                            color: AppTheme.primary,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
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
                      label: 'View Dashboard',
                      selected: true,
                      onTap: onDashboard,
                    ),
                    _HostDrawerItem(
                      icon: Icons.home_filled,
                      label: 'Open Home',
                      onTap: () =>
                          _push(context, const AppShell(initialIndex: 0)),
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
                      icon: Icons.insights_outlined,
                      label: 'Performance',
                      onTap: () =>
                          _push(context, const HostPerformanceScreen()),
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
                      onTap: () => _push(
                          context, _ModernProfileTab(user: user, auth: auth)),
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
  final String roleLabel = 'Broker';

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
                        const SizedBox(height: 4),
                        Text(
                          '$roleLabel Dashboard',
                          style: GoogleFonts.manrope(
                            color: AppTheme.primary,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
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
                      label: 'View Dashboard',
                      selected: true,
                      onTap: onDashboard,
                    ),
                    _HostDrawerItem(
                      icon: Icons.home_filled,
                      label: 'Open Home',
                      onTap: () =>
                          _push(context, const AppShell(initialIndex: 0)),
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
                      onTap: () => _push(
                          context, _ModernProfileTab(user: user, auth: auth)),
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

class _ModernProfileTab extends StatefulWidget {
  final dynamic user;
  final AuthProvider auth;

  const _ModernProfileTab({required this.user, required this.auth});

  @override
  State<_ModernProfileTab> createState() => _ModernProfileTabState();
}

class _ModernProfileTabState extends State<_ModernProfileTab> {
  String _termsText =
      'By using X-Space360, users agree to follow booking, listing, verification, payment, cancellation, and platform conduct rules published by X-Space360.';
  String _privacyText =
      'X-Space360 respects your privacy. We collect only the information needed to manage accounts, property listings, bookings, support, verification, and secure platform operations.';
  String _refundText =
      'Refund timelines depend on cancellation window, booking status, property policy, and payment verification.';
  List<_LegalPolicyItem> _legalPolicies = [];
  bool _isDeactivating = false;

  @override
  void initState() {
    super.initState();
    _fetchCmsLegalContent();
  }

  Future<void> _fetchCmsLegalContent() async {
    try {
      final response = await ApiService().dio.get('/cms/landing-page');
      if (response.statusCode == 200 && response.data != null) {
        final footer = response.data['footer'];
        final legalTerms = response.data['legal_terms'];
        if (mounted) {
          setState(() {
            if ((footer['terms_text'] ?? '').toString().isNotEmpty) {
              _termsText = footer['terms_text'].toString();
            }
            if ((footer['privacy_text'] ?? '').toString().isNotEmpty) {
              _privacyText = footer['privacy_text'].toString();
            }
            if ((footer['refund_text'] ?? '').toString().isNotEmpty) {
              _refundText = footer['refund_text'].toString();
            }
            if (legalTerms != null) {
              if ((legalTerms['terms_text'] ?? '').toString().isNotEmpty) {
                _termsText = legalTerms['terms_text'].toString();
              }
              if ((legalTerms['privacy_text'] ?? '').toString().isNotEmpty) {
                _privacyText = legalTerms['privacy_text'].toString();
              }
              if ((legalTerms['refund_text'] ?? '').toString().isNotEmpty) {
                _refundText = legalTerms['refund_text'].toString();
              }
              _legalPolicies = _buildLegalPolicies(legalTerms);
            }
          });
        }
      }
    } catch (_) {}
  }

  List<_LegalPolicyItem> _buildLegalPolicies(dynamic legalTerms) {
    final items = <_LegalPolicyItem>[
      if (_privacyText.trim().isNotEmpty)
        _LegalPolicyItem(
          icon: Icons.privacy_tip_outlined,
          label: (legalTerms['privacy_label'] ?? 'Privacy Policy').toString(),
          title: 'Privacy Policy',
          content: _privacyText,
        ),
      if (_termsText.trim().isNotEmpty)
        _LegalPolicyItem(
          icon: Icons.gavel_outlined,
          label: (legalTerms['terms_label'] ?? 'Terms & Conditions').toString(),
          title: 'Terms & Conditions',
          content: _termsText,
        ),
      if (_refundText.trim().isNotEmpty)
        _LegalPolicyItem(
          icon: Icons.receipt_long_outlined,
          label: (legalTerms['refund_label'] ?? 'Refund Policy').toString(),
          title: 'Refund Policy',
          content: _refundText,
        ),
    ];

    final customPolicies = legalTerms['custom_policies'];
    if (customPolicies is List) {
      for (final policy in customPolicies) {
        if (policy is! Map) continue;
        final text = (policy['text'] ?? '').toString().trim();
        final status = (policy['status'] ?? '').toString().toLowerCase();
        if (text.isEmpty || status == 'archived') continue;

        items.add(
          _LegalPolicyItem(
            icon: policy['type'] == 'agreement'
                ? Icons.assignment_outlined
                : Icons.policy_outlined,
            label: (policy['label'] ?? policy['title'] ?? 'Legal Policy')
                .toString(),
            title: (policy['title'] ?? policy['label'] ?? 'Legal Policy')
                .toString(),
            content: text,
          ),
        );
      }
    }

    return items;
  }

  Future<void> _openWebPage(String path) async {
    final uri = Uri.parse('${AppConfig.webBaseUrl}$path');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  void _showDocumentDialog(String title, String content) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (_) => SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(22, 18, 22, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppTheme.border,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                title,
                style: GoogleFonts.manrope(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.charcoal,
                ),
              ),
              const SizedBox(height: 12),
              Flexible(
                child: SingleChildScrollView(
                  child: Text(
                    content,
                    style: GoogleFonts.manrope(
                      fontSize: 14,
                      height: 1.65,
                      color: AppTheme.charcoalMuted,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showLegalSheet() {
    final legalItems = _legalPolicies.isNotEmpty
        ? _legalPolicies
        : [
            _LegalPolicyItem(
              icon: Icons.privacy_tip_outlined,
              label: 'Privacy Policy',
              title: 'Privacy Policy',
              content: _privacyText,
            ),
            _LegalPolicyItem(
              icon: Icons.gavel_outlined,
              label: 'Terms & Conditions',
              title: 'Terms & Conditions',
              content: _termsText,
            ),
            _LegalPolicyItem(
              icon: Icons.receipt_long_outlined,
              label: 'Refund Policy',
              title: 'Refund Policy',
              content: _refundText,
            ),
          ];

    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (_) => SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(22, 18, 22, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ...legalItems.map(
                (item) => _ProfileOptionTile(
                  icon: item.icon,
                  label: item.label,
                  compact: true,
                  onTap: () {
                    Navigator.pop(context);
                    _showDocumentDialog(item.title, item.content);
                  },
                ),
              ),
              _ProfileOptionTile(
                icon: Icons.article_outlined,
                label: 'Open full legal pages in app',
                compact: true,
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => LegalPoliciesScreen(
                        policies: legalItems
                            .map(
                              (item) => LegalPolicyData(
                                label: item.label,
                                title: item.title,
                                content: item.content,
                              ),
                            )
                            .toList(),
                      ),
                    ),
                  );
                },
              ),
              _ProfileOptionTile(
                icon: Icons.open_in_browser_rounded,
                label: 'Open legal pages on website',
                compact: true,
                onTap: () {
                  Navigator.pop(context);
                  _openWebPage('/legal');
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showAccountSettings(dynamic user, LocaleProvider localeProvider) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (_) => SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(22, 18, 22, 26),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _ProfileInfoRow(
                icon: Icons.email_outlined,
                title: 'Email',
                value: user.email,
              ),
              _ProfileInfoRow(
                icon: Icons.phone_outlined,
                title: 'Phone',
                value: user.phone,
              ),
              _ProfileInfoRow(
                icon: Icons.location_city_outlined,
                title: 'City',
                value: user.city,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: localeProvider.currentLocale,
                decoration: const InputDecoration(
                  labelText: 'App Language',
                  prefixIcon: Icon(Icons.language_rounded),
                ),
                items: const [
                  DropdownMenuItem(value: 'en', child: Text('English')),
                  DropdownMenuItem(value: 'hi', child: Text('Hindi')),
                  DropdownMenuItem(value: 'mr', child: Text('Marathi')),
                ],
                onChanged: (val) {
                  if (val != null) {
                    localeProvider.setLocale(val);
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  bool _canSelfDelete(dynamic user) {
    final role = (user?.role ?? '').toString().toLowerCase();
    return role == 'host' || role == 'guest';
  }

  Future<void> _confirmDeleteAccount() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete account permanently?'),
        content: const Text(
          'Your account access will be removed and personal profile data will be deleted or anonymized. Booking, payment, tax, security, and legal records may be retained only for required periods.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red.shade700),
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Delete Account'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() => _isDeactivating = true);
    final success = await widget.auth.deleteAccount();
    if (!mounted) return;
    setState(() => _isDeactivating = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Account deletion completed.')),
      );
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(widget.auth.lastError ?? 'Unable to delete account.'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final localeProvider = Provider.of<LocaleProvider>(context);
    final user = widget.user;
    final media = MediaQuery.of(context);
    final unreadCount = context.watch<NotificationProvider>().unreadCount;
    final shortestSide = media.size.shortestSide;
    final isCompact = media.size.height < 700 || shortestSide < 360;
    final horizontalPadding = shortestSide < 360 ? 16.0 : 20.0;
    final topPadding = isCompact ? 10.0 : 16.0;
    final bottomPadding = media.padding.bottom + (isCompact ? 18.0 : 30.0);

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        bottom: false,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: ListView(
              padding: EdgeInsets.fromLTRB(
                horizontalPadding,
                topPadding,
                horizontalPadding,
                bottomPadding,
              ),
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              children: [
                _ProfileHeader(
                  compact: isCompact,
                  unreadCount: user == null ? 0 : unreadCount,
                  onBack: () {
                    if (Navigator.canPop(context)) {
                      Navigator.pop(context);
                    } else {
                      final state =
                          context.findAncestorStateOfType<_AppShellState>();
                      state?._onItemTapped(0);
                    }
                  },
                  onNotifications: () {
                    if (user == null) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const LoginScreen()),
                      );
                      return;
                    }
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => const NotificationsScreen()),
                    );
                  },
                ),
                SizedBox(height: isCompact ? 12 : 18),
                if (user == null)
                  _LoggedOutProfileCard(compact: isCompact)
                else
                  _ProfileHeroCard(user: user, compact: isCompact),
                SizedBox(height: isCompact ? 16 : 22),
                Container(
                  padding: EdgeInsets.symmetric(
                    horizontal: isCompact ? 10 : 14,
                    vertical: isCompact ? 6 : 8,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.06),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      _ProfileOptionTile(
                        icon: Icons.settings_outlined,
                        label: 'Account Settings',
                        subtitle: 'Manage your account preferences',
                        iconBackground: const Color(0xFFF7EBD8),
                        iconColor: AppTheme.primary,
                        compact: isCompact,
                        onTap: () {
                          if (user == null) {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                  builder: (_) => const LoginScreen()),
                            );
                            return;
                          }
                          _showAccountSettings(user, localeProvider);
                        },
                      ),
                      _ProfileOptionTile(
                        icon: Icons.help_outline_rounded,
                        label: 'Get Help',
                        subtitle: 'FAQs and customer support',
                        iconBackground: const Color(0xFFF0ECFF),
                        iconColor: const Color(0xFF11131A),
                        compact: isCompact,
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const SupportCenterScreen(),
                            ),
                          );
                        },
                      ),
                      _ProfileOptionTile(
                        icon: Icons.info_outline_rounded,
                        label: 'About X-Space360',
                        subtitle: 'Learn more about us',
                        iconBackground: const Color(0xFFEFF5FF),
                        iconColor: const Color(0xFF11131A),
                        compact: isCompact,
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (_) => const AboutUsScreen()),
                          );
                        },
                      ),
                      _ProfileOptionTile(
                        icon: Icons.policy_outlined,
                        label: 'Legal',
                        subtitle: 'Terms, conditions and policies',
                        iconBackground: const Color(0xFFEAF8EA),
                        iconColor: const Color(0xFF0F6A2D),
                        compact: isCompact,
                        showDivider: false,
                        onTap: _showLegalSheet,
                      ),
                    ],
                  ),
                ),
                if (user != null) ...[
                  const SizedBox(height: 24),
                  if (_canSelfDelete(user)) ...[
                    SizedBox(
                      height: 56,
                      child: OutlinedButton.icon(
                        onPressed:
                            _isDeactivating ? null : _confirmDeleteAccount,
                        icon: _isDeactivating
                            ? SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.red.shade700,
                                ),
                              )
                            : const Icon(Icons.delete_outline_rounded,
                                size: 24),
                        label: Text(
                            _isDeactivating ? 'Deleting...' : 'Delete Account'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red.shade700,
                          side: BorderSide(
                              color: Colors.red.shade200, width: 1.4),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(15),
                          ),
                          textStyle: GoogleFonts.manrope(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  SizedBox(
                    height: 56,
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        await widget.auth.logout();
                        if (!context.mounted) return;
                        Navigator.pushAndRemoveUntil(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const LoginScreen()),
                          (route) => false,
                        );
                      },
                      icon: const Icon(Icons.logout_rounded, size: 24),
                      label: Text(localeProvider.translate('sign_out')),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1F2026),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(15),
                        ),
                        textStyle: GoogleFonts.manrope(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Center(
                    child: Text(
                      'Version 1.0.0',
                      style: GoogleFonts.manrope(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.charcoalMuted,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  final VoidCallback onBack;
  final VoidCallback onNotifications;
  final int unreadCount;
  final bool compact;

  const _ProfileHeader({
    required this.onBack,
    required this.onNotifications,
    required this.unreadCount,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        IconButton(
          onPressed: onBack,
          icon: const Icon(Icons.arrow_back_rounded),
          color: const Color(0xFF11131A),
          iconSize: compact ? 23 : 26,
          visualDensity: VisualDensity.compact,
          padding: EdgeInsets.zero,
          constraints: BoxConstraints.tightFor(
            width: compact ? 36 : 42,
            height: compact ? 36 : 42,
          ),
        ),
        SizedBox(width: compact ? 6 : 8),
        Expanded(
          child: Text(
            'Profile',
            style: GoogleFonts.manrope(
              fontSize: compact ? 24 : 30,
              height: 1,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF11131A),
            ),
          ),
        ),
        Stack(
          clipBehavior: Clip.none,
          children: [
            IconButton(
              onPressed: onNotifications,
              icon: const Icon(Icons.notifications_none_rounded),
              color: const Color(0xFF11131A),
              iconSize: compact ? 23 : 27,
              visualDensity: VisualDensity.compact,
              padding: EdgeInsets.zero,
              constraints: BoxConstraints.tightFor(
                width: compact ? 36 : 42,
                height: compact ? 36 : 42,
              ),
            ),
            if (unreadCount > 0)
              Positioned(
                top: 10,
                right: 11,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE53935),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 1.5),
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _LoggedOutProfileCard extends StatelessWidget {
  final bool compact;

  const _LoggedOutProfileCard({this.compact = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(compact ? 14 : 18),
      decoration: BoxDecoration(
        color: const Color(0xFFF6EFE5),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Log in and start planning your next trip.',
            style: GoogleFonts.manrope(
              fontSize: compact ? 12 : 13,
              color: AppTheme.charcoalMuted,
              height: 1.5,
            ),
          ),
          SizedBox(height: compact ? 10 : 14),
          SizedBox(
            height: compact ? 44 : 48,
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: Text(
                'Log in or sign up',
                style: GoogleFonts.manrope(
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileHeroCard extends StatelessWidget {
  final dynamic user;
  final bool compact;

  const _ProfileHeroCard({required this.user, this.compact = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: compact ? 112 : 124,
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 14 : 18,
        vertical: compact ? 14 : 18,
      ),
      decoration: BoxDecoration(
        color: const Color(0xFFF6EFE5),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -30,
            top: -42,
            child: Container(
              width: 135,
              height: 135,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.16),
              ),
            ),
          ),
          Row(
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: compact ? 68 : 78,
                    height: compact ? 68 : 78,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.08),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Icon(
                      Icons.person_outline_rounded,
                      color: AppTheme.primary,
                      size: compact ? 33 : 38,
                    ),
                  ),
                  Positioned(
                    right: -2,
                    bottom: 2,
                    child: Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.10),
                            blurRadius: 12,
                            offset: const Offset(0, 5),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.camera_alt_outlined,
                        color: AppTheme.charcoal,
                        size: 17,
                      ),
                    ),
                  ),
                ],
              ),
              SizedBox(width: compact ? 14 : 18),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user.fullName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.manrope(
                        fontSize: compact ? 18 : 20,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF11131A),
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      user.email,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.manrope(
                        fontSize: 12,
                        color: AppTheme.charcoalMuted,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.58),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        'Role: ${user.role.toUpperCase()}',
                        style: GoogleFonts.manrope(
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          color: AppTheme.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _LegalPolicyItem {
  final IconData icon;
  final String label;
  final String title;
  final String content;

  const _LegalPolicyItem({
    required this.icon,
    required this.label,
    required this.title,
    required this.content,
  });
}

class _ProfileOptionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? subtitle;
  final VoidCallback onTap;
  final bool compact;
  final Color iconBackground;
  final Color iconColor;
  final bool showDivider;

  const _ProfileOptionTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.subtitle,
    this.compact = false,
    this.iconBackground = Colors.transparent,
    this.iconColor = AppTheme.charcoal,
    this.showDivider = true,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: compact ? 0 : 2,
          vertical: compact ? 7 : 12,
        ),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: showDivider ? Colors.grey.shade200 : Colors.transparent,
            ),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: iconBackground,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: iconColor, size: 23),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: GoogleFonts.manrope(
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF11131A),
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 3),
                    Text(
                      subtitle!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.manrope(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: AppTheme.charcoalMuted,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right_rounded,
              color: AppTheme.charcoalMuted,
              size: 22,
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileInfoRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;

  const _ProfileInfoRow({
    required this.icon,
    required this.title,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppTheme.charcoalMuted, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.manrope(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.charcoalMuted,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  value.isEmpty ? '-' : value,
                  style: GoogleFonts.manrope(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.charcoal,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class LegacyProfileDashboardScreen extends StatelessWidget {
  final dynamic user;
  final AuthProvider auth;

  const LegacyProfileDashboardScreen({
    super.key,
    required this.user,
    required this.auth,
  });

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
                            PropertyImage(
                              imageUrl: prop.images.isNotEmpty
                                  ? prop.images[0]
                                  : null,
                              height: 200,
                              width: double.infinity,
                              borderRadius: BorderRadius.circular(16),
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
                          '${CurrencyFormatter.format(prop.customerDisplayPrice)}${prop.pricingUnitSuffix}',
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
