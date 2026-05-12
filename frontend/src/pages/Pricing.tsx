import { Check, X, Star, Zap, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plan {
  name: string;
  price: string;
  period: string;
  desc: string;
  icon: React.ElementType;
  features: string[];
  missing: string[];
  cta: string;
  to: string;
  popular: boolean;
}

interface ComparisonRow {
  feature: string;
  free: string | boolean;
  pro: string | boolean;
  ent: string | boolean;
}

// ─── Static data ──────────────────────────────────────────────────────────────

const PLANS: Plan[] = [
  {
    name: 'Free', price: '$0', period: '/month',
    desc: 'Perfect for individuals getting started',
    icon: Star,
    features: ['Up to 3 events/month', 'Basic analytics', '100 attendees max', 'Email support', 'QR check-in'],
    missing: ['Custom branding', 'Priority support', 'Advanced analytics', 'Unlimited events'],
    cta: 'Get Started', to: '/register', popular: false,
  },
  {
    name: 'Professional', price: '$29', period: '/month',
    desc: 'For serious organizers scaling their events',
    icon: Zap,
    features: ['Unlimited events', 'Advanced analytics', '5,000 attendees max', 'Priority email support', 'QR check-in', 'Custom branding', 'Ticket scanning app', 'Export reports'],
    missing: ['Dedicated account manager', 'White-label solution'],
    cta: 'Get Started', to: '/register', popular: true,
  },
  {
    name: 'Enterprise', price: 'Contact Us', period: '',
    desc: 'For large organizations with custom needs',
    icon: Building2,
    features: ['Unlimited events', 'Unlimited attendees', 'Dedicated account manager', 'White-label solution', 'Custom integrations', 'SLA guarantee', 'Phone support', 'Custom analytics', 'API access', 'SSO / SAML'],
    missing: [],
    cta: 'Contact Sales', to: '/contact', popular: false,
  },
];

const COMPARISON: ComparisonRow[] = [
  { feature: 'Events per month',   free: '3',    pro: 'Unlimited', ent: 'Unlimited' },
  { feature: 'Max attendees',      free: '100',  pro: '5,000',     ent: 'Unlimited' },
  { feature: 'Custom branding',    free: false,  pro: true,        ent: true        },
  { feature: 'Advanced analytics', free: false,  pro: true,        ent: true        },
  { feature: 'QR check-in',        free: true,   pro: true,        ent: true        },
  { feature: 'Priority support',   free: false,  pro: true,        ent: true        },
  { feature: 'API access',         free: false,  pro: false,       ent: true        },
  { feature: 'White-label',        free: false,  pro: false,       ent: true        },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Pricing() {
  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">

        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#f5f0e8] mb-4">
            Simple, Transparent Pricing
          </h1>
          <div className="w-16 h-1 mx-auto rounded-full mb-5" style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }} />
          <p className="text-[#9a8f82] text-lg max-w-xl mx-auto">
            Choose the plan that's right for you. Upgrade, downgrade, or cancel anytime.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 items-start">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className={`relative rounded-3xl p-8 flex flex-col transition-all hover:-translate-y-1 hover:shadow-2xl
                  ${plan.popular
                    ? 'border-2 border-[#b87333] shadow-[0_0_40px_rgba(184,115,51,0.2)] bg-[#242424] scale-105'
                    : 'border border-[rgba(184,115,51,0.2)] bg-[#242424]'
                  }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 text-xs font-bold text-white rounded-full whitespace-nowrap" style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}>
                    ⭐ Most Popular
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-5">
                  <div className="w-12 h-12 rounded-xl bg-[rgba(184,115,51,0.15)] flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-[#b87333]" />
                  </div>
                  <h3 className="text-xl font-extrabold text-[#f5f0e8]">{plan.name}</h3>
                  <p className="text-sm text-[#9a8f82] mt-1">{plan.desc}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-[#f5f0e8]">{plan.price}</span>
                  <span className="text-[#9a8f82] text-sm">{plan.period}</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-[#f5f0e8]">{f}</span>
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm opacity-40">
                      <X className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <span className="text-[#9a8f82]">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  to={plan.to}
                  className={`block text-center py-3 rounded-xl font-bold transition-all hover:opacity-90
                    ${plan.popular
                      ? 'text-white'
                      : 'border-2 border-[#b87333] text-[#b87333] hover:bg-[rgba(184,115,51,0.1)]'
                    }`}
                  style={plan.popular ? { background: 'linear-gradient(135deg,#b87333,#d4956a)' } : {}}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>

        {/* Comparison table */}
        <div>
          <h2 className="text-2xl font-extrabold text-[#f5f0e8] text-center mb-8">Feature Comparison</h2>
          <div className="bg-[#242424] border border-[rgba(184,115,51,0.2)] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(184,115,51,0.15)] bg-black/20">
                  <th className="text-left py-4 px-6 font-semibold text-[#9a8f82]">Feature</th>
                  {['Free', 'Professional', 'Enterprise'].map((h) => (
                    <th key={h} className={`py-4 px-4 text-center font-semibold ${h === 'Professional' ? 'text-[#b87333]' : 'text-[#f5f0e8]'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.feature} className={`border-b border-[rgba(184,115,51,0.08)] ${i % 2 === 0 ? 'bg-black/10' : ''}`}>
                    <td className="py-3.5 px-6 text-[#f5f0e8]">{row.feature}</td>
                    {([row.free, row.pro, row.ent] as (string | boolean)[]).map((val, j) => (
                      <td key={j} className="py-3.5 px-4 text-center">
                        {typeof val === 'boolean' ? (
                          val
                            ? <Check className="w-5 h-5 text-green-500 mx-auto" />
                            : <X className="w-5 h-5 text-gray-400 mx-auto opacity-40" />
                        ) : (
                          <span className="text-sm font-medium text-[#f5f0e8]">{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-[#9a8f82] mb-4">Have questions about our pricing?</p>
          <Link to="/contact" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold border border-[rgba(184,115,51,0.3)] text-[#b87333] rounded-xl hover:bg-[rgba(184,115,51,0.08)] transition-colors">
            Contact Sales
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}