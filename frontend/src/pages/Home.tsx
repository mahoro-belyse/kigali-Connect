import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, ChevronLeft, ChevronRight, Star, Briefcase,
  Music, Wrench, BookOpen, Trophy, Users, Layout,
  Search, MapPin, Check, Sparkles, Clock, Award, TrendingUp,
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

// ─── Animation variants ──────────────────────────────────────────────────────

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.1 },
  },
};

const cardHover = {
  rest: { y: 0, scale: 1 },
  hover: { y: -6, scale: 1.02, transition: { duration: 0.2 } },
};
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

// ─── Redesigned Event Card (larger, more modern) ─────────────────────────────

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
    <motion.div
      variants={cardHover}
      initial="rest"
      whileHover="hover"
      animate="rest"
      className="group relative bg-gradient-to-br from-dark-card to-dark-surface rounded-2xl overflow-hidden shadow-xl border border-copper/20 hover:shadow-2xl transition-shadow"
    >
      <div className="relative h-56 overflow-hidden">
        {event.cover_image ? (
          <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-copper/10 flex items-center justify-center">
            <Calendar className="w-12 h-12 text-copper/40" />
          </div>
        )}
        <div className="absolute top-4 left-4 flex gap-2">
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-black/60 backdrop-blur-sm text-white capitalize">
            {event.category || 'Event'}
          </span>
          {event.is_free && (
            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-green-500/90 text-white">FREE</span>
          )}
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-bold text-lg text-ivory-light mb-2 line-clamp-1">{event.title}</h3>
        <div className="flex items-center gap-2 text-sm text-muted-text mb-3">
          <Calendar className="w-3.5 h-3.5 text-copper" />
          <span>{dateStr}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-text mb-4">
          <MapPin className="w-3.5 h-3.5 text-copper" />
          <span>{[event.venue_name, event.city].filter(Boolean).join(', ') || 'Online'}</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="font-bold text-copper">{lowestPrice()}</p>
          <Link
            to={`/events/${event.id}`}
            className="px-4 py-2 text-sm font-semibold text-white rounded-xl bg-copper/20 hover:bg-copper/40 transition-colors"
          >
            Book Now
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-dark-card rounded-2xl overflow-hidden animate-pulse">
      <div className="h-56 bg-gray-400/10" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-gray-400/10 rounded w-3/4" />
        <div className="h-4 bg-gray-400/10 rounded w-1/2" />
        <div className="h-4 bg-gray-400/10 rounded w-2/3" />
        <div className="flex justify-between mt-4">
          <div className="h-6 bg-gray-400/10 rounded w-1/3" />
          <div className="h-9 bg-gray-400/10 rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}

// ─── New component: Featured Section Title (with Sparkles) ───────────────────
function SectionTitle({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-12">
      <div className="inline-flex items-center justify-center p-2 bg-copper/10 rounded-2xl mb-4">
        <Icon className="w-6 h-6 text-copper" />
      </div>
      <h2 className="text-3xl md:text-4xl font-extrabold text-ivory-light mb-2">{title}</h2>
      {subtitle && <p className="text-muted-text max-w-2xl mx-auto">{subtitle}</p>}
    </div>
  );
}

// ─── Home page (redesigned) ───────────────────────────────────────────────────

