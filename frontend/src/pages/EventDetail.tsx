// src/pages/EventDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Calendar, MapPin, Users, Star, ArrowLeft,
  Minus, Plus, CheckCircle, Clock, Tag,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { eventsApi, bookingsApi, reviewsApi } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import QRTicketModal from '@/components/QRTicketModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TicketTier {
  id: number;
  name: string;
  price: number;
  available?: number;
  description?: string;
  benefits?: string;
  max_per_booking?: number;
}

interface Creator {
  id?: number;
  full_name?: string;
  email?: string;
  avatar?: string;
}

interface EventDetail {
  id: number;
  title: string;
  description?: string;
  category?: string;
  status?: string;
  start_datetime?: string;
  end_datetime?: string;
  venue_name?: string;
  venue_address?: string;
  city?: string;
  country?: string;
  total_capacity?: number;
  available_seats?: number;
  is_free?: boolean;
  cover_image?: string;
  featured?: boolean;
  tags?: string;
  ticket_types?: TicketTier[];
  creator?: Creator;
  average_rating?: number;
  total_bookings?: number;
}

interface Review {
  id: number;
  user_id?: number;
  rating: number;
  comment?: string;
  created_at?: string;
  user?: { full_name?: string };
}

interface BookingResult {
  id: number;
  booking_reference?: string;
  qr_code?: string;
  status?: string;
  payment_status?: string;
  quantity?: number;
  final_amount?: number;
  event?: { title?: string; start_datetime?: string; venue_name?: string; city?: string };
  ticket_tier?: { name?: string };
  attendee_name?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-RW', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(d?: string) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-RW', { hour: '2-digit', minute: '2-digit' });
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const sz = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${sz} ${i <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`}
        />
      ))}
    </div>
  );
}

function Spinner() {
  return <div className="w-8 h-8 border-2 border-[rgba(184,115,51,0.3)] border-t-[#b87333] rounded-full animate-spin mx-auto" />;
}

const INPUT_CARD = 'bg-[#242424] border border-[rgba(184,115,51,0.2)] rounded-2xl';

// ─── Component ────────────────────────────────────────────────────────────────

export default function EventDetail() {
  const { id }        = useParams<{ id: string }>();
  const navigate      = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast }     = useToast();

  const [event,         setEvent]         = useState<EventDetail | null>(null);
  const [reviews,       setReviews]       = useState<Review[]>([]);
  const [avgRating,     setAvgRating]     = useState<number | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [booking,       setBooking]       = useState(false);
  const [booked,        setBooked]        = useState<BookingResult | null>(null);
  const [selectedTier,  setSelectedTier]  = useState<TicketTier | null>(null);
  const [qty,           setQty]           = useState(1);

  // ── Load event ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      eventsApi.getById(Number(id)),
      reviewsApi.getByEvent(Number(id)).catch(() => ({ data: { reviews: [], average_rating: null } })),
    ]).then(([eRes, rRes]) => {
      const ev: EventDetail = eRes.data;
      setEvent(ev);
      // Set default selected tier
      if (ev.ticket_types?.length) setSelectedTier(ev.ticket_types[0]);

      const rd = rRes.data;
      setReviews(Array.isArray(rd) ? rd : rd?.reviews ?? []);
      setAvgRating(rd?.average_rating ?? ev.average_rating ?? null);
    }).catch(() => {
      toast({ title: 'Failed to load event', variant: 'destructive' });
      navigate('/events');
    }).finally(() => setLoading(false));
  }, [id]);

  // ── Book now ─────────────────────────────────────────────────────────────
  const handleBook = async () => {
    if (!isAuthenticated) {
      navigate(`/login`, { state: { from: `/events/${id}` } });
      return;
    }
    if (!selectedTier || !event) return;

    setBooking(true);
    try {
      const res = await bookingsApi.create({
        event_id:       event.id,
        ticket_type_id: selectedTier.id,
        quantity:       qty,
      });
      const result: BookingResult = res.data;
      setBooked(result);
      toast({ title: '🎉 Booking confirmed!' });
    } catch (err: any) {
      toast({
        title: 'Booking failed',
        description: err.response?.data?.detail ?? err.message ?? 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setBooking(false);
    }
  };

  // ── Pricing ───────────────────────────────────────────────────────────────
  const total       = selectedTier ? selectedTier.price * qty : 0;
  const maxQty      = Math.min(selectedTier?.max_per_booking ?? 10, selectedTier?.available ?? 10);
  const isManager   = user?.role === 'admin' || user?.role === 'event_manager';

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a]">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]"><Spinner /></div>
        <Footer />
      </div>
    );
  }

  if (!event) return null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* Back link */}
        <Link
          to="/events"
          className="inline-flex items-center gap-2 mb-6 text-sm font-medium text-[#9a8f82] hover:text-[#b87333] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </Link>

        {/* ── Hero banner ─────────────────────────────────────────────── */}
        <div className="relative h-72 sm:h-80 rounded-2xl overflow-hidden mb-8">
          {event.cover_image ? (
            <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#1e1a16,#3d2210)' }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="px-2 py-1 text-xs font-semibold text-white rounded-lg capitalize" style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}>
                {event.category}
              </span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-lg capitalize ${
                event.status === 'published' ? 'bg-green-500/80 text-white'
                : event.status === 'cancelled' ? 'bg-red-500/80 text-white'
                : 'bg-gray-500/80 text-white'
              }`}>
                {event.status}
              </span>
              {event.is_free && <span className="px-2 py-1 text-xs font-bold bg-green-500 text-white rounded-lg">FREE</span>}
              {event.featured && <span className="px-2 py-1 text-xs font-bold bg-[#b87333] text-white rounded-lg">⭐ Featured</span>}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-snug">{event.title}</h1>
            {avgRating && (
              <div className="flex items-center gap-2 mt-2">
                <StarRating rating={avgRating} />
                <span className="text-white/70 text-sm">{avgRating.toFixed(1)} ({reviews.length} reviews)</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Info pills ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { icon: Calendar, label: 'Date',     val: formatDate(event.start_datetime)              },
            { icon: Clock,    label: 'Time',     val: formatTime(event.start_datetime) || '—'      },
            { icon: MapPin,   label: 'Venue',    val: [event.venue_name, event.city].filter(Boolean).join(', ') || '—' },
            { icon: Users,    label: 'Capacity', val: `${event.available_seats ?? '—'} seats left` },
          ].map(({ icon: Icon, label, val }) => (
            <div key={label} className={`${INPUT_CARD} p-4`}>
              <Icon className="w-4 h-4 text-[#b87333] mb-1.5" />
              <p className="text-xs text-[#9a8f82]">{label}</p>
              <p className="text-sm font-semibold text-[#f5f0e8] mt-0.5 truncate">{val}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Left: content ─────────────────────────────────────────── */}
          <div className="flex-1 space-y-6">

            {/* Description */}
            <div className={`${INPUT_CARD} p-6`}>
              <h2 className="text-lg font-bold text-[#f5f0e8] mb-3">About This Event</h2>
              <p className="text-sm text-[#9a8f82] leading-relaxed whitespace-pre-line">{event.description}</p>
              {event.tags && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {event.tags.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                    <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-[rgba(184,115,51,0.1)] text-[#b87333] border border-[rgba(184,115,51,0.2)] flex items-center gap-1">
                      <Tag className="w-2.5 h-2.5" />{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Ticket types table */}
            {event.ticket_types && event.ticket_types.length > 0 && (
              <div className={`${INPUT_CARD} overflow-hidden`}>
                <div className="p-4 border-b border-[rgba(184,115,51,0.15)]">
                  <h2 className="text-lg font-bold text-[#f5f0e8]">Ticket Types</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[rgba(184,115,51,0.15)] bg-black/20">
                        {['Type','Price (RWF)','Available','Benefits','Select'].map((h) => (
                          <th key={h} className="text-left py-3 px-4 text-xs font-medium text-[#9a8f82]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {event.ticket_types.map((t) => (
                        <tr
                          key={t.id}
                          onClick={() => setSelectedTier(t)}
                          className={`border-b border-[rgba(184,115,51,0.08)] cursor-pointer transition-colors ${
                            selectedTier?.id === t.id ? 'bg-[rgba(184,115,51,0.08)]' : 'hover:bg-[rgba(184,115,51,0.04)]'
                          }`}
                        >
                          <td className="py-3 px-4 font-medium text-[#f5f0e8] capitalize">{t.name.replace('_',' ')}</td>
                          <td className="py-3 px-4 text-[#b87333] font-bold">
                            {event.is_free || t.price === 0 ? 'Free' : t.price.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-[#9a8f82] text-xs">{t.available ?? '—'}</td>
                          <td className="py-3 px-4 text-[#9a8f82] text-xs max-w-[200px] truncate">{t.description ?? t.benefits ?? '—'}</td>
                          <td className="py-3 px-4">
                            <input
                              type="radio"
                              name="ticket"
                              checked={selectedTier?.id === t.id}
                              onChange={() => setSelectedTier(t)}
                              className="accent-[#b87333]"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className={`${INPUT_CARD} p-6`}>
              <h2 className="text-lg font-bold text-[#f5f0e8] mb-4 flex items-center gap-2">
                Reviews
                {avgRating && (
                  <span className="text-sm font-normal text-[#9a8f82]">
                    · {avgRating.toFixed(1)} avg
                  </span>
                )}
              </h2>
              {reviews.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="w-10 h-10 text-[#b87333]/30 mx-auto mb-2" />
                  <p className="text-[#9a8f82] text-sm">No reviews yet — be the first to review!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="border-b border-[rgba(184,115,51,0.1)] pb-4 last:border-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-[rgba(184,115,51,0.2)] flex items-center justify-center text-[#b87333] font-bold text-sm shrink-0">
                          {(r.user?.full_name ?? 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#f5f0e8]">{r.user?.full_name ?? 'User'}</p>
                          <StarRating rating={r.rating} />
                        </div>
                        {r.created_at && (
                          <span className="text-xs text-[#9a8f82] ml-auto">
                            {new Date(r.created_at).toLocaleDateString('en-RW', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      {r.comment && <p className="text-sm text-[#9a8f82] leading-relaxed">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: booking card ────────────────────────────────────── */}
          <div className="lg:w-80 shrink-0">
            <div className={`${INPUT_CARD} p-6 sticky top-24`}>

              {/* Manager: show manage button instead of booking */}
              {isManager ? (
                <div className="text-center">
                  <p className="text-sm text-[#9a8f82] mb-4">You are managing this event.</p>
                  <Link
                    to="/dashboard/events"
                    className="block w-full py-3 text-center text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
                    style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
                  >
                    Manage Event
                  </Link>
                </div>
              ) : (
                <>
                  <h3 className="font-bold text-[#f5f0e8] mb-4">Book Tickets</h3>

                  {/* Selected tier summary */}
                  {selectedTier && (
                    <div className="p-3 rounded-xl border border-[rgba(184,115,51,0.2)] bg-[#1a1a1a] mb-4">
                      <p className="text-xs text-[#9a8f82]">Selected tier</p>
                      <p className="font-semibold text-[#f5f0e8] capitalize mt-0.5">
                        {selectedTier.name.replace('_',' ')}
                      </p>
                      <p className="text-[#b87333] font-bold text-lg">
                        {event.is_free || selectedTier.price === 0
                          ? 'Free'
                          : `${selectedTier.price.toLocaleString()} RWF`}
                      </p>
                    </div>
                  )}

                  {/* Quantity stepper */}
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="w-9 h-9 rounded-lg border border-[rgba(184,115,51,0.2)] flex items-center justify-center text-[#9a8f82] hover:border-[#b87333] hover:text-[#b87333] transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="flex-1 text-center font-bold text-xl text-[#f5f0e8]">{qty}</span>
                    <button
                      onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                      className="w-9 h-9 rounded-lg border border-[rgba(184,115,51,0.2)] flex items-center justify-center text-[#9a8f82] hover:border-[#b87333] hover:text-[#b87333] transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-[#9a8f82] text-center mb-4">Max {maxQty} per booking</p>

                  {/* Total */}
                  <div className="flex justify-between items-center border-t border-[rgba(184,115,51,0.15)] pt-3 mb-5">
                    <span className="text-[#9a8f82]">Total</span>
                    <span className="text-2xl font-extrabold text-[#b87333]">
                      {event.is_free || (selectedTier?.price ?? 0) === 0
                        ? 'Free'
                        : `${total.toLocaleString()} RWF`}
                    </span>
                  </div>

                  <button
                    onClick={handleBook}
                    disabled={booking || !selectedTier || event.status !== 'published'}
                    className="w-full py-3 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
                  >
                    {booking ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Booking…</>
                    ) : !isAuthenticated ? (
                      'Sign In to Book'
                    ) : event.status !== 'published' ? (
                      'Event Not Available'
                    ) : (
                      'Book Now'
                    )}
                  </button>

                  {!isAuthenticated && (
                    <p className="text-xs text-[#9a8f82] text-center mt-2">
                      <Link to="/login" className="text-[#b87333] hover:underline">Sign in</Link> or{' '}
                      <Link to="/register" className="text-[#b87333] hover:underline">register</Link> to book
                    </p>
                  )}
                </>
              )}

              {/* Organizer */}
              {event.creator && (
                <div className="mt-5 pt-5 border-t border-[rgba(184,115,51,0.15)]">
                  <p className="text-xs font-semibold text-[#f5f0e8] mb-3">Organizer</p>
                  <div className="flex items-center gap-3">
                    {event.creator.avatar ? (
                      <img src={event.creator.avatar} alt={event.creator.full_name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[rgba(184,115,51,0.2)] flex items-center justify-center text-[#b87333] font-bold text-sm">
                        {(event.creator.full_name ?? 'O').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-[#f5f0e8]">{event.creator.full_name}</p>
                      {event.creator.email && <p className="text-xs text-[#9a8f82]">{event.creator.email}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Booking success QR modal */}
      {booked && (
        <QRTicketModal
          booking={{
            ...booked,
            event_title: event.title,
            event: {
              title:          event.title,
              start_datetime: event.start_datetime,
              venue_name:     event.venue_name,
              city:           event.city,
            },
          }}
          onClose={() => {
            setBooked(null);
            navigate('/dashboard/bookings');
          }}
        />
      )}
    </div>
  );
}
