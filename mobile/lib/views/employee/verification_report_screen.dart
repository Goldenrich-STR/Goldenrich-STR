import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/verification_provider.dart';
import '../../theme.dart';
import '../../services/api_service.dart';

class VerificationReportScreen extends StatefulWidget {
  final Map<String, dynamic> reviewData;
  final bool isAdmin;

  const VerificationReportScreen({
    super.key,
    required this.reviewData,
    this.isAdmin = false,
  });

  @override
  State<VerificationReportScreen> createState() => _VerificationReportScreenState();
}

class _VerificationReportScreenState extends State<VerificationReportScreen> {
  final ApiService _apiService = ApiService();
  late Map<String, dynamic> _checklist;
  final Map<String, String> _checklistRejectionReasons = {};
  bool _isActionLoading = false;

  @override
  void initState() {
    super.initState();
    // Copy checklist so RM can toggle individual items locally
    final originalChecklist = widget.reviewData['checklist'] as Map? ?? {};
    _checklist = Map<String, dynamic>.from(originalChecklist);
  }

  String _getImageUrl(String? path) {
    if (path == null || path.isEmpty) {
      return 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85';
    }
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    final baseUrl = _apiService.baseUrl;
    if (path.startsWith('/')) {
      return '$baseUrl$path';
    }
    return '$baseUrl/$path';
  }

