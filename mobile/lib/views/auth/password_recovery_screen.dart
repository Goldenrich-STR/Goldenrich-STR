import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../theme.dart';
import '../shared/app_shell.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  String _email = '';
  String? _error;
  String? _success;

  Future<void> _submit() async {
    setState(() {
      _error = null;
      _success = null;
    });
    final message = await context
        .read<AuthProvider>()
        .forgotPassword(_email.trim());
    if (!mounted) return;
    if (message != null) {
      setState(() => _success = message);
    } else {
      setState(() => _error = context.read<AuthProvider>().lastError);
    }
  }

  @override
  Widget build(BuildContext context) {
    final loading = context.watch<AuthProvider>().isLoading;
    return _RecoveryShell(
      icon: Icons.mail_outline_rounded,
      title: 'Forgot Password?',
      subtitle:
          'Enter your registered email address to receive a password reset link.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            onChanged: (value) => _email = value,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(
              labelText: 'Registered email address',
              prefixIcon: Icon(Icons.mail_outline_rounded),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            _RecoveryStatus(message: _error!, isError: true),
          ],
          if (_success != null) ...[
            const SizedBox(height: 12),
            _RecoveryStatus(message: _success!, isError: false),
          ],
          const SizedBox(height: 18),
          ElevatedButton(
            onPressed: loading ? null : _submit,
            child: Text(loading ? 'Sending...' : 'Send Reset Link'),
          ),
          const SizedBox(height: 10),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Back to Login'),
          ),
        ],
      ),
    );
  }
}

class ResetPasswordScreen extends StatefulWidget {
  final String token;

  const ResetPasswordScreen({
    super.key,
    required this.token,
  });

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _showPassword = false;
  bool _showConfirmation = false;
  String? _error;
  bool _success = false;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  bool get _hasUppercase => RegExp(r'[A-Z]').hasMatch(_passwordController.text);
  bool get _hasLowercase => RegExp(r'[a-z]').hasMatch(_passwordController.text);
  bool get _hasNumber => RegExp(r'\d').hasMatch(_passwordController.text);
  bool get _hasSpecial =>
      RegExp(r'[^A-Za-z0-9\s]').hasMatch(_passwordController.text);
  bool get _hasLength => _passwordController.text.length >= 8;
  bool get _passwordValid =>
      _hasUppercase && _hasLowercase && _hasNumber && _hasSpecial && _hasLength;

  Future<void> _submit() async {
    setState(() => _error = null);
    if (widget.token.isEmpty) {
      setState(
        () => _error = 'This reset link is incomplete. Please request a new one.',
      );
      return;
    }
    if (!_passwordValid) {
      setState(() => _error = 'Please meet every password requirement.');
      return;
    }
    if (_passwordController.text != _confirmController.text) {
      setState(() => _error = 'Passwords do not match.');
      return;
    }

    final result = await context
        .read<AuthProvider>()
        .resetPassword(widget.token, _passwordController.text);
    if (!mounted) return;
    if (result != null) {
      setState(() => _success = true);
    } else {
      setState(() => _error = context.read<AuthProvider>().lastError);
    }
  }

  @override
  Widget build(BuildContext context) {
    final loading = context.watch<AuthProvider>().isLoading;
    return _RecoveryShell(
      icon: Icons.lock_reset_rounded,
      title: _success ? 'Password Reset Successful' : 'Reset Password',
      subtitle: _success
          ? 'Your password has been updated successfully.'
          : 'Enter and confirm your new password.',
      child: _success
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ElevatedButton(
                  onPressed: () {
                    Navigator.pushAndRemoveUntil(
                      context,
                      MaterialPageRoute(builder: (_) => const AppShell()),
                      (route) => false,
                    );
                  },
                  child: const Text('Continue to App'),
                ),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _passwordController,
                  obscureText: !_showPassword,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    labelText: 'New Password',
                    suffixIcon: IconButton(
                      onPressed: () =>
                          setState(() => _showPassword = !_showPassword),
                      icon: Icon(
                        _showPassword
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _confirmController,
                  obscureText: !_showConfirmation,
                  decoration: InputDecoration(
                    labelText: 'Confirm New Password',
                    suffixIcon: IconButton(
                      onPressed: () => setState(
                        () => _showConfirmation = !_showConfirmation,
                      ),
                      icon: Icon(
                        _showConfirmation
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                _Requirement(ok: _hasLength, text: 'At least 8 characters'),
                _Requirement(ok: _hasUppercase, text: 'One uppercase letter'),
                _Requirement(ok: _hasLowercase, text: 'One lowercase letter'),
                _Requirement(ok: _hasNumber, text: 'One number'),
                _Requirement(ok: _hasSpecial, text: 'One special character'),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  _RecoveryStatus(message: _error!, isError: true),
                ],
                const SizedBox(height: 18),
                ElevatedButton(
                  onPressed: loading ? null : _submit,
                  child: Text(loading ? 'Resetting...' : 'Reset Password'),
                ),
              ],
            ),
    );
  }
}

class _RecoveryShell extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Widget child;

  const _RecoveryShell({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F7F9),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 460),
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: AppTheme.sand,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(icon, color: AppTheme.primary),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    title,
                    textAlign: TextAlign.center,
                    style: GoogleFonts.manrope(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.charcoal,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    subtitle,
                    textAlign: TextAlign.center,
                    style: GoogleFonts.manrope(
                      fontSize: 14,
                      height: 1.65,
                      color: AppTheme.charcoalMuted,
                    ),
                  ),
                  const SizedBox(height: 24),
                  child,
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _RecoveryStatus extends StatelessWidget {
  final String message;
  final bool isError;

  const _RecoveryStatus({
    required this.message,
    required this.isError,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isError ? const Color(0xFFFFF2F2) : const Color(0xFFF1FCF5),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isError ? const Color(0xFFFFD4D4) : const Color(0xFFC6F0D3),
        ),
      ),
      child: Text(
        message,
        style: GoogleFonts.manrope(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: isError ? const Color(0xFFB42318) : const Color(0xFF067647),
        ),
      ),
    );
  }
}

class _Requirement extends StatelessWidget {
  final bool ok;
  final String text;

  const _Requirement({required this.ok, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(
            Icons.check_circle_outline_rounded,
            size: 16,
            color: ok ? const Color(0xFF067647) : AppTheme.charcoalMuted,
          ),
          const SizedBox(width: 8),
          Text(
            text,
            style: GoogleFonts.manrope(
              fontSize: 12,
              color: ok ? const Color(0xFF067647) : AppTheme.charcoalMuted,
            ),
          ),
        ],
      ),
    );
  }
}
