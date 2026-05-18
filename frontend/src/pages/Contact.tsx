import { useState } from 'react';
import {
  MapPin, Phone, Mail, Clock,
  User, MessageSquare, Send, CheckCircle,
} from 'lucide-react';

import { FaTwitter, FaInstagram, FaFacebook, FaLinkedin } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useToast } from '../components/ui/use-toast';
import { contactApi } from '../api/client';

// ─── Static data ──────────────────────────────────────────────────────────────

const CONTACT_INFO = [
  { icon: MapPin, label: 'Address', value: 'Kigali, Rwanda'       },
  { icon: Phone,  label: 'Phone',   value: '+250 700 000 000'     },
  { icon: Mail,   label: 'Email',   value: 'hello@smartevent.rw'  },
  { icon: Clock,  label: 'Hours',   value: 'Mon–Fri  9am – 6pm'  },
] as const;

const SOCIALS = [
  { Icon: FaTwitter,   href: '#', label: 'Twitter'   },
  { Icon: FaInstagram, href: '#', label: 'Instagram'  },
  { Icon: FaFacebook,  href: '#', label: 'Facebook'   },
  { Icon: FaLinkedin,  href: '#', label: 'LinkedIn'   },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContactForm {
  name:    string;
  email:   string;
  subject: string;
  message: string;
}

const EMPTY_FORM: ContactForm = { name: '', email: '', subject: '', message: '' };

const INPUT_CLS = `w-full px-3 py-2.5 border border-[rgba(184,115,51,0.2)] rounded-xl
  focus:border-[#b87333] focus:outline-none focus:ring-1 focus:ring-[rgba(184,115,51,0.3)]
  text-sm bg-[#2a2a2a] text-[#f5f0e8] placeholder-[#9a8f82] transition-colors`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function Contact() {
  const { toast } = useToast();
  const [form,    setForm]    = useState<ContactForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const set = (key: keyof ContactForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  try {
    await contactApi.send(form);
    toast({ title: "✅ Message sent! We'll get back to you within 24 hours." });
    setForm(EMPTY_FORM);
    setSent(true);
  } catch (error) {
    console.error('Contact form error:', error);
    toast({ title: "❌ Failed to send. Please try again later.", variant: "destructive" });
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-[#f5f0e8] mb-3">Get in Touch</h1>
          <p className="text-[#9a8f82] text-lg max-w-xl mx-auto leading-relaxed">
            We'd love to hear from you. Send us a message and we'll respond within 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* ── Left: info + socials + map ─────────────────────────────── */}
          <div className="space-y-6">
            {/* Contact info cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CONTACT_INFO.map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="bg-[#242424] border border-[rgba(184,115,51,0.2)] rounded-2xl p-5 flex items-start gap-4 hover:border-[rgba(184,115,51,0.4)] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[rgba(184,115,51,0.15)] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[#b87333]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#9a8f82]">{label}</p>
                    <p className="text-sm font-semibold text-[#f5f0e8] mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Social links */}
            <div className="flex gap-3">
              {SOCIALS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-10 h-10 rounded-xl border border-[rgba(184,115,51,0.2)] flex items-center justify-center
                    text-[#9a8f82] hover:text-[#b87333] hover:border-[rgba(184,115,51,0.4)]
                    hover:bg-[rgba(184,115,51,0.08)] transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>

            {/* Map / office visual — CSS-based, no broken image */}
            <div
              className="rounded-2xl overflow-hidden border border-[rgba(184,115,51,0.2)]"
              style={{ height: '220px', background: 'linear-gradient(135deg,#1e1a16,#2d1f12)' }}
            >
              <div className="w-full h-full relative flex items-center justify-center">
                {/* Dot grid pattern */}
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, #b87333 1px, transparent 0)',
                    backgroundSize: '28px 28px',
                  }}
                />
                {/* Location pin */}
                <div className="relative z-10 text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-2xl"
                    style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
                  >
                    <MapPin className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-[#f5f0e8] font-bold text-lg">Kigali, Rwanda</p>
                  <p className="text-[#9a8f82] text-sm mt-1">East Africa</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: contact form ─────────────────────────────────────── */}
          <div className="bg-[#242424] border border-[rgba(184,115,51,0.2)] rounded-2xl p-8">
            <h2 className="text-xl font-bold text-[#f5f0e8] mb-6 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#b87333]" /> Send a Message
            </h2>

            {/* Success state */}
            {sent ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
                >
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-[#f5f0e8] mb-2">Message Sent!</h3>
                <p className="text-[#9a8f82] text-sm leading-relaxed max-w-xs">
                  Thank you for reaching out. We'll get back to you within 24 hours.
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="mt-6 px-6 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-opacity"
                  style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={form.name} onChange={set('name')}
                      placeholder="John Doe" required
                      className={`${INPUT_CLS} pl-10`}
                      autoComplete="name"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email" value={form.email} onChange={set('email')}
                      placeholder="you@example.com" required
                      className={`${INPUT_CLS} pl-10`}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">Subject</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={form.subject} onChange={set('subject')}
                      placeholder="How can we help?" required
                      className={`${INPUT_CLS} pl-10`}
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="text-xs font-medium text-[#9a8f82] mb-1.5 block">Message</label>
                  <textarea
                    value={form.message} onChange={set('message')}
                    rows={5} required
                    placeholder="Write your message here…"
                    className={`${INPUT_CLS} resize-none`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 text-white font-bold rounded-xl hover:opacity-90
                    disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <><Send className="w-4 h-4" /> Send Message</>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
