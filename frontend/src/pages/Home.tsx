import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, ChevronLeft, ChevronRight, Star, Briefcase,
  Music, Wrench, BookOpen, Trophy, Users, Layout,
  Search, MapPin, Check,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { eventsApi } from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Slide {
  img: string;
  heading: string;
  sub: string;
  cta1: { label: string; to: string };
  cta2: { label: string; to: string };
}

interface EventItem {
  id: number;
  title: string;
  category?: string;
  start_datetime?: string;
  venue_name?: string;
  city?: string;
  is_free?: boolean;
  cover_image?: string;
  ticket_types?: { price: number }[];
}

// ─── Static data ──────────────────────────────────────────────────────────────

const SLIDES: Slide[] = [
  {
    img: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&q=80',
    heading: 'Discover Extraordinary Events',
    sub: 'Find and book the most exciting events in your city',
    cta1: { label: 'Browse Events', to: '/events' },
    cta2: { label: 'Host an Event', to: '/register' },
  },
  {
    img: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1600&q=80',
    heading: 'Seamless Event Management',
    sub: 'Powerful tools for organizers to create and manage events',
    cta1: { label: 'Get Started Free', to: '/register' },
    cta2: { label: 'Learn More', to: '/about' },
  },
  {
    img: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&q=80',
    heading: 'Join Thousands of Attendees',
    sub: 'Be part of memorable experiences that inspire and connect',
    cta1: { label: 'View Events', to: '/events' },
    cta2: { label: 'Sign Up Now', to: '/register' },
  },
];

const CATEGORIES = [
  { icon: Briefcase, label: 'conference'  },
  { icon: Music,     label: 'concert'     },
  { icon: Wrench,    label: 'workshop'    },
  { icon: BookOpen,  label: 'training'    },
  { icon: Star,      label: 'seminar'     },
  { icon: Trophy,    label: 'sports'      },
  { icon: Users,     label: 'networking'  },
  { icon: Layout,    label: 'exhibition'  },
];

const STATS = [
  { icon: Calendar, label: 'Total Events',    end: 1200   },
  { icon: Star,     label: 'Total Bookings',  end: 48000  },
  { icon: Users,    label: 'Happy Attendees', end: 120000 },
  { icon: MapPin,   label: 'Cities',          end: 25     },
];

const TESTIMONIALS = [
  {
    name: 'Alice Uwimana', role: 'Event Organizer',
    quote: 'SmartEvent transformed how I manage events. The platform is intuitive and powerful!',
    img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop',
  },
  {
    name: 'Bob Habimana', role: 'Conference Attendee',
    quote: 'Booking tickets has never been easier. I love the seamless experience from discovery to check-in.',
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop',
  },
  {
    name: 'Carol Mukamana', role: 'Corporate Trainer',
    quote: 'Our workshop attendance doubled after we started using SmartEvent. Highly recommended!',
    img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop',
  },
];

const HOW_IT_WORKS = [
  { icon: Search, title: 'Browse Events',       desc: 'Discover thousands of events using our powerful search and filters.' },
  { icon: Star,   title: 'Book Your Ticket',    desc: 'Select your tickets, choose quantity, and pay securely in seconds.' },
  { icon: Check,  title: 'Enjoy the Experience', desc: 'Get your e-ticket with QR code, check in easily, and enjoy the event.' },
];

// ─── Animated counter ─────────────────────────────────────────────────────────

function AnimatedCounter({ end }: { end: number }) {
  const [count, setCount] = useState(0);
  const ref     = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const step  = end / 60;
        let current = 0;
        const timer = setInterval(() => {
          current += step;
          if (current >= end) { setCount(end); clearInterval(timer); }
          else setCount(Math.floor(current));
        }, 16);
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return <span ref={ref}>{count.toLocaleString()}+</span>;
}

// ─── Event card ───────────────────────────────────────────────────────────────

