import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/property_model.dart';
import '../../providers/property_provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme.dart';
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
        Provider.of<PropertyProvider>(context, listen: false).getHostProperties();
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
            Text('Verification Pending', style: Theme.of(context).textTheme.displayMedium?.copyWith(fontSize: 20)),
          ],
        ),
        content: const Text(
          'Your host verification request has been submitted and is currently undergoing admin review. You will be able to list new properties once approved.',
          style: TextStyle(fontSize: 15, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold)),
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
                          Text('List a New Property', style: Theme.of(context).textTheme.displayMedium?.copyWith(fontSize: 22)),
                          IconButton(
                            onPressed: () => Navigator.pop(context),
                            icon: const Icon(Icons.close),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _titleController,
                        decoration: const InputDecoration(labelText: 'Title', border: OutlineInputBorder()),
                        validator: (v) => v == null || v.isEmpty ? 'Title required' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _descController,
                        decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder()),
                        maxLines: 2,
                        validator: (v) => v == null || v.isEmpty ? 'Description required' : null,
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _priceController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(labelText: 'Price per night', border: OutlineInputBorder()),
                              validator: (v) => v == null || v.isEmpty ? 'Price required' : null,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _areaController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(labelText: 'Area (sqft)', border: OutlineInputBorder()),
                              validator: (v) => v == null || v.isEmpty ? 'Area required' : null,
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
                              decoration: const InputDecoration(labelText: 'City', border: OutlineInputBorder()),
                              validator: (v) => v == null || v.isEmpty ? 'City required' : null,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _stateController,
                              decoration: const InputDecoration(labelText: 'State', border: OutlineInputBorder()),
                              validator: (v) => v == null || v.isEmpty ? 'State required' : null,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _addressController,
                        decoration: const InputDecoration(labelText: 'Full Address', border: OutlineInputBorder()),
                        validator: (v) => v == null || v.isEmpty ? 'Address required' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _pinCodeController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Pincode', border: OutlineInputBorder()),
                        validator: (v) => v == null || v.isEmpty ? 'Pincode required' : null,
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: _propertyType,
                        decoration: const InputDecoration(labelText: 'Property Type', border: OutlineInputBorder()),
                        items: const [
                          DropdownMenuItem(value: 'villa', child: Text('Villa')),
                          DropdownMenuItem(value: 'apartment', child: Text('Apartment')),
                          DropdownMenuItem(value: 'studio', child: Text('Studio')),
                          DropdownMenuItem(value: 'independent_house', child: Text('House')),
                        ],
                        onChanged: (val) => setModalState(() => _propertyType = val!),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: _bhkType,
                        decoration: const InputDecoration(labelText: 'BHK Type', border: OutlineInputBorder()),
                        items: const [
                          DropdownMenuItem(value: 'studio', child: Text('Studio')),
                          DropdownMenuItem(value: '1bhk', child: Text('1 BHK')),
                          DropdownMenuItem(value: '2bhk', child: Text('2 BHK')),
                          DropdownMenuItem(value: '3bhk', child: Text('3 BHK')),
                          DropdownMenuItem(value: '4bhk', child: Text('4 BHK')),
                        ],
                        onChanged: (val) => setModalState(() => _bhkType = val!),
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          backgroundColor: AppTheme.primary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () async {
                          if (!_formKey.currentState!.validate()) return;
                          final createdId = await Provider.of<PropertyProvider>(context, listen: false).createProperty({
                            'title': _titleController.text,
                            'description': _descController.text,
                            'price_per_night': double.parse(_priceController.text),
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
                              const SnackBar(content: Text('Property added successfully!')),
                            );
                            Provider.of<PropertyProvider>(context, listen: false).getHostProperties();
                          }
                        },
                        child: const Text('Add Property', style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold)),
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

    final liveProperties = sortedProperties.where((p) => p.status.toLowerCase() == 'live').toList();
    final pendingProperties = sortedProperties.where((p) => p.status.toLowerCase() == 'pending').toList();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Image.asset('assets/images/logo.png', height: 32, errorBuilder: (c, e, s) => const Text('Goldenrich STR', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold))),
        centerTitle: false,
        backgroundColor: AppTheme.white,
        elevation: 0.5,
        actions: [
          TextButton.icon(
            onPressed: _handleListPropertyTrigger,
            icon: const Icon(Icons.add, color: AppTheme.primary),
            label: const Text('LIST NEW', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold)),
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
                padding: const EdgeInsets.only(left: 20.0, right: 20.0, top: 24.0, bottom: 8.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Your Portfolio',
                      style: textTheme.displayMedium?.copyWith(fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Manage your properties and track performance',
                      style: textTheme.bodyMedium?.copyWith(color: AppTheme.charcoalLight),
                    ),
                  ],
                ),
              ),

              if (authProvider.currentUser?.kycStatus.toLowerCase() != 'approved')
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
                  padding: const EdgeInsets.all(16.0),
                  decoration: BoxDecoration(
                    color: authProvider.currentUser?.kycStatus.toLowerCase() == 'pending'
                        ? Colors.orange.withOpacity(0.12)
                        : AppTheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16.0),
                    border: Border.all(
                      color: authProvider.currentUser?.kycStatus.toLowerCase() == 'pending'
                          ? Colors.orange.withOpacity(0.3)
                          : AppTheme.primary.withOpacity(0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        authProvider.currentUser?.kycStatus.toLowerCase() == 'pending'
                            ? Icons.hourglass_top_rounded
                            : Icons.gpp_maybe_rounded,
                        color: authProvider.currentUser?.kycStatus.toLowerCase() == 'pending'
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
                              authProvider.currentUser?.kycStatus.toLowerCase() == 'pending'
                                  ? 'Verification In Progress'
                                  : 'Document Verification Required',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                color: authProvider.currentUser?.kycStatus.toLowerCase() == 'pending'
                                    ? Colors.orange.shade900
                                    : AppTheme.primary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              authProvider.currentUser?.kycStatus.toLowerCase() == 'pending'
                                  ? 'Your files are being reviewed by the admin.'
                                  : 'Please submit your documents to activate listing features.',
                              style: TextStyle(
                                fontSize: 12,
                                color: authProvider.currentUser?.kycStatus.toLowerCase() == 'pending'
                                    ? Colors.orange.shade900.withOpacity(0.8)
                                    : AppTheme.charcoal,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (authProvider.currentUser?.kycStatus.toLowerCase() != 'pending')
                        IconButton(
                          icon: const Icon(Icons.arrow_forward_ios, size: 16, color: AppTheme.primary),
                          onPressed: _handleListPropertyTrigger,
                        ),
                    ],
                  ),
                ),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
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
                    ),
                    _buildStatCard(
                      icon: Icons.visibility,
                      title: 'Active Listings',
                      value: '${liveProperties.length}',
                    ),
                    _buildStatCard(
                      icon: Icons.pending_actions,
                      title: 'Pending Review',
                      value: '${pendingProperties.length}',
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
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Host Dashboard Features',
                      style: textTheme.displayMedium?.copyWith(fontSize: 18, fontWeight: FontWeight.bold),
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
                                MaterialPageRoute(builder: (context) => const HostCalendarScreen()),
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
                                MaterialPageRoute(builder: (context) => const HostPayoutsScreen()),
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
                                MaterialPageRoute(builder: (context) => const HostBookingsScreen()),
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
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
                child: Text(
                  'Active Listings',
                  style: textTheme.displayMedium?.copyWith(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),

              propertyProvider.isLoading
                  ? const Padding(
                      padding: EdgeInsets.symmetric(vertical: 40.0),
                      child: Center(child: CircularProgressIndicator(color: AppTheme.primary)),
                    )
                  : properties.isEmpty
                      ? _buildEmptyState()
                      : ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: sortedProperties.length,
                          padding: const EdgeInsets.symmetric(horizontal: 20.0),
                          itemBuilder: (context, index) {
                            final prop = sortedProperties[index];
                            final isLive = prop.status.toLowerCase() == 'live';
                            final isDraft = prop.status.toLowerCase() == 'draft';
                            
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
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            prop.title,
                                            style: textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: isLive ? Colors.green.withOpacity(0.1) : Colors.orange.withOpacity(0.1),
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                          child: Text(
                                            prop.status.toUpperCase(),
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                              color: isLive ? Colors.green : Colors.orange,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        const Icon(Icons.location_on, size: 14, color: AppTheme.charcoalLight),
                                        const SizedBox(width: 4),
                                        Text('${prop.city}, ${prop.state}', style: textTheme.bodyMedium?.copyWith(color: AppTheme.charcoalLight)),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        const Icon(Icons.access_time, size: 14, color: AppTheme.charcoalLight),
                                        const SizedBox(width: 4),
                                        Text(
                                          'Listed: ${prop.createdAt != null ? DateFormat('dd MMM yyyy, hh:mm a').format(prop.createdAt!.toLocal()) : "N/A"}',
                                          style: textTheme.bodyMedium?.copyWith(color: AppTheme.charcoalLight, fontSize: 12),
                                        ),
                                      ],
                                    ),
                                    const Divider(height: 24, color: AppTheme.stone),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          'Area: ${prop.areaSqft.toStringAsFixed(0)} sqft',
                                          style: textTheme.bodyMedium?.copyWith(color: AppTheme.charcoalLight),
                                        ),
                                        Text(
                                          '₹${prop.pricePerNight.toStringAsFixed(0)} / night',
                                          style: textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold, color: AppTheme.primary),
                                        ),
                                      ],
                                    ),
                                    if (isDraft) ...[
                                      const SizedBox(height: 12),
                                      Row(
                                        children: [
                                          Expanded(
                                            child: OutlinedButton.icon(
                                              icon: const Icon(Icons.edit, size: 14),
                                              label: const Text('Edit Draft'),
                                              onPressed: () async {
                                                final updated = await Navigator.push(
                                                  context,
                                                  MaterialPageRoute(
                                                    builder: (context) => HostListPropertyScreen(property: prop),
                                                  ),
                                                );
                                                if (updated == true) {
                                                  propertyProvider.getHostProperties();
                                                }
                                              },
                                              style: OutlinedButton.styleFrom(
                                                foregroundColor: AppTheme.primary,
                                                side: const BorderSide(color: AppTheme.primary),
                                                minimumSize: const Size(double.infinity, 40),
                                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: ElevatedButton.icon(
                                              icon: const Icon(Icons.send, size: 14, color: Colors.white),
                                              label: const Text('Submit'),
                                              onPressed: () async {
                                                final success = await Provider.of<PropertyProvider>(context, listen: false)
                                                    .submitForVerification(prop.propertyId);
                                                if (success && context.mounted) {
                                                  ScaffoldMessenger.of(context).showSnackBar(
                                                    const SnackBar(content: Text('Submitted for Verification!')),
                                                  );
                                                  propertyProvider.getHostProperties();
                                                }
                                              },
                                              style: ElevatedButton.styleFrom(
                                                backgroundColor: AppTheme.primary,
                                                foregroundColor: Colors.white,
                                                minimumSize: const Size(double.infinity, 40),
                                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ] else ...[
                                      const SizedBox(height: 12),
                                      OutlinedButton.icon(
                                        icon: const Icon(Icons.edit, size: 14),
                                        label: const Text('Edit Listing'),
                                        onPressed: () async {
                                          final updated = await Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (context) => HostListPropertyScreen(property: prop),
                                            ),
                                          );
                                          if (updated == true) {
                                            propertyProvider.getHostProperties();
                                          }
                                        },
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor: AppTheme.charcoal,
                                          side: const BorderSide(color: AppTheme.border),
                                          minimumSize: const Size(double.infinity, 40),
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                        ),
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
  }) {
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: AppTheme.white,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: AppTheme.stone),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: iconColor, size: 24),
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
  }

  Widget _buildEmptyState() {
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
            child: const Icon(Icons.business, size: 36, color: AppTheme.charcoalLight),
          ),
          const SizedBox(height: 20),
          const Text(
            'No Properties Listed',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
          ),
          const SizedBox(height: 6),
          const Text(
            'READY TO START EARNING? LIST YOUR FIRST HOME TODAY.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 11, letterSpacing: 0.8, color: AppTheme.charcoalLight, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _handleListPropertyTrigger,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
            ),
            child: const Text(
              'Get Started',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ),
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
  State<_DocumentVerificationSheet> createState() => _DocumentVerificationSheetState();
}

class _DocumentVerificationSheetState extends State<_DocumentVerificationSheet> {
  final _verifyFormKey = GlobalKey<FormState>();
  
  String? _aadharPath;
  String? _propertyProofPath;
  String? _cancelledChequePath;
  String? _gstCertificatePath;
  
  bool _isUploadingAadhar = false;
  bool _isUploadingProof = false;
  bool _isUploadingCheque = false;
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
            Text('Upload Document', style: Theme.of(context).textTheme.displayMedium?.copyWith(fontSize: 18)),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.photo_library, color: AppTheme.primary),
              title: const Text('Choose from Gallery'),
              onTap: () async {
                Navigator.pop(context);
                final picked = await ImagePicker().pickImage(source: ImageSource.gallery);
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
                final picked = await ImagePicker().pickImage(source: ImageSource.camera);
                if (picked != null) {
                  _setDocumentPath(type, picked.name, picked.path);
                }
              },
            ),
            ListTile(
              leading: const Icon(Icons.developer_mode, color: AppTheme.primary),
              title: const Text('Simulate Document (For Fast Testing)'),
              onTap: () {
                Navigator.pop(context);
                _setDocumentPath(type, '${type}_document.jpg', 'uploads/mock_${type}_document.jpg');
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
      if (type == 'cheque') _isUploadingCheque = true;
      if (type == 'gst') _isUploadingGst = true;
    });

    // Simulate small file upload time
    await Future.delayed(const Duration(milliseconds: 800));

    if (!mounted) return;
    setState(() {
      if (type == 'aadhar') {
        _isUploadingAadhar = false;
        _aadharPath = path;
      }
      if (type == 'proof') {
        _isUploadingProof = false;
        _propertyProofPath = path;
      }
      if (type == 'cheque') {
        _isUploadingCheque = false;
        _cancelledChequePath = path;
      }
      if (type == 'gst') {
        _isUploadingGst = false;
        _gstCertificatePath = path;
      }
    });
  }

  // Opens interactive Signature Pad dialog
  void _openSignaturePad() {
    List<Offset?> localPoints = List.from(_signaturePoints);
    final signatoryController = TextEditingController(text: _signatureName ?? _ownerNameController.text);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: const Text('Sign Agreement Canvas', style: TextStyle(fontWeight: FontWeight.bold)),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('Draw your signature in the box below using your finger:', style: TextStyle(fontSize: 12, color: AppTheme.charcoalLight)),
                  const SizedBox(height: 12),
                  Container(
                    height: 160,
                    decoration: BoxDecoration(
                      color: AppTheme.background,
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
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton.icon(
                        icon: const Icon(Icons.clear, size: 16, color: Colors.red),
                        label: const Text('Clear Box', style: TextStyle(color: Colors.red)),
                        onPressed: () {
                          setDialogState(() {
                            localPoints.clear();
                          });
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: signatoryController,
                    decoration: const InputDecoration(
                      labelText: 'Signatory Name',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel', style: TextStyle(color: AppTheme.charcoalLight)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
                  onPressed: () {
                    if (localPoints.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Please draw your signature.')),
                      );
                      return;
                    }
                    if (signatoryController.text.trim().isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Please type signatory name.')),
                      );
                      return;
                    }
                    setState(() {
                      _signaturePoints = localPoints;
                      _signatureName = signatoryController.text.trim();
                    });
                    Navigator.pop(context);
                  },
                  child: const Text('Confirm & Apply', style: TextStyle(color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _submitVerification() async {
    if (_aadharPath == null || _propertyProofPath == null || _cancelledChequePath == null) {
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
    final success = await authProvider.submitHostVerification({
      'aadhar_card': _aadharPath,
      'property_proof': _propertyProofPath,
      'cancelled_cheque': _cancelledChequePath,
      'gst_certificate': _gstCertificatePath,
      'gst_number': _gstNumberController.text.trim().isEmpty ? null : _gstNumberController.text.trim(),
      'agreement_owner_name': _ownerNameController.text.trim(),
      'agreement_owner_address': _ownerAddressController.text.trim(),
      'agreement_signature': _signatureName,
      'terms_accepted': _termsAccepted,
    });

    if (!mounted) return;
    setState(() {
      _isSubmitting = false;
    });

    if (success) {
      Navigator.pop(context);
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green, size: 28),
              SizedBox(width: 10),
              Text('Submitted!'),
            ],
          ),
          content: const Text('Your documents and signed agreement have been submitted. Admin will verify shortly.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('OK', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to submit verification. Please try again.')),
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
          // Fix horizontal overflow using Expanded inside Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Document Verification', style: textTheme.displayMedium?.copyWith(fontSize: 20, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 2),
                    Text('Please upload your documents to verify your host profile', style: textTheme.labelLarge),
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
                      childAspectRatio: 1.15,
                      children: [
                        _buildUploadCard(
                          title: 'Aadhar Card',
                          isRequired: true,
                          path: _aadharPath,
                          isUploading: _isUploadingAadhar,
                          onTap: () => _openUploadSourceSelection('aadhar'),
                        ),
                        _buildUploadCard(
                          title: 'Property Ownership Proof',
                          isRequired: true,
                          path: _propertyProofPath,
                          isUploading: _isUploadingProof,
                          onTap: () => _openUploadSourceSelection('proof'),
                        ),
                        _buildUploadCard(
                          title: 'Cancelled Cheque',
                          isRequired: true,
                          path: _cancelledChequePath,
                          isUploading: _isUploadingCheque,
                          onTap: () => _openUploadSourceSelection('cheque'),
                        ),
                        _buildUploadCard(
                          title: 'GST Certificate',
                          isRequired: false,
                          path: _gstCertificatePath,
                          isUploading: _isUploadingGst,
                          onTap: () => _openUploadSourceSelection('gst'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    TextFormField(
                      controller: _gstNumberController,
                      decoration: const InputDecoration(
                        labelText: 'GST Number (If Applicable)',
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 24),

                    Container(
                      padding: const EdgeInsets.all(16.0),
                      decoration: BoxDecoration(
                        color: AppTheme.background,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.stone),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.description, color: AppTheme.primary, size: 22),
                              const SizedBox(width: 8),
                              Text('X-Space360 GRP & Owner (Host) Agreement.', style: textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.bold)),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(color: AppTheme.primary.withOpacity(0.12), borderRadius: BorderRadius.circular(4)),
                                child: const Text('MANDATORY', style: TextStyle(color: AppTheme.primary, fontSize: 8, fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Review the X-space360 platform T&C - Mutual Agreement between Host & X-space360 enter details and sign.',
                            style: TextStyle(fontSize: 12, color: AppTheme.charcoalLight),
                          ),
                          const SizedBox(height: 14),
                          TextFormField(
                            controller: _ownerNameController,
                            decoration: const InputDecoration(labelText: 'Owner Full Name', border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
                            validator: (v) => v == null || v.trim().isEmpty ? 'Owner Name is required' : null,
                          ),
                          const SizedBox(height: 10),
                          TextFormField(
                            controller: _ownerAddressController,
                            decoration: const InputDecoration(labelText: 'Owner Address', border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
                            validator: (v) => v == null || v.trim().isEmpty ? 'Owner Address is required' : null,
                          ),
                          const SizedBox(height: 16),
                          
                          // Review & Sign Button matching Image 2
                          InkWell(
                            onTap: _openSignaturePad,
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                              decoration: BoxDecoration(
                                color: Colors.black87,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.edit_note, color: Colors.white, size: 20),
                                  const SizedBox(width: 8),
                                  Text(
                                    _signaturePoints.isNotEmpty ? 'CHANGE SIGNATURE' : 'REVIEW & SIGN',
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 0.5),
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
                                border: Border.all(color: Colors.green.shade300),
                              ),
                              child: Center(
                                child: Text(
                                  'Signed by: $_signatureName (Touchscreen Signature Saved)',
                                  style: TextStyle(fontStyle: FontStyle.italic, color: Colors.green.shade800, fontSize: 11, fontWeight: FontWeight.bold),
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
                                child: Text('I review and agree to the STR agreement terms.', style: TextStyle(fontSize: 12, color: AppTheme.charcoal)),
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
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: () => Navigator.pop(context),
                            child: const Text('CANCEL', style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              backgroundColor: AppTheme.primary,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: _isSubmitting ? null : _submitVerification,
                            child: _isSubmitting
                                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : const Text('SUBMIT', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
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
    required String title,
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
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isUploaded ? Colors.green.withOpacity(0.5) : AppTheme.stone,
            style: isUploaded ? BorderStyle.solid : BorderStyle.none,
          ),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: CustomPaint(
            painter: isUploaded ? null : _DashedPainter(color: AppTheme.stone.withOpacity(0.8)),
            child: Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: isRequired ? AppTheme.primary.withOpacity(0.1) : AppTheme.stone.withOpacity(0.5),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          isRequired ? 'MANDATORY' : 'IF APPLICABLE',
                          style: TextStyle(
                            fontSize: 7,
                            fontWeight: FontWeight.bold,
                            color: isRequired ? AppTheme.primary : AppTheme.charcoalLight,
                          ),
                        ),
                      ),
                      if (isUploaded)
                        GestureDetector(
                          onTap: () {
                            setState(() {
                              if (title.contains('Aadhar')) _aadharPath = null;
                              if (title.contains('Proof')) _propertyProofPath = null;
                              if (title.contains('Cheque')) _cancelledChequePath = null;
                              if (title.contains('GST')) _gstCertificatePath = null;
                            });
                          },
                          child: const Icon(Icons.cancel, color: Colors.red, size: 18),
                        ),
                    ],
                  ),
                  const Spacer(),
                  Icon(
                    isUploaded ? Icons.check_circle : Icons.cloud_upload_outlined,
                    color: isUploaded ? Colors.green : AppTheme.primary,
                    size: 28,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    title,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    isUploading
                        ? 'Uploading...'
                        : isUploaded
                            ? 'File Uploaded'
                            : 'Click to upload',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 9,
                      color: isUploaded ? Colors.green : AppTheme.charcoalLight,
                    ),
                  ),
                  const Spacer(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DashedPainter extends CustomPainter {
  final Color color;

  _DashedPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;

    const dashWidth = 5;
    const dashSpace = 4;
    final rrect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, size.width, size.height),
      const Radius.circular(16),
    );

    final path = Path()..addRRect(rrect);

    for (final PathMetric metric in path.computeMetrics()) {
      double distance = 0.0;
      while (distance < metric.length) {
        final Path extract = metric.extractPath(distance, distance + dashWidth);
        canvas.drawPath(extract, paint);
        distance += dashWidth + dashSpace;
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _SignaturePainter extends CustomPainter {
  final List<Offset?> points;
  final Color strokeColor;

  _SignaturePainter(this.points, {this.strokeColor = Colors.black87});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = strokeColor
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 3.0;

    for (int i = 0; i < points.length - 1; i++) {
      if (points[i] != null && points[i + 1] != null) {
        canvas.drawLine(points[i]!, points[i + 1]!, paint);
      }
    }
  }

  @override
  bool shouldRepaint(_SignaturePainter oldDelegate) => oldDelegate.points != points;
}
