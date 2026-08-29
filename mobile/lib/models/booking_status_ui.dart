import 'package:flutter/material.dart';

import '../theme.dart';

enum BookingLifecycleStatus {
  pendingPayment,
  paymentProcessing,
  awaitingHostApproval,
  confirmed,
  upcoming,
  checkedIn,
  completed,
  cancelled,
  refundInitiated,
  refunded,
  rejected,
  paymentFailed,
  unknown,
}

class BookingStatusUi {
  final BookingLifecycleStatus status;
  final String code;
  final String label;
  final String description;
  final Color color;
  final IconData icon;
  final bool isCancelledGroup;
  final bool isCompletedGroup;
  final bool isActionRequired;

  const BookingStatusUi({
    required this.status,
    required this.code,
    required this.label,
    required this.description,
    required this.color,
    required this.icon,
    this.isCancelledGroup = false,
    this.isCompletedGroup = false,
    this.isActionRequired = false,
  });
}

class BookingStatusMapper {
  static BookingStatusUi fromRaw({
    required String? bookingStatus,
    required String? paymentStatus,
    String? lifecycleStatus,
    String? checkInDate,
    String? checkOutDate,
  }) {
    final code = _normalize(lifecycleStatus, bookingStatus, paymentStatus);
    return _metadata[code] ?? _metadata['UNKNOWN']!;
  }

  static String _normalize(
    String? lifecycleStatus,
    String? bookingStatus,
    String? paymentStatus,
  ) {
    final lifecycle = (lifecycleStatus ?? '').trim().toUpperCase();
    if (_metadata.containsKey(lifecycle)) return lifecycle;

    final booking = (bookingStatus ?? '').trim().toLowerCase();
    final payment = (paymentStatus ?? '').trim().toLowerCase();

    if (payment == 'failed') return 'PAYMENT_FAILED';
    if (payment == 'refunded') return 'REFUNDED';
    if (payment == 'refund_pending' || payment == 'refund_initiated') {
      return 'REFUND_INITIATED';
    }
    if (booking == 'soft_lock' || booking == 'pending') {
      if (payment == 'processing' || payment == 'verifying') {
        return 'PAYMENT_PROCESSING';
      }
      return 'PENDING_PAYMENT';
    }
    if (booking == 'confirmed' || booking == 'paid') return 'CONFIRMED';
    if (booking == 'awaiting_host_approval') {
      return payment == 'paid' || payment == 'partially_paid'
          ? 'CONFIRMED'
          : 'PENDING_PAYMENT';
    }
    if (booking == 'completed') return 'COMPLETED';
    if (booking == 'cancelled' || booking == 'canceled') return 'CANCELLED';
    if (booking == 'rejected') return 'REJECTED';
    return 'UNKNOWN';
  }

  static const Map<String, BookingStatusUi> _metadata = {
    'PENDING_PAYMENT': BookingStatusUi(
      status: BookingLifecycleStatus.pendingPayment,
      code: 'PENDING_PAYMENT',
      label: 'Pending Payment',
      description: 'Complete your payment to continue with this booking.',
      color: AppTheme.primary,
      icon: Icons.account_balance_wallet_outlined,
      isActionRequired: true,
    ),
    'PAYMENT_PROCESSING': BookingStatusUi(
      status: BookingLifecycleStatus.paymentProcessing,
      code: 'PAYMENT_PROCESSING',
      label: 'Payment Processing',
      description:
          "We're securely verifying your payment. Please don't pay again yet.",
      color: AppTheme.secondary,
      icon: Icons.sync_outlined,
    ),
    'AWAITING_HOST_APPROVAL': BookingStatusUi(
      status: BookingLifecycleStatus.awaitingHostApproval,
      code: 'AWAITING_HOST_APPROVAL',
      label: 'Confirmed',
      description: 'Your booking is confirmed.',
      color: Colors.green,
      icon: Icons.verified_outlined,
    ),
    'CONFIRMED': BookingStatusUi(
      status: BookingLifecycleStatus.confirmed,
      code: 'CONFIRMED',
      label: 'Confirmed',
      description: 'Your booking is confirmed.',
      color: Colors.green,
      icon: Icons.verified_outlined,
    ),
    'UPCOMING': BookingStatusUi(
      status: BookingLifecycleStatus.upcoming,
      code: 'UPCOMING',
      label: 'Upcoming',
      description: 'Your booking is coming up.',
      color: Colors.green,
      icon: Icons.event_available_outlined,
    ),
    'CHECKED_IN': BookingStatusUi(
      status: BookingLifecycleStatus.checkedIn,
      code: 'CHECKED_IN',
      label: 'Checked-in',
      description: 'Your booking is currently active.',
      color: Colors.blue,
      icon: Icons.login_outlined,
    ),
    'COMPLETED': BookingStatusUi(
      status: BookingLifecycleStatus.completed,
      code: 'COMPLETED',
      label: 'Completed',
      description: 'This booking is completed.',
      color: Colors.green,
      icon: Icons.task_alt_outlined,
      isCompletedGroup: true,
    ),
    'CANCELLED': BookingStatusUi(
      status: BookingLifecycleStatus.cancelled,
      code: 'CANCELLED',
      label: 'Cancelled',
      description: 'This booking has been cancelled.',
      color: Colors.red,
      icon: Icons.cancel_outlined,
      isCancelledGroup: true,
    ),
    'REFUND_INITIATED': BookingStatusUi(
      status: BookingLifecycleStatus.refundInitiated,
      code: 'REFUND_INITIATED',
      label: 'Refund Initiated',
      description: 'Your refund has been initiated.',
      color: Colors.blue,
      icon: Icons.currency_rupee_outlined,
      isCancelledGroup: true,
    ),
    'REFUNDED': BookingStatusUi(
      status: BookingLifecycleStatus.refunded,
      code: 'REFUNDED',
      label: 'Refunded',
      description: 'Your refund has been completed.',
      color: Colors.green,
      icon: Icons.assignment_turned_in_outlined,
      isCancelledGroup: true,
    ),
    'REJECTED': BookingStatusUi(
      status: BookingLifecycleStatus.rejected,
      code: 'REJECTED',
      label: 'Rejected',
      description: 'The booking request was not accepted.',
      color: Colors.red,
      icon: Icons.block_outlined,
      isCancelledGroup: true,
    ),
    'PAYMENT_FAILED': BookingStatusUi(
      status: BookingLifecycleStatus.paymentFailed,
      code: 'PAYMENT_FAILED',
      label: 'Payment Failed',
      description:
          'Your payment could not be completed. Your booking details are still saved.',
      color: Colors.red,
      icon: Icons.error_outline,
      isCancelledGroup: true,
      isActionRequired: true,
    ),
    'UNKNOWN': BookingStatusUi(
      status: BookingLifecycleStatus.unknown,
      code: 'UNKNOWN',
      label: 'Booking Update in Progress',
      description: "We're updating the latest status of your booking.",
      color: AppTheme.charcoalMuted,
      icon: Icons.info_outline,
    ),
  };
}
