import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';

class NotificationProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  bool _isLoading = false;
  int _unreadCount = 0;
  List<dynamic> _notifications = [];
  bool _permissionRequested = false;

  bool get isLoading => _isLoading;
  int get unreadCount => _unreadCount;
  List<dynamic> get notifications => _notifications;
  bool get permissionRequested => _permissionRequested;

  Future<void> requestNotificationPermission() async {
    if (_permissionRequested) return;
    _permissionRequested = true;
    try {
      final status = await Permission.notification.status;
      if (status.isDenied || status.isRestricted || status.isLimited) {
        await Permission.notification.request();
      }
    } on MissingPluginException {
      // Plugin may be unavailable until a full app restart after dependency changes.
    } catch (_) {
      // Ignore permission channel failures so core app flows still work.
    }
  }

  Future<void> loadNotifications({bool unreadOnly = false}) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get(
        '/notifications/my-notifications',
        queryParameters: {'limit': 100, 'unread_only': unreadOnly},
      );
      if (response.statusCode == 200) {
        _notifications = response.data['notifications'] ?? [];
        _unreadCount = response.data['unread_count'] ?? 0;
      }
    } catch (_) {
      _notifications = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadUnreadCount() async {
    try {
      final response = await _apiService.dio.get('/notifications/unread-count');
      if (response.statusCode == 200) {
        _unreadCount = response.data['unread_count'] ?? 0;
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<bool> markRead(String notificationId) async {
    try {
      final response = await _apiService.dio
          .post('/notifications/$notificationId/mark-read');
      if (response.statusCode == 200) {
        await loadNotifications();
        return true;
      }
    } catch (_) {}
    return false;
  }

  Future<bool> markAllRead() async {
    try {
      final response =
          await _apiService.dio.post('/notifications/mark-all-read');
      if (response.statusCode == 200) {
        await loadNotifications();
        return true;
      }
    } catch (_) {}
    return false;
  }
}
