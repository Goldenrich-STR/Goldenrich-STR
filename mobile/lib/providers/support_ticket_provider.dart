import 'package:flutter/material.dart';
import '../services/api_service.dart';

class SupportTicketProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  bool _isLoading = false;
  List<dynamic> _myTickets = [];
  List<dynamic> _adminTickets = [];
  Map<String, dynamic> _supportContent = {};

  bool get isLoading => _isLoading;
  List<dynamic> get myTickets => _myTickets;
  List<dynamic> get adminTickets => _adminTickets;
  Map<String, dynamic> get supportContent => _supportContent;
  List<dynamic> get faqItems {
    final items = _supportContent['faq_items'];
    if (items is List && items.isNotEmpty) return items;
    final topics = _supportContent['popular_topics'];
    if (topics is List) {
      return topics
          .map((topic) => {
                'id': topic is Map ? topic['link'] : null,
                'question': topic is Map ? topic['label'] : topic.toString(),
                'answer': '',
              })
          .toList();
    }
    return [];
  }

  Future<void> getMyTickets() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get('/support-tickets/my');
      if (response.statusCode == 200) {
        _myTickets = response.data['tickets'] ?? [];
      }
    } catch (_) {
      _myTickets = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> getSupportContent() async {
    try {
      final response = await _apiService.dio.get('/cms/support-page');
      if (response.statusCode == 200) {
        final data = response.data;
        if (data is Map && data['support_content'] is Map) {
          _supportContent = Map<String, dynamic>.from(data['support_content']);
        }
      }
    } catch (_) {
      _supportContent = {};
    } finally {
      notifyListeners();
    }
  }

  Future<bool> createTicket(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response =
          await _apiService.dio.post('/support-tickets', data: data);
      if (response.statusCode == 201 || response.statusCode == 200) {
        await getMyTickets();
        return true;
      }
    } catch (_) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  Future<void> getAdminTickets({String statusFilter = 'all'}) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio.get(
        '/support-tickets/admin',
        queryParameters: {'status_filter': statusFilter},
      );
      if (response.statusCode == 200) {
        _adminTickets = response.data['tickets'] ?? [];
      }
    } catch (_) {
      _adminTickets = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateTicket(String ticketId, Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.dio
          .patch('/support-tickets/admin/$ticketId', data: data);
      if (response.statusCode == 200) {
        await getAdminTickets();
        return true;
      }
    } catch (_) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }
}
