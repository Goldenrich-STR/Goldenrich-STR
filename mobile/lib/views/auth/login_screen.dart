import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../providers/auth_provider.dart';
import '../../theme.dart';
import '../shared/app_shell.dart';
import '../../services/api_service.dart';
import 'package:flutter/gestures.dart';
import 'package:url_launcher/url_launcher.dart';

class LoginScreen extends StatefulWidget {
  final bool popOnSuccess;
  const LoginScreen({super.key, this.popOnSuccess = false});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
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
  final _emailRegController = TextEditingController();
  final _fullNameController = TextEditingController();
  final _passwordRegController = TextEditingController();
  final _cityController = TextEditingController();
  final _lgCodeController = TextEditingController();

  String _selectedRole = 'guest';
  String? _errorMessage;
  bool _acceptTerms = false;

  late TapGestureRecognizer _termsRecognizer;
  late TapGestureRecognizer _privacyRecognizer;
  late TapGestureRecognizer _checkinRecognizer;

  String _termsText = 'By using X-Space360, users agree to follow booking, listing, verification, payment, cancellation, and platform conduct rules published by X-Space360.';
  String _privacyText = 'X-Space360 respects your privacy. We collect only the information needed to manage accounts, property listings, bookings, support, verification, and secure platform operations.';
  String _checkinText = 'Standard check-in time starts at 2:00 PM. Please present your valid Government ID upon arrival. Quiet hours are from 10:00 PM to 7:00 AM.';

  @override
  void initState() {
    super.initState();
    _termsRecognizer = TapGestureRecognizer()..onTap = () => _showDocumentDialog('Terms & Conditions', _termsText);
    _privacyRecognizer = TapGestureRecognizer()..onTap = () => _showDocumentDialog('Privacy Policy', _privacyText);
    _checkinRecognizer = TapGestureRecognizer()..onTap = () => _showDocumentDialog('Check-in Instructions', _checkinText);
    _fetchCmsContent();
  }

  Future<void> _fetchCmsContent() async {
    try {
      final response = await ApiService().dio.get('/cms/landing-page');
      if (response.statusCode == 200 && response.data != null) {
        final footer = response.data['footer'];
        if (footer != null) {
          setState(() {
            if (footer['terms_text'] != null && footer['terms_text'].toString().isNotEmpty) {
              _termsText = footer['terms_text'];
            }
            if (footer['privacy_text'] != null && footer['privacy_text'].toString().isNotEmpty) {
              _privacyText = footer['privacy_text'];
            }
            if (footer['checkin_text'] != null && footer['checkin_text'].toString().isNotEmpty) {
              _checkinText = footer['checkin_text'];
            }
          });
        }
      }
    } catch (e) {
      debugPrint('Error fetching CMS landing page content: $e');
    }
  }

