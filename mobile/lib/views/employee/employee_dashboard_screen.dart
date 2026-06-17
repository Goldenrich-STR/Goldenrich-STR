import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/verification_provider.dart';
import '../../theme.dart';
import '../../services/api_service.dart';
import 'verification_report_screen.dart';

class EmployeeDashboardScreen extends StatefulWidget {
  const EmployeeDashboardScreen({super.key});

  @override
  State<EmployeeDashboardScreen> createState() => _EmployeeDashboardScreenState();
}

class _EmployeeDashboardScreenState extends State<EmployeeDashboardScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _remarksController = TextEditingController();
  final _reasonController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  
  // Report state
  String _selectedReportType = 'Properties Not Booked';
  bool _hasGeneratedReport = false;
  String _activeReviewSubTab = 'pending';

  final ApiService _apiService = ApiService();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadAllData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _remarksController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _loadAllData() async {
    final prov = Provider.of<VerificationProvider>(context, listen: false);
    await Future.wait([
      prov.getRMStats(),
      prov.getPendingReviews(),
      prov.getReviewHistory(),
      prov.getBrokers(),
    ]);
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

  void _showActionDialog(String verificationId, bool approve) {
    _remarksController.clear();
    _reasonController.clear();
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            top: 24,
            left: 24,
            right: 24,
          ),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      approve ? 'Approve Verification' : 'Reject Verification',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.charcoal),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  approve 
                      ? 'This will approve the broker\'s report and send it to the administrator for final approval.' 
                      : 'Provide a reason for rejecting the report. The host will be notified to revise details.',
                  style: const TextStyle(fontSize: 12, color: AppTheme.charcoalLight),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: approve ? _remarksController : _reasonController,
                  decoration: InputDecoration(
                    labelText: approve ? 'Approval Remarks' : 'Reason for Rejection',
                    hintText: approve ? 'Enter approval comments...' : 'Provide feedback on what needs correction...',
                    filled: true,
                    fillColor: const Color(0xFFF9F9F9),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                  ),
                  maxLines: 3,
                  validator: (v) => v == null || v.trim().isEmpty ? 'Please enter some remarks/reasons' : null,
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () async {
                    if (!_formKey.currentState!.validate()) return;
                    final prov = Provider.of<VerificationProvider>(context, listen: false);
                    final success = approve
                        ? await prov.employeeApprove(verificationId, _remarksController.text.trim())
                        : await prov.employeeReject(verificationId, _reasonController.text.trim());
                            
                    if (success && context.mounted) {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(approve ? 'Verification approved and sent to Admin!' : 'Verification rejected successfully.'),
                          backgroundColor: approve ? Colors.green.shade700 : AppTheme.primary,
                        ),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: approve ? const Color(0xFF4CAF50) : AppTheme.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: Text(
                    approve ? 'Confirm Approval' : 'Confirm Rejection',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showDetailsSheet(Map<String, dynamic> review) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => VerificationReportScreen(reviewData: review),
      ),
    );
  }

  // --- TAB VIEWS ---
  
  // Overview Tab View
  Widget _buildOverviewTab(VerificationProvider prov) {
    final stats = prov.rmStats;
    final totalBrokers = stats['brokers']?['total']?.toString() ?? '0';
    final pendingCount = stats['verifications']?['pending_review']?.toString() ?? '0';
    final underReview = stats['verifications']?['under_review']?.toString() ?? '0';
    final expiringSoon = stats['subscriptions']?['expiring_soon']?.toString() ?? '0';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Stat Cards Grid
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.4,
            children: [
              _buildStatCard('Total Brokers', totalBrokers, Icons.people_outline, const Color(0xFFFAF6F2), const Color(0xFFC05C4F)),
              _buildStatCard('Pending Reviews', pendingCount, Icons.assignment_turned_in_outlined, const Color(0xFFF2F6F5), const Color(0xFF788574)),
              _buildStatCard('Under Review', underReview, Icons.error_outline, const Color(0xFFFDF8F2), const Color(0xFFE28A3E)),
              _buildStatCard('Expiring Subs', expiringSoon, Icons.hourglass_empty_outlined, const Color(0xFFF9FAF2), const Color(0xFFB5BD4D)),
            ],
          ),
          
          const SizedBox(height: 20),

          // Alert banner card
          if (prov.pendingReviews.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF9F3),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFF5E4D4)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, color: Color(0xFFC05C4F), size: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${prov.pendingReviews.length} Verifications Pending Your Review',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.charcoal),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Review broker-submitted verification reports',
                          style: TextStyle(fontSize: 11, color: AppTheme.charcoalLight),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: () => _tabController.animateTo(1),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFC05C4F),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('Review Now', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
            
          const SizedBox(height: 24),

          // Quick Actions
          const Text(
            'Quick Actions',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.charcoal),
          ),
          const SizedBox(height: 12),
          
          _buildQuickActionRow('Review Verifications', Icons.rate_review_outlined, () => _tabController.animateTo(1)),
          const SizedBox(height: 8),
          _buildQuickActionRow('View Brokers', Icons.people_outline, () => _tabController.animateTo(2)),
          const SizedBox(height: 8),
          _buildQuickActionRow('Generate Reports', Icons.analytics_outlined, () => _tabController.animateTo(3)),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String count, IconData icon, Color bgColor, Color iconColor) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.stone),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                count,
                style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: AppTheme.charcoal),
              ),
              Icon(icon, color: iconColor, size: 24),
            ],
          ),
          Text(
            title,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.charcoalLight),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionRow(String label, IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.stone),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppTheme.primary, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.charcoal),
              ),
            ),
            const Icon(Icons.arrow_forward_ios, size: 12, color: AppTheme.charcoalMuted),
          ],
        ),
      ),
    );
  }

  // Pending / History Reviews Tab View
  Widget _buildPendingTab(VerificationProvider prov) {
    return Column(
      children: [
        // Custom Segmented Toggle Control
        Padding(
          padding: const EdgeInsets.only(top: 20, left: 20, right: 20, bottom: 10),
          child: Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _activeReviewSubTab = 'pending'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: _activeReviewSubTab == 'pending' ? AppTheme.primary : Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: _activeReviewSubTab == 'pending' ? AppTheme.primary : AppTheme.stone),
                      boxShadow: _activeReviewSubTab == 'pending'
                          ? [BoxShadow(color: AppTheme.primary.withOpacity(0.15), blurRadius: 8, offset: const Offset(0, 4))]
                          : null,
                    ),
                    child: Center(
                      child: Text(
                        'Awaiting Action (${prov.pendingReviews.length})',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                          color: _activeReviewSubTab == 'pending' ? Colors.white : AppTheme.charcoalLight,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _activeReviewSubTab = 'history'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: _activeReviewSubTab == 'history' ? AppTheme.primary : Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: _activeReviewSubTab == 'history' ? AppTheme.primary : AppTheme.stone),
                      boxShadow: _activeReviewSubTab == 'history'
                          ? [BoxShadow(color: AppTheme.primary.withOpacity(0.15), blurRadius: 8, offset: const Offset(0, 4))]
                          : null,
                    ),
                    child: Center(
                      child: Text(
                        'Review History (${prov.reviewHistory.length})',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                          color: _activeReviewSubTab == 'history' ? Colors.white : AppTheme.charcoalLight,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        // List View based on active selection
        Expanded(
          child: _activeReviewSubTab == 'pending'
              ? _buildPendingReviewsList(prov)
              : _buildReviewHistoryList(prov),
        ),
      ],
    );
  }

  Widget _buildPendingReviewsList(VerificationProvider prov) {
    if (prov.pendingReviews.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.assignment_turned_in_outlined, size: 48, color: AppTheme.charcoalMuted),
            SizedBox(height: 12),
            Text('No pending property reviews.', style: TextStyle(color: AppTheme.charcoalMuted, fontWeight: FontWeight.bold)),
          ],
        ),
      );
    }

    return ListView.builder(
      itemCount: prov.pendingReviews.length,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      itemBuilder: (context, index) {
        final review = prov.pendingReviews[index];
        final prop = review['property_details'] ?? {};
        final broker = review['broker_details'] ?? {};
        final checklist = review['checklist'] ?? {};
        final String verificationId = review['verification_id'];
        final String propTitle = prop['title'] ?? 'Luxury Stay';
        final String propLoc = '${prop['city'] ?? 'N/A'} | ${prop['bhk_type'] ?? 'N/A'}';
        final String brokerName = broker['full_name'] ?? 'N/A';
        final int photoCount = (review['geo_tagged_photos'] as List?)?.length ?? 0;

        return Card(
          margin: const EdgeInsets.only(bottom: 16),
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: AppTheme.stone),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Upper section: Image & details
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.network(
                        _getImageUrl((prop['images'] as List?)?.firstOrNull),
                        width: 70,
                        height: 70,
                        fit: BoxFit.cover,
                        errorBuilder: (c, _, __) => Container(
                          width: 70,
                          height: 70,
                          color: AppTheme.stone,
                          child: const Icon(Icons.broken_image, size: 20, color: AppTheme.charcoalMuted),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            propTitle,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.charcoal),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            propLoc,
                            style: const TextStyle(fontSize: 11, color: AppTheme.charcoalLight),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Broker: $brokerName (${broker['lg_code'] ?? ''})',
                            style: const TextStyle(fontSize: 10, color: AppTheme.charcoalMuted, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                
                const SizedBox(height: 12),
                const Divider(color: Color(0xFFF2F2F2)),
                const SizedBox(height: 8),

                // Checklist Items Indicators (Grid-like icons)
                Wrap(
                  spacing: 12,
                  runSpacing: 6,
                  children: checklist.entries.map<Widget>((entry) {
                    final keyName = entry.key.replaceAll('_', ' ').toUpperCase();
                    final val = entry.value == true;
                    return Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          val ? Icons.check : Icons.close,
                          color: val ? Colors.green : Colors.red,
                          size: 11,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          keyName,
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: val ? AppTheme.charcoalLight : AppTheme.charcoalMuted,
                          ),
                        ),
                      ],
                    );
                  }).toList(),
                ),

                const SizedBox(height: 12),
                
                // Photo count & Actions Row
                Row(
                  children: [
                    const Icon(Icons.camera_alt_outlined, size: 14, color: AppTheme.charcoalLight),
                    const SizedBox(width: 4),
                    Text(
                      '$photoCount geo-tagged photo${photoCount == 1 ? '' : 's'}',
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.charcoalLight),
                    ),
                  ],
                ),
                
                const SizedBox(height: 16),
                
                // Button Bar
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _showDetailsSheet(review),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFFE0E0DF)),
                          foregroundColor: AppTheme.charcoal,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text('View Details', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => _showActionDialog(verificationId, true),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFE8F5E9),
                          foregroundColor: Colors.green.shade800,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text('Approve', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => _showActionDialog(verificationId, false),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFFEBEE),
                          foregroundColor: Colors.red.shade800,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text('Reject', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildReviewHistoryList(VerificationProvider prov) {
    if (prov.reviewHistory.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history_outlined, size: 48, color: AppTheme.charcoalMuted),
            SizedBox(height: 12),
            Text('No reviewed verifications found.', style: TextStyle(color: AppTheme.charcoalMuted, fontWeight: FontWeight.bold)),
          ],
        ),
      );
    }

    return ListView.builder(
      itemCount: prov.reviewHistory.length,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      itemBuilder: (context, index) {
        final review = prov.reviewHistory[index];
        final prop = review['property_details'] ?? {};
        final broker = review['broker_details'] ?? {};
        final String propTitle = prop['title'] ?? 'Luxury Stay';
        final String propLoc = '${prop['city'] ?? 'N/A'} | ${prop['bhk_type'] ?? 'N/A'}';
        final String brokerName = broker['full_name'] ?? 'N/A';
        final String status = review['status'] ?? 'pending';
        final bool rmApproved = review['rm_approved'] == true;
        
        Color badgeBgColor;
        Color badgeTextColor;
        String badgeText;

        if (status == 'approved') {
          badgeBgColor = const Color(0xFFE8F5E9);
          badgeTextColor = Colors.green.shade800;
          badgeText = 'APPROVED BY ADMIN';
        } else if (status == 'rejected') {
          badgeBgColor = const Color(0xFFFFEBEE);
          badgeTextColor = Colors.red.shade800;
          badgeText = 'REJECTED';
        } else if (rmApproved) {
          badgeBgColor = const Color(0xFFE3F2FD);
          badgeTextColor = Colors.blue.shade800;
          badgeText = 'AWAITING ADMIN';
        } else {
          badgeBgColor = const Color(0xFFFFF3E0);
          badgeTextColor = Colors.orange.shade800;
          badgeText = 'PENDING RM';
        }

        return Card(
          margin: const EdgeInsets.only(bottom: 16),
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: AppTheme.stone),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Badge indicating status
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: badgeBgColor,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        badgeText,
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                          color: badgeTextColor,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // Upper section: Image & details
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.network(
                        _getImageUrl((prop['images'] as List?)?.firstOrNull),
                        width: 70,
                        height: 70,
                        fit: BoxFit.cover,
                        errorBuilder: (c, _, __) => Container(
                          width: 70,
                          height: 70,
                          color: AppTheme.stone,
                          child: const Icon(Icons.broken_image, size: 20, color: AppTheme.charcoalMuted),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            propTitle,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.charcoal),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            propLoc,
                            style: const TextStyle(fontSize: 11, color: AppTheme.charcoalLight),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Broker: $brokerName (${broker['lg_code'] ?? ''})',
                            style: const TextStyle(fontSize: 10, color: AppTheme.charcoalMuted, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                
                if (review['rm_remarks'] != null && (review['rm_remarks'] as String).isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    'RM Remarks: "${review['rm_remarks']}"',
                    style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppTheme.charcoalLight),
                  ),
                ],
                if (review['admin_remarks'] != null && (review['admin_remarks'] as String).isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    'Admin Remarks: "${review['admin_remarks']}"',
                    style: TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: Colors.red.shade800, fontWeight: FontWeight.bold),
                  ),
                ],

                const SizedBox(height: 16),
                
                // Button Bar
                OutlinedButton(
                  onPressed: () => _showDetailsSheet(review),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFFE0E0DF)),
                    foregroundColor: AppTheme.charcoal,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('View Details', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // My Brokers Tab View
  Widget _buildBrokersTab(VerificationProvider prov) {
    if (prov.brokers.isEmpty) {
      return const Center(
        child: Text('No brokers assigned.', style: TextStyle(color: AppTheme.charcoalMuted)),
      );
    }

    return ListView.builder(
      itemCount: prov.brokers.length,
      padding: const EdgeInsets.all(20),
      itemBuilder: (context, index) {
        final b = prov.brokers[index];
        final name = b['full_name'] ?? 'N/A';
        final phone = b['phone'] ?? 'N/A';
        final lgCode = b['lg_code'] ?? 'N/A';
        final stats = b['stats'] ?? {};
        final ownersCount = stats['owners']?.toString() ?? '0';
        final propertiesCount = stats['properties']?.toString() ?? '0';
        final pendingCount = stats['pending_verifications']?.toString() ?? '0';

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: AppTheme.stone),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: AppTheme.stone,
                      radius: 20,
                      child: Text(
                        name.isNotEmpty ? name[0].toUpperCase() : 'B',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.charcoal),
                          ),
                          Text(
                            'LG Code: $lgCode  |  Phone: $phone',
                            style: const TextStyle(fontSize: 10, color: AppTheme.charcoalMuted),
                          ),
                        ],
                      ),
                    )
                  ],
                ),
                
                const SizedBox(height: 16),
                
                // Stats row
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFAF9F5),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          children: [
                            Text(ownersCount, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.charcoal)),
                            const Text('Owners', style: TextStyle(fontSize: 9, color: AppTheme.charcoalMuted)),
                          ],
                        ),
                      ),
                      Container(height: 24, width: 1, color: Colors.grey.shade300),
                      Expanded(
                        child: Column(
                          children: [
                            Text(propertiesCount, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.charcoal)),
                            const Text('Properties', style: TextStyle(fontSize: 9, color: AppTheme.charcoalMuted)),
                          ],
                        ),
                      ),
                      Container(height: 24, width: 1, color: Colors.grey.shade300),
                      Expanded(
                        child: Column(
                          children: [
                            Text(pendingCount, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.primary)),
                            const Text('Pending', style: TextStyle(fontSize: 9, color: AppTheme.charcoalMuted)),
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
      },
    );
  }

  // Reports Tab View
  Widget _buildReportsTab(VerificationProvider prov) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Select Report',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.charcoal),
          ),
          const SizedBox(height: 8),
          
          DropdownButtonFormField<String>(
            value: _selectedReportType,
            style: const TextStyle(fontSize: 13, color: AppTheme.charcoal),
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppTheme.stone),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
            items: <String>['Properties Not Booked', 'Broker Performance', 'Verification SLA']
                .map<DropdownMenuItem<String>>((String value) {
              return DropdownMenuItem<String>(
                value: value,
                child: Text(value),
              );
            }).toList(),
            onChanged: (String? newValue) {
              if (newValue != null) {
                setState(() {
                  _selectedReportType = newValue;
                  _hasGeneratedReport = false;
                });
              }
            },
          ),
          
          const SizedBox(height: 16),
          
          ElevatedButton(
            onPressed: () async {
              if (_selectedReportType == 'Properties Not Booked') {
                await prov.getPropertiesNotBookedReport();
              }
              setState(() {
                _hasGeneratedReport = true;
              });
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFC05C4F),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            child: const Text('Generate Report', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          
          const SizedBox(height: 24),
          
          if (_hasGeneratedReport) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Report Results',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.charcoal),
                ),
                if (_selectedReportType == 'Properties Not Booked' && prov.propertiesNotBooked.isNotEmpty)
                  TextButton.icon(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('CSV download initiated!')),
                      );
                    },
                    icon: const Icon(Icons.download_outlined, size: 16, color: AppTheme.primary),
                    label: const Text('Export CSV', style: TextStyle(fontSize: 11, color: AppTheme.primary, fontWeight: FontWeight.bold)),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            
            if (_selectedReportType == 'Properties Not Booked')
              prov.propertiesNotBooked.isEmpty
                  ? Container(
                      padding: const EdgeInsets.all(30),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.stone),
                      ),
                      child: const Center(
                        child: Text(
                          'No properties found without bookings.',
                          style: TextStyle(fontSize: 12, color: AppTheme.charcoalMuted),
                        ),
                      ),
                    )
                  : ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: prov.propertiesNotBooked.length,
                      itemBuilder: (c, idx) {
                        final prop = prov.propertiesNotBooked[idx];
                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.stone),
                          ),
                          child: Row(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.network(
                                  _getImageUrl((prop['images'] as List?)?.firstOrNull),
                                  width: 50,
                                  height: 50,
                                  fit: BoxFit.cover,
                                  errorBuilder: (c, _, __) => Container(
                                    width: 50,
                                    height: 50,
                                    color: AppTheme.stone,
                                    child: const Icon(Icons.broken_image, size: 16, color: AppTheme.charcoalMuted),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      prop['title'] ?? 'Property',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppTheme.charcoal),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    Text(
                                      '${prop['city'] ?? 'N/A'}  |  ${prop['bhk_type'] ?? 'N/A'}  |  ₹${prop['price_per_night'] ?? '0'}/night',
                                      style: const TextStyle(fontSize: 9, color: AppTheme.charcoalLight),
                                    ),
                                    Text(
                                      'Broker: ${prop['broker_name'] ?? 'N/A'}',
                                      style: const TextStyle(fontSize: 8, color: AppTheme.charcoalMuted, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            if (_selectedReportType != 'Properties Not Booked')
              Container(
                padding: const EdgeInsets.all(30),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.stone),
                ),
                child: const Center(
                  child: Text(
                    'No data available for this report type.',
                    style: TextStyle(fontSize: 12, color: AppTheme.charcoalMuted),
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final prov = Provider.of<VerificationProvider>(context);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(85),
          child: Column(
            children: [
              // Styled Brand Bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Goldenrich STR',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.charcoal,
                            letterSpacing: -0.5,
                          ),
                        ),
                        Text(
                          'EMPLOYEE (RM) PORTAL',
                          style: TextStyle(
                            fontSize: 8,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey.shade500,
                            letterSpacing: 1.0,
                          ),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        Text(
                          'RM: Sneha',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey.shade600),
                        ),
                        const SizedBox(width: 12),
                        IconButton(
                          icon: const Icon(Icons.logout, size: 16, color: AppTheme.charcoalMuted),
                          onPressed: () {
                            // Logout action (mock or back)
                            Navigator.pop(context);
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              
              // Custom styled tab header
              TabBar(
                controller: _tabController,
                indicatorColor: AppTheme.primary,
                labelColor: AppTheme.primary,
                unselectedLabelColor: AppTheme.charcoalLight,
                labelStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                tabs: const [
                  Tab(icon: Icon(Icons.dashboard_outlined, size: 18), text: 'Overview'),
                  Tab(icon: Icon(Icons.rate_review_outlined, size: 18), text: 'Reviews'),
                  Tab(icon: Icon(Icons.people_outline, size: 18), text: 'Brokers'),
                  Tab(icon: Icon(Icons.analytics_outlined, size: 18), text: 'Reports'),
                ],
              ),
            ],
          ),
        ),
      ),
      body: prov.isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : TabBarView(
              controller: _tabController,
              children: [
                _buildOverviewTab(prov),
                _buildPendingTab(prov),
                _buildBrokersTab(prov),
                _buildReportsTab(prov),
              ],
            ),
    );
  }
}
