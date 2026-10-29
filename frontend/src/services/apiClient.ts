/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserAccount, DashboardRole, EventItem, SessionItem, EventStatus, SessionStatus } from '../types';
import { DEMO_MODE } from '../config';
import { userService } from './userService';
import { INITIAL_EVENTS } from '../data/mockEvents';

const TUNNEL_STORAGE_KEY = 'sems_api_tunnel_url';
const AUTH_TOKEN_KEY = 'sems_auth_token';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Base URL: in-app override (tunnel modal) first, then VITE_API_BASE_URL. No hardcoded default. */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem(TUNNEL_STORAGE_KEY);
    if (override && override.trim()) return override.trim().replace(/\/+$/, '');
  }
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string) || '';
  return envUrl.trim().replace(/\/+$/, '');
}

export function setApiBaseUrl(url: string): void {
  if (typeof window === 'undefined') return;
  if (url && url.trim()) localStorage.setItem(TUNNEL_STORAGE_KEY, url.trim().replace(/\/+$/, ''));
  else localStorage.removeItem(TUNNEL_STORAGE_KEY);
}

export function getStoredAuthToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
}

export function setStoredAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getPreviewOrigin(): string {
  return typeof window !== 'undefined' && window.location ? window.location.origin : '';
}

/** Turns FastAPI error bodies ({detail: string | [...]}) into one readable string. */
export async function readError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  const d = body?.detail;
  if (Array.isArray(d)) {
    const labels: Record<string, string> = {
      full_name: 'Full name',
      primary_email: 'Email',
      secondary_email: 'Secondary email',
      roll_number: 'Roll number',
      phone: 'Phone number',
      department: 'Department',
      institution: 'Institution',
      password: 'Password',
      title: 'Title',
      capacity: 'Capacity',
      fee_amount: 'Fee',
      registration_deadline: 'Registration deadline',
      reason: 'Reason',
      meeting_links: 'Meeting link',
      meeting_link: 'Meeting link',
      location: 'Location',
      speaker: 'Speaker',
    };
    return d.map((x: any) => {
      const field = (x.loc || []).filter((part: unknown) => typeof part === 'string').pop() as string | undefined;
      const label = (field && labels[field]) || 'Field';
      const type = String(x.type || '');
      const rawMessage = String(x.msg || '');
      if (rawMessage.startsWith('Value error, ')) return rawMessage.slice('Value error, '.length);
      if (type === 'missing') return `${label} is required.`;
      if (type === 'value_error.email') return 'Enter a valid email address, for example name@gmail.com.';
      if (type === 'string_too_short') return `${label} is too short.`;
      if (type === 'string_too_long') return `${label} is too long.`;
      if (type === 'string_pattern_mismatch') return `${label} has an invalid format.`;
      if (type === 'int_parsing' || type === 'float_parsing') return `${label} must be a number.`;
      if (type === 'greater_than' || type === 'greater_than_equal') return `${label} is below the allowed minimum.`;
      if (type === 'less_than' || type === 'less_than_equal') return `${label} is above the allowed maximum.`;
      if (rawMessage.includes('Field required')) return `${label} is required.`;
      return rawMessage.replace(/^Value error, /, '').replace(/\s*\(type=[^)]+\)/, '') || `${label} is invalid.`;
    }).join(' ');
  }
  if (typeof d === 'string') return d;
  return body?.message || `Request failed (${res.status})`;
}

/**
 * Central fetch. Throws if no backend URL is configured (callers treat that as "offline").
 * On a 401 for a request that carried a token, clears the token and fires 'sems:unauthorized'.
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new Error('Backend URL is not configured');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('ngrok-skip-browser-warning')) headers.set('ngrok-skip-browser-warning', 'true');
  const token = getStoredAuthToken();
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${baseUrl}${cleanEndpoint}`, { ...options, headers });
  if (res.status === 401 && token && cleanEndpoint !== '/auth/login') {
    setStoredAuthToken(null);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('sems:unauthorized'));
  }
  return res;
}

async function jsonRequest(method: string, path: string, body?: unknown): Promise<any> {
  const res = await apiFetch(path, {
    method,
    headers: JSON_HEADERS,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(await readError(res), res.status);
  return res.json().catch(() => null);
}

/* ------------------------------- Auth ------------------------------- */

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

