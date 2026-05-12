import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search, Calendar, MapPin, Users,
  ChevronLeft, ChevronRight, Filter, X,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { eventsApi } from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TicketTier {
  id?: number;
  name: string;
  price: number;
  available?: number;
}

interface Event {
  id: number;
  title: string;
  category?: string;
  start_datetime?: string;
  venue_name?: string;
  city?: string;
  available_seats?: number;
  is_free?: boolean;
  cover_image?: string;
  featured?: boolean;
  status?: string;
  ticket_types?: TicketTier[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'conference','concert','wedding','sports','training',
  'workshop','seminar','networking','exhibition','other',
];

const PER_PAGE = 9;

const INPUT_CLS = `px-3 py-2.5 border border-[rgba(184,115,51,0.2)] rounded-xl
  focus:border-[#b87333] focus:outline-none focus:ring-1 focus:ring-[rgba(184,115,51,0.3)]
  text-sm bg-[#2a2a2a] text-[#f5f0e8] placeholder-[#9a8f82] transition-colors`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-RW', { month: 'short', day: 'numeric', year: 'numeric' });
}

function lowestPrice(event: Event): string {
  if (event.is_free) return 'Free';
  const prices = (event.ticket_types ?? []).map((t) => t.price).filter((p) => p > 0);
  if (prices.length === 0) return 'Free';
  return `From ${Math.min(...prices).toLocaleString()} RWF`;
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] overflow-hidden">
      <div className="w-full h-48 bg-gray-400/10 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-gray-400/10 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-gray-400/10 rounded animate-pulse w-full" />
        <div className="h-3 bg-gray-400/10 rounded animate-pulse w-1/2" />
        <div className="h-10 bg-gray-400/10 rounded-xl animate-pulse mt-4" />
      </div>
    </div>
  );
}

// ─── Event card ───────────────────────────────────────────────────────────────

