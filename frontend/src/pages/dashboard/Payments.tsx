// src/pages/dashboard/Payments.tsx
// ─── FIXED: Shows unpaid bookings + paid payments for all roles ───────────────
import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, CreditCard, TrendingUp, RefreshCw,
   AlertTriangle, Search, Filter, X, Clock, CheckCircle, Ticket,
} from 'lucide-react';
import { paymentsApi, bookingsApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Payment {
  id: number;
  transaction_id?: string;
  booking_id?: number;
  amount?: number | string;
  receipt_number?: string;
  receipt_url?: string;
}

interface Booking {
  id: number;
  booking_reference?: string;
  status: string;
  payment_status: string;
  final_amount?: number | string;
  total_amount?: number | string;
  created_at?: string;
  quantity?: number;
  event?: { title?: string; start_datetime?: string };
  event_title?: string;
  ticket_tier?: { name?: string };
  ticket_type_name?: string;
  payment?: Payment | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  paid:               'bg-green-500/15 text-green-400 border-green-500/30',
  unpaid:             'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  pending:            'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  refunded:           'bg-purple-500/15 text-purple-400 border-purple-500/30',
  partially_refunded: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  failed:             'bg-red-500/15 text-red-400 border-red-500/30',
};

function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_COLORS[status] ?? 'bg-gray-500/15 text-gray-400 border-gray-500/30'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function Spinner({ small = false }: { small?: boolean }) {
  return (
    <div className={`${small ? 'w-4 h-4 border-2' : 'w-8 h-8 border-2'} border-copper/30 border-t-copper rounded-full animate-spin`} />
  );
}

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-RW', { month: 'short', day: '2-digit', year: 'numeric' });
}

const getAmount     = (b: Booking) => Number(b.final_amount ?? b.total_amount ?? 0);
const getEventTitle = (b: Booking) => b.event?.title ?? b.event_title ?? '—';
const getTicket     = (b: Booking) => (b.ticket_tier?.name ?? b.ticket_type_name ?? '—').replace('_', ' ');
const getRef        = (b: Booking) => b.booking_reference ?? `#${b.id}`;

const INPUT_CLS = `px-3 py-2.5 border border-copper/20 rounded-xl
  focus:border-copper focus:outline-none focus:ring-1 focus:ring-copper/30
  text-sm bg-dark-input text-ivory-light placeholder-muted-text transition-colors`;

const PAY_METHODS = [
  { value: 'card',         label: '💳 Card'         },
  { value: 'cash',         label: '💵 Cash'         },
  { value: 'mobile_money', label: '📱 Mobile Money' },
  { value: 'simulated',    label: '🧪 Simulated'    },
] as const;

// ─── Mobile card ──────────────────────────────────────────────────────────────

