/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserAccount, AuditLogEntry, DashboardRole } from '../types';
import { notificationService } from './notificationService';

const USERS_STORAGE_KEY = 'sems_users_accounts';
const AUDIT_STORAGE_KEY = 'sems_audit_logs';

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr-1',
    name: 'Prof. Dean Taylor',
    primaryEmail: 'dean.taylor@university.edu.pk',
    secondaryEmail: 'deantaylor.personal@gmail.com',
    role: 'super_admin',
    department: 'Computer Science & Academic Affairs',
    institutionAffiliation: 'University Executive Dean',
    status: 'active',
    createdAt: '2026-01-10T08:00:00Z',
    lastActive: 'Just now',
    password: 'dean1234',
  },
  {
    id: 'usr-2',
    name: 'Alex Morgan',
    primaryEmail: 'admin@university.edu.pk',
    secondaryEmail: 'alexmorgan.leads@gmail.com',
    role: 'admin',
    department: 'Robotics & AI Society',
    institutionAffiliation: 'Campus Admin',
    status: 'active',
    createdAt: '2026-02-01T10:00:00Z',
    lastActive: '5m ago',
    password: 'admin123',
  },
  {
    id: 'usr-3',
    name: 'Jordan Lee',
    primaryEmail: 'student@university.edu.pk',
    secondaryEmail: 'sportszaab@gmail.com',
    role: 'student',
    department: 'Software Engineering',
    rollNumber: '2024-CS-42',
    institutionAffiliation: 'Undergraduate Class of 2026',
    status: 'active',
    createdAt: '2026-03-12T14:20:00Z',
    lastActive: '12m ago',
    password: 'student123',
  },
  {
    id: 'usr-4',
    name: 'Dr. Sarah Connor',
    primaryEmail: 'sarah.connor@industrytech.io',
    secondaryEmail: 'sarahconnor.ai@gmail.com',
    role: 'guest',
    department: 'External Industry Guest',
    institutionAffiliation: 'Autonomous Robotics Labs Inc.',
    status: 'active',
    createdAt: '2026-09-20T11:45:00Z',
    lastActive: '1h ago',
    password: 'guest123',
  },
  {
    id: 'usr-5',
    name: 'Hassan Tariq',
    primaryEmail: 'hassan.tariq@university.edu.pk',
    secondaryEmail: 'hassantariq99@gmail.com',
    role: 'student',
    department: 'Data Science',
    rollNumber: '2024-DS-19',
    institutionAffiliation: 'Undergraduate Class of 2026',
    status: 'active',
    createdAt: '2026-04-05T09:15:00Z',
    lastActive: '2h ago',
    password: 'student123',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-1',
    action: 'EVENT_PUBLISH_APPROVED',
    actor: 'Prof. Dean Taylor',
    actorRole: 'SUPER ADMIN',
    target: 'National Robotics & Autonomous Systems Summit 2026',
    timestamp: '2026-09-20T12:00:00Z',
    details: 'Super Admin reviewed and published event with 1 scheduled session.',
    result: 'SUCCESS',
  },
  {
    id: 'aud-2',
    action: 'PAYMENT_RECEIPT_APPROVED',
    actor: 'Alex Morgan',
    actorRole: 'ADMIN',
    target: 'Jordan Lee (FA23-BCS-042)',
    timestamp: '2026-09-28T16:10:00Z',
    details: 'Bank transfer slip verified for amount Rs. 500.',
    result: 'SUCCESS',
  },
  {
    id: 'aud-3',
    action: 'CERTIFICATE_ISSUED',
    actor: 'Alex Morgan',
    actorRole: 'ADMIN',
    target: 'SEMS-2026-849201 (Jordan Lee)',
    timestamp: '2026-09-29T10:30:00Z',
    details: 'Eligible participant credential generated and cryptographically anchored.',
    result: 'SUCCESS',
  },
];

