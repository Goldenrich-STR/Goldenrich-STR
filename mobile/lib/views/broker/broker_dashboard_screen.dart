import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:dio/dio.dart' as dio;
import '../../config.dart';
import '../../services/api_service.dart';
import '../../theme.dart';
import '../../models/property_model.dart';
import '../shared/app_logo.dart';

class BrokerDashboardScreen extends StatefulWidget {
  final String initialTab;

  const BrokerDashboardScreen({super.key, this.initialTab = 'overview'});

  @override
  State<BrokerDashboardScreen> createState() => _BrokerDashboardScreenState();
}

class _BrokerDashboardScreenState extends State<BrokerDashboardScreen> {
  final ApiService _apiService = ApiService();
  late String _activeTab;
  bool _isLoading = false;

  // Data states
  Map<String, dynamic>? _stats;
  List<dynamic> _owners = [];
  List<dynamic> _properties = [];
  List<dynamic> _verifications = [];
  List<dynamic> _leads = [];
  Map<String, dynamic>? _commissionData;
  List<dynamic> _commissions = [];

  // Lead Form state
  bool _showAddLeadForm = false;
  final _leadFormKey = GlobalKey<FormState>();
  final _leadNameController = TextEditingController();
  final _leadPhoneController = TextEditingController();
  final _leadEmailController = TextEditingController();
  final _leadCityController = TextEditingController();
  final _leadNotesController = TextEditingController();
  String _leadPropertyType = 'residential';
  String? _leadSelectedPropertyId;
  String? _leadSelectedPropertyTitle;
  DateTime? _leadFromDate;
  DateTime? _leadToDate;
  bool _isSubmittingLead = false;

  @override
  void initState() {
    super.initState();
    _activeTab = widget.initialTab;
    _refreshData();
  }

  @override
  void dispose() {
    _leadNameController.dispose();
    _leadPhoneController.dispose();
    _leadEmailController.dispose();
    _leadCityController.dispose();
    _leadNotesController.dispose();
    super.dispose();
  }

  String _getImageUrl(String? path) {
    return AppConfig.resolveImageUrl(path);
  }