export function mapBackendUser(me: any): UserAccount {
  return {
    id: String(me.id),
    name: me.full_name,
    primaryEmail: me.primary_email,
    secondaryEmail: me.secondary_email || '',
    role: me.role as DashboardRole,
    department: me.department || '',
    rollNumber: me.roll_number || undefined,
    institutionAffiliation: me.institution || me.position_title || '',
    status: me.is_active === false ? 'suspended' : 'active',
    createdAt: me.created_at || new Date().toISOString(),
    lastActive: 'Just now',
  };
}

export const authApi = {
  /** POST /auth/login (form-urlencoded) then GET /auth/me. Local mock accounts ONLY if the backend is unreachable. */
  async login(email: string, password: string): Promise<AuthLoginResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    let res: Response | null = null;
    try {
      const form = new URLSearchParams();
      form.append('username', normalizedEmail);
      form.append('password', password);
      res = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
    } catch {
      res = null; // unreachable or not configured
    }

    if (res) {
      // The backend answered: its answer is final (wrong password, deactivated account, server error...)
      if (!res.ok) return { success: false, error: await readError(res), isBackendConnected: true };
      const data = await res.json().catch(() => null);
      if (!data?.access_token) {
        return { success: false, error: 'Invalid server response.', isBackendConnected: true };
      }
      const token = data.access_token as string;
      setStoredAuthToken(token);
      const meRes = await apiFetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
      if (!meRes || !meRes.ok) {
        setStoredAuthToken(null);
        return {
          success: false,
          error: meRes ? await readError(meRes) : 'Could not load your profile.',
          isBackendConnected: true,
        };
      }
      const me = await meRes.json();
      return {
        success: true,
        user: mapBackendUser(me),
        accessToken: token,
        tokenType: data.token_type || 'bearer',
        isBackendConnected: true,
      };
    }

    // Backend unreachable: offline prototype accounts (UI shows the Offline / Mock badge)
    setStoredAuthToken(null);
    if (!DEMO_MODE) {
      return { success: false, error: 'Cannot reach the server. Please try again in a moment.' };
    }
    const localAuth = userService.authenticate(normalizedEmail, password);
    if (localAuth.success && localAuth.user) {
      return { success: true, user: localAuth.user, isBackendConnected: false };
    }
    return {
      success: false,
      error: localAuth.error || 'Unable to reach the backend. Check that it is running and the URL is set.',
    };
  },

  /** POST /auth/signup (JSON). Always creates a student. Roll number / department are set later via updateProfile. */
  async register(
    params: AuthRegisterParams
  ): Promise<{ success: boolean; user?: UserAccount; isBackendConnected?: boolean; error?: string }> {
    const normalizedEmail = params.primaryEmail.trim().toLowerCase();
    let res: Response | null = null;
    try {
      res = await apiFetch('/auth/signup', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          full_name: params.name.trim(),
          primary_email: normalizedEmail,
          password: params.password,
          secondary_email: params.secondaryEmail?.trim() || null,
          position_title: params.affiliation?.trim() || 'Student',
        }),
      });
    } catch {
      res = null;
    }

    if (res) {
      if (!res.ok) return { success: false, error: await readError(res), isBackendConnected: true };
      const data = await res.json().catch(() => null);
      const user = data ? mapBackendUser(data) : undefined;
      if (user) {
        user.department = params.department || user.department;
        user.rollNumber = params.rollNumber || user.rollNumber;
      }
      return { success: true, user, isBackendConnected: true };
    }

    if (!DEMO_MODE) {
      return { success: false, error: 'Cannot reach the server. Please try again in a moment.' };
    }
    const registered = userService.registerUser(params);
    return { success: true, user: registered, isBackendConnected: false };
  },

  /** PATCH /auth/me */
  async updateProfile(patch: {
    positionTitle?: string;
    rollNumber?: string;
    department?: string;
    phone?: string;
    institution?: string;
  }): Promise<UserAccount> {
    const body: Record<string, string> = {};
    if (patch.positionTitle !== undefined) body.position_title = patch.positionTitle;
    if (patch.rollNumber !== undefined) body.roll_number = patch.rollNumber;
    if (patch.department !== undefined) body.department = patch.department;
    if (patch.phone !== undefined) body.phone = patch.phone;
    if (patch.institution !== undefined) body.institution = patch.institution;
    return mapBackendUser(await jsonRequest('PATCH', '/auth/me', body));
  },

  async checkHealth(): Promise<{ ok: boolean; statusText: string; url: string }> {
    const url = getApiBaseUrl();
    if (!url) return { ok: false, statusText: 'No backend URL configured (using local mock data)', url: '' };
    try {
      const res = await apiFetch('/health');
      return { ok: res.ok, statusText: res.ok ? 'Connected' : `Unexpected response (${res.status})`, url };
    } catch (e: any) {
      return { ok: false, statusText: `Connection failed: ${e?.message || 'Network error'}`, url };
    }
  },

  logout(): void {
    setStoredAuthToken(null);
  },
};

