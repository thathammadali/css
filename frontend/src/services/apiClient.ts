/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserAccount, DashboardRole, EventItem, SessionItem, EventStatus, SessionStatus } from '../types';
import { userService } from './userService';
import { INITIAL_EVENTS } from '../data/mockEvents';

/**
 * Single centralized API base URL config.
 * Reads first from localStorage (for dynamic tunnel testing without rebuilding),
 * then falls back to import.meta.env.VITE_API_BASE_URL, and defaults to '' (same origin / proxy).
 */
const TUNNEL_STORAGE_KEY = 'sems_api_tunnel_url';
const AUTH_TOKEN_KEY = 'sems_auth_token';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem(TUNNEL_STORAGE_KEY);
    if (override && override.trim()) {
      return override.trim().replace(/\/+$/, '');
    }
  }
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string) || '';
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  // Default to active Cloudflare tunnel provided by backend
  return 'https://size-childrens-cream-identity.trycloudflare.com';
}

export function setApiBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem(TUNNEL_STORAGE_KEY, url.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem(TUNNEL_STORAGE_KEY);
    }
  }
}

export function getStoredAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }
  return null;
}

export function setStoredAuthToken(token: string | null): void {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }
}

/**
 * Returns the exact origin of the preview (scheme + host, e.g. https://ais-dev-xxxx.run.app)
 * for backend CORS configuration.
 */
export function getPreviewOrigin(): string {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return '';
}

