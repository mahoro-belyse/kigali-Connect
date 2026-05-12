// src/pages/About.tsx
import { Shield, Zap, Heart, Star, Globe, Users, Calendar, MapPin, Smile, Clock } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// ─── Static data ──────────────────────────────────────────────────────────────

const VALUES = [
  { icon: Shield, title: 'Trust',         desc: 'We build trust through transparency, security, and reliability in everything we do.' },
  { icon: Zap,    title: 'Innovation',    desc: 'Constantly pushing boundaries to deliver cutting-edge event management tools.' },
  { icon: Heart,  title: 'Community',     desc: 'Events bring people together — and so do we. Community is at our core.' },
  { icon: Star,   title: 'Excellence',    desc: 'We strive for excellence in every feature, every interaction, every experience.' },
  { icon: Globe,  title: 'Reach',         desc: 'Connecting event organizers and attendees across Africa and beyond.' },
  { icon: Users,  title: 'Collaboration', desc: 'Great events are built by great teams. We empower collaboration at scale.' },
];

const TEAM = [
  {
    name: 'Amina Uwase', role: 'CEO & Co-Founder',
    bio: 'Serial entrepreneur with 10+ years in event management and technology.',
    img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
  },
  {
    name: 'Eric Habimana', role: 'CTO',
    bio: 'Full-stack engineer and systems architect passionate about scalable platforms.',
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
  },
  {
    name: 'Grace Mukamana', role: 'Head of Design',
    bio: 'Creative director crafting beautiful, user-centered digital experiences.',
    img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
  },
  {
    name: 'Jean Nzeyimana', role: 'Head of Growth',
    bio: 'Marketing strategist driving user acquisition and community growth across Africa.',
    img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
  },
];

const STATS = [
  { icon: Calendar, label: 'Events Hosted',       value: '1,200+' },
  { icon: MapPin,   label: 'Cities',               value: '25+'    },
  { icon: Smile,    label: 'Happy Users',          value: '120K+'  },
  { icon: Clock,    label: 'Years of Experience',  value: '5+'     },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function About() {
  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative h-72 sm:h-80 overflow-hidden">
        {/* CSS gradient background — no external image needed */}
        <div
          className="w-full h-full"
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2a1a0e 40%, #3d2210 70%, #b87333 100%)',
          }}
        />
        {/* Pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, #b87333 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <span className="inline-block text-4xl mb-3">🎉</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3">About SmartEvent</h1>
          <p className="text-white/75 text-lg max-w-xl leading-relaxed">
            Empowering event organizers and attendees across Africa with world-class tools.
          </p>
        </div>
      </div>

      {/* ── Mission ───────────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#111111]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-extrabold text-[#f5f0e8] mb-5">Our Mission</h2>
            <p className="text-[#9a8f82] leading-relaxed mb-4">
              SmartEvent was born out of a simple belief: great events deserve great tools. We set out
              to build a platform that empowers anyone — from solo organizers to large enterprises —
              to create, manage, and scale events effortlessly.
            </p>
            <p className="text-[#9a8f82] leading-relaxed mb-6">
              From intimate workshops in Kigali to massive conferences across the continent, our
              platform handles every detail — from ticketing and payments to attendee check-in and
              real-time analytics.
            </p>
            <h3 className="text-xl font-bold text-[#f5f0e8] mt-6 mb-3">Our Vision</h3>
            <p className="text-[#9a8f82] leading-relaxed">
              To become Africa's most trusted event platform — connecting communities, celebrating
              cultures, and creating memories that last a lifetime.
            </p>
          </div>

          {/* Mission visual — CSS-based, no external images */}
          <div className="rounded-2xl overflow-hidden border border-[rgba(184,115,51,0.2)]" style={{ background: 'linear-gradient(135deg,#1e1a16,#2d1f12)' }}>
            <div className="p-10 grid grid-cols-2 gap-4">
              {[
                { emoji: '🎯', label: 'Goal-driven'   },
                { emoji: '🌍', label: 'Pan-African'   },
                { emoji: '🔒', label: 'Secure'         },
                { emoji: '⚡', label: 'Lightning fast' },
              ].map(({ emoji, label }) => (
                <div
                  key={label}
                  className="flex flex-col items-center justify-center p-6 rounded-2xl border border-[rgba(184,115,51,0.15)] bg-[rgba(184,115,51,0.05)] hover:bg-[rgba(184,115,51,0.1)] transition-colors"
                >
                  <span className="text-3xl mb-2">{emoji}</span>
                  <p className="text-sm font-semibold text-[#f5f0e8]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#1a1a1a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-[#f5f0e8] mb-3">Our Values</h2>
            <p className="text-[#9a8f82] max-w-xl mx-auto">
              The principles that guide every decision we make and every feature we build.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-[#242424] border border-[rgba(184,115,51,0.2)] rounded-2xl p-6
                  hover:-translate-y-1 hover:shadow-xl hover:border-[rgba(184,115,51,0.4)] transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-xl bg-[rgba(184,115,51,0.15)] flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-[#b87333]" />
                </div>
                <h3 className="font-bold text-[#f5f0e8] mb-2">{title}</h3>
                <p className="text-sm text-[#9a8f82] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ──────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#111111]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-[#f5f0e8] mb-3">Meet the Team</h2>
            <p className="text-[#9a8f82]">The people behind SmartEvent</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM.map(({ name, role, bio, img }) => (
              <div
                key={name}
                className="bg-[#242424] border border-[rgba(184,115,51,0.2)] rounded-2xl p-6 text-center
                  hover:-translate-y-1 hover:border-[rgba(184,115,51,0.4)] transition-all duration-200"
              >
                <img
                  src={img}
                  alt={name}
                  className="w-20 h-20 rounded-full object-cover mx-auto mb-4 ring-4 ring-[rgba(184,115,51,0.3)]"
                  loading="lazy"
                />
                <h3 className="font-bold text-[#f5f0e8]">{name}</h3>
                <p className="text-sm text-[#b87333] font-medium mb-2">{role}</p>
                <p className="text-xs text-[#9a8f82] leading-relaxed">{bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats banner ──────────────────────────────────────────────────── */}
      <section
        className="py-14"
        style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
      >
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {STATS.map(({ icon: Icon, label, value }) => (
            <div key={label}>
              <Icon className="w-8 h-8 text-white/80 mx-auto mb-2" />
              <div className="text-3xl font-extrabold text-white">{value}</div>
              <p className="text-white/80 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#1a1a1a] text-center">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-[#f5f0e8] mb-4">Ready to get started?</h2>
          <p className="text-[#9a8f82] mb-8 leading-relaxed">
            Join thousands of organizers and attendees already using SmartEvent across Africa.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/register"
              className="px-8 py-3 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
            >
              Get Started Free
            </a>
            <a
              href="/contact"
              className="px-8 py-3 rounded-xl text-[#f5f0e8] font-semibold border border-[rgba(184,115,51,0.3)] hover:bg-[rgba(184,115,51,0.08)] transition-colors"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
