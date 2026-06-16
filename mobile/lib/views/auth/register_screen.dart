import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme.dart';
import '../shared/app_shell.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

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

  @override
  void dispose() {
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
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const AppShell()),
      );
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
                      DropdownButtonFormField<String>(
                        initialValue: _selectedRole,
                        decoration: const InputDecoration(
                          labelText: 'Register As',
                          prefixIcon: Icon(Icons.work),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'guest', child: Text('Guest (Rent a space)')),
                          DropdownMenuItem(value: 'host', child: Text('Host (List a space)')),
                          DropdownMenuItem(value: 'broker', child: Text('Broker (Verify properties)')),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setState(() => _selectedRole = val);
                          }
                        },
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
