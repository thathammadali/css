import { UserAccount } from '../types';
import { apiFetch } from './apiClient';

export type ManagedUserRole = 'student' | 'admin' | 'super_admin';

export interface ListUsersParams {
  q?: string;
  role?: ManagedUserRole | '';
  limit?: number;
  offset?: number;
}

async function readDetailError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  const detail = body?.detail;
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail
      .map((item: { loc?: (string | number)[]; msg?: string }) =>
        item?.msg ? `${(item.loc || []).slice(-1)[0] ?? 'field'}: ${item.msg}` : JSON.stringify(item)
      )
      .join(', ');
  }
  return body?.message || `Request failed (${res.status})`;
}

function mapUserOut(raw: any): UserAccount {
  const role: ManagedUserRole =
    raw.role === 'super_admin' || raw.role === 'admin' ? raw.role : 'student';

  return {
    id: String(raw.id),
    name: raw.full_name || '',
    primaryEmail: raw.primary_email || '',
    secondaryEmail: raw.secondary_email || '',
    role,
    department: raw.department || '',
    rollNumber: raw.roll_number || undefined,
    institutionAffiliation: raw.institution || raw.position_title || undefined,
    status: raw.is_active === false ? 'suspended' : 'active',
    createdAt: raw.created_at || '',
    lastActive: '',
  };
}

export const usersApi = {
  async listUsers(params: ListUsersParams = {}): Promise<UserAccount[]> {
    const qs = new URLSearchParams();
    if (params.q !== undefined && params.q.trim() !== '') {
      qs.set('q', params.q.trim());
    }
    if (params.role) {
      qs.set('role', params.role);
    }
    if (params.limit !== undefined) {
      qs.set('limit', String(params.limit));
    }
    if (params.offset !== undefined) {
      qs.set('offset', String(params.offset));
    }

    const queryString = qs.toString();
    const res = await apiFetch(`/users${queryString ? `?${queryString}` : ''}`);
    if (!res.ok) {
      throw new Error(await readDetailError(res));
    }
    const data = await res.json();
    return Array.isArray(data) ? data.map(mapUserOut) : [];
  },

  async updateRole(id: string | number, role: ManagedUserRole): Promise<UserAccount> {
    const res = await apiFetch(`/users/${encodeURIComponent(String(id))}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      throw new Error(await readDetailError(res));
    }
    return mapUserOut(await res.json());
  },

  async updateStatus(id: string | number, isActive: boolean): Promise<UserAccount> {
    const res = await apiFetch(`/users/${encodeURIComponent(String(id))}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    });
    if (!res.ok) {
      throw new Error(await readDetailError(res));
    }
    return mapUserOut(await res.json());
  },
};
