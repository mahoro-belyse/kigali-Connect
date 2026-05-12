import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, CreditCard, TrendingUp, RefreshCw,
  Receipt, AlertTriangle, Search, Filter, X,
} from 'lucide-react';
import { paymentsApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Payment {
  id: number;
  transaction_id?: string;
  booking_id?: number;
  booking_reference?: string;
  event_title?: string;
  amount?: number | string;
  method?: string;
  status: string;
  receipt_number?: string;
  receipt_url?: string;
  created_at?: string;
  booking?: { booking_reference?: string; event?: { title?: string } };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  paid:                 'bg-green-500/15 text-green-400 border-green-500/30',
  unpaid:               'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  pending:              'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  refunded:             'bg-purple-500/15 text-purple-400 border-purple-500/30',
  partially_refunded:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
  failed:               'bg-red-500/15 text-red-400 border-red-500/30',
};

function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_COLORS[status] ?? 'bg-gray-500/15 text-gray-400 border-gray-500/30'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function Spinner({ small = false }: { small?: boolean }) {
  return (
    <div className={`${small ? 'w-4 h-4 border-2' : 'w-8 h-8 border-2'} border-[rgba(184,115,51,0.3)] border-t-[#b87333] rounded-full animate-spin`} />
  );
}

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-RW', { month: 'short', day: '2-digit', year: 'numeric' });
}

const getBookingRef  = (p: Payment) => p.booking?.booking_reference ?? p.booking_reference ?? '—';
const getEventTitle  = (p: Payment) => p.booking?.event?.title ?? p.event_title ?? '—';
const getAmount      = (p: Payment) => Number(p.amount ?? 0).toLocaleString();
const getTxnId       = (p: Payment) => p.transaction_id ?? `#${p.id}`;

const INPUT_CLS = `px-3 py-2.5 border border-[rgba(184,115,51,0.2)] rounded-xl
  focus:border-[#b87333] focus:outline-none focus:ring-1 focus:ring-[rgba(184,115,51,0.3)]
  text-sm bg-[#2a2a2a] text-[#f5f0e8] placeholder-[#9a8f82] transition-colors`;

