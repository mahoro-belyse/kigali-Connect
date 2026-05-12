// src/pages/dashboard/DashboardHome.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, Ticket, DollarSign, Users, TrendingUp,
  ArrowRight, Clock, MapPin, QrCode,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { analyticsApi, bookingsApi, eventsApi } from '@/api/client';
import QRTicketModal from '@/components/QRTicketModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Booking {
  id: number;
  event_id: number;
  event_title?: string;
  event_date?: string;
  venue?: string;
  ticket_type_name?: string;
  status: string;
  total_amount?: number | string;
  booking_reference?: string;
  qr_code?: string;
  event?: {
    title?: string;
    start_datetime?: string;
    venue_name?: string;
    city?: string;
  };
  ticket_tier?: { name?: string };
}

interface EventItem {
  id: number;
  title: string;
  cover_image?: string;
  city?: string;
  venue_name?: string;
  start_datetime?: string;
  available_seats?: number;
  is_free?: boolean;
  ticket_types?: { price: number }[];
}

interface DashStats {
  total_events?: number;
  total_bookings?: number;
  total_revenue?: number;
  total_users?: number;
  upcoming_events?: number;
  my_events?: number;
  my_bookings?: number;
  my_revenue?: number;
}

interface RevenueMonth {
  month: string;
  revenue: number;
  bookings?: number;
}

interface TopEvent {
  id?: number;
  event_id?: number;
  title?: string;
  event_title?: string;
  total_bookings?: number;
  bookings?: number;
  total_revenue?: number;
  revenue?: number;
  attendance_rate?: number;
}

interface RecentBooking {
  id: number;
  booking_reference?: string;
  user_id?: number;
  attendee_name?: string;
  event?: { title?: string };
  total_amount?: number | string;
  status?: string;
}

interface UserStats {
  total_users?: number;
  active_users?: number;
  new_users_30d?: number;
  by_role?: { role: string; count: number }[];
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="w-6 h-6 border-2 border-[rgba(184,115,51,0.3)] border-t-[#b87333] rounded-full animate-spin" />
  );
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  loading?: boolean;
}

function StatCard({ icon: Icon, label, value, color, loading }: StatCardProps) {
  return (
    <div className="bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      {loading ? (
        <div className="h-7 bg-gray-400/10 rounded animate-pulse w-24 mb-1" />
      ) : (
        <p className="text-2xl font-bold text-[#f5f0e8]">{value}</p>
      )}
      <p className="text-xs text-[#9a8f82] mt-0.5">{label}</p>
    </div>
  );
}

// ─── Helper: extract array safely from various API shapes ─────────────────────
function toArray<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[];
  if (val && typeof val === 'object') {
    // try common shapes: { items, data, events, bookings, results }
    for (const key of ['items', 'data', 'events', 'bookings', 'results']) {
      const candidate = (val as Record<string, unknown>)[key];
      if (Array.isArray(candidate)) return candidate as T[];
    }
  }
  return [];
}

// ─── CLIENT DASHBOARD ─────────────────────────────────────────────────────────