/* ---------------------------- Mappers ---------------------------- */

interface EventMeta {
  isPaid: boolean;
  amount: number;
  registrationDeadline?: string;
  category?: string;
  organizer?: string;
  description?: string;
  eventCapacity?: number | null;
}

function fmtDate(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function fmtTime(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

/** Backend session -> SessionItem. meeting_link is null unless admin or CONFIRMED registrant. */
export function mapBackendSession(
  raw: any,
  defaultEventId?: string,
  defaultEventTitle?: string,
  meta?: EventMeta
): SessionItem {
  const startsAt: string | undefined = raw.starts_at ?? raw.start_time ?? raw.startTime;
  const endsAt: string | undefined = raw.ends_at ?? raw.end_time ?? raw.endTime;
  const tz: string = raw.timezone || 'Asia/Karachi';
  const registered = Number(raw.registered_count ?? 0);
  const cap = raw.capacity ?? meta?.eventCapacity ?? null;
  const numericCapacity = Number(cap);
  const totalSeats = Number.isFinite(numericCapacity) && numericCapacity > 0 ? numericCapacity : undefined;
  const seatsRemaining = totalSeats !== undefined ? Math.max(totalSeats - registered, 0) : undefined;
  const rawLinks = Array.isArray(raw.meeting_links)
    ? raw.meeting_links.filter((link: any) => link && typeof link.url === 'string')
    : [];
  const meetingLink = raw.meeting_link ?? rawLinks.find((link: any) => link.public !== false)?.url ?? rawLinks[0]?.url ?? null;

  const now = Date.now();
  const startMs = startsAt ? new Date(startsAt).getTime() : NaN;
  const endMs = endsAt ? new Date(endsAt).getTime() : NaN;
  const deadlineMs = meta?.registrationDeadline ? new Date(meta.registrationDeadline).getTime() : NaN;

  let status: SessionStatus = 'open';
  if (!isNaN(endMs) && now > endMs) status = 'closed';
  else if (!isNaN(deadlineMs) && now > deadlineMs) status = 'closed';
  else if (seatsRemaining === 0) status = 'closed';
  else if (
    (seatsRemaining !== undefined && seatsRemaining <= 3) ||
    (!isNaN(deadlineMs) && deadlineMs - now < 24 * 3600 * 1000)
  ) {
    status = 'closing_soon';
  }

  let deliveryStatus: 'UPCOMING' | 'LIVE' | 'COMPLETED' = 'UPCOMING';
  if (!isNaN(endMs) && now > endMs) deliveryStatus = 'COMPLETED';
  else if (!isNaN(startMs) && now >= startMs) deliveryStatus = 'LIVE';

  return {
    id: String(raw.id),
    eventId: String(raw.event_id ?? defaultEventId ?? ''),
    parentEventTitle: defaultEventTitle,
    title: raw.title || 'Untitled Session',
    society: meta?.organizer || 'Campus Society',
    date: startsAt ? fmtDate(startsAt, tz) : '',
    time: startsAt && endsAt ? `${fmtTime(startsAt, tz)} - ${fmtTime(endsAt, tz)}` : '',
    startTime: startsAt,
    endTime: endsAt,
    location: raw.location || 'TBA',
    meetingUrl: meetingLink || undefined,
    meeting_link: meetingLink,
    meeting_links: rawLinks,
    speaker: raw.speaker ?? null,
    registered_count: registered,
    status,
    capacity: totalSeats !== undefined
      ? `${registered} / ${totalSeats} slots filled`
      : `${registered} registered`,
    totalSeats,
    seatsRemaining,
    timezone: tz,
    isOnline: Boolean(meetingLink) || rawLinks.length > 0,
    category: meta?.category,
    description: raw.description || meta?.description || '',
    registrationRequired: true,
    registrationDeadline: meta?.registrationDeadline,
    isPaid: meta?.isPaid ?? false,
    amount: meta?.amount ?? 0,
    deliveryStatus,
    resources: [],
    tasks: [],
    comments: [],
  } as SessionItem;
}

/** Backend event (+ its sessions) -> EventItem. DRAFT is shown as PENDING_APPROVAL (super admin publishes). */
export function mapBackendEvent(raw: any, rawSessions: any[] = []): EventItem {
  const eventId = String(raw.id);
  const title: string = raw.title || 'Untitled Event';
  const feeAmount = Number(raw.fee_amount ?? 0);
  const meta: EventMeta = {
    isPaid: feeAmount > 0,
    amount: feeAmount,
    registrationDeadline: raw.registration_deadline ?? undefined,
    category: raw.category ?? undefined,
    organizer: raw.organizer ?? undefined,
    description: raw.description ?? undefined,
    eventCapacity: raw.capacity ?? null,
  };
  return {
    id: eventId,
    title,
    description: raw.description || '',
    category: raw.category || 'General',
    organizer: raw.organizer || 'University Campus',
    status: (raw.status === 'DRAFT' ? 'PENDING_APPROVAL' : raw.status) as EventStatus,
    sessions: rawSessions.map((s) => mapBackendSession(s, eventId, title, meta)),
    registrationDeadline: raw.registration_deadline || '',
    isPaid: feeAmount > 0,
    feeAmount,
    createdBy: String(raw.created_by ?? 'System'),
    createdAt: raw.created_at || new Date().toISOString(),
  } as EventItem;
}

/* ----------------------------- Events API ----------------------------- */

export interface EventFilters {
  category?: string;
  locationType?: 'on_campus' | 'virtual' | 'hybrid';
  isFree?: boolean;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;
}

export const eventsApi = {
  /** Live data, or null if the backend is unreachable / not configured. */
  async fetchLive(filters?: EventFilters): Promise<EventItem[] | null> {
    try {
      const qs = new URLSearchParams();
      if (filters?.category) qs.set('category', filters.category);
      if (filters?.locationType) qs.set('location_type', filters.locationType);
      if (filters?.isFree !== undefined) qs.set('is_free', String(filters.isFree));
      if (filters?.dateFrom) qs.set('date_from', filters.dateFrom);
      if (filters?.dateTo) qs.set('date_to', filters.dateTo);
      const res = await apiFetch(`/events${qs.toString() ? `?${qs.toString()}` : ''}`);
      if (!res.ok) return null;
      const list = await res.json().catch(() => null);
      if (!Array.isArray(list)) return null;
      return await Promise.all(
        list.map(async (e: any) => {
          try {
            const sr = await apiFetch(`/events/${e.id}/sessions`);
            const sessions = sr.ok ? await sr.json() : [];
            return mapBackendEvent(e, Array.isArray(sessions) ? sessions : []);
          } catch {
            return mapBackendEvent(e, []);
          }
        })
      );
    } catch {
      return null;
    }
  },

  /** Live events; mock/cached data only when the backend is unreachable. An empty live list stays empty. */
  async getEvents(filters?: EventFilters): Promise<EventItem[]> {
    const live = await this.fetchLive(filters);
    if (live) return live;
    try {
      const stored = localStorage.getItem('sems_events_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return DEMO_MODE ? INITIAL_EVENTS : [];
  },

  async getEventById(eventId: string): Promise<EventItem | null> {
    try {
      const res = await apiFetch(`/events/${encodeURIComponent(eventId)}`);
      if (res.ok) {
        const raw = await res.json();
        const sr = await apiFetch(`/events/${encodeURIComponent(eventId)}/sessions`);
        const sessions = sr.ok ? await sr.json() : [];
        return mapBackendEvent(raw, Array.isArray(sessions) ? sessions : []);
      }
      if (res.status === 404) return null;
    } catch {
      // offline
    }
    const all = await this.getEvents();
    return all.find((e) => e.id === eventId) || null;
  },

  async getEventSessions(eventId: string): Promise<SessionItem[]> {
    return (await this.getEventById(eventId))?.sessions ?? [];
  },

  /* ---- admin writes (throw ApiError with the backend's message) ---- */

  async createEvent(input: {
    title: string;
    description?: string;
    category?: string;
    organizer?: string;
    capacity?: number | null;
    registrationDeadline?: string; // ISO
    feeAmount?: number;
    locationType?: 'on_campus' | 'virtual' | 'hybrid';
  }): Promise<EventItem> {
    const raw = await jsonRequest('POST', '/events', {
      title: input.title,
      description: input.description || null,
      category: input.category || null,
      organizer: input.organizer || null,
      capacity: input.capacity || null,
      registration_deadline: input.registrationDeadline || null,
      fee_amount: input.feeAmount ?? 0,
      location_type: input.locationType || null,
    });
    return mapBackendEvent(raw, []);
  },

  async updateEvent(eventId: string, patch: Record<string, unknown>): Promise<EventItem> {
    // patch uses backend field names: title, description, category, organizer, capacity,
    // registration_deadline, fee_amount, location_type
    const raw = await jsonRequest('PATCH', `/events/${encodeURIComponent(eventId)}`, patch);
    return mapBackendEvent(raw, []);
  },

  /** super_admin only. */
  async publishEvent(eventId: string): Promise<EventItem> {
    const raw = await jsonRequest('POST', `/events/${encodeURIComponent(eventId)}/publish`);
    return mapBackendEvent(raw, []);
  },

  async createSession(
    eventId: string,
    input: {
      title: string;
      startsAt: string; // ISO
      endsAt: string; // ISO
      timezone?: string;
      location?: string;
      capacity?: number | null;
      meetingLink?: string;
      meetingLinks?: { url: string; platform?: string; label?: string; public?: boolean }[];
      speaker?: string;
    }
  ): Promise<SessionItem> {
    const raw = await jsonRequest('POST', `/events/${encodeURIComponent(eventId)}/sessions`, {
      title: input.title,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      timezone: input.timezone || 'Asia/Karachi',
      location: input.location || null,
      capacity: input.capacity || null,
      meeting_link: input.meetingLink || null,
      meeting_links: input.meetingLinks && input.meetingLinks.length ? input.meetingLinks : undefined,
      speaker: input.speaker || null,
    });
    return mapBackendSession(raw, eventId);
  },

  async updateSession(eventId: string, sessionId: string, patch: Record<string, unknown>): Promise<SessionItem> {
    // patch uses backend names: title, starts_at, ends_at, timezone, location, capacity, meeting_link, speaker
    const requestPatch = { ...patch };
    if (requestPatch.meeting_links === undefined) delete requestPatch.meeting_links;
    const raw = await jsonRequest(
      'PATCH',
      `/events/${encodeURIComponent(eventId)}/sessions/${encodeURIComponent(sessionId)}`,
      requestPatch
    );
    return mapBackendSession(raw, eventId);
  },
};