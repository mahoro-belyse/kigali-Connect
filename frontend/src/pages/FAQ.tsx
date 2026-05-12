import { useState } from 'react';
import { ChevronDown, Search, HelpCircle, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// ─── FAQ data ─────────────────────────────────────────────────────────────────

interface FAQItem { category: string; q: string; a: string }

const FAQS: FAQItem[] = [
  // General
  { category: 'General',  q: 'What is SmartEvent?',             a: 'SmartEvent is a comprehensive event management and booking platform built for organizers and attendees across Africa. From small workshops to large conferences, we handle every detail.' },
  { category: 'General',  q: 'Is SmartEvent free to use?',      a: 'SmartEvent offers a free plan for attendees. Event organizers can create up to 3 free events per month. Paid plans unlock unlimited events, advanced analytics, and priority support.' },
  { category: 'General',  q: 'Which countries do you support?', a: 'We currently support Rwanda, Kenya, Uganda, Tanzania and are expanding to more African countries throughout 2026.' },
  { category: 'General',  q: 'How do I contact support?',       a: 'You can reach us via the Contact page or email hello@smartevent.rw. Our team responds within 24 hours on business days.' },

  // Bookings
  { category: 'Bookings', q: 'How do I book an event?',                    a: 'Browse events on the Events page, click "View Details", select your ticket type and quantity, then click "Book Now". You\'ll need to be signed in to complete a booking.' },
  { category: 'Bookings', q: 'Can I cancel my booking?',                   a: 'Yes. Go to Dashboard → My Bookings, find your booking, and click Cancel. Cancellations are available as long as the event hasn\'t started and the booking isn\'t already attended.' },
  { category: 'Bookings', q: 'Where do I find my tickets?',                a: 'All tickets are in your Dashboard under "My Bookings". Each booking has a QR code ticket you can view, download, or print.' },
  { category: 'Bookings', q: 'Can I transfer my ticket to someone else?',  a: 'Ticket transfers are currently not supported. If you need help, contact support at hello@smartevent.rw and we\'ll assist you.' },

  // Payments
  { category: 'Payments', q: 'What payment methods are accepted?',  a: 'We accept credit/debit cards, Mobile Money (MTN MoMo, Airtel Money), bank transfers, and cash payments at selected venues.' },
  { category: 'Payments', q: 'Is my payment information secure?',   a: 'Yes. All payments are processed through secure, encrypted channels. We never store card details on our servers.' },
  { category: 'Payments', q: 'Can I get a refund?',                 a: 'Refunds are available for cancelled bookings according to the organizer\'s refund policy. Full refunds are processed within 5–7 business days.' },
  { category: 'Payments', q: 'Will I receive a receipt?',           a: 'Yes. A payment receipt with a unique receipt number is generated immediately after each successful transaction and visible in your Payments section.' },

  // Events
  { category: 'Events',   q: 'How do I create an event?',           a: 'Register as an Event Manager or Admin, go to Dashboard → Events, and click "Create Event". Fill in the details across the three tabs: Basic Info, Settings, and Ticket Tiers.' },
  { category: 'Events',   q: 'Can I publish a free event?',          a: 'Yes! When creating your event, toggle "Free Event" in the Settings tab. All ticket prices will automatically be set to 0 RWF.' },
  { category: 'Events',   q: 'How do I manage check-ins?',           a: 'Use Dashboard → Check-In to scan QR codes or enter booking references manually. You\'ll also see a live attendance counter per event.' },
  { category: 'Events',   q: 'Can I add multiple ticket types?',     a: 'Yes. You can add General, VIP, Early Bird, Student, and Group ticket tiers per event, each with its own price, quantity, and benefits.' },

  // Account
  { category: 'Account',  q: 'How do I change my password?',  a: 'Go to Dashboard → Profile → Change Password. Enter your current password, then your new password (min 8 characters with uppercase, number, and special character).' },
  { category: 'Account',  q: 'Can I change my role?',         a: 'Account roles (Client, Event Manager, Admin) are assigned by administrators. Contact support to request a role upgrade.' },
  { category: 'Account',  q: 'How do I delete my account?',   a: 'Contact our support team at hello@smartevent.rw to request account deletion. We\'ll process the request within 7 business days.' },
  { category: 'Account',  q: 'Is my personal data safe?',     a: 'Yes. We follow strict data protection practices including encrypted storage, secure API access, and never selling user data. See our Privacy Policy for full details.' },
];

const CATEGORIES = ['General', 'Bookings', 'Payments', 'Events', 'Account'];

// ─── Category icons ───────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  General:  '🌍',
  Bookings: '🎟️',
  Payments: '💳',
  Events:   '📅',
  Account:  '👤',
};

