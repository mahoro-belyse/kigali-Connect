// src/lib/PageNotFound.tsx
import { useLocation, Link } from 'react-router-dom';
import { Home, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function PageNotFound() {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const pageName = location.pathname.substring(1) || 'this page';

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-6">

        {/* 404 */}
        <div>
          <h1
            className="text-[130px] sm:text-[160px] font-extrabold leading-none select-none"
            style={{
              background: 'linear-gradient(135deg,#b87333,#d4956a)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 40px rgba(184,115,51,0.25))',
            }}
          >
            404
          </h1>
          <div
            className="h-0.5 w-16 mx-auto mt-2 rounded-full"
            style={{ background: 'linear-gradient(90deg,#b87333,#d4956a)' }}
          />
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-[#f5f0e8]">Page Not Found</h2>
          <p className="text-[#9a8f82] text-sm leading-relaxed">
            The page{' '}
            <span className="font-semibold text-[#b87333] font-mono">
              "/{pageName}"
            </span>{' '}
            doesn't exist or has been moved.
          </p>
        </div>

        {/* Admin note */}
        {isAuthenticated && user?.role === 'admin' && (
          <div className="bg-[#242424] rounded-2xl border border-[rgba(184,115,51,0.2)] p-4 text-left">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[rgba(184,115,51,0.15)] flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-[#b87333]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#f5f0e8] mb-1">Admin Note</p>
                <p className="text-xs text-[#9a8f82] leading-relaxed">
                  This page may not be implemented yet or the route is missing from{' '}
                  <span className="font-mono text-[#b87333]">App.tsx</span>.
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
              text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}
          >
            <Home className="w-4 h-4" /> Go Home
          </Link>

          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl
              text-sm font-semibold border border-[rgba(184,115,51,0.2)]
              text-[#f5f0e8] hover:bg-[rgba(184,115,51,0.08)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>

          {isAuthenticated && (
            <Link
              to="/dashboard"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                text-sm font-semibold border border-[rgba(184,115,51,0.2)]
                text-[#b87333] hover:bg-[rgba(184,115,51,0.08)] transition-colors"
            >
              Dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
