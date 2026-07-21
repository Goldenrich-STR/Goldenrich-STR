import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../providers/notification_provider.dart';
import '../../theme.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<NotificationProvider>(context, listen: false)
          .loadNotifications();
    });
  }

  String _formatDate(dynamic value) {
    if (value == null) return '';
    try {
      return DateFormat('d MMM, hh:mm a')
          .format(DateTime.parse(value.toString()).toLocal());
    } catch (_) {
      return value.toString();
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<NotificationProvider>(context);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Notifications'),
        backgroundColor: AppTheme.white,
        elevation: 0.5,
        actions: [
          TextButton(
            onPressed: provider.unreadCount == 0 ? null : provider.markAllRead,
            child: const Text('Mark all read'),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () => provider.loadNotifications(),
        child: provider.isLoading
            ? const Center(
                child: CircularProgressIndicator(color: AppTheme.primary))
            : provider.notifications.isEmpty
                ? ListView(
                    children: const [
                      SizedBox(height: 180),
                      Icon(Icons.notifications_none_rounded,
                          size: 64, color: AppTheme.charcoalMuted),
                      SizedBox(height: 16),
                      Center(child: Text('No notifications yet.')),
                    ],
                  )
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                    itemCount: provider.notifications.length,
                    itemBuilder: (context, index) {
                      final item = provider.notifications[index];
                      final isUnread = item['status'] != 'read';
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(
                              color: isUnread
                                  ? AppTheme.primary
                                  : AppTheme.border),
                        ),
                        child: ListTile(
                          contentPadding: const EdgeInsets.all(14),
                          leading: CircleAvatar(
                            backgroundColor:
                                isUnread ? AppTheme.primary : AppTheme.stone,
                            child: Icon(
                              isUnread
                                  ? Icons.notifications_active_outlined
                                  : Icons.notifications_none_rounded,
                              color: isUnread
                                  ? Colors.white
                                  : AppTheme.charcoalMuted,
                            ),
                          ),
                          title: Text(
                            item['title'] ?? 'Notification',
                            style: GoogleFonts.manrope(
                                fontWeight: FontWeight.w800),
                          ),
                          subtitle: Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Text(
                                '${item['message'] ?? ''}\n${_formatDate(item['created_at'])}'),
                          ),
                          isThreeLine: true,
                          trailing: isUnread
                              ? IconButton(
                                  icon: const Icon(Icons.done_rounded),
                                  onPressed: () => provider
                                      .markRead(item['notification_id']),
                                )
                              : null,
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