/**
 * Centralized fetch client for backend API & tunnel requests.
 * Automatically adds:
 *  - "ngrok-skip-browser-warning": "true" for ngrok tunnels
 *  - Authorization: Bearer <token> if stored
 *  - API Base URL prefix
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = baseUrl ? `${baseUrl}${cleanEndpoint}` : cleanEndpoint;

  const headers = new Headers(options.headers || {});

  // Ngrok bypass header required for tunnels
  if (!headers.has('ngrok-skip-browser-warning')) {
    headers.set('ngrok-skip-browser-warning', 'true');
  }

  // Auto-attach stored Bearer token if not explicitly set
  const token = getStoredAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(fullUrl, {
    ...options,
    headers,
  });
}

export interface AuthLoginResponse {
  success: boolean;
  user?: UserAccount;
  accessToken?: string;
  tokenType?: string;
  isBackendConnected?: boolean;
  error?: string;
}

export interface AuthRegisterParams {
  name: string;
  primaryEmail: string;
  secondaryEmail?: string;
  accountType?: 'student' | 'guest';
  affiliation?: string;
  department?: string;
  rollNumber?: string;
  password?: string;
}

export const authApi = {
  /**
   * OAuth2 / FastAPI compliant form-urlencoded login:
   * username = email, password = password
   * Returns { access_token, token_type }, then fetches GET /auth/me
   */
  async login(email: string, password: string): Promise<AuthLoginResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    const baseUrl = getApiBaseUrl();

    // 1. Try Backend Tunnel if configured or available
    try {
      const formData = new URLSearchParams();
      formData.append('username', normalizedEmail);
      formData.append('password', password);

      // Try FastAPI standard /auth/login or /api/auth/login
      const endpoints = ['/auth/login', '/api/auth/login', '/login'];
      let res: Response | null = null;
      let usedEndpoint = '';

      for (const ep of endpoints) {
        try {
          const attempt = await apiFetch(ep, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
          });
          if (attempt.ok || attempt.status === 400 || attempt.status === 401 || attempt.status === 422) {
            res = attempt;
            usedEndpoint = ep;
            break;
          }
        } catch {
          // If network failed for this endpoint, continue loop
        }
      }

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.access_token) {
          const token = data.access_token;
          setStoredAuthToken(token);

          // 2. Fetch user details from GET /auth/me with Bearer token
          let userProfile: UserAccount | null = null;
          try {
            const meRes = await apiFetch('/auth/me', {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            if (meRes.ok) {
              const meData = await meRes.json().catch(() => null);
              if (meData) {
                userProfile = {
                  id: meData.id ? String(meData.id) : `usr-${Date.now()}`,
                  name: meData.full_name || meData.name || normalizedEmail.split('@')[0],
                  primaryEmail: meData.primary_email || meData.email || meData.primaryEmail || normalizedEmail,
                  secondaryEmail: meData.secondary_email || meData.secondaryEmail || meData.recovery_email || '',
                  role: (meData.role as DashboardRole) || 'student',
                  department: meData.department || 'Academic Department',
                  rollNumber: meData.roll_number || meData.rollNumber,
                  institutionAffiliation: meData.position_title || meData.institutionAffiliation || meData.affiliation || 'SEMS Campus',
                  status: 'active',
                  createdAt: meData.created_at || new Date().toISOString(),
                  lastActive: 'Just now',
                };
              }
            }
          } catch {
            // me endpoint failed
          }

          if (!userProfile) {
            // Construct fallback user profile from token/login info
            userProfile = {
              id: `usr-remote-${Date.now()}`,
              name: normalizedEmail.split('@')[0],
              primaryEmail: normalizedEmail,
              secondaryEmail: '',
              department: 'Academic Affairs',
              role: 'student',
              status: 'active',
              createdAt: new Date().toISOString(),
              lastActive: 'Just now',
            };
          }

          return {
            success: true,
            user: userProfile,
            accessToken: token,
            tokenType: data.token_type || 'bearer',
            isBackendConnected: true,
          };
        } else if (data && data.user) {
          // Alternative backend returning user directly
          return {
            success: true,
            user: data.user,
            isBackendConnected: true,
          };
        } else {
          return {
            success: false,
            error: data?.detail || data?.message || 'Invalid server response structure.',
          };
        }
      } else if (res && (res.status === 400 || res.status === 401 || res.status === 422)) {
        const errorData = await res.json().catch(() => null);
        const errorMsg =
          (Array.isArray(errorData?.detail) ? errorData.detail.map((d: any) => d.msg).join(', ') : errorData?.detail) ||
          errorData?.message ||
          'Authentication failed. Invalid email or password.';
        return {
          success: false,
          error: errorMsg,
          isBackendConnected: true,
        };
      }
    } catch {
      // Backend tunnel unreachable
    }

    // 3. Fallback to local accounts in userService (for standalone prototype & offline testing)
    const localAuth = userService.authenticate(normalizedEmail, password);
    if (localAuth.success && localAuth.user) {
      return {
        success: true,
        user: localAuth.user,
        isBackendConnected: false,
      };
    }

    return {
      success: false,
      error:
        localAuth.error ||
        (baseUrl
          ? 'Unable to connect to backend tunnel. Please check if tunnel is running.'
          : 'Invalid credentials. Please verify your email and password.'),
    };
  },

  /**
   * JSON signup flow:
   * Fixed to POST /auth/signup (FastAPI schema: full_name, primary_email, password, secondary_email, position_title)
   * Always creates a student account.
   */
  async register(
    params: AuthRegisterParams
  ): Promise<{ success: boolean; user?: UserAccount; isBackendConnected?: boolean; error?: string }> {
    const normalizedEmail = params.primaryEmail.trim().toLowerCase();

    try {
      const res = await apiFetch('/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: params.name.trim(),
          primary_email: normalizedEmail,
          password: params.password,
          secondary_email: params.secondaryEmail?.trim() || null,
          position_title: params.affiliation?.trim() || params.department?.trim() || 'Student',
        }),
      });

      if (res && (res.ok || res.status === 201)) {
        const data = await res.json().catch(() => null);
        const newUser: UserAccount = {
          id: data?.id ? String(data.id) : `usr-${Date.now()}`,
          name: data?.full_name || data?.name || params.name,
          primaryEmail: data?.primary_email || data?.email || normalizedEmail,
          secondaryEmail: data?.secondary_email || params.secondaryEmail || '',
          role: (data?.role as DashboardRole) || 'student',
          department: params.department || 'Academic Department',
          rollNumber: params.rollNumber,
          institutionAffiliation: data?.position_title || params.affiliation || 'SEMS Campus',
          status: 'active',
          createdAt: new Date().toISOString(),
          lastActive: 'Just now',
        };
        // Mirror in local storage so offline access works
        userService.registerUser(params);
        return { success: true, user: newUser, isBackendConnected: true };
      } else if (res && (res.status === 400 || res.status === 409 || res.status === 422)) {
        const errData = await res.json().catch(() => null);
        const msg =
          (Array.isArray(errData?.detail)
            ? errData.detail.map((d: any) => `${d.loc?.slice(-1)[0] || 'Field'}: ${d.msg}`).join(', ')
            : errData?.detail) ||
          errData?.message ||
          'Registration was rejected by the backend server.';
        return { success: false, error: msg, isBackendConnected: true };
      }
    } catch {
      // Backend tunnel unreachable, fall back to local mock storage
    }

    // Local fallback registration
    const registered = userService.registerUser(params);
    return { success: true, user: registered, isBackendConnected: false };
  },

  /**
   * Healthcheck helper to verify tunnel connectivity
   */
  async checkHealth(): Promise<{ ok: boolean; statusText: string; url: string }> {
    const url = getApiBaseUrl();
    if (!url) {
      return { ok: false, statusText: 'No tunnel URL configured (using local mock data)', url: '' };
    }

    try {
      const endpoints = ['/health', '/docs', '/api/health', '/'];
      for (const ep of endpoints) {
        try {
          const res = await apiFetch(ep, { method: 'GET' });
          if (res.ok || res.status === 404 || res.status === 401) {
            return { ok: true, statusText: `Connected (${res.status} ${res.statusText})`, url };
          }
        } catch {
          // Try next
        }
      }
      return { ok: false, statusText: 'Tunnel URL reachable but returned unexpected response', url };
    } catch (e: any) {
      return { ok: false, statusText: `Connection failed: ${e?.message || 'Network error'}`, url };
    }
  },

  logout(): void {
    setStoredAuthToken(null);
  },
};

