import { ShieldAlert, LogOut, RefreshCw, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function UserNotRegisteredError() {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-[#242424] rounded-3xl border border-[rgba(184,115,51,0.2)] shadow-2xl overflow-hidden">

          {/* Top accent bar */}
          <div
            className="h-1.5 w-full"
            style={{ background: 'linear-gradient(90deg,#b87333,#d4956a)' }}
          />

          <div className="p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-2xl bg-[rgba(184,115,51,0.1)] border border-[rgba(184,115,51,0.2)] flex items-center justify-center">
                <ShieldAlert className="w-10 h-10 text-[#b87333]" />
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-2xl font-extrabold text-[#f5f0e8] text-center mb-3">
              Access Restricted
            </h1>
            <p className="text-[#9a8f82] text-sm text-center leading-relaxed mb-6">
              Your account is not registered or approved for this application.
              Please contact the administrator to request access.
            </p>

            {/* Info box */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-[rgba(184,115,51,0.15)] p-4 mb-6">
              <p className="text-xs font-semibold text-[#b87333] uppercase tracking-wide mb-3">
                What you can do:
              </p>
              <ul className="space-y-2 text-sm text-[#9a8f82]">
                {[
                  'Verify you are logged in with the correct account',
                  'Contact the administrator for access approval',
                  'Try logging out and signing in again',
                  'Check your email for an approval notification',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-[#b87333] mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {/* Contact admin */}
              <a
                href="mailto:admin@smartevents.com"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
              >
                <Mail className="w-4 h-4" />
                Contact Administrator
              </a>

              {/* Retry */}
              <button
                onClick={handleRetry}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold
                  border border-[rgba(184,115,51,0.2)] text-[#f5f0e8]
                  hover:bg-[rgba(184,115,51,0.08)] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium
                  text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-[#9a8f82] mt-6">
          SmartEvent &copy; {new Date().getFullYear()} &middot;{' '}
          <a href="/contact" className="text-[#b87333] hover:underline">
            Get Help
          </a>
        </p>
      </div>
    </div>
  );
}