function BookingPaymentCard({
  b, isClient, isAdmin,
  onPay, onRefund,
}: {
  b: Booking;
  isClient: boolean;
  isAdmin: boolean;
  onPay: (b: Booking) => void;
  onRefund: (p: Payment) => void;
}) {
  const amt       = getAmount(b);
  const isPaid    = b.payment_status === 'paid';
  const isUnpaid  = b.payment_status === 'unpaid';
  const isFree    = amt === 0;

  return (
    <div className="bg-dark-elevation rounded-xl border border-copper/15 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-copper truncate">{getRef(b)}</span>
        <Badge status={isFree ? 'paid' : b.payment_status} />
      </div>
      <p className="text-sm font-medium text-ivory-light truncate">{getEventTitle(b)}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div>
          <span className="text-muted-text block">Ticket</span>
          <span className="text-ivory-light capitalize">{getTicket(b)}</span>
        </div>
        <div>
          <span className="text-muted-text block">Amount</span>
          <span className="font-semibold text-ivory-light">{isFree ? 'Free' : `${amt.toLocaleString()} RWF`}</span>
        </div>
        <div>
          <span className="text-muted-text block">Qty</span>
          <span className="text-ivory-light">{b.quantity ?? 1}</span>
        </div>
        <div>
          <span className="text-muted-text block">Date</span>
          <span className="text-ivory-light">{formatDate(b.created_at)}</span>
        </div>
        {b.payment?.transaction_id && (
          <div className="col-span-2">
            <span className="text-muted-text block">Transaction</span>
            <span className="font-mono text-ivory-light text-xs">{b.payment.transaction_id}</span>
          </div>
        )}
        {b.payment?.receipt_number && (
          <div className="col-span-2">
            <span className="text-muted-text block">Receipt</span>
            <span className="font-mono text-ivory-light">{b.payment.receipt_number}</span>
          </div>
        )}
      </div>

      {isClient && isUnpaid && !isFree && (
        <button
          onClick={() => onPay(b)}
          className="w-full py-2 text-xs text-white rounded-lg font-semibold hover:opacity-90 transition-opacity bg-gradient-to-br from-copper to-copper-light"
        >
          💳 Pay Now
        </button>
      )}
      {isAdmin && isPaid && b.payment && (
        <button
          onClick={() => onRefund(b.payment!)}
          className="w-full py-2 text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg font-medium transition-colors"
        >
          Refund
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Payments() {
  const { user }  = useAuth();
  const { toast } = useToast();
  const isAdmin   = user?.role === 'admin';
  const isClient  = user?.role === 'client';

  const [bookings,      setBookings]      = useState<Booking[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [payTarget,     setPayTarget]     = useState<Booking | null>(null);
  const [payMethod,     setPayMethod]     = useState('simulated');
  const [refundTarget,  setRefundTarget]  = useState<Payment | null>(null);
  const [refundForm,    setRefundForm]    = useState({ reason: '', amount: '' });
  const [actionLoading, setActionLoading] = useState(false);

  // ── KEY FIX: fetch BOOKINGS not payments ──────────────────────────────────
  // Old version used paymentsApi.list() which only returns records AFTER
  // payment is made — so unpaid bookings were invisible.
  // Now we fetch bookings which always have a payment_status field.
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { per_page: 50};
      if (statusFilter) params.payment_status = statusFilter;

      const res = isClient
        ? await bookingsApi.myBookings(params)
        : await bookingsApi.list(params);

      const data = res.data;
      const list: Booking[] = Array.isArray(data)
        ? data
        : data?.bookings ?? data?.items ?? [];

      // Only show non-cancelled bookings
      setBookings(list.filter(b => b.status !== 'cancelled'));
    } catch {
      setBookings([]);
      toast({ title: 'Failed to load payment data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [isClient, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalPaid     = bookings.filter(b => b.payment_status === 'paid').reduce((s, b) => s + getAmount(b), 0);
  const totalUnpaid   = bookings.filter(b => b.payment_status === 'unpaid').reduce((s, b) => s + getAmount(b), 0);
  const totalRefunded = bookings.filter(b => ['refunded','partially_refunded'].includes(b.payment_status)).reduce((s, b) => s + getAmount(b), 0);

  // ── Search ────────────────────────────────────────────────────────────────
  const filtered = bookings.filter(b => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      getRef(b).toLowerCase().includes(term) ||
      getEventTitle(b).toLowerCase().includes(term)
    );
  });

  // ── Pay ───────────────────────────────────────────────────────────────────
  const handlePay = async () => {
    if (!payTarget) return;
    setActionLoading(true);
    try {
      await paymentsApi.pay(payTarget.id, payMethod);
      toast({ title: '✅ Payment successful!' });
      setPayTarget(null);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Payment failed', description: err.response?.data?.detail ?? err.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Refund ────────────────────────────────────────────────────────────────
  const handleRefund = async () => {
    if (!refundTarget || !refundForm.reason.trim()) {
      toast({ title: 'Reason is required', variant: 'destructive' });
      return;
    }
    setActionLoading(true);
    try {
      await paymentsApi.refund(refundTarget.id, {
        reason: refundForm.reason,
        amount: refundForm.amount ? parseFloat(refundForm.amount) : undefined,
      });
      toast({ title: '✅ Refund processed' });
      setRefundTarget(null);
      setRefundForm({ reason: '', amount: '' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Refund failed', description: err.response?.data?.detail ?? err.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ivory-light flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-copper" /> Payments
        </h1>
        <p className="text-sm text-muted-text mt-1">
          {isClient ? 'Your bookings and payment status' : 'All booking payments across the platform'}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Paid (RWF)',    value: totalPaid,     icon: TrendingUp, color: 'bg-green-500/20 text-green-400',   count: bookings.filter(b => b.payment_status === 'paid').length },
          { label: 'Pending (RWF)',       value: totalUnpaid,   icon: Clock,      color: 'bg-yellow-500/20 text-yellow-400', count: bookings.filter(b => b.payment_status === 'unpaid').length },
          { label: 'Refunded (RWF)',      value: totalRefunded, icon: RefreshCw,  color: 'bg-purple-500/20 text-purple-400', count: bookings.filter(b => ['refunded','partially_refunded'].includes(b.payment_status)).length },
        ].map(({ label, value, icon: Icon, color, count }) => (
          <div key={label} className="bg-dark-card rounded-2xl border border-copper/20 p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-text">{label}</p>
              <p className="text-lg font-bold text-ivory-light mt-0.5">
                {value === 0 ? '—' : `${value.toLocaleString()} RWF`}
              </p>
              <p className="text-xs text-muted-text">{count} booking{count !== 1 ? 's' : ''}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex-1 min-w-[180px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Booking ref or event name…"
            className={`${INPUT_CLS} w-full pl-9`}
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={INPUT_CLS}>
          <option value="">All Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
        </select>
        <button
          onClick={fetchData}
          className="px-4 py-2.5 text-white text-sm rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition-opacity bg-gradient-to-br from-copper to-copper-light"
        >
          <Filter className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Table / Cards */}
      <div className="bg-dark-card rounded-2xl border border-copper/20 overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <DollarSign className="w-12 h-12 text-copper/30" />
            <p className="text-base font-medium text-ivory-light">No payments found</p>
            <p className="text-sm text-muted-text">
              {isClient ? 'Book an event to see your payment status here' : 'No bookings match your filters'}
            </p>
          </div>
        ) : (
          <>
            {/* ── Mobile: stacked cards ── */}
            <div className="md:hidden divide-y divide-copper/10 p-3 space-y-3">
              {filtered.map(b => (
                <BookingPaymentCard
                  key={b.id} b={b}
                  isClient={isClient} isAdmin={isAdmin}
                  onPay={b => { setPayTarget(b); setPayMethod('simulated'); }}
                  onRefund={p => { setRefundTarget(p); setRefundForm({ reason: '', amount: '' }); }}
                />
              ))}
            </div>

            {/* ── Desktop: table ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-copper/15 bg-black/20">
                    {['Booking Ref', 'Event', 'Ticket', 'Qty', 'Amount (RWF)', 'Status', 'Transaction ID', 'Date', 'Action'].map(h => (
                      <th key={h} className="text-left py-3 px-3 text-xs font-medium text-muted-text whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(b => {
                    const amt      = getAmount(b);
                    const isPaid   = b.payment_status === 'paid';
                    const isUnpaid = b.payment_status === 'unpaid';
                    const isFree   = amt === 0;

                    return (
                      <tr
                        key={b.id}
                        className={`border-b border-copper/8 hover:bg-copper/4 transition-colors ${isUnpaid && !isFree ? 'border-l-2 border-l-yellow-500/50' : ''}`}
                      >
                        {/* Ref */}
                        <td className="py-3 px-3 font-mono text-xs text-copper whitespace-nowrap">{getRef(b)}</td>

                        {/* Event */}
                        <td className="py-3 px-3 text-ivory-light text-xs max-w-[130px] truncate">{getEventTitle(b)}</td>

                        {/* Ticket */}
                        <td className="py-3 px-3 text-muted-text text-xs capitalize">{getTicket(b)}</td>

                        {/* Qty */}
                        <td className="py-3 px-3 text-ivory-light text-xs text-center">{b.quantity ?? 1}</td>

                        {/* Amount */}
                        <td className="py-3 px-3 font-semibold text-xs whitespace-nowrap">
                          <span className={isFree ? 'text-green-400' : 'text-copper'}>
                            {isFree ? 'Free' : `${amt.toLocaleString()} RWF`}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            {isUnpaid && !isFree && <Clock className="w-3 h-3 text-yellow-400 shrink-0" />}
                            {(isPaid || isFree)   && <CheckCircle className="w-3 h-3 text-green-400 shrink-0" />}
                            <Badge status={isFree ? 'paid' : b.payment_status} />
                          </div>
                        </td>

                        {/* Transaction */}
                        <td className="py-3 px-3 text-muted-text text-xs font-mono">
                          {b.payment?.transaction_id ?? (isPaid ? b.payment?.receipt_number ?? '—' : '—')}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-3 text-muted-text text-xs whitespace-nowrap">{formatDate(b.created_at)}</td>

                        {/* Action */}
                        <td className="py-3 px-3">
                          {isClient && isUnpaid && !isFree && (
                            <button
                              onClick={() => { setPayTarget(b); setPayMethod('simulated'); }}
                              className="px-3 py-1.5 text-xs text-white rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-1 whitespace-nowrap bg-gradient-to-br from-copper to-copper-light"
                            >
                              <CreditCard className="w-3 h-3" /> Pay Now
                            </button>
                          )}
                          {isAdmin && isPaid && b.payment && (
                            <button
                              onClick={() => { setRefundTarget(b.payment!); setRefundForm({ reason: '', amount: '' }); }}
                              className="px-2.5 py-1 text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg font-medium transition-colors"
                            >
                              Refund
                            </button>
                          )}
                          {isPaid && !isAdmin && (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Paid
                            </span>
                          )}
                          {isFree && (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Free
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Pay Modal ─────────────────────────────────────────────────────────── */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative bg-dark-card rounded-2xl border border-copper/20 w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-ivory-light flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-copper" /> Complete Payment
              </h3>
              <button onClick={() => setPayTarget(null)} className="text-muted-text hover:text-ivory-light transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Booking summary */}
            <div className="bg-dark-elevation rounded-xl p-4 mb-5 border border-copper/15">
              <div className="flex items-start gap-3 mb-3">
                <Ticket className="w-5 h-5 text-copper shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-ivory-light">{getEventTitle(payTarget)}</p>
                  <p className="text-xs text-muted-text mt-0.5 font-mono">{getRef(payTarget)}</p>
                  <p className="text-xs text-muted-text capitalize mt-0.5">{getTicket(payTarget)} × {payTarget.quantity ?? 1}</p>
                </div>
              </div>
              <div className="border-t border-copper/10 pt-3 flex justify-between items-center">
                <span className="text-sm text-muted-text">Amount due</span>
                <span className="text-2xl font-extrabold text-copper">
                  {getAmount(payTarget).toLocaleString()} RWF
                </span>
              </div>
            </div>

            <p className="text-xs font-medium text-muted-text mb-3">Select payment method:</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {PAY_METHODS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setPayMethod(value)}
                  className={`py-2.5 text-sm rounded-xl border transition-colors ${
                    payMethod === value
                      ? 'border-copper text-copper bg-copper/10'
                      : 'border-copper/20 text-muted-text hover:border-copper/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPayTarget(null)}
                className="flex-1 py-2.5 text-sm border border-copper/20 text-ivory-light rounded-xl hover:bg-copper/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePay}
                disabled={actionLoading}
                className="flex-1 py-2.5 text-sm text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2 bg-gradient-to-br from-copper to-copper-light"
              >
                {actionLoading ? <><Spinner small /> Processing…</> : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Refund Modal ──────────────────────────────────────────────────────── */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative bg-dark-card rounded-2xl border border-copper/20 w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-ivory-light flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" /> Process Refund
              </h3>
              <button onClick={() => setRefundTarget(null)} className="text-muted-text hover:text-ivory-light transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-dark-elevation rounded-xl p-4 mb-5 border border-copper/15">
              <p className="text-xs text-muted-text">Transaction</p>
              <p className="text-sm font-mono text-ivory-light mt-0.5">{refundTarget.transaction_id}</p>
              <p className="text-xl font-bold text-copper mt-2">
                {Number(refundTarget.amount ?? 0).toLocaleString()} RWF
              </p>
            </div>
            <div className="space-y-4 mb-5">
              <div>
                <label className="text-xs font-medium text-muted-text mb-1.5 block">
                  Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={refundForm.reason}
                  onChange={e => setRefundForm(f => ({ ...f, reason: e.target.value }))}
                  rows={3}
                  placeholder="Reason for refund…"
                  className="w-full px-3 py-2.5 border border-copper/20 rounded-xl focus:border-copper focus:outline-none text-sm bg-dark-input text-ivory-light placeholder-muted-text resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-text mb-1.5 block">
                  Partial amount (RWF) — leave blank for full refund
                </label>
                <input
                  type="number"
                  min={1}
                  max={Number(refundTarget.amount)}
                  value={refundForm.amount}
                  onChange={e => setRefundForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder={`Max: ${Number(refundTarget.amount ?? 0).toLocaleString()} RWF`}
                  className={`${INPUT_CLS} w-full`}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setRefundTarget(null)}
                className="flex-1 py-2.5 text-sm border border-copper/20 text-ivory-light rounded-xl hover:bg-copper/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={actionLoading}
                className="flex-1 py-2.5 text-sm bg-purple-500 text-white rounded-xl hover:bg-purple-600 font-medium disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {actionLoading ? <><Spinner small /> Processing…</> : 'Process Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}