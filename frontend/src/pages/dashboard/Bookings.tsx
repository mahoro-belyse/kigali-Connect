import { useState, useEffect, useCallback } from 'react';
import {
  Eye, CheckCircle, XCircle, Search,
  Ticket, Filter, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { bookingsApi, eventsApi } from '../../api/client';
import { useToast } from '../../components/ui/use-toast';
import QRTicketModal from '../../components/QRTicketModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Booking {
  id: number;
  booking_reference?: string;
  status: string;
  payment_status: string;
  quantity: number;
  total_amount?: number | string;
  checked_in?: boolean;
  created_at?: string;
  qr_code?: string;
  attendee_name?: string;
  attendee_email?: string;
  event?: { id?: number; title?: string; start_datetime?: string; venue_name?: string; city?: string };
  event_title?: string;
  ticket_tier?: { name?: string };
  ticket_type_name?: string;
  user?: { full_name?: string };
}

interface EventOption {
  id: number;
  title: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-500/15 text-green-400 border-green-500/30',
  pending:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
  attended:  'bg-blue-500/15 text-blue-400 border-blue-500/30',
  paid:      'bg-green-500/15 text-green-400 border-green-500/30',
  unpaid:    'bg-red-500/15 text-red-400 border-red-500/30',
  refunded:  'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_COLORS[status] ?? 'bg-gray-500/15 text-gray-400 border-gray-500/30'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function Spinner() {
  return <div className="w-8 h-8 border-2 border-[rgba(184,115,51,0.3)] border-t-[#b87333] rounded-full animate-spin" />;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-RW', {
    month: 'short', day: '2-digit', year: 'numeric',
  });
}

// Safe field resolvers — handles both flat and nested API shapes
const getRef       = (b: Booking) => b.booking_reference ?? `#${b.id}`;
const getEventTitle = (b: Booking) => b.event?.title ?? b.event_title ?? '—';
const getTicketName = (b: Booking) => b.ticket_tier?.name ?? b.ticket_type_name ?? '—';
const getAttendeeName = (b: Booking) => b.user?.full_name ?? b.attendee_name ?? '—';
const getAmount    = (b: Booking) => Number(b.total_amount ?? 0).toLocaleString();

const PER_PAGE = 10;

