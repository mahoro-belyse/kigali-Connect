import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// ─── Data ─────────────────────────────────────────────────────────────────────

interface PolicySection { id: string; title: string; content: string }

const SECTIONS: PolicySection[] = [
  {
    id: 'collect', title: 'Information We Collect',
    content: 'We collect information you provide directly (name, email, phone, payment details), data generated through your use of our Service (events browsed, bookings made, pages visited), and technical data (IP address, browser type, device info). This data is necessary to provide and continuously improve our services.',
  },
  {
    id: 'use', title: 'How We Use It',
    content: 'We use your information to process bookings and payments, send booking confirmations and event reminders, personalise your experience, improve our platform through analytics, comply with legal obligations, and communicate important service updates. We never use your data for purposes unrelated to the Service.',
  },
  {
    id: 'sharing', title: 'Information Sharing',
    content: 'We share your information with event organizers (for events you book), payment processors (to complete transactions securely), and infrastructure service providers (hosting, analytics). We do not sell your personal data to third parties. We may disclose data when required by law or to protect our rights.',
  },
  {
    id: 'cookies', title: 'Cookies',
    content: 'We use cookies and similar technologies for authentication, session management, analytics, and personalisation. Essential cookies are required for the platform to function. Analytics cookies help us understand usage patterns. You can control cookie settings in your browser, though disabling certain cookies may affect platform functionality.',
  },
  {
    id: 'security', title: 'Data Security',
    content: 'We implement industry-standard security measures including TLS encryption in transit, encrypted storage at rest, access controls, and regular security audits. While we strive to protect your data, no method of transmission over the Internet is 100% secure. We will notify you promptly in the event of a data breach.',
  },
  {
    id: 'rights', title: 'Your Rights',
    content: 'You have the right to access, correct, or delete your personal data. You may opt out of marketing communications at any time via the unsubscribe link in any email. You may request a copy of your data in a portable format. To exercise any of these rights, contact us at privacy@smartevent.rw. We will respond within 30 days.',
  },
  {
    id: 'contact', title: 'Contact Us',
    content: 'For privacy-related questions, concerns, or requests, contact our Data Protection Officer at privacy@smartevent.rw or write to SmartEvent, KG 7 Ave, Kigali, Rwanda. We take all privacy concerns seriously and will respond promptly.',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Privacy() {
  const [active, setActive] = useState('collect');

  // Scroll spy — highlight TOC item as section enters viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">

        {/* Header */}
        <div className="mb-10 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mt-1" style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}>
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-[#f5f0e8] mb-1">Privacy Policy</h1>
            <p className="text-sm text-[#9a8f82]">Last updated: May 9, 2026</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Sticky TOC sidebar ──────────────────────────────────────── */}
          <aside className="lg:w-64 shrink-0">
            <div className="sticky top-24 bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] p-4">
              <h3 className="text-xs font-semibold text-[#9a8f82] uppercase tracking-wider mb-3">
                Sections
              </h3>
              <nav className="space-y-1">
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className={`flex items-center gap-2 text-sm py-1.5 px-3 rounded-lg transition-colors ${
                      active === s.id
                        ? 'text-[#b87333] bg-[rgba(184,115,51,0.1)] font-medium'
                        : 'text-[#9a8f82] hover:text-[#f5f0e8] hover:bg-[rgba(184,115,51,0.05)]'
                    }`}
                  >
                    {active === s.id && (
                      <div className="w-1 h-4 rounded-full shrink-0" style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }} />
                    )}
                    <span className={active === s.id ? '' : 'ml-3'}>{s.title}</span>
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* ── Content ─────────────────────────────────────────────────── */}
          <div className="flex-1 space-y-12">
            {SECTIONS.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-6 rounded-full shrink-0" style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }} />
                  <h2 className="text-xl font-bold text-[#f5f0e8]">{s.title}</h2>
                </div>
                <p className="text-[#9a8f82] leading-relaxed pl-4">{s.content}</p>
              </section>
            ))}

            {/* Footer note */}
            <div className="p-5 rounded-2xl border border-[rgba(184,115,51,0.2)] bg-[#242424]">
              <p className="text-sm text-[#9a8f82] leading-relaxed">
                This Privacy Policy may be updated from time to time. We will notify you of significant changes via email or a notice on our platform. Continued use of SmartEvent after changes constitutes your acceptance of the updated policy.
              </p>
              <div className="mt-4 flex gap-4">
                <Link to="/terms" className="text-sm text-[#b87333] hover:underline">Terms of Service →</Link>
                <Link to="/contact" className="text-sm text-[#b87333] hover:underline">Contact Us →</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}