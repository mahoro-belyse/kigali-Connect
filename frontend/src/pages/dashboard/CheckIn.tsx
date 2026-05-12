import { useState, useEffect, useRef } from 'react';
import { QrCode, CheckCircle, XCircle, Search, Users, RefreshCw } from 'lucide-react';
import { bookingsApi, eventsApi } from '../../api/client';
import { useToast } from '../../components/ui/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventOption {
  id: number;
  title: string;
  start_datetime?: string;
  venue_name?: string;
  city?: string;
}

interface CheckInResult {
  id: number;
  booking_reference?: string;
  attendee_name?: string;
  attendee_email?: string;
  quantity?: number;
  status?: string;
  qr_code?: string;
  checked_in_at?: string;
  event?: { title?: string; start_datetime?: string; venue_name?: string };
  event_title?: string;
  ticket_tier?: { name?: string };
  ticket_type_name?: string;
  user?: { full_name?: string };
}

interface EventStats {
  attended: number;
  confirmed: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Spinner({ small = false }: { small?: boolean }) {
  return (
    <div className={`${small ? 'w-4 h-4 border-2' : 'w-6 h-6 border-2'} border-[rgba(184,115,51,0.3)] border-t-[#b87333] rounded-full animate-spin`} />
  );
}

const getAttendeeName = (r: CheckInResult) =>
  r.user?.full_name ?? r.attendee_name ?? '—';
const getEventTitle  = (r: CheckInResult) =>
  r.event?.title ?? r.event_title ?? '—';
const getTicketName  = (r: CheckInResult) =>
  r.ticket_tier?.name ?? r.ticket_type_name ?? '—';

const INPUT_CLS = `w-full px-3 py-3 border border-[rgba(184,115,51,0.2)] rounded-xl
  focus:border-[#b87333] focus:outline-none focus:ring-1 focus:ring-[rgba(184,115,51,0.3)]
  text-sm bg-[#2a2a2a] text-[#f5f0e8] placeholder-[#9a8f82] transition-colors`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function CheckIn() {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [ref,           setRef]           = useState('');
  const [loading,       setLoading]       = useState(false);
  const [result,        setResult]        = useState<CheckInResult | null>(null);
  const [error,         setError]         = useState('');
  const [events,        setEvents]        = useState<EventOption[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [eventStats,    setEventStats]    = useState<EventStats | null>(null);
  const [statsLoading,  setStatsLoading]  = useState(false);

  // Auto-focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // ── Load events for stats dropdown ────────────────────────────────────────
  useEffect(() => {
    eventsApi.list({ per_page: 100, status: 'published' })
      .then((res) => {
        const d = res.data;
        setEvents(Array.isArray(d) ? d : d?.events ?? d?.items ?? []);
      })
      .catch(() => {});
  }, []);

  // ── Load event stats when event selected ─────────────────────────────────
  useEffect(() => {
    if (!selectedEvent) { setEventStats(null); return; }
    setStatsLoading(true);

    Promise.all([
      // Attended bookings count
      bookingsApi.list({ event_id: selectedEvent, status: 'attended', per_page: 1 })
        .catch(() => ({ data: { total: 0 } })),
      // Confirmed bookings count
      bookingsApi.list({ event_id: selectedEvent, status: 'confirmed', per_page: 1 })
        .catch(() => ({ data: { total: 0 } })),
    ]).then(([attendedRes, confirmedRes]) => {
      const attended  = attendedRes.data?.total  ?? 0;
      const confirmed = confirmedRes.data?.total ?? 0;
      setEventStats({ attended, confirmed });
    }).finally(() => setStatsLoading(false));
  }, [selectedEvent]);

  // ── Refresh stats after a check-in ───────────────────────────────────────
  const refreshStats = () => {
    if (!selectedEvent) return;
    setSelectedEvent((v) => v); // trigger useEffect re-run
  };

  // ── Handle check-in ───────────────────────────────────────────────────────
  const handleCheckIn = async () => {
    const trimmed = ref.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setResult(null);
    setError('');

    try {
      const res = await bookingsApi.checkIn(trimmed);
      setResult(res.data);
      setRef('');
      toast({ title: '✅ Checked in successfully!' });
      refreshStats();
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ??
        err.message ??
        'Booking not found or already checked in.';
      setError(msg);
      toast({ title: 'Check-in failed', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
      // Re-focus input so operator can scan next ticket immediately
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // ── Attendance percentage ─────────────────────────────────────────────────
  const attendancePercent =
    eventStats && eventStats.confirmed > 0
      ? Math.round((eventStats.attended / (eventStats.attended + eventStats.confirmed)) * 100)
      : 0;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f5f0e8] flex items-center gap-2">
          <QrCode className="w-6 h-6 text-[#b87333]" /> Check-In
        </h1>
        <p className="text-sm text-[#9a8f82] mt-1">
          Scan or type a booking reference to check in attendees at the door
        </p>
      </div>

      {/* ── Event stats card ─────────────────────────────────────────────── */}
      <div className="bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#f5f0e8] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#b87333]" /> Attendance Tracker
          </h2>
          {selectedEvent && (
            <button
              onClick={refreshStats}
              className="p-1.5 rounded-lg text-gray-400 hover:text-[#b87333] hover:bg-[rgba(184,115,51,0.1)] transition-colors"
              title="Refresh stats"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        <select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className={`w-full sm:w-96 px-3 py-2.5 border border-[rgba(184,115,51,0.2)] rounded-xl
            focus:border-[#b87333] focus:outline-none text-sm bg-[#2a2a2a] text-[#f5f0e8]`}
        >
          <option value="">Select an event to track attendance…</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>

        {selectedEvent && (
          <div className="mt-5">
            {statsLoading ? (
              <div className="flex items-center gap-3">
                <Spinner small />
                <span className="text-sm text-[#9a8f82]">Loading stats…</span>
              </div>
            ) : eventStats ? (
              <div className="space-y-4">
                {/* Counter display */}
                <div className="inline-flex items-center gap-6 px-6 py-4 rounded-2xl border border-[rgba(184,115,51,0.2)] bg-black/20">
                  <div className="text-center">
                    <p className="text-xs text-[#9a8f82] mb-1">Checked In</p>
                    <p className="text-4xl font-extrabold text-[#b87333]">
                      {eventStats.attended}
                    </p>
                  </div>
                  <div className="text-3xl font-light text-[#9a8f82]">/</div>
                  <div className="text-center">
                    <p className="text-xs text-[#9a8f82] mb-1">Remaining</p>
                    <p className="text-4xl font-extrabold text-[#f5f0e8]">
                      {eventStats.confirmed}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[#9a8f82] mb-1">Attendance</p>
                    <p className="text-4xl font-extrabold text-green-400">
                      {attendancePercent}%
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden w-full max-w-sm">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${attendancePercent}%`,
                        background: 'linear-gradient(90deg,#b87333,#d4956a)',
                      }}
                    />
                  </div>
                  <p className="text-xs text-[#9a8f82] mt-1.5">
                    {eventStats.attended} checked in · {eventStats.confirmed} still to arrive
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Check-in form ────────────────────────────────────────────────── */}
      <div className="bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] p-6">
        <h2 className="font-semibold text-[#f5f0e8] mb-4">Enter Booking Reference</h2>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              value={ref}
              onChange={(e) => {
                setRef(e.target.value);
                // Clear previous result/error as user types new ref
                if (result) setResult(null);
                if (error)  setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleCheckIn()}
              placeholder="e.g. EVT-2026-ABCD1234"
              className={`${INPUT_CLS} pl-9`}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <button
            onClick={handleCheckIn}
            disabled={loading || !ref.trim()}
            className="px-6 py-3 text-white font-semibold rounded-xl hover:opacity-90
              disabled:opacity-50 transition-opacity flex items-center gap-2 shrink-0"
            style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
          >
            {loading ? <Spinner small /> : <><QrCode className="w-4 h-4" /> Check In</>}
          </button>
        </div>

        <p className="text-xs text-[#9a8f82] mt-2">
          Press <kbd className="px-1.5 py-0.5 rounded bg-[#2a2a2a] border border-[rgba(184,115,51,0.2)] font-mono text-[#b87333]">Enter</kbd> to check in
        </p>

        {/* ── Success result ──────────────────────────────────────────────── */}
        {result && (
          <div className="mt-5 p-5 rounded-2xl bg-green-500/10 border border-green-500/30 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
              <p className="text-green-400 font-bold text-sm">✅ Checked In Successfully</p>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
              {([
                ['Attendee',    getAttendeeName(result)],
                ['Event',       getEventTitle(result)],
                ['Ticket Type', getTicketName(result)],
                ['Quantity',    String(result.quantity ?? 1)],
                ['Reference',   result.booking_reference ?? '—'],
                ['Checked In At', result.checked_in_at
                  ? new Date(result.checked_in_at).toLocaleTimeString()
                  : 'Just now'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs text-green-400/70">{k}</p>
                  <p className="text-[#f5f0e8] font-medium truncate">{v}</p>
                </div>
              ))}
            </div>

            {/* QR code preview */}
            {result.qr_code && (
              <div className="flex justify-center mt-2">
                <div className="p-2 bg-white rounded-xl">
                  <img
                    src={result.qr_code}
                    alt="QR Code"
                    width={120}
                    height={120}
                    className="block rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Error result ─────────────────────────────────────────────────── */}
        {error && (
          <div className="mt-5 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
            <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-semibold text-sm">Check-In Failed</p>
              <p className="text-red-400/80 text-xs mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