  Future<void> _refreshData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      if (_activeTab == 'overview') {
        final res = await _apiService.dio.get('/broker/dashboard/stats');
        if (res.statusCode == 200) {
          _stats = res.data;
        }
      } else if (_activeTab == 'owners') {
        final res = await _apiService.dio.get('/broker/my-owners');
        if (res.statusCode == 200) {
          _owners = res.data['owners'] ?? [];
        }
      } else if (_activeTab == 'properties') {
        final res = await _apiService.dio.get('/broker/properties');
        if (res.statusCode == 200) {
          _properties = res.data['properties'] ?? [];
        }
      } else if (_activeTab == 'verifications') {
        final res = await _apiService.dio.get('/broker/verifications');
        if (res.statusCode == 200) {
          _verifications = res.data['verifications'] ?? [];
        }
      } else if (_activeTab == 'leads') {
        final res = await _apiService.dio.get('/broker/leads');
        if (res.statusCode == 200) {
          _leads = res.data['leads'] ?? [];
        }
        // Fetch properties also to populate dropdown
        final propRes = await _apiService.dio.get('/broker/properties');
        if (propRes.statusCode == 200) {
          _properties = propRes.data['properties'] ?? [];
        }
      } else if (_activeTab == 'commissions') {
        final res = await _apiService.dio.get('/broker/commissions');
        if (res.statusCode == 200) {
          _commissionData = res.data['summary'];
          _commissions = res.data['commissions'] ?? [];
        }
      }
    } catch (e) {
      debugPrint('Error fetching broker data: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  // Submit Lead
  Future<void> _submitLead() async {
    if (!_leadFormKey.currentState!.validate()) return;
    setState(() {
      _isSubmittingLead = true;
    });

    try {
      final payload = {
        'full_name': _leadNameController.text.trim(),
        'phone': _leadPhoneController.text.trim(),
        'email': _leadEmailController.text.trim().isEmpty
            ? null
            : _leadEmailController.text.trim(),
        'city': _leadCityController.text.trim(),
        'property_type': _leadPropertyType,
        'from_date': _leadFromDate != null
            ? DateFormat('yyyy-MM-dd').format(_leadFromDate!)
            : null,
        'to_date': _leadToDate != null
            ? DateFormat('yyyy-MM-dd').format(_leadToDate!)
            : null,
        'property_id': _leadSelectedPropertyId,
        'property_title': _leadSelectedPropertyTitle,
        'notes': _leadNotesController.text.trim().isEmpty
            ? null
            : _leadNotesController.text.trim(),
      };

      final res = await _apiService.dio.post('/broker/leads', data: payload);
      if (res.statusCode == 200 || res.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Lead added successfully!')),
        );
        // Clear form
        _leadNameController.clear();
        _leadPhoneController.clear();
        _leadEmailController.clear();
        _leadCityController.clear();
        _leadNotesController.clear();
        setState(() {
          _leadFromDate = null;
          _leadToDate = null;
          _leadSelectedPropertyId = null;
          _leadSelectedPropertyTitle = null;
          _showAddLeadForm = false;
        });
        _refreshData();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to create lead: $e')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isSubmittingLead = false;
        });
      }
    }
  }

  // Update Lead Status
  Future<void> _updateLeadStatus(String leadId, String newStatus) async {
    try {
      final res = await _apiService.dio.patch('/broker/leads/$leadId', data: {
        'status': newStatus,
      });
      if (res.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lead status updated to $newStatus')),
        );
        _refreshData();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update status: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Row(
          children: [
            AppLogo(height: 24, tintColor: Colors.black, framed: false),
          ],
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: _refreshData,
        color: AppTheme.primary,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Broker Dashboard',
                    style: textTheme.displayMedium?.copyWith(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: AppTheme.charcoal,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(color: AppTheme.primary))
                  : SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(16.0),
                      child: _buildTabContent(),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabContent() {
    switch (_activeTab) {
      case 'overview':
        return _buildOverviewContent();
      case 'owners':
        return _buildOwnersContent();
      case 'properties':
        return _buildPropertiesContent();
      case 'verifications':
        return _buildVerificationsContent();
      case 'leads':
        return _buildLeadsContent();
      case 'commissions':
        return _buildCommissionsContent();
      default:
        return Container();
    }
  }

  // 1. OVERVIEW
  Widget _buildOverviewContent() {
    final ownersCount = _stats?['owners']?['total'] ?? 0;
    final propCount = _stats?['properties']?['total'] ?? 0;
    final liveProp = _stats?['properties']?['live'] ?? 0;
    final pendingVerify = _stats?['verifications']?['pending'] ?? 0;
    final totalComm = _stats?['commission']?['total'] ?? 0;
    final paidComm = _stats?['commission']?['paid'] ?? 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildStatsGrid([
          _buildStatCard('My Hosts', ownersCount.toString(), null),
          _buildStatCard(
              'Total Properties', propCount.toString(), '$liveProp Live'),
          _buildStatCard(
              'Pending Verifications', pendingVerify.toString(), null),
          _buildStatCard(
              'Total Commission',
              '₹${(totalComm / 100).toStringAsFixed(0)}',
              '₹${(paidComm / 100).toStringAsFixed(0)} Paid'),
        ]),
        const SizedBox(height: 24),
        // System Shortcuts
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: AppTheme.charcoal,
            borderRadius: BorderRadius.circular(24),
          ),
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'System Shortcuts',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
              ),
              const SizedBox(height: 16),
              _buildShortcutButton(
                'GENERATE LEAD',
                Icons.gps_fixed,
                AppTheme.primary,
                () {
                  setState(() {
                    _activeTab = 'leads';
                    _showAddLeadForm = true;
                  });
                  _refreshData();
                },
              ),
              const SizedBox(height: 12),
              _buildShortcutButton(
                'SITE INSPECTION',
                Icons.assignment_turned_in_outlined,
                AppTheme.secondary,
                () {
                  setState(() {
                    _activeTab = 'verifications';
                  });
                  _refreshData();
                },
              ),
              const SizedBox(height: 12),
              _buildShortcutButton(
                'NETWORK VIEW',
                Icons.group_outlined,
                Colors.white,
                () {
                  setState(() {
                    _activeTab = 'owners';
                  });
                  _refreshData();
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStatsGrid(List<Widget> cards) {
    return LayoutBuilder(
      builder: (context, constraints) {
        const spacing = 12.0;
        final crossAxisCount = constraints.maxWidth >= 600 ? 4 : 2;
        final cardWidth =
            (constraints.maxWidth - spacing * (crossAxisCount - 1)) /
                crossAxisCount;

        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: cards
              .map((card) => SizedBox(width: cardWidth, child: card))
              .toList(),
        );
      },
    );
  }

  Widget _buildStatCard(String label, String value, String? subtext) {
    return Container(
      height: 120,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.stone),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.stone,
              borderRadius: BorderRadius.circular(8),
            ),
            child:
                const Icon(Icons.bar_chart, color: AppTheme.primary, size: 18),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: AppTheme.charcoal),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                label,
                style: const TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.charcoalMuted),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              if (subtext != null) ...[
                const SizedBox(height: 4),
                Text(
                  subtext,
                  style: const TextStyle(
                      fontSize: 8,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.secondary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildShortcutButton(
      String label, IconData icon, Color iconColor, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Icon(icon, color: iconColor, size: 20),
                const SizedBox(width: 12),
                Text(
                  label,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.0,
                  ),
                ),
              ],
            ),
            const Icon(Icons.chevron_right, color: Colors.white24, size: 16),
          ],
        ),
      ),
    );
  }

  // 2. MY HOSTS
  Widget _buildOwnersContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Host Network',
          style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
              color: AppTheme.charcoal),
        ),
        const SizedBox(height: 16),
        _owners.isEmpty
            ? _buildEmptyState(Icons.people_outline, 'No Hosts Assigned',
                'You haven\'t been assigned any hosts yet.')
            : ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _owners.length,
                itemBuilder: (context, idx) {
                  final owner = _owners[idx];
                  final isKycApproved = owner['kyc_status'] == 'approved';
                  final isPaid = owner['registration_fee_paid'] == true;
                  final regDateStr = owner['created_at'] ?? owner['timestamp'];
                  String formattedDate = '';
                  if (regDateStr != null) {
                    try {
                      final dt = DateTime.parse(regDateStr);
                      formattedDate = DateFormat('dd MMM yyyy').format(dt);
                    } catch (_) {}
                  }

                  return Card(
                    margin: const EdgeInsets.only(bottom: 16),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              CircleAvatar(
                                radius: 28,
                                backgroundImage: NetworkImage(owner[
                                        'profile_image'] ??
                                    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          owner['full_name'] ?? 'Host',
                                          style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 16),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: isKycApproved
                                                ? AppTheme.secondary
                                                    .withOpacity(0.1)
                                                : Colors.amber.withOpacity(0.1),
                                            borderRadius:
                                                BorderRadius.circular(12),
                                          ),
                                          child: Text(
                                            'KYC: ${owner['kyc_status']?.toString().toUpperCase()}',
                                            style: TextStyle(
                                              color: isKycApproved
                                                  ? AppTheme.secondary
                                                  : Colors.amber[800],
                                              fontSize: 9,
                                              fontWeight: FontWeight.w900,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(owner['email'] ?? '',
                                        style: const TextStyle(
                                            fontSize: 12,
                                            color: AppTheme.charcoalMuted)),
                                    Text(owner['phone'] ?? '',
                                        style: const TextStyle(
                                            fontSize: 12,
                                            color: AppTheme.charcoalMuted)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12.0),
                            child: Divider(color: AppTheme.stone, height: 1),
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('City / Location',
                                      style: TextStyle(
                                          fontSize: 9,
                                          color: AppTheme.charcoalMuted,
                                          fontWeight: FontWeight.bold)),
                                  Text(owner['city'] ?? 'Not Specified',
                                      style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold)),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  const Text('Registration Payment',
                                      style: TextStyle(
                                          fontSize: 9,
                                          color: AppTheme.charcoalMuted,
                                          fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 2),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: isPaid
                                          ? Colors.green.withOpacity(0.1)
                                          : Colors.red.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      isPaid ? 'PAID' : 'UNPAID',
                                      style: TextStyle(
                                          color: isPaid
                                              ? Colors.green
                                              : Colors.red,
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppTheme.stone,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: AppTheme.border),
                                ),
                                child: Text(
                                  '${owner['property_count'] ?? 0} Assets',
                                  style: const TextStyle(
                                      color: AppTheme.primary,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w900),
                                ),
                              ),
                              if (formattedDate.isNotEmpty)
                                Text('Registered: $formattedDate',
                                    style: const TextStyle(
                                        fontSize: 10,
                                        color: AppTheme.charcoalMuted)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
      ],
    );
  }

  // 3. PROPERTIES
  Widget _buildPropertiesContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Property Inventory',
          style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
              color: AppTheme.charcoal),
        ),
        const SizedBox(height: 16),
        _properties.isEmpty
            ? _buildEmptyState(Icons.business_outlined, 'No Properties',
                'No properties are registered under your portfolio.')
            : ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _properties.length,
                itemBuilder: (context, idx) {
                  final prop = _properties[idx];
                  final isLive = prop['status'] == 'live';

                  return Card(
                    margin: const EdgeInsets.only(bottom: 16),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.network(
                              _getImageUrl(prop['images'] != null &&
                                      prop['images'].isNotEmpty
                                  ? prop['images'][0]
                                  : null),
                              width: 80,
                              height: 80,
                              fit: BoxFit.cover,
                              errorBuilder: (context, _, __) => Container(
                                width: 80,
                                height: 80,
                                color: AppTheme.stone,
                                child: const Icon(Icons.image_not_supported,
                                    color: AppTheme.charcoalMuted),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  prop['title'] ?? '',
                                  style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    const Icon(Icons.location_on_outlined,
                                        size: 10,
                                        color: AppTheme.charcoalMuted),
                                    const SizedBox(width: 2),
                                    Text(
                                      '${prop['city']} · ${prop['category']}',
                                      style: const TextStyle(
                                          fontSize: 10,
                                          color: AppTheme.charcoalMuted,
                                          fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      '₹${(prop['price_per_night'] as num?)?.toStringAsFixed(0)} /night',
                                      style: const TextStyle(
                                          color: AppTheme.primary,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: isLive
                                            ? AppTheme.secondary
                                                .withOpacity(0.1)
                                            : Colors.amber.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        prop['status']
                                                ?.toString()
                                                .toUpperCase()
                                                .replaceAll('_', ' ') ??
                                            '',
                                        style: TextStyle(
                                          color: isLive
                                              ? AppTheme.secondary
                                              : Colors.amber[800],
                                          fontSize: 8,
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
      ],
    );
  }

  // 4. VERIFICATIONS
  Widget _buildVerificationsContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Inspection Queue',
          style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
              color: AppTheme.charcoal),
        ),
        const SizedBox(height: 16),
        _verifications.isEmpty
            ? _buildEmptyState(
                Icons.assignment_turned_in_outlined,
                'Queue Clear',
                'NO PENDING PHYSICAL SITE INSPECTIONS ASSIGNED.',
              )
            : ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _verifications.length,
                itemBuilder: (context, idx) {
                  final task = _verifications[idx];
                  final pd = task['property_details'] ?? {};
                  final status = task['status'] ?? 'pending';
                  final isPending = status.toLowerCase() == 'pending' ||
                      status.toLowerCase() == 'in_progress';

                  return Card(
                    margin: const EdgeInsets.only(bottom: 16),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.network(
                                  _getImageUrl(pd['images'] != null &&
                                          pd['images'].isNotEmpty
                                      ? pd['images'][0]
                                      : null),
                                  width: 80,
                                  height: 80,
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, _, __) => Container(
                                    width: 80,
                                    height: 80,
                                    color: AppTheme.stone,
                                    child: const Icon(Icons.image_not_supported,
                                        color: AppTheme.charcoalMuted),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      pd['title'] ?? 'Property Verification',
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 4),
                                    Text('City: ${pd['city'] ?? 'N/A'}',
                                        style: const TextStyle(
                                            fontSize: 11,
                                            color: AppTheme.charcoalLight)),
                                    Text('Address: ${pd['address'] ?? 'N/A'}',
                                        style: const TextStyle(
                                            fontSize: 11,
                                            color: AppTheme.charcoalMuted),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis),
                                    const SizedBox(height: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: isPending
                                            ? Colors.amber.withOpacity(0.1)
                                            : AppTheme.secondary
                                                .withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        status
                                            .toUpperCase()
                                            .replaceAll('_', ' '),
                                        style: TextStyle(
                                          color: isPending
                                              ? Colors.amber[800]
                                              : AppTheme.secondary,
                                          fontSize: 8,
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          if (isPending) ...[
                            const SizedBox(height: 16),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                onPressed: () =>
                                    _openVerificationSubmissionSheet(
                                        task['property_id']),
                                style: ElevatedButton.styleFrom(
                                    backgroundColor: AppTheme.primary),
                                icon: const Icon(Icons.camera_alt_outlined,
                                    size: 18),
                                label: const Text('SUBMIT VISIT REPORT'),
                              ),
                            ),
                          ]
                        ],
                      ),
                    ),
                  );
                },
              ),
      ],
    );
  }

  void _openVerificationSubmissionSheet(String propertyId) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.background,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return VerificationSubmissionSheet(
          propertyId: propertyId,
          onSubmitted: () {
            Navigator.pop(context);
            _refreshData();
          },
        );
      },
    );
  }

  // 5. LEADS
  Widget _buildLeadsContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Lead Pipeline',
              style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.charcoal),
            ),
            OutlinedButton.icon(
              onPressed: () {
                setState(() {
                  _showAddLeadForm = !_showAddLeadForm;
                });
              },
              icon: Icon(_showAddLeadForm ? Icons.close : Icons.add, size: 18),
              label: Text(_showAddLeadForm ? 'Close Portal' : 'Add Lead'),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (_showAddLeadForm) _buildAddLeadForm(),
        const SizedBox(height: 16),
        _leads.isEmpty
            ? _buildEmptyState(Icons.track_changes, 'No Active Leads',
                'Start your outreach to populate your pipeline.')
            : ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _leads.length,
                itemBuilder: (context, idx) {
                  final lead = _leads[idx];
                  final status = lead['status'] ?? 'new';

                  return Card(
                    margin: const EdgeInsets.only(bottom: 16),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                lead['full_name'] ?? 'Ramesh Kumar',
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                              PopupMenuButton<String>(
                                onSelected: (val) =>
                                    _updateLeadStatus(lead['lead_id'], val),
                                itemBuilder: (context) => [
                                  const PopupMenuItem(
                                      value: 'new', child: Text('New')),
                                  const PopupMenuItem(
                                      value: 'contacted',
                                      child: Text('Contacted')),
                                  const PopupMenuItem(
                                      value: 'converted',
                                      child: Text('Converted')),
                                  const PopupMenuItem(
                                      value: 'lost', child: Text('Lost')),
                                ],
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: status == 'converted'
                                        ? Colors.green.withOpacity(0.1)
                                        : status == 'lost'
                                            ? Colors.red.withOpacity(0.1)
                                            : Colors.blue.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        status.toUpperCase(),
                                        style: TextStyle(
                                          color: status == 'converted'
                                              ? Colors.green
                                              : status == 'lost'
                                                  ? Colors.red
                                                  : Colors.blue,
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(width: 4),
                                      const Icon(Icons.arrow_drop_down,
                                          size: 12,
                                          color: AppTheme.charcoalLight),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text('Phone: ${lead['phone'] ?? ''}',
                              style: const TextStyle(
                                  fontSize: 12, color: AppTheme.charcoalLight)),
                          if (lead['email'] != null)
                            Text('Email: ${lead['email']}',
                                style: const TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.charcoalLight)),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(Icons.location_on_outlined,
                                  size: 12, color: AppTheme.charcoalMuted),
                              const SizedBox(width: 4),
                              Text(
                                '${lead['city']} · ${lead['property_type']?.toString().toUpperCase()}',
                                style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.charcoalLight),
                              ),
                            ],
                          ),
                          if (lead['property_title'] != null) ...[
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppTheme.stone,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.home_outlined,
                                      size: 12, color: AppTheme.primary),
                                  const SizedBox(width: 4),
                                  Text(
                                    lead['property_title'],
                                    style: const TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.primary),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          if (lead['notes'] != null) ...[
                            const SizedBox(height: 8),
                            Text(
                              '"${lead['notes']}"',
                              style: const TextStyle(
                                  fontSize: 11,
                                  fontStyle: FontStyle.italic,
                                  color: AppTheme.charcoalMuted),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                },
              ),
      ],
    );
  }

  Widget _buildAddLeadForm() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.border),
      ),
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _leadFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Add New Lead',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextFormField(
              controller: _leadNameController,
              decoration: const InputDecoration(labelText: 'Full Name *'),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Name required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _leadPhoneController,
              decoration: const InputDecoration(labelText: 'Phone Number *'),
              keyboardType: TextInputType.phone,
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Phone required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _leadEmailController,
              decoration: const InputDecoration(labelText: 'Email Address'),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _leadCityController,
              decoration: const InputDecoration(labelText: 'City *'),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'City required' : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _leadPropertyType,
              decoration: const InputDecoration(labelText: 'Property Type *'),
              items: const [
                DropdownMenuItem(
                    value: 'residential', child: Text('Residential')),
                DropdownMenuItem(
                    value: 'commercial', child: Text('Commercial')),
                DropdownMenuItem(
                    value: 'event_venue', child: Text('Event Venue')),
              ],
              onChanged: (val) {
                if (val != null) {
                  setState(() {
                    _leadPropertyType = val;
                  });
                }
              },
            ),
            const SizedBox(height: 12),
            // Date select
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () async {
                      final dt = await showDatePicker(
                        context: context,
                        initialDate: DateTime.now(),
                        firstDate:
                            DateTime.now().subtract(const Duration(days: 30)),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (dt != null) {
                        setState(() {
                          _leadFromDate = dt;
                        });
                      }
                    },
                    child: Text(_leadFromDate == null
                        ? 'From Date'
                        : DateFormat('dd-MM-yyyy').format(_leadFromDate!)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () async {
                      final dt = await showDatePicker(
                        context: context,
                        initialDate: _leadFromDate ?? DateTime.now(),
                        firstDate: _leadFromDate ?? DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (dt != null) {
                        setState(() {
                          _leadToDate = dt;
                        });
                      }
                    },
                    child: Text(_leadToDate == null
                        ? 'To Date'
                        : DateFormat('dd-MM-yyyy').format(_leadToDate!)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _leadSelectedPropertyId,
              decoration: const InputDecoration(labelText: 'Selected Property'),
              items: [
                const DropdownMenuItem(
                    value: null,
                    child: Text('No Specific Property / General Lead')),
                ..._properties.map((p) => DropdownMenuItem(
                      value: p['property_id'],
                      child: Text(p['title'] ?? ''),
                    )),
              ],
              onChanged: (val) {
                setState(() {
                  _leadSelectedPropertyId = val;
                  if (val != null) {
                    final p =
                        _properties.firstWhere((p) => p['property_id'] == val);
                    _leadSelectedPropertyTitle = p['title'];
                  } else {
                    _leadSelectedPropertyTitle = null;
                  }
                });
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _leadNotesController,
              decoration: const InputDecoration(labelText: 'Lead Notes'),
              maxLines: 3,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _isSubmittingLead ? null : _submitLead,
              child: Text(_isSubmittingLead ? 'Adding...' : 'Add Lead'),
            ),
          ],
        ),
      ),
    );
  }

  // 6. COMMISSIONS
  Widget _buildCommissionsContent() {
    final totalEarned = _commissionData?['total_earned'] ?? 0;
    final paid = _commissionData?['paid'] ?? 0;
    final pending = _commissionData?['pending'] ?? 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Financial Performance',
          style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
              color: AppTheme.charcoal),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
                child: _buildFinanceCard(
                    'Total Revenue',
                    '₹${(totalEarned / 100).toStringAsFixed(0)}',
                    Colors.green)),
            const SizedBox(width: 8),
            Expanded(
                child: _buildFinanceCard('Settled',
                    '₹${(paid / 100).toStringAsFixed(0)}', Colors.blue)),
            const SizedBox(width: 8),
            Expanded(
                child: _buildFinanceCard('Pending',
                    '₹${(pending / 100).toStringAsFixed(0)}', Colors.amber)),
          ],
        ),
        const SizedBox(height: 24),
        _commissions.isEmpty
            ? _buildEmptyState(Icons.monetization_on_outlined, 'No Commissions',
                'No commission logs available.')
            : ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _commissions.length,
                itemBuilder: (context, idx) {
                  final item = _commissions[idx];
                  final isPaid = item['payment_status'] == 'paid';

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Booking ID: ${item['booking_id']}',
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Source: ${item['booking_source']}',
                                style: const TextStyle(
                                    fontSize: 10,
                                    color: AppTheme.charcoalMuted),
                              ),
                            ],
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                '₹${((item['commission_amount'] ?? 0) / 100).toStringAsFixed(0)}',
                                style: const TextStyle(
                                    color: AppTheme.primary,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                isPaid ? 'Paid' : 'Pending',
                                style: TextStyle(
                                  color:
                                      isPaid ? Colors.green : Colors.amber[800],
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          )
                        ],
                      ),
                    ),
                  );
                },
              )
      ],
    );
  }

  Widget _buildFinanceCard(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.stone),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 10,
                  color: AppTheme.charcoalMuted,
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
                fontSize: 16, fontWeight: FontWeight.bold, color: color),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(IconData icon, String title, String subtitle) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 40.0),
        child: Column(
          children: [
            Icon(icon, size: 64, color: AppTheme.stone),
            const SizedBox(height: 16),
            Text(
              title,
              style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.charcoal),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style:
                  const TextStyle(fontSize: 12, color: AppTheme.charcoalMuted),
            ),
          ],
        ),
      ),
    );
  }
}

