import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:dio/dio.dart' show FormData, MultipartFile;
import '../../models/property_model.dart';
import '../../providers/property_provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../theme.dart';
import '../shared/app_logo.dart';
import 'host_list_property_screen.dart';
import 'host_calendar_screen.dart';
import 'host_payouts_screen.dart';
import 'host_bookings_screen.dart';

class HostDashboardScreen extends StatefulWidget {
  const HostDashboardScreen({super.key});

  @override
  State<HostDashboardScreen> createState() => _HostDashboardScreenState();
}

class _HostDashboardScreenState extends State<HostDashboardScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _priceController = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  final _addressController = TextEditingController();
  final _pinCodeController = TextEditingController();
  final _areaController = TextEditingController();

  String _propertyType = 'villa';
  final String _category = 'residential';
  String _bhkType = '2bhk';
  String _filterStatus = 'all';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<PropertyProvider>(context, listen: false).getHostProperties();
      Provider.of<AuthProvider>(context, listen: false).refreshProfile();
    });
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    _priceController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _addressController.dispose();
    _pinCodeController.dispose();
    _areaController.dispose();
    super.dispose();
  }

  void _handleListPropertyTrigger() {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final user = authProvider.currentUser;
    final kycStatus = (user?.kycStatus ?? 'not_submitted').toLowerCase();

    if (kycStatus == 'approved' || kycStatus == 'pending') {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => const HostListPropertyScreen()),
      ).then((_) {
        Provider.of<PropertyProvider>(context, listen: false)
            .getHostProperties();
      });
    } else {
      _showDocumentVerificationDialog();
    }
  }

  void _showVerificationPendingDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            const Icon(Icons.hourglass_empty, color: Colors.orange, size: 28),
            const SizedBox(width: 10),
            Text('Verification Pending',
                style: Theme.of(context)
                    .textTheme
                    .displayMedium
                    ?.copyWith(fontSize: 20)),
          ],
        ),
        content: const Text(
          'Your host verification request has been submitted and is currently undergoing admin review. You will be able to list new properties once approved.',
          style: TextStyle(fontSize: 15, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK',
                style: TextStyle(
                    color: AppTheme.primary, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showDocumentVerificationDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return const _DocumentVerificationSheet();
      },
    );
  }

  void _showAddPropertyDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
                top: 24,
                left: 24,
                right: 24,
              ),
              child: SingleChildScrollView(
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('List a New Property',
                              style: Theme.of(context)
                                  .textTheme
                                  .displayMedium
                                  ?.copyWith(fontSize: 22)),
                          IconButton(
                            onPressed: () => Navigator.pop(context),
                            icon: const Icon(Icons.close),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _titleController,
                        decoration: const InputDecoration(
                            labelText: 'Title', border: OutlineInputBorder()),
                        validator: (v) =>
                            v == null || v.isEmpty ? 'Title required' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _descController,
                        decoration: const InputDecoration(
                            labelText: 'Description',
                            border: OutlineInputBorder()),
                        maxLines: 2,
                        validator: (v) => v == null || v.isEmpty
                            ? 'Description required'
                            : null,
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _priceController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                  labelText: 'Price per night',
                                  border: OutlineInputBorder()),
                              validator: (v) => v == null || v.isEmpty
                                  ? 'Price required'
                                  : null,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _areaController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                  labelText: 'Area (sqft)',
                                  border: OutlineInputBorder()),
                              validator: (v) => v == null || v.isEmpty
                                  ? 'Area required'
                                  : null,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _cityController,
                              decoration: const InputDecoration(
                                  labelText: 'City',
                                  border: OutlineInputBorder()),
                              validator: (v) => v == null || v.isEmpty
                                  ? 'City required'
                                  : null,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _stateController,
                              decoration: const InputDecoration(
                                  labelText: 'State',
                                  border: OutlineInputBorder()),
                              validator: (v) => v == null || v.isEmpty
                                  ? 'State required'
                                  : null,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _addressController,
                        decoration: const InputDecoration(
                            labelText: 'Full Address',
                            border: OutlineInputBorder()),
                        validator: (v) =>
                            v == null || v.isEmpty ? 'Address required' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _pinCodeController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                            labelText: 'Pincode', border: OutlineInputBorder()),
                        validator: (v) =>
                            v == null || v.isEmpty ? 'Pincode required' : null,
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: _propertyType,
                        decoration: const InputDecoration(
                            labelText: 'Property Type',
                            border: OutlineInputBorder()),
                        items: const [
                          DropdownMenuItem(
                              value: 'villa', child: Text('Villa')),
                          DropdownMenuItem(
                              value: 'apartment', child: Text('Apartment')),
                          DropdownMenuItem(
                              value: 'studio', child: Text('Studio')),
                          DropdownMenuItem(
                              value: 'independent_house', child: Text('House')),
                        ],
                        onChanged: (val) =>
                            setModalState(() => _propertyType = val!),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: _bhkType,
                        decoration: const InputDecoration(
                            labelText: 'BHK Type',
                            border: OutlineInputBorder()),
                        items: const [
                          DropdownMenuItem(
                              value: 'studio', child: Text('Studio')),
                          DropdownMenuItem(value: '1bhk', child: Text('1 BHK')),
                          DropdownMenuItem(value: '2bhk', child: Text('2 BHK')),
                          DropdownMenuItem(value: '3bhk', child: Text('3 BHK')),
                          DropdownMenuItem(value: '4bhk', child: Text('4 BHK')),
                        ],
                        onChanged: (val) =>
                            setModalState(() => _bhkType = val!),
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          backgroundColor: AppTheme.primary,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () async {
                          if (!_formKey.currentState!.validate()) return;
                          final createdId = await Provider.of<PropertyProvider>(
                                  context,
                                  listen: false)
                              .createProperty({
                            'title': _titleController.text,
                            'description': _descController.text,
                            'price_per_night':
                                double.parse(_priceController.text),
                            'area_sqft': double.parse(_areaController.text),
                            'city': _cityController.text,
                            'state': _stateController.text,
                            'address': _addressController.text,
                            'pin_code': _pinCodeController.text,
                            'property_type': _propertyType,
                            'category': _category,
                            'bhk_type': _bhkType,
                            'latitude': 19.0760,
                            'longitude': 72.8777,
                            'amenities': ['wifi', 'ac'],
                            'images': [],
                            'pet_friendly': true,
                            'instant_booking': true,
                          });
                          final success = createdId != null;
                          if (success && context.mounted) {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                  content:
                                      Text('Property added successfully!')),
                            );
                            Provider.of<PropertyProvider>(context,
                                    listen: false)
                                .getHostProperties();
                          }
                        },
                        child: const Text('Add Property',
                            style: TextStyle(
                                fontSize: 16,
                                color: Colors.white,
                                fontWeight: FontWeight.bold)),
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  bool _isLive(PropertyModel property) =>
      property.status.toLowerCase() == 'live';

  bool _isPending(PropertyModel property) {
    final status = property.status.toLowerCase();
    return status == 'pending' ||
        status == 'pending_verification' ||
        status == 'under_review';
  }

  bool _isRejected(PropertyModel property) {
    final status = property.status.toLowerCase();
    return status == 'rejected';
  }

  List<PropertyModel> _filterProperties(List<PropertyModel> properties) {
    switch (_filterStatus) {
      case 'live':
        return properties.where(_isLive).toList();
      case 'pending_verification':
        return properties.where(_isPending).toList();
      case 'rejected':
        return properties.where(_isRejected).toList();
      default:
        return properties;
    }
  }

  String _propertyListTitle() {
    switch (_filterStatus) {
      case 'live':
        return 'Active Listings';
      case 'pending_verification':
        return 'Pending Review';
      case 'rejected':
        return 'Rejected Properties';
      default:
        return 'All Properties';
    }
  }

  @override
  Widget build(BuildContext context) {
    final propertyProvider = Provider.of<PropertyProvider>(context);
    final authProvider = Provider.of<AuthProvider>(context);
    final textTheme = Theme.of(context).textTheme;

    final properties = propertyProvider.hostProperties;
    final sortedProperties = List<PropertyModel>.from(properties);
    sortedProperties.sort((a, b) {
      if (a.createdAt == null && b.createdAt == null) return 0;
      if (a.createdAt == null) return 1;
      if (b.createdAt == null) return -1;
      return b.createdAt!.compareTo(a.createdAt!);
    });

    final liveProperties = sortedProperties.where(_isLive).toList();
    final pendingProperties = sortedProperties.where(_isPending).toList();
    final rejectedProperties = sortedProperties.where(_isRejected).toList();
    final filteredProperties = _filterProperties(sortedProperties);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const AppLogo(
          height: 24,
          tintColor: Colors.black,
          framed: false,
        ),
        centerTitle: false,
        backgroundColor: AppTheme.white,
        elevation: 0.5,
        actions: [
          TextButton.icon(
            onPressed: _handleListPropertyTrigger,
            icon: const Icon(Icons.add, color: AppTheme.primary),
            label: const Text('LIST NEW',
                style: TextStyle(
                    color: AppTheme.primary, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await propertyProvider.getHostProperties();
          await authProvider.refreshProfile();
        },
        color: AppTheme.primary,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.only(
                    left: 20.0, right: 20.0, top: 24.0, bottom: 8.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Your Portfolio',
                      style: textTheme.displayMedium
                          ?.copyWith(fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Manage your properties and track performance',
                      style: textTheme.bodyMedium
                          ?.copyWith(color: AppTheme.charcoalLight),
                    ),
                  ],
                ),
              ),

              if (authProvider.currentUser?.kycStatus.toLowerCase() !=
                  'approved')
                Container(
                  margin: const EdgeInsets.symmetric(
                      horizontal: 20.0, vertical: 12.0),
                  padding: const EdgeInsets.all(16.0),
                  decoration: BoxDecoration(
                    color: authProvider.currentUser?.kycStatus.toLowerCase() ==
                            'pending'
                        ? Colors.orange.withOpacity(0.12)
                        : AppTheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16.0),
                    border: Border.all(
                      color:
                          authProvider.currentUser?.kycStatus.toLowerCase() ==
                                  'pending'
                              ? Colors.orange.withOpacity(0.3)
                              : AppTheme.primary.withOpacity(0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        authProvider.currentUser?.kycStatus.toLowerCase() ==
                                'pending'
                            ? Icons.hourglass_top_rounded
                            : Icons.gpp_maybe_rounded,
                        color:
                            authProvider.currentUser?.kycStatus.toLowerCase() ==
                                    'pending'
                                ? Colors.orange
                                : AppTheme.primary,
                        size: 28,
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              authProvider.currentUser?.kycStatus
                                          .toLowerCase() ==
                                      'pending'
                                  ? 'Host Verification Pending Review'
                                  : authProvider.currentUser?.kycStatus
                                              .toLowerCase() ==
                                          'rejected'
                                      ? 'Host Verification Rejected'
                                      : 'Document Verification Required',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                color: authProvider.currentUser?.kycStatus
                                            .toLowerCase() ==
                                        'pending'
                                    ? Colors.orange.shade900
                                    : AppTheme.primary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              authProvider.currentUser?.kycStatus
                                          .toLowerCase() ==
                                      'pending'
                                  ? 'Your documents are under review. You can list properties, but bookings remain disabled until approval.'
                                  : authProvider.currentUser?.kycStatus
                                              .toLowerCase() ==
                                          'rejected'
                                      ? 'Please update and re-submit your verification documents.'
                                      : 'Please submit your documents to activate listing features.',
                              style: TextStyle(
                                fontSize: 12,
                                color: authProvider.currentUser?.kycStatus
                                            .toLowerCase() ==
                                        'pending'
                                    ? Colors.orange.shade900.withOpacity(0.8)
                                    : AppTheme.charcoal,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (authProvider.currentUser?.kycStatus.toLowerCase() !=
                          'pending')
                        IconButton(
                          icon: const Icon(Icons.arrow_forward_ios,
                              size: 16, color: AppTheme.primary),
                          onPressed: _handleListPropertyTrigger,
                        ),
                    ],
                  ),
                ),

              Padding(
                padding: const EdgeInsets.symmetric(
                    horizontal: 20.0, vertical: 12.0),
                child: GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 2,
                  crossAxisSpacing: 14,
                  mainAxisSpacing: 14,
                  childAspectRatio: 1.55,
                  children: [
                    _buildStatCard(
                      icon: Icons.business,
                      title: 'Total Properties',
                      value: '${properties.length}',
                      filterValue: 'all',
                    ),
                    _buildStatCard(
                      icon: Icons.visibility,
                      title: 'Active Listings',
                      value: '${liveProperties.length}',
                      filterValue: 'live',
                    ),
                    _buildStatCard(
                      icon: Icons.pending_actions,
                      title: 'Pending Review',
                      value: '${pendingProperties.length}',
                      filterValue: 'pending_verification',
                    ),
                    _buildStatCard(
                      icon: Icons.report_problem_outlined,
                      title: 'Rejected',
                      value: '${rejectedProperties.length}',
                      iconColor: Colors.red.shade600,
                      filterValue: 'rejected',
                    ),
                    _buildStatCard(
                      icon: Icons.account_balance_wallet,
                      title: 'Total Earnings',
                      value: '₹0',
                      iconColor: Colors.green,
                    ),
                  ],
                ),
              ),

              // Quick Actions Section
              Padding(
                padding: const EdgeInsets.symmetric(
                    horizontal: 20.0, vertical: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Host Dashboard Features',
                      style: textTheme.displayMedium
                          ?.copyWith(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _buildActionCard(
                            context: context,
                            icon: Icons.calendar_month,
                            title: 'Property\nCalendar',
                            color: AppTheme.primary,
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                    builder: (context) =>
                                        const HostCalendarScreen()),
                              );
                            },
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _buildActionCard(
                            context: context,
                            icon: Icons.payments,
                            title: 'Payouts\nManager',
                            color: Colors.green.shade700,
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                    builder: (context) =>
                                        const HostPayoutsScreen()),
                              );
                            },
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _buildActionCard(
                            context: context,
                            icon: Icons.bookmark_added,
                            title: 'Booking\nManager',
                            color: Colors.blue.shade700,
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                    builder: (context) =>
                                        const HostBookingsScreen()),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              Padding(
                padding: const EdgeInsets.symmetric(
                    horizontal: 20.0, vertical: 16.0),
                child: Text(
                  _propertyListTitle(),
                  style: textTheme.displayMedium
                      ?.copyWith(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),

              propertyProvider.isLoading
                  ? const Padding(
                      padding: EdgeInsets.symmetric(vertical: 40.0),
                      child: Center(
                          child: CircularProgressIndicator(
                              color: AppTheme.primary)),
                    )
                  : filteredProperties.isEmpty
                      ? _buildEmptyState(
                          hasAnyProperties: properties.isNotEmpty)
                      : ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: filteredProperties.length,
                          padding: const EdgeInsets.symmetric(horizontal: 20.0),
                          itemBuilder: (context, index) {
                            final prop = filteredProperties[index];
                            final isLive = _isLive(prop);
                            final isDraft =
                                prop.status.toLowerCase() == 'draft';
                            final isRejected = _isRejected(prop);

                            return Card(
                              elevation: 0,
                              margin: const EdgeInsets.only(bottom: 16.0),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16.0),
                                side: const BorderSide(color: AppTheme.stone),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.all(16.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            prop.title,
                                            style: textTheme.bodyLarge
                                                ?.copyWith(
                                                    fontWeight:
                                                        FontWeight.bold),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 10, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: isLive
                                                ? Colors.green.withOpacity(0.1)
                                                : isRejected
                                                    ? Colors.red
                                                        .withOpacity(0.1)
                                                    : Colors.orange
                                                        .withOpacity(0.1),
                                            borderRadius:
                                                BorderRadius.circular(12),
                                          ),
                                          child: Text(
                                            prop.status.toUpperCase(),
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                              color: isLive
                                                  ? Colors.green
                                                  : isRejected
                                                      ? Colors.red
                                                      : Colors.orange,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        const Icon(Icons.location_on,
                                            size: 14,
                                            color: AppTheme.charcoalLight),
                                        const SizedBox(width: 4),
                                        Text('${prop.city}, ${prop.state}',
                                            style: textTheme.bodyMedium
                                                ?.copyWith(
                                                    color: AppTheme
                                                        .charcoalLight)),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        const Icon(Icons.access_time,
                                            size: 14,
                                            color: AppTheme.charcoalLight),
                                        const SizedBox(width: 4),
                                        Text(
                                          'Listed: ${prop.createdAt != null ? DateFormat('dd MMM yyyy, hh:mm a').format(prop.createdAt!.toLocal()) : "N/A"}',
                                          style: textTheme.bodyMedium?.copyWith(
                                              color: AppTheme.charcoalLight,
                                              fontSize: 12),
                                        ),
                                      ],
                                    ),
                                    const Divider(
                                        height: 24, color: AppTheme.stone),
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          'Area: ${prop.areaSqft.toStringAsFixed(0)} sqft',
                                          style: textTheme.bodyMedium?.copyWith(
                                              color: AppTheme.charcoalLight),
                                        ),
                                        Text(
                                          '₹${prop.pricePerNight.toStringAsFixed(0)} / night',
                                          style: textTheme.bodyLarge?.copyWith(
                                              fontWeight: FontWeight.bold,
                                              color: AppTheme.primary),
                                        ),
                                      ],
                                    ),
                                    if (isDraft) ...[
                                      const SizedBox(height: 12),
                                      Row(
                                        children: [
                                          Expanded(
                                            child: OutlinedButton.icon(
                                              icon: const Icon(Icons.edit,
                                                  size: 14),
                                              label: const Text('Edit Draft'),
                                              onPressed: () async {
                                                final updated =
                                                    await Navigator.push(
                                                  context,
                                                  MaterialPageRoute(
                                                    builder: (context) =>
                                                        HostListPropertyScreen(
                                                            property: prop),
                                                  ),
                                                );
                                                if (updated == true) {
                                                  propertyProvider
                                                      .getHostProperties();
                                                }
                                              },
                                              style: OutlinedButton.styleFrom(
                                                foregroundColor:
                                                    AppTheme.primary,
                                                side: const BorderSide(
                                                    color: AppTheme.primary),
                                                minimumSize: const Size(
                                                    double.infinity, 40),
                                                shape: RoundedRectangleBorder(
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                            8)),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: ElevatedButton.icon(
                                              icon: const Icon(Icons.send,
                                                  size: 14,
                                                  color: Colors.white),
                                              label: const Text('Submit'),
                                              onPressed: () async {
                                                final success = await Provider
                                                        .of<PropertyProvider>(
                                                            context,
                                                            listen: false)
                                                    .submitForVerification(
                                                        prop.propertyId);
                                                if (success &&
                                                    context.mounted) {
                                                  ScaffoldMessenger.of(context)
                                                      .showSnackBar(
                                                    const SnackBar(
                                                        content: Text(
                                                            'Submitted for Verification!')),
                                                  );
                                                  propertyProvider
                                                      .getHostProperties();
                                                }
                                              },
                                              style: ElevatedButton.styleFrom(
                                                backgroundColor:
                                                    AppTheme.primary,
                                                foregroundColor: Colors.white,
                                                minimumSize: const Size(
                                                    double.infinity, 40),
                                                shape: RoundedRectangleBorder(
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                            8)),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ] else ...[
                                      const SizedBox(height: 12),
                                      Row(
                                        children: [
                                          Expanded(
                                            child: OutlinedButton.icon(
                                              icon: const Icon(
                                                  Icons.calendar_month,
                                                  size: 14),
                                              label: const Text('Calendar'),
                                              onPressed: isLive
                                                  ? () {
                                                      Navigator.push(
                                                        context,
                                                        MaterialPageRoute(
                                                            builder: (context) =>
                                                                const HostCalendarScreen()),
                                                      );
                                                    }
                                                  : () {
                                                      ScaffoldMessenger.of(
                                                              context)
                                                          .showSnackBar(
                                                        const SnackBar(
                                                            content: Text(
                                                                'Calendar opens after this property is live.')),
                                                      );
                                                    },
                                              style: OutlinedButton.styleFrom(
                                                foregroundColor: isLive
                                                    ? AppTheme.charcoal
                                                    : AppTheme.charcoalMuted,
                                                side: const BorderSide(
                                                    color: AppTheme.border),
                                                minimumSize: const Size(
                                                    double.infinity, 40),
                                                shape: RoundedRectangleBorder(
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                            8)),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: ElevatedButton.icon(
                                              icon: const Icon(Icons.edit,
                                                  size: 14,
                                                  color: Colors.white),
                                              label: const Text('Manage'),
                                              onPressed: () async {
                                                final updated =
                                                    await Navigator.push(
                                                  context,
                                                  MaterialPageRoute(
                                                    builder: (context) =>
                                                        HostListPropertyScreen(
                                                            property: prop),
                                                  ),
                                                );
                                                if (updated == true) {
                                                  propertyProvider
                                                      .getHostProperties();
                                                }
                                              },
                                              style: ElevatedButton.styleFrom(
                                                backgroundColor:
                                                    AppTheme.charcoal,
                                                foregroundColor: Colors.white,
                                                minimumSize: const Size(
                                                    double.infinity, 40),
                                                shape: RoundedRectangleBorder(
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                            8)),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String title,
    required String value,
    Color iconColor = AppTheme.primary,
    String? filterValue,
  }) {
    final isActive = filterValue != null && _filterStatus == filterValue;
    final card = Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: isActive ? AppTheme.primary.withOpacity(0.08) : AppTheme.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(
            color: isActive ? AppTheme.primary : AppTheme.stone,
            width: isActive ? 1.5 : 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: isActive ? AppTheme.primary : iconColor, size: 24),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: AppTheme.charcoal,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            title,
            style: const TextStyle(
              fontSize: 11,
              color: AppTheme.charcoalLight,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );

    if (filterValue == null) return card;

    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => setState(() => _filterStatus = filterValue),
      child: card,
    );
  }

  Widget _buildEmptyState({bool hasAnyProperties = false}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20.0),
      padding: const EdgeInsets.symmetric(vertical: 40.0, horizontal: 20.0),
      decoration: BoxDecoration(
        color: AppTheme.white,
        borderRadius: BorderRadius.circular(24.0),
        border: Border.all(color: AppTheme.stone),
      ),
      child: Column(
        children: [
          CircleAvatar(
            backgroundColor: AppTheme.stone.withOpacity(0.4),
            radius: 36,
            child: const Icon(Icons.business,
                size: 36, color: AppTheme.charcoalLight),
          ),
          const SizedBox(height: 20),
          Text(
            hasAnyProperties
                ? 'No ${_propertyListTitle()}'
                : 'No Properties Listed',
            style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppTheme.charcoal),
          ),
          const SizedBox(height: 6),
          Text(
            hasAnyProperties
                ? 'There are no properties matching this category.'
                : 'READY TO START EARNING? LIST YOUR FIRST HOME TODAY.',
            textAlign: TextAlign.center,
            style: const TextStyle(
                fontSize: 11,
                letterSpacing: 0.8,
                color: AppTheme.charcoalLight,
                fontWeight: FontWeight.w600),
          ),
          if (!hasAnyProperties) ...[
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _handleListPropertyTrigger,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30)),
                padding:
                    const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
              ),
              child: const Text(
                'Get Started',
                style:
                    TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildActionCard({
    required BuildContext context,
    required IconData icon,
    required String title,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16.0),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16.0, horizontal: 12.0),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(16.0),
          border: Border.all(color: color.withOpacity(0.2), width: 1.5),
        ),
        child: Column(
          children: [
            CircleAvatar(
              backgroundColor: color.withOpacity(0.15),
              radius: 20,
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 10),
            Text(
              title,
              textAlign: TextAlign.center,
              style: GoogleFonts.manrope(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppTheme.charcoal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DocumentVerificationSheet extends StatefulWidget {
  const _DocumentVerificationSheet();

  @override
  State<_DocumentVerificationSheet> createState() =>
      _DocumentVerificationSheetState();
}

class _DocumentVerificationSheetState
    extends State<_DocumentVerificationSheet> {
  final _verifyFormKey = GlobalKey<FormState>();

  String? _aadharPath;
  String? _propertyProofPath;
  String? _societyNocPath;
  String? _cancelledChequePath;
  String? _shopActPath;
  String? _gstCertificatePath;

  bool _isUploadingAadhar = false;
  bool _isUploadingProof = false;
  bool _isUploadingSocietyNoc = false;
  bool _isUploadingCheque = false;
  bool _isUploadingShopAct = false;
  bool _isUploadingGst = false;

  final _gstNumberController = TextEditingController();
  final _ownerNameController = TextEditingController();
  final _ownerAddressController = TextEditingController();

  String? _signatureName;
  List<Offset?> _signaturePoints = [];
  bool _termsAccepted = false;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _gstNumberController.dispose();
    _ownerNameController.dispose();
    _ownerAddressController.dispose();
    super.dispose();
  }

  // Interactive dialog asking user where to get document (Gallery/Camera/Mock)
  void _openUploadSourceSelection(String type) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Upload Document',
                style: Theme.of(context)
                    .textTheme
                    .displayMedium
                    ?.copyWith(fontSize: 18)),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.photo_library, color: AppTheme.primary),
              title: const Text('Choose from Gallery'),
              onTap: () async {
                Navigator.pop(context);
                final picked =
                    await ImagePicker().pickImage(source: ImageSource.gallery);
                if (picked != null) {
                  _setDocumentPath(type, picked.name, picked.path);
                }
              },
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt, color: AppTheme.primary),
              title: const Text('Take Photo with Camera'),
              onTap: () async {
                Navigator.pop(context);
                final picked =
                    await ImagePicker().pickImage(source: ImageSource.camera);
                if (picked != null) {
                  _setDocumentPath(type, picked.name, picked.path);
                }
              },
            ),
            ListTile(
              leading:
                  const Icon(Icons.developer_mode, color: AppTheme.primary),
              title: const Text('Simulate Document (For Fast Testing)'),
              onTap: () {
                Navigator.pop(context);
                _setDocumentPath(type, '${type}_document.jpg',
                    'uploads/mock_${type}_document.jpg');
              },
            ),
          ],
        ),
      ),
    );
  }

  void _setDocumentPath(String type, String filename, String path) async {
    setState(() {
      if (type == 'aadhar') _isUploadingAadhar = true;
      if (type == 'proof') _isUploadingProof = true;
      if (type == 'society_noc') _isUploadingSocietyNoc = true;
      if (type == 'cheque') _isUploadingCheque = true;
      if (type == 'shop_act') _isUploadingShopAct = true;
      if (type == 'gst') _isUploadingGst = true;
    });

    String uploadedPath = path;

    try {
      if (!path.startsWith('uploads/') && !path.startsWith('/api/uploads/')) {
        final formData = FormData.fromMap({
          'file': await MultipartFile.fromFile(path, filename: filename),
        });
        final response =
            await ApiService().dio.post('/upload/document', data: formData);
        uploadedPath = response.data['url']?.toString() ?? path;
      } else {
        await Future.delayed(const Duration(milliseconds: 500));
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        if (type == 'aadhar') _isUploadingAadhar = false;
        if (type == 'proof') _isUploadingProof = false;
        if (type == 'society_noc') _isUploadingSocietyNoc = false;
        if (type == 'cheque') _isUploadingCheque = false;
        if (type == 'shop_act') _isUploadingShopAct = false;
        if (type == 'gst') _isUploadingGst = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Document upload failed: $e')),
      );
      return;
    }

    if (!mounted) return;
    setState(() {
      if (type == 'aadhar') {
        _isUploadingAadhar = false;
        _aadharPath = uploadedPath;
      }
      if (type == 'proof') {
        _isUploadingProof = false;
        _propertyProofPath = uploadedPath;
      }
      if (type == 'society_noc') {
        _isUploadingSocietyNoc = false;
        _societyNocPath = uploadedPath;
      }
      if (type == 'cheque') {
        _isUploadingCheque = false;
        _cancelledChequePath = uploadedPath;
      }
      if (type == 'shop_act') {
        _isUploadingShopAct = false;
        _shopActPath = uploadedPath;
      }
      if (type == 'gst') {
        _isUploadingGst = false;
        _gstCertificatePath = uploadedPath;
      }
    });
  }

  // Opens the legal agreement reader and signature pad.
  void _openSignaturePad() {
    List<Offset?> localPoints = List.from(_signaturePoints);
    final ownerNameController =
        TextEditingController(text: _ownerNameController.text);
    final ownerAddressController =
        TextEditingController(text: _ownerAddressController.text);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            final size = MediaQuery.of(context).size;

            return Dialog(
              insetPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18)),
              backgroundColor: Colors.white,
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  maxWidth: 560,
                  maxHeight: size.height * 0.9,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(18, 16, 10, 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'X-Space360 Agreement',
                                  style: TextStyle(
                                    color: Color(0xFF111111),
                                    fontSize: 22,
                                    height: 1.15,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                                SizedBox(height: 8),
                                Text(
                                  'REVIEW AND DRAW SIGNATURE BELOW',
                                  style: TextStyle(
                                    color: AppTheme.charcoalLight,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.9,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            visualDensity: VisualDensity.compact,
                            onPressed: () => Navigator.pop(context),
                            icon: const Icon(Icons.close,
                                color: AppTheme.charcoalLight),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.fromLTRB(18, 8, 18, 18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _buildLegalAgreementPreview(),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                Expanded(
                                  child: TextFormField(
                                    controller: ownerNameController,
                                    textCapitalization:
                                        TextCapitalization.words,
                                    decoration: const InputDecoration(
                                      labelText: 'Owner Name (Full Name)',
                                      hintText: 'Full Name as per Pancard',
                                      prefixIcon:
                                          Icon(Icons.person_outline, size: 20),
                                      border: OutlineInputBorder(),
                                      contentPadding: EdgeInsets.symmetric(
                                          horizontal: 12, vertical: 12),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: TextFormField(
                                    controller: ownerAddressController,
                                    textCapitalization:
                                        TextCapitalization.sentences,
                                    decoration: const InputDecoration(
                                      labelText: 'Owner Address',
                                      hintText:
                                          'Enter Address as per Aadharcard',
                                      prefixIcon: Icon(
                                          Icons.location_on_outlined,
                                          size: 20),
                                      border: OutlineInputBorder(),
                                      contentPadding: EdgeInsets.symmetric(
                                          horizontal: 12, vertical: 12),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                const Expanded(
                                  child: Text(
                                    'DRAW SIGNATURE',
                                    style: TextStyle(
                                      color: AppTheme.charcoal,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 0.7,
                                    ),
                                  ),
                                ),
                                TextButton.icon(
                                  icon: const Icon(Icons.clear, size: 15),
                                  label: const Text('CLEAR SIGNATURE'),
                                  style: TextButton.styleFrom(
                                    foregroundColor: AppTheme.primary,
                                    textStyle: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                  onPressed: () {
                                    setDialogState(() {
                                      localPoints.clear();
                                    });
                                  },
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Container(
                              height: 150,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppTheme.stone),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: GestureDetector(
                                  onPanStart: (details) {
                                    setDialogState(() {
                                      localPoints.add(details.localPosition);
                                    });
                                  },
                                  onPanUpdate: (details) {
                                    setDialogState(() {
                                      localPoints.add(details.localPosition);
                                    });
                                  },
                                  onPanEnd: (details) {
                                    setDialogState(() {
                                      localPoints.add(null);
                                    });
                                  },
                                  child: CustomPaint(
                                    painter: _SignaturePainter(localPoints),
                                    size: Size.infinite,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Draw your signature inside the box using touch screen. Read the agreement above before saving.',
                              style: TextStyle(
                                color: AppTheme.charcoalLight,
                                fontSize: 10,
                                height: 1.35,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const Divider(height: 1, color: AppTheme.stone),
                    Padding(
                      padding: const EdgeInsets.all(18),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextButton(
                              onPressed: () => Navigator.pop(context),
                              child: const Text(
                                'CANCEL',
                                style: TextStyle(
                                  color: AppTheme.charcoalLight,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.8,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            flex: 2,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF1F1F1F),
                                padding:
                                    const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              onPressed: () {
                                if (ownerNameController.text.trim().isEmpty) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content:
                                          Text('Please enter owner full name.'),
                                    ),
                                  );
                                  return;
                                }
                                if (ownerAddressController.text
                                    .trim()
                                    .isEmpty) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content:
                                          Text('Please enter owner address.'),
                                    ),
                                  );
                                  return;
                                }
                                if (localPoints.isEmpty) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content:
                                          Text('Please draw your signature.'),
                                    ),
                                  );
                                  return;
                                }
                                setState(() {
                                  _ownerNameController.text =
                                      ownerNameController.text.trim();
                                  _ownerAddressController.text =
                                      ownerAddressController.text.trim();
                                  _signaturePoints = localPoints;
                                  _signatureName =
                                      ownerNameController.text.trim();
                                  _termsAccepted = true;
                                });
                                Navigator.pop(context);
                              },
                              child: const Text(
                                'I Agree & Save Signature',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ),
                        ],
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
  }

  Widget _buildLegalAgreementPreview() {
    const paragraphStyle = TextStyle(
      color: AppTheme.charcoal,
      fontSize: 13,
      height: 1.45,
      fontWeight: FontWeight.w500,
    );

    return Container(
      constraints: const BoxConstraints(maxHeight: 210),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFAFAFA),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.stone),
      ),
      child: Scrollbar(
        thumbVisibility: true,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'SHORT-TERM RENTAL HOST AGREEMENT',
                style: TextStyle(
                  color: Color(0xFF111111),
                  fontSize: 13,
                  height: 1.35,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 14),
              RichText(
                text: const TextSpan(
                  style: paragraphStyle,
                  children: [
                    TextSpan(text: 'This Short-Term Rental Host Agreement '),
                    TextSpan(
                      text: '("Agreement")',
                      style: TextStyle(fontWeight: FontWeight.w800),
                    ),
                    TextSpan(text: ' is executed between '),
                    TextSpan(
                      text:
                          'X-Space360 / Golden Rich Financial & Real Estate Solutions Private Limited',
                      style: TextStyle(fontWeight: FontWeight.w900),
                    ),
                    TextSpan(
                      text:
                          ' ("Platform") and the property owner or authorized host ("Host") for listing, promotion, booking facilitation, and guest coordination services through the X-Space360 platform.',
                    ),
                  ],
                ),
              ),
              _agreementClause(
                '1. Appointment and Listing Authorization',
                'The Host authorizes the Platform to display, promote, verify, and facilitate bookings for the submitted property, subject to verification and platform policies.',
              ),
              _agreementClause(
                '2. Host Representation and Compliance',
                'The Host confirms that they are the lawful owner, lessee, manager, or authorized representative and are responsible for licenses, permissions, society approvals, statutory registrations, tax obligations, safety requirements, and local law compliance.',
              ),
              _agreementClause(
                '3. Documents and Verification',
                'The Host agrees that all submitted KYC, property, banking, Shop Act, GST, ownership, address, and supporting documents are true, valid, and may be reviewed by the Platform or its authorized verification teams.',
              ),
              _agreementClause(
                '4. Property Accuracy and Guest Safety',
                'The Host remains responsible for accurate listing information, safe premises, lawful use, guest coordination, maintenance, and resolving property-level issues during bookings.',
              ),
              _agreementClause(
                '5. Fees, Payouts, and Taxes',
                'The Platform may deduct applicable platform fees, payment gateway charges, penalties, refunds, or taxes before releasing eligible payouts to the Host.',
              ),
              _agreementClause(
                '6. Indemnity and Termination',
                'The Host shall indemnify the Platform against claims, losses, penalties, guest disputes, regulatory action, or legal proceedings arising from false documents, unsafe premises, non-compliance, fraud, negligence, or breach of this Agreement.',
              ),
              _agreementClause(
                '7. Electronic Acceptance',
                'By entering legal details and drawing an electronic signature, the Host confirms that they have read, understood, accepted, and agreed to be bound by this Agreement and applicable platform policies.',
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _agreementClause(String title, String body) {
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: Color(0xFF222222),
              fontSize: 13,
              height: 1.35,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            body,
            style: const TextStyle(
              color: AppTheme.charcoal,
              fontSize: 13,
              height: 1.45,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  void _submitVerification() async {
    if (_aadharPath == null ||
        _propertyProofPath == null ||
        _cancelledChequePath == null ||
        _shopActPath == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please upload all mandatory documents.')),
      );
      return;
    }

    if (!_verifyFormKey.currentState!.validate()) return;

    if (_signaturePoints.isEmpty || _signatureName == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please sign the agreement terms.')),
      );
      return;
    }

    if (!_termsAccepted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please accept the agreement checkbox.')),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final payload = <String, dynamic>{
      'aadhar_card': _aadharPath,
      'property_proof': _propertyProofPath,
      'cancelled_cheque': _cancelledChequePath,
      'shop_act': _shopActPath,
      'agreement_owner_name': _ownerNameController.text.trim(),
      'agreement_owner_address': _ownerAddressController.text.trim(),
      'agreement_signature':
          'Signed electronically by ${_signatureName ?? _ownerNameController.text.trim()}',
      'terms_accepted': _termsAccepted,
      'terms_version': 'host-verification-2026-06',
    };
    if (_societyNocPath != null) payload['society_noc'] = _societyNocPath;
    if (_gstCertificatePath != null) {
      payload['gst_certificate'] = _gstCertificatePath;
    }
    if (_gstNumberController.text.trim().isNotEmpty) {
      payload['gst_number'] = _gstNumberController.text.trim();
    }

    final success = await authProvider.submitHostVerification(payload);

    if (!mounted) return;
    setState(() {
      _isSubmitting = false;
    });

    if (success) {
      final messenger = ScaffoldMessenger.of(context);
      Navigator.pop(context);
      messenger.showSnackBar(
        const SnackBar(
          content: Text(
              'Verification submitted successfully. Admin will verify shortly.'),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.lastError ??
              'Failed to submit verification. Please try again.'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        top: 24,
        left: 20,
        right: 20,
      ),
      height: MediaQuery.of(context).size.height * 0.9,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppTheme.stone.withOpacity(0.8),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Document Verification',
                        style: textTheme.displayMedium?.copyWith(
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF07183A))),
                    const SizedBox(height: 6),
                    Text(
                      'Please upload your documents to verify your host profile',
                      style: textTheme.labelLarge?.copyWith(
                        fontSize: 14,
                        height: 1.35,
                        color: AppTheme.charcoalLight,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          const Divider(height: 24, color: AppTheme.stone),
          Expanded(
            child: SingleChildScrollView(
              child: Form(
                key: _verifyFormKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 0.78,
                      children: [
                        _buildUploadCard(
                          number: '01',
                          title: 'KYC - Owner',
                          subtitle:
                              'Aadhaar Card / PAN Card / Passport of owner',
                          documentType: 'aadhar',
                          icon: Icons.person_outline,
                          isRequired: true,
                          path: _aadharPath,
                          isUploading: _isUploadingAadhar,
                          onTap: () => _openUploadSourceSelection('aadhar'),
                        ),
                        _buildUploadCard(
                          number: '02',
                          title: 'Property Documents',
                          subtitle: 'Property Tax / Water Tax / MSEB Bill',
                          documentType: 'proof',
                          icon: Icons.apartment_outlined,
                          isRequired: true,
                          path: _propertyProofPath,
                          isUploading: _isUploadingProof,
                          onTap: () => _openUploadSourceSelection('proof'),
                        ),
                        _buildUploadCard(
                          number: '03',
                          title: 'Society NOC',
                          subtitle: 'If not a society, then Neighbour NOC',
                          documentType: 'society_noc',
                          icon: Icons.groups_2_outlined,
                          isRequired: false,
                          path: _societyNocPath,
                          isUploading: _isUploadingSocietyNoc,
                          onTap: () =>
                              _openUploadSourceSelection('society_noc'),
                        ),
                        _buildUploadCard(
                          number: '04',
                          title: 'Cancelled Cheque / Bank Statement',
                          subtitle: 'Latest cancelled cheque or bank statement',
                          documentType: 'cheque',
                          icon: Icons.account_balance_outlined,
                          isRequired: true,
                          path: _cancelledChequePath,
                          isUploading: _isUploadingCheque,
                          onTap: () => _openUploadSourceSelection('cheque'),
                        ),
                        _buildUploadCard(
                          number: '05',
                          title: 'Shop Act License',
                          subtitle:
                              'Shop Act registration copy of the business',
                          documentType: 'shop_act',
                          icon: Icons.assignment_outlined,
                          isRequired: true,
                          path: _shopActPath,
                          isUploading: _isUploadingShopAct,
                          onTap: () => _openUploadSourceSelection('shop_act'),
                        ),
                        _buildUploadCard(
                          number: '06',
                          title: 'GST Document',
                          subtitle:
                              'GST Certificate / GST Registration (Optional)',
                          documentType: 'gst',
                          icon: Icons.business_center_outlined,
                          isRequired: false,
                          path: _gstCertificatePath,
                          isUploading: _isUploadingGst,
                          onTap: () => _openUploadSourceSelection('gst'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Container(
                      decoration: BoxDecoration(
                        color: AppTheme.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.stone),
                      ),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 10),
                      child: Row(
                        children: [
                          Container(
                            width: 42,
                            height: 42,
                            decoration: BoxDecoration(
                              color: AppTheme.stone.withOpacity(0.35),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.receipt_long_outlined,
                                color: AppTheme.charcoalLight, size: 22),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _gstNumberController,
                              decoration: const InputDecoration(
                                labelText: 'GST Number (If Applicable)',
                                hintText: 'Enter GST Number',
                                border: InputBorder.none,
                                isDense: true,
                              ),
                            ),
                          ),
                          const Icon(Icons.info_outline,
                              color: AppTheme.charcoalLight, size: 22),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    Container(
                      padding: const EdgeInsets.all(16.0),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFFCF7),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: AppTheme.primary.withOpacity(0.45)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.description,
                                  color: AppTheme.primary, size: 24),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'X-Space360 GRP & Owner (Host) Agreement',
                                  style: textTheme.bodyLarge?.copyWith(
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF07183A),
                                  ),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 5),
                                decoration: BoxDecoration(
                                    color: const Color(0xFFDDF8E4),
                                    borderRadius: BorderRadius.circular(8)),
                                child: const Text('REQUIRED',
                                    style: TextStyle(
                                        color: Color(0xFF1D8D3D),
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Read the X-Space360 legal agreement, enter owner details, and sign electronically.',
                            style: TextStyle(
                                fontSize: 13,
                                height: 1.45,
                                color: AppTheme.charcoalLight),
                          ),
                          const SizedBox(height: 14),
                          TextFormField(
                            controller: _ownerNameController,
                            decoration: const InputDecoration(
                                labelText: 'Owner Full Name',
                                prefixIcon: Icon(Icons.person_outline),
                                border: OutlineInputBorder(),
                                contentPadding: EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 10)),
                            validator: (v) => v == null || v.trim().isEmpty
                                ? 'Owner Name is required'
                                : null,
                          ),
                          const SizedBox(height: 10),
                          TextFormField(
                            controller: _ownerAddressController,
                            decoration: const InputDecoration(
                                labelText: 'Owner Address',
                                prefixIcon: Icon(Icons.location_on_outlined),
                                border: OutlineInputBorder(),
                                contentPadding: EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 10)),
                            validator: (v) => v == null || v.trim().isEmpty
                                ? 'Owner Address is required'
                                : null,
                          ),
                          const SizedBox(height: 16),

                          // Review & Sign Button matching Image 2
                          InkWell(
                            onTap: _openSignaturePad,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  vertical: 14, horizontal: 16),
                              decoration: BoxDecoration(
                                color: const Color(0xFF07183A),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.edit_note,
                                      color: Colors.white, size: 20),
                                  const SizedBox(width: 8),
                                  Text(
                                    _signaturePoints.isNotEmpty
                                        ? 'CHANGE SIGNATURE'
                                        : 'READ & SIGN AGREEMENT',
                                    style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: 0.5),
                                  ),
                                ],
                              ),
                            ),
                          ),

                          // Visual representation of the signature
                          if (_signaturePoints.isNotEmpty) ...[
                            const SizedBox(height: 12),
                            Container(
                              height: 80,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(8),
                                border:
                                    Border.all(color: Colors.green.shade300),
                              ),
                              child: Center(
                                child: Text(
                                  'Signed by: $_signatureName (Touchscreen Signature Saved)',
                                  style: TextStyle(
                                      fontStyle: FontStyle.italic,
                                      color: Colors.green.shade800,
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold),
                                ),
                              ),
                            ),
                          ],

                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Checkbox(
                                value: _termsAccepted,
                                activeColor: AppTheme.primary,
                                onChanged: (val) {
                                  setState(() {
                                    _termsAccepted = val ?? false;
                                  });
                                },
                              ),
                              const Expanded(
                                child: Text(
                                    'I review and agree to the STR agreement terms.',
                                    style: TextStyle(
                                        fontSize: 12,
                                        color: AppTheme.charcoal)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: () => Navigator.pop(context),
                            child: const Text('CANCEL',
                                style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              backgroundColor: AppTheme.primary,
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed:
                                _isSubmitting ? null : _submitVerification,
                            child: _isSubmitting
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                        color: Colors.white, strokeWidth: 2))
                                : const Text('SUBMIT',
                                    style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUploadCard({
    required String number,
    required String title,
    required String subtitle,
    required String documentType,
    required IconData icon,
    required bool isRequired,
    required String? path,
    required bool isUploading,
    required VoidCallback onTap,
  }) {
    final isUploaded = path != null;

    return GestureDetector(
      onTap: isUploading || isUploaded ? null : onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isUploaded ? Colors.green.withOpacity(0.55) : AppTheme.stone,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Stack(
          children: [
            Positioned(
              top: 0,
              left: 0,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
                decoration: const BoxDecoration(
                  color: AppTheme.primary,
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(10),
                    bottomRight: Radius.circular(8),
                  ),
                ),
                child: Text(
                  number,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
            if (isUploaded)
              Positioned(
                top: 8,
                right: 8,
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      if (documentType == 'aadhar') _aadharPath = null;
                      if (documentType == 'proof') _propertyProofPath = null;
                      if (documentType == 'society_noc') _societyNocPath = null;
                      if (documentType == 'cheque') _cancelledChequePath = null;
                      if (documentType == 'shop_act') _shopActPath = null;
                      if (documentType == 'gst') _gstCertificatePath = null;
                    });
                  },
                  child: const Icon(Icons.cancel, color: Colors.red, size: 18),
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 24, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Align(
                    alignment: Alignment.centerRight,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 4),
                      decoration: BoxDecoration(
                        color: isRequired
                            ? AppTheme.primary.withOpacity(0.12)
                            : const Color(0xFFEAF2FF),
                        borderRadius: BorderRadius.circular(7),
                      ),
                      child: Text(
                        isRequired ? 'MANDATORY' : 'OPTIONAL',
                        style: TextStyle(
                          fontSize: 8,
                          fontWeight: FontWeight.w800,
                          color: isRequired
                              ? AppTheme.primary
                              : const Color(0xFF1E4A7A),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    width: 58,
                    height: 58,
                    margin: const EdgeInsets.symmetric(horizontal: 36),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withOpacity(0.10),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isUploaded ? Icons.check_circle_outline : icon,
                      color: isUploaded ? Colors.green : AppTheme.primary,
                      size: 31,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    title,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      height: 1.15,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.charcoal,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    subtitle,
                    textAlign: TextAlign.center,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 9,
                      height: 1.25,
                      color: AppTheme.charcoalLight,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  OutlinedButton.icon(
                    onPressed: isUploading || isUploaded ? null : onTap,
                    style: OutlinedButton.styleFrom(
                      foregroundColor:
                          isUploaded ? Colors.green : AppTheme.primary,
                      side: BorderSide(
                        color: isUploaded ? Colors.green : AppTheme.primary,
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      minimumSize: const Size.fromHeight(36),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    icon: Icon(
                      isUploaded
                          ? Icons.check_circle_outline
                          : Icons.cloud_upload_outlined,
                      size: 17,
                    ),
                    label: Text(
                      isUploading
                          ? 'UPLOADING...'
                          : isUploaded
                              ? 'UPLOADED'
                              : 'UPLOAD FILE',
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(height: 5),
                  const Text(
                    'JPG, PNG, PDF (Max. 5MB)',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 9,
                      color: AppTheme.charcoalLight,
                      fontWeight: FontWeight.w600,
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

class _SignaturePainter extends CustomPainter {
  final List<Offset?> points;

  _SignaturePainter(this.points);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black87
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 3.0;

    for (int i = 0; i < points.length - 1; i++) {
      if (points[i] != null && points[i + 1] != null) {
        canvas.drawLine(points[i]!, points[i + 1]!, paint);
      }
    }
  }

  @override
  bool shouldRepaint(_SignaturePainter oldDelegate) =>
      oldDelegate.points != points;
}