/**
 * Normalizes backend session payload into frontend SessionItem model.
 * Handles speaker, registered_count, and meeting_link (null unless authenticated / confirmed registration).
 */
export function mapBackendSession(
  raw: any,
  defaultEventId?: string,
  defaultEventTitle?: string
): SessionItem {
  const eventId = String(raw.event_id || raw.eventId || defaultEventId || '');
  const meetingLink = raw.meeting_link ?? raw.meetingLink ?? raw.meetingUrl ?? null;
  const speaker = raw.speaker ?? raw.speaker_name ?? raw.speakerName ?? null;
  const registeredCount =
    raw.registered_count !== undefined && raw.registered_count !== null
      ? Number(raw.registered_count)
      : raw.registeredCount !== undefined && raw.registeredCount !== null
      ? Number(raw.registeredCount)
      : raw.attendanceCount;

  return {
    id: String(raw.id || raw.session_id || raw._id || `sess-${Date.now()}`),
    eventId,
    parentEventTitle: raw.parent_event_title || raw.parentEventTitle || defaultEventTitle,
    title: raw.title || raw.name || 'Untitled Session',
    society: raw.society || raw.department || 'Campus Society',
    date: raw.date || (raw.start_time ? String(raw.start_time).split('T')[0] : '2026-10-20'),
    time:
      raw.time ||
      (raw.start_time && raw.end_time
        ? `${String(raw.start_time).includes('T') ? String(raw.start_time).split('T')[1].slice(0, 5) : raw.start_time} - ${String(raw.end_time).includes('T') ? String(raw.end_time).split('T')[1].slice(0, 5) : raw.end_time}`
        : '14:00 - 16:00'),
    startTime: raw.start_time || raw.startTime,
    endTime: raw.end_time || raw.endTime,
    location: raw.location || raw.venue || 'Campus Auditorium',
    meetingUrl: meetingLink || undefined,
    meeting_link: meetingLink,
    speaker: speaker,
    registered_count:
      typeof registeredCount === 'number' && !isNaN(registeredCount) ? registeredCount : undefined,
    status: (raw.status as SessionStatus) || 'open',
    capacity:
      raw.capacity ||
      (typeof registeredCount === 'number'
        ? `${registeredCount} registered`
        : undefined),
    totalSeats: raw.total_seats ?? raw.totalSeats,
    seatsRemaining: raw.seats_remaining ?? raw.seatsRemaining,
    category: raw.category,
    description: raw.description || '',
    wing: raw.wing,
    registrationRequired: Boolean(raw.registration_required ?? raw.registrationRequired ?? true),
    registrationDeadline: raw.registration_deadline || raw.registrationDeadline,
    paymentDeadline: raw.payment_deadline || raw.paymentDeadline,
    isPaid: Boolean(raw.is_paid ?? raw.isPaid),
    amount: Number(raw.amount ?? raw.fee ?? 0),
    deliveryStatus: raw.delivery_status || raw.deliveryStatus || 'UPCOMING',
    resources: raw.resources || [],
    tasks: raw.tasks || [],
    comments: raw.comments || [],
  };
}