// ─── Accordion item ───────────────────────────────────────────────────────────

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${
      open ? 'border-[rgba(184,115,51,0.4)] bg-[rgba(184,115,51,0.04)]' : 'border-[rgba(184,115,51,0.15)] bg-[#242424]'
    }`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-[rgba(184,115,51,0.04)] transition-colors"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-[#f5f0e8] pr-4 leading-snug">{q}</span>
        <ChevronDown
          className={`w-4 h-4 text-[#b87333] shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Animated answer */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? '200px' : '0' }}
      >
        <div className="px-4 pb-4 pt-0">
          <div className="h-px w-full bg-[rgba(184,115,51,0.1)] mb-3" />
          <p className="text-sm text-[#9a8f82] leading-relaxed">{a}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FAQ() {
  const [search,   setSearch]   = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Filter by search + active category tab
  const filtered = FAQS.filter((f) => {
    const matchSearch = !search ||
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase());
    const matchCat = !activeCategory || f.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">

        {/* Header */}
        <div className="text-center mb-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
          >
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-[#f5f0e8] mb-3">
            Frequently Asked Questions
          </h1>
          <p className="text-[#9a8f82]">
            Can't find what you're looking for?{' '}
            <Link to="/contact" className="text-[#b87333] hover:underline">Contact us</Link>
          </p>
        </div>

        {/* Search bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions…"
            className="w-full pl-12 pr-4 py-3.5 border border-[rgba(184,115,51,0.2)] rounded-2xl
              focus:border-[#b87333] focus:outline-none focus:ring-1 focus:ring-[rgba(184,115,51,0.3)]
              text-sm bg-[#2a2a2a] text-[#f5f0e8] placeholder-[#9a8f82] transition-colors"
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-10">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-4 py-2 text-sm rounded-xl border font-medium transition-colors ${
              !activeCategory
                ? 'text-white border-transparent'
                : 'border-[rgba(184,115,51,0.2)] text-[#9a8f82] hover:border-[rgba(184,115,51,0.4)]'
            }`}
            style={!activeCategory ? { background: 'linear-gradient(135deg,#b87333,#d4956a)' } : {}}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-4 py-2 text-sm rounded-xl border font-medium transition-colors ${
                activeCategory === cat
                  ? 'text-white border-transparent'
                  : 'border-[rgba(184,115,51,0.2)] text-[#9a8f82] hover:border-[rgba(184,115,51,0.4)]'
              }`}
              style={activeCategory === cat ? { background: 'linear-gradient(135deg,#b87333,#d4956a)' } : {}}
            >
              {CATEGORY_EMOJI[cat]} {cat}
            </button>
          ))}
        </div>

        {/* FAQ sections */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="w-12 h-12 text-[#b87333]/30 mx-auto mb-4" />
            <p className="text-[#f5f0e8] font-semibold mb-2">No results found</p>
            <p className="text-[#9a8f82] text-sm mb-4">
              We couldn't find anything for "{search}"
            </p>
            <Link to="/contact" className="text-[#b87333] hover:underline text-sm">
              Contact us for help →
            </Link>
          </div>
        ) : (
          CATEGORIES.map((cat) => {
            const items = filtered.filter((f) => f.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="mb-8">
                <h2 className="font-bold text-[#f5f0e8] mb-3 flex items-center gap-2 text-lg">
                  <div
                    className="w-1.5 h-5 rounded-full shrink-0"
                    style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
                  />
                  {CATEGORY_EMOJI[cat]} {cat}
                  <span className="text-xs font-normal text-[#9a8f82] ml-1">
                    ({items.length})
                  </span>
                </h2>
                <div className="space-y-2">
                  {items.map((f, i) => (
                    <AccordionItem key={`${cat}-${i}`} q={f.q} a={f.a} />
                  ))}
                </div>
              </div>
            );
          })
        )}

        {/* Bottom CTA */}
        <div className="mt-12 p-6 rounded-2xl border border-[rgba(184,115,51,0.2)] bg-[#242424] text-center">
          <HelpCircle className="w-8 h-8 text-[#b87333] mx-auto mb-3" />
          <h3 className="font-bold text-[#f5f0e8] mb-2">Still have questions?</h3>
          <p className="text-sm text-[#9a8f82] mb-4">
            Our support team is available Monday–Friday, 9am–6pm EAT
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
          >
            <MessageCircle className="w-4 h-4" /> Contact Support
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