  void _toggleChecklistItem(String key, bool approve) {
    if (approve) {
      setState(() {
        _checklist[key] = true;
        _checklistRejectionReasons.remove(key);
      });
    } else {
      // Show reason input dialog
      final controller = TextEditingController(text: _checklistRejectionReasons[key] ?? '');
      final formKey = GlobalKey<FormState>();
      final formattedKey = key.replaceAll('_', ' ').toUpperCase();

      showDialog(
        context: context,
        builder: (dialogContext) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            backgroundColor: Colors.white,
            title: Text(
              'Reject: $formattedKey',
              style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.charcoal),
            ),
            content: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Specify the discrepancy or reason for rejecting this item. This will be shared with the host.',
                    style: TextStyle(fontSize: 12, color: AppTheme.charcoalLight),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: controller,
                    decoration: InputDecoration(
                      labelText: 'Rejection Reason',
                      hintText: 'e.g. GPS coordinates show a different town...',
                      filled: true,
                      fillColor: const Color(0xFFF9F9F9),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                    ),
                    maxLines: 3,
                    validator: (v) => v == null || v.trim().isEmpty ? 'Reason is required.' : null,
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: const Text('CANCEL', style: TextStyle(color: AppTheme.charcoalLight, fontWeight: FontWeight.bold)),
              ),
              ElevatedButton(
                onPressed: () {
                  if (!formKey.currentState!.validate()) return;
                  Navigator.pop(dialogContext);
                  setState(() {
                    _checklist[key] = false;
                    _checklistRejectionReasons[key] = controller.text.trim();
                  });
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: const Text('SAVE', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          );
        },
      );
    }
  }

  Future<void> _exportReport() async {
    final verificationId = widget.reviewData['verification_id'];
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Exporting Report for $verificationId...')),
    );
    // Mimic file download trigger
    try {
      final response = await _apiService.dio.get('/employee/verifications/$verificationId/export-report');
      if (response.statusCode == 200 && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Verification Report exported successfully!'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Export failed: $e'), backgroundColor: AppTheme.primary),
        );
      }
    }
  }

  void _showFinalDecisionDialog(bool approve) {
    final remarksController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    // Store outer references to avoid closure context shadowing issues
    final outerContext = context;
    final verificationId = widget.reviewData['verification_id'];
    final propertyId = widget.reviewData['property_id'];

    showDialog(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          backgroundColor: Colors.white,
          title: Text(
            approve
                ? (widget.isAdmin ? 'Approve Listing & Go Live' : 'Approve Verification Report')
                : (widget.isAdmin ? 'Reject Listing' : 'Reject Verification Report'),
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
          ),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    approve 
                        ? (widget.isAdmin 
                            ? 'Confirming will publish this property listing live on the application inventory.' 
                            : 'Confirming this report will verify all checklist specifications and forward the property to Admin for listing live.') 
                        : (widget.isAdmin 
                            ? 'Please provide the rejection reason. The property listing status will be set to rejected.' 
                            : 'Please provide the rejection reason. The property listing will revert to draft status.'),
                    style: const TextStyle(fontSize: 12, color: AppTheme.charcoalLight),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: remarksController,
                    decoration: InputDecoration(
                      labelText: approve ? 'Remarks' : 'Reason for Rejection',
                      hintText: approve ? 'Enter comments...' : 'Enter discrepancy details...',
                      filled: true,
                      fillColor: const Color(0xFFF9F9F9),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                    ),
                    maxLines: 3,
                    validator: (v) => v == null || v.trim().isEmpty ? 'Remarks/Reason required.' : null,
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('CANCEL', style: TextStyle(color: AppTheme.charcoalLight, fontWeight: FontWeight.bold)),
            ),
            ElevatedButton(
              onPressed: () async {
                if (!formKey.currentState!.validate()) return;
                Navigator.pop(dialogContext); // Close dialog
                
                setState(() {
                  _isActionLoading = true;
                });

                String finalRemarks = remarksController.text.trim();
                if (!approve && _checklistRejectionReasons.isNotEmpty) {
                  finalRemarks += "\n\nDiscrepancies found:";
                  _checklistRejectionReasons.forEach((key, reason) {
                    final formattedKey = key.replaceAll('_', ' ').toUpperCase();
                    finalRemarks += "\n- $formattedKey: $reason";
                  });
                }

                // Use outerContext to access the provider
                final prov = Provider.of<VerificationProvider>(outerContext, listen: false);

                final bool success;
                if (widget.isAdmin) {
                  success = approve
                      ? await prov.adminApprove(propertyId, {
                          'remarks': remarksController.text.trim(),
                          'checklist': _checklist,
                        })
                      : await prov.adminReject(propertyId, finalRemarks);
                } else {
                  success = approve
                      ? await prov.employeeApprove(verificationId, remarksController.text.trim())
                      : await prov.employeeReject(verificationId, finalRemarks);
                }

                if (!mounted) return;
                
                setState(() {
                  _isActionLoading = false;
                });

                if (success) {
                  if (outerContext.mounted) {
                    ScaffoldMessenger.of(outerContext).showSnackBar(
                      SnackBar(
                        content: Text(approve 
                            ? (widget.isAdmin ? 'Property is now LIVE!' : 'Report approved successfully!') 
                            : (widget.isAdmin ? 'Property listing rejected.' : 'Report rejected successfully.')),
                        backgroundColor: approve ? const Color(0xFF4CAF50) : AppTheme.primary,
                      ),
                    );
                    Navigator.pop(outerContext); // Go back to dashboard list
                  }
                } else {
                  if (outerContext.mounted) {
                    ScaffoldMessenger.of(outerContext).showSnackBar(
                      SnackBar(
                        content: Text(approve ? 'Failed to submit approval.' : 'Failed to submit rejection.'),
                        backgroundColor: AppTheme.primary,
                      ),
                    );
                  }
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: approve ? const Color(0xFF4CAF50) : AppTheme.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
              child: Text(
                approve 
                    ? (widget.isAdmin ? 'Publish Live' : 'Approve') 
                    : (widget.isAdmin ? 'Reject Listing' : 'Reject'),
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final prop = widget.reviewData['property_details'] ?? {};
    final broker = widget.reviewData['broker_details'] ?? {};
    final photos = widget.reviewData['geo_tagged_photos'] as List? ?? [];
    
    final propTitle = prop['title'] ?? 'Luxury Stay';
    final propLoc = prop['city'] ?? 'N/A';
    final bhkType = prop['bhk_type'] ?? 'N/A';
    final category = prop['category'] ?? 'Residential';
    final areaSqft = prop['area_sqft']?.toString() ?? '1200';
    final pricePerNight = prop['price_per_night']?.toString() ?? '15555';
    final description = prop['description'] ?? 'No description available.';
    final fullAddress = prop['address'] ?? 'Address details not provided.';
    final amenities = prop['amenities'] as List? ?? ['Wifi', 'Ac', 'Parking', 'Kitchen', 'Pool', 'Gym', 'Washer', 'Fireplace', 'Tv', 'Heating'];
    final brokerName = broker['full_name'] ?? 'Vikram Joshi';
    final brokerId = broker['user_id'] ?? 'user_broker_joshua11';
    final propertyId = widget.reviewData['property_id'] ?? 'prop_6e885de7a0f1cde';
    final hostId = widget.reviewData['owner_id'] ?? 'user_1FBD7411C6';

    // Simple formatted visit date
    const visitDate = '16 June 2026';

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        automaticallyImplyLeading: false,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.isAdmin ? 'Property Audit & Compliance Verification' : 'Verification Report',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.charcoal),
            ),
            Text(
              '$propTitle | $propLoc',
              style: const TextStyle(fontSize: 11, color: AppTheme.charcoalMuted),
            ),
          ],
        ),
        actions: [
          // Export Report Button
          OutlinedButton.icon(
            onPressed: _exportReport,
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: Colors.grey.shade300),
              backgroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            ),
            icon: const Icon(Icons.download, size: 14, color: AppTheme.charcoalLight),
            label: const Text(
              'Export Report',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.charcoalLight),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.cancel_outlined, color: AppTheme.charcoalMuted),
            onPressed: () => Navigator.pop(context),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: _isActionLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // --- SECTION 1: METADATA CARDS ROW ---
                  Row(
                    children: [
                      Expanded(child: _buildMetaCard('PROPERTY DETAILS', 'ID: $propertyId', 'HOST: $hostId')),
                      const SizedBox(width: 8),
                      Expanded(child: _buildMetaCard('ASSIGNED BROKER', brokerName, 'ID: $brokerId')),
                      const SizedBox(width: 8),
                      Expanded(child: _buildMetaCard('VISIT DATE', visitDate, '')),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // --- SECTION 2: PROPERTY SPECIFICATIONS & LISTING INFO ---
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFECECEC)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'PROPERTY SPECIFICATIONS & LISTING INFO',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppTheme.charcoalMuted, letterSpacing: 0.5),
                        ),
                        const SizedBox(height: 12),

                        // Horizontally scrolling pictures
                        SizedBox(
                          height: 110,
                          child: ListView.builder(
                            scrollDirection: Axis.horizontal,
                            itemCount: (prop['images'] as List?)?.length ?? 3,
                            itemBuilder: (context, index) {
                              final imgPath = (prop['images'] as List?) != null && index < (prop['images'] as List).length
                                  ? prop['images'][index]
                                  : null;
                              return Container(
                                margin: const EdgeInsets.only(right: 8),
                                width: 140,
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(10),
                                  child: Image.network(
                                    _getImageUrl(imgPath),
                                    fit: BoxFit.cover,
                                    errorBuilder: (c, e, s) => Container(
                                      color: AppTheme.stone,
                                      child: const Icon(Icons.broken_image, color: AppTheme.charcoalMuted),
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Grid Specs
                        _buildSpecsGrid(bhkType, category, areaSqft, pricePerNight, propLoc),
                        
                        const SizedBox(height: 16),
                        const Divider(color: Color(0xFFF2F2F2)),
                        const SizedBox(height: 8),

                        // Description
                        const Text(
                          'DESCRIPTION',
                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppTheme.charcoalMuted),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          description,
                          style: const TextStyle(fontSize: 11, color: AppTheme.charcoal, height: 1.4),
                        ),

                        const SizedBox(height: 12),

                        // Address
                        const Text(
                          'FULL ADDRESS',
                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppTheme.charcoalMuted),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          fullAddress,
                          style: const TextStyle(fontSize: 11, color: AppTheme.charcoal, height: 1.4),
                        ),

                        const SizedBox(height: 16),

                        // Amenities
                        const Text(
                          'AMENITIES',
                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppTheme.charcoalMuted),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: amenities.map<Widget>((a) {
                            return Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: const Color(0xFFE5E5DF)),
                              ),
                              child: Text(
                                a.toString(),
                                style: const TextStyle(fontSize: 10, color: AppTheme.charcoalLight, fontWeight: FontWeight.w500),
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // --- SECTION 3: VERIFICATION CHECKLIST AUDIT ---
                  const Text(
                    'VERIFICATION CHECKLIST AUDIT',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppTheme.charcoal, letterSpacing: 0.3),
                  ),
                  const SizedBox(height: 12),

                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      childAspectRatio: 1.35,
                    ),
                    itemCount: _checklist.length,
                    itemBuilder: (context, index) {
                      final entry = _checklist.entries.elementAt(index);
                      final key = entry.key;
                      final bool isVerified = entry.value == true;
                      final formattedKey = key.replaceAll('_', ' ').toUpperCase();

                      return Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFECEECE)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    formattedKey,
                                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: isVerified ? const Color(0xFFE8F5E9) : const Color(0xFFFFEBEE),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        isVerified ? Icons.verified_user : Icons.cancel,
                                        color: isVerified ? Colors.green : Colors.red,
                                        size: 8,
                                      ),
                                      const SizedBox(width: 2),
                                      Text(
                                        isVerified ? 'VERIFIED' : 'PENDING',
                                        style: TextStyle(
                                          fontSize: 7,
                                          fontWeight: FontWeight.bold,
                                          color: isVerified ? Colors.green.shade800 : Colors.red.shade800,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            if (!isVerified && _checklistRejectionReasons[key] != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 2, bottom: 2),
                                child: Text(
                                  'Reason: ${_checklistRejectionReasons[key]}',
                                  style: const TextStyle(fontSize: 8, color: Colors.red, fontWeight: FontWeight.w500, fontStyle: FontStyle.italic),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            
                            // Audit Actions Row
                            Row(
                              children: [
                                Expanded(
                                  child: InkWell(
                                    onTap: () => _toggleChecklistItem(key, true),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(vertical: 4),
                                      decoration: BoxDecoration(
                                        color: isVerified ? const Color(0xFFE8F5E9) : const Color(0xFFF9F9F9),
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(color: isVerified ? Colors.green.shade200 : Colors.grey.shade200),
                                      ),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(Icons.check_circle_outline, size: 10, color: isVerified ? Colors.green.shade800 : Colors.grey),
                                          const SizedBox(width: 2),
                                          Text(
                                            'APPROVE',
                                            style: TextStyle(
                                              fontSize: 8,
                                              fontWeight: FontWeight.bold,
                                              color: isVerified ? Colors.green.shade800 : Colors.grey,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: InkWell(
                                    onTap: () => _toggleChecklistItem(key, false),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(vertical: 4),
                                      decoration: BoxDecoration(
                                        color: !isVerified ? const Color(0xFFFFEBEE) : const Color(0xFFF9F9F9),
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(color: !isVerified ? Colors.red.shade200 : Colors.grey.shade200),
                                      ),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(Icons.cancel_outlined, size: 10, color: !isVerified ? Colors.red.shade800 : Colors.grey),
                                          const SizedBox(width: 2),
                                          Text(
                                            'REJECT',
                                            style: TextStyle(
                                              fontSize: 8,
                                              fontWeight: FontWeight.bold,
                                              color: !isVerified ? Colors.red.shade800 : Colors.grey,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 20),

                  // --- SECTION 4: GEO-TAGGED EVIDENCE ---
                  Text(
                    'GEO-TAGGED EVIDENCE (${photos.length})',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppTheme.charcoal),
                  ),
                  const SizedBox(height: 12),

                  photos.isNotEmpty
                      ? GridView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            crossAxisSpacing: 10,
                            mainAxisSpacing: 10,
                            childAspectRatio: 1.1,
                          ),
                          itemCount: photos.length,
                          itemBuilder: (c, idx) {
                            final p = photos[idx];
                            return Container(
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFECECEC)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Expanded(
                                    child: ClipRRect(
                                      borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                                      child: Image.network(
                                        _getImageUrl(p['photo_url']),
                                        fit: BoxFit.cover,
                                        errorBuilder: (ctx, _, __) => Container(
                                          color: AppTheme.stone,
                                          child: const Icon(Icons.broken_image, color: AppTheme.charcoalMuted),
                                        ),
                                      ),
                                    ),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.all(6.0),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Lat: ${p['latitude']}',
                                          style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
                                        ),
                                        Text(
                                          'Lng: ${p['longitude']}',
                                          style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
                                        ),
                                      ],
                                    ),
                                  )
                                ],
                              ),
                            );
                          },
                        )
                      : Container(
                          padding: const EdgeInsets.all(30),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.stone),
                          ),
                          child: const Center(
                            child: Text(
                              'No evidence photos provided by broker.',
                              style: TextStyle(fontSize: 12, color: AppTheme.charcoalMuted),
                            ),
                          ),
                        ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
      // --- STICKY BOTTOM BUTTONS ---
      bottomNavigationBar: Container(
        padding: const EdgeInsets.only(left: 16, right: 16, top: 12, bottom: 20),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Colors.grey.shade200)),
        ),
        child: Row(
          children: [
            Expanded(
              child: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFFEBEE),
                foregroundColor: Colors.red.shade900,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.red.shade200, width: 1),
                ),
                padding: const EdgeInsets.symmetric(vertical: 16),
              ).buildButton(
                context,
                onPressed: () => _showFinalDecisionDialog(false),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.cancel_outlined, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      widget.isAdmin ? 'REJECT LISTING' : 'REJECT REPORT',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF4CAF50),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.symmetric(vertical: 16),
              ).buildButton(
                context,
                onPressed: () => _showFinalDecisionDialog(true),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.check_circle_outline, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      widget.isAdmin ? 'APPROVE & GO LIVE' : 'APPROVE REPORT',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetaCard(String title, String val1, String val2) {
    return Container(
      padding: const EdgeInsets.all(12),
      height: 72,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFECECEC)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: AppTheme.charcoalMuted),
          ),
          const SizedBox(height: 4),
          Text(
            val1,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          if (val2.isNotEmpty)
            Text(
              val2,
              style: const TextStyle(fontSize: 8, color: AppTheme.charcoalMuted),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
        ],
      ),
    );
  }

  Widget _buildSpecsGrid(String bhk, String category, String area, String price, String loc) {
    final Map<String, List<String>> specs = {
      'PROPERTY TYPE': ['Apartment', 'residential'],
      'CATEGORY': [category.toUpperCase(), 'residential'],
      'BHK / CONFIG': [bhk.toUpperCase(), '4bhk'],
      'AREA (SQFT)': ['$area sqft', '1200 sqft'],
      'PRICE / PRICING STYLE': ['₹$price / day', '₹15555 / day'],
      'LOCATION STATUS': [loc, 'Tungarli'],
    };

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 8,
        mainAxisSpacing: 12,
        childAspectRatio: 2.1,
      ),
      itemCount: specs.length,
      itemBuilder: (c, index) {
        final entry = specs.entries.elementAt(index);
        final isPrice = entry.key == 'PRICE / PRICING STYLE';

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              entry.key,
              style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: AppTheme.charcoalMuted),
            ),
            const SizedBox(height: 2),
            Text(
              entry.value[0],
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: isPrice ? Colors.red.shade700 : AppTheme.charcoal,
              ),
            ),
          ],
        );
      },
    );
  }
}

// Simple extension helper to build Custom Button Style
extension ButtonStyleHelper on ButtonStyle {
  Widget buildButton(BuildContext context, {required VoidCallback onPressed, required Widget child}) {
    return ElevatedButton(
      onPressed: onPressed,
      style: this,
      child: child,
    );
  }
}
