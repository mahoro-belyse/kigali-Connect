import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request interceptor: attach JWT token ─────────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 globally ────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Do NOT redirect on 401 for login requests
    const isLoginRequest = error.config?.url?.includes('/auth/login/');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// ─── Typed API helpers ────────────────────────────────────────────────────────

// EVENTS
export const eventsApi = {
  list: (params?: Record<string, unknown>) => apiClient.get('/events/', { params }),
  upcoming: (limit = 6) => apiClient.get('/events/upcoming/', { params: { limit } }),
  featured: () => apiClient.get('/events/featured/'),
  getById: (id: number) => apiClient.get(`/events/${id}/`),
  create: (data: EventPayload) => apiClient.post('/events/', data),
  update: (id: number, data: Partial<EventPayload>) => apiClient.put(`/events/${id}/`, data),
  publish: (id: number) => apiClient.post(`/events/${id}/publish/`),
  cancel: (id: number) => apiClient.post(`/events/${id}/cancel/`),
  delete: (id: number) => apiClient.delete(`/events/${id}/`),
  uploadCover: (id: number, formData: FormData) => apiClient.post(`/events/${id}/cover-image/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  addTicketTier: (eventId: number, data: TicketTierPayload) => apiClient.post(`/events/${eventId}/tickets/`, data),
  updateTicketTier: (eventId: number, tierId: number, data: TicketTierPayload) =>
    apiClient.put(`/events/${eventId}/tickets/${tierId}/`, data),
};

// BOOKINGS
export const bookingsApi = {
  create: (data: BookingPayload) => apiClient.post('/bookings/', data),
  list: (params?: Record<string, unknown>) => apiClient.get('/bookings/', { params }),
  myBookings: (params?: Record<string, unknown>) => apiClient.get('/bookings/my/', { params }),
  getById: (id: number) => apiClient.get(`/bookings/${id}/`),
  getByRef: (ref: string) => apiClient.get(`/bookings/ref/${ref}/`),
  cancel: (id: number, reason?: string) => apiClient.post(`/bookings/${id}/cancel/`, { reason }),
  checkIn: (reference: string) => apiClient.post('/bookings/check-in/', { booking_reference: reference }),
};

// PAYMENTS
export const paymentsApi = {
  pay: (bookingId: number, method = 'simulated') => apiClient.post('/payments/', { booking_id: bookingId, method }),
  list: (params?: Record<string, unknown>) => apiClient.get('/payments/', { params }),
  getById: (id: number) => apiClient.get(`/payments/${id}/`),
  getByBooking: (bookingId: number) => apiClient.get(`/payments/booking/${bookingId}/`),
  refund: (id: number, data: { reason: string; amount?: number }) => apiClient.post(`/payments/${id}/refund/`, data),
};

// USERS
export const usersApi = {
  list: (params?: Record<string, unknown>) => apiClient.get('/users/', { params }),
  getProfile: () => apiClient.get('/users/profile/'),
  updateProfile: (data: Partial<UserUpdatePayload>) => apiClient.put('/users/profile/', data),
  uploadAvatar: (formData: FormData) => apiClient.post('/users/profile/avatar/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getById: (id: number) => apiClient.get(`/users/${id}/`),
  adminUpdate: (id: number, data: AdminUserUpdate) => apiClient.put(`/users/${id}/`, data),
  deactivate: (id: number) => apiClient.delete(`/users/${id}/`),
};

// ANALYTICS
export const analyticsApi = {
  dashboard: () => apiClient.get('/analytics/dashboard/'),
  monthlyRevenue: (year?: number) => apiClient.get('/analytics/revenue/monthly/', { params: { year } }),
  topEvents: (limit = 10) => apiClient.get('/analytics/events/top/', { params: { limit } }),
  byCategory: () => apiClient.get('/analytics/bookings/by-category/'),
  summary: () => apiClient.get('/analytics/summary/'),
  userStats: () => apiClient.get('/analytics/users/stats/'),
};

// AUTH
export const authApi = {
  register: (data: RegisterPayload) => apiClient.post('/auth/register/', data),
  login: (data: LoginPayload) => apiClient.post('/auth/login/', data),
  logout: () => apiClient.post('/auth/logout/'),
  me: () => apiClient.get('/auth/me/'),
  refresh: (refreshToken: string) => apiClient.post('/auth/refresh/', { refresh_token: refreshToken }),
  changePassword: (data: ChangePasswordPayload) => apiClient.post('/auth/change-password/', data),
};

// REVIEWS
export const reviewsApi = {
  create: (data: ReviewPayload) => apiClient.post('/reviews/', data),
  getByEvent: (eventId: number, params?: Record<string, unknown>) =>
    apiClient.get(`/reviews/event/${eventId}/`, { params }),
  delete: (id: number) => apiClient.delete(`/reviews/${id}/`),
};

// NOTIFICATIONS
export const notificationsApi = {
  list: (params?: Record<string, unknown>) => apiClient.get('/notifications/', { params }),
  markRead: (id: number) => apiClient.post(`/notifications/${id}/read/`),
  markAllRead: () => apiClient.post('/notifications/read-all/'),
  delete: (id: number) => apiClient.delete(`/notifications/${id}/`),
};

// ─── Type definitions ─────────────────────────────────────────────────────────

export interface RegisterPayload {
  email: string;
  username: string;
  full_name: string;
  password: string;
  phone?: string;
  role?: 'client' | 'event_manager' | 'admin';
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface UserUpdatePayload {
  full_name: string;
  phone: string;
  bio: string;
  avatar: string;
}

export interface AdminUserUpdate {
  role?: string;
  is_active?: boolean;
  is_verified?: boolean;
  full_name?: string;
  phone?: string;
}

export interface TicketTierPayload {
  name: 'general' | 'vip' | 'early_bird' | 'student' | 'group';
  price: number;
  quantity: number;
  description?: string;
  benefits?: string;
  sale_start?: string;
  sale_end?: string;
  max_per_booking?: number;
}

export interface EventPayload {
  title: string;
  description: string;
  category: string;
  start_datetime: string;
  end_datetime: string;
  venue_name: string;
  venue_address: string;
  city: string;
  country: string;
  total_capacity: number;
  is_free: boolean;
  tags?: string;
  featured?: boolean;
  latitude?: number;
  longitude?: number;
  ticket_types: TicketTierPayload[];
}

export interface BookingPayload {
  event_id: number;
  ticket_type_id: number;
  quantity: number;
  special_requests?: string;
  attendee_name?: string;
  attendee_email?: string;
  attendee_phone?: string;
}

export interface ReviewPayload {
  event_id: number;
  rating: number;
  comment?: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  phone?: string;
  avatar?: string;
  role: 'admin' | 'event_manager' | 'client';
  is_active: boolean;
  is_verified: boolean;
  bio?: string;
  created_at?: string;
  last_login?: string;
}
