import { useState, useEffect, useCallback } from 'react';
import {
  Bell, CheckCheck, Clock, Ticket, Calendar,
  DollarSign, XCircle, AlertTriangle, Info, CheckCircle,
} from 'lucide-react';
import { notificationsApi } from '../../api/client';
import { useToast } from '../../components/ui/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at?: string;
  data?: string | null;
}

type Tab = 'all' | 'unread' | 'read';

// ─── Notification type → icon + color mapping ─────────────────────────────────
// Maps our backend NotificationType enum values to UI config

const TYPE_CONFIG: Record<string, { icon: React.ElementType; bg: string; iconColor: string }> = {
  // Backend types
  booking_confirmed:  { icon: Ticket,        bg: 'bg-green-500/15',  iconColor: 'text-green-400'  },
  booking_cancelled:  { icon: XCircle,        bg: 'bg-red-500/15',    iconColor: 'text-red-400'    },
  event_reminder:     { icon: Calendar,       bg: 'bg-blue-500/15',   iconColor: 'text-blue-400'   },
  event_cancelled:    { icon: AlertTriangle,  bg: 'bg-orange-500/15', iconColor: 'text-orange-400' },
  payment_received:   { icon: DollarSign,     bg: 'bg-green-500/15',  iconColor: 'text-green-400'  },
  account_locked:     { icon: AlertTriangle,  bg: 'bg-red-500/15',    iconColor: 'text-red-400'    },
  general:            { icon: Info,           bg: 'bg-blue-500/15',   iconColor: 'text-blue-400'   },
  // Legacy / fallback types from Base44 mock
  success:            { icon: CheckCircle,    bg: 'bg-green-500/15',  iconColor: 'text-green-400'  },
  warning:            { icon: AlertTriangle,  bg: 'bg-orange-500/15', iconColor: 'text-orange-400' },
  error:              { icon: XCircle,        bg: 'bg-red-500/15',    iconColor: 'text-red-400'    },
  info:               { icon: Info,           bg: 'bg-blue-500/15',   iconColor: 'text-blue-400'   },
};

const DEFAULT_CONFIG = TYPE_CONFIG.general;

// ─── Time ago — no moment.js, native Intl ────────────────────────────────────

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);

  if (mins  <  1)  return 'just now';
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  <  7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-RW', { month: 'short', day: '2-digit' });
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-[rgba(184,115,51,0.15)] bg-[#242424]">
      <div className="w-9 h-9 rounded-xl bg-gray-400/10 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-400/10 rounded animate-pulse w-2/3" />
        <div className="h-3 bg-gray-400/10 rounded animate-pulse w-full" />
        <div className="h-3 bg-gray-400/10 rounded animate-pulse w-1/3" />
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Notifications() {
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState<Tab>('all');
  const [markingAll,    setMarkingAll]    = useState(false);

  // ── Fetch notifications ───────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await notificationsApi.list({ per_page: 50 });
      const data = res.data;
      const list: Notification[] = Array.isArray(data)
        ? data
        : data?.notifications ?? data?.items ?? [];
      setNotifications(list);
    } catch {
      // On error, show empty state — don't show fake mock data
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // ── Mark single as read ───────────────────────────────────────────────────
  const markRead = async (n: Notification) => {
    if (n.is_read) return;
    // Optimistic update first
    setNotifications((prev) =>
      prev.map((item) => item.id === n.id ? { ...item, is_read: true } : item)
    );
    try {
      await notificationsApi.markRead(n.id);
    } catch {
      // Revert on failure
      setNotifications((prev) =>
        prev.map((item) => item.id === n.id ? { ...item, is_read: false } : item)
      );
    }
  };

  // ── Mark all as read ──────────────────────────────────────────────────────
  const markAllRead = async () => {
    setMarkingAll(true);
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await notificationsApi.markAllRead();
      toast({ title: '✅ All notifications marked as read' });
    } catch {
      toast({ title: 'Failed to mark all as read', variant: 'destructive' });
      // Revert
      fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  // ── Delete notification ───────────────────────────────────────────────────
  const deleteNotification = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await notificationsApi.delete(id);
    } catch {
      fetchNotifications(); // Revert if failed
    }
  };

  // ── Filter by tab ─────────────────────────────────────────────────────────
  const filtered = notifications.filter((n) => {
    if (tab === 'unread') return !n.is_read;
    if (tab === 'read')   return  n.is_read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f0e8] flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#b87333]" />
            Notifications
            {unreadCount > 0 && (
              <span
                className="ml-1 px-2 py-0.5 text-white text-xs font-bold rounded-full"
                style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
              >
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-[#9a8f82] mt-1">
            {unreadCount === 0
              ? "You're all caught up!"
              : `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-2 px-4 py-2.5 border border-[rgba(184,115,51,0.2)]
              text-[#f5f0e8] text-sm rounded-xl hover:bg-[rgba(184,115,51,0.06)]
              disabled:opacity-50 transition-colors"
          >
            <CheckCheck className="w-4 h-4 text-[#b87333]" />
            {markingAll ? 'Marking…' : 'Mark all read'}
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-5">
        {(['all', 'unread', 'read'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-xl capitalize font-medium transition-colors ${
              tab === t
                ? 'text-white'
                : 'border border-[rgba(184,115,51,0.2)] text-[#9a8f82] hover:text-[#f5f0e8] hover:border-[rgba(184,115,51,0.4)]'
            }`}
            style={tab === t ? { background: 'linear-gradient(135deg,#b87333,#d4956a)' } : {}}
          >
            {t}
            {/* Show count on unread tab */}
            {t === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 text-xs opacity-80">({unreadCount})</span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <Bell className="w-12 h-12 text-[#b87333]/30" />
            <p className="text-base font-medium text-[#f5f0e8]">
              {tab === 'unread' ? 'No unread notifications' : 'No notifications'}
            </p>
            <p className="text-sm text-[#9a8f82]">
              {tab === 'unread' ? "You're all caught up!" : 'Notifications will appear here'}
            </p>
          </div>
        ) : (
          filtered.map((n) => {
            const cfg  = TYPE_CONFIG[n.type] ?? DEFAULT_CONFIG;
            const Icon = cfg.icon;

            return (
              <div
                key={n.id}
                onClick={() => markRead(n)}
                className={`group flex items-start gap-4 p-4 rounded-xl border
                  cursor-pointer transition-all duration-200 ${
                  n.is_read
                    ? 'border-[rgba(184,115,51,0.15)] bg-[#242424] hover:bg-[rgba(184,115,51,0.04)]'
                    : 'border-l-2 border-l-[#b87333] border-[rgba(184,115,51,0.2)] bg-[rgba(184,115,51,0.06)] hover:bg-[rgba(184,115,51,0.1)]'
                }`}
              >
                {/* Icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                  <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${n.is_read ? 'text-[#9a8f82]' : 'text-[#f5f0e8]'}`}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Unread dot */}
                      {!n.is_read && (
                        <div className="w-2 h-2 rounded-full bg-[#b87333] shrink-0" />
                      )}
                      {/* Timestamp */}
                      <span className="text-xs text-[#9a8f82] flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        {timeAgo(n.created_at)}
                      </span>
                      {/* Delete button (appears on hover) */}
                      <button
                        onClick={(e) => deleteNotification(e, n.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-500
                          hover:text-red-400 transition-all"
                        title="Delete"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-[#9a8f82] mt-0.5 line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer count */}
      {!loading && notifications.length > 0 && (
        <p className="text-center text-xs text-[#9a8f82] mt-6">
          Showing {filtered.length} of {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