export default function Home() {
  const [slide, setSlide] = useState(0);
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
    <div className="min-h-screen bg-dark-elevation">
      <Navbar />

      {/* ── Hero Carousel (unchanged) ─────────────────────────────────────── */}
      <div className="relative h-screen overflow-hidden">
        {SLIDES.map((s, i) => (
          <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ${i === slide ? 'opacity-100' : 'opacity-0'}`}>
            <img src={s.img} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60" />
          </div>
        ))}
        <div className="relative z-10 h-full flex items-center justify-center text-center px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl"
            >
              <h1 className="text-4xl sm:text-6xl font-extrabold text-white mb-6 leading-tight">
                {SLIDES[slide].heading}
              </h1>
              <p className="text-lg sm:text-xl text-white/80 mb-10">{SLIDES[slide].sub}</p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to={SLIDES[slide].cta1.to} className="px-8 py-3.5 font-semibold text-white rounded-2xl hover:opacity-90 transition-opacity bg-gradient-to-br from-copper to-copper-light">
                  {SLIDES[slide].cta1.label}
                </Link>
                <Link to={SLIDES[slide].cta2.to} className="px-8 py-3.5 font-semibold text-white rounded-2xl border-2 border-white hover:bg-white/10 transition-colors">
                  {SLIDES[slide].cta2.label}
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        <button onClick={() => setSlide((s) => (s - 1 + SLIDES.length) % SLIDES.length)} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button onClick={() => setSlide((s) => (s + 1) % SLIDES.length)} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white">
          <ChevronRight className="w-6 h-6" />
        </button>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} className={`h-2.5 rounded-full transition-all ${i === slide ? 'bg-copper w-6' : 'bg-white/50 w-2.5'}`} />
          ))}
        </div>
      </div>

      {/* ── Stats Bar (unchanged) ──────────────────────────────────────────── */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
        className="py-14 bg-gradient-to-br from-copper to-copper-light"
      >
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {STATS.map(({ icon: Icon, label, end }) => (
            <motion.div key={label} variants={fadeInUp}>
              <Icon className="w-8 h-8 text-white/80 mx-auto mb-2" />
              <div className="text-3xl font-extrabold text-white"><AnimatedCounter end={end} /></div>
              <p className="text-white/80 text-sm mt-1">{label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Featured Events (new design) ───────────────────────────────────── */}
      <section className="py-24 bg-dark-base">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionTitle icon={Sparkles} title="Featured Events" subtitle="Handpicked experiences you don't want to miss" />
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {loadingFeatured
              ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
              : featuredEvents.slice(0, 3).map((e) => <EventCard key={e.id} event={e} />)
            }
          </motion.div>
          <div className="text-center mt-12">
            <Link to="/events" className="inline-flex items-center gap-2 px-8 py-3 text-white font-semibold rounded-full border border-copper hover:bg-copper transition-colors">
              Explore All Events <TrendingUp className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Upcoming Events (new layout with countdown feel) ────────────────── */}
      <section className="py-24 bg-dark-elevation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionTitle icon={Clock} title="Happening Soon" subtitle="Events starting in the next few days" />
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {loadingUpcoming
              ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
              : upcomingEvents.map((e) => <EventCard key={e.id} event={e} />)
            }
          </motion.div>
        </div>
      </section>

      {/* ── Categories (new pill-shaped design) ────────────────────────────── */}
      <section className="py-24 bg-dark-base">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionTitle icon={Award} title="Browse by Category" subtitle="Find events that match your interests" />
          <motion.div
            className="flex flex-wrap justify-center gap-4"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {CATEGORIES.map(({ icon: Icon, label }) => (
              <motion.div key={label} variants={fadeInUp}>
                <Link
                  to={`/events?category=${label}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-dark-card border border-copper/30 hover:border-copper hover:shadow-md transition-all group"
                >
                  <Icon className="w-4 h-4 text-copper group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-ivory-light capitalize">{label}</span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How It Works (new horizontal timeline style) ────────────────────── */}
      <section className="py-24 bg-dark-elevation">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionTitle icon={Search} title="How It Works" subtitle="Three simple steps to your next great experience" />
          <div className="relative">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-copper/30 to-transparent -translate-y-1/2" />
            <div className="relative flex flex-col md:flex-row justify-between gap-8">
              {HOW_IT_WORKS.map((step, idx) => (
                <motion.div
                  key={idx}
                  variants={fadeInUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="flex-1 text-center relative z-10 bg-dark-card rounded-2xl p-6 border border-copper/20 shadow-lg"
                >
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-copper to-copper-light flex items-center justify-center text-white text-2xl font-bold mb-4">
                    {idx + 1}
                  </div>
                  <step.icon className="w-8 h-8 text-copper mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-ivory-light mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-text">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials (new card design with gradient border) ─────────────── */}
      <section className="py-24 bg-dark-base">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionTitle icon={Star} title="Loved by Users" subtitle="Real stories from our community" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="relative bg-dark-card rounded-2xl p-6 border border-copper/20 hover:border-copper/50 transition-all group"
              >
                <div className="absolute -top-3 left-6 w-8 h-8 rounded-full bg-copper flex items-center justify-center text-white font-bold">
                  “
                </div>
                <div className="pt-4">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-text text-sm leading-relaxed mb-5 italic">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <img src={t.img} alt={t.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-copper/30" />
                    <div>
                      <p className="text-sm font-semibold text-ivory-light">{t.name}</p>
                      <p className="text-xs text-copper">{t.role}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}