import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search, Calendar, MapPin, Users,
  ChevronLeft, ChevronRight, Filter, X, SlidersHorizontal,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { eventsApi } from '../api/client';
import { getImageUrl } from '../utils/imageUrl';

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
  'conference', 'concert', 'wedding', 'sports', 'training',
  'workshop', 'seminar', 'networking', 'exhibition', 'other',
];

const PER_PAGE = 9;

const INPUT_CLS = `px-3 py-2.5 border border-copper/20 rounded-xl
  focus:border-copper focus:outline-none focus:ring-1 focus:ring-copper/30
  text-sm bg-dark-input text-ivory-light placeholder-muted-text transition-colors`;

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
    <div className="bg-dark-card rounded-2xl border border-copper/20 overflow-hidden">
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
  const imageUrl = getImageUrl(event.cover_image);
  
  return (
    <div className="bg-dark-card rounded-2xl border border-copper/20 overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-copper/40 transition-all duration-200 group">
      <div className="relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={event.title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-48 bg-copper/8 flex items-center justify-center">
            <Calendar className="w-12 h-12 text-copper/30" />
          </div>
        )}
        <span className="absolute top-3 left-3 px-2 py-1 text-xs font-semibold text-white rounded-lg capitalize bg-gradient-to-br from-copper to-copper-light">
          {event.category}
        </span>
        {event.is_free && (
          <span className="absolute top-3 right-3 px-2 py-1 text-xs font-bold bg-green-500 text-white rounded-lg">FREE</span>
        )}
        {event.featured && (
          <span className="absolute bottom-3 right-3 px-2 py-0.5 text-xs font-bold bg-copper text-white rounded-lg">⭐ Featured</span>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-bold text-ivory-light mb-3 line-clamp-2 leading-snug">{event.title}</h3>
        <div className="space-y-1.5 text-xs text-muted-text mb-4">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-copper shrink-0" />
            {formatDate(event.start_datetime)}
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-copper shrink-0" />
            {[event.venue_name, event.city].filter(Boolean).join(', ') || '—'}
          </div>
          {event.available_seats != null && (
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-copper shrink-0" />
              {event.available_seats} seats left
            </div>
          )}
          <p className="font-semibold text-copper">{lowestPrice(event)}</p>
        </div>
        <Link
          to={`/events/${event.id}`}
          className="block w-full py-2.5 text-center text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-opacity bg-gradient-to-br from-copper to-copper-light"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
// ─── Trending strip ───────────────────────────────────────────────────────────

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
      <h2 className="text-lg font-bold text-ivory-light mb-4 flex items-center gap-2">
        🔥 <span>Trending Events</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {featured.slice(0, 3).map((e) => <EventCard key={e.id} event={e} />)}
      </div>
    </div>
  );
}

// ─── Filter Panel (shared between drawer + sidebar) ───────────────────────────

