import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../models/property_model.dart';
import '../../providers/property_provider.dart';
import '../../theme.dart';
import 'host_calendar_screen.dart';
import 'host_list_property_screen.dart';

class HostMyPropertiesScreen extends StatefulWidget {
  const HostMyPropertiesScreen({super.key});

  @override
  State<HostMyPropertiesScreen> createState() => _HostMyPropertiesScreenState();
}

class _HostMyPropertiesScreenState extends State<HostMyPropertiesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<PropertyProvider>(context, listen: false).getHostProperties();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<PropertyProvider>(context);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('My Properties'),
        backgroundColor: AppTheme.white,
        elevation: 0.5,
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: provider.getHostProperties,
        child: provider.isLoading
            ? const Center(
                child: CircularProgressIndicator(color: AppTheme.primary))
            : provider.hostProperties.isEmpty
                ? ListView(
                    children: const [
                      SizedBox(height: 180),
                      Icon(Icons.home_work_outlined,
                          size: 64, color: AppTheme.charcoalMuted),
                      SizedBox(height: 16),
                      Center(child: Text('No properties listed yet.')),
                    ],
                  )
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                    itemCount: provider.hostProperties.length,
                    itemBuilder: (context, index) {
                      return _PropertyCard(
                          property: provider.hostProperties[index]);
                    },
                  ),
      ),
    );
  }
}

class _PropertyCard extends StatelessWidget {
  final PropertyModel property;

  const _PropertyCard({required this.property});

  String _formatDate(String? value) {
    if (value == null || value.isEmpty) return 'N/A';
    try {
      return DateFormat('MMM d, yyyy').format(DateTime.parse(value).toLocal());
    } catch (_) {
      return value.split('T').first;
    }
  }

  Color _statusColor(String? status) {
    switch ((status ?? '').toLowerCase()) {
      case 'active':
      case 'live':
      case 'approved':
        return Colors.green.shade700;
      case 'expired':
      case 'rejected':
      case 'cancelled':
        return Colors.red.shade700;
      default:
        return AppTheme.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final subStatus = (property.subscriptionStatus ?? 'trial').toUpperCase();
    final statusColor = _statusColor(property.subscriptionStatus);

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: AppTheme.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: property.images.isNotEmpty
                    ? Image.network(
                        property.images.first,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const _ImageFallback(),
                      )
                    : const _ImageFallback(),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Text(
                    property.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.manrope(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.charcoal),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color:
                        _statusColor(property.status).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    property.status.replaceAll('_', ' ').toUpperCase(),
                    style: TextStyle(
                        color: _statusColor(property.status),
                        fontSize: 9,
                        fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.location_on_outlined,
                    size: 14, color: AppTheme.charcoalMuted),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    '${property.city}, ${property.state}',
                    style: const TextStyle(
                        fontSize: 12, color: AppTheme.charcoalMuted),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.background,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                children: [
                  _SubscriptionRow(
                      label: 'Sub Plan',
                      value: property.subscriptionPlanName ?? 'Trial'),
                  _SubscriptionRow(
                      label: 'Purchase Date',
                      value: _formatDate(property.subscriptionPurchaseDate)),
                  _SubscriptionRow(
                      label: 'Renew Date',
                      value: _formatDate(property.subscriptionRenewalDate)),
                  Row(
                    children: [
                      const Expanded(
                          child: Text('Status',
                              style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.charcoalMuted))),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(subStatus,
                            style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: statusColor)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const HostCalendarScreen()));
                    },
                    icon: const Icon(Icons.calendar_month_outlined, size: 16),
                    label: const Text('Calendar'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) =>
                                  HostListPropertyScreen(property: property)));
                    },
                    icon: const Icon(Icons.edit_outlined,
                        size: 16, color: Colors.white),
                    label: const Text('Manage'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SubscriptionRow extends StatelessWidget {
  final String label;
  final String value;

  const _SubscriptionRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(label,
                style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.charcoalMuted)),
          ),
          Text(value,
              style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.charcoal)),
        ],
      ),
    );
  }
}

class _ImageFallback extends StatelessWidget {
  const _ImageFallback();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppTheme.stone,
      alignment: Alignment.center,
      child: const Icon(Icons.home_work_outlined,
          color: AppTheme.charcoalMuted, size: 42),
    );
  }
}