const INPUT_CLS = `px-3 py-2.5 border border-[rgba(184,115,51,0.2)] rounded-xl
  focus:border-[#b87333] focus:outline-none focus:ring-1 focus:ring-[rgba(184,115,51,0.3)]
  text-sm bg-[#2a2a2a] text-[#f5f0e8] transition-colors`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function Bookings() {
  const { user }  = useAuth();
  const { toast } = useToast();
  const isClient  = user?.role === 'client';

  const [bookings,      setBookings]      = useState<Booking[]>([]);
  const [events,        setEvents]        = useState<EventOption[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [eventFilter,   setEventFilter]   = useState('');
  const [page,          setPage]          = useState(1);
  const [confirm,       setConfirm]       = useState<Booking | null>(null);
  const [cancelling,    setCancelling]    = useState(false);
  const [qrBooking,     setQrBooking]     = useState<Booking | null>(null);

  // ── Fetch bookings ──────────────────────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        ...(statusFilter  && { status:         statusFilter  }),
        ...(paymentFilter && { payment_status: paymentFilter }),
        ...(eventFilter   && { event_id:        eventFilter   }),
        per_page: 50, // fetch all, we paginate client-side after search filter
      };

      const res = isClient
        ? await bookingsApi.myBookings(params)
        : await bookingsApi.list(params);

      const data = res.data;
      const list: Booking[] = Array.isArray(data)
        ? data
        : data?.bookings ?? data?.items ?? [];
      setBookings(list);
    } catch {
      setBookings([]);
      toast({ title: 'Failed to load bookings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [isClient, statusFilter, paymentFilter, eventFilter]);

  // ── Fetch events for filter dropdown (admin/manager) ─────────────────────
  useEffect(() => {
    if (!isClient) {
      eventsApi.list({ per_page: 100 })
        .then((res) => {
          const d = res.data;
          setEvents(Array.isArray(d) ? d : d?.events ?? d?.items ?? []);
        })
        .catch(() => {});
    }
  }, [isClient]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // ── Check-in ───────────────────────────────────────────────────────────────
  const handleCheckIn = async (b: Booking) => {
    try {
      await bookingsApi.checkIn(getRef(b));
      toast({ title: '✅ Checked in successfully!' });
      fetchBookings();
    } catch (err: any) {
      toast({
        title: 'Check-in failed',
        description: err.response?.data?.detail ?? err.message ?? 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // ── Cancel booking ─────────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!confirm) return;
    setCancelling(true);
    try {
      await bookingsApi.cancel(confirm.id);
      toast({ title: 'Booking cancelled successfully' });
      setConfirm(null);
      fetchBookings();
    } catch (err: any) {
      toast({
        title: 'Cancellation failed',
        description: err.response?.data?.detail ?? err.message ?? 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  };

  // ── Client-side search + pagination ───────────────────────────────────────
  const filtered = bookings.filter((b) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      getRef(b).toLowerCase().includes(term) ||
      getAttendeeName(b).toLowerCase().includes(term) ||
      getEventTitle(b).toLowerCase().includes(term)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Reset to page 1 when filters/search change
  useEffect(() => { setPage(1); }, [search, statusFilter, paymentFilter, eventFilter]);

  // ── Can cancel? — only if not yet cancelled/attended ──────────────────────
  const canCancel = (b: Booking) =>
    !['cancelled', 'attended', 'no_show'].includes(b.status);

  // ── Can check-in? — only for confirmed + paid ─────────────────────────────
  const canCheckIn = (b: Booking) =>
    b.status === 'confirmed' && b.payment_status === 'paid' && !b.checked_in;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f0e8] flex items-center gap-2">
            <Ticket className="w-6 h-6 text-[#b87333]" />
            {isClient ? 'My Bookings' : 'All Bookings'}
          </h1>
          <p className="text-sm text-[#9a8f82] mt-1">
            {isClient ? 'Your event bookings and tickets' : 'Manage all event bookings across the platform'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* Search */}
        <div className="flex-1 min-w-[180px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Reference, attendee, or event..."
            className={`${INPUT_CLS} w-full pl-9`}
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={INPUT_CLS}
        >
          <option value="">All Statuses</option>
          {['confirmed', 'pending', 'cancelled', 'attended', 'no_show'].map((s) => (
            <option key={s} value={s} className="capitalize">{s.replace('_', ' ')}</option>
          ))}
        </select>

        {/* Payment filter */}
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className={INPUT_CLS}
        >
          <option value="">All Payments</option>
          {['paid', 'unpaid', 'refunded', 'partially_refunded'].map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>

        {/* Event filter — admin/manager only */}
        {!isClient && events.length > 0 && (
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className={INPUT_CLS}
          >
            <option value="">All Events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        )}

        <button
          onClick={fetchBookings}
          className="px-4 py-2.5 text-white text-sm rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
        >
          <Filter className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Table card */}
      <div className="bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <Ticket className="w-12 h-12 text-[#b87333]/30" />
            <p className="text-base font-medium text-[#f5f0e8]">No bookings found</p>
            <p className="text-sm text-[#9a8f82]">Try adjusting your filters</p>
            {isClient && (
              <a href="/events" className="text-[#b87333] text-sm hover:underline mt-1">
                Browse Events →
              </a>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(184,115,51,0.15)] bg-black/20">
                  {[
                    'Reference', 'Attendee', 'Event', 'Ticket', 'Qty',
                    'Amount (RWF)', 'Status', 'Payment', 'Checked In', 'Date', 'Actions',
                  ].map((h) => (
                    <th key={h} className="text-left py-3 px-3 text-xs font-medium text-[#9a8f82] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-[rgba(184,115,51,0.08)] hover:bg-[rgba(184,115,51,0.04)] transition-colors"
                  >
                    {/* Reference */}
                    <td className="py-3 px-3 font-mono text-xs text-[#b87333] whitespace-nowrap">
                      {getRef(b)}
                    </td>

                    {/* Attendee */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[rgba(184,115,51,0.2)] flex items-center justify-center text-xs font-bold text-[#b87333] shrink-0">
                          {getAttendeeName(b).charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[#f5f0e8] text-xs truncate max-w-[100px]">
                          {getAttendeeName(b)}
                        </span>
                      </div>
                    </td>

                    {/* Event */}
                    <td className="py-3 px-3 text-[#f5f0e8] text-xs max-w-[130px] truncate">
                      {getEventTitle(b)}
                    </td>

                    {/* Ticket type */}
                    <td className="py-3 px-3 text-[#9a8f82] text-xs capitalize">
                      {getTicketName(b)}
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-3 text-[#f5f0e8] text-xs text-center">
                      {b.quantity ?? 1}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-3 text-[#b87333] font-semibold text-xs whitespace-nowrap">
                      {getAmount(b)} RWF
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3"><Badge status={b.status ?? 'pending'} /></td>

                    {/* Payment status */}
                    <td className="py-3 px-3"><Badge status={b.payment_status ?? 'unpaid'} /></td>

                    {/* Checked in */}
                    <td className="py-3 px-3 text-center text-base">
                      {b.checked_in ? '✅' : '❌'}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-3 text-[#9a8f82] text-xs whitespace-nowrap">
                      {formatDate(b.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        {/* View QR ticket */}
                        <button
                          onClick={() => setQrBooking(b)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                          title="View Ticket"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Check-in — admin/manager only */}
                        {!isClient && canCheckIn(b) && (
                          <button
                            onClick={() => handleCheckIn(b)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-400 hover:bg-green-400/10 transition-colors"
                            title="Check In"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Cancel */}
                        {canCancel(b) && (
                          <button
                            onClick={() => setConfirm(b)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Cancel Booking"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm border border-[rgba(184,115,51,0.2)] text-[#9a8f82] rounded-lg disabled:opacity-40 hover:border-[#b87333] transition-colors"
          >
            Prev
          </button>
          <span className="text-sm text-[#9a8f82] px-2">
            Page {page} of {totalPages} ({filtered.length} total)
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm border border-[rgba(184,115,51,0.2)] text-[#9a8f82] rounded-lg disabled:opacity-40 hover:border-[#b87333] transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* QR Ticket Modal */}
      {qrBooking && (
        <QRTicketModal booking={qrBooking} onClose={() => setQrBooking(null)} />
      )}

      {/* Cancel Confirm Dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !cancelling && setConfirm(null)}
          />
          <div className="relative bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] w-full max-w-sm p-6 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="font-bold text-[#f5f0e8] mb-2 text-lg">Cancel Booking?</h3>
            <p className="text-sm text-[#9a8f82] mb-5 leading-relaxed">
              Cancel booking{' '}
              <span className="text-[#b87333] font-mono font-semibold">
                {getRef(confirm)}
              </span>
              ? Seats will be released. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                disabled={cancelling}
                className="flex-1 py-2.5 text-sm border border-[rgba(184,115,51,0.2)] text-[#f5f0e8] rounded-xl hover:bg-[rgba(184,115,51,0.05)] transition-colors disabled:opacity-50"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 font-medium transition-colors disabled:opacity-50"
              >
                {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