function FilterPanel({
  selectedCategories,
  isFree,
  dateFrom,
  dateTo,
  hasFilters,
  onToggleCategory,
  onSetIsFree,
  onDateFrom,
  onDateTo,
  onClear,
  onApply,
}: {
  selectedCategories: string[];
  isFree: boolean | null;
  dateFrom: string;
  dateTo: string;
  hasFilters: boolean;
  onToggleCategory: (cat: string) => void;
  onSetIsFree: (val: boolean | null) => void;
  onDateFrom: (v: string) => void;
  onDateTo: (v: string) => void;
  onClear: () => void;
  onApply: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-ivory-light flex items-center gap-2">
          <Filter className="w-4 h-4 text-copper" /> Filters
        </h3>
        {hasFilters && (
          <button
            onClick={onClear}
            className="text-xs text-muted-text hover:text-copper flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Category */}
      <div>
        <h4 className="text-xs font-semibold text-muted-text uppercase tracking-wider mb-3">Category</h4>
        <div className="space-y-2">
          {CATEGORIES.map((cat) => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat)}
                onChange={() => onToggleCategory(cat)}
                className="accent-copper w-4 h-4"
              />
              <span className="text-sm text-ivory-light group-hover:text-copper transition-colors capitalize">
                {cat}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <h4 className="text-xs font-semibold text-muted-text uppercase tracking-wider mb-3">Price</h4>
        <div className="flex gap-2">
          {([['All', null], ['Free', true], ['Paid', false]] as [string, boolean | null][]).map(([label, val]) => (
            <button
              key={label}
              onClick={() => onSetIsFree(val)}
              className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                isFree === val
                  ? 'border-copper text-copper bg-copper/10'
                  : 'border-copper/20 text-muted-text hover:border-copper/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div>
        <h4 className="text-xs font-semibold text-muted-text uppercase tracking-wider mb-3">Date Range</h4>
        <div className="space-y-2">
          <input type="date" value={dateFrom} onChange={(e) => onDateFrom(e.target.value)}
            className={`${INPUT_CLS} w-full text-xs`} />
          <input type="date" value={dateTo} onChange={(e) => onDateTo(e.target.value)}
            className={`${INPUT_CLS} w-full text-xs`} />
        </div>
      </div>

      <button
        onClick={onApply}
        className="w-full py-2.5 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity bg-gradient-to-br from-copper to-copper-light"
      >
        Apply Filters
      </button>
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
  const [isFree,       setIsFree]       = useState<boolean | null>(null);
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [drawerOpen,   setDrawerOpen]   = useState(false); // mobile filter drawer

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page: p,
        per_page: PER_PAGE,
        ...(search                            && { search }),
        ...(selectedCategories.length === 1   && { category: selectedCategories[0] }),
        ...(isFree !== null                   && { is_free: Boolean(isFree) }),
        ...(dateFrom                          && { date_from: dateFrom }),
        ...(dateTo                            && { date_to: dateTo }),
      };
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

  const applyAndClose = () => {
    fetchEvents(1);
    setPage(1);
    setDrawerOpen(false);
  };

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const hasFilters = !!(search || selectedCategories.length || isFree !== null || dateFrom || dateTo);

  const filterProps = {
    selectedCategories, isFree, dateFrom, dateTo, hasFilters,
    onToggleCategory: toggleCategory,
    onSetIsFree: setIsFree,
    onDateFrom: setDateFrom,
    onDateTo: setDateTo,
    onClear: clearFilters,
    onApply: applyAndClose,
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-dark-elevation">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Header + search bar */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-ivory-light mb-2">Explore Events</h1>
          <p className="text-muted-text mb-5">Discover and book the best events in your city</p>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchEvents(1)}
                placeholder="Search events by name, venue or category…"
                className={`${INPUT_CLS} w-full pl-12 py-4 text-base rounded-2xl`}
              />
            </div>

            {/* Mobile: Filter button opens drawer */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-3 rounded-2xl border border-copper/20 text-muted-text hover:border-copper hover:text-copper transition-colors relative"
            >
              <SlidersHorizontal className="w-5 h-5" />
              {hasFilters && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-copper" />
              )}
            </button>
          </div>
        </div>

        {/* Trending strip */}
        <TrendingStrip />

        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Desktop sidebar filters (lg+) ──────────────────────────── */}
          <aside className="hidden lg:block lg:w-64 shrink-0">
            <div className="bg-dark-card border border-copper/20 rounded-2xl p-5 sticky top-24">
              <FilterPanel {...filterProps} />
            </div>
          </aside>

          {/* ── Events grid ──────────────────────────────────────────── */}
          <div className="flex-1">
            {!loading && (
              <p className="text-sm text-muted-text mb-4">
                {total > 0 ? `${total} event${total !== 1 ? 's' : ''} found` : ''}
              </p>
            )}

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: PER_PAGE }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-24">
                <Calendar className="w-16 h-16 text-copper/30 mx-auto mb-4" />
                <p className="text-xl font-bold text-ivory-light mb-2">No events found</p>
                <p className="text-sm text-muted-text mb-6">Try adjusting your filters or search term</p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-2.5 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity bg-gradient-to-br from-copper to-copper-light"
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
                      className="p-2 rounded-lg border border-copper/20 text-muted-text disabled:opacity-40 hover:border-copper transition-colors"
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
                              ? 'text-white bg-gradient-to-br from-copper to-copper-light'
                              : 'border border-copper/20 text-muted-text hover:border-copper/40'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => { setPage((p) => p + 1); fetchEvents(page + 1); }}
                      disabled={page === totalPages}
                      className="p-2 rounded-lg border border-copper/20 text-muted-text disabled:opacity-40 hover:border-copper transition-colors"
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

      {/* ── Mobile filter drawer (< lg) ────────────────────────────────────── */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Sheet slides in from right */}
          <div className="absolute top-0 right-0 bottom-0 w-72 bg-dark-card border-l border-copper/20 overflow-y-auto">
            {/* Close button */}
            <div className="flex items-center justify-between p-4 border-b border-copper/15">
              <span className="font-bold text-ivory-light">Filters</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-ivory-light hover:bg-copper/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <FilterPanel {...filterProps} />
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}