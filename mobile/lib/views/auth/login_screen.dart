import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../providers/auth_provider.dart';
import '../../theme.dart';
import '../../config.dart';
import 'password_recovery_screen.dart';
import '../shared/app_shell.dart';
import '../shared/app_logo.dart';
import '../../services/api_service.dart';
import 'package:flutter/gestures.dart';

const List<String> _indianCities = [
  'Mumbai',
  'Delhi',
  'Bengaluru',
  'Hyderabad',
  'Ahmedabad',
  'Chennai',
  'Kolkata',
  'Pune',
  'Jaipur',
  'Surat',
  'Lucknow',
  'Kanpur',
  'Nagpur',
  'Indore',
  'Thane',
  'Bhopal',
  'Visakhapatnam',
  'Pimpri-Chinchwad',
  'Patna',
  'Vadodara',
  'Ghaziabad',
  'Ludhiana',
  'Agra',
  'Nashik',
  'Faridabad',
  'Meerut',
  'Rajkot',
  'Kalyan-Dombivli',
  'Vasai-Virar',
  'Varanasi',
  'Srinagar',
  'Aurangabad',
  'Dhanbad',
  'Amritsar',
  'Navi Mumbai',
  'Allahabad',
  'Prayagraj',
  'Ranchi',
  'Howrah',
  'Coimbatore',
  'Jabalpur',
  'Gwalior',
  'Vijayawada',
  'Jodhpur',
  'Madurai',
  'Raipur',
  'Kota',
  'Guwahati',
  'Chandigarh',
  'Solapur',
  'Hubballi',
  'Dharwad',
  'Bareilly',
  'Mysuru',
  'Mysore',
  'Tiruchirappalli',
  'Tiruppur',
  'Gurgaon',
  'Gurugram',
  'Aligarh',
  'Jalandhar',
  'Bhubaneswar',
  'Salem',
  'Warangal',
  'Mira-Bhayandar',
  'Thiruvananthapuram',
  'Bhiwandi',
  'Saharanpur',
  'Guntur',
  'Amravati',
  'Bikaner',
  'Noida',
  'Jamshedpur',
  'Bhilai',
  'Cuttack',
  'Firozabad',
  'Kochi',
  'Nellore',
  'Bhavnagar',
  'Dehradun',
  'Durgapur',
  'Asansol',
  'Rourkela',
  'Nanded',
  'Kolhapur',
  'Ajmer',
  'Akola',
  'Gulbarga',
  'Jamnagar',
  'Ujjain',
  'Loni',
  'Siliguri',
  'Jhansi',
  'Ulhasnagar',
  'Jammu',
  'Sangli',
  'Mangalore',
  'Erode',
  'Belgaum',
  'Belagavi',
  'Ambattur',
  'Tirunelveli',
  'Malegaon',
  'Gaya',
  'Jalgaon',
  'Udaipur',
  'Maheshtala',
  'Davanagere',
  'Kozhikode',
  'Kurnool',
  'Rajpur Sonarpur',
  'Rajahmundry',
  'Bokaro',
  'South Dumdum',
  'Bellary',
  'Patiala',
  'Gopalpur',
  'Agartala',
  'Bhagalpur',
  'Muzaffarnagar',
  'Bhatpara',
  'Panihati',
  'Latur',
  'Dhule',
  'Rohtak',
  'Korba',
  'Bhilwara',
  'Brahmapur',
  'Muzaffarpur',
  'Ahmednagar',
  'Mathura',
  'Kollam',
  'Avadi',
  'Kadapa',
  'Kamarhati',
  'Sambalpur',
  'Bilaspur',
  'Shahjahanpur',
  'Satara',
  'Bijapur',
  'Rampur',
  'Shivamogga',
  'Chandrapur',
  'Junagadh',
  'Thrissur',
  'Alwar',
  'Bardhaman',
  'Kulti',
  'Kakinada',
  'Nizamabad',
  'Parbhani',
  'Tumkur',
  'Khammam',
  'Ozhukarai',
  'Bihar Sharif',
  'Panipat',
  'Darbhanga',
  'Bally',
  'Aizawl',
  'Dewas',
  'Ichalkaranji',
  'Karnal',
  'Bathinda',
  'Jalna',
  'Eluru',
  'Kirari Suleman Nagar',
  'Barabanki',
  'Purnia',
  'Satna',
  'Mau',
  'Sonipat',
  'Farrukhabad',
  'Sagar',
  'Rourkela',
  'Durg',
  'Imphal',
  'Ratlam',
  'Hapur',
  'Anantapur',
  'Arrah',
  'Karimnagar',
  'Etawah',
  'Ambarnath',
  'North Dumdum',
  'Bharatpur',
  'Begusarai',
  'New Delhi',
  'Gandhidham',
  'Baranagar',
  'Tiruvottiyur',
  'Puducherry',
  'Sikar',
  'Thoothukudi',
  'Rewa',
  'Mirzapur',
  'Raichur',
  'Pali',
  'Ramagundam',
  'Haridwar',
  'Vijayanagaram',
  'Katihar',
  'Nagercoil',
  'Sri Ganganagar',
  'Karawal Nagar',
  'Mango',
  'Thanjavur',
  'Bulandshahr',
  'Uluberia',
  'Murwara',
  'Sambhal',
  'Singrauli',
  'Nadiad',
  'Secunderabad',
  'Nashik',
];

class LoginScreen extends StatefulWidget {
  final bool popOnSuccess;
  final bool initialSignUpMode;
  final String initialRole;