function EventCard({ event }: { event: Event }) {
  return (
    <div className="bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-[rgba(184,115,51,0.4)] transition-all duration-200 group">
      {/* Image */}
      <div className="relative overflow-hidden">
        {event.cover_image ? (
          <img
            src={event.cover_image}
            alt={event.title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-48 bg-[rgba(184,115,51,0.08)] flex items-center justify-center">
            <Calendar className="w-12 h-12 text-[#b87333]/30" />
          </div>
        )}
        <span
          className="absolute top-3 left-3 px-2 py-1 text-xs font-semibold text-white rounded-lg capitalize"
          style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
        >
          {event.category}
        </span>
        {event.is_free && (
          <span className="absolute top-3 right-3 px-2 py-1 text-xs font-bold bg-green-500 text-white rounded-lg">
            FREE
          </span>
        )}
        {event.featured && (
          <span className="absolute bottom-3 right-3 px-2 py-0.5 text-xs font-bold bg-[#b87333] text-white rounded-lg">
            ⭐ Featured
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        <h3 className="font-bold text-[#f5f0e8] mb-3 line-clamp-2 leading-snug">{event.title}</h3>
        <div className="space-y-1.5 text-xs text-[#9a8f82] mb-4">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#b87333] shrink-0" />
            {formatDate(event.start_datetime)}
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#b87333] shrink-0" />
            {[event.venue_name, event.city].filter(Boolean).join(', ') || '—'}
          </div>
          {event.available_seats != null && (
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#b87333] shrink-0" />
              {event.available_seats} seats left
            </div>
          )}
          <p className="font-semibold text-[#b87333]">{lowestPrice(event)}</p>
        </div>
        <Link
          to={`/events/${event.id}`}
          className="block w-full py-2.5 text-center text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
        >
          View Details
        </Link>
      </div>
    </div>
  );
}

// ─── Trending strip (featured events) ────────────────────────────────────────

function TrendingStrip() {
  const [featured, setFeatured] = useState<Event[]>([]);

  useEffect(() => {
    eventsApi.featured()
      .then((res) => {
        const d = res.data;
        setFeatured(Array.isArray(d) ? d : d?.events ?? []);
      })
      .catch(() => {});
  }, []);

  if (featured.length === 0) return null;

  return (
    <div className="mb-10">
      <h2 className="text-lg font-bold text-[#f5f0e8] mb-4 flex items-center gap-2">
        🔥 <span>Trending Events</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {featured.slice(0, 3).map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Events page ─────────────────────────────────────────────────────────

export default function Events() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [events,             setEvents]             = useState<Event[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [total,              setTotal]              = useState(0);
  const [page,               setPage]               = useState(1);
  const [search,             setSearch]             = useState(searchParams.get('search') ?? '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get('category') ? [searchParams.get('category')!] : []
  );
  const [isFree,   setIsFree]   = useState<boolean | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  // ── Fetch events ──────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page: p,
        per_page: PER_PAGE,
        ...(search             && { search }),
        ...(selectedCategories.length === 1 && { category: selectedCategories[0] }),
        ...(isFree !== null && { is_free: Boolean(isFree) }),
        ...(dateFrom           && { date_from: dateFrom }),
        ...(dateTo             && { date_to: dateTo }),
      };
      console.log('params →', params);
      const res  = await eventsApi.list(params);
      const data = res.data;
      setEvents(Array.isArray(data) ? data : data?.events ?? []);
      setTotal(data?.total ?? 0);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategories, isFree, dateFrom, dateTo]);

  useEffect(() => { fetchEvents(1); setPage(1); }, [selectedCategories, isFree, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearch(''); setSelectedCategories([]); setIsFree(null); setDateFrom(''); setDateTo('');
    setSearchParams({});
  };

  const toggleCategory = (cat: string) =>
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const hasFilters = search || selectedCategories.length || isFree !== null || dateFrom || dateTo;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Header + search bar */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[#f5f0e8] mb-2">Explore Events</h1>
          <p className="text-[#9a8f82] mb-5">Discover and book the best events in your city</p>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchEvents(1)}
              placeholder="Search events by name, venue or category…"
              className={`${INPUT_CLS} w-full pl-12 py-4 text-base rounded-2xl`}
            />
          </div>
        </div>

        {/* Trending strip */}
        <TrendingStrip />

        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Sidebar filters ──────────────────────────────────────────── */}
          <aside className="lg:w-64 shrink-0">
            <div className="bg-[#242424] border border-[rgba(184,115,51,0.2)] rounded-2xl p-5 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#f5f0e8] flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#b87333]" /> Filters
                </h3>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-[#9a8f82] hover:text-[#b87333] flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>

              {/* Category checkboxes */}
              <div className="mb-5">
                <h4 className="text-xs font-semibold text-[#9a8f82] uppercase tracking-wider mb-3">Category</h4>
                <div className="space-y-2">
                  {CATEGORIES.map((cat) => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                        className="accent-[#b87333] w-4 h-4"
                      />
                      <span className="text-sm text-[#f5f0e8] group-hover:text-[#b87333] transition-colors capitalize">
                        {cat}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price toggle */}
              <div className="mb-5">
                <h4 className="text-xs font-semibold text-[#9a8f82] uppercase tracking-wider mb-3">Price</h4>
                <div className="flex gap-2">
                  {([['All', null], ['Free', true], ['Paid', false]] as [string, boolean | null][]).map(([label, val]) => (
                    <button
                      key={label}
                      onClick={() => setIsFree(val)}
                      className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                        isFree === val
                          ? 'border-[#b87333] text-[#b87333] bg-[rgba(184,115,51,0.1)]'
                          : 'border-[rgba(184,115,51,0.2)] text-[#9a8f82] hover:border-[rgba(184,115,51,0.4)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date range */}
              <div className="mb-5">
                <h4 className="text-xs font-semibold text-[#9a8f82] uppercase tracking-wider mb-3">Date Range</h4>
                <div className="space-y-2">
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    className={`${INPUT_CLS} w-full text-xs`} />
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    className={`${INPUT_CLS} w-full text-xs`} />
                </div>
              </div>

              <button
                onClick={() => { fetchEvents(1); setPage(1); }}
                className="w-full py-2.5 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
              >
                Apply Filters
              </button>
            </div>
          </aside>

          {/* ── Events grid ──────────────────────────────────────────────── */}
          <div className="flex-1">
            {/* Result count */}
            {!loading && (
              <p className="text-sm text-[#9a8f82] mb-4">
                {total > 0 ? `${total} event${total !== 1 ? 's' : ''} found` : ''}
              </p>
            )}

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: PER_PAGE }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-24">
                <Calendar className="w-16 h-16 text-[#b87333]/30 mx-auto mb-4" />
                <p className="text-xl font-bold text-[#f5f0e8] mb-2">No events found</p>
                <p className="text-sm text-[#9a8f82] mb-6">Try adjusting your filters or search term</p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-2.5 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
                  style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {events.map((e) => <EventCard key={e.id} event={e} />)}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button
                      onClick={() => { setPage((p) => p - 1); fetchEvents(page - 1); }}
                      disabled={page === 1}
                      className="p-2 rounded-lg border border-[rgba(184,115,51,0.2)] text-[#9a8f82] disabled:opacity-40 hover:border-[#b87333] transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                      const p = i + 1;
                      return (
                        <button
                          key={p}
                          onClick={() => { setPage(p); fetchEvents(p); }}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                            page === p
                              ? 'text-white'
                              : 'border border-[rgba(184,115,51,0.2)] text-[#9a8f82] hover:border-[rgba(184,115,51,0.4)]'
                          }`}
                          style={page === p ? { background: 'linear-gradient(135deg,#b87333,#d4956a)' } : {}}
                        >
                          {p}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => { setPage((p) => p + 1); fetchEvents(page + 1); }}
                      disabled={page === totalPages}
                      className="p-2 rounded-lg border border-[rgba(184,115,51,0.2)] text-[#9a8f82] disabled:opacity-40 hover:border-[#b87333] transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
