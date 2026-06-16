import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import '../../theme.dart';

class AICallLogDialog extends StatefulWidget {
  final Map<String, dynamic> call;

  const AICallLogDialog({super.key, required this.call});

  @override
  State<AICallLogDialog> createState() => _AICallLogDialogState();
}

class _AICallLogDialogState extends State<AICallLogDialog> {
  final FlutterTts _flutterTts = FlutterTts();
  bool _isPlaying = false;
  double _progress = 0.0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _initTts();
  }

  void _initTts() async {
    _flutterTts.setCompletionHandler(() {
      if (mounted) {
        setState(() {
          _isPlaying = false;
          _progress = 0.0;
        });
        _timer?.cancel();
      }
    });

    _flutterTts.setCancelHandler(() {
      if (mounted) {
        setState(() {
          _isPlaying = false;
        });
        _timer?.cancel();
      }
    });

    _flutterTts.setErrorHandler((msg) {
      if (mounted) {
        setState(() {
          _isPlaying = false;
        });
        _timer?.cancel();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Audio playback error: $msg')),
        );
      }
    });
  }

  @override
  void dispose() {
    _flutterTts.stop();
    _timer?.cancel();
    super.dispose();
  }

  void _togglePlayback() async {
    if (_isPlaying) {
      await _flutterTts.stop();
      _timer?.cancel();
      setState(() {
        _isPlaying = false;
      });
    } else {
      final String script = widget.call['script'] ?? 'No script loaded';
      final int duration = widget.call['duration_seconds'] ?? 30;

      // Detect language from script content
      String locale = 'en-US';
      if (script.contains('bolat aahe') || script.contains('tumchyasathi') || script.contains('Dhanyawad') && script.contains('Me')) {
        locale = 'mr-IN';
      } else if (script.contains('bol raha hoon') || script.contains('aapki reservation') || script.contains('Dhanyawad')) {
        locale = 'hi-IN';
      }

      await _flutterTts.setLanguage(locale);
      await _flutterTts.setSpeechRate(0.45); // Natural speaking speed
      await _flutterTts.setVolume(1.0);
      await _flutterTts.setPitch(1.0);

      setState(() {
        _isPlaying = true;
        _progress = 0.0;
      });

      await _flutterTts.speak(script);

      _timer = Timer.periodic(const Duration(milliseconds: 100), (timer) {
        if (!mounted) return;
        setState(() {
          _progress += 0.1 / duration;
          if (_progress >= 1.0) {
            _progress = 1.0;
            _isPlaying = false;
            _timer?.cancel();
          }
        });
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final String agentName = widget.call['agent_name'] ?? 'X-Space360 AI Agent';
    final String status = widget.call['status'] ?? 'completed';
    final String script = widget.call['script'] ?? 'No script loaded';
    final String timestamp = widget.call['created_at'] != null 
        ? widget.call['created_at'].toString().split('T')[0]
        : 'Recent';

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24.0)),
      backgroundColor: AppTheme.white,
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'AI Calling Agent 📞',
                  style: textTheme.displayMedium?.copyWith(fontSize: 18),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
            const Divider(color: AppTheme.stone, height: 24),
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: AppTheme.primary.withOpacity(0.1),
                  radius: 20,
                  child: const Icon(Icons.keyboard_voice, color: AppTheme.primary),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(agentName, style: textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold)),
                      Text('Status: ${status.toUpperCase()} • $timestamp', style: textTheme.labelLarge),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.background,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.stone),
              ),
              constraints: const BoxConstraints(maxHeight: 150),
              child: SingleChildScrollView(
                child: Text(
                  script,
                  style: textTheme.bodyMedium?.copyWith(
                    fontStyle: FontStyle.italic,
                    color: AppTheme.charcoalLight,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            // Playback Simulator Card
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: AppTheme.stone.withOpacity(0.3),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  IconButton(
                    icon: Icon(_isPlaying ? Icons.pause_circle_filled : Icons.play_circle_filled, size: 36),
                    color: AppTheme.primary,
                    onPressed: _togglePlayback,
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _isPlaying ? 'Playing Voice Agent Call...' : 'Listen to Call Recording',
                          style: textTheme.labelLarge?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        LinearProgressIndicator(
                          value: _progress.clamp(0.0, 1.0),
                          backgroundColor: AppTheme.white,
                          color: AppTheme.primary,
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
    );
  }
}