  const LoginScreen({
    super.key,
    this.popOnSuccess = false,
    this.initialSignUpMode = false,
    this.initialRole = 'guest',
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _AuthHero extends StatelessWidget {
  final VoidCallback onLogoTap;

  const _AuthHero({
    required this.onLogoTap,
  });

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.sizeOf(context);
    final isCompact = media.width < 430 || media.height < 900;
    final heroTitleSize = isCompact ? 28.0 : 42.0;
    final heroSubtitleSize = isCompact ? 13.0 : 19.0;

    return Stack(
      fit: StackFit.expand,
      children: [
        Image.asset(
          'assets/images/hero_villa.jpg',
          fit: BoxFit.cover,
        ),
        Positioned.fill(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.08),
                  Colors.black.withValues(alpha: 0.44),
                  Colors.black.withValues(alpha: 0.62),
                ],
              ),
            ),
          ),
        ),
        SafeArea(
          bottom: false,
          child: Padding(
            padding: EdgeInsets.fromLTRB(
              isCompact ? 18 : 28,
              isCompact ? 16 : 26,
              isCompact ? 18 : 28,
              0,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: onLogoTap,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(14),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.18),
                                blurRadius: 18,
                                offset: const Offset(0, 6),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              AppLogo(height: isCompact ? 30 : 40),
                              SizedBox(height: isCompact ? 3 : 5),
                              Text(
                                'Find. Book. Enjoy.',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.inter(
                                  fontSize: isCompact ? 11.5 : 18,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white.withValues(alpha: 0.94),
                                  shadows: [
                                    Shadow(
                                      color:
                                          Colors.black.withValues(alpha: 0.35),
                                      blurRadius: 8,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: isCompact ? 22 : 54),
                Flexible(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.topLeft,
                    child: SizedBox(
                      width: media.width - (isCompact ? 36 : 56),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Book a Room.',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(
                              fontSize: heroTitleSize,
                              height: 1.02,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Enjoy A Villa Getaway',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(
                              fontSize: heroTitleSize,
                              height: 1.02,
                              fontWeight: FontWeight.w900,
                              color: AppTheme.primary,
                            ),
                          ),
                          SizedBox(height: isCompact ? 7 : 14),
                          Text(
                            'Enjoy the luxuries and privacy of a villa\nwith curated premium stays.',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(
                              fontSize: heroSubtitleSize,
                              height: 1.32,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                          if (!isCompact || media.height > 760) ...[
                            SizedBox(height: isCompact ? 10 : 18),
                            Container(
                              padding: EdgeInsets.symmetric(
                                  horizontal: isCompact ? 14 : 20,
                                  vertical: isCompact ? 9 : 14),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.14),
                                borderRadius: BorderRadius.circular(19),
                                border: Border.all(
                                  color:
                                      AppTheme.primary.withValues(alpha: 0.95),
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.local_offer_outlined,
                                      color: AppTheme.primary,
                                      size: isCompact ? 18 : 24),
                                  SizedBox(width: isCompact ? 8 : 10),
                                  Flexible(
                                    child: Text(
                                      'Rooms Starting at ₹5,000+',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: GoogleFonts.inter(
                                        fontSize: isCompact ? 13 : 16,
                                        fontWeight: FontWeight.w900,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _LoginScreenState extends State<LoginScreen> {
  static const int _otpValiditySeconds = 120;
  final _formKey = GlobalKey<FormState>();

  // Navigation & Flow state
  // 0: Phone or Email Input (Image 1 screen)
  // 1: Password Input (Email sign in)
  // 2: OTP Input (Phone verification)
  // 3: Complete registration details
  int _step = 0;
  bool _isSignUpMode = false;
  int _logoTapCount = 0;

  // Controllers
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  final List<TextEditingController> _otpDigitControllers =
      List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _otpFocusNodes = List.generate(6, (_) => FocusNode());
  final _emailRegController = TextEditingController();
  final _fullNameController = TextEditingController();
  final _passwordRegController = TextEditingController();
  final _cityController = TextEditingController();
  final _cityFocusNode = FocusNode();
  final _lgCodeController = TextEditingController();
  final _employeeCodeController = TextEditingController();

  String _selectedRole = 'guest';
  String? _errorMessage;
  bool _acceptTerms = false;
  bool _showSignInPassword = false;
  bool _showRegistrationPassword = false;
  bool _rememberMe = true;
  Timer? _otpCountdownTimer;
  int _otpSecondsRemaining = 0;
  List<Map<String, dynamic>> _availableBrokers = [];
  List<Map<String, dynamic>> _availableEmployees = [];
  String _registrationPassword = '';

  late TapGestureRecognizer _termsRecognizer;
  late TapGestureRecognizer _privacyRecognizer;
  late TapGestureRecognizer _checkinRecognizer;

  String _termsText =
      'By using X-Space360, users agree to follow booking, listing, verification, payment, cancellation, and platform conduct rules published by X-Space360.';
  String _privacyText =
      'X-Space360 respects your privacy. We collect only the information needed to manage accounts, property listings, bookings, support, verification, and secure platform operations.';
  String _checkinText =
      'Standard check-in time starts at 2:00 PM. Please present your valid Government ID upon arrival. Quiet hours are from 10:00 PM to 7:00 AM.';

  String get _otpTimerLabel {
    final minutes = (_otpSecondsRemaining ~/ 60).toString().padLeft(2, '0');
    final seconds = (_otpSecondsRemaining % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  Map<String, dynamic>? get _selectedPrimaryAssignment {
    final code = _lgCodeController.text.trim();
    if (code.isEmpty) return null;
    for (final item in _availableBrokers) {
      if ((item['lg_code'] ?? '').toString().trim() == code) {
        return item;
      }
    }
    return null;
  }

  List<Map<String, dynamic>> get _secondaryAssignmentOptions {
    final primary = _selectedPrimaryAssignment;
    if (primary == null) return [];
    if (primary['assignment_type'] == 'broker') {
      return _availableBrokers
          .where((item) => item['assignment_type'] == 'rm')
          .toList();
    }
    if (primary['assignment_type'] == 'rm') {
      return _availableEmployees;
    }
    return [];
  }

  String get _secondaryAssignmentCodeKey =>
      _selectedPrimaryAssignment?['assignment_type'] == 'broker'
          ? 'lg_code'
          : 'employee_code';

  String get _secondaryAssignmentLabel =>
      _selectedPrimaryAssignment?['assignment_type'] == 'broker'
          ? 'BRANCH MANAGER / RM CODE'
          : 'BRANCH MANAGER / RM CODE';

  String get _secondaryAssignmentHint {
    final primary = _selectedPrimaryAssignment;
    if (primary == null) return '-- Select Broker / RM first --';
    return primary['assignment_type'] == 'broker'
        ? '-- Select RM Code --'
        : '-- Select Branch Manager Code --';
  }

  Map<String, bool> _passwordRuleStatus(String password) {
    return {
      'Minimum 8 characters': password.length >= 8,
      'Maximum 32 characters': password.length <= 32,
      'At least 1 uppercase letter (A-Z)': RegExp(r'[A-Z]').hasMatch(password),
      'At least 1 lowercase letter (a-z)': RegExp(r'[a-z]').hasMatch(password),
      'At least 1 number (0-9)': RegExp(r'[0-9]').hasMatch(password),
      'At least 1 special character':
          RegExp(r'[^A-Za-z0-9\s]').hasMatch(password),
      'No spaces allowed': !RegExp(r'\s').hasMatch(password),
    };
  }

  String? _passwordValidationError(String password) {
    final rules = _passwordRuleStatus(password);
    if (password.isEmpty) return 'Enter password';
    for (final entry in rules.entries) {
      if (!entry.value) return entry.key;
    }
    return null;
  }

  @override
  void initState() {
    super.initState();
    _isSignUpMode = widget.initialSignUpMode;
    _selectedRole = widget.initialRole;
    _termsRecognizer = TapGestureRecognizer()
      ..onTap = () => _showDocumentDialog('Terms & Conditions', _termsText);
    _privacyRecognizer = TapGestureRecognizer()
      ..onTap = () => _showDocumentDialog('Privacy Policy', _privacyText);
    _checkinRecognizer = TapGestureRecognizer()
      ..onTap =
          () => _showDocumentDialog('Check-in Instructions', _checkinText);
    _fetchCmsContent();
    _fetchBrokersAndEmployees();
  }

  Future<void> _fetchCmsContent() async {
    try {
      final response = await ApiService().dio.get('/cms/landing-page');
      if (response.statusCode == 200 && response.data != null) {
        final footer = response.data['footer'];
        if (footer != null) {
          setState(() {
            if (footer['terms_text'] != null &&
                footer['terms_text'].toString().isNotEmpty) {
              _termsText = footer['terms_text'];
            }
            if (footer['privacy_text'] != null &&
                footer['privacy_text'].toString().isNotEmpty) {
              _privacyText = footer['privacy_text'];
            }
            if (footer['checkin_text'] != null &&
                footer['checkin_text'].toString().isNotEmpty) {
              _checkinText = footer['checkin_text'];
            }
          });
        }
      }
    } catch (e) {
      debugPrint('Error fetching CMS landing page content: $e');
    }
  }

  Future<void> _fetchBrokersAndEmployees() async {
    try {
      final response =
          await ApiService().dio.get('/auth/public/brokers-and-employees');
      if (response.statusCode == 200 && response.data != null) {
        final brokers = response.data['brokers'];
        final employees = response.data['employees'];
        if (mounted) {
          setState(() {
            _availableBrokers = brokers is List
                ? brokers
                    .map((item) => Map<String, dynamic>.from(item as Map))
                    .toList()
                : [];
            _availableEmployees = employees is List
                ? employees
                    .map((item) => Map<String, dynamic>.from(item as Map))
                    .toList()
                : [];
          });
        }
      }
    } catch (e) {
      debugPrint('Error fetching brokers and employees: $e');
    }
  }

  void _showDocumentDialog(String title, String content) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          insetPadding:
              const EdgeInsets.symmetric(horizontal: 18, vertical: 28),
          contentPadding: EdgeInsets.zero,
          actionsPadding: EdgeInsets.zero,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          content: ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: SizedBox(
              width: 560,
              height: MediaQuery.of(context).size.height * 0.72,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(22, 22, 12, 18),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'X-SPACE360 LEGAL DOCUMENT',
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0,
                                  color: AppTheme.primary,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                title,
                                style: GoogleFonts.inter(
                                  fontSize: 24,
                                  height: 1.05,
                                  fontWeight: FontWeight.w900,
                                  color: AppTheme.secondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(Icons.close),
                          color: AppTheme.charcoalMuted,
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1, color: AppTheme.border),
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(22, 22, 22, 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppTheme.stone,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppTheme.border),
                            ),
                            child: Text(
                              'Please read this document carefully. It explains the agreement and policy terms that apply when you use X-Space360.',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                height: 1.45,
                                color: AppTheme.charcoalLight,
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                          ..._buildLegalDocumentContent(content),
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(22, 0, 22, 18),
                    child: SizedBox(
                      height: 44,
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        child: Text(
                          'CLOSE',
                          style: GoogleFonts.inter(
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  List<Widget> _buildLegalDocumentContent(String content) {
    final lines = content
        .split(RegExp(r'\r?\n'))
        .map((line) => line.trim())
        .where((line) => line.isNotEmpty)
        .toList();

    if (lines.isEmpty) {
      return [
        Text(
          'This document is currently being updated by the administrator.',
          style: GoogleFonts.inter(
            fontSize: 14,
            height: 1.55,
            color: AppTheme.charcoalLight,
          ),
        ),
      ];
    }

    return lines.map((line) {
      final isHeading = line.startsWith('#') ||
          line == line.toUpperCase() && line.length <= 64;
      final cleaned = line.replaceFirst(RegExp(r'^#+\s*'), '');

      if (isHeading) {
        return Padding(
          padding: const EdgeInsets.only(top: 2, bottom: 12),
          child: Text(
            cleaned,
            style: GoogleFonts.inter(
              fontSize: 15,
              height: 1.35,
              fontWeight: FontWeight.w900,
              letterSpacing: 0,
              color: AppTheme.secondary,
            ),
          ),
        );
      }

      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Text(
          cleaned,
          style: GoogleFonts.inter(
            fontSize: 14,
            height: 1.6,
            color: AppTheme.charcoalLight,
          ),
        ),
      );
    }).toList();
  }

  InputDecoration _registrationInputDecoration({
    required String hintText,
    required IconData icon,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      hintText: hintText,
      hintStyle: _inputHintStyle,
      prefixIcon: Icon(icon, color: AppTheme.charcoalMuted),
      suffixIcon: suffixIcon,
      filled: true,
      fillColor: AppTheme.stone,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: AppTheme.primary, width: 1.4),
      ),
    );
  }

  TextStyle get _inputTextStyle => GoogleFonts.inter(
        fontSize: 15,
        fontWeight: FontWeight.w600,
        color: AppTheme.charcoal,
      );

  TextStyle get _inputHintStyle => GoogleFonts.inter(
        fontSize: 15,
        fontWeight: FontWeight.w500,
        color: AppTheme.charcoalMuted,
      );

  Widget _buildRegistrationDropdown({
    required String label,
    required String hint,
    required String? value,
    required List<Map<String, dynamic>> items,
    required String codeKey,
    required ValueChanged<String?> onChanged,
  }) {
    final seenCodes = <String>{};
    final uniqueItems = items.where((item) {
      final code = item[codeKey]?.toString().trim();
      if (code == null || code.isEmpty || seenCodes.contains(code)) {
        return false;
      }
      seenCodes.add(code);
      return true;
    }).toList();
    final selectedValue =
        value != null && seenCodes.contains(value.trim()) ? value.trim() : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: FontWeight.bold,
            color: AppTheme.charcoal,
            letterSpacing: 0,
          ),
        ),
        const SizedBox(height: 6),
        DropdownButtonFormField<String>(
          initialValue: selectedValue,
          isExpanded: true,
          decoration: _registrationInputDecoration(
            hintText: hint,
            icon: Icons.badge_outlined,
          ),
          items: uniqueItems
              .map(
                (item) => DropdownMenuItem<String>(
                  value: item[codeKey]?.toString().trim(),
                  child: Text(
                    '${item['full_name'] ?? 'User'} (${item[codeKey] ?? ''})',
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.charcoal,
                    ),
                  ),
                ),
              )
              .toList(),
          onChanged: onChanged,
          hint: Text(
            hint,
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppTheme.charcoalMuted,
            ),
          ),
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppTheme.charcoal,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
      ],
    );
  }

  Widget _buildCityAutocomplete() {
    return RawAutocomplete<String>(
      textEditingController: _cityController,
      focusNode: _cityFocusNode,
      optionsBuilder: (TextEditingValue textEditingValue) {
        final query = textEditingValue.text.trim().toLowerCase();
        final matches = query.isEmpty
            ? _indianCities
            : _indianCities.where(
                (city) => city.toLowerCase().contains(query),
              );
        return matches.take(40);
      },
      onSelected: (city) {
        _cityController.text = city;
        _cityFocusNode.unfocus();
      },
      fieldViewBuilder:
          (context, textEditingController, focusNode, onFieldSubmitted) {
        return TextFormField(
          controller: textEditingController,
          focusNode: focusNode,
          style: _inputTextStyle,
          cursorColor: AppTheme.primary,
          textInputAction: TextInputAction.search,
          decoration: _registrationInputDecoration(
            hintText: 'Search or select city',
            icon: Icons.location_city_outlined,
            suffixIcon: const Icon(
              Icons.keyboard_arrow_down,
              color: AppTheme.charcoalMuted,
            ),
          ),
          validator: (v) => v == null || v.isEmpty ? 'Enter your city' : null,
        );
      },
      optionsViewBuilder: (context, onSelected, options) {
        final optionList = options.toList();
        return Align(
          alignment: Alignment.topLeft,
          child: Material(
            elevation: 8,
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 240, maxWidth: 420),
              child: ListView.separated(
                padding: EdgeInsets.zero,
                shrinkWrap: true,
                itemCount: optionList.length,
                separatorBuilder: (_, __) =>
                    const Divider(height: 1, color: AppTheme.border),
                itemBuilder: (context, index) {
                  final city = optionList[index];
                  return InkWell(
                    onTap: () => onSelected(city),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.location_on_outlined,
                            size: 18,
                            color: AppTheme.charcoalMuted,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              city,
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.charcoal,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        );
      },
    );
  }

  void _showBuildConfigurationDialog() {
    showDialog(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            'Build Configuration',
            style: GoogleFonts.inter(fontWeight: FontWeight.bold),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Environment: ${AppConfig.environmentLabel}',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  color: AppTheme.charcoalMuted,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'API: ${ApiService().baseUrl}',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: AppTheme.charcoalMuted,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'API environment is selected at build time and cannot be changed from the app.',
                style: GoogleFonts.inter(fontSize: 11, color: Colors.grey),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child:
                  Text('OK', style: GoogleFonts.inter(color: AppTheme.primary)),
            ),
          ],
        );
      },
    );
  }

  void _startOtpCountdown() {
    _otpCountdownTimer?.cancel();
    setState(() => _otpSecondsRemaining = _otpValiditySeconds);

    _otpCountdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_otpSecondsRemaining <= 1) {
        timer.cancel();
        setState(() => _otpSecondsRemaining = 0);
      } else {
        setState(() => _otpSecondsRemaining--);
      }
    });
  }

  void _stopOtpCountdown() {
    _otpCountdownTimer?.cancel();
    _otpCountdownTimer = null;
    _otpSecondsRemaining = 0;
  }

  void _clearOtpFields() {
    _otpController.clear();
    for (final controller in _otpDigitControllers) {
      controller.clear();
    }
  }

  void _setOtpFromDigits() {
    _otpController.text =
        _otpDigitControllers.map((controller) => controller.text).join();
  }

  void _fillOtpDigits(String value) {
    final digits =
        value.replaceAll(RegExp(r'\D'), '').split('').take(6).toList();
    for (var i = 0; i < _otpDigitControllers.length; i++) {
      _otpDigitControllers[i].text = i < digits.length ? digits[i] : '';
    }
    _setOtpFromDigits();
    final nextIndex = digits.length >= 6 ? 5 : digits.length;
    _otpFocusNodes[nextIndex.clamp(0, 5).toInt()].requestFocus();
  }

  void _handleOtpDigitChanged(int index, String value) {
    if (value.length > 1) {
      _fillOtpDigits(value);
      return;
    }

    final digit = value.replaceAll(RegExp(r'\D'), '');
    if (_otpDigitControllers[index].text != digit) {
      _otpDigitControllers[index].text = digit;
      _otpDigitControllers[index].selection =
          TextSelection.collapsed(offset: digit.length);
    }
    _setOtpFromDigits();

    if (digit.isNotEmpty && index < _otpFocusNodes.length - 1) {
      _otpFocusNodes[index + 1].requestFocus();
    }
    if (digit.isEmpty && index > 0) {
      _otpFocusNodes[index - 1].requestFocus();
    }
  }

  @override
  void dispose() {
    _otpCountdownTimer?.cancel();
    _termsRecognizer.dispose();
    _privacyRecognizer.dispose();
    _checkinRecognizer.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    _otpController.dispose();
    for (final controller in _otpDigitControllers) {
      controller.dispose();
    }
    for (final focusNode in _otpFocusNodes) {
      focusNode.dispose();
    }
    _emailRegController.dispose();
    _fullNameController.dispose();
    _passwordRegController.dispose();
    _cityController.dispose();
    _cityFocusNode.dispose();
    _lgCodeController.dispose();
    _employeeCodeController.dispose();
    super.dispose();
  }

  void _handleClose() {
    FocusScope.of(context).unfocus();
    Navigator.of(context, rootNavigator: true).pushAndRemoveUntil(
      MaterialPageRoute(builder: (context) => const AppShell(initialIndex: 0)),
      (route) => false,
    );
  }

  Future<void> _sendOTP() async {
    setState(() => _errorMessage = null);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.sendOTP(_phoneController.text.trim());
    if (success) {
      _clearOtpFields();
      setState(() => _step = 2); // Go to OTP verification
      _startOtpCountdown();
    } else {
      setState(() => _errorMessage =
          auth.lastError ?? 'Failed to send OTP. Please check the number.');
    }
  }

  Future<void> _verifyOTP() async {
    _setOtpFromDigits();
    if (_otpSecondsRemaining == 0) {
      setState(() => _errorMessage = 'OTP expired. Please request a new OTP.');
      return;
    }
    if (_otpController.text.trim().length != 6) {
      setState(
          () => _errorMessage = 'Please enter the 6-digit verification code.');
      return;
    }
    setState(() => _errorMessage = null);

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.verifyOTP(
        _phoneController.text.trim(), _otpController.text.trim());
    if (success) {
      _stopOtpCountdown();
      setState(() {
        _step = 3; // Go to registration details
        _emailRegController.text = ''; // Clear for user entry
      });
    } else {
      setState(() => _errorMessage = 'Invalid OTP. Please try again.');
    }
  }

  Future<void> _handleLogin() async {
    final email = _emailController.text.trim().toLowerCase();
    if (email.isEmpty) {
      setState(() => _errorMessage = 'Please enter your email address.');
      return;
    }
    if (!email.contains('@') || !email.contains('.')) {
      setState(() => _errorMessage = 'Please enter a valid email address.');
      return;
    }
    if (_passwordController.text.isEmpty) {
      setState(() => _errorMessage = 'Please enter your password.');
      return;
    }
    setState(() => _errorMessage = null);

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.login(
      email,
      _passwordController.text,
    );

    if (success && mounted) {
      if (widget.popOnSuccess) {
        Navigator.pop(context, true);
      } else {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const AppShell()),
        );
      }
    } else {
      setState(() {
        _errorMessage =
            auth.lastError ?? 'Unable to sign in. Please try again.';
      });
    }
  }

  Future<void> _completeRegistration() async {
    if (!_formKey.currentState!.validate()) return;
    final passwordError = _passwordValidationError(_passwordRegController.text);
    if (passwordError != null) {
      setState(() => _errorMessage = passwordError);
      return;
    }
    if (!_acceptTerms) {
      setState(() => _errorMessage =
          'Please accept the Terms & Conditions, Privacy Policy, and Check-in Instructions.');
      return;
    }
    setState(() => _errorMessage = null);

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final Map<String, dynamic> regData = {
      'email': _emailRegController.text.trim(),
      'phone': _phoneController.text.trim(),
      'full_name': _fullNameController.text.trim(),
      'password': _passwordRegController.text,
      'role': _selectedRole,
      'city': _cityController.text.trim(),
      'terms_accepted': true,
    };

    if (_selectedRole == 'host' && _lgCodeController.text.trim().isNotEmpty) {
      regData['lg_code'] = _lgCodeController.text.trim();
    }
    if (_selectedRole == 'host' &&
        _employeeCodeController.text.trim().isNotEmpty) {
      regData['employee_code'] = _employeeCodeController.text.trim();
    }

    final success = await auth.register(regData);

    if (success && mounted) {
      if (widget.popOnSuccess) {
        Navigator.pop(context, true);
      } else {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const AppShell()),
        );
      }
    } else {
      setState(() => _errorMessage = auth.lastError ??
          'Registration failed. Email/phone might already exist.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final size = MediaQuery.sizeOf(context);
    final safeTop = MediaQuery.paddingOf(context).top;
    final viewInsets = MediaQuery.viewInsetsOf(context);
    final isCompact = size.width < 430 || size.height < 900;
    const compactFormOnly = false;
    final heroHeight = (size.height * (isCompact ? 0.48 : 0.44))
        .clamp(isCompact ? 330.0 : 330.0, isCompact ? 390.0 : 410.0);
    final formTop = (heroHeight - (isCompact ? 42 : 20)).clamp(
      isCompact ? 286.0 : 310.0,
      isCompact ? 340.0 : 390.0,
    );
    final horizontalPadding = size.width < 360 ? 18.0 : 24.0;
    final popupSideMargin = size.width < 380 ? 8.0 : 12.0;
    final popupBottomMargin = MediaQuery.paddingOf(context).bottom + 8;
    final lockAuthSheetScroll =
        _step == 0 && viewInsets.bottom == 0 && !compactFormOnly;
    final eyebrow = _step == 3
        ? 'Finish Registration'
        : _step == 2
            ? 'Phone Verification'
            : _isSignUpMode
                ? 'Create account'
                : 'Login/Signup';

    return Scaffold(
      backgroundColor: Colors.white,
      body: Form(
        key: _formKey,
        child: Stack(
          children: [
            if (!compactFormOnly)
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                height: heroHeight,
                child: _AuthHero(
                  onLogoTap: () {
                    _logoTapCount++;
                    if (_logoTapCount >= 5) {
                      _logoTapCount = 0;
                      _showBuildConfigurationDialog();
                    }
                  },
                ),
              ),
            Positioned(
              top: formTop,
              left: popupSideMargin,
              right: popupSideMargin,
              bottom: popupBottomMargin,
              child: Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.all(Radius.circular(30)),
                  boxShadow: [
                    BoxShadow(
                      color: Color(0x1A000000),
                      blurRadius: 34,
                      offset: Offset(0, 14),
                    ),
                  ],
                ),
                child: SafeArea(
                  top: false,
                  bottom: false,
                  child: SingleChildScrollView(
                    physics: lockAuthSheetScroll
                        ? const NeverScrollableScrollPhysics()
                        : const BouncingScrollPhysics(),
                    padding: EdgeInsets.fromLTRB(
                      horizontalPadding,
                      isCompact ? 9 : 26,
                      horizontalPadding,
                      (isCompact ? 10 : 24) + viewInsets.bottom,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Center(
                          child: Container(
                            width: 58,
                            height: 6,
                            decoration: BoxDecoration(
                              color: const Color(0xFFD5D5D5),
                              borderRadius: BorderRadius.circular(100),
                            ),
                          ),
                        ),
                        SizedBox(height: isCompact ? 8 : 30),
                        if (_step == 0) ...[
                          _buildWelcomeHeader(isCompact: isCompact),
                        ] else ...[
                          Text(
                            eyebrow,
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              color: AppTheme.primary,
                            ),
                          ),
                          const SizedBox(height: 10),
                          _buildWelcomeTitle(size.width),
                        ],
                        SizedBox(height: isCompact ? 9 : 22),
                        if (_step == 0) ...[
                          _buildAuthTabs(),
                          SizedBox(height: isCompact ? 9 : 18),
                        ],
                        if (_errorMessage != null) ...[
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              border: Border.all(color: Colors.red.shade200),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Text(
                              _errorMessage!,
                              style: GoogleFonts.inter(
                                color: Colors.red.shade900,
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                          const SizedBox(height: 18),
                        ],
                        AnimatedSwitcher(
                          duration: const Duration(milliseconds: 300),
                          child: _buildFormContent(auth),
                        ),
                        ...[
                          SizedBox(height: isCompact ? 12 : 24),
                          Row(
                            children: [
                              Expanded(
                                  child: Divider(color: Colors.grey.shade200)),
                              Text(
                                'Secure & Trusted',
                                style: GoogleFonts.inter(
                                  fontSize: isCompact ? 12 : 15,
                                  fontWeight: FontWeight.w800,
                                  color: AppTheme.charcoalMuted,
                                ),
                              ),
                              Padding(
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 12),
                                child: Icon(Icons.verified_user_outlined,
                                    color: AppTheme.primary,
                                    size: isCompact ? 18 : 24),
                              ),
                              Expanded(
                                  child: Divider(color: Colors.grey.shade200)),
                            ],
                          ),
                          SizedBox(height: isCompact ? 8 : 14),
                          Text.rich(
                            TextSpan(
                              text: 'By continuing, you agree to our\n',
                              children: [
                                TextSpan(
                                  text: 'Terms & Conditions',
                                  style: GoogleFonts.inter(
                                    color: const Color(0xFF07142F),
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                                const TextSpan(text: ' and '),
                                TextSpan(
                                  text: 'Privacy Policy.',
                                  style: GoogleFonts.inter(
                                    color: const Color(0xFF07142F),
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ],
                            ),
                            textAlign: TextAlign.center,
                            style: GoogleFonts.inter(
                              fontSize: isCompact ? 11 : 14,
                              height: isCompact ? 1.35 : 1.55,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.charcoalMuted,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
            if (!compactFormOnly)
              Positioned(
                top: safeTop + 22,
                right: horizontalPadding,
                child: Material(
                  color: Colors.white,
                  shape: const CircleBorder(),
                  elevation: 8,
                  shadowColor: Colors.black26,
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: _handleClose,
                    child: const SizedBox(
                      width: 54,
                      height: 54,
                      child: Icon(Icons.close_rounded,
                          color: Color(0xFF07142F), size: 30),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildAuthTabs() {
    final isCompact = MediaQuery.sizeOf(context).width < 430;
    return Container(
      height: isCompact ? 54 : 72,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(25),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _isSignUpMode = false;
                  _errorMessage = null;
                });
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                margin: EdgeInsets.all(isCompact ? 4 : 5),
                decoration: BoxDecoration(
                  color: !_isSignUpMode
                      ? const Color(0xFF07142F)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: !_isSignUpMode
                      ? [
                          BoxShadow(
                            color:
                                const Color(0xFF07142F).withValues(alpha: 0.18),
                            blurRadius: 18,
                            offset: const Offset(0, 8),
                          ),
                        ]
                      : null,
                ),
                alignment: Alignment.center,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.person_outline_rounded,
                        color: !_isSignUpMode ? AppTheme.primary : Colors.grey,
                        size: isCompact ? 18 : 25),
                    SizedBox(width: isCompact ? 6 : 10),
                    Text(
                      'Sign In',
                      style: GoogleFonts.inter(
                        fontSize: isCompact ? 14 : 20,
                        fontWeight: FontWeight.w900,
                        color: !_isSignUpMode
                            ? Colors.white
                            : AppTheme.charcoalMuted,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _isSignUpMode = true;
                  _errorMessage = null;
                });
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                margin: EdgeInsets.all(isCompact ? 4 : 5),
                decoration: BoxDecoration(
                  color: _isSignUpMode
                      ? const Color(0xFF07142F)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: _isSignUpMode
                      ? [
                          BoxShadow(
                            color:
                                const Color(0xFF07142F).withValues(alpha: 0.18),
                            blurRadius: 18,
                            offset: const Offset(0, 8),
                          ),
                        ]
                      : null,
                ),
                alignment: Alignment.center,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.group_add_outlined,
                        color: _isSignUpMode ? AppTheme.primary : Colors.grey,
                        size: isCompact ? 18 : 25),
                    SizedBox(width: isCompact ? 6 : 10),
                    Text(
                      'Sign Up',
                      style: GoogleFonts.inter(
                        fontSize: isCompact ? 14 : 20,
                        fontWeight: FontWeight.w900,
                        color: _isSignUpMode
                            ? Colors.white
                            : AppTheme.charcoalMuted,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWelcomeHeader({required bool isCompact}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Welcome to',
          style: GoogleFonts.inter(
            fontSize: isCompact ? 22 : 34,
            height: 1,
            fontWeight: FontWeight.w800,
            color: AppTheme.primary,
          ),
        ),
        SizedBox(height: isCompact ? 2 : 6),
        _buildWelcomeTitle(MediaQuery.sizeOf(context).width),
        SizedBox(height: isCompact ? 3 : 8),
        Text(
          'Log in or sign up to continue',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: GoogleFonts.inter(
            fontSize: isCompact ? 11.5 : 18,
            fontWeight: FontWeight.w600,
            color: AppTheme.charcoalMuted,
          ),
        ),
      ],
    );
  }

  Widget _buildWelcomeTitle(double width) {
    final isCompact = width < 370;
    return RichText(
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      text: TextSpan(
        style: GoogleFonts.inter(
          fontSize: isCompact ? 25 : 42,
          height: 1.02,
          fontWeight: FontWeight.w900,
          color: const Color(0xFF07142F),
        ),
        children: [
          const TextSpan(text: 'X-'),
          TextSpan(
            text: 'Space360',
            style: GoogleFonts.inter(
              color: AppTheme.primary,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFormContent(AuthProvider auth) {
    final width = MediaQuery.sizeOf(context).width;
    final isCompact = width < 370;
    final inputRadius = BorderRadius.circular(isCompact ? 17 : 22);
    final inputPadding = EdgeInsets.symmetric(
      horizontal: isCompact ? 14 : 22,
      vertical: isCompact ? 12 : 24,
    );
    if (_step == 0) {
      if (!_isSignUpMode) {
        // Sign In Form (Email + Password directly)
        return Column(
          key: const ValueKey('signIn'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextFormField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              style: _inputTextStyle,
              cursorColor: AppTheme.primary,
              decoration: InputDecoration(
                hintText: 'Email address',
                hintStyle: _inputHintStyle,
                prefixIcon: const Icon(Icons.email_outlined,
                    color: AppTheme.charcoalMuted),
                filled: true,
                fillColor: Colors.white,
                contentPadding: inputPadding,
                border: OutlineInputBorder(
                  borderRadius: inputRadius,
                  borderSide:
                      const BorderSide(color: AppTheme.border, width: 1),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: inputRadius,
                  borderSide:
                      const BorderSide(color: AppTheme.border, width: 1),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: inputRadius,
                  borderSide:
                      const BorderSide(color: AppTheme.primary, width: 1.5),
                ),
              ),
            ),
            SizedBox(height: isCompact ? 8 : 18),
            TextFormField(
              controller: _passwordController,
              obscureText: !_showSignInPassword,
              style: _inputTextStyle,
              cursorColor: AppTheme.primary,
              decoration: InputDecoration(
                hintText: 'Password',
                hintStyle: _inputHintStyle,
                prefixIcon: const Icon(Icons.lock_outline,
                    color: AppTheme.charcoalMuted),
                suffixIcon: IconButton(
                  onPressed: () {
                    setState(() {
                      _showSignInPassword = !_showSignInPassword;
                    });
                  },
                  icon: Icon(
                    _showSignInPassword
                        ? Icons.visibility_off_outlined
                        : Icons.visibility_outlined,
                    color: AppTheme.charcoalMuted,
                  ),
                  tooltip:
                      _showSignInPassword ? 'Hide password' : 'Show password',
                ),
                filled: true,
                fillColor: Colors.white,
                contentPadding: inputPadding,
                border: OutlineInputBorder(
                  borderRadius: inputRadius,
                  borderSide:
                      const BorderSide(color: AppTheme.border, width: 1),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: inputRadius,
                  borderSide:
                      const BorderSide(color: AppTheme.border, width: 1),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: inputRadius,
                  borderSide:
                      const BorderSide(color: AppTheme.primary, width: 1.5),
                ),
              ),
            ),
            SizedBox(height: isCompact ? 9 : 22),
            Row(
              children: [
                GestureDetector(
                  onTap: () => setState(() => _rememberMe = !_rememberMe),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    width: isCompact ? 22 : 30,
                    height: isCompact ? 22 : 30,
                    decoration: BoxDecoration(
                      color: _rememberMe ? AppTheme.primary : Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: _rememberMe ? AppTheme.primary : AppTheme.border,
                      ),
                    ),
                    child: AnimatedScale(
                      scale: _rememberMe ? 1 : 0,
                      duration: const Duration(milliseconds: 150),
                      child: Icon(Icons.check_rounded,
                          color: Colors.white, size: isCompact ? 17 : 22),
                    ),
                  ),
                ),
                SizedBox(width: isCompact ? 8 : 12),
                Flexible(
                  child: Text(
                    'Remember me',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                      fontSize: isCompact ? 11.5 : 15,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF07142F),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                TextButton(
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.symmetric(
                      horizontal: isCompact ? 4 : 8,
                      vertical: 6,
                    ),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const ForgotPasswordScreen(),
                      ),
                    );
                  },
                  child: Text(
                    'Forgot Password?',
                    style: GoogleFonts.inter(
                      fontSize: isCompact ? 11.5 : 15,
                      color: AppTheme.primary,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: isCompact ? 9 : 24),
            auth.isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: AppTheme.primary))
                : SizedBox(
                    width: double.infinity,
                    height: isCompact ? 48 : 72,
                    child: ElevatedButton.icon(
                      onPressed: _handleLogin,
                      iconAlignment: IconAlignment.end,
                      icon: Icon(Icons.arrow_forward_rounded,
                          color: Colors.white, size: isCompact ? 22 : 30),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(18),
                        ),
                        elevation: 12,
                        shadowColor: AppTheme.primary.withValues(alpha: 0.28),
                      ),
                      label: Text(
                        'Sign In',
                        style: GoogleFonts.inter(
                          fontSize: isCompact ? 16 : 20,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
          ],
        );
      } else {
        // Sign Up Mode - Step 0 (Enter phone)
        return Column(
          key: const ValueKey('signUp'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              style: _inputTextStyle,
              cursorColor: AppTheme.primary,
              decoration: InputDecoration(
                hintText: 'Phone number',
                hintStyle: _inputHintStyle,
                prefixIcon: const Icon(Icons.phone_outlined,
                    color: AppTheme.charcoalMuted),
                filled: true,
                fillColor: Colors.white,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide:
                      const BorderSide(color: AppTheme.border, width: 1),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide:
                      const BorderSide(color: AppTheme.border, width: 1),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide:
                      const BorderSide(color: AppTheme.primary, width: 1.5),
                ),
              ),
            ),
            const SizedBox(height: 24),
            auth.isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: AppTheme.primary))
                : SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: _sendOTP,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: Text(
                        'Send OTP',
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
          ],
        );
      }
    } else if (_step == 2) {
      // Step 2: OTP verification for phone
      return Column(
        key: const ValueKey('step2'),
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'VERIFICATION CODE SENT TO',
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: AppTheme.charcoalMuted,
              letterSpacing: 0,
            ),
            textAlign: TextAlign.center,
          ),
          Text(
            _phoneController.text,
            style: GoogleFonts.inter(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: AppTheme.charcoal,
            ),
            textAlign: TextAlign.center,
          ),
          if (auth.lastDemoOtp != null) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF7DF),
                border: Border.all(color: const Color(0xFFF0C65E)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                'Demo OTP: ${auth.lastDemoOtp}',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  color: const Color(0xFF6D4B00),
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ],
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(
              6,
              (index) => SizedBox(
                width: 42,
                height: 54,
                child: TextField(
                  controller: _otpDigitControllers[index],
                  focusNode: _otpFocusNodes[index],
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  maxLength: 6,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  style: GoogleFonts.inter(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.charcoal,
                  ),
                  decoration: InputDecoration(
                    counterText: '',
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: EdgeInsets.zero,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide:
                          const BorderSide(color: AppTheme.border, width: 1),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide:
                          const BorderSide(color: AppTheme.border, width: 1),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide:
                          const BorderSide(color: AppTheme.primary, width: 1.5),
                    ),
                  ),
                  onChanged: (value) => _handleOtpDigitChanged(index, value),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 200),
            child: _otpSecondsRemaining > 0
                ? Text(
                    'OTP valid for $_otpTimerLabel',
                    key: const ValueKey('otpTimer'),
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.charcoalMuted,
                    ),
                  )
                : TextButton(
                    key: const ValueKey('resendOtp'),
                    onPressed: auth.isLoading ? null : _sendOTP,
                    child: Text(
                      'Resend OTP',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.primary,
                      ),
                    ),
                  ),
          ),
          const SizedBox(height: 20),
          auth.isLoading
              ? const Center(
                  child: CircularProgressIndicator(color: AppTheme.primary))
              : SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _verifyOTP,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: Text(
                      'Verify & Continue',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: () {
              _otpCountdownTimer?.cancel();
              _clearOtpFields();
              setState(() {
                _otpSecondsRemaining = 0;
                _step = 0;
              });
            },
            child: Text(
              'Change Phone Number',
              style: GoogleFonts.inter(
                fontSize: 14,
                color: AppTheme.charcoalMuted,
              ),
            ),
          ),
        ],
      );
    } else {
      // Step 3: Complete registration details
      return Column(
        key: const ValueKey('step3'),
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Text(
              'SELECT ROLE',
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: AppTheme.charcoalMuted,
                letterSpacing: 0,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedRole = 'guest';
                      _lgCodeController.clear();
                      _employeeCodeController.clear();
                    });
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    height: 48,
                    decoration: BoxDecoration(
                      color: _selectedRole == 'guest'
                          ? AppTheme.primary
                          : Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: _selectedRole == 'guest'
                            ? AppTheme.primary
                            : AppTheme.border,
                        width: 1,
                      ),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      'GUEST',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: _selectedRole == 'guest'
                            ? Colors.white
                            : AppTheme.charcoalMuted,
                        letterSpacing: 0,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedRole = 'host';
                    });
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    height: 48,
                    decoration: BoxDecoration(
                      color: _selectedRole == 'host'
                          ? AppTheme.primary
                          : Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: _selectedRole == 'host'
                            ? AppTheme.primary
                            : AppTheme.border,
                        width: 1,
                      ),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      'HOST',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: _selectedRole == 'host'
                            ? Colors.white
                            : AppTheme.charcoalMuted,
                        letterSpacing: 0,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          Text(
            'FULL NAME',
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: AppTheme.charcoal,
              letterSpacing: 0,
            ),
          ),
          const SizedBox(height: 6),
          TextFormField(
            controller: _fullNameController,
            style: _inputTextStyle,
            cursorColor: AppTheme.primary,
            decoration: InputDecoration(
              hintText: 'Enter your full name',
              hintStyle: _inputHintStyle,
              prefixIcon: const Icon(Icons.person_outline),
              filled: true,
              fillColor: AppTheme.stone,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide.none,
              ),
            ),
            validator: (v) => v == null || v.isEmpty ? 'Enter your name' : null,
          ),
          if (_selectedRole == 'host') ...[
            const SizedBox(height: 16),
            _buildRegistrationDropdown(
              label: 'BROKER / RM CODE',
              hint: '-- Select Broker / RM Code --',
              value: _lgCodeController.text,
              items: _availableBrokers,
              codeKey: 'lg_code',
              onChanged: (value) {
                setState(() {
                  _lgCodeController.text = value ?? '';
                  _employeeCodeController.clear();
                });
              },
            ),
            const SizedBox(height: 16),
            _buildRegistrationDropdown(
              label: _secondaryAssignmentLabel,
              hint: _secondaryAssignmentHint,
              value: _employeeCodeController.text,
              items: _secondaryAssignmentOptions,
              codeKey: _secondaryAssignmentCodeKey,
              onChanged: (value) {
                setState(() => _employeeCodeController.text = value ?? '');
              },
            ),
          ],
          const SizedBox(height: 16),

          Text(
            'EMAIL ADDRESS',
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: AppTheme.charcoal,
              letterSpacing: 0,
            ),
          ),
          const SizedBox(height: 6),
          TextFormField(
            controller: _emailRegController,
            keyboardType: TextInputType.emailAddress,
            style: _inputTextStyle,
            cursorColor: AppTheme.primary,
            decoration: InputDecoration(
              hintText: 'e.g., guest@example.com',
              hintStyle: _inputHintStyle,
              prefixIcon: const Icon(Icons.email_outlined),
              filled: true,
              fillColor: AppTheme.stone,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide.none,
              ),
            ),
            validator: (v) =>
                v == null || v.isEmpty ? 'Enter your email' : null,
          ),
          const SizedBox(height: 16),

          Text(
            'PHONE NUMBER',
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: AppTheme.charcoal,
              letterSpacing: 0,
            ),
          ),
          const SizedBox(height: 6),
          TextFormField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            readOnly: true,
            enableInteractiveSelection: false,
            style: _inputTextStyle,
            cursorColor: AppTheme.primary,
            decoration: _registrationInputDecoration(
              hintText: 'Phone verified from OTP',
              icon: Icons.phone_outlined,
              suffixIcon: const Icon(
                Icons.lock_outline,
                size: 18,
                color: AppTheme.charcoalMuted,
              ),
            ),
            validator: (v) =>
                v == null || v.isEmpty ? 'Enter your phone number' : null,
          ),
          const SizedBox(height: 16),

          Text(
            'PASSWORD',
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: AppTheme.charcoal,
              letterSpacing: 0,
            ),
          ),
          const SizedBox(height: 6),
          TextFormField(
            controller: _passwordRegController,
            obscureText: !_showRegistrationPassword,
            style: _inputTextStyle,
            cursorColor: AppTheme.primary,
            inputFormatters: [
              FilteringTextInputFormatter.deny(RegExp(r'\s')),
              LengthLimitingTextInputFormatter(32),
            ],
            onChanged: (value) {
              setState(() => _registrationPassword = value);
            },
            decoration: _registrationInputDecoration(
              hintText: '8-32 characters',
              icon: Icons.lock_outline,
              suffixIcon: IconButton(
                onPressed: () {
                  setState(() {
                    _showRegistrationPassword = !_showRegistrationPassword;
                  });
                },
                icon: Icon(
                  _showRegistrationPassword
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                  color: AppTheme.charcoalMuted,
                ),
                tooltip: _showRegistrationPassword
                    ? 'Hide password'
                    : 'Show password',
              ),
            ),
            validator: (v) => _passwordValidationError(v ?? ''),
          ),
          if (_registrationPassword.isNotEmpty &&
              _passwordValidationError(_registrationPassword) != null) ...[
            const SizedBox(height: 6),
            Padding(
              padding: const EdgeInsets.only(left: 4),
              child: Text(
                _passwordValidationError(_registrationPassword)!,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Colors.redAccent,
                ),
              ),
            ),
          ],
          const SizedBox(height: 16),

          Text(
            'CITY',
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: AppTheme.charcoal,
              letterSpacing: 0,
            ),
          ),
          const SizedBox(height: 6),
          _buildCityAutocomplete(),
          const SizedBox(height: 20),

          const SizedBox(height: 24),

          // Accept Terms
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: const Color(0xFFFAF7F2),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: const Color(0xFFF0ECE3),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () {
                    setState(() {
                      _acceptTerms = !_acceptTerms;
                    });
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    curve: Curves.easeInOut,
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      color:
                          _acceptTerms ? AppTheme.primary : Colors.transparent,
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(
                        color: _acceptTerms
                            ? AppTheme.primary
                            : AppTheme.charcoalMuted,
                        width: 1.5,
                      ),
                    ),
                    child: AnimatedScale(
                      scale: _acceptTerms ? 1.0 : 0.0,
                      duration: const Duration(milliseconds: 200),
                      curve: Curves.elasticOut,
                      child: const Icon(
                        Icons.check,
                        color: Colors.white,
                        size: 16,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: RichText(
                    text: TextSpan(
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.charcoalMuted,
                        letterSpacing: 0,
                      ),
                      children: [
                        const TextSpan(text: 'I ACCEPT THE '),
                        TextSpan(
                          text: 'Terms & Conditions',
                          recognizer: _termsRecognizer,
                          style: const TextStyle(
                            color: AppTheme.primary,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const TextSpan(text: ', '),
                        TextSpan(
                          text: 'Privacy Policy',
                          recognizer: _privacyRecognizer,
                          style: const TextStyle(
                            color: AppTheme.primary,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const TextSpan(text: ' AND '),
                        TextSpan(
                          text: 'Check-in Instructions',
                          recognizer: _checkinRecognizer,
                          style: const TextStyle(
                            color: AppTheme.primary,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const TextSpan(text: '.'),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          auth.isLoading
              ? const Center(
                  child: CircularProgressIndicator(color: AppTheme.primary))
              : SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _completeRegistration,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: Text(
                      'Complete Registration',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
          const SizedBox(height: 16),

          TextButton(
            onPressed: () {
              setState(() {
                _step = 1; // Back to sign in password step
              });
            },
            child: Text(
              'Already have an account? Sign In',
              style: GoogleFonts.inter(
                fontSize: 14,
                color: AppTheme.charcoalMuted,
              ),
            ),
          ),
        ],
      );
    }
  }
}