export const userService = {
  getUsers(): UserAccount[] {
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return INITIAL_USERS;
  },

  saveUsers(users: UserAccount[]): void {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch {
      // fallback
    }
  },

  findUserByEmail(email: string): UserAccount | null {
    if (!email) return null;
    const normalized = email.toLowerCase().trim();
    const users = this.getUsers();
    return (
      users.find(
        (u) =>
          u.primaryEmail.toLowerCase().trim() === normalized ||
          (u.secondaryEmail && u.secondaryEmail.toLowerCase().trim() === normalized)
      ) || null
    );
  },

  authenticate(
    email: string,
    password: string
  ): { success: boolean; user?: UserAccount; error?: string } {
    if (!email || !email.trim()) {
      return { success: false, error: 'Email address is required.' };
    }
    if (!password) {
      return { success: false, error: 'Password is required.' };
    }

    const normalized = email.toLowerCase().trim();
    const user = this.findUserByEmail(normalized);

    if (!user) {
      return {
        success: false,
        error: 'No account registered with this email address. Please click Sign Up to create an account.',
      };
    }

    if (user.status === 'suspended') {
      return {
        success: false,
        error: 'This account has been suspended by campus administration. Please contact support.',
      };
    }

    // Authenticate password
    if (user.password && user.password !== password) {
      return {
        success: false,
        error: 'Invalid password. Please verify your credentials and try again.',
      };
    }

    // Update lastActive timestamp
    user.lastActive = 'Just now';
    const users = this.getUsers().map((u) => (u.id === user.id ? user : u));
    this.saveUsers(users);

    return { success: true, user };
  },

  registerUser(params: {
    name: string;
    primaryEmail: string;
    secondaryEmail?: string;
    accountType?: 'student' | 'guest';
    institutionAffiliation?: string;
    department?: string;
    rollNumber?: string;
    password?: string;
  }): UserAccount {
    const users = this.getUsers();
    const existing = this.findUserByEmail(params.primaryEmail);
    if (existing) {
      // Preserve existing role and records - NEVER automatically convert or demote existing account
      return existing;
    }

    // Public self-service registrations can ONLY ever be 'student' or 'guest'.
    // Privileged roles ('admin' and 'super_admin') are strictly forbidden from public self-service creation.
    const assignedRole: DashboardRole = params.accountType === 'guest' ? 'guest' : 'student';

    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      name: params.name,
      primaryEmail: params.primaryEmail.trim(),
      secondaryEmail: (params.secondaryEmail || '').trim(),
      role: assignedRole,
      department: assignedRole === 'student' ? (params.department || 'Software Engineering') : 'External Participant',
      rollNumber: assignedRole === 'student' ? params.rollNumber : undefined,
      institutionAffiliation: params.institutionAffiliation || (assignedRole === 'student' ? 'University Campus Student' : 'External Guest Attendee'),
      status: 'active',
      createdAt: new Date().toISOString(),
      lastActive: 'Just now',
      password: params.password,
    };

    const updated = [newUser, ...users];
    this.saveUsers(updated);
    return newUser;
  },

  updateUserRole(
    userId: string,
    newRole: DashboardRole,
    actor: string,
    actorRole: DashboardRole = 'super_admin'
  ): UserAccount | null {
    // Only Super Admin can manage roles. Admin cannot promote or demote users.
    if (actorRole !== 'super_admin') {
      auditService.log({
        action: 'UNAUTHORIZED_ROLE_CHANGE_ATTEMPT',
        actor,
        actorRole: actorRole.toUpperCase(),
        target: userId,
        details: `Blocked unauthorized attempt to assign ${newRole.toUpperCase()} role. Role management requires Super Admin authority.`,
        result: 'FAILED',
      });
      return null;
    }

    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) return null;

    const targetUser = users[index];
    const modifiedUser: UserAccount = {
      ...targetUser,
      role: newRole,
    };

    users[index] = modifiedUser;
    this.saveUsers(users);

    auditService.log({
      action: 'ROLE_MODIFIED',
      actor,
      actorRole: 'SUPER ADMIN',
      target: `${modifiedUser.name} (${modifiedUser.primaryEmail})`,
      details: `Role reassigned to ${newRole.toUpperCase()}.`,
      result: 'SUCCESS',
    });

    // Notify user of role assignment
    notificationService.addNotification({
      recipientEmail: modifiedUser.primaryEmail,
      type: 'role_updated',
      title: 'Campus Role Updated',
      message: `Your SEMS system role has been updated to ${newRole.toUpperCase()} by Super Admin.`,
      linkTab: 'profile',
      entityId: `role-${modifiedUser.id}-${Date.now()}`,
    });

    return modifiedUser;
  },

  toggleUserStatus(userId: string, actor: string): UserAccount | null {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) return null;

    const targetUser = users[index];
    const nextStatus: 'active' | 'suspended' = targetUser.status === 'active' ? 'suspended' : 'active';
    const modifiedUser: UserAccount = {
      ...targetUser,
      status: nextStatus,
    };

    users[index] = modifiedUser;
    this.saveUsers(users);

    auditService.log({
      action: nextStatus === 'suspended' ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_REACTIVATED',
      actor,
      actorRole: 'SUPER ADMIN',
      target: `${modifiedUser.name} (${modifiedUser.primaryEmail})`,
      details: `Account status updated to ${nextStatus.toUpperCase()}.`,
      result: 'SUCCESS',
    });

    // Notify user of account suspension or restoration
    notificationService.addNotification({
      recipientEmail: modifiedUser.primaryEmail,
      type: 'account_status',
      title: nextStatus === 'suspended' ? 'Account Suspended' : 'Account Reactivated',
      message: nextStatus === 'suspended'
        ? 'Your SEMS campus account access has been suspended by administration.'
        : 'Your SEMS campus account access has been restored.',
      linkTab: 'profile',
      entityId: `status-${modifiedUser.id}-${Date.now()}`,
    });

    return modifiedUser;
  },
};

export const auditService = {
  getLogs(): AuditLogEntry[] {
    try {
      const stored = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return INITIAL_AUDIT_LOGS;
  },

  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const logs = this.getLogs();
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify([newEntry, ...logs]));
    } catch {
      // fallback
    }
  },
};
