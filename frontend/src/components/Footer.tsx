import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail } from 'lucide-react';
import { FaTwitter, FaInstagram, FaFacebook, FaLinkedin } from 'react-icons/fa';

const PLATFORM_LINKS = [
  ['/', 'Home'],
  ['/events', 'Events'],
  ['/pricing', 'Pricing'],
  ['/about', 'About Us'],
] as const;

const SUPPORT_LINKS = [
  ['/faq',     'FAQ'],
  ['/contact', 'Contact'],
  ['/terms',   'Terms of Service'],
  ['/privacy', 'Privacy Policy'],
] as const;

const SOCIAL = [
  { Icon: FaTwitter,   href: '#', label: 'Twitter'  },
  { Icon: FaInstagram, href: '#', label: 'Instagram' },
  { Icon: FaFacebook,  href: '#', label: 'Facebook'  },
  { Icon: FaLinkedin,  href: '#', label: 'LinkedIn'  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-dark-base border-t border-copper/15">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

        {/* ── Brand ──────────────────────────────────────────────────────────── */}
        <div>
          <Link to="/" className="text-xl font-extrabold mb-3 block">
            <span className="bg-gradient-to-br from-copper to-copper-light bg-clip-text text-transparent">
              Smart
            </span>
            <span className="text-white">Event</span>
          </Link>
          <p className="text-gray-400 text-sm leading-relaxed mb-5">
            Connecting event organizers and attendees across Africa. The smartest
            way to discover, book, and manage events.
          </p>
          <div className="flex gap-3">
            {SOCIAL.map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center
                  text-gray-400 hover:text-copper hover:bg-copper/10
                  transition-colors"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        {/* ── Platform links ─────────────────────────────────────────────────── */}
        <div>
          <h4 className="text-white font-semibold mb-4">Platform</h4>
          <ul className="space-y-2.5 text-sm text-gray-400">
            {PLATFORM_LINKS.map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="hover:text-copper transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Support links ──────────────────────────────────────────────────── */}
        <div>
          <h4 className="text-white font-semibold mb-4">Support</h4>
          <ul className="space-y-2.5 text-sm text-gray-400">
            {SUPPORT_LINKS.map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="hover:text-copper transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Contact ────────────────────────────────────────────────────────── */}
        <div>
          <h4 className="text-white font-semibold mb-4">Contact Us</h4>
          <ul className="space-y-3 text-sm text-gray-400">
            <li className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-copper mt-0.5 shrink-0" />
              Kigali, Rwanda
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-copper shrink-0" />
              +250 700 000 000
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-copper shrink-0" />
              <a href="mailto:hello@smartevent.rw" className="hover:text-copper transition-colors">
                hello@smartevent.rw
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* ── Bottom bar ─────────────────────────────────────────────────────────── */}
      <div className="border-t border-copper/10 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <span>&copy; {year} SmartEvent. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/terms"   className="hover:text-copper transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-copper transition-colors">Privacy</Link>
            <Link to="/faq"     className="hover:text-copper transition-colors">FAQ</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}