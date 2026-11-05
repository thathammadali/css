import { CertificateItem, CertificateSettings, CertificateTemplateStyle } from '../types';
import { apiFetch, ApiError, readError } from './apiClient';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, options);
  if (!response.ok) throw new ApiError(await readError(response), response.status);
  return response.json() as Promise<T>;
}

const TEMPLATE_STYLES: CertificateTemplateStyle[] = [
  'classic_ivory',
  'modern_tech',
  'royal_navy',
  'ornate_image_frame',
  'modern_vector_frame',
  'minimal_monochrome',
  'emerald_executive',
  'crimson_heritage',
  'sapphire_vector',
];

const SETTINGS_KEYS: Record<keyof CertificateSettings, string> = {
  title: 'title',
  bodyLine: 'body_line',
  societyName: 'society_name',
  signatory1Name: 'signatory1_name',
  signatory1Title: 'signatory1_title',
  signatory2Name: 'signatory2_name',
  signatory2Title: 'signatory2_title',
};

export function mapBackendSettings(raw: any): CertificateSettings | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const settings: CertificateSettings = {};
  (Object.keys(SETTINGS_KEYS) as (keyof CertificateSettings)[]).forEach((key) => {
    const value = raw[SETTINGS_KEYS[key]];
    if (typeof value === 'string' && value) settings[key] = value;
  });
  return Object.keys(settings).length ? settings : undefined;
}

export function mapBackendCertificate(raw: any): CertificateItem {
  const valid = Boolean(raw.is_valid);
  const code = String(raw.code ?? '');
  const issuedAt = raw.issued_at ? new Date(raw.issued_at).toLocaleDateString() : 'Not specified';
  return {
    id: String(raw.id),
    backendId: String(raw.id),
    code,
    verificationCode: code,
    title: String(raw.category || 'Certificate of Participation'),
    sessionTitle: String(raw.event_title ?? ''),
    eventName: String(raw.event_title ?? ''),
    recipientName: String(raw.recipient_name ?? ''),
    recipientRoll: raw.recipient_roll ?? raw.student_id ?? 'Not provided',
    issueDate: issuedAt,
    isValid: valid,
    status: valid ? 'approved' : 'revoked',
    eventId: raw.event_id !== undefined ? String(raw.event_id) : undefined,
    templateStyle: TEMPLATE_STYLES.includes(raw.certificate_template?.style)
      ? raw.certificate_template.style
      : 'classic_ivory',
    settings: mapBackendSettings(raw.certificate_settings),
    templateFormat: 'html',
    statusTag: raw.status_tag ?? undefined,
    revocationReason: raw.revoke_reason ?? undefined,
    revokedAt: raw.revoked_at ?? undefined,
    category: raw.category ?? undefined,
  };
}

export const certificateApi = {
  async issueToAttended(eventId: string, category: string | null): Promise<CertificateItem[]> {
    return this.issueTo(eventId, undefined, category);
  },

  async issueTo(
    eventId: string,
    userIds: string[] | undefined,
    category: string | null
  ): Promise<CertificateItem[]> {
    const raw = await request<any[]>(`/events/${encodeURIComponent(eventId)}/certificates/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_ids: userIds?.map((id) => Number(id)),
        category: category || null,
      }),
    });
    return raw.map(mapBackendCertificate);
  },

  async bulkUpload(eventId: string, file: File): Promise<CertificateItem[]> {
    const body = new FormData();
    body.append('file', file);
    const raw = await request<any[]>(`/events/${encodeURIComponent(eventId)}/certificates/bulk`, {
      method: 'POST',
      body,
    });
    return raw.map(mapBackendCertificate);
  },

  async listForEvent(eventId: string): Promise<CertificateItem[]> {
    const raw = await request<any[]>(`/events/${encodeURIComponent(eventId)}/certificates`);
    return raw.map(mapBackendCertificate);
  },

  async saveTemplate(eventId: string, style: CertificateTemplateStyle): Promise<CertificateTemplateStyle> {
    const raw = await request<any>(`/events/${encodeURIComponent(eventId)}/certificate-template`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: { style } }),
    });
    return TEMPLATE_STYLES.includes(raw?.template?.style) ? raw.template.style : style;
  },

  async saveSettings(eventId: string, settings: CertificateSettings): Promise<CertificateSettings | undefined> {
    const body: Record<string, string | null> = {};
    (Object.keys(SETTINGS_KEYS) as (keyof CertificateSettings)[]).forEach((key) => {
      body[SETTINGS_KEYS[key]] = settings[key]?.trim() || null;
    });
    const raw = await request<any>(`/events/${encodeURIComponent(eventId)}/certificate-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return mapBackendSettings(raw?.settings);
  },

  async mine(): Promise<CertificateItem[]> {
    const raw = await request<any[]>('/certificates/me');
    return raw.map(mapBackendCertificate);
  },

  async revoke(id: string, reason: string): Promise<CertificateItem> {
    const raw = await request<any>(`/certificates/${encodeURIComponent(id)}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return mapBackendCertificate(raw);
  },

  async reinstate(id: string): Promise<CertificateItem> {
    const raw = await request<any>(`/certificates/${encodeURIComponent(id)}/reinstate`, {
      method: 'POST',
    });
    return mapBackendCertificate(raw);
  },

  async verify(code: string): Promise<{
    valid: boolean;
    recipient_name?: string;
    event_title?: string;
    category?: string;
    issued_at?: string;
  }> {
    return request(`/certificates/verify/${encodeURIComponent(code)}`);
  },
};
