import { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, TrendingUp, TrendingDown, Users,
  Ticket, DollarSign, Calendar, Download,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { analyticsApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/use-toast';
 
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface RevenueMonth  { month: string; revenue?: number; bookings?: number; users?: number; }
interface CategoryData  { name: string; value: number; bookings?: number }
interface TopEvent      { event_title?: string; title?: string; total_bookings?: number; bookings?: number; total_revenue?: number; attendance_rate?: number }
interface DashStats     { total_events?: number; total_bookings?: number; total_revenue?: number; total_users?: number; new_users_30d?: number; upcoming_events?: number; cancelled_bookings?: number }
interface UserStats     { total_users?: number; active_users?: number; new_users_30d?: number; by_role?: { role: string; count: number }[] }

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = [
  'var(--color-copper)',
  'var(--color-copper-light)',
  'var(--color-chart-gray)',
  'var(--color-chart-blue)',
  'var(--color-chart-purple)',
  'var(--color-chart-green)',
];

const TOOLTIP_STYLE = {
  background:   '#242424',
  border:       '1px solid rgba(184,115,51,0.2)',
  borderRadius: 12,
  color:        '#f5f0e8',
  fontSize:     12,
};

const AXIS_TICK = { fill: '#9a8f82', fontSize: 11 };

const INPUT_CLS = `px-3 py-2.5 border border-copper/20 rounded-xl
  focus:border-copper focus:outline-none text-sm bg-dark-elevation text-ivory-light transition-colors`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Spinner() {
  return <div className="w-6 h-6 border-2 border-copper/30 border-t-copper rounded-full animate-spin" />;
}

function ChartCard({ title, icon: Icon, children, loading, className }: {
  title: string; icon: React.ElementType; children: React.ReactNode; loading?: boolean; className?: string;
}) {
  return (
    <div className={`bg-dark-card rounded-2xl border border-copper/20 p-6 ${className ?? ''}`}>
      <h2 className="text-sm font-semibold text-ivory-light flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-copper" /> {title}
      </h2>
      {loading
        ? <div className="h-52 flex items-center justify-center"><Spinner /></div>
        : children
      }
    </div>
  );
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

async function exportToPDF(params: {
  year: number;
  stats: DashStats | null;
  revenue: RevenueMonth[];
  categories: CategoryData[];
  topEvents: TopEvent[];
  userStats: UserStats | null;
  isAdmin: boolean;
}) {
  // Dynamically import jsPDF + autoTable to keep initial bundle lean
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const { year, stats, revenue, categories, topEvents, userStats, isAdmin } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

  // ── Brand colors (hex for jsPDF) ──
  const COPPER   = [184, 115, 51]  as [number,number,number];
  const DARK     = [28,  26,  22]  as [number,number,number];
  const IVORY    = [245, 240, 232] as [number,number,number];
  const MUTED    = [154, 143, 130] as [number,number,number];
  const ROW_ALT  = [38,  34,  28]  as [number,number,number];

   let cursorY = 46;

  // ── Helper: add page footer ──
  function addFooter(pageNum: number, totalPages: number) {
    doc.setFillColor(...DARK);
    doc.rect(0, pageH - 12, pageW, 12, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('SmartEvent Platform © ' + year, 14, pageH - 4);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageW - 14, pageH - 4, { align: 'right' });
  }

  // ── Helper: section title ──
  function sectionTitle(text: string, y: number): number {
    doc.setFillColor(...COPPER);
    doc.rect(14, y, pageW - 28, 7, 'F');
    doc.setFontSize(9);
    doc.setTextColor(...IVORY);
    doc.setFont('helvetica', 'bold');
    doc.text(text, 18, y + 5);
    doc.setFont('helvetica', 'normal');
    return y + 10;
  }

  // ════════════════════════════════════════════
  // PAGE 1 — Header + KPIs + Monthly Revenue
  // ════════════════════════════════════════════

  // Header bar
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 38, 'F');

  // Logo text
  doc.setFontSize(20);
  doc.setTextColor(...COPPER);
  doc.setFont('helvetica', 'bold');
  doc.text('SmartEvent', 14, 16);

  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.text('Smart Event & Booking Management', 14, 23);

  // Report meta (right side)
  doc.setFontSize(9);
  doc.setTextColor(...IVORY);
  doc.text(`Annual Report — ${year}`, pageW - 14, 12, { align: 'right' });
  doc.setTextColor(...MUTED);
  doc.text(`Generated: ${dateStr}`, pageW - 14, 18, { align: 'right' });
  doc.text(`By: SmartEvent Analytics`, pageW - 14, 24, { align: 'right' });

  

  // ── Platform Overview KPIs ──
  cursorY = sectionTitle('Platform Overview', cursorY);

  autoTable(doc, {
    startY: cursorY,
    head: [['Metric', 'Value']],
    body: [
      ['Total Revenue (RWF)', stats?.total_revenue != null ? `${Number(stats.total_revenue).toLocaleString()} RWF` : '—'],
      ['Total Bookings',      String(stats?.total_bookings ?? '—')],
      ['Total Events',        String(stats?.total_events   ?? '—')],
      [isAdmin ? 'Total Users' : 'Upcoming Events',
       isAdmin ? String(stats?.total_users ?? '—') : String(stats?.upcoming_events ?? '—')],
      ...(isAdmin ? [['New Users (30 days)', String(stats?.new_users_30d ?? '—')]] : []),
    ],
    theme: 'plain',
    headStyles:  { fillColor: COPPER, textColor: IVORY, fontStyle: 'bold', fontSize: 9 },
    bodyStyles:  { textColor: IVORY, fontSize: 9, fillColor: DARK },
    alternateRowStyles: { fillColor: ROW_ALT },
    columnStyles: { 0: { cellWidth: 80, fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 10;

  // ── Monthly Revenue ──
  cursorY = sectionTitle('Monthly Revenue', cursorY);

  const revBody = revenue.map(r => [
    r.month ?? '—',
    r.revenue != null ? `${Number(r.revenue).toLocaleString()} RWF` : '—',
    String(r.bookings ?? '—'),
  ]);

  autoTable(doc, {
    startY: cursorY,
    head: [['Month', 'Revenue (RWF)', 'Bookings']],
    body: revBody.length ? revBody : [['No data', '—', '—']],
    theme: 'plain',
    headStyles:  { fillColor: COPPER, textColor: IVORY, fontStyle: 'bold', fontSize: 9 },
    bodyStyles:  { textColor: IVORY, fontSize: 9, fillColor: DARK },
    alternateRowStyles: { fillColor: ROW_ALT },
    margin: { left: 14, right: 14 },
  });

  

  // ════════════════════════════════════════════
  // PAGE 2 — Top Events + Categories + (Admin) User Stats
  // ════════════════════════════════════════════

  doc.addPage();
  cursorY = 20;

  // ── Top Performing Events ──
  cursorY = sectionTitle('Top Performing Events', cursorY);

  const evBody = topEvents.map(e => [
    e.event_title ?? e.title ?? '—',
    String(e.total_bookings ?? e.bookings ?? '—'),
    e.total_revenue != null ? `${Number(e.total_revenue).toLocaleString()} RWF` : '—',
    e.attendance_rate != null ? `${Number(e.attendance_rate).toFixed(1)}%` : '—',
  ]);

  autoTable(doc, {
    startY: cursorY,
    head: [['Event Name', 'Bookings', 'Revenue (RWF)', 'Attendance %']],
    body: evBody.length ? evBody : [['No event data', '—', '—', '—']],
    theme: 'plain',
    headStyles:  { fillColor: COPPER, textColor: IVORY, fontStyle: 'bold', fontSize: 9 },
    bodyStyles:  { textColor: IVORY, fontSize: 9, fillColor: DARK },
    alternateRowStyles: { fillColor: ROW_ALT },
    columnStyles: { 0: { cellWidth: 70 } },
    margin: { left: 14, right: 14 },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 10;

  // ── Bookings by Category ──
  cursorY = sectionTitle('Bookings by Category', cursorY);

  const catBody = categories.map(c => [
    c.name ?? '—',
    String(c.value ?? c.bookings ?? '—'),
  ]);

  autoTable(doc, {
    startY: cursorY,
    head: [['Category', 'Bookings']],
    body: catBody.length ? catBody : [['No category data', '—']],
    theme: 'plain',
    headStyles:  { fillColor: COPPER, textColor: IVORY, fontStyle: 'bold', fontSize: 9 },
    bodyStyles:  { textColor: IVORY, fontSize: 9, fillColor: DARK },
    alternateRowStyles: { fillColor: ROW_ALT },
    margin: { left: 14, right: 14 },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 10;

  // ── Admin: User Statistics ──
  if (isAdmin && userStats) {
    cursorY = sectionTitle('User Statistics', cursorY);

    const roleRows = userStats.by_role?.map(r => [
      r.role.replace('_', ' '),
      String(r.count),
    ]) ?? [];

    autoTable(doc, {
      startY: cursorY,
      head: [['Metric', 'Value']],
      body: [
        ['Total Users',       String(userStats.total_users   ?? '—')],
        ['Active Users',      String(userStats.active_users  ?? '—')],
        ['New Users (30 days)', String(userStats.new_users_30d ?? '—')],
        ...roleRows.map(([role, count]) => [`Role: ${role}`, count]),
      ],
      theme: 'plain',
      headStyles:  { fillColor: COPPER, textColor: IVORY, fontStyle: 'bold', fontSize: 9 },
      bodyStyles:  { textColor: IVORY, fontSize: 9, fillColor: DARK },
      alternateRowStyles: { fillColor: ROW_ALT },
      columnStyles: { 0: { cellWidth: 80, fontStyle: 'bold' } },
      margin: { left: 14, right: 14 },
    });
  }

  // ── Add footers to all pages ──
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  // ── Save ──
  const fileName = `SmartEvent_Report_${year}_${today.toISOString().slice(0,10)}.pdf`;
  doc.save(fileName);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Reports() {
  const { user }  = useAuth();
  const { toast } = useToast();
  const isAdmin   = user?.role === 'admin';

  const [year, setYear]           = useState(new Date().getFullYear());
  const [exporting, setExporting] = useState(false);

  const [stats,      setStats]      = useState<DashStats | null>(null);
  const [revenue,    setRevenue]    = useState<RevenueMonth[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [topEvents,  setTopEvents]  = useState<TopEvent[]>([]);
  const [userStats,  setUserStats]  = useState<UserStats | null>(null);
  const [loading,    setLoading]    = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const calls: Promise<any>[] = [
        analyticsApi.dashboard(),
        analyticsApi.monthlyRevenue(year),
        analyticsApi.summary(),
        analyticsApi.topEvents(5),
      ];
      if (isAdmin) calls.push(analyticsApi.userStats());

      const results = await Promise.allSettled(calls);

      if (results[0].status === 'fulfilled') setStats(results[0].value.data ?? {});
      if (results[1].status === 'fulfilled') {
        const d = results[1].value.data;
        setRevenue(Array.isArray(d) ? d : []);
      }
      if (results[2].status === 'fulfilled') {
        const d = results[2].value.data;
        const list = Array.isArray(d?.bookings_by_category) ? d.bookings_by_category : [];
        setCategories(list.map((item: any) => ({
          name:     item.category ?? item.name ?? '—',
          value:    item.bookings ?? item.value ?? 0,
          bookings: item.bookings ?? 0,
        })));
      }
      if (results[3].status === 'fulfilled') {
        const d = results[3].value.data;
        setTopEvents(Array.isArray(d) ? d : []);
      }
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

  // ── Export handler ──
  const handleExport = async () => {
    setExporting(true);
    try {
      await exportToPDF({ year, stats, revenue, categories, topEvents, userStats, isAdmin });
      toast({ title: '✅ PDF exported successfully!' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Export failed', description: 'Could not generate PDF. Make sure jspdf and jspdf-autotable are installed.', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const kpis = [
    { icon: DollarSign, label: 'Total Revenue (RWF)', value: stats?.total_revenue != null ? `${Number(stats.total_revenue).toLocaleString()} RWF` : '—', trend: 'up' as const, trendVal: '' },
    { icon: Ticket,     label: 'Total Bookings',      value: stats?.total_bookings ?? '—', trend: 'up' as const, trendVal: '' },
    { icon: Calendar,   label: 'Total Events',        value: stats?.total_events   ?? '—', trend: 'up' as const, trendVal: '' },
    { icon: Users,      label: isAdmin ? 'Total Users' : 'Upcoming Events', value: isAdmin ? (stats?.total_users ?? '—') : (stats?.upcoming_events ?? '—'), trend: 'up' as const, trendVal: '' },
  ];

  const topEventsChartData = topEvents.map((e) => ({
    title:    (e.event_title ?? e.title ?? '').length > 20 ? (e.event_title ?? e.title ?? '').slice(0,20)+'…' : (e.event_title ?? e.title ?? '—'),
    bookings: e.total_bookings ?? e.bookings ?? 0,
    revenue:  e.total_revenue ?? 0,
  }));

  const userGrowthData = revenue.map((r, i) => ({
    month: r.month,
    users: (userStats?.total_users ?? 0) > 0 ? Math.round(((userStats!.total_users! / revenue.length) * (i+1))) : (i+1)*10,
    bookings: r.bookings ?? 0,
  }));

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ivory-light flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-copper" /> Reports
          </h1>
          <p className="text-sm text-muted-text mt-1">Analytics and insights</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={INPUT_CLS}>
            {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={fetchAll}
            className="px-4 py-2.5 text-white text-sm rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition-opacity bg-gradient-to-br from-copper to-copper-light"
          >
            <Calendar className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="px-4 py-2.5 border border-copper/20 text-ivory-light text-sm rounded-xl font-medium flex items-center gap-2 hover:bg-copper/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting
              ? <><div className="w-4 h-4 border-2 border-copper/30 border-t-copper rounded-full animate-spin" /> Exporting…</>
              : <><Download className="w-4 h-4" /> Export PDF</>
            }
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map(({ icon: Icon, label, value, trend, trendVal }) => {
          const TIcon = trend === 'up' ? TrendingUp : TrendingDown;
          return (
            <div key={label} className="bg-dark-card rounded-2xl border border-copper/20 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-copper/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-copper" />
                </div>
                {trendVal && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                    <TIcon className="w-3.5 h-3.5" />{trendVal}
                  </div>
                )}
              </div>
              {loading ? <div className="h-7 bg-gray-400/10 rounded animate-pulse w-24 mb-1" /> : <p className="text-2xl font-bold text-ivory-light">{value}</p>}
              <p className="text-xs text-muted-text mt-1">{label}</p>
            </div>
          );
        })}
      </div>

      {/* Revenue line chart + Category donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <ChartCard title="Monthly Revenue (RWF)" icon={TrendingUp} loading={loading} className="lg:col-span-2">
          <div className="h-56 lg:col-span-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenue} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,115,51,0.08)" />
                <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => v>=1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => v!=null ? [`${Number(v).toLocaleString()} RWF`, 'Revenue'] : ['','Revenue']}/>
                <Line
                  type="monotone" dataKey="revenue"
                  stroke="var(--color-copper)" strokeWidth={2.5}
                  dot={{ fill: 'var(--color-copper)', r:4 }} activeDot={{ r:6 }}
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
                    data={categories.length ? categories : [{ name:'No data', value:1 }]}
                    dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={70} innerRadius={35}
                  >
                    {(categories.length ? categories : [{ name:'No data', value:1 }]).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-1.5">
              {categories.slice(0,5).map((c,i) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-muted-text capitalize">{c.name}</span>
                  </div>
                  <span className="text-ivory-light font-medium">{c.value}</span>
                </div>
              ))}
              {categories.length===0 && !loading && <p className="text-xs text-muted-text text-center py-2">No category data yet</p>}
            </div>
          </>
        </ChartCard>
      </div>

      {/* Top events bar + User growth area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top 5 Events by Bookings" icon={BarChart2} loading={loading}>
          <div className="h-52">
            {topEventsChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-text text-sm">No event data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topEventsChartData} layout="vertical" margin={{ left:0, right:8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,115,51,0.08)" horizontal={false} />
                  <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="title" width={120} tick={{ ...AXIS_TICK, fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="bookings" fill="var(--color-copper)" radius={[0,6,6,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title={isAdmin ? 'User Growth' : 'Monthly Bookings'} icon={isAdmin ? Users : Ticket} loading={loading}>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={isAdmin ? userGrowthData : revenue} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                <defs>
                  <linearGradient id="copperGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--color-copper)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-copper)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,115,51,0.08)" />
                <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area
                  type="monotone"
                  dataKey={isAdmin ? 'users' : 'bookings'}
                  stroke="var(--color-copper)" strokeWidth={2.5}
                  fill="url(#copperGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Admin-only: user stats breakdown */}
      {isAdmin && userStats && !loading && (
        <div className="mt-6 bg-dark-card rounded-2xl border border-copper/20 p-6">
          <h2 className="text-sm font-semibold text-ivory-light flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-copper" /> User Statistics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              ['Total Users',   userStats.total_users   ?? '—'],
              ['Active Users',  userStats.active_users  ?? '—'],
              ['New (30 days)', userStats.new_users_30d ?? '—'],
              ['Roles',         userStats.by_role?.map(r => `${r.role.replace('_',' ')}: ${r.count}`).join(' · ') ?? '—'],
            ].map(([label, value]) => (
              <div key={String(label)} className="p-4 rounded-xl border border-copper/15 bg-black/20">
                <p className="text-xs text-muted-text">{label}</p>
                <p className="text-sm font-bold text-ivory-light mt-1 truncate">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}