  void _showDocumentDialog(String title, String content) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            title,
            style: GoogleFonts.outfit(
              fontWeight: FontWeight.bold,
              color: AppTheme.charcoal,
            ),
          ),
          content: SingleChildScrollView(
            child: Text(
              content,
              style: GoogleFonts.outfit(
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
                style: GoogleFonts.outfit(
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

  void _showDeveloperSettingsDialog() {
    final TextEditingController urlController = TextEditingController(text: ApiService().baseUrl);
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            'Developer Settings',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Change API Base URL:',
                style: GoogleFonts.outfit(fontSize: 14, color: AppTheme.charcoalMuted),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: urlController,
                decoration: InputDecoration(
                  hintText: 'http://10.0.2.2:8001',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
                style: GoogleFonts.outfit(fontSize: 14),
              ),
              const SizedBox(height: 12),
              Text(
                'Note: Use http://10.0.2.2:8001 for emulator, or http://<YOUR_LAN_IP>:8001 for real devices on the same WiFi.',
                style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('CANCEL', style: GoogleFonts.outfit(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: () async {
                final newUrl = urlController.text.trim();
                if (newUrl.isNotEmpty) {
                  await ApiService().setBaseUrl(newUrl);
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('API Base URL updated to: $newUrl')),
                    );
                    Navigator.pop(context);
                  }
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
              child: Text('SAVE', style: GoogleFonts.outfit(color: Colors.white)),
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
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    _otpController.dispose();
    _emailRegController.dispose();
    _fullNameController.dispose();
    _passwordRegController.dispose();
    _cityController.dispose();
    _lgCodeController.dispose();
    super.dispose();
  }

  void _handleClose() {
    if (Navigator.canPop(context)) {
      Navigator.pop(context);
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const AppShell()),
      );
    }
  }

  Future<void> _sendOTP() async {
    setState(() => _errorMessage = null);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.sendOTP(_phoneController.text.trim());
    if (success) {
      setState(() => _step = 2); // Go to OTP verification
      if (auth.demoOtp != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Demo OTP sent: ${auth.demoOtp} (Use this or 123456)'),
            duration: const Duration(seconds: 10),
            action: SnackBarAction(
              label: 'Copy',
              textColor: const Color(0xFFD4AF37),
              onPressed: () {
                _otpController.text = auth.demoOtp!;
              },
            ),
          ),
        );
      }
    } else {
      setState(() => _errorMessage = 'Failed to send OTP. Please check the number.');
    }
  }

  Future<void> _verifyOTP() async {
    if (_otpController.text.trim().isEmpty) {
      setState(() => _errorMessage = 'Please enter the verification code.');
      return;
    }
    setState(() => _errorMessage = null);

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.verifyOTP(_phoneController.text.trim(), _otpController.text.trim());
    if (success) {
      setState(() {
        _step = 3; // Go to registration details
        _emailRegController.text = ''; // Clear for user entry
      });
    } else {
      setState(() => _errorMessage = 'Invalid OTP. Please try again.');
    }
  }

  Future<void> _handleLogin() async {
    if (_passwordController.text.isEmpty) {
      setState(() => _errorMessage = 'Please enter password');
      return;
    }
    setState(() => _errorMessage = null);

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.login(
      _emailController.text.trim(),
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
        _errorMessage = 'Invalid email or password. Please try again.';
      });
    }
  }

  Future<void> _completeRegistration() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_acceptTerms) {
      setState(() => _errorMessage = 'Please accept the Terms & Conditions, Privacy Policy, and Check-in Instructions.');
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
      setState(() => _errorMessage = 'Registration failed. Email/phone might already exist.');
    }
  }

  Future<void> _handleGrpSso() async {
    setState(() => _errorMessage = null);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.login('broker@propnest.com', 'broker123');
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
        _errorMessage = 'GRP SSO authentication failed. Please verify the broker seed account.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.close, color: Colors.black, size: 24),
            onPressed: _handleClose,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 20),
                
                // Centered Logo
                Center(
                  child: GestureDetector(
                    onTap: () {
                      _logoTapCount++;
                      if (_logoTapCount >= 5) {
                        _logoTapCount = 0;
                        _showDeveloperSettingsDialog();
                      }
                    },
                    child: Image.asset(
                      'assets/images/logo.png',
                      height: 80,
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) {
                        return const Icon(
                          Icons.holiday_village_outlined,
                          size: 72,
                          color: AppTheme.primary,
                        );
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 28),
                
                // Title (Airbnb Image 1 style)
                Text(
                  _step == 3
                      ? 'Complete registration'
                      : _step == 2
                          ? 'Verification'
                          : _isSignUpMode
                              ? 'Create your account'
                              : 'Welcome back',
                  style: GoogleFonts.outfit(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.charcoal,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),

                if (_step == 0) ...[
                  Container(
                    height: 50,
                    decoration: BoxDecoration(
                      color: AppTheme.stone,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.border.withOpacity(0.5)),
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
                              duration: const Duration(milliseconds: 250),
                              curve: Curves.easeInOut,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: !_isSignUpMode ? Colors.white : Colors.transparent,
                                borderRadius: BorderRadius.circular(12),
                                boxShadow: !_isSignUpMode
                                    ? [
                                        BoxShadow(
                                          color: Colors.black.withOpacity(0.06),
                                          blurRadius: 8,
                                          offset: const Offset(0, 3),
                                        )
                                      ]
                                    : null,
                              ),
                              margin: const EdgeInsets.all(4),
                              child: Text(
                                'Sign In',
                                style: GoogleFonts.outfit(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: !_isSignUpMode ? AppTheme.charcoal : AppTheme.charcoalMuted,
                                ),
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
                              duration: const Duration(milliseconds: 250),
                              curve: Curves.easeInOut,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: _isSignUpMode ? Colors.white : Colors.transparent,
                                borderRadius: BorderRadius.circular(12),
                                boxShadow: _isSignUpMode
                                    ? [
                                        BoxShadow(
                                          color: Colors.black.withOpacity(0.06),
                                          blurRadius: 8,
                                          offset: const Offset(0, 3),
                                        )
                                      ]
                                    : null,
                              ),
                              margin: const EdgeInsets.all(4),
                              child: Text(
                                'Sign Up',
                                style: GoogleFonts.outfit(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: _isSignUpMode ? AppTheme.charcoal : AppTheme.charcoalMuted,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],

                // Error Banner
                if (_errorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      border: Border.all(color: Colors.red.shade200),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _errorMessage!,
                      style: TextStyle(color: Colors.red.shade900, fontSize: 13),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 20),
                ],

                // Form Steps
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: _buildFormContent(auth),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFormContent(AuthProvider auth) {
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
              decoration: InputDecoration(
                hintText: 'Email address',
                hintStyle: GoogleFonts.manrope(color: AppTheme.charcoalMuted, fontSize: 15),
                prefixIcon: const Icon(Icons.email_outlined, color: AppTheme.charcoalMuted),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppTheme.border, width: 1),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppTheme.border, width: 1),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppTheme.primary, width: 1.5),
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _passwordController,
              obscureText: true,
              decoration: InputDecoration(
                hintText: 'Password',
                hintStyle: GoogleFonts.manrope(color: AppTheme.charcoalMuted, fontSize: 15),
                prefixIcon: const Icon(Icons.lock_outline, color: AppTheme.charcoalMuted),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppTheme.border, width: 1),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppTheme.border, width: 1),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppTheme.primary, width: 1.5),
                ),
              ),
            ),
            const SizedBox(height: 24),
            auth.isLoading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                : SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: _handleLogin,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: Text(
                        'Sign In',
                        style: GoogleFonts.manrope(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'If you are a broker ',
                  style: GoogleFonts.manrope(
                    fontSize: 14,
                    color: AppTheme.charcoalMuted,
                  ),
                ),
                GestureDetector(
                  onTap: () async {
                    final uri = Uri.parse('https://www.goldenrichproperties.com/');
                    try {
                      await launchUrl(uri, mode: LaunchMode.externalApplication);
                    } catch (e) {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Could not open browser: $e')),
                        );
                      }
                    }
                  },
                  child: Text(
                    'Sign In',
                    style: GoogleFonts.manrope(
                      fontSize: 14,
                      color: AppTheme.primary,
                      fontWeight: FontWeight.bold,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // GRP SSO
            OutlinedButton.icon(
              onPressed: _handleGrpSso,
              icon: const Icon(Icons.domain_outlined, color: AppTheme.charcoal, size: 20),
              label: Text(
                'Continue with GRP SSO',
                style: GoogleFonts.manrope(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.charcoal,
                ),
              ),
              style: OutlinedButton.styleFrom(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                side: const BorderSide(color: AppTheme.border),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
            const SizedBox(height: 16),
            Center(
              child: TextButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Please contact support to reset password: support@x-space360.in')),
                  );
                },
                child: Text(
                  'Forgot Password?',
                  style: GoogleFonts.manrope(
                    fontSize: 13,
                    color: AppTheme.charcoalMuted,
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
              decoration: InputDecoration(
                hintText: 'Phone number',
                hintStyle: GoogleFonts.manrope(color: AppTheme.charcoalMuted, fontSize: 15),
                prefixIcon: const Icon(Icons.phone_outlined, color: AppTheme.charcoalMuted),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppTheme.border, width: 1),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppTheme.border, width: 1),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppTheme.primary, width: 1.5),
                ),
              ),
            ),
            const SizedBox(height: 24),
            auth.isLoading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
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
                        style: GoogleFonts.manrope(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'If you are a broker ',
                  style: GoogleFonts.manrope(
                    fontSize: 14,
                    color: AppTheme.charcoalMuted,
                  ),
                ),
                GestureDetector(
                  onTap: () async {
                    final uri = Uri.parse('https://www.goldenrichproperties.com/');
                    try {
                      await launchUrl(uri, mode: LaunchMode.externalApplication);
                    } catch (e) {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Could not open browser: $e')),
                        );
                      }
                    }
                  },
                  child: Text(
                    'Sign In',
                    style: GoogleFonts.manrope(
                      fontSize: 14,
                      color: AppTheme.primary,
                      fontWeight: FontWeight.bold,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
              ],
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
            style: GoogleFonts.outfit(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: AppTheme.charcoalMuted,
              letterSpacing: 1.0,
            ),
            textAlign: TextAlign.center,
          ),
          Text(
            _phoneController.text,
            style: GoogleFonts.manrope(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: AppTheme.charcoal,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _otpController,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              hintText: 'Enter 6-digit OTP',
              hintStyle: GoogleFonts.manrope(color: AppTheme.charcoalMuted, fontSize: 15),
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppTheme.border, width: 1),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppTheme.border, width: 1),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppTheme.primary, width: 1.5),
              ),
            ),
          ),
          const SizedBox(height: 20),

          auth.isLoading
              ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
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
                      style: GoogleFonts.manrope(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
          const SizedBox(height: 16),
          
          TextButton(
            onPressed: () => setState(() => _step = 0),
            child: Text(
              'Change Phone Number',
              style: GoogleFonts.manrope(
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
          Text(
            'FULL NAME',
            style: GoogleFonts.outfit(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: AppTheme.charcoal,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 6),
          TextFormField(
            controller: _fullNameController,
            decoration: InputDecoration(
              hintText: 'Enter your full name',
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
          const SizedBox(height: 16),

          Text(
            'EMAIL ADDRESS',
            style: GoogleFonts.outfit(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: AppTheme.charcoal,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 6),
          TextFormField(
            controller: _emailRegController,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(
              hintText: 'e.g., guest@example.com',
              prefixIcon: const Icon(Icons.email_outlined),
              filled: true,
              fillColor: AppTheme.stone,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide.none,
              ),
            ),
            validator: (v) => v == null || v.isEmpty ? 'Enter your email' : null,
          ),
          const SizedBox(height: 16),

          Text(
            'PHONE NUMBER',
            style: GoogleFonts.outfit(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: AppTheme.charcoal,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 6),
          TextFormField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            decoration: InputDecoration(
              hintText: 'e.g., +919876543210',
              prefixIcon: const Icon(Icons.phone_outlined),
              filled: true,
              fillColor: AppTheme.stone,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide.none,
              ),
            ),
            validator: (v) => v == null || v.isEmpty ? 'Enter your phone number' : null,
          ),
          const SizedBox(height: 16),

          Text(
            'PASSWORD',
            style: GoogleFonts.outfit(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: AppTheme.charcoal,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 6),
          TextFormField(
            controller: _passwordRegController,
            obscureText: true,
            decoration: InputDecoration(
              hintText: 'Min 6 characters',
              prefixIcon: const Icon(Icons.lock_outline),
              filled: true,
              fillColor: AppTheme.stone,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide.none,
              ),
            ),
            validator: (v) => v == null || v.length < 6 ? 'Password min 6 chars' : null,
          ),
          const SizedBox(height: 16),

          Text(
            'CITY',
            style: GoogleFonts.outfit(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: AppTheme.charcoal,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 6),
          TextFormField(
            controller: _cityController,
            decoration: InputDecoration(
              hintText: 'Your current city',
              prefixIcon: const Icon(Icons.location_city_outlined),
              filled: true,
              fillColor: AppTheme.stone,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide.none,
              ),
            ),
            validator: (v) => v == null || v.isEmpty ? 'Enter your city' : null,
          ),
          const SizedBox(height: 20),

          Center(
            child: Text(
              'SELECT ROLE',
              style: GoogleFonts.outfit(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: AppTheme.charcoalMuted,
                letterSpacing: 1.0,
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
                    });
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    height: 48,
                    decoration: BoxDecoration(
                      color: _selectedRole == 'guest' ? AppTheme.primary : Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: _selectedRole == 'guest' ? AppTheme.primary : AppTheme.border,
                        width: 1,
                      ),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      'EXPLORER',
                      style: GoogleFonts.outfit(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: _selectedRole == 'guest' ? Colors.white : AppTheme.charcoalMuted,
                        letterSpacing: 0.5,
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
                      color: _selectedRole == 'host' ? AppTheme.primary : Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: _selectedRole == 'host' ? AppTheme.primary : AppTheme.border,
                        width: 1,
                      ),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      'OWNER',
                      style: GoogleFonts.outfit(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: _selectedRole == 'host' ? Colors.white : AppTheme.charcoalMuted,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          if (_selectedRole == 'host') ...[
            const SizedBox(height: 16),
            Text(
              'BROKER LG CODE (OPTIONAL)',
              style: GoogleFonts.outfit(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: AppTheme.charcoal,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 6),
            TextFormField(
              controller: _lgCodeController,
              decoration: InputDecoration(
                hintText: 'Enter code if referred by a broker',
                prefixIcon: const Icon(Icons.qr_code_outlined),
                filled: true,
                fillColor: AppTheme.stone,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ],
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
                      color: _acceptTerms ? AppTheme.primary : Colors.transparent,
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(
                        color: _acceptTerms ? AppTheme.primary : AppTheme.charcoalMuted,
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
                      style: GoogleFonts.outfit(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.charcoalMuted,
                        letterSpacing: 0.5,
                      ),
                      children: [
                        const TextSpan(text: 'I ACCEPT THE '),
                        TextSpan(
                          text: 'Terms & Conditions',
                          recognizer: _termsRecognizer,
                          style: TextStyle(
                            color: AppTheme.primary,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const TextSpan(text: ', '),
                        TextSpan(
                          text: 'Privacy Policy',
                          recognizer: _privacyRecognizer,
                          style: TextStyle(
                            color: AppTheme.primary,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const TextSpan(text: ' AND '),
                        TextSpan(
                          text: 'Check-in Instructions',
                          recognizer: _checkinRecognizer,
                          style: TextStyle(
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
              ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
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
                      style: GoogleFonts.manrope(
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
              style: GoogleFonts.manrope(
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
