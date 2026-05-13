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
    <div className="min-h-screen bg-dark-elevation flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-dark-card rounded-3xl border border-copper/20 shadow-2xl overflow-hidden">

          {/* Top accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-copper to-copper-light" />

          <div className="p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-2xl bg-copper/10 border border-copper/20 flex items-center justify-center">
                <ShieldAlert className="w-10 h-10 text-copper" />
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-2xl font-extrabold text-ivory-light text-center mb-3">
              Access Restricted
            </h1>
            <p className="text-muted-text text-sm text-center leading-relaxed mb-6">
              Your account is not registered or approved for this application.
              Please contact the administrator to request access.
            </p>

            {/* Info box */}
            <div className="bg-dark-elevation rounded-2xl border border-copper/15 p-4 mb-6">
              <p className="text-xs font-semibold text-copper uppercase tracking-wide mb-3">
                What you can do:
              </p>
              <ul className="space-y-2 text-sm text-muted-text">
                {[
                  'Verify you are logged in with the correct account',
                  'Contact the administrator for access approval',
                  'Try logging out and signing in again',
                  'Check your email for an approval notification',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-copper mt-0.5">•</span>
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
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 bg-gradient-to-br from-copper to-copper-light"
              >
                <Mail className="w-4 h-4" />
                Contact Administrator
              </a>

              {/* Retry */}
              <button
                onClick={handleRetry}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold
                  border border-copper/20 text-ivory-light
                  hover:bg-copper/8 transition-colors"
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
        <p className="text-center text-xs text-muted-text mt-6">
          SmartEvent &copy; {new Date().getFullYear()} &middot;{' '}
          <a href="/contact" className="text-copper hover:underline">
            Get Help
          </a>
        </p>
      </div>
    </div>
  );
}