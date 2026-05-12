
import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

// ─── Query Client ─────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// ─── Copper Spinner (shown during lazy load) ──────────────────────────────────
const PageSpinner = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-[#1a1a1a]">
    <div className="w-10 h-10 border-4 border-[rgba(184,115,51,0.2)] border-t-[#b87333] rounded-full animate-spin" />
  </div>
);

// ─── Lazy-loaded Public Pages ─────────────────────────────────────────────────
const Home       = lazy(() => import('@/pages/Home'));
const Events     = lazy(() => import('@/pages/Events'));
const EventDetail = lazy(() => import('@/pages/EventDetail'));
const Auth       = lazy(() => import('@/pages/Auth'));
const About      = lazy(() => import('@/pages/About'));
const Contact    = lazy(() => import('@/pages/Contact'));
const Pricing    = lazy(() => import('@/pages/Pricing'));
const FAQ        = lazy(() => import('@/pages/FAQ'));
const Terms      = lazy(() => import('@/pages/Terms'));
const Privacy    = lazy(() => import('@/pages/Privacy'));

// ─── Lazy-loaded Dashboard Pages ──────────────────────────────────────────────
const DashboardLayout  = lazy(() => import('@/components/DashboardLayout'));
const DashboardHome    = lazy(() => import('@/pages/dashboard/DashboardHome'));
const ManageEvents     = lazy(() => import('@/pages/dashboard/ManageEvents'));
const Bookings         = lazy(() => import('@/pages/dashboard/Bookings'));
const Payments         = lazy(() => import('@/pages/dashboard/Payments'));
const Reports          = lazy(() => import('@/pages/dashboard/Reports'));
const Notifications    = lazy(() => import('@/pages/dashboard/Notifications'));
const Profile          = lazy(() => import('@/pages/dashboard/Profile'));
const UsersPage        = lazy(() => import('@/pages/dashboard/Users'));
const CheckIn          = lazy(() => import('@/pages/dashboard/CheckIn'));

// ─── 404 Page ─────────────────────────────────────────────────────────────────
const NotFound = () => (
  <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center text-[#f5f0e8]">
    <h1 className="text-7xl font-extrabold text-[#b87333]">404</h1>
    <p className="text-xl mt-4 text-gray-400">Page not found</p>
    <a href="/" className="mt-6 px-6 py-3 rounded-xl text-white font-semibold"
       style={{ background: 'linear-gradient(135deg,#b87333,#d4956a)' }}>
      Go Home
    </a>
  </div>
);

// ─── Inner app — reads auth state ─────────────────────────────────────────────
const AppRoutes = () => {
  const { isLoadingAuth } = useAuth();

  // Show spinner while checking stored token on first load
  if (isLoadingAuth) return <PageSpinner />;

  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>

        {/* ── Public routes ───────────────────────────────────────────── */}
        <Route path="/"          element={<Home />} />
        <Route path="/events"    element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/login"     element={<Auth />} />
        <Route path="/register"  element={<Auth />} />
        <Route path="/about"     element={<About />} />
        <Route path="/contact"   element={<Contact />} />
        <Route path="/pricing"   element={<Pricing />} />
        <Route path="/faq"       element={<FAQ />} />
        <Route path="/terms"     element={<Terms />} />
        <Route path="/privacy"   element={<Privacy />} />
        <Route path="/support"   element={<Navigate to="/contact" replace />} />

        {/* ── Protected dashboard — any authenticated user ─────────────── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>

            {/* All roles */}
            <Route path="/dashboard"                  element={<DashboardHome />} />
            <Route path="/dashboard/bookings"         element={<Bookings />} />
            <Route path="/dashboard/payments"         element={<Payments />} />
            <Route path="/dashboard/notifications"    element={<Notifications />} />
            <Route path="/dashboard/profile"          element={<Profile />} />

            {/* Admin + Event Manager only */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'event_manager']} />}>
              <Route path="/dashboard/events"   element={<ManageEvents />} />
              <Route path="/dashboard/checkin"  element={<CheckIn />} />
              <Route path="/dashboard/reports"  element={<Reports />} />
            </Route>

            {/* Admin only */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/dashboard/users" element={<UsersPage />} />
            </Route>

          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}