/**
 * Normalizes backend event payload into frontend EventItem model.
 */
export function mapBackendEvent(raw: any): EventItem {
  const eventId = String(raw.id || raw.event_id || raw._id || `evt-${Date.now()}`);
  const eventTitle = raw.title || raw.name || 'Untitled Event';
  const rawSessions = Array.isArray(raw.sessions)
    ? raw.sessions
    : Array.isArray(raw.items)
    ? raw.items
    : [];

  return {
    id: eventId,
    title: eventTitle,
    description: raw.description || '',
    category: raw.category || 'General',
    organizer: raw.organizer || raw.organized_by || raw.society || 'University Campus',
    status: (raw.status as EventStatus) || 'PUBLISHED',
    bannerUrl: raw.banner_url || raw.bannerUrl || raw.image_url,
    sessions: rawSessions.map((s: any) => mapBackendSession(s, eventId, eventTitle)),
    registrationDeadline:
      raw.registration_deadline || raw.registrationDeadline || new Date().toISOString(),
    paymentDeadline: raw.payment_deadline || raw.paymentDeadline,
    isPaid: Boolean(raw.is_paid ?? raw.isPaid),
    feeAmount: Number(raw.fee_amount ?? raw.feeAmount ?? 0),
    createdBy: raw.created_by || raw.createdBy || 'System',
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    publishedAt: raw.published_at || raw.publishedAt,
    approvedBy: raw.approved_by || raw.approvedBy,
    rejectionReason: raw.rejection_reason || raw.rejectionReason,
  };
}

/**
 * Public Event Browsing API
 * Guests can call without a token.
 * Automatically falls back to mock data when backend tunnel is offline.
 */
export const eventsApi = {
  /**
   * GET /events
   * Public list of events. Unauthenticated guests can browse freely.
   */
  async getEvents(): Promise<EventItem[]> {
    try {
      const res = await apiFetch('/events', {
        method: 'GET',
      });
      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.events)
          ? data.events
          : null;

        if (list && list.length > 0) {
          return list.map((item: any) => mapBackendEvent(item));
        }
      }
    } catch {
      // Backend unreachable or offline, safe fallback
    }

    // Return stored/initial mock events
    try {
      const stored = localStorage.getItem('sems_events_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Safe fallback
    }
    return INITIAL_EVENTS;
  },

  /**
   * GET /events/{id}
   * Public event detail. Unauthenticated guests can view details.
   */
  async getEventById(eventId: string): Promise<EventItem | null> {
    try {
      const res = await apiFetch(`/events/${encodeURIComponent(eventId)}`, {
        method: 'GET',
      });
      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data) {
          return mapBackendEvent(data);
        }
      }
    } catch {
      // Backend unreachable or offline, fallback
    }

    const all = await this.getEvents();
    return all.find((e) => e.id === eventId) || null;
  },

  /**
   * GET /events/{id}/sessions
   * Public sessions under a given event.
   * Responses include speaker, registered_count, and meeting_link (null unless admin or registered).
   */
  async getEventSessions(eventId: string, parentEventTitle?: string): Promise<SessionItem[]> {
    try {
      const res = await apiFetch(`/events/${encodeURIComponent(eventId)}/sessions`, {
        method: 'GET',
      });
      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.sessions)
          ? data.sessions
          : Array.isArray(data?.items)
          ? data.items
          : [];

        if (list.length > 0) {
          return list.map((s: any) => mapBackendSession(s, eventId, parentEventTitle));
        }
      }
    } catch {
      // Backend unreachable or offline, fallback
    }

    const event = await this.getEventById(eventId);
    return event?.sessions || [];
  },
};

