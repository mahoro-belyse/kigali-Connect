import  {
  createContext, useState, useContext,
  useEffect, useCallback
} from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/client';
import type { User} from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  // Role helpers
  isAdmin: boolean;
  isEventManager: boolean;
  isClient: boolean;
}

interface LoginResult {
  success: boolean;
  error?: string;
  locked?: boolean;
  retryAfter?: number;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Restore user from localStorage on first render
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => !!localStorage.getItem('access_token')
  );

  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  // ── On mount: verify stored token is still valid ──────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      verifyToken();
    } else {
      setIsLoadingAuth(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      const res = await authApi.me();
      const currentUser: User = res.data;
      setUser(currentUser);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(currentUser));
    } catch {
      // Token invalid or expired — clear everything
      clearAuth();
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const clearAuth = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  };

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await authApi.login({ email, password });
      const { access_token, refresh_token, user: loggedInUser } = res.data;

      // Persist tokens + user
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(loggedInUser));

      setUser(loggedInUser);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error: any) {
      const status = error.response?.status;
      const detail = error.response?.data?.detail || 'Login failed';
      const retryAfter = error.response?.headers?.['retry-after'];

      return {
        success: false,
        error: detail,
        locked: status === 429,
        retryAfter: retryAfter ? parseInt(retryAfter) : undefined,
      };
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    try {
      authApi.logout(); // Inform backend (best effort)
    } catch {}
    clearAuth();
    window.location.href = '/';
  }, []);

  // ── Refresh user profile ──────────────────────────────────────────────────
  const refreshUser = async () => {
    try {
      const res = await authApi.me();
      const updated: User = res.data;
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    } catch {
      // Silently fail
    }
  };

  // ── Role helpers ──────────────────────────────────────────────────────────
  const isAdmin = user?.role === 'admin';
  const isEventManager = user?.role === 'event_manager';
  const isClient = user?.role === 'client';

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      login,
      logout,
      refreshUser,
      isAdmin,
      isEventManager,
      isClient,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};