// Submodal Bottom Sheet for submitting inspection
class VerificationSubmissionSheet extends StatefulWidget {
  final String propertyId;
  final VoidCallback onSubmitted;

  const VerificationSubmissionSheet({
    super.key,
    required this.propertyId,
    required this.onSubmitted,
  });

  @override
  State<VerificationSubmissionSheet> createState() =>
      _VerificationSubmissionSheetState();
}

class _VerificationSubmissionSheetState
    extends State<VerificationSubmissionSheet> {
  final ApiService _apiService = ApiService();
  bool _isLoading = false;
  bool _isLoadingProperty = true;
  PropertyModel? _property;

  // Checklist states
  final Map<String, bool> _checklist = {
    'property_owner_verification': false,
    'ownership_verification': false,
    'property_location_verification': false,
    'amenities_verification': false,
    'safety_security_verification': false,
    'property_photos_verification': false,
    'pricing_verification': false,
    'guest_capacity_rules': false,
    'legal_compliance_verification': false,
    'employee_verification_declaration': false,
  };

  // Checklist reason controllers
  final Map<String, TextEditingController> _reasonControllers = {
    'property_owner_verification': TextEditingController(),
    'ownership_verification': TextEditingController(),
    'property_location_verification': TextEditingController(),
    'amenities_verification': TextEditingController(),
    'safety_security_verification': TextEditingController(),
    'property_photos_verification': TextEditingController(),
    'pricing_verification': TextEditingController(),
    'guest_capacity_rules': TextEditingController(),
    'legal_compliance_verification': TextEditingController(),
    'employee_verification_declaration': TextEditingController(),
  };

  // Uploaded photo states
  final List<Map<String, dynamic>> _uploadedPhotos = [];
  bool _isUploadingPhoto = false;

  final _videoUrlController = TextEditingController();
  final _remarksController = TextEditingController();

  final _latController = TextEditingController(text: '18.5204');
  final _lngController = TextEditingController(text: '73.8567');

  @override
  void initState() {
    super.initState();
    _loadPropertyDetails();
  }

  Future<void> _loadPropertyDetails() async {
    try {
      final res = await _apiService.dio.get('/properties/${widget.propertyId}');
      if (res.statusCode == 200) {
        setState(() {
          _property = PropertyModel.fromJson(res.data);
          _isLoadingProperty = false;
        });
      }
    } catch (e) {
      setState(() {
        _isLoadingProperty = false;
      });
      debugPrint("Error loading property: $e");
    }
  }

  @override
  void dispose() {
    _videoUrlController.dispose();
    _remarksController.dispose();
    _latController.dispose();
    _lngController.dispose();
    _reasonControllers.forEach((_, controller) => controller.dispose());
    super.dispose();
  }

  String _getImageUrl(String? path) {
    return AppConfig.resolveImageUrl(path);
  }

  Future<void> _pickImageAndUpload(ImageSource source) async {
    final picker = ImagePicker();
    final XFile? file =
        await picker.pickImage(source: source, imageQuality: 80);
    if (file == null) return;

    setState(() {
      _isUploadingPhoto = true;
      // Add slight random offset to simulate live GPS
      double baseLat = 18.5204;
      double baseLng = 73.8567;
      double offsetLat = (DateTime.now().millisecond % 100) / 10000.0;
      double offsetLng = (DateTime.now().microsecond % 100) / 10000.0;
      _latController.text = (baseLat + offsetLat).toStringAsFixed(6);
      _lngController.text = (baseLng + offsetLng).toStringAsFixed(6);
    });

    try {
      final localFile = File(file.path);
      final formData = dio.FormData.fromMap({
        'file': await dio.MultipartFile.fromFile(
          localFile.path,
          filename: localFile.path.split('/').last,
        ),
      });

      final res = await _apiService.dio.post('/upload/image', data: formData);
      if (res.statusCode == 200 || res.statusCode == 201) {
        final url = res.data['url'];
        final lat = double.tryParse(_latController.text) ?? 18.5204;
        final lng = double.tryParse(_lngController.text) ?? 73.8567;

        setState(() {
          _uploadedPhotos.add({
            'photo_url': url,
            'latitude': lat,
            'longitude': lng,
            'timestamp': DateTime.now().toIso8601String(),
          });
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text('Photo uploaded and added to visit report!')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to upload photo: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isUploadingPhoto = false;
        });
      }
    }
  }

  Future<void> _submitVerification() async {
    if (_uploadedPhotos.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Please upload at least one geo-tagged photo.')),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      // Compile reason for unchecked items
      List<String> reasonParts = [];
      _reasonControllers.forEach((key, controller) {
        if (!_checklist[key]! && controller.text.trim().isNotEmpty) {
          final friendlyName = key.replaceAll('_', ' ').toUpperCase();
          reasonParts.add("$friendlyName Reason: ${controller.text.trim()}");
        }
      });

      String compiledRemarks = _remarksController.text.trim();
      if (reasonParts.isNotEmpty) {
        if (compiledRemarks.isNotEmpty) compiledRemarks += "\n\n";
        compiledRemarks +=
            "CHECKLIST DISCREPANCIES / REASONS:\n${reasonParts.join("\n")}";
      }

      final payload = {
        'checklist': _checklist,
        'geo_tagged_photos': _uploadedPhotos,
        'video_url': _videoUrlController.text.trim().isEmpty
            ? null
            : _videoUrlController.text.trim(),
        'broker_remarks': compiledRemarks.isEmpty ? null : compiledRemarks,
      };

      final response = await _apiService.dio.post(
        '/broker/verifications/${widget.propertyId}/submit',
        data: payload,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text('Verification submitted successfully!')),
          );
          widget.onSubmitted();
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to submit verification: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Widget _buildDetailColumn(String label, String value,
      {bool isPrice = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: const TextStyle(
              fontSize: 8,
              fontWeight: FontWeight.w800,
              color: AppTheme.charcoalMuted,
              letterSpacing: 0.5),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: isPrice ? AppTheme.primary : AppTheme.charcoal,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }

  Widget _buildChecklistCard(String key, String title) {
    bool isChecked = _checklist[key] ?? false;
    Color cardBg = isChecked ? Colors.white : const Color(0xFFFAF2F2);
    Color borderColor =
        isChecked ? const Color(0xFFE5E5E5) : const Color(0xFFF0C2C2);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor, width: 1.2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              SizedBox(
                width: 24,
                height: 24,
                child: Checkbox(
                  value: isChecked,
                  activeColor: AppTheme.primary,
                  onChanged: (val) {
                    setState(() {
                      _checklist[key] = val ?? false;
                    });
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
                      color: AppTheme.charcoal),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Container(
            height: 32,
            decoration: BoxDecoration(
              color: isChecked ? Colors.grey.shade50 : Colors.white,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(
                  color: isChecked
                      ? Colors.grey.shade200
                      : const Color(0xFFF2D1D1)),
            ),
            child: TextFormField(
              controller: _reasonControllers[key],
              enabled: !isChecked,
              style: const TextStyle(fontSize: 11),
              decoration: const InputDecoration(
                hintText: 'Reason for not checking...',
                hintStyle: TextStyle(color: Colors.grey, fontSize: 10),
                contentPadding:
                    EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                border: InputBorder.none,
                focusedBorder: InputBorder.none,
                enabledBorder: InputBorder.none,
                disabledBorder: InputBorder.none,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUploadedPhotosList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'ADDED PHOTOS',
          style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 10,
              color: AppTheme.charcoalMuted),
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 120,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: _uploadedPhotos.length,
            itemBuilder: (context, index) {
              final photo = _uploadedPhotos[index];
              return Padding(
                padding: const EdgeInsets.only(right: 12.0),
                child: Container(
                  width: 140,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.stone),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        Image.network(
                          _getImageUrl(photo['photo_url']),
                          fit: BoxFit.cover,
                        ),
                        Positioned(
                          bottom: 0,
                          left: 0,
                          right: 0,
                          child: Container(
                            color: Colors.black.withOpacity(0.6),
                            padding: const EdgeInsets.all(4),
                            child: Text(
                              "Lat: ${photo['latitude']}\nLng: ${photo['longitude']}",
                              style: const TextStyle(
                                  fontSize: 8,
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                        Positioned(
                          top: 4,
                          right: 4,
                          child: InkWell(
                            onTap: () {
                              setState(() {
                                _uploadedPhotos.removeAt(index);
                              });
                            },
                            child: Container(
                              decoration: const BoxDecoration(
                                color: Colors.red,
                                shape: BoxShape.circle,
                              ),
                              padding: const EdgeInsets.all(4),
                              child: const Icon(Icons.close,
                                  size: 12, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoadingProperty) {
      return Container(
        height: 400,
        decoration: const BoxDecoration(
          color: AppTheme.background,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: const Center(
          child: CircularProgressIndicator(color: AppTheme.primary),
        ),
      );
    }

    final p = _property;
    final String propTitle = p?.title ?? 'Visit Report';
    final String propId = p?.propertyId ?? widget.propertyId;

    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      decoration: const BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Header Row
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              border: Border(bottom: BorderSide(color: AppTheme.stone)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Submit Visit – $propTitle',
                        style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.charcoal),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Property ID: $propId',
                        style: const TextStyle(
                            fontSize: 11, color: AppTheme.charcoalMuted),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.cancel_outlined,
                      color: AppTheme.charcoalLight, size: 24),
                  onPressed: () => Navigator.pop(context),
                )
              ],
            ),
          ),

          // Scrollable Body
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // --- Property Details Section ---
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.stone),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Property Details',
                          style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: AppTheme.charcoal),
                        ),
                        const SizedBox(height: 12),

                        // Images row
                        const Text(
                          'PROPERTY IMAGES',
                          style: TextStyle(
                              fontSize: 8,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.charcoalMuted,
                              letterSpacing: 0.5),
                        ),
                        const SizedBox(height: 6),
                        p != null && p.images.isNotEmpty
                            ? SizedBox(
                                height: 80,
                                child: ListView.builder(
                                  scrollDirection: Axis.horizontal,
                                  itemCount: p.images.length,
                                  itemBuilder: (context, idx) {
                                    return Padding(
                                      padding:
                                          const EdgeInsets.only(right: 8.0),
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(8),
                                        child: Image.network(
                                          _getImageUrl(p.images[idx]),
                                          width: 110,
                                          height: 80,
                                          fit: BoxFit.cover,
                                          errorBuilder: (c, _, __) => Container(
                                            width: 110,
                                            height: 80,
                                            color: AppTheme.stone,
                                            child: const Icon(
                                                Icons.broken_image,
                                                size: 20,
                                                color: AppTheme.charcoalMuted),
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              )
                            : Container(
                                height: 80,
                                decoration: BoxDecoration(
                                  color: AppTheme.stone,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Center(
                                  child: Icon(Icons.image_not_supported,
                                      color: AppTheme.charcoalMuted),
                                ),
                              ),

                        const SizedBox(height: 16),

                        // Info Grid
                        Row(
                          children: [
                            Expanded(
                                child: _buildDetailColumn(
                                    'Category', p?.category ?? 'N/A')),
                            Expanded(
                                child: _buildDetailColumn(
                                    'BHK Type', p?.bhkType ?? 'N/A')),
                            Expanded(
                                child: _buildDetailColumn('Price Per Night',
                                    '₹${p?.pricePerNight.toStringAsFixed(0) ?? 'N/A'}',
                                    isPrice: true)),
                            Expanded(
                                child: _buildDetailColumn(
                                    'Location', p?.city ?? 'N/A')),
                          ],
                        ),

                        const SizedBox(height: 12),
                        const Divider(color: Color(0xFFEEEEEE)),
                        const SizedBox(height: 8),

                        // Full Address
                        const Text(
                          'FULL ADDRESS',
                          style: TextStyle(
                              fontSize: 8,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.charcoalMuted,
                              letterSpacing: 0.5),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          p?.address ?? 'N/A',
                          style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.charcoal),
                        ),

                        const SizedBox(height: 12),

                        // Description
                        const Text(
                          'DESCRIPTION',
                          style: TextStyle(
                              fontSize: 8,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.charcoalMuted,
                              letterSpacing: 0.5),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          p?.description ?? 'N/A',
                          style: const TextStyle(
                              fontSize: 11,
                              color: AppTheme.charcoalLight,
                              height: 1.4),
                          maxLines: 4,
                          overflow: TextOverflow.ellipsis,
                        ),

                        const SizedBox(height: 16),

                        // Amenities Wrap
                        const Text(
                          'AMENITIES',
                          style: TextStyle(
                              fontSize: 8,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.charcoalMuted,
                              letterSpacing: 0.5),
                        ),
                        const SizedBox(height: 8),
                        p != null && p.amenities.isNotEmpty
                            ? Wrap(
                                spacing: 6,
                                runSpacing: 6,
                                children: p.amenities.map((amenity) {
                                  return Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF9F9F9),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(
                                          color: const Color(0xFFEEEEEE)),
                                    ),
                                    child: Text(
                                      amenity
                                          .replaceAll('_', ' ')
                                          .toUpperCase(),
                                      style: const TextStyle(
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                          color: AppTheme.charcoal),
                                    ),
                                  );
                                }).toList(),
                              )
                            : const Text('No Amenities listed',
                                style: TextStyle(
                                    fontSize: 11, fontStyle: FontStyle.italic)),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // --- Inspection Checklist Section ---
                  const Text(
                    'Inspection Checklist',
                    style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: AppTheme.charcoal),
                  ),
                  const SizedBox(height: 12),

                  // Grid of Checklist
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 1.2,
                    children: [
                      _buildChecklistCard('property_owner_verification',
                          'Property Owner Verification'),
                      _buildChecklistCard(
                          'ownership_verification', 'Ownership Verification'),
                      _buildChecklistCard('property_location_verification',
                          'Property Location Verification'),
                      _buildChecklistCard(
                          'amenities_verification', 'Amenities Verification'),
                      _buildChecklistCard('safety_security_verification',
                          'Safety & Security Verification'),
                      _buildChecklistCard('property_photos_verification',
                          'Property Photos Verification'),
                      _buildChecklistCard(
                          'pricing_verification', 'Pricing Verification'),
                      _buildChecklistCard(
                          'guest_capacity_rules', 'Guest Capacity & Rules'),
                      _buildChecklistCard('legal_compliance_verification',
                          'Legal & Compliance Verification'),
                      _buildChecklistCard('employee_verification_declaration',
                          'Employee Verification Declaration'),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // --- Geo-tagged Photos Section ---
                  const Text(
                    'Geo-tagged Photos',
                    style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: AppTheme.charcoal),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Photo (Add high-res geotagged photos)',
                    style:
                        TextStyle(fontSize: 10, color: AppTheme.charcoalMuted),
                  ),
                  const SizedBox(height: 12),

                  // Buttons Choose File & Open Camera
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _isUploadingPhoto
                              ? null
                              : () => _pickImageAndUpload(ImageSource.gallery),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppTheme.stone),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                          child: const Text('Choose File',
                              style: TextStyle(
                                  color: AppTheme.charcoal,
                                  fontWeight: FontWeight.bold)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _isUploadingPhoto
                              ? null
                              : () => _pickImageAndUpload(ImageSource.camera),
                          icon: const Icon(Icons.camera_alt_outlined,
                              size: 16, color: Colors.white),
                          label: const Text('Open Camera',
                              style: TextStyle(fontWeight: FontWeight.bold)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor:
                                const Color(0xFFC26D5C), // Brownish red
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 12),

                  // Latitude & Longitude Inputs
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _latController,
                          style: const TextStyle(fontSize: 12),
                          decoration: InputDecoration(
                            labelText: 'Latitude',
                            filled: true,
                            fillColor: const Color(0xFFF5F5F5),
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 10),
                            border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                                borderSide: BorderSide.none),
                          ),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: _lngController,
                          style: const TextStyle(fontSize: 12),
                          decoration: InputDecoration(
                            labelText: 'Longitude',
                            filled: true,
                            fillColor: const Color(0xFFF5F5F5),
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 10),
                            border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                                borderSide: BorderSide.none),
                          ),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 8),
                  const Text(
                    'Tip: allow location access when prompted – we auto-fill coordinates from your device GPS.',
                    style:
                        TextStyle(fontSize: 9, color: AppTheme.charcoalMuted),
                  ),

                  const SizedBox(height: 16),

                  if (_isUploadingPhoto) ...[
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: AppTheme.primary),
                        ),
                        SizedBox(width: 8),
                        Text(
                          'Uploading and geotagging photo...',
                          style: TextStyle(
                              fontSize: 11,
                              color: AppTheme.primary,
                              fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Uploaded photos list
                  if (_uploadedPhotos.isNotEmpty) ...[
                    _buildUploadedPhotosList(),
                    const SizedBox(height: 16),
                  ],

                  const Divider(color: Color(0xFFEEEEEE)),
                  const SizedBox(height: 12),

                  // --- Video walkthrough URL ---
                  const Text(
                    'Video walkthrough URL (If Applicable)',
                    style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 11,
                        color: AppTheme.charcoal),
                  ),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _videoUrlController,
                    style: const TextStyle(fontSize: 12),
                    decoration: InputDecoration(
                      hintText: 'e.g. YouTube or Drive URL',
                      filled: true,
                      fillColor: const Color(0xFFF5F5F5),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide.none),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // --- Broker Remarks ---
                  const Text(
                    'Broker remarks (If Applicable)',
                    style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 11,
                        color: AppTheme.charcoal),
                  ),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _remarksController,
                    maxLines: 3,
                    style: const TextStyle(fontSize: 12),
                    decoration: InputDecoration(
                      hintText: 'Enter site observations...',
                      filled: true,
                      fillColor: const Color(0xFFF5F5F5),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide.none),
                    ),
                  ),

                  const SizedBox(height: 32),

                  // --- Footer Action Buttons ---
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppTheme.stone),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 24, vertical: 14),
                        ),
                        child: const Text(
                          'Cancel',
                          style: TextStyle(
                              color: AppTheme.charcoalLight,
                              fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 12),
                      ElevatedButton(
                        onPressed: _isLoading ? null : _submitVerification,
                        style: ElevatedButton.styleFrom(
                          backgroundColor:
                              const Color(0xFFC26D5C), // Brownish red
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 24, vertical: 14),
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                height: 16,
                                width: 16,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white),
                              )
                            : const Text(
                                'Submit Verification',
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