const PAY_METHODS = [
  { value: 'card',         label: '💳 Card'         },
  { value: 'cash',         label: '💵 Cash'         },
  { value: 'mobile_money', label: '📱 Mobile Money' },
  { value: 'simulated',    label: '🧪 Simulated'    },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function Payments() {
  const { user }  = useAuth();
  const { toast } = useToast();
  const isAdmin   = user?.role === 'admin';
  const isClient  = user?.role === 'client';

  const [payments,      setPayments]      = useState<Payment[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [refundTarget,  setRefundTarget]  = useState<Payment | null>(null);
  const [refundForm,    setRefundForm]    = useState({ reason: '', amount: '' });
  const [payTarget,     setPayTarget]     = useState<Payment | null>(null);
  const [payMethod,     setPayMethod]     = useState<string>('simulated');
  const [actionLoading, setActionLoading] = useState(false);

  // ── Fetch payments ────────────────────────────────────────────────────────
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        per_page: 50,
        ...(statusFilter && { status: statusFilter }),
      };
      const res  = await paymentsApi.list(params);
      const data = res.data;
      const list: Payment[] = Array.isArray(data)
        ? data
        : data?.payments ?? data?.items ?? [];
      setPayments(list);
    } catch {
      setPayments([]);
      toast({ title: 'Failed to load payments', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // ── Computed summary totals ───────────────────────────────────────────────
  const totalRevenue  = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalPaid     = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalRefunded = payments.filter((p) => ['refunded','partially_refunded'].includes(p.status))
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);

  // ── Client-side search filter ─────────────────────────────────────────────
  const filtered = payments.filter((p) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      getTxnId(p).toLowerCase().includes(term) ||
      getBookingRef(p).toLowerCase().includes(term) ||
      getEventTitle(p).toLowerCase().includes(term)
    );
  });

  // ── Process payment (client) ──────────────────────────────────────────────
  const handlePay = async () => {
    if (!payTarget?.booking_id) {
      toast({ title: 'No booking ID found', variant: 'destructive' });
      return;
    }
    setActionLoading(true);
    try {
      await paymentsApi.pay(payTarget.booking_id, payMethod);
      toast({ title: '✅ Payment processed successfully!' });
      setPayTarget(null);
      fetchPayments();
    } catch (err: any) {
      toast({
        title: 'Payment failed',
        description: err.response?.data?.detail ?? err.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Process refund (admin) ────────────────────────────────────────────────
  const handleRefund = async () => {
    if (!refundForm.reason.trim()) {
      toast({ title: 'Refund reason is required', variant: 'destructive' });
      return;
    }
    if (!refundTarget) return;
    setActionLoading(true);
    try {
      await paymentsApi.refund(refundTarget.id, {
        reason: refundForm.reason,
        amount: refundForm.amount ? parseFloat(refundForm.amount) : undefined,
      });
      toast({ title: '✅ Refund processed successfully' });
      setRefundTarget(null);
      fetchPayments();
    } catch (err: any) {
      toast({
        title: 'Refund failed',
        description: err.response?.data?.detail ?? err.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f5f0e8] flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-[#b87333]" /> Payments
        </h1>
        <p className="text-sm text-[#9a8f82] mt-1">
          {isClient ? 'Your payment history' : 'Track all transactions and revenue'}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Revenue (RWF)',  value: `${totalRevenue.toLocaleString()} RWF`,  icon: DollarSign,  color: 'bg-[rgba(184,115,51,0.2)] text-[#b87333]' },
          { label: 'Total Paid (RWF)',     value: `${totalPaid.toLocaleString()} RWF`,     icon: TrendingUp,  color: 'bg-green-500/20 text-green-400'           },
          { label: 'Total Refunded (RWF)', value: `${totalRefunded.toLocaleString()} RWF`, icon: RefreshCw,   color: 'bg-purple-500/20 text-purple-400'         },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[#9a8f82]">{label}</p>
              <p className="text-lg font-bold text-[#f5f0e8] mt-0.5">{value}</p>
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Transaction ID or booking ref…"
            className={`${INPUT_CLS} w-full pl-9`}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={INPUT_CLS}>
          <option value="">All Statuses</option>
          {['paid','unpaid','refunded','partially_refunded','failed'].map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <button
          onClick={fetchPayments}
          className="px-4 py-2.5 text-white text-sm rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
        >
          <Filter className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <DollarSign className="w-12 h-12 text-[#b87333]/30" />
            <p className="text-base font-medium text-[#f5f0e8]">No payments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(184,115,51,0.15)] bg-black/20">
                  {['Transaction ID','Booking Ref','Event','Amount (RWF)','Method','Status','Receipt','Date','Actions'].map((h) => (
                    <th key={h} className="text-left py-3 px-3 text-xs font-medium text-[#9a8f82] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-[rgba(184,115,51,0.08)] hover:bg-[rgba(184,115,51,0.04)] transition-colors">
                    <td className="py-3 px-3 font-mono text-xs text-[#b87333] whitespace-nowrap">{getTxnId(p)}</td>
                    <td className="py-3 px-3 font-mono text-xs text-[#9a8f82]">{getBookingRef(p)}</td>
                    <td className="py-3 px-3 text-[#f5f0e8] text-xs max-w-[120px] truncate">{getEventTitle(p)}</td>
                    <td className="py-3 px-3 text-[#f5f0e8] font-semibold text-xs whitespace-nowrap">{getAmount(p)} RWF</td>
                    <td className="py-3 px-3 text-[#9a8f82] text-xs capitalize">{(p.method ?? 'simulated').replace('_', ' ')}</td>
                    <td className="py-3 px-3"><Badge status={p.status ?? 'unpaid'} /></td>
                    <td className="py-3 px-3">
                      {p.receipt_number ? (
                        <span className="text-xs text-[#9a8f82] font-mono">{p.receipt_number}</span>
                      ) : p.receipt_url ? (
                        <a href={p.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                          <Receipt className="w-3.5 h-3.5" /> View
                        </a>
                      ) : (
                        <span className="text-xs text-[#9a8f82]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#9a8f82] text-xs whitespace-nowrap">{formatDate(p.created_at)}</td>
                    <td className="py-3 px-3">
                      {isClient && p.status === 'unpaid' && (
                        <button
                          onClick={() => setPayTarget(p)}
                          className="px-2.5 py-1 text-xs text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                          style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
                        >
                          Pay Now
                        </button>
                      )}
                      {isAdmin && p.status === 'paid' && (
                        <button
                          onClick={() => { setRefundTarget(p); setRefundForm({ reason: '', amount: '' }); }}
                          className="px-2.5 py-1 text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg font-medium transition-colors"
                        >
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pay Modal ───────────────────────────────────────────────────────── */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#f5f0e8] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#b87333]" /> Pay Now
              </h3>
              <button onClick={() => setPayTarget(null)} className="text-gray-400 hover:text-[#f5f0e8] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#1a1a1a] rounded-xl p-4 mb-5 border border-[rgba(184,115,51,0.15)]">
              <p className="text-xs text-[#9a8f82] mb-1">Amount due</p>
              <p className="text-2xl font-extrabold text-[#b87333]">
                {getAmount(payTarget)} RWF
              </p>
              <p className="text-xs text-[#9a8f82] mt-1">Booking: {getBookingRef(payTarget)}</p>
            </div>

            <p className="text-xs font-medium text-[#9a8f82] mb-3">Select payment method:</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {PAY_METHODS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setPayMethod(value)}
                  className={`py-2.5 text-sm rounded-xl border transition-colors ${
                    payMethod === value
                      ? 'border-[#b87333] text-[#b87333] bg-[rgba(184,115,51,0.1)]'
                      : 'border-[rgba(184,115,51,0.2)] text-[#9a8f82] hover:border-[rgba(184,115,51,0.4)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPayTarget(null)}
                className="flex-1 py-2.5 text-sm border border-[rgba(184,115,51,0.2)] text-[#f5f0e8] rounded-xl hover:bg-[rgba(184,115,51,0.05)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePay}
                disabled={actionLoading}
                className="flex-1 py-2.5 text-sm text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
              >
                {actionLoading ? <><Spinner small /> Processing…</> : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Refund Modal ─────────────────────────────────────────────────────── */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[#f5f0e8] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" /> Process Refund
              </h3>
              <button onClick={() => setRefundTarget(null)} className="text-gray-400 hover:text-[#f5f0e8] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#1a1a1a] rounded-xl p-4 mb-5 border border-[rgba(184,115,51,0.15)]">
              <p className="text-xs text-[#9a8f82]">Payment amount</p>
              <p className="text-xl font-bold text-[#b87333]">{getAmount(refundTarget)} RWF</p>
              <p className="text-xs text-[#9a8f82] mt-1">TXN: {getTxnId(refundTarget)}</p>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">
                  Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={refundForm.reason}
                  onChange={(e) => setRefundForm((f) => ({ ...f, reason: e.target.value }))}
                  rows={3}
                  placeholder="Reason for refund…"
                  className={`w-full px-3 py-2.5 border border-[rgba(184,115,51,0.2)] rounded-xl
                    focus:border-[#b87333] focus:outline-none text-sm bg-[#2a2a2a]
                    text-[#f5f0e8] placeholder-[#9a8f82] resize-none`}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">
                  Partial amount (RWF) — leave blank for full refund
                </label>
                <input
                  type="number"
                  min={1}
                  max={Number(refundTarget.amount)}
                  value={refundForm.amount}
                  onChange={(e) => setRefundForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder={`Max: ${getAmount(refundTarget)} RWF`}
                  className={`${INPUT_CLS} w-full`}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRefundTarget(null)}
                className="flex-1 py-2.5 text-sm border border-[rgba(184,115,51,0.2)] text-[#f5f0e8] rounded-xl hover:bg-[rgba(184,115,51,0.05)] transition-colors"
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