function EventCard({ event }: { event: EventItem }) {
  const lowestPrice = (): string => {
    if (event.is_free) return 'Free Entry';
    const prices = (event.ticket_types ?? []).map((t) => t.price).filter((p) => p > 0);
    if (!prices.length) return 'Free Entry';
    return `From ${Math.min(...prices).toLocaleString()} RWF`;
  };

  const dateStr = event.start_datetime
    ? new Date(event.start_datetime).toLocaleDateString('en-RW', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <div className="bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:border-[rgba(184,115,51,0.4)] transition-all duration-200 group">
      <div className="relative overflow-hidden">
        {event.cover_image ? (
          <img src={event.cover_image} alt={event.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-48 bg-[rgba(184,115,51,0.08)] flex items-center justify-center">
            <Calendar className="w-12 h-12 text-[#b87333]/30" />
          </div>
        )}
        <span className="absolute top-3 left-3 px-2 py-1 text-xs font-semibold text-white rounded-lg capitalize" style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}>
          {event.category}
        </span>
        {event.is_free && (
          <span className="absolute top-3 right-3 px-2 py-1 text-xs font-bold bg-green-500 text-white rounded-lg">FREE</span>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-bold text-[#f5f0e8] mb-3 line-clamp-2">{event.title}</h3>
        <div className="space-y-1.5 text-xs text-[#9a8f82] mb-4">
          <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-[#b87333]" />{dateStr}</div>
          <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#b87333]" />{[event.venue_name, event.city].filter(Boolean).join(', ') || '—'}</div>
          <p className="font-semibold text-[#b87333]">{lowestPrice()}</p>
        </div>
        <Link to={`/events/${event.id}`} className="block w-full py-2.5 text-center text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-opacity" style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}>
          Book Now
        </Link>
      </div>
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] overflow-hidden animate-pulse">
      <div className="w-full h-48 bg-gray-400/10" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-gray-400/10 rounded w-3/4" />
        <div className="h-3 bg-gray-400/10 rounded w-1/2" />
        <div className="h-3 bg-gray-400/10 rounded w-2/3" />
        <div className="h-10 bg-gray-400/10 rounded-xl mt-4" />
      </div>
    </div>
  );
}

// ─── Home page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [slide,          setSlide]          = useState(0);
  const [featuredEvents, setFeaturedEvents] = useState<EventItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);

  // Auto-advance carousel
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Fetch featured events
  useEffect(() => {
    eventsApi.featured()
      .then((res) => {
        const d = res.data;
        setFeaturedEvents(Array.isArray(d) ? d : d?.events ?? []);
      })
      .catch(() => setFeaturedEvents([]))
      .finally(() => setLoadingFeatured(false));
  }, []);

  // Fetch upcoming events
  useEffect(() => {
    eventsApi.upcoming(3)
      .then((res) => {
        const d = res.data;
        setUpcomingEvents(Array.isArray(d) ? d : d?.events ?? []);
      })
      .catch(() => setUpcomingEvents([]))
      .finally(() => setLoadingUpcoming(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navbar />

      {/* ── Hero Carousel ─────────────────────────────────────────────────── */}
      <div className="relative h-screen overflow-hidden">
        {SLIDES.map((s, i) => (
          <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ${i === slide ? 'opacity-100' : 'opacity-0'}`}>
            <img src={s.img} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60" />
          </div>
        ))}

        <div className="relative z-10 h-full flex items-center justify-center text-center px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-6xl font-extrabold text-white mb-6 leading-tight">
              {SLIDES[slide].heading}
            </h1>
            <p className="text-lg sm:text-xl text-white/80 mb-10">{SLIDES[slide].sub}</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to={SLIDES[slide].cta1.to} className="px-8 py-3.5 font-semibold text-white rounded-2xl hover:opacity-90 transition-opacity" style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}>
                {SLIDES[slide].cta1.label}
              </Link>
              <Link to={SLIDES[slide].cta2.to} className="px-8 py-3.5 font-semibold text-white rounded-2xl border-2 border-white hover:bg-white/10 transition-colors">
                {SLIDES[slide].cta2.label}
              </Link>
            </div>
          </div>
        </div>

        {/* Arrows */}
        <button onClick={() => setSlide((s) => (s - 1 + SLIDES.length) % SLIDES.length)} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button onClick={() => setSlide((s) => (s + 1) % SLIDES.length)} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors">
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} className={`h-2.5 rounded-full transition-all ${i === slide ? 'bg-[#b87333] w-6' : 'bg-white/50 hover:bg-white/80 w-2.5'}`} />
          ))}
        </div>
      </div>

      {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
      <div className="py-14" style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}>
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {STATS.map(({ icon: Icon, label, end }) => (
            <div key={label}>
              <Icon className="w-8 h-8 text-white/80 mx-auto mb-2" />
              <div className="text-3xl font-extrabold text-white"><AnimatedCounter end={end} /></div>
              <p className="text-white/80 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Featured Events ────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#111111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <Calendar className="w-7 h-7 text-[#b87333]" />
              <h2 className="text-3xl font-extrabold text-[#f5f0e8]">Featured Events</h2>
            </div>
            <Link to="/events?featured=true" className="text-sm text-[#b87333] hover:underline">View all →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingFeatured
              ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
              : featuredEvents.length > 0
                ? featuredEvents.slice(0, 3).map((e) => <EventCard key={e.id} event={e} />)
                : <p className="text-[#9a8f82] col-span-3 text-center py-10">No featured events yet.</p>
            }
          </div>
          <div className="text-center mt-10">
            <Link to="/events" className="inline-flex items-center gap-2 px-8 py-3.5 text-white font-semibold rounded-2xl hover:opacity-90 transition-opacity" style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}>
              View All Events
            </Link>
          </div>
        </div>
      </section>

      {/* ── Upcoming Events ────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-extrabold text-[#f5f0e8]">⏰ Upcoming Events</h2>
            <Link to="/events" className="text-sm text-[#b87333] hover:underline">See all →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingUpcoming
              ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
              : upcomingEvents.length > 0
                ? upcomingEvents.map((e) => <EventCard key={e.id} event={e} />)
                : <p className="text-[#9a8f82] col-span-3 text-center py-10">No upcoming events yet.</p>
            }
          </div>
        </div>
      </section>

      {/* ── Categories ─────────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#111111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold text-[#f5f0e8] mb-10 text-center">Browse by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {CATEGORIES.map(({ icon: Icon, label }) => (
              <Link key={label} to={`/events?category=${label}`}
                className="bg-[#242424] border border-[rgba(184,115,51,0.2)] rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-[rgba(184,115,51,0.5)] hover:shadow-[0_0_20px_rgba(184,115,51,0.15)] hover:-translate-y-0.5 transition-all group"
              >
                <Icon className="w-7 h-7 text-[#b87333] group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-[#f5f0e8] text-center capitalize">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#1a1a1a]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold text-[#f5f0e8] text-center mb-16">How It Works</h2>
          <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-0">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="flex-1 flex flex-col items-center text-center relative px-6">
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 h-0.5 bg-gradient-to-r from-[#b87333] to-transparent z-0" style={{ left: '60%', width: '40%' }} />
                )}
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white mb-4 z-10 relative shadow-lg" style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}>
                  <step.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-[#f5f0e8] mb-2">{step.title}</h3>
                <p className="text-sm text-[#9a8f82] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#111111]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold text-[#f5f0e8] text-center mb-12">What People Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-[#242424] rounded-2xl p-6 border-l-4 border-[#b87333] border border-[rgba(184,115,51,0.15)]">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-sm text-[#9a8f82] leading-relaxed mb-5 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.img} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-semibold text-[#f5f0e8]">{t.name}</p>
                    <p className="text-xs text-[#b87333]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#1a1a1a] text-center">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-[#f5f0e8] mb-4">Ready to Create Something Amazing?</h2>
          <p className="text-[#9a8f82] mb-8 leading-relaxed">Join thousands of organizers and attendees already using SmartEvent.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="px-8 py-3.5 text-white font-semibold rounded-2xl hover:opacity-90 transition-opacity" style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}>
              Get Started Free
            </Link>
            <Link to="/events" className="px-8 py-3.5 text-[#f5f0e8] font-semibold rounded-2xl border border-[rgba(184,115,51,0.3)] hover:bg-[rgba(184,115,51,0.08)] transition-colors">
              Browse Events
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}