import 'dart:async';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../config.dart';
import '../../theme.dart';

class WebsiteMirrorScreen extends StatefulWidget {
  const WebsiteMirrorScreen({super.key});

  @override
  State<WebsiteMirrorScreen> createState() => _WebsiteMirrorScreenState();
}

class _WebsiteMirrorScreenState extends State<WebsiteMirrorScreen> {
  late final WebViewController _controller;
  double _progress = 0;
  bool _hasError = false;
  String _errorMessage = '';

  String get _targetUrl {
    final base = AppConfig.isProduction
        ? AppConfig.prodBaseUrl
        : AppConfig.webBaseUrl;
    return base.contains('?') ? '$base&isMobileApp=true' : '$base?isMobileApp=true';
  }

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setUserAgent('MobileApp/X-Space360')
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) {
            if (!mounted) return;
            setState(() {
              _progress = progress / 100;
            });
          },
          onPageStarted: (_) {
            if (!mounted) return;
            setState(() {
              _hasError = false;
              _errorMessage = '';
              _progress = 0.15;
            });
          },
          onPageFinished: (_) async {
            await _applyMobileViewport();
            if (!mounted) return;
            setState(() {
              _progress = 1;
            });
          },
          onWebResourceError: (error) {
            if (error.isForMainFrame != true) {
              return;
            }
            if (!mounted) return;
            setState(() {
              _hasError = true;
              _errorMessage = error.description;
            });
          },
        ),
      )
      ..loadRequest(Uri.parse(_targetUrl));
  }

  Future<void> _applyMobileViewport() async {
    const script = '''
      (function() {
        var existing = document.querySelector('meta[name="viewport"]');
        if (!existing) {
          existing = document.createElement('meta');
          existing.name = 'viewport';
          document.head.appendChild(existing);
        }
        existing.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
        document.body.style.overscrollBehavior = 'none';
      })();
    ''';

    try {
      await _controller.runJavaScript(script);
    } catch (_) {
      // Keep the mirror usable even if viewport injection fails.
    }
  }

  Future<void> _reload() async {
    setState(() {
      _hasError = false;
      _errorMessage = '';
      _progress = 0.15;
    });
    await _controller.loadRequest(Uri.parse(_targetUrl));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            Positioned.fill(
              child: _hasError ? _buildErrorState() : WebViewWidget(controller: _controller),
            ),
            if (!_hasError && _progress < 1)
              Align(
                alignment: Alignment.topCenter,
                child: LinearProgressIndicator(
                  value: _progress <= 0 ? null : _progress,
                  color: AppTheme.primary,
                  backgroundColor: Colors.transparent,
                  minHeight: 2,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.wifi_off_rounded,
              size: 48,
              color: AppTheme.charcoalMuted,
            ),
            const SizedBox(height: 16),
            Text(
              'Website mirror unavailable',
              style: Theme.of(context).textTheme.displayMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),
            Text(
              'Start the frontend on port 3000 and backend on port 8001, then reload the app.',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            if (_errorMessage.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(
                _errorMessage,
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
            ],
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _reload,
              child: const Text('Reload Mirror'),
            ),
          ],
        ),
      ),
    );
  }
}
