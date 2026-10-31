import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  ShieldAlert,
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { UserAccount, DashboardRole } from '../../types';
import { usersApi, ManagedUserRole } from '../../services/usersApi';
import { EmptyState } from '../EmptyState';
import { SkeletonState } from '../SkeletonState';

export interface UsersPageProps {
  currentRole: DashboardRole;
  currentUserEmail?: string;
  onNotify: (msg: string) => void;
  onBack: () => void;
  isLoading?: boolean;
}

const PAGE_LIMIT = 50;

export const UsersPage: React.FC<UsersPageProps> = ({
  currentRole,
  currentUserEmail = '',
  onNotify,
  onBack,
  isLoading: externalLoading = false,
}) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [fetching, setFetching] = useState<boolean>(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | ManagedUserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [offset, setOffset] = useState<number>(0);

  const isSuperAdmin = currentRole === 'super_admin';
  const canViewUsers = currentRole === 'super_admin' || currentRole === 'admin';

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setOffset(0);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const loadUsers = useCallback(async () => {
    if (!canViewUsers) return;
    setFetching(true);
    try {
      const list = await usersApi.listUsers({
        q: debouncedQuery || undefined,
        role: roleFilter === 'all' ? undefined : roleFilter,
        limit: PAGE_LIMIT,
        offset,
      });
      setUsers(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load users.';
      onNotify(msg);
      setUsers([]);
    } finally {
      setFetching(false);
    }
  }, [canViewUsers, debouncedQuery, roleFilter, offset, onNotify]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  if (!canViewUsers) {
    return (
      <div className="p-8 rounded-3xl glass-panel text-center max-w-xl mx-auto space-y-4 my-12 border border-rose-500/30">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-300 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-poppins font-semibold text-white">Administrator Access Required</h2>
        <p className="text-xs text-[var(--text-sec-70)] leading-relaxed">
          Access to user directory and role governance requires administrator privileges. Your current role is{' '}
          <strong className="text-white uppercase">{currentRole}</strong>.
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

  const handleRoleChange = async (target: UserAccount, newRole: ManagedUserRole) => {
    if (!isSuperAdmin) {
      onNotify('Only Super Administrators can update user roles.');
      return;
    }
    setBusyUserId(target.id);
    try {
      const updated = await usersApi.updateRole(target.id, newRole);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      onNotify(`Updated role for ${updated.name} to ${updated.role}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update role.';
      onNotify(msg);
    } finally {
      setBusyUserId(null);
    }
  };

  const handleStatusToggle = async (target: UserAccount) => {
    const nextIsActive = target.status !== 'active';
    setBusyUserId(target.id);
    try {
      const updated = await usersApi.updateStatus(target.id, nextIsActive);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      onNotify(`${updated.name} is now ${updated.status}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user status.';
      onNotify(msg);
    } finally {
      setBusyUserId(null);
    }
  };

  const visibleUsers = users.filter((u) => statusFilter === 'all' || u.status === statusFilter);

  const exportUsersCSV = () => {
    const header = 'ID,Name,Primary Email,Secondary Email,Role,Department,Status\n';
    const rows = visibleUsers
      .map(
        (u) =>
          `"${u.id}","${u.name}","${u.primaryEmail}","${u.secondaryEmail}","${u.role}","${u.department}","${u.status}"`
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

  const isLoading = externalLoading || fetching;

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">
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
            Manage campus user accounts, role assignments, and account activation status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportUsersCSV}
            disabled={visibleUsers.length === 0}
            className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-40 disabled:cursor-not-allowed border border-white/[0.12] text-xs font-medium text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-cyan-300" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
        <div className="relative sm:col-span-1">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name or primary email..."
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
            onChange={(e) => {
              setRoleFilter(e.target.value as 'all' | ManagedUserRole);
              setOffset(0);
            }}
            className="w-full h-10 px-3 rounded-xl bg-white/[0.05] border border-white/[0.12] text-xs text-white focus:outline-none"
          >
            <option value="all" className="bg-slate-900">All Roles</option>
            <option value="student" className="bg-slate-900">student</option>
            <option value="admin" className="bg-slate-900">admin</option>
            <option value="super_admin" className="bg-slate-900">super_admin</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--text-sec-60)] shrink-0">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'suspended')}
            className="w-full h-10 px-3 rounded-xl bg-white/[0.05] border border-white/[0.12] text-xs text-white focus:outline-none"
          >
            <option value="all" className="bg-slate-900">All Statuses</option>
            <option value="active" className="bg-slate-900">Active</option>
            <option value="suspended" className="bg-slate-900">Suspended</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <SkeletonState variant="table" count={5} />
      ) : visibleUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No user accounts found"
          description={
            searchQuery
              ? `No user records found matching "${searchQuery}".`
              : 'No campus users match the current filter criteria.'
          }
          actionLabel="Reset Filters"
          onAction={() => {
            setSearchQuery('');
            setRoleFilter('all');
            setStatusFilter('all');
            setOffset(0);
          }}
        />
      ) : (
        <div className="space-y-4">
          <div className="sm:hidden space-y-3">
            {visibleUsers.map((u) => {
              const isSelf =
                Boolean(currentUserEmail) &&
                u.primaryEmail.toLowerCase() === currentUserEmail.toLowerCase();
              const isBusy = busyUserId === u.id;

              return (
                <div
                  key={u.id}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3 shadow-md"
                >
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
                      {u.department && (
                        <div className="text-[11px] text-[var(--text-sec-70)] mt-0.5">{u.department}</div>
                      )}
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

                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs font-mono space-y-1">
                    <div className="text-cyan-200 truncate text-[11px]">
                      <span className="text-[10px] text-white/50 font-sans mr-1">Primary:</span>
                      {u.primaryEmail}
                    </div>
                    {u.secondaryEmail && (
                      <div className="text-amber-200/90 truncate text-[11px]">
                        <span className="text-[10px] text-white/50 font-sans mr-1">Secondary:</span>
                        {u.secondaryEmail}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
                    <div className="flex-1">
                      <span className="text-[10px] text-[var(--text-sec-60)] block mb-1">Role:</span>
                      {isSuperAdmin ? (
                        <select
                          value={u.role}
                          disabled={isSelf || isBusy}
                          onChange={(e) => handleRoleChange(u, e.target.value as ManagedUserRole)}
                          className={`w-full h-8 px-2.5 rounded-lg border text-xs font-medium focus:outline-none transition-colors cursor-pointer ${
                            u.role === 'super_admin'
                              ? 'bg-purple-950/60 border-purple-500/40 text-purple-200'
                              : u.role === 'admin'
                              ? 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                              : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <option value="student" className="bg-slate-900">student</option>
                          <option value="admin" className="bg-slate-900">admin</option>
                          <option value="super_admin" className="bg-slate-900">super_admin</option>
                        </select>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.12] text-xs font-mono text-white">
                          {u.role}
                        </span>
                      )}
                    </div>

                    <div className="shrink-0 self-end">
                      <button
                        type="button"
                        disabled={isSelf || isBusy}
                        onClick={() => handleStatusToggle(u)}
                        className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                          u.status === 'active'
                            ? 'border-rose-500/30 text-rose-300 hover:bg-rose-950/40'
                            : 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/40'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden sm:block glass-panel rounded-2xl overflow-hidden border border-white/[0.08]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.04] border-b border-white/[0.08] text-[var(--text-sec-70)] font-medium">
                  <tr>
                    <th className="py-3 px-4">User & Department</th>
                    <th className="py-3 px-4">Emails</th>
                    <th className="py-3 px-4">Role Assignment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {visibleUsers.map((u) => {
                    const isSelf =
                      Boolean(currentUserEmail) &&
                      u.primaryEmail.toLowerCase() === currentUserEmail.toLowerCase();
                    const isBusy = busyUserId === u.id;

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
                          {u.department && (
                            <div className="text-[11px] text-[var(--text-sec-70)] truncate max-w-[220px]">
                              {u.department}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] space-y-0.5">
                          <div className="text-cyan-200 truncate max-w-[240px]">{u.primaryEmail}</div>
                          {u.secondaryEmail && (
                            <div className="text-amber-200/90 truncate max-w-[240px]">{u.secondaryEmail}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {isSuperAdmin ? (
                            <select
                              value={u.role}
                              disabled={isSelf || isBusy}
                              onChange={(e) => handleRoleChange(u, e.target.value as ManagedUserRole)}
                              className={`h-8 px-2.5 rounded-lg border text-xs font-medium focus:outline-none transition-colors cursor-pointer ${
                                u.role === 'super_admin'
                                  ? 'bg-purple-950/60 border-purple-500/40 text-purple-200'
                                  : u.role === 'admin'
                                  ? 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                                  : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              <option value="student" className="bg-slate-900">student</option>
                              <option value="admin" className="bg-slate-900">admin</option>
                              <option value="super_admin" className="bg-slate-900">super_admin</option>
                            </select>
                          ) : (
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.12] text-xs font-mono text-white">
                              {u.role}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase ${
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
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            disabled={isSelf || isBusy}
                            onClick={() => handleStatusToggle(u)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                              u.status === 'active'
                                ? 'border-rose-500/30 text-rose-300 hover:bg-rose-950/40'
                                : 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/40'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
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

          {(offset > 0 || users.length === PAGE_LIMIT) && (
            <div className="flex items-center justify-between pt-2 text-xs text-[var(--text-sec-70)]">
              <span>
                Showing {offset + 1} – {offset + visibleUsers.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={offset === 0 || isLoading}
                  onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_LIMIT))}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-40 disabled:cursor-not-allowed border border-white/[0.12] text-white flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  disabled={users.length < PAGE_LIMIT || isLoading}
                  onClick={() => setOffset((prev) => prev + PAGE_LIMIT)}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-40 disabled:cursor-not-allowed border border-white/[0.12] text-white flex items-center gap-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
