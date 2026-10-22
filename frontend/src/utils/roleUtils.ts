/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DashboardRole, UserRole } from '../types';
import { userService } from '../services/userService';

export interface IdentifiedRole {
  userRole: UserRole;
  dashboardRole: DashboardRole;
  roleDisplayName: string;
  badgeEmoji: string;
}

/**
 * Standard SEMS Permission Gates
 */
export type Permission =
  | 'MANAGE_USERS'
  | 'CHANGE_ROLES'
  | 'SUSPEND_USERS'
  | 'VIEW_AUDIT_LOGS'
  | 'CREATE_SESSION'
  | 'EDIT_SESSION'
  | 'MANAGE_RESOURCES'
  | 'MANAGE_TASKS'
  | 'REVIEW_PAYMENTS'
  | 'MANAGE_TEMPLATES'
  | 'REVOKE_CERTIFICATES'
  | 'BULK_ISSUE_CERTS'
  | 'SUBMIT_REGISTRATION'
  | 'UPLOAD_RECEIPT'
  | 'SUBMIT_TASK'
  | 'VIEW_OWN_CERTS'
  | 'VERIFY_CERTIFICATE';

/**
 * Role display metadata mapping for the 4 final canonical roles.
 */
export function getRoleDisplayName(role: DashboardRole): string {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    case 'student':
      return 'Student';
    case 'guest':
    default:
      return 'Guest';
  }
}

export function getRoleBadgeEmoji(role: DashboardRole): string {
  switch (role) {
    case 'super_admin':
      return '👑';
    case 'admin':
      return '🛡️';
    case 'student':
      return '🎓';
    case 'guest':
    default:
      return '🌐';
  }
}

/**
 * Centralized Role Permission Evaluator.
 *
 * Enforces authoritative role boundaries:
 * - SUPER ADMIN: Full system control, user management, and all operational administration.
 * - ADMIN: All operational administration (sessions, tasks, payments, certificates, templates),
 *          strictly CANNOT manage users or reassign roles.
 * - STUDENT: Participation, enrollment, receipt submission, tasks, certificates, profile.
 * - GUEST: Public catalog discovery, guest registration, QR verification.
 */
export function hasPermission(role: DashboardRole, permission: Permission): boolean {
  switch (permission) {
    // Super Admin Only
    case 'MANAGE_USERS':
    case 'CHANGE_ROLES':
    case 'SUSPEND_USERS':
    case 'VIEW_AUDIT_LOGS':
      return role === 'super_admin';

    // Operational Administration (Super Admin & Admin)
    case 'CREATE_SESSION':
    case 'EDIT_SESSION':
    case 'MANAGE_RESOURCES':
    case 'MANAGE_TASKS':
    case 'REVIEW_PAYMENTS':
    case 'MANAGE_TEMPLATES':
    case 'REVOKE_CERTIFICATES':
    case 'BULK_ISSUE_CERTS':
      return role === 'super_admin' || role === 'admin';

    // Participant Operations (Student & Guest)
    case 'SUBMIT_TASK':
    case 'VIEW_OWN_CERTS':
    case 'SUBMIT_REGISTRATION':
    case 'UPLOAD_RECEIPT':
      return role === 'student' || role === 'guest';

    case 'VERIFY_CERTIFICATE':
      return true; // Publicly accessible to all roles

    default:
      return false;
  }
}

export function hasRole(currentRole: DashboardRole, targetRole: DashboardRole): boolean {
  return currentRole === targetRole;
}

export function hasAnyRole(currentRole: DashboardRole, allowedRoles: DashboardRole[]): boolean {
  return allowedRoles.includes(currentRole);
}

export function isOperationalAdmin(role: DashboardRole): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function isSuperAdmin(role: DashboardRole): boolean {
  return role === 'super_admin';
}

export function isStudent(role: DashboardRole): boolean {
  return role === 'student';
}

export function isGuest(role: DashboardRole): boolean {
  return role === 'guest';
}

/**
 * Authoritative role resolver.
 *
 * SECURITY GUARANTEE:
 * - Resolves identity strictly against the authoritative user record repository (`userService`).
 * - NEVER infers roles from email substrings, domains, user names, or client-side storage hacks.
 * - Unknown or newly registered accounts default strictly to 'student' (or 'guest' if unauthenticated).
 * - A fake email like 'superadmin123@gmail.com' or 'adminstudent@gmail.com' will NEVER grant
 *   Admin or Super Admin status.
 */
export function getAuthoritativeUserRole(email: string): IdentifiedRole {
  const normalized = (email || '').toLowerCase().trim();

  if (!normalized) {
    return {
      userRole: 'guest',
      dashboardRole: 'guest',
      roleDisplayName: getRoleDisplayName('guest'),
      badgeEmoji: getRoleBadgeEmoji('guest'),
    };
  }

  // 1. Authoritative lookup in stored user accounts repository
  const account = userService.findUserByEmail(normalized);
  if (account) {
    const canonicalRole: DashboardRole = account.role;
    return {
      userRole: canonicalRole,
      dashboardRole: canonicalRole,
      roleDisplayName: getRoleDisplayName(canonicalRole),
      badgeEmoji: getRoleBadgeEmoji(canonicalRole),
    };
  }

  // 2. Default strictly to student for unverified / standard accounts.
  // Administrative roles are NEVER granted without an explicit authoritative user record.
  return {
    userRole: 'student',
    dashboardRole: 'student',
    roleDisplayName: getRoleDisplayName('student'),
    badgeEmoji: getRoleBadgeEmoji('student'),
  };
}

/**
 * Backwards-compatible alias for getAuthoritativeUserRole.
 * Guarantees zero keyword-based privilege inference.
 */
export const identifyRoleFromEmail = getAuthoritativeUserRole;
