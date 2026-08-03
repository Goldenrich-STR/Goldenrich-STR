import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import {
  AlertTriangle,
  Bell,
  CalendarCheck2,
  Check,
  CheckCheck,
  CircleX,
  ClipboardCheck,
  Clock3,
  Eye,
  IndianRupee,
  Scale,
  Send,
  ShieldCheck,
  ShieldX,
  Target,
  Users,
  Wallet,
  X,
} from 'lucide-react';

export const getNotificationIcon = (type) => {
  const icons = {
    booking_confirmed: CalendarCheck2,
    booking_cancelled: CircleX,
    property_approved: ShieldCheck,
    property_rejected: ShieldX,
    kyc_approved: ShieldCheck,
    kyc_rejected: ShieldX,
    subscription_expiring: AlertTriangle,
    subscription_expired: Clock3,
    verification_assigned: ClipboardCheck,
    verification_submitted: Send,
    verification_reviewed: Eye,
    payout_processed: IndianRupee,
    new_lead: Target,
    owner_assigned: Users,
    dispute_raised: Scale,
    refund_received: Wallet,
  };

  return icons[type] || Bell;
};

const getNotificationAccent = (type) => {
  const accentMap = {
    booking_confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    booking_cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
    property_approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    property_rejected: 'bg-rose-50 text-rose-700 border-rose-200',
    kyc_approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    kyc_rejected: 'bg-rose-50 text-rose-700 border-rose-200',
    subscription_expiring: 'bg-amber-50 text-amber-700 border-amber-200',
    subscription_expired: 'bg-slate-100 text-slate-700 border-slate-200',
    verification_assigned: 'bg-violet-50 text-violet-700 border-violet-200',
    verification_submitted: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    verification_reviewed: 'bg-sky-50 text-sky-700 border-sky-200',
    payout_processed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    new_lead: 'bg-blue-50 text-blue-700 border-blue-200',
    owner_assigned: 'bg-slate-100 text-slate-700 border-slate-200',
    dispute_raised: 'bg-orange-50 text-orange-700 border-orange-200',
    refund_received: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  };

  return accentMap[type] || 'bg-slate-100 text-slate-700 border-slate-200';
};

const NotificationIconBadge = ({ type, className = 'h-12 w-12 rounded-2xl' }) => {
  const Icon = getNotificationIcon(type);

  return (
    <div className={`flex items-center justify-center border ${getNotificationAccent(type)} ${className}`}>
      <Icon className="h-5 w-5" />
    </div>
  );
};

const NotificationCenter = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/notifications/my-notifications');
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await apiClient.post(`/notifications/${notificationId}/mark-read`);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.post('/notifications/mark-all-read');
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4" data-testid="notification-center">
      <div className="absolute inset-0 bg-white/35 backdrop-blur-[1.5px]" onClick={onClose}></div>

      <div className="relative flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
              <Bell className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-950">Notifications</h3>
              <p className="text-xs text-slate-500">Bookings, approvals and account updates</p>
            </div>
            {unreadCount > 0 && (
              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                data-testid="mark-all-read"
              >
                <CheckCheck className="h-4 w-4" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-full p-2 transition hover:bg-slate-100"
              data-testid="close-notifications"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4">
          {loading ? (
            <div className="py-8 text-center">
              <p className="text-slate-500">Loading notifications...</p>
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification.notification_id}
                className={`cursor-pointer rounded-3xl border p-4 transition ${
                  notification.status === 'read'
                    ? 'border-slate-200 bg-white'
                    : 'border-slate-300 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)]'
                }`}
                onClick={() => {
                  if (notification.status !== 'read') {
                    markAsRead(notification.notification_id);
                  }
                }}
                data-testid={`notification-${notification.notification_id}`}
              >
                <div className="flex items-start gap-3">
                  <NotificationIconBadge type={notification.type} />

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <h4 className="truncate text-sm font-semibold text-slate-900">
                        {notification.title}
                      </h4>
                      {notification.status !== 'read' && (
                        <span className="ml-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-slate-900"></span>
                      )}
                    </div>

                    <p className="mb-3 text-sm leading-6 text-slate-600">{notification.message}</p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400">
                        {getRelativeTime(notification.created_at)}
                      </span>

                      {notification.status !== 'read' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.notification_id);
                          }}
                          className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          <Check className="h-3 w-3" />
                          <span>Mark read</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-slate-200 bg-white">
                <Bell className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-slate-600">No notifications yet</p>
              <p className="mt-2 text-sm text-slate-400">
                We&apos;ll notify you about bookings, approvals, and updates
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const NotificationBell = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToast, setActiveToast] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const prevCountRef = useRef(-1);
  const playedSoundIdsRef = useRef(new Set());

  const playNotificationSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);
        osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
        gain1.gain.setValueAtTime(0.15, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.45);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.5, now + 0.12);
        gain2.gain.setValueAtTime(0.1, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.55);
      }
    } catch (e) {
      console.warn('AudioContext playback blocked or not supported:', e);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await apiClient.get('/notifications/unread-count');
      const count = response.data.unread_count || 0;
      setUnreadCount(count);

      if (prevCountRef.current !== -1 && count > prevCountRef.current) {
        playNotificationSound();
        try {
          const res = await apiClient.get('/notifications/my-notifications');
          const list = res.data.notifications || [];
          const unreadNotifs = list.filter((n) => n.status !== 'read');
          if (unreadNotifs.length > 0) {
            const latestNotif = unreadNotifs[0];
            setActiveToast({
              title: latestNotif.title,
              message: latestNotif.message,
              type: latestNotif.type,
            });
            setTimeout(() => {
              setActiveToast(null);
            }, 6000);
          }
        } catch (err) {
          console.error('Error fetching newest notification for toast:', err);
        }
      }
      prevCountRef.current = count;

      if (user?.role === 'admin' && count > 0) {
        const res = await apiClient.get('/notifications/my-notifications');
        const list = res.data.notifications || [];
        const unreadSubmitted = list.filter((n) => n.status !== 'read' && n.type === 'verification_submitted');

        let playedNew = false;
        unreadSubmitted.forEach((n) => {
          if (!playedSoundIdsRef.current.has(n.notification_id)) {
            playedSoundIdsRef.current.add(n.notification_id);
            playedNew = true;
          }
        });

        if (playedNew) {
          playNotificationSound();
        }
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [playNotificationSound, user?.role]);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 60000);
      return () => clearInterval(interval);
    }
  }, [user, fetchUnreadCount]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative rounded-full p-2 transition hover:bg-gray-50"
        data-testid="notification-bell"
      >
        <Bell className="h-5 w-5 text-charcoal-light" />
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {activeToast && (
        <>
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
          <div
            className="fixed bottom-5 right-5 z-[9999] flex w-full max-w-sm items-start space-x-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_24px_48px_rgba(15,23,42,0.16)]"
            style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <NotificationIconBadge type={activeToast.type} className="h-11 w-11 rounded-2xl" />
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-charcoal">{activeToast.title}</h4>
              <p className="mt-1 text-xs leading-relaxed text-charcoal-light">{activeToast.message}</p>
            </div>
            <button
              onClick={() => setActiveToast(null)}
              className="flex-shrink-0 rounded-full p-1 transition-colors hover:bg-slate-100"
            >
              <X className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        </>
      )}

      <NotificationCenter
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          fetchUnreadCount();
        }}
      />
    </>
  );
};

export default NotificationCenter;
