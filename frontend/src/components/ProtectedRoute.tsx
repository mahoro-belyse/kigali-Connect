// src/components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: ('admin' | 'event_manager' | 'client')[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoadingAuth } = useAuth();
  const location = useLocation();

  // Still verifying token — render nothing (parent shows spinner)
  if (isLoadingAuth) return null;

  // Not logged in → send to login, remember where they were going
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Role check — if specific roles required and user doesn't have one
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect them to their own dashboard home instead of a blank error
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
