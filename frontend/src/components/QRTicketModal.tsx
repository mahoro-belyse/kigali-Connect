// src/components/QRTicketModal.tsx
import { useEffect, useRef } from 'react';
import { X, Download, Printer, Calendar, MapPin, Ticket } from 'lucide-react';

interface Booking {
  id: number;
  booking_reference?: string;
  qr_code?: string;
  status?: string;
  payment_status?: string;
  quantity?: number;
  attendee_name?: string;
  event?: {
    title?: string;
    start_datetime?: string;
    venue_name?: string;
    city?: string;
  };
  event_title?: string;
  event_date?: string;
  venue?: string;
  ticket_tier?: { name?: string };
  ticket_type_name?: string;
}

interface QRTicketModalProps {
  booking: Booking;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed:  'bg-green-500/20 text-green-400',
  pending:    'bg-amber-500/20 text-amber-400',
  cancelled:  'bg-red-500/20 text-red-400',
  attended:   'bg-blue-500/20 text-blue-400',
  paid:       'bg-green-500/20 text-green-400',
  unpaid:     'bg-amber-500/20 text-amber-400',
  refunded:   'bg-purple-500/20 text-purple-400',
};

export default function QRTicketModal({ booking, onClose }: QRTicketModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const eventTitle  = booking.event?.title       ?? booking.event_title       ?? 'Event';
  const eventDate   = booking.event?.start_datetime ?? booking.event_date;
  const venueName   = booking.event?.venue_name  ?? booking.venue             ?? '';
  const city        = booking.event?.city        ?? '';
  const ticketName  = booking.ticket_tier?.name  ?? booking.ticket_type_name  ?? 'General';
  const ref         = booking.booking_reference  ?? `#${booking.id}`;

  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString('en-RW', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : '—';

  const formattedTime = eventDate
    ? new Date(eventDate).toLocaleTimeString('en-RW', { hour: '2-digit', minute: '2-digit' })
    : '';

  // ── Download QR ──────────────────────────────────────────────────────────
  const handleDownload = () => {
    if (!booking.qr_code) return;
    const a = document.createElement('a');
    a.href     = booking.qr_code;
    a.download = `ticket-${ref}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ── Print ────────────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body > *:not(#ticket-print-area) { display: none !important; }
          #ticket-print-area {
            display: block !important;
            position: fixed;
            inset: 0;
            background: white;
            padding: 40px;
            z-index: 9999;
          }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Modal card */}
        <div
          ref={modalRef}
          id="ticket-print-area"
          className="relative w-full max-w-sm bg-[#1e1e1e] rounded-3xl border border-[rgba(184,115,51,0.25)] shadow-2xl overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-[#f5f0e8] hover:bg-white/10 transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div
            className="p-6 text-center text-white"
            style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
          >
            <Ticket className="w-8 h-8 mx-auto mb-2 opacity-90" />
            <h2 className="text-lg font-extrabold">Your Event Ticket 🎟️</h2>
          </div>

          {/* Ticket body */}
          <div className="p-6">
            {/* Event info */}
            <h3 className="text-lg font-bold text-[#f5f0e8] text-center mb-4 leading-snug">
              {eventTitle}
            </h3>

            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2 text-sm text-[#9a8f82]">
                <Calendar className="w-4 h-4 text-[#b87333] shrink-0" />
                <span>{formattedDate}{formattedTime ? ` · ${formattedTime}` : ''}</span>
              </div>
              {(venueName || city) && (
                <div className="flex items-center gap-2 text-sm text-[#9a8f82]">
                  <MapPin className="w-4 h-4 text-[#b87333] shrink-0" />
                  <span>{[venueName, city].filter(Boolean).join(', ')}</span>
                </div>
              )}
            </div>

            {/* Dashed divider */}
            <div className="border-t border-dashed border-[rgba(184,115,51,0.3)] my-4" />

            {/* Attendee */}
            {booking.attendee_name && (
              <p className="text-center text-sm text-[#9a8f82] mb-1">Attendee</p>
            )}
            <p className="text-center text-base font-semibold text-[#f5f0e8] mb-4">
              {booking.attendee_name ?? '—'}
            </p>

            {/* Booking reference */}
            <div className="text-center mb-5">
              <p className="text-xs text-[#9a8f82] mb-1">Booking Reference</p>
              <p className="text-xl font-mono font-bold text-[#b87333] tracking-widest">{ref}</p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-5">
              {booking.qr_code ? (
                <div className="p-3 bg-white rounded-2xl shadow-lg">
                  <img
                    src={booking.qr_code}
                    alt={`QR code for ${ref}`}
                    width={180}
                    height={180}
                    className="block"
                  />
                </div>
              ) : (
                <div className="w-[180px] h-[180px] rounded-2xl bg-[#2a2a2a] flex items-center justify-center border border-[rgba(184,115,51,0.2)]">
                  <p className="text-xs text-[#9a8f82] text-center px-4">QR code not available</p>
                </div>
              )}
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[rgba(184,115,51,0.15)] text-[#b87333] capitalize">
                {ticketName}
              </span>
              {booking.quantity && booking.quantity > 1 && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[rgba(184,115,51,0.1)] text-[#b87333]">
                  ×{booking.quantity}
                </span>
              )}
              {booking.payment_status && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[booking.payment_status] ?? 'bg-gray-500/20 text-gray-400'}`}>
                  {booking.payment_status}
                </span>
              )}
              {booking.status && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[booking.status] ?? 'bg-gray-500/20 text-gray-400'}`}>
                  {booking.status}
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                disabled={!booking.qr_code}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
              >
                <Download className="w-4 h-4" /> Download
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border border-[rgba(184,115,51,0.3)] text-[#f5f0e8] hover:bg-[rgba(184,115,51,0.08)] transition-colors"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
