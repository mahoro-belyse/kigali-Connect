import { useLocation, Link } from 'react-router-dom';
import { Home, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PageNotFound() {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const pageName = location.pathname.substring(1) || 'this page';

  return (
    <div className="min-h-screen bg-dark-elevation flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-6">

        {/* 404 */}
        <div>
          <h1
            className="text-[130px] sm:text-[160px] font-extrabold leading-none select-none bg-gradient-to-br from-copper to-copper-light bg-clip-text text-transparent"
            style={{
              filter: 'drop-shadow(0 0 40px rgba(184,115,51,0.25))',
            }}
          >
            404
          </h1>
          <div className="h-0.5 w-16 mx-auto mt-2 rounded-full bg-gradient-to-r from-copper to-copper-light" />
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-ivory-light">Page Not Found</h2>
          <p className="text-muted-text text-sm leading-relaxed">
            The page{' '}
            <span className="font-semibold text-copper font-mono">
              "/{pageName}"
            </span>{' '}
            doesn't exist or has been moved.
          </p>
        </div>

        {/* Admin note */}
        {isAuthenticated && user?.role === 'admin' && (
          <div className="bg-dark-card rounded-2xl border border-copper/20 p-4 text-left">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-copper/15 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-copper" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ivory-light mb-1">Admin Note</p>
                <p className="text-xs text-muted-text leading-relaxed">
                  This page may not be implemented yet or the route is missing from{' '}
                  <span className="font-mono text-copper">App.tsx</span>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl
              text-sm font-semibold text-white hover:opacity-90 transition-opacity bg-gradient-to-br from-copper to-copper-light"
          >
            <Home className="w-4 h-4" /> Go Home
          </Link>

          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl
              text-sm font-semibold border border-copper/20
              text-ivory-light hover:bg-copper/8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>

          {isAuthenticated && (
            <Link
              to="/dashboard"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                text-sm font-semibold border border-copper/20
                text-copper hover:bg-copper/8 transition-colors"
            >
              Dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}