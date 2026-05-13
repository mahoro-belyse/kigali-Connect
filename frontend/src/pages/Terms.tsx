import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Section { id: string; title: string; content: string }

const SECTIONS: Section[] = [
  {
    id: 'acceptance', title: '1. Acceptance of Terms',
    content: 'By accessing or using the SmartEvent platform ("Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service. These terms apply to all visitors, users, and others who access or use the Service. We may update these terms at any time and will notify you of significant changes.',
  },
  {
    id: 'use', title: '2. Use of Service',
    content: 'You may use SmartEvent only for lawful purposes and in accordance with these Terms. You agree not to use the Service in any way that violates applicable laws, transmits harmful or offensive content, infringes on intellectual property rights, or attempts to gain unauthorised access to our systems. We reserve the right to terminate access for violations without prior notice.',
  },
  {
    id: 'accounts', title: '3. User Accounts',
    content: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorised use of your account. You must provide accurate, current, and complete information during registration and keep your information up to date.',
  },
  {
    id: 'booking', title: '4. Booking Policy',
    content: "Bookings are subject to availability. Once confirmed, a booking constitutes a contract between you and the event organizer. SmartEvent acts as an intermediary platform and is not responsible for event changes, cancellations, or modifications made by organizers. Always verify event details before completing a booking.",
  },
  {
    id: 'payment', title: '5. Payment Terms',
    content: 'All payments are processed securely through our payment partners. Prices are displayed in the local currency (RWF). SmartEvent may charge a service fee per transaction which will be clearly shown at checkout. You authorise us to charge the payment method you provide. Failed payments may result in automatic booking cancellation.',
  },
  {
    id: 'cancellation', title: '6. Cancellation Policy',
    content: "Cancellation policies vary by event and are set by individual organizers. SmartEvent's general policy allows cancellations up to 24 hours before event start for a full refund, subject to organizer approval. Free events can be cancelled at any time. Refunds are processed within 5–7 business days.",
  },
  {
    id: 'ip', title: '7. Intellectual Property',
    content: 'The SmartEvent platform, its content, features, and functionality are owned by SmartEvent and are protected by international intellectual property laws. You may not reproduce, distribute, modify, or create derivative works of any part of the Service without explicit written permission from SmartEvent.',
  },
  {
    id: 'liability', title: '8. Limitation of Liability',
    content: 'SmartEvent shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including but not limited to loss of profits, data, or goodwill. Our total liability is limited to the amount you paid for the specific transaction giving rise to the claim.',
  },
  {
    id: 'law', title: '9. Governing Law',
    content: 'These Terms are governed by and construed in accordance with the laws of Rwanda. Any disputes arising from or in connection with these Terms shall be resolved through binding arbitration in Kigali, Rwanda, unless both parties mutually agree to another jurisdiction or resolution method.',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Terms() {
  const [active, setActive] = useState('acceptance');

  // Scroll spy
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
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-[#f5f0e8] mb-1">Terms of Service</h1>
            <p className="text-sm text-[#9a8f82]">Last updated: May 9, 2026</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Sticky TOC sidebar ──────────────────────────────────────── */}
          <aside className="lg:w-64 shrink-0">
            <div className="sticky top-24 bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] p-4">
              <h3 className="text-xs font-semibold text-[#9a8f82] uppercase tracking-wider mb-3">
                Table of Contents
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
                These Terms of Service were last updated on May 9, 2026. By continuing to use SmartEvent after any updates, you agree to the revised terms. If you have questions about these terms, please contact us.
              </p>
              <div className="mt-4 flex gap-4">
                <Link to="/privacy" className="text-sm text-[#b87333] hover:underline">Privacy Policy →</Link>
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