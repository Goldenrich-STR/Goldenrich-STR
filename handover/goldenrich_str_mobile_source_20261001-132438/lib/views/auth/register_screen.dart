import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme.dart';
import '../shared/app_shell.dart';
import '../../services/api_service.dart';
import 'package:flutter/gestures.dart';
import 'package:google_fonts/google_fonts.dart';

class RegisterScreen extends StatefulWidget {
  final bool popOnSuccess;
  const RegisterScreen({super.key, this.popOnSuccess = false});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  final _emailController = TextEditingController();
  final _fullNameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _cityController = TextEditingController();
  final _lgCodeController = TextEditingController();
  final _employeeCodeController = TextEditingController();

  String _selectedRole = 'guest';
  int _step = 1; // 1: Enter Phone, 2: Enter OTP, 3: Complete Register Details
  String? _errorMessage;
  bool _acceptTerms = false;
  bool _obscurePassword = true;
  bool _assignmentLoading = false;
  List<Map<String, dynamic>> _primaryAssignments = [];
  List<Map<String, dynamic>> _branchManagerAssignments = [];

  late TapGestureRecognizer _termsRecognizer;
  late TapGestureRecognizer _privacyRecognizer;
  late TapGestureRecognizer _checkinRecognizer;

  String _termsText =
      'By using X-Space360, users agree to follow booking, listing, verification, payment, cancellation, and platform conduct rules published by X-Space360.';
  String _privacyText =
      'X-Space360 respects your privacy. We collect only the information needed to manage accounts, property listings, bookings, support, verification, and secure platform operations.';
  String _checkinText =
      'Standard check-in time starts at 2:00 PM. Please present your valid Government ID upon arrival. Quiet hours are from 10:00 PM to 7:00 AM.';

  @override
  void initState() {
    super.initState();
    _termsRecognizer = TapGestureRecognizer()
      ..onTap = () => _showDocumentDialog('Terms & Conditions', _termsText);
    _privacyRecognizer = TapGestureRecognizer()
      ..onTap = () => _showDocumentDialog('Privacy Policy', _privacyText);
    _checkinRecognizer = TapGestureRecognizer()
      ..onTap =
          () => _showDocumentDialog('Check-in Instructions', _checkinText);
    _fetchCmsContent();
    _fetchAssignments();
  }

  Map<String, dynamic>? get _selectedPrimaryAssignment {
    final selectedCode = _lgCodeController.text.trim();
    if (selectedCode.isEmpty) return null;
    for (final item in _primaryAssignments) {
      if (_assignmentCode(item, 'lg_code') == selectedCode) {
        return item;
      }
    }
    return null;
  }

  List<Map<String, dynamic>> get _secondaryAssignments {
    final primary = _selectedPrimaryAssignment;
    if (primary == null) return [];
    if (primary['assignment_type'] == 'broker') {
      return _primaryAssignments
          .where((item) => item['assignment_type'] == 'rm')
          .toList();
    }
    if (primary['assignment_type'] == 'rm') {
      return _branchManagerAssignments;
    }
    return [];
  }

  String get _secondaryCodeKey =>
      _selectedPrimaryAssignment?['assignment_type'] == 'broker'
          ? 'lg_code'
          : 'employee_code';

  String get _secondaryHint {
    final primary = _selectedPrimaryAssignment;
    if (primary == null) return '- Select Broker / RM first -';
    return primary['assignment_type'] == 'broker'
        ? '- Select RM Code -'
        : '- Select Branch Manager Code -';
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

  Future<void> _fetchAssignments() async {
    setState(() => _assignmentLoading = true);
    try {
      final response =
          await ApiService().dio.get('/auth/public/brokers-and-employees');
      if (response.statusCode == 200 && response.data is Map) {
        final data = response.data as Map;
        setState(() {
          _primaryAssignments = _asAssignmentList(data['brokers']);
          _branchManagerAssignments = _asAssignmentList(data['employees']);
        });
      }
    } catch (e) {
      debugPrint('Error fetching assignment codes: $e');
    } finally {
      if (mounted) {
        setState(() => _assignmentLoading = false);
      }
    }
  }

  List<Map<String, dynamic>> _asAssignmentList(dynamic raw) {
    if (raw is! List) return [];
    return raw
        .whereType<Map>()
        .map((item) => item.map((key, value) => MapEntry('$key', value)))
        .where((item) =>
            _assignmentCode(item, 'lg_code').isNotEmpty ||
            _assignmentCode(item, 'employee_code').isNotEmpty)
        .cast<Map<String, dynamic>>()
        .toList();
  }

  void _showDocumentDialog(String title, String content) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            title,
            style: GoogleFonts.inter(
              fontWeight: FontWeight.bold,
              color: AppTheme.charcoal,
            ),
          ),
          content: SingleChildScrollView(
            child: Text(
              content,
              style: GoogleFonts.inter(
                color: AppTheme.charcoalMuted,
                fontSize: 14,
                height: 1.5,
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(
                'CLOSE',
                style: GoogleFonts.inter(
                  color: AppTheme.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  @override
  void dispose() {
    _termsRecognizer.dispose();
    _privacyRecognizer.dispose();
    _checkinRecognizer.dispose();
    _phoneController.dispose();
    _otpController.dispose();
    _emailController.dispose();
    _fullNameController.dispose();
    _passwordController.dispose();
    _cityController.dispose();
    _lgCodeController.dispose();
    _employeeCodeController.dispose();
    super.dispose();
  }

  Future<void> _sendOTP() async {
    if (_phoneController.text.trim().isEmpty) return;
    setState(() => _errorMessage = null);

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.sendOTP(_phoneController.text.trim());
    if (success) {
      setState(() => _step = 2);
    } else {
      setState(() => _errorMessage =
          auth.lastError ?? 'Failed to send OTP. Please check the number.');
    }
  }

  Future<void> _verifyOTP() async {
    if (_otpController.text.trim().isEmpty) return;
    setState(() => _errorMessage = null);

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.verifyOTP(
        _phoneController.text.trim(), _otpController.text.trim());
    if (success) {
      setState(() => _step = 3);
    } else {
      setState(() => _errorMessage = 'Invalid OTP. Please try again.');
    }
  }

  Future<void> _completeRegistration() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_acceptTerms) {
      setState(() => _errorMessage =
          'Please accept the Terms & Conditions, Privacy Policy, and Check-in Instructions.');
      return;
    }
    setState(() => _errorMessage = null);

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final Map<String, dynamic> regData = {
      'email': _emailController.text.trim(),
      'phone': _phoneController.text.trim(),
      'full_name': _fullNameController.text.trim(),
      'password': _passwordController.text,
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

    return Scaffold(
      backgroundColor: const Color(0xFFF7F4EF),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 430),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildHero(context),
                  Transform.translate(
                    offset: const Offset(0, -22),
                    child: _buildPanel(context, auth),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHero(BuildContext context) {
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(
        top: Radius.circular(28),
        bottom: Radius.circular(8),
      ),
      child: Stack(
        children: [
          AspectRatio(
            aspectRatio: 1.16,
            child: Image.asset(
              'assets/images/hero_villa.jpg',
              fit: BoxFit.cover,
              alignment: Alignment.center,
            ),
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [
                    const Color(0xFF03172D).withValues(alpha: 0.92),
                    const Color(0xFF092F5C).withValues(alpha: 0.68),
                    Colors.black.withValues(alpha: 0.14),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            top: 20,
            left: 22,
            right: 22,
            child: Row(
              children: [
                Image.asset('assets/images/logo.png', width: 42, height: 42),
                const SizedBox(width: 10),
                RichText(
                  text: TextSpan(
                    style: GoogleFonts.inter(
                      fontSize: 21,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                    ),
                    children: const [
                      TextSpan(text: 'X-SPACE'),
                      TextSpan(
                        text: '360',
                        style: TextStyle(color: Color(0xFFF4B735)),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                InkWell(
                  onTap: () => Navigator.maybePop(context),
                  borderRadius: BorderRadius.circular(24),
                  child: Container(
                    width: 48,
                    height: 48,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.close_rounded,
                        color: Color(0xFF08234A), size: 28),
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            left: 22,
            right: 22,
            bottom: 30,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Book a Room.\nEnjoy a Villa',
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontSize: 33,
                    height: 1.16,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                Text(
                  'Getaway',
                  style: GoogleFonts.inter(
                    color: const Color(0xFFFFC559),
                    fontSize: 42,
                    height: 1.08,
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  'Enjoy the luxuries and privacy of\na villa with curated premium stays.',
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontSize: 15,
                    height: 1.4,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 20),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 15, vertical: 12),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border:
                        Border.all(color: Colors.white.withValues(alpha: 0.6)),
                    color: Colors.black.withValues(alpha: 0.18),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.local_offer_rounded,
                          color: Color(0xFFFFC559), size: 18),
                      const SizedBox(width: 10),
                      RichText(
                        text: TextSpan(
                          style: GoogleFonts.inter(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                          ),
                          children: const [
                            TextSpan(text: 'Rooms Starting at '),
                            TextSpan(
                              text: 'Rs.5,000+',
                              style: TextStyle(color: Color(0xFFFFC559)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPanel(BuildContext context, AuthProvider auth) {
    return Container(
      padding: const EdgeInsets.fromLTRB(22, 26, 22, 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0A1D34).withValues(alpha: 0.10),
            blurRadius: 28,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_errorMessage != null) ...[
            _buildError(),
            const SizedBox(height: 16),
          ],
          if (_step == 1)
            _buildPhoneStep(auth)
          else if (_step == 2)
            _buildOtpStep(auth)
          else
            _buildDetailsStep(auth),
        ],
      ),
    );
  }

  Widget _buildPhoneStep(AuthProvider auth) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildHeader('Verify Phone Number',
            'We will send a 6-digit OTP code to verify your phone.'),
        const SizedBox(height: 24),
        _buildTextField(
          controller: _phoneController,
          label: 'Phone Number',
          hint: 'e.g., +919876543210',
          icon: Icons.phone_outlined,
          keyboardType: TextInputType.phone,
        ),
        const SizedBox(height: 22),
        _buildPrimaryButton(auth, 'Send OTP', _sendOTP),
      ],
    );
  }

  Widget _buildOtpStep(AuthProvider auth) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildHeader('Enter Verification Code',
            'Enter the OTP sent to ${_phoneController.text}.'),
        if (auth.lastDemoOtp != null) ...[
          const SizedBox(height: 16),
          _buildDemoOtpNotice(auth.lastDemoOtp!),
        ],
        const SizedBox(height: 24),
        _buildTextField(
          controller: _otpController,
          label: 'OTP Code',
          hint: 'Enter 6-digit OTP',
          icon: Icons.lock_clock_outlined,
          keyboardType: TextInputType.number,
        ),
        const SizedBox(height: 22),
        _buildPrimaryButton(auth, 'Verify OTP', _verifyOTP),
        const SizedBox(height: 12),
        TextButton(
          onPressed: () => setState(() => _step = 1),
          child: const Text('Back to phone number'),
        ),
      ],
    );
  }

  Widget _buildDetailsStep(AuthProvider auth) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildHeader('Complete your profile', 'Finish Registration'),
          const SizedBox(height: 20),
          Text('Select Role', style: _labelStyle()),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                  child:
                      _buildRoleButton('guest', Icons.person_outline, 'GUEST')),
              const SizedBox(width: 14),
              Expanded(
                  child: _buildRoleButton(
                      'host', Icons.workspace_premium, 'HOST')),
            ],
          ),
          const SizedBox(height: 18),
          _buildTextField(
            controller: _fullNameController,
            label: 'Full Name',
            hint: 'Enter your full name',
            icon: Icons.person_outline,
            validator: (v) => v == null || v.isEmpty ? 'Enter your name' : null,
          ),
          if (_selectedRole == 'host') ...[
            const SizedBox(height: 16),
            _buildAssignmentSelector(
              label: 'Broker / RM Code',
              hint: _assignmentLoading
                  ? 'Loading codes...'
                  : '- Select Broker / RM Code -',
              value: _lgCodeController.text,
              options: _primaryAssignments,
              codeKey: 'lg_code',
              emptyLabel: 'No broker or RM code found',
              enabled: !_assignmentLoading,
              onSelected: (code) {
                setState(() {
                  _lgCodeController.text = code;
                  _employeeCodeController.clear();
                });
              },
            ),
            const SizedBox(height: 16),
            _buildAssignmentSelector(
              label: 'Branch Manager / RM Code',
              hint: _secondaryHint,
              value: _employeeCodeController.text,
              options: _secondaryAssignments,
              codeKey: _secondaryCodeKey,
              emptyLabel: _selectedPrimaryAssignment == null
                  ? 'Select broker/RM first'
                  : _selectedPrimaryAssignment?['assignment_type'] == 'broker'
                      ? 'No RM code found'
                      : 'No branch manager code found',
              enabled:
                  !_assignmentLoading && _selectedPrimaryAssignment != null,
              onSelected: (code) {
                setState(() {
                  _employeeCodeController.text = code;
                });
              },
            ),
          ],
          const SizedBox(height: 16),
          _buildTextField(
            controller: _emailController,
            label: 'Email Address',
            hint: 'e.g., guest@example.com',
            icon: Icons.mail_outline,
            keyboardType: TextInputType.emailAddress,
            validator: (v) =>
                v == null || v.isEmpty ? 'Enter your email' : null,
          ),
          const SizedBox(height: 16),
          _buildTextField(
            controller: _phoneController,
            label: 'Phone Number',
            hint: 'Phone number',
            icon: Icons.phone_outlined,
            keyboardType: TextInputType.phone,
            suffixIcon:
                const Icon(Icons.check_circle, color: Color(0xFF3DBB62)),
          ),
          const SizedBox(height: 16),
          _buildTextField(
            controller: _passwordController,
            label: 'Password',
            hint: '8-32 characters',
            icon: Icons.lock_outline,
            obscureText: _obscurePassword,
            suffixIcon: IconButton(
              onPressed: () =>
                  setState(() => _obscurePassword = !_obscurePassword),
              icon: Icon(_obscurePassword
                  ? Icons.visibility_outlined
                  : Icons.visibility_off_outlined),
            ),
            validator: (v) =>
                v == null || v.length < 6 ? 'Password min 6 chars' : null,
          ),
          const SizedBox(height: 16),
          _buildTextField(
            controller: _cityController,
            label: 'City',
            hint: 'Search or select city',
            icon: Icons.location_city_outlined,
            suffixIcon: const Icon(Icons.keyboard_arrow_down_rounded),
            validator: (v) => v == null || v.isEmpty ? 'Enter your city' : null,
          ),
          const SizedBox(height: 18),
          _buildTerms(),
          const SizedBox(height: 20),
          _buildPrimaryButton(
              auth, 'Complete Registration', _completeRegistration),
          const SizedBox(height: 20),
          Row(
            children: [
              const Expanded(child: Divider(color: AppTheme.border)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: Text('OR',
                    style: GoogleFonts.inter(
                        color: AppTheme.charcoalMuted,
                        fontWeight: FontWeight.w800,
                        fontSize: 12)),
              ),
              const Expanded(child: Divider(color: AppTheme.border)),
            ],
          ),
          const SizedBox(height: 14),
          Center(
            child: RichText(
              text: TextSpan(
                style: GoogleFonts.inter(
                    color: const Color(0xFF0A1D34), fontSize: 14),
                children: const [
                  TextSpan(text: 'Already have an account? '),
                  TextSpan(
                    text: 'Sign In',
                    style: TextStyle(
                        color: Color(0xFF075EBD), fontWeight: FontWeight.w800),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(String title, String eyebrow) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(eyebrow,
            style: GoogleFonts.inter(
                color: const Color(0xFF075EBD),
                fontSize: 15,
                fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        Text(title,
            style: GoogleFonts.inter(
                color: const Color(0xFF0A2A5A),
                fontSize: 27,
                height: 1.15,
                fontWeight: FontWeight.w900)),
        const SizedBox(height: 12),
        Container(width: 42, height: 2, color: const Color(0xFFEAB129)),
      ],
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    bool obscureText = false,
    Widget? suffixIcon,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: _labelStyle()),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          obscureText: obscureText,
          validator: validator,
          style: GoogleFonts.inter(
              color: const Color(0xFF091B38),
              fontSize: 15,
              fontWeight: FontWeight.w700),
          decoration: InputDecoration(
            hintText: hint,
            prefixIcon: Icon(icon, color: const Color(0xFF0A2A5A), size: 24),
            suffixIcon: suffixIcon,
            filled: true,
            fillColor: Colors.white,
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Color(0xFFDDE3EC)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide:
                  const BorderSide(color: Color(0xFF075EBD), width: 1.4),
            ),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 18, vertical: 17),
          ),
        ),
      ],
    );
  }

  Widget _buildAssignmentSelector({
    required String label,
    required String hint,
    required String value,
    required List<Map<String, dynamic>> options,
    required String codeKey,
    required String emptyLabel,
    required bool enabled,
    required ValueChanged<String> onSelected,
  }) {
    final selected = _findAssignmentByCode(options, codeKey, value);
    final displayText = selected == null
        ? hint
        : '${_assignmentCode(selected, codeKey)} - ${selected['full_name'] ?? 'Assigned user'}';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: _labelStyle()),
        const SizedBox(height: 8),
        InkWell(
          onTap: enabled
              ? () => _showAssignmentPicker(
                    title: label,
                    options: options,
                    codeKey: codeKey,
                    emptyLabel: emptyLabel,
                    currentValue: value,
                    onSelected: onSelected,
                  )
              : null,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            constraints: const BoxConstraints(minHeight: 58),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: enabled ? Colors.white : const Color(0xFFF5F7FA),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: selected == null
                    ? const Color(0xFFDDE3EC)
                    : const Color(0xFFF3B72B),
                width: selected == null ? 1 : 1.3,
              ),
            ),
            child: Row(
              children: [
                Icon(Icons.badge_outlined,
                    color: enabled
                        ? const Color(0xFF0A2A5A)
                        : AppTheme.charcoalMuted),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    displayText,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                      color: selected == null
                          ? AppTheme.charcoalMuted
                          : const Color(0xFF091B38),
                      fontSize: 13,
                      fontWeight:
                          selected == null ? FontWeight.w600 : FontWeight.w800,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Icon(Icons.keyboard_arrow_down_rounded,
                    color: enabled
                        ? const Color(0xFF0A2A5A)
                        : AppTheme.charcoalMuted),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _showAssignmentPicker({
    required String title,
    required List<Map<String, dynamic>> options,
    required String codeKey,
    required String emptyLabel,
    required String currentValue,
    required ValueChanged<String> onSelected,
  }) async {
    final queryController = TextEditingController();
    var filtered = List<Map<String, dynamic>>.from(options);
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            void filter(String query) {
              final normalized = query.trim().toLowerCase();
              setSheetState(() {
                filtered = normalized.isEmpty
                    ? List<Map<String, dynamic>>.from(options)
                    : options.where((item) {
                        final haystack =
                            '${_assignmentCode(item, codeKey)} ${item['full_name'] ?? ''} ${item['assignment_type'] ?? ''}'
                                .toLowerCase();
                        return haystack.contains(normalized);
                      }).toList();
              });
            }

            return SafeArea(
              child: Padding(
                padding: EdgeInsets.only(
                  left: 18,
                  right: 18,
                  top: 16,
                  bottom: 18 + MediaQuery.of(context).viewInsets.bottom,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            style: GoogleFonts.inter(
                              color: const Color(0xFF0A2A5A),
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(Icons.close_rounded),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: queryController,
                      onChanged: filter,
                      decoration: InputDecoration(
                        hintText: 'Search code or name',
                        prefixIcon: const Icon(Icons.search_rounded),
                        filled: true,
                        fillColor: const Color(0xFFF5F7FA),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    ConstrainedBox(
                      constraints: BoxConstraints(
                        maxHeight: MediaQuery.of(context).size.height * 0.46,
                      ),
                      child: filtered.isEmpty
                          ? Center(
                              child: Padding(
                                padding: const EdgeInsets.all(20),
                                child: Text(
                                  emptyLabel,
                                  style: GoogleFonts.inter(
                                      color: AppTheme.charcoalMuted,
                                      fontWeight: FontWeight.w700),
                                ),
                              ),
                            )
                          : ListView.separated(
                              shrinkWrap: true,
                              itemCount: filtered.length,
                              separatorBuilder: (_, __) =>
                                  const Divider(height: 1),
                              itemBuilder: (context, index) {
                                final item = filtered[index];
                                final code = _assignmentCode(item, codeKey);
                                final selected = code == currentValue;
                                return ListTile(
                                  contentPadding: EdgeInsets.zero,
                                  leading: Icon(
                                    item['assignment_type'] == 'broker'
                                        ? Icons.handshake_outlined
                                        : Icons.badge_outlined,
                                    color: selected
                                        ? const Color(0xFFF3B72B)
                                        : const Color(0xFF0A2A5A),
                                  ),
                                  title: Text(
                                    code,
                                    style: GoogleFonts.inter(
                                      color: const Color(0xFF091B38),
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                  subtitle: Text(
                                    '${item['full_name'] ?? 'No name available'}${item['assignment_type'] != null ? ' (${_assignmentTypeLabel(item['assignment_type'])})' : ''}',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  trailing: selected
                                      ? const Icon(Icons.check_circle,
                                          color: Color(0xFF3DBB62))
                                      : null,
                                  onTap: () {
                                    onSelected(code);
                                    Navigator.pop(context);
                                  },
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
    queryController.dispose();
  }

  Map<String, dynamic>? _findAssignmentByCode(
    List<Map<String, dynamic>> options,
    String codeKey,
    String value,
  ) {
    if (value.trim().isEmpty) return null;
    for (final item in options) {
      if (_assignmentCode(item, codeKey) == value.trim()) return item;
    }
    return null;
  }

  String _assignmentCode(Map<String, dynamic> item, String codeKey) {
    return (item[codeKey] ?? item['uid'] ?? item['user_id'] ?? '')
        .toString()
        .trim();
  }

  String _assignmentTypeLabel(dynamic value) {
    final type = value?.toString() ?? '';
    if (type == 'rm') return 'RM';
    if (type == 'branch_manager') return 'Branch Manager';
    if (type == 'broker') return 'Broker';
    return type;
  }

  Widget _buildRoleButton(String role, IconData icon, String text) {
    final selected = _selectedRole == role;
    return InkWell(
      onTap: () => setState(() {
        _selectedRole = role;
        if (role == 'guest') {
          _lgCodeController.clear();
          _employeeCodeController.clear();
        }
      }),
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        height: 54,
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF082A5C) : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
              color:
                  selected ? const Color(0xFF082A5C) : const Color(0xFFDDE3EC)),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: const Color(0xFF082A5C).withValues(alpha: 0.22),
                    blurRadius: 12,
                    offset: const Offset(0, 6),
                  )
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon,
                color: selected
                    ? const Color(0xFFFFC559)
                    : const Color(0xFF075EBD)),
            const SizedBox(width: 10),
            Text(text,
                style: GoogleFonts.inter(
                    color: selected ? Colors.white : const Color(0xFF075EBD),
                    fontSize: 14,
                    fontWeight: FontWeight.w900)),
          ],
        ),
      ),
    );
  }

  Widget _buildPrimaryButton(
      AuthProvider auth, String text, VoidCallback onPressed) {
    if (auth.isLoading) {
      return const Center(
          child: CircularProgressIndicator(color: AppTheme.primary));
    }
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: const Color(0xFFF3B72B),
        foregroundColor: const Color(0xFF09234B),
        elevation: 8,
        shadowColor: const Color(0xFFF3B72B).withValues(alpha: 0.35),
        minimumSize: const Size.fromHeight(58),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(text,
              style:
                  GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w900)),
          const SizedBox(width: 14),
          const Icon(Icons.arrow_forward_rounded),
        ],
      ),
    );
  }

  Widget _buildTerms() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Checkbox(
          value: _acceptTerms,
          onChanged: (value) => setState(() => _acceptTerms = value ?? false),
          activeColor: const Color(0xFF075EBD),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 10),
            child: RichText(
              text: TextSpan(
                style: GoogleFonts.inter(
                    fontSize: 12.5,
                    height: 1.35,
                    color: const Color(0xFF17233C)),
                children: [
                  const TextSpan(text: 'I accept the '),
                  TextSpan(
                      text: 'Terms & Conditions',
                      recognizer: _termsRecognizer,
                      style: const TextStyle(
                          color: Color(0xFF075EBD),
                          fontWeight: FontWeight.w800)),
                  const TextSpan(text: ', '),
                  TextSpan(
                      text: 'Privacy Policy',
                      recognizer: _privacyRecognizer,
                      style: const TextStyle(
                          color: Color(0xFF075EBD),
                          fontWeight: FontWeight.w800)),
                  const TextSpan(text: ' and '),
                  TextSpan(
                      text: 'Check-in Instructions.',
                      recognizer: _checkinRecognizer,
                      style: const TextStyle(
                          color: Color(0xFF075EBD),
                          fontWeight: FontWeight.w800)),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildError() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        border: Border.all(color: Colors.red.shade200),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(_errorMessage!,
          style: GoogleFonts.inter(color: Colors.red.shade900, fontSize: 13)),
    );
  }

  Widget _buildDemoOtpNotice(String otp) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF7DF),
        border: Border.all(color: const Color(0xFFF0C65E)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_outline_rounded, color: Color(0xFF9A6A00)),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Demo OTP: $otp',
              style: GoogleFonts.inter(
                color: const Color(0xFF6D4B00),
                fontSize: 13,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }

  TextStyle _labelStyle() {
    return GoogleFonts.inter(
      color: const Color(0xFF111C33),
      fontSize: 13,
      fontWeight: FontWeight.w900,
    );
  }
}
