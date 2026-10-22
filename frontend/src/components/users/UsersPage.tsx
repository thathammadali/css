/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Users,
  ShieldAlert,
  Search,
  History,
  Download,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { UserAccount, AuditLogEntry, DashboardRole } from '../../types';
import { userService, auditService } from '../../services/userService';

interface UsersPageProps {
  currentRole: DashboardRole;
  currentUserEmail?: string;
  onNotify: (msg: string) => void;
  onBack: () => void;
  isLoading?: boolean;
}

import { EmptyState } from '../EmptyState';
import { SkeletonState } from '../SkeletonState';

export const UsersPage: React.FC<UsersPageProps> = ({
  currentRole,
  currentUserEmail = 'dean.taylor@university.edu.pk',
  onNotify,
  onBack,
  isLoading = false,
}) => {
  const [users, setUsers] = useState<UserAccount[]>(() => userService.getUsers());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => auditService.getLogs());
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | DashboardRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  const isSuperAdmin = currentRole === 'super_admin';

  if (!isSuperAdmin) {
    return (
      <div className="p-8 rounded-3xl glass-panel text-center max-w-xl mx-auto space-y-4 my-12 border border-rose-500/30">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-300 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-poppins font-semibold text-white">Super Admin Authority Required</h2>
        <p className="text-xs text-[var(--text-sec-70)] leading-relaxed">
          Access to campus user provisioning, role assignments, and security audit logs is strictly reserved for Super Administrators. Your current role is <strong className="text-white uppercase">{currentRole}</strong>.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs text-white font-medium cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const handleRoleChange = (userId: string, newRole: DashboardRole) => {
    const updated = userService.updateUserRole(userId, newRole, currentUserEmail, currentRole);
    if (updated) {
      setUsers(userService.getUsers());
      setAuditLogs(auditService.getLogs());
      onNotify(`Updated role for ${updated.name} to ${newRole.toUpperCase()}`);
    }
  };

  const handleStatusToggle = (userId: string) => {
    const updated = userService.toggleUserStatus(userId, currentUserEmail);
    if (updated) {
      setUsers(userService.getUsers());
      setAuditLogs(auditService.getLogs());
      onNotify(`User ${updated.name} is now ${updated.status.toUpperCase()}`);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.primaryEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.secondaryEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.rollNumber && u.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      u.department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const exportUsersCSV = () => {
    const header = 'ID,Name,Primary Email,Secondary Email,Role,Department,Status,Created At\n';
    const rows = filteredUsers
      .map(
        (u) =>
          `"${u.id}","${u.name}","${u.primaryEmail}","${u.secondaryEmail}","${u.role}","${u.department}","${u.status}","${u.createdAt}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SEMS_Users_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onNotify('Exported users dataset to CSV.');
  };

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.10]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--primary-accent)]/20 text-[var(--primary-accent)] border border-[var(--primary-accent)]/30">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="font-poppins text-xl sm:text-2xl font-semibold text-white">
              Users & System Role Governance
            </h1>
          </div>
          <p className="text-xs text-[var(--text-sec-70)] mt-1">
            Super Admin operational console • Manage role elevation, suspensions, and tamper-evident audit trail
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Selector */}
          <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-[var(--primary-accent)] text-white shadow'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              User Directory ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'bg-[var(--primary-accent)] text-white shadow'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Trail</span>
            </button>
          </div>

          {activeTab === 'users' && (
            <button
              type="button"
              onClick={exportUsersCSV}
              className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-xs font-medium text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'users' ? (
        <>
          {/* Search and Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
            <div className="relative sm:col-span-1">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, email, roll, department..."
                className="w-full h-10 pl-9 pr-8 rounded-xl bg-white/[0.05] border border-white/[0.12] text-xs text-white placeholder-white/40 focus:outline-none focus:border-[var(--primary-accent)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer text-xs"
                  title="Clear Search Query"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--text-sec-60)] shrink-0">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl bg-white/[0.05] border border-white/[0.12] text-xs text-white focus:outline-none"
              >
                <option value="all" className="bg-slate-900">All Roles</option>
                <option value="super_admin" className="bg-slate-900">Super Admin</option>
                <option value="admin" className="bg-slate-900">Admin</option>
                <option value="student" className="bg-slate-900">Student</option>
                <option value="guest" className="bg-slate-900">Guest</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--text-sec-60)] shrink-0">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl bg-white/[0.05] border border-white/[0.12] text-xs text-white focus:outline-none"
              >
                <option value="all" className="bg-slate-900">All Statuses</option>
                <option value="active" className="bg-slate-900">Active</option>
                <option value="suspended" className="bg-slate-900">Suspended</option>
              </select>
            </div>
          </div>

          {/* Users Section */}
          {isLoading ? (
            <SkeletonState variant="table" count={5} />
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No user accounts found"
              description={
                searchQuery
                  ? `No user records found matching "${searchQuery}".`
                  : 'No campus users match the current role and status filter criteria.'
              }
              actionLabel="Reset Filters"
              onAction={() => {
                setSearchQuery('');
                setRoleFilter('all');
                setStatusFilter('all');
              }}
            />
          ) : (
            <div className="space-y-4">
              {/* Mobile Screens (sm:hidden): Clean Visual Card Layout */}
              <div className="sm:hidden space-y-3">
                {filteredUsers.map((u) => {
                  const isSelf = u.primaryEmail === currentUserEmail;

                  return (
                    <div
                      key={u.id}
                      className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3 shadow-md"
                    >
                      {/* Header: Name, Roll No & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-poppins font-medium text-white text-sm flex items-center gap-2">
                            <span>{u.name}</span>
                            {u.rollNumber && (
                              <span className="font-mono text-[10px] text-cyan-300 bg-white/[0.06] px-1.5 py-0.5 rounded">
                                {u.rollNumber}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[var(--text-sec-70)] mt-0.5">
                            {u.department}
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase shrink-0 ${
                            u.status === 'active'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {u.status === 'active' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          <span>{u.status}</span>
                        </span>
                      </div>

                      {/* Dual Emails */}
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs font-mono space-y-1">
                        <div className="text-cyan-200 truncate text-[11px]" title="Primary Institutional Email">
                          <span className="text-[10px] text-white/50 font-sans mr-1">Primary:</span>
                          {u.primaryEmail}
                        </div>
                        <div className="text-amber-200/90 truncate text-[11px]" title="Permanent Secondary Email">
                          <span className="text-[10px] text-white/50 font-sans mr-1">Recovery:</span>
                          {u.secondaryEmail}
                        </div>
                      </div>

                      {/* Role & Actions */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
                        <div className="flex-1">
                          <span className="text-[10px] text-[var(--text-sec-60)] block mb-1">Assigned Role:</span>
                          <select
                            value={u.role}
                            disabled={isSelf}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as DashboardRole)}
                            className={`w-full h-8 px-2.5 rounded-lg border text-xs font-medium focus:outline-none transition-colors cursor-pointer ${
                              u.role === 'super_admin'
                                ? 'bg-purple-950/60 border-purple-500/40 text-purple-200'
                                : u.role === 'admin'
                                ? 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                                : u.role === 'student'
                                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                                : 'bg-white/[0.06] border-white/[0.12] text-white/80'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            <option value="super_admin" className="bg-slate-900">Super Admin</option>
                            <option value="admin" className="bg-slate-900">Admin</option>
                            <option value="student" className="bg-slate-900">Student</option>
                            <option value="guest" className="bg-slate-900">Guest</option>
                          </select>
                        </div>

                        <div className="shrink-0 self-end">
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => handleStatusToggle(u.id)}
                            className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                              u.status === 'active'
                                ? 'border-rose-500/30 text-rose-300 hover:bg-rose-950/40'
                                : 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/40'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                            title={isSelf ? 'Cannot modify your own Super Admin account' : ''}
                          >
                            {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Screens (hidden sm:block): Tabular Format */}
              <div className="hidden sm:block glass-panel rounded-2xl overflow-hidden border border-white/[0.08]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.04] border-b border-white/[0.08] text-[var(--text-sec-70)] font-medium">
                      <tr>
                        <th className="py-3 px-4">User & Department</th>
                        <th className="py-3 px-4">Dual Emails</th>
                        <th className="py-3 px-4">Role Assignment</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {filteredUsers.map((u) => {
                        const isSelf = u.primaryEmail === currentUserEmail;

                        return (
                          <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-poppins font-medium text-white flex items-center gap-2">
                                <span>{u.name}</span>
                                {u.rollNumber && (
                                  <span className="font-mono text-[11px] text-cyan-300 bg-white/[0.05] px-1.5 py-0.5 rounded">
                                    {u.rollNumber}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[var(--text-sec-70)] truncate max-w-[220px]">
                                {u.department}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 font-mono text-[11px] space-y-0.5">
                              <div className="text-cyan-200 truncate max-w-[240px]" title="Primary Institutional Email">
                                {u.primaryEmail}
                              </div>
                              <div className="text-amber-200/90 truncate max-w-[240px]" title="Permanent Secondary Email (Graduation Recovery)">
                                {u.secondaryEmail}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <select
                                value={u.role}
                                disabled={isSelf}
                                onChange={(e) => handleRoleChange(u.id, e.target.value as DashboardRole)}
                                className={`h-8 px-2.5 rounded-lg border text-xs font-medium focus:outline-none transition-colors cursor-pointer ${
                                  u.role === 'super_admin'
                                    ? 'bg-purple-950/60 border-purple-500/40 text-purple-200'
                                    : u.role === 'admin'
                                    ? 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                                    : u.role === 'student'
                                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                                    : 'bg-white/[0.06] border-white/[0.12] text-white/80'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                <option value="super_admin" className="bg-slate-900">Super Admin</option>
                                <option value="admin" className="bg-slate-900">Admin</option>
                                <option value="student" className="bg-slate-900">Student</option>
                                <option value="guest" className="bg-slate-900">Guest</option>
                              </select>
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                                  u.status === 'active'
                                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                                }`}
                              >
                                {u.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                <span>{u.status}</span>
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                disabled={isSelf}
                                onClick={() => handleStatusToggle(u.id)}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                                  u.status === 'active'
                                    ? 'border-rose-500/30 text-rose-300 hover:bg-rose-950/40'
                                    : 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/40'
                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                                title={isSelf ? 'Cannot modify your own Super Admin account' : ''}
                              >
                                {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Audit Trail Table */
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/[0.08] space-y-4 p-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[var(--primary-accent)]" />
              <h3 className="font-poppins font-medium text-sm text-white">System Security & Lifecycle Audit Log</h3>
            </div>
            <span className="text-[11px] font-inter text-[var(--text-sec-60)]">
              Authoritative immutable event log
            </span>
          </div>

          {/* Mobile Screens (sm:hidden): Responsive Cards View */}
          <div className="sm:hidden space-y-2.5">
            {auditLogs.length === 0 ? (
              <div className="py-8 text-center">
                <EmptyState
                  icon={History}
                  title="No audit entries"
                  description="No security or user modification events recorded yet."
                />
              </div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-1.5 font-mono text-[11px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-300 font-semibold">{log.action}</span>
                    <span className="text-emerald-300 font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-[10px]">
                      {log.result}
                    </span>
                  </div>
                  <div className="text-white flex items-center justify-between">
                    <span>
                      Actor: <span className="font-semibold">{log.actor}</span>
                    </span>
                    <span className="text-[10px] text-amber-300">({log.actorRole})</span>
                  </div>
                  <div className="text-white/70 text-[10px] truncate" title={log.target}>
                    Target: {log.target}
                  </div>
                  <div className="text-[10px] text-[var(--text-sec-70)] pt-1 border-t border-white/[0.06] flex items-center justify-between">
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                    <span className="text-white/40">Audit Log</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Screens (hidden sm:block): Full Tabular Format */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] text-[var(--text-sec-70)] font-medium">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Actor & Authority</th>
                  <th className="py-2.5 px-3">Target Resource</th>
                  <th className="py-2.5 px-3">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] font-mono text-[11px]">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center">
                      <EmptyState
                        icon={History}
                        title="No audit entries"
                        description="No security or user modification events recorded yet."
                      />
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-3 text-[var(--text-sec-70)] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-cyan-300 font-semibold">{log.action}</td>
                      <td className="py-3 px-3 text-white">
                        <span>{log.actor}</span>
                        <span className="text-[10px] text-amber-300 ml-1.5">({log.actorRole})</span>
                      </td>
                      <td className="py-3 px-3 text-white/80 max-w-[200px] truncate" title={log.target}>
                        {log.target}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-300 font-bold">{log.result}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
