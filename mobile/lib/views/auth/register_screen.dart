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
  
  String _selectedRole = 'guest';
  int _step = 1; // 1: Enter Phone, 2: Enter OTP, 3: Complete Register Details
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
      setState(() => _errorMessage = 'Failed to send OTP. Please check the number.');
    }
  }

  Future<void> _verifyOTP() async {
    if (_otpController.text.trim().isEmpty) return;
    setState(() => _errorMessage = null);
    
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.verifyOTP(_phoneController.text.trim(), _otpController.text.trim());
    if (success) {
      setState(() => _step = 3);
    } else {
      setState(() => _errorMessage = 'Invalid OTP. Please try again.');
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

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Register'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    border: Border.all(color: Colors.red.shade200),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: TextStyle(color: Colors.red.shade900, fontSize: 14),
                  ),
                ),
                const SizedBox(height: 16),
              ],
              if (_step == 1) ...[
                Text('Verify Phone Number', style: textTheme.displayMedium),
                const SizedBox(height: 8),
                Text('We\'ll send a 6-digit OTP code to verify your phone.', style: textTheme.bodyMedium),
                const SizedBox(height: 32),
                TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Phone Number',
                    hintText: 'e.g., +919876543210',
                    prefixIcon: Icon(Icons.phone),
                  ),
                ),
                const SizedBox(height: 24),
                auth.isLoading
                    ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                    : ElevatedButton(
                        onPressed: _sendOTP,
                        child: const Text('Send OTP'),
                      ),
              ] else if (_step == 2) ...[
                Text('Enter Verification Code', style: textTheme.displayMedium),
                const SizedBox(height: 8),
                Text('Enter the 6-digit OTP sent to ${_phoneController.text}', style: textTheme.bodyMedium),
                const SizedBox(height: 32),
                TextFormField(
                  controller: _otpController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'OTP Code',
                    hintText: 'Enter 6-digit OTP',
                    prefixIcon: Icon(Icons.lock_clock),
                  ),
                ),
                const SizedBox(height: 24),
                auth.isLoading
                    ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                    : ElevatedButton(
                        onPressed: _verifyOTP,
                        child: const Text('Verify OTP'),
                      ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () => setState(() => _step = 1),
                  child: const Text('Back to phone number'),
                ),
              ] else if (_step == 3) ...[
                Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text('Complete Details', style: textTheme.displayMedium),
                      const SizedBox(height: 24),
                      TextFormField(
                        controller: _fullNameController,
                        decoration: const InputDecoration(
                          labelText: 'Full Name',
                          prefixIcon: Icon(Icons.person),
                        ),
                        validator: (v) => v == null || v.isEmpty ? 'Enter your name' : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(
                          labelText: 'Email Address',
                          prefixIcon: Icon(Icons.email),
                        ),
                        validator: (v) => v == null || v.isEmpty ? 'Enter your email' : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _passwordController,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: 'Password',
                          prefixIcon: Icon(Icons.lock),
                        ),
                        validator: (v) => v == null || v.length < 6 ? 'Password min 6 chars' : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _cityController,
                        decoration: const InputDecoration(
                          labelText: 'City',
                          prefixIcon: Icon(Icons.location_city),
                        ),
                        validator: (v) => v == null || v.isEmpty ? 'Enter your city' : null,
                      ),
                      const SizedBox(height: 16),
                      Center(
                        child: Text(
                          'SELECT PROFESSIONAL ROLE',
                          style: GoogleFonts.outfit(
                            fontSize: 9,
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
                                  boxShadow: _selectedRole == 'guest'
                                      ? [
                                          BoxShadow(
                                            color: AppTheme.primary.withOpacity(0.25),
                                            blurRadius: 8,
                                            offset: const Offset(0, 4),
                                          )
                                        ]
                                      : null,
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
                                  boxShadow: _selectedRole == 'host'
                                      ? [
                                          BoxShadow(
                                            color: AppTheme.primary.withOpacity(0.25),
                                            blurRadius: 8,
                                            offset: const Offset(0, 4),
                                          )
                                        ]
                                      : null,
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
                        TextFormField(
                          controller: _lgCodeController,
                          decoration: const InputDecoration(
                            labelText: 'Broker LG Code (Optional)',
                            hintText: 'Enter referral code if referred by a broker',
                            prefixIcon: Icon(Icons.qr_code),
                          ),
                        ),
                      ],
                      const SizedBox(height: 20),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFAF7F2),
                          borderRadius: BorderRadius.circular(20),
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
                          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                          : ElevatedButton(
                              onPressed: _completeRegistration,
                              child: const Text('Complete Registration'),
                            ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