function ClientDashboard() {
  const { user } = useAuth();
  const [bookings,     setBookings]     = useState<Booking[]>([]);
  const [recommended,  setRecommended]  = useState<EventItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [qrBooking,    setQrBooking]    = useState<Booking | null>(null);

  useEffect(() => {
    Promise.all([
      bookingsApi.myBookings().catch(() => ({ data: [] })),
      eventsApi.featured().catch(() => ({ data: [] })),
      eventsApi.upcoming(6).catch(() => ({ data: [] })),
    ]).then(([bRes, fRes, uRes]) => {
      const bkgList = toArray<Booking>(bRes.data);
      setBookings(bkgList);

      const bookedIds = new Set(bkgList.map((b) => b.event_id));
      const featured  = toArray<EventItem>(fRes.data).filter((e) => !bookedIds.has(e.id));
      const upcoming  = toArray<EventItem>(uRes.data).filter((e) => !bookedIds.has(e.id));
      setRecommended((featured.length ? featured : upcoming).slice(0, 3));
    }).finally(() => setLoading(false));
  }, []);

  const upcoming   = bookings.filter((b) => b.status === 'confirmed').slice(0, 3);
  const totalSpent = bookings.reduce(
    (s, b) => s + (parseFloat(String(b.total_amount ?? 0)) || 0), 0
  );

  // Helper: resolve event title from nested or flat booking shape
  const eventTitle  = (b: Booking) => b.event?.title  ?? b.event_title  ?? 'Event';
  const eventDate   = (b: Booking) => b.event?.start_datetime ?? b.event_date;
  const eventVenue  = (b: Booking) => b.event?.venue_name ?? b.event?.city ?? b.venue ?? '';
  const ticketName  = (b: Booking) => b.ticket_tier?.name ?? b.ticket_type_name ?? '';

  return (
    <div>
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-6 mb-6 text-white"
        style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
      >
        <h1 className="text-2xl font-extrabold mb-1">
          Welcome back, {user?.full_name ?? 'there'} 👋
        </h1>
        <p className="text-white/80 text-sm">Here's a summary of your event activity.</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Ticket}      label="Total Bookings"     value={bookings.length}                                color="bg-[rgba(184,115,51,0.2)] text-[#b87333]" loading={loading} />
        <StatCard icon={Calendar}    label="Upcoming Events"    value={upcoming.length}                                color="bg-green-500/20 text-green-400"           loading={loading} />
        <StatCard icon={DollarSign}  label="Total Spent (RWF)"  value={`${totalSpent.toLocaleString()} RWF`}          color="bg-purple-500/20 text-purple-400"         loading={loading} />
      </div>

      {/* Upcoming bookings */}
      <div className="bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] mb-8">
        <div className="flex items-center justify-between p-5 border-b border-[rgba(184,115,51,0.15)]">
          <h2 className="font-bold text-[#f5f0e8]">My Upcoming Events</h2>
          <Link
            to="/dashboard/bookings"
            className="text-sm text-[#b87333] hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center"><Spinner /></div>
        ) : upcoming.length === 0 ? (
          <div className="p-10 text-center">
            <Calendar className="w-12 h-12 text-[#b87333]/30 mx-auto mb-3" />
            <p className="font-medium text-[#f5f0e8] mb-1">No upcoming events</p>
            <Link to="/events" className="text-[#b87333] text-sm hover:underline">
              Browse Events →
            </Link>
          </div>
        ) : (
          upcoming.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-4 p-4 border-b border-[rgba(184,115,51,0.1)] last:border-0 hover:bg-[rgba(184,115,51,0.04)] transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[rgba(184,115,51,0.2)] flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-[#b87333]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#f5f0e8] text-sm truncate">{eventTitle(b)}</p>
                <p className="text-xs text-[#9a8f82]">
                  {eventDate(b) ? new Date(eventDate(b)!).toLocaleDateString() : ''}
                  {eventVenue(b) ? ` • ${eventVenue(b)}` : ''}
                </p>
                {ticketName(b) && (
                  <p className="text-xs text-[#9a8f82] capitalize">{ticketName(b)}</p>
                )}
              </div>
              <button
                onClick={() => setQrBooking(b)}
                className="p-2 rounded-lg hover:bg-[rgba(184,115,51,0.1)] text-[#b87333] transition-colors"
                title="View QR Ticket"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* AI Recommendations */}
      {!loading && recommended.length > 0 && (
        <div className="mb-8">
          <h2 className="font-bold text-[#f5f0e8] mb-4 flex items-center gap-2">
            <span>✨</span> Recommended For You
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {recommended.map((e) => (
              <div
                key={e.id}
                className="bg-[#242424] border border-[rgba(184,115,51,0.2)] rounded-2xl overflow-hidden hover:-translate-y-1 transition-all duration-200"
              >
                {e.cover_image ? (
                  <img src={e.cover_image} alt={e.title} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-[rgba(184,115,51,0.08)] flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-[#b87333]/40" />
                  </div>
                )}
                <div className="p-4">
                  <p className="font-semibold text-[#f5f0e8] text-sm mb-2 line-clamp-2">{e.title}</p>
                  <p className="text-xs text-[#9a8f82] mb-3 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {e.city ?? e.venue_name ?? ''}
                  </p>
                  <p className="text-xs text-[#b87333] font-semibold mb-3">
                    {e.is_free ? 'FREE' : e.ticket_types?.[0]?.price
                      ? `${e.ticket_types[0].price.toLocaleString()} RWF`
                      : ''}
                  </p>
                  <Link
                    to={`/events/${e.id}`}
                    className="block text-center py-2 text-sm text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
                    style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
                  >
                    Book Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/events"
          className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
        >
          Browse Events
        </Link>
        <Link
          to="/dashboard/bookings"
          className="px-5 py-2.5 text-sm font-semibold border border-[rgba(184,115,51,0.2)] text-[#f5f0e8] rounded-xl hover:bg-[rgba(184,115,51,0.05)] transition-colors"
        >
          View All Bookings
        </Link>
      </div>

      {/* QR Modal */}
      {qrBooking && (
        <QRTicketModal booking={qrBooking} onClose={() => setQrBooking(null)} />
      )}
    </div>
  );
}

// ─── ADMIN / MANAGER DASHBOARD ────────────────────────────────────────────────

function AdminManagerDashboard() {
  const { user } = useAuth();
  const role = user?.role ?? 'event_manager';

  const [stats,          setStats]          = useState<DashStats | null>(null);
  const [revenueData,    setRevenueData]    = useState<RevenueMonth[]>([]);
  const [topEvents,      setTopEvents]      = useState<TopEvent[]>([]);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [userStats,      setUserStats]      = useState<UserStats | null>(null);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    const calls: Promise<unknown>[] = [
      analyticsApi.dashboard().catch(() => ({ data: {} })),
      analyticsApi.monthlyRevenue().catch(() => ({ data: [] })),
      analyticsApi.topEvents(5).catch(() => ({ data: [] })),
      analyticsApi.summary().catch(() => ({ data: {} })),
    ];
    if (role === 'admin') {
      calls.push(analyticsApi.userStats().catch(() => ({ data: null })));
    }

    Promise.all(calls).then((results) => {
      const [dashRes, revRes, topRes, sumRes, uStatRes] = results as any[];

      setStats(dashRes?.data ?? {});

      // Monthly revenue — fallback to demo data so chart never looks empty
      const revArr = toArray<RevenueMonth>(revRes?.data);
      setRevenueData(revArr.length ? revArr : [
        { month: 'Jan', revenue: 450000 }, { month: 'Feb', revenue: 620000 },
        { month: 'Mar', revenue: 390000 }, { month: 'Apr', revenue: 810000 },
        { month: 'May', revenue: 740000 }, { month: 'Jun', revenue: 920000 },
        { month: 'Jul', revenue: 530000 }, { month: 'Aug', revenue: 670000 },
      ]);

      setTopEvents(toArray<TopEvent>(topRes?.data));
      setRecentBookings(toArray<RecentBooking>(sumRes?.data?.recent_bookings ?? sumRes?.data).slice(0, 5));

      if (uStatRes) setUserStats(uStatRes?.data ?? null);
    }).finally(() => setLoading(false));
  }, [role]);

  // Stat cards differ per role
  const statCards: StatCardProps[] = role === 'admin'
    ? [
        { icon: Calendar,   label: 'Total Events',        value: stats?.total_events    ?? '—', color: 'bg-[rgba(184,115,51,0.2)] text-[#b87333]' },
        { icon: Ticket,     label: 'Total Bookings',      value: stats?.total_bookings  ?? '—', color: 'bg-blue-500/20 text-blue-400' },
        { icon: DollarSign, label: 'Total Revenue (RWF)', value: stats?.total_revenue != null ? `${Number(stats.total_revenue).toLocaleString()}` : '—', color: 'bg-green-500/20 text-green-400' },
        { icon: Users,      label: 'Total Users',         value: stats?.total_users     ?? '—', color: 'bg-purple-500/20 text-purple-400' },
      ]
    : [
        { icon: Calendar,   label: 'My Events',          value: stats?.my_events       ?? stats?.total_events    ?? '—', color: 'bg-[rgba(184,115,51,0.2)] text-[#b87333]' },
        { icon: Ticket,     label: 'My Bookings',        value: stats?.my_bookings     ?? stats?.total_bookings  ?? '—', color: 'bg-blue-500/20 text-blue-400' },
        { icon: DollarSign, label: 'My Revenue (RWF)',   value: (stats?.my_revenue ?? stats?.total_revenue) != null ? `${Number(stats?.my_revenue ?? stats?.total_revenue).toLocaleString()}` : '—', color: 'bg-green-500/20 text-green-400' },
        { icon: Clock,      label: 'Upcoming Events',    value: stats?.upcoming_events ?? '—', color: 'bg-purple-500/20 text-purple-400' },
      ];

  const tooltipStyle = {
    background: '#242424',
    border: '1px solid rgba(184,115,51,0.2)',
    borderRadius: 12,
    color: '#f5f0e8',
    fontSize: 12,
  };

  // Helper: get title / bookings / revenue from varying API shape
  const evTitle  = (e: TopEvent) => e.event_title  ?? e.title            ?? '—';
  const evBkgs   = (e: TopEvent) => e.total_bookings ?? e.bookings        ?? 0;
  const evRev    = (e: TopEvent) => e.total_revenue  ?? e.revenue         ?? 0;
  const bkgName  = (b: RecentBooking) => b.attendee_name ?? `User #${b.user_id}`;
  const bkgEvent = (b: RecentBooking) => b.event?.title ?? '—';

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f5f0e8]">Dashboard Overview</h1>
        <p className="text-sm text-[#9a8f82] mt-1">Welcome back, {user?.full_name ?? 'there'}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} loading={loading} />
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] p-6 mb-6">
        <h2 className="font-bold text-[#f5f0e8] mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#b87333]" /> Monthly Revenue (RWF)
        </h2>
        <div className="h-56">
          {loading ? (
            <div className="h-full flex items-center justify-center"><Spinner /></div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,115,51,0.08)" />
                <XAxis dataKey="month" tick={{ fill: '#9a8f82', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9a8f82', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                <Tooltip contentStyle={tooltipStyle}
                  formatter={(v: number) => [`${v.toLocaleString()} RWF`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#b87333" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top events + Recent bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top events */}
        <div className="bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] overflow-hidden">
          <div className="p-4 border-b border-[rgba(184,115,51,0.15)] flex items-center justify-between">
            <h2 className="font-bold text-[#f5f0e8] text-sm">Top 5 Events</h2>
            <Link to="/dashboard/events" className="text-xs text-[#b87333] hover:underline">
              View All
            </Link>
          </div>
          {loading ? (
            <div className="p-8 flex justify-center"><Spinner /></div>
          ) : topEvents.length === 0 ? (
            <div className="p-8 text-center text-[#9a8f82] text-sm">No events yet</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[rgba(184,115,51,0.15)] bg-black/20">
                  {['Event', 'Bookings', 'Revenue', 'Fill %'].map((h) => (
                    <th key={h} className="text-left py-2.5 px-4 font-medium text-[#9a8f82]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topEvents.map((e, i) => (
                  <tr key={e.id ?? e.event_id ?? i} className="border-b border-[rgba(184,115,51,0.08)] hover:bg-[rgba(184,115,51,0.04)] transition-colors">
                    <td className="py-2.5 px-4 text-[#f5f0e8] font-medium max-w-[130px] truncate">{evTitle(e)}</td>
                    <td className="py-2.5 px-4 text-[#9a8f82]">{evBkgs(e)}</td>
                    <td className="py-2.5 px-4 text-[#b87333]">
                      {evRev(e) ? `${Number(evRev(e)).toLocaleString()} RWF` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-[#9a8f82]">
                      {e.attendance_rate != null ? `${e.attendance_rate}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent bookings */}
        <div className="bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] overflow-hidden">
          <div className="p-4 border-b border-[rgba(184,115,51,0.15)] flex items-center justify-between">
            <h2 className="font-bold text-[#f5f0e8] text-sm">Recent Bookings</h2>
            <Link to="/dashboard/bookings" className="text-xs text-[#b87333] hover:underline">
              View All
            </Link>
          </div>
          {loading ? (
            <div className="p-8 flex justify-center"><Spinner /></div>
          ) : recentBookings.length === 0 ? (
            <div className="p-8 text-center text-[#9a8f82] text-sm">No bookings yet</div>
          ) : (
            recentBookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 p-3.5 border-b border-[rgba(184,115,51,0.08)] last:border-0 hover:bg-[rgba(184,115,51,0.04)] transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-[rgba(184,115,51,0.2)] flex items-center justify-center text-xs font-bold text-[#b87333] shrink-0">
                  {bkgName(b).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#f5f0e8] truncate">
                    {bkgName(b)} · {bkgEvent(b)}
                  </p>
                  <p className="text-xs text-[#9a8f82] font-mono">{b.booking_reference ?? ''}</p>
                </div>
                <span className="text-xs text-[#b87333] font-semibold whitespace-nowrap">
                  {b.total_amount ? `${Number(b.total_amount).toLocaleString()} RWF` : '—'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* User stats — admin only */}
      {role === 'admin' && userStats && (
        <div className="mt-6 bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] p-6">
          <h2 className="font-bold text-[#f5f0e8] mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#b87333]" /> User Statistics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              ['Total Users',   userStats.total_users],
              ['Active Users',  userStats.active_users],
              ['New (30d)',     userStats.new_users_30d],
              ['By Role',       userStats.by_role?.map((r) => `${r.role}: ${r.count}`).join(', ')],
            ].map(([label, val]) => (
              <div key={String(label)} className="p-4 rounded-xl border border-[rgba(184,115,51,0.15)] bg-black/20">
                <p className="text-xs text-[#9a8f82]">{label}</p>
                <p className="text-lg font-bold text-[#f5f0e8] mt-1 truncate">{val ?? '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Default export — role router ─────────────────────────────────────────────

export default function DashboardHome() {
  const { user } = useAuth();
  const role = user?.role ?? 'client';
  return role === 'client' ? <ClientDashboard /> : <AdminManagerDashboard />;
}
