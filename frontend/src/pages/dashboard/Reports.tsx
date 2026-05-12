import { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, TrendingUp, TrendingDown, Users,
  Ticket, DollarSign, Calendar, Download,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { analyticsApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RevenueMonth  { month: string; revenue: number; bookings?: number }
interface CategoryData  { name: string; value: number; bookings?: number }
interface TopEvent      { event_title?: string; title?: string; total_bookings?: number; bookings?: number; total_revenue?: number; attendance_rate?: number }
interface DashStats     { total_events?: number; total_bookings?: number; total_revenue?: number; total_users?: number; new_users_30d?: number; upcoming_events?: number; cancelled_bookings?: number }
interface UserStats     { total_users?: number; active_users?: number; new_users_30d?: number; by_role?: { role: string; count: number }[] }

// ─── Constants ────────────────────────────────────────────────────────────────

const COPPER       = '#b87333';
const COPPER_LIGHT = '#d4956a';
const CHART_COLORS = [COPPER, COPPER_LIGHT, '#6b7280', '#3b82f6', '#8b5cf6', '#10b981'];

const TOOLTIP_STYLE = {
  background:   '#242424',
  border:       '1px solid rgba(184,115,51,0.2)',
  borderRadius: 12,
  color:        '#f5f0e8',
  fontSize:     12,
};

const AXIS_TICK = { fill: '#9a8f82', fontSize: 11 };

const INPUT_CLS = `px-3 py-2.5 border border-[rgba(184,115,51,0.2)] rounded-xl
  focus:border-[#b87333] focus:outline-none text-sm bg-[#1a1a1a] text-[#f5f0e8] transition-colors`;

function Spinner() {
  return <div className="w-6 h-6 border-2 border-[rgba(184,115,51,0.3)] border-t-[#b87333] rounded-full animate-spin" />;
}

function ChartCard({ title, icon: Icon, children, loading }: {
  title: string; icon: React.ElementType; children: React.ReactNode; loading?: boolean;
}) {
  return (
    <div className="bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] p-6">
      <h2 className="text-sm font-semibold text-[#f5f0e8] flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-[#b87333]" /> {title}
      </h2>
      {loading
        ? <div className="h-52 flex items-center justify-center"><Spinner /></div>
        : children
      }
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Reports() {
  const { user }  = useAuth();
  const { toast } = useToast();
  const isAdmin   = user?.role === 'admin';

  // Date range — default last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const [dateFrom, setDateFrom] = useState(sixMonthsAgo.toISOString().split('T')[0]);
  const [dateTo,   setDateTo]   = useState(new Date().toISOString().split('T')[0]);
  const [year,     setYear]     = useState(new Date().getFullYear());

  // Data state
  const [stats,       setStats]       = useState<DashStats | null>(null);
  const [revenue,     setRevenue]     = useState<RevenueMonth[]>([]);
  const [categories,  setCategories]  = useState<CategoryData[]>([]);
  const [topEvents,   setTopEvents]   = useState<TopEvent[]>([]);
  const [userStats,   setUserStats]   = useState<UserStats | null>(null);
  const [loading,     setLoading]     = useState(true);

  // ── Fetch all analytics ────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const calls: Promise<any>[] = [
        analyticsApi.dashboard(),
        analyticsApi.monthlyRevenue(year),
        analyticsApi.byCategory(),
        analyticsApi.topEvents(5),
      ];
      if (isAdmin) calls.push(analyticsApi.userStats());

      const results = await Promise.allSettled(calls);

      // Stats
      if (results[0].status === 'fulfilled') setStats(results[0].value.data ?? {});

      // Monthly revenue
      if (results[1].status === 'fulfilled') {
        const d = results[1].value.data;
        setRevenue(Array.isArray(d) ? d : []);
      }

      // By category
      if (results[2].status === 'fulfilled') {
        const d = results[2].value.data;
        const list = Array.isArray(d) ? d : [];
        setCategories(list.map((item: any) => ({
          name:     item.category ?? item.name ?? '—',
          value:    item.bookings ?? item.value ?? 0,
          bookings: item.bookings ?? 0,
        })));
      }

      // Top events
      if (results[3].status === 'fulfilled') {
        const d = results[3].value.data;
        setTopEvents(Array.isArray(d) ? d : []);
      }

      // User stats (admin only)
      if (isAdmin && results[4]?.status === 'fulfilled') {
        setUserStats(results[4].value.data ?? null);
      }
    } catch {
      toast({ title: 'Failed to load analytics', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [year, isAdmin]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── KPI cards ─────────────────────────────────────────────────────────────
  const kpis = [
    {
      icon:     DollarSign,
      label:    'Total Revenue (RWF)',
      value:    stats?.total_revenue != null ? `${Number(stats.total_revenue).toLocaleString()} RWF` : '—',
      trend:    'up' as const,
      trendVal: '',
    },
    {
      icon:     Ticket,
      label:    'Total Bookings',
      value:    stats?.total_bookings ?? '—',
      trend:    'up' as const,
      trendVal: '',
    },
    {
      icon:     Calendar,
      label:    'Total Events',
      value:    stats?.total_events ?? '—',
      trend:    'up' as const,
      trendVal: '',
    },
    {
      icon:     Users,
      label:    isAdmin ? 'Total Users' : 'Upcoming Events',
      value:    isAdmin ? (stats?.total_users ?? '—') : (stats?.upcoming_events ?? '—'),
      trend:    'up' as const,
      trendVal: '',
    },
  ];

  // Top events data formatted for horizontal bar chart
  const topEventsChartData = topEvents.map((e) => ({
    title:    (e.event_title ?? e.title ?? '').length > 20
                ? (e.event_title ?? e.title ?? '').slice(0, 20) + '…'
                : (e.event_title ?? e.title ?? '—'),
    bookings: e.total_bookings ?? e.bookings ?? 0,
    revenue:  e.total_revenue  ?? 0,
  }));

  // User growth from monthly data (cumulative)
  const userGrowthData = revenue.map((r, i) => ({
    month: r.month,
    users: (userStats?.total_users ?? 0) > 0
      ? Math.round(((userStats!.total_users! / revenue.length) * (i + 1)))
      : (i + 1) * 10,
    bookings: r.bookings ?? 0,
  }));

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f0e8] flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-[#b87333]" /> Reports
          </h1>
          <p className="text-sm text-[#9a8f82] mt-1">Analytics and insights</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Year selector for monthly chart */}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className={INPUT_CLS}
          >
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            onClick={fetchAll}
            className="px-4 py-2.5 text-white text-sm rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
          >
            <Calendar className="w-4 h-4" /> Refresh
          </button>

          <button
            onClick={() => toast({ title: '🚀 Export feature coming soon!' })}
            className="px-4 py-2.5 border border-[rgba(184,115,51,0.2)] text-[#f5f0e8] text-sm rounded-xl font-medium flex items-center gap-2 hover:bg-[rgba(184,115,51,0.05)] transition-colors"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map(({ icon: Icon, label, value, trend, trendVal }) => {
          const TIcon = trend === 'up' ? TrendingUp : TrendingDown;
          return (
            <div key={label} className="bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[rgba(184,115,51,0.2)] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#b87333]" />
                </div>
                {trendVal && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                    <TIcon className="w-3.5 h-3.5" />{trendVal}
                  </div>
                )}
              </div>
              {loading
                ? <div className="h-7 bg-gray-400/10 rounded animate-pulse w-24 mb-1" />
                : <p className="text-2xl font-bold text-[#f5f0e8]">{value}</p>
              }
              <p className="text-xs text-[#9a8f82] mt-1">{label}</p>
            </div>
          );
        })}
      </div>

      {/* Revenue line chart + Category donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <ChartCard title="Monthly Revenue (RWF)" icon={TrendingUp} loading={loading} className="lg:col-span-2">
          <div className="h-56 lg:col-span-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenue} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,115,51,0.08)" />
                <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => v != null ? [`${Number(v).toLocaleString()} RWF`, 'Revenue'] : ['', 'Revenue']}/>
                <Line
                  type="monotone" dataKey="revenue" stroke={COPPER} strokeWidth={2.5}
                  dot={{ fill: COPPER, r: 4 }} activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Bookings by Category" icon={Ticket} loading={loading}>
          <>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories.length ? categories : [{ name: 'No data', value: 1 }]}
                    dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={70} innerRadius={35}
                  >
                    {(categories.length ? categories : [{ name: 'No data', value: 1 }]).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-1.5">
              {categories.slice(0, 5).map((c, i) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-[#9a8f82] capitalize">{c.name}</span>
                  </div>
                  <span className="text-[#f5f0e8] font-medium">{c.value}</span>
                </div>
              ))}
              {categories.length === 0 && !loading && (
                <p className="text-xs text-[#9a8f82] text-center py-2">No category data yet</p>
              )}
            </div>
          </>
        </ChartCard>
      </div>

      {/* Top events bar + User growth area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top 5 Events by Bookings" icon={BarChart2} loading={loading}>
          <div className="h-52">
            {topEventsChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[#9a8f82] text-sm">
                No event data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topEventsChartData} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,115,51,0.08)" horizontal={false} />
                  <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="title" width={120} tick={{ ...AXIS_TICK, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="bookings" fill={COPPER} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        {/* Admin: user growth | Manager: bookings over time */}
        <ChartCard
          title={isAdmin ? 'User Growth' : 'Monthly Bookings'}
          icon={isAdmin ? Users : Ticket}
          loading={loading}
        >
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={isAdmin ? userGrowthData : revenue} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="copperGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={COPPER} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COPPER} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,115,51,0.08)" />
                <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area
                  type="monotone"
                  dataKey={isAdmin ? 'users' : 'bookings'}
                  stroke={COPPER} strokeWidth={2.5}
                  fill="url(#copperGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Admin-only: user stats breakdown */}
      {isAdmin && userStats && !loading && (
        <div className="mt-6 bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] p-6">
          <h2 className="text-sm font-semibold text-[#f5f0e8] flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-[#b87333]" /> User Statistics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              ['Total Users',   userStats.total_users   ?? '—'],
              ['Active Users',  userStats.active_users  ?? '—'],
              ['New (30 days)', userStats.new_users_30d ?? '—'],
              ['Roles',         userStats.by_role?.map((r) => `${r.role.replace('_',' ')}: ${r.count}`).join(' · ') ?? '—'],
            ].map(([label, value]) => (
              <div key={String(label)} className="p-4 rounded-xl border border-[rgba(184,115,51,0.15)] bg-black/20">
                <p className="text-xs text-[#9a8f82]">{label}</p>
                <p className="text-sm font-bold text-[#f5f0e8] mt-1 truncate">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
