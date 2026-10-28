import { RegistrantItem, PaymentStatus, RegistrationLifecycleStatus } from '../types';
import { apiFetch, ApiError, readError } from './apiClient';

export type BackendRegistrationStatus =
  | 'PAYMENT_PENDING'
  | 'PAYMENT_REJECTED'
  | 'CONFIRMED'
  | 'CANCELLED';

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, options);
  if (!response.ok) throw new ApiError(await readError(response), response.status);
  return response.json() as Promise<T>;
}

export function mapBackendRegistration(raw: any): RegistrantItem {
  const backendStatus = String(raw.status || 'PAYMENT_PENDING') as BackendRegistrationStatus;
  const status: PaymentStatus =
    backendStatus === 'CONFIRMED'
      ? 'approved'
      : backendStatus === 'PAYMENT_REJECTED'
      ? 'rejected'
      : backendStatus === 'CANCELLED'
      ? 'cancelled'
      : 'pending';
  const lifecycleStatus = backendStatus as RegistrationLifecycleStatus;
  const name = String(raw.user_full_name ?? '');
  const email = String(raw.user_primary_email ?? '');

  return {
    id: String(raw.id),
    name,
    rollNumber: 'Not provided',
    email,
    primaryEmail: email,
    sessionId: String(raw.session_id),
    sessionTitle: String(raw.session_title ?? ''),
    eventId: String(raw.event_id),
    amount: 'Pending',
    isPaid: backendStatus === 'CONFIRMED',
    receiptFileName: raw.receipt_uploaded ? 'Receipt uploaded' : undefined,
    receiptRejectedReason: raw.payment_rejection_reason ?? undefined,
    status,
    backendStatus,
    lifecycleStatus,
    submittedAt: raw.created_at || new Date().toISOString(),
    avatarInitials: name.slice(0, 2).toUpperCase(),
    isWaitlisted: false,
    attendanceCompleted: Boolean(raw.attended),
  };
}

export const registrationApi = {
  async register(sessionId: string): Promise<RegistrantItem> {
    const raw = await requestJson<any>(
      `/registrations/sessions/${encodeURIComponent(sessionId)}`,
      { method: 'POST' }
    );
    return mapBackendRegistration(raw);
  },

  async mine(): Promise<RegistrantItem[]> {
    const raw = await requestJson<any[]>('/registrations/me');
    return raw.map(mapBackendRegistration);
  },

  async forSession(sessionId: string): Promise<RegistrantItem[]> {
    const raw = await requestJson<any[]>(
      `/registrations/sessions/${encodeURIComponent(sessionId)}/all`
    );
    return raw.map(mapBackendRegistration);
  },

  async cancel(id: string): Promise<RegistrantItem> {
    const raw = await requestJson<any>(`/registrations/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
    });
    return mapBackendRegistration(raw);
  },

  async uploadReceipt(id: string, file: File): Promise<RegistrantItem> {
    const body = new FormData();
    body.append('file', file);
    const raw = await requestJson<any>(`/registrations/${encodeURIComponent(id)}/receipt`, {
      method: 'POST',
      body,
    });
    return mapBackendRegistration(raw);
  },

  async openReceipt(id: string): Promise<Blob> {
    const response = await apiFetch(`/registrations/${encodeURIComponent(id)}/receipt`);
    if (!response.ok) throw new ApiError(await readError(response), response.status);
    return response.blob();
  },

  async approve(id: string): Promise<RegistrantItem> {
    const raw = await requestJson<any>(`/registrations/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
    });
    return mapBackendRegistration(raw);
  },

  async reject(id: string, reason: string): Promise<RegistrantItem> {
    const raw = await requestJson<any>(`/registrations/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return mapBackendRegistration(raw);
  },
};
