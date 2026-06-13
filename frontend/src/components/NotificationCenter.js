import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import { Bell, Check, CheckCheck, X } from 'lucide-react';

export const getNotificationIcon = (type) => {
  const icons = {
    booking_confirmed: '🎉',
    booking_cancelled: '❌',
    property_approved: '✅',
    property_rejected: '⛔',
    kyc_approved: '✓',
    kyc_rejected: '✗',
    subscription_expiring: '⚠️',
    subscription_expired: '⏰',
    verification_assigned: '📋',
    verification_submitted: '📤',
    verification_reviewed: '👁️',
    payout_processed: '💰',
    new_lead: '🎯',
    owner_assigned: '👥',
    dispute_raised: '⚖️',
    refund_received: '💸',
  };
  return icons[type] || '🔔';
};

const NotificationCenter = ({ isOpen, onClose }) => {
  const { user } = useAuth();
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-charcoal/20 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Notification Panel */}
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-terracotta" />
            <h3 className="text-lg font-bold text-charcoal">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-1 text-xs font-bold bg-terracotta text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-sage hover:text-sage-dark font-semibold flex items-center space-x-1"
                data-testid="mark-all-read"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-sand-50 rounded-full transition"
              data-testid="close-notifications"
            >
              <X className="w-5 h-5 text-charcoal-light" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-charcoal-light">Loading notifications...</p>
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification.notification_id}
                className={`p-4 rounded-lg transition cursor-pointer ${
                  notification.status === 'read'
                    ? 'bg-sand-50'
                    : 'bg-terracotta/5 border-l-4 border-terracotta'
                }`}
                onClick={() => {
                  if (notification.status !== 'read') {
                    markAsRead(notification.notification_id);
                  }
                }}
                data-testid={`notification-${notification.notification_id}`}
              >
                <div className="flex items-start space-x-3">
                  <span className="text-2xl flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-charcoal text-sm truncate">
                        {notification.title}
                      </h4>
                      {notification.status !== 'read' && (
                        <span className="w-2 h-2 bg-terracotta rounded-full flex-shrink-0 ml-2"></span>
                      )}
                    </div>
                    <p className="text-sm text-charcoal-light mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-charcoal-muted">
                        {getRelativeTime(notification.created_at)}
                      </span>
                      {notification.status !== 'read' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.notification_id);
                          }}
                          className="text-xs text-sage hover:text-sage-dark font-semibold flex items-center space-x-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Mark read</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-charcoal-light mx-auto mb-4 opacity-20" />
              <p className="text-charcoal-light">No notifications yet</p>
              <p className="text-sm text-charcoal-muted mt-2">
                We'll notify you about bookings, approvals, and updates
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Notification Bell Icon Component (for header)
export const NotificationBell = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToast, setActiveToast] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const prevCountRef = useRef(-1);
  const playedSoundIdsRef = useRef(new Set());

  const playNotificationSound = useCallback(() => {
    try {
      // Create oscillator synthesis as robust local fallback
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const now = ctx.currentTime;
        
        // Osc 1: high chime
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now); // A5
        osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
        gain1.gain.setValueAtTime(0.15, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.45);
        
        // Osc 2: quick secondary beep for chime beauty
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.50, now + 0.12); // C6
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
    
    // Also try to play Mixkit audio chime
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch (err) {
      // silently absorb network/cors block
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await apiClient.get('/notifications/unread-count');
      const count = response.data.unread_count || 0;
      setUnreadCount(count);

      // Play sound and trigger popup if there are new unread notifications
      if (prevCountRef.current !== -1 && count > prevCountRef.current) {
        playNotificationSound();
        try {
          const res = await apiClient.get('/notifications/my-notifications');
          const list = res.data.notifications || [];
          const unreadNotifs = list.filter(n => n.status !== 'read');
          if (unreadNotifs.length > 0) {
            const latestNotif = unreadNotifs[0];
            setActiveToast({
              title: latestNotif.title,
              message: latestNotif.message,
              type: latestNotif.type
            });
            setTimeout(() => {
              setActiveToast(null);
            }, 6000);
          }
        } catch (err) {
          console.error("Error fetching newest notification for toast:", err);
        }
      }
      prevCountRef.current = count;

      // If admin, check if there are any new verification_submitted notifications
      if (user?.role === 'admin' && count > 0) {
        const res = await apiClient.get('/notifications/my-notifications');
        const list = res.data.notifications || [];
        const unreadSubmitted = list.filter(n => n.status !== 'read' && n.type === 'verification_submitted');
        
        let playedNew = false;
        unreadSubmitted.forEach(n => {
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
        className="relative p-2 hover:bg-sand-100 rounded-full transition"
        data-testid="notification-bell"
      >
        <Bell className="w-5 h-5 text-charcoal-light" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-terracotta text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
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
            className="fixed bottom-5 right-5 z-[9999] max-w-sm w-full bg-white border border-sand-200 rounded-2xl shadow-2xl p-4 flex items-start space-x-3"
            style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <span className="text-2xl mt-0.5">{getNotificationIcon(activeToast.type)}</span>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-charcoal text-sm">{activeToast.title}</h4>
              <p className="text-xs text-charcoal-light mt-1 leading-relaxed">{activeToast.message}</p>
            </div>
            <button 
              onClick={() => setActiveToast(null)} 
              className="p-1 hover:bg-sand-50 rounded-full transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4 text-charcoal-light" />
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
