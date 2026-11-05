import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Inbox,
  Search,
  Award,
  CreditCard,
  ClipboardList,
  Sparkles,
  Check,
  Plus,
  Users,
  GraduationCap,
  AlertCircle,
} from 'lucide-react';
import { DashboardRole, SessionItem, RegistrantItem, CertificateItem, EventItem } from '../types';
import { SessionCard } from './SessionCard';
import { DashboardSkeleton } from './DashboardSkeleton';
import { SessionDetailModal } from './SessionDetailModal';
import { EmptyState } from './EmptyState';

export interface HomeDashboardProps {
  currentRole: DashboardRole;
  events?: EventItem[];
  sessions?: SessionItem[];
  registrants?: RegistrantItem[];
  certificates?: CertificateItem[];
  currentUserEmail?: string;
  currentUserName?: string;
  onSelectRole?: (role: DashboardRole) => void;
  onNotify: (msg: string) => void;
  onNavigateToAuth: (mode?: 'login' | 'signup') => void;
  onNavigateToSession?: (sessionId: string) => void;
  onNavigateToSessionsList?: () => void;
  onNavigateToEvents?: () => void;
  onNavigateToFormBuilder?: () => void;
  onNavigateToRegistrants?: () => void;
  onNavigateToCertificates?: () => void;
  onNavigateToUsers?: () => void;
  onNavigateToCreateSession?: () => void;
  onUpdateRegistrants?: (updated: RegistrantItem[]) => void;
  onApproveEvent?: (eventId: string) => void;
}

function getGreeting(role: DashboardRole, name?: string): { title: string; subtitle: string; badge: string } {
  const displayName = name?.trim();
  switch (role) {
    case 'super_admin':
      return {
        title: displayName ? `Welcome, ${displayName}` : 'Super Admin Overview',
        subtitle: 'Review event publication requests, registrations, and user governance.',
        badge: 'Super Admin Authority',
      };
    case 'admin':
      return {
        title: displayName ? `Welcome, ${displayName}` : 'Admin Overview',
        subtitle: 'Manage events, scheduled sessions, participant registrations, and certificates.',
        badge: 'Society Administrator',
      };
    case 'student':
      return {
        title: displayName ? `Welcome, ${displayName}` : 'Student Dashboard',
        subtitle: 'Browse upcoming sessions, view your registrations, and access issued certificates.',
        badge: 'Student Account',
      };
    case 'guest':
    default:
      return {
        title: displayName ? `Welcome, ${displayName}` : 'Campus Sessions Overview',
        subtitle: 'Explore published campus events and upcoming sessions.',
        badge: 'Guest Visitor',
      };
  }
}

function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  currentRole,
  events = [],
  sessions = [],
  registrants = [],
  certificates = [],
  currentUserEmail,
  currentUserName,
  onNotify,
  onNavigateToSession,
  onNavigateToSessionsList,
  onNavigateToRegistrants,
  onNavigateToCertificates,
  onNavigateToUsers,
  onNavigateToCreateSession,
  onApproveEvent,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [studentTab, setStudentTab] = useState<'available' | 'registrations' | 'payments' | 'certificates'>('available');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Escape' || e.key === 'Esc') && selectedSession) {
        setSelectedSession(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSession]);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [currentRole]);

  const greeting = getGreeting(currentRole, currentUserName);

  const filteredSessions = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        s.society.toLowerCase().includes(q)
    );
  }, [sessions, filterQuery]);

  const myRegistrations = useMemo(() => {
    if (!currentUserEmail && !currentUserName) {
      return currentRole === 'student' ? registrants : [];
    }
    const emailNorm = (currentUserEmail || '').toLowerCase().trim();
    const nameNorm = (currentUserName || '').toLowerCase().trim();
    return registrants.filter((r) => {
      const regEmail = (r.email || '').toLowerCase().trim();
      const regPrimary = (r.primaryEmail || '').toLowerCase().trim();
      const regSecondary = (r.secondaryEmail || '').toLowerCase().trim();
      const regName = (r.name || '').toLowerCase().trim();
      return (
        (emailNorm && (regEmail === emailNorm || regPrimary === emailNorm || regSecondary === emailNorm)) ||
        (nameNorm && regName === nameNorm)
      );
    });
  }, [registrants, currentUserEmail, currentUserName, currentRole]);

  const myCertificates = useMemo(() => {
    if (currentRole === 'admin' || currentRole === 'super_admin') return certificates;
    if (!currentUserEmail && !currentUserName) return [];
    const emailNorm = (currentUserEmail || '').toLowerCase().trim();
    const nameNorm = (currentUserName || '').toLowerCase().trim();
    return certificates.filter((c) => {
      const certPrimary = (c.recipientPrimaryEmail || c.recipientEmail || '').toLowerCase().trim();
      const certSecondary = (c.recipientSecondaryEmail || '').toLowerCase().trim();
      const certName = (c.recipientName || '').toLowerCase().trim();
      return (
        (emailNorm && (certPrimary === emailNorm || certSecondary === emailNorm)) ||
        (nameNorm && certName === nameNorm)
      );
    });
  }, [certificates, currentRole, currentUserEmail, currentUserName]);

  const realStats = useMemo(() => {
    if (currentRole === 'admin' || currentRole === 'super_admin') {
      const pendingReviews = registrants.filter(
        (r) => r.status === 'pending' || r.backendStatus === 'PAYMENT_PENDING'
      ).length;
      return [
        { label: 'Events', value: events.length, icon: Calendar },
        { label: 'Sessions', value: sessions.length, icon: ClipboardList },
        { label: 'Registrations', value: registrants.length, icon: Users },
        { label: 'Pending Reviews', value: pendingReviews, icon: CreditCard },
      ];
    }

    if (currentRole === 'student') {
      const confirmedCount = myRegistrations.filter(
        (r) => r.status === 'approved' || r.backendStatus === 'CONFIRMED'
      ).length;
      return [
        { label: 'Available Sessions', value: sessions.length, icon: Calendar },
        { label: 'My Registrations', value: myRegistrations.length, icon: ClipboardList },
        { label: 'Confirmed Seats', value: confirmedCount, icon: Check },
        { label: 'My Certificates', value: myCertificates.length, icon: Award },
      ];
    }

    return [
      { label: 'Published Events', value: events.length, icon: Calendar },
      { label: 'Available Sessions', value: sessions.length, icon: ClipboardList },
    ];
  }, [currentRole, events.length, sessions.length, registrants, myRegistrations, myCertificates.length]);

  const pendingEvents = useMemo(
    () => events.filter((e) => e.status === 'PENDING_APPROVAL'),
    [events]
  );

  return (
    <div id="home-dashboard-view" className="w-full space-y-6 sm:space-y-8 pb-16">
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6 sm:space-y-8 animate-fadeIn">
          <section id="role-greeting-section" className="glass-card p-5 sm:p-6 rounded-2xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
              <div className="flex items-start sm:items-center gap-4">
                {currentRole === 'student' ? (
                  <div className="w-12 h-12 rounded-xl bg-[var(--accent-15)] border border-[var(--primary-accent)]/30 flex items-center justify-center font-poppins font-semibold text-base text-[var(--primary-accent)] shrink-0">
                    {getInitials(currentUserName)}
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[var(--accent-15)] border border-[var(--primary-accent)]/30 flex items-center justify-center text-[var(--primary-accent)] shrink-0 shadow-xs">
                    <GraduationCap className="w-6 h-6 text-[var(--primary-accent)]" />
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--accent-15)] text-[var(--primary-accent)] border border-[var(--accent-30)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary-accent)]" />
                      {greeting.badge}
                    </span>
                  </div>
                  <h2 className="font-poppins font-semibold text-2xl sm:text-3xl text-[var(--text-primary)] tracking-tight leading-tight">
                    {greeting.title}
                  </h2>
                  <p className="font-inter font-normal text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-xl">
                    {greeting.subtitle}
                  </p>
                </div>
              </div>

              {(currentRole === 'super_admin' || currentRole === 'admin') && onNavigateToCreateSession && (
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={onNavigateToCreateSession}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-105 active:scale-[0.98] text-white font-medium text-xs sm:text-sm cursor-pointer shadow-sm transition-all shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Manage Events & Sessions</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          <section
            id="role-stat-cards"
            aria-label="Summary counts"
            className={`grid grid-cols-1 sm:grid-cols-2 ${
              realStats.length > 2 ? 'lg:grid-cols-4' : 'lg:grid-cols-2'
            } gap-4`}
          >
            {realStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="glass-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-inter text-xs text-[var(--text-secondary)] font-medium uppercase tracking-wider">
                      {stat.label}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-15)] border border-[var(--accent-30)] flex items-center justify-center text-[var(--primary-accent)]">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <span className="block font-poppins font-semibold text-2xl sm:text-3xl text-[var(--text-primary)] tracking-tight leading-tight">
                      {stat.value}
                    </span>
                  </div>
                </div>
              );
            })}
          </section>

          {(currentRole === 'super_admin' || currentRole === 'admin') && (
            <div className="glass-card p-5 sm:p-6 rounded-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
                <h3 className="font-poppins font-medium text-base text-[var(--text-primary)] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span>
                    {currentRole === 'super_admin' ? 'Super Admin Governance Centre' : 'Admin Management Hub'}
                  </span>
                </h3>
                <span className="text-xs font-medium text-[var(--primary-accent)]">
                  {currentRole === 'super_admin' ? 'System Authority' : 'Operational Management'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={onNavigateToCreateSession}
                  className="p-3.5 rounded-xl bg-[var(--panel-bg)] hover:bg-[var(--accent-10)] border border-[var(--panel-border)] hover:border-[var(--primary-accent)] text-left space-y-1 cursor-pointer transition-all group"
                >
                  <Calendar className="w-5 h-5 text-[var(--primary-accent)] group-hover:scale-105 transition-transform" />
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Events & Sessions</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">Create & schedule</p>
                </button>

                <button
                  type="button"
                  onClick={onNavigateToRegistrants}
                  className="p-3.5 rounded-xl bg-[var(--panel-bg)] hover:bg-[var(--accent-10)] border border-[var(--panel-border)] hover:border-[var(--primary-accent)] text-left space-y-1 cursor-pointer transition-all group"
                >
                  <Users className="w-5 h-5 text-teal-600 dark:text-teal-400 group-hover:scale-105 transition-transform" />
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Registrants & Fees</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">Review receipts & attendance</p>
                </button>

                <button
                  type="button"
                  onClick={onNavigateToCertificates}
                  className="p-3.5 rounded-xl bg-[var(--panel-bg)] hover:bg-[var(--accent-10)] border border-[var(--panel-border)] hover:border-[var(--primary-accent)] text-left space-y-1 cursor-pointer transition-all group"
                >
                  <Award className="w-5 h-5 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform" />
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Certificates</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">Issue & verify credentials</p>
                </button>

                {currentRole === 'super_admin' && onNavigateToUsers && (
                  <button
                    type="button"
                    onClick={onNavigateToUsers}
                    className="p-3.5 rounded-xl bg-[var(--accent-15)] hover:bg-[var(--accent-25)] border border-[var(--primary-accent)]/30 text-left space-y-1 cursor-pointer transition-all group"
                  >
                    <Users className="w-5 h-5 text-[var(--primary-accent)] group-hover:scale-105 transition-transform" />
                    <p className="text-xs font-semibold text-[var(--text-primary)]">Users & Roles</p>
                    <p className="text-[11px] text-[var(--primary-accent)]">Manage user access</p>
                  </button>
                )}
              </div>

              {currentRole === 'super_admin' && pendingEvents.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      Events Awaiting Publication Approval ({pendingEvents.length})
                    </span>
                    <button
                      type="button"
                      onClick={onNavigateToSessionsList}
                      className="text-xs text-amber-700 dark:text-amber-300 hover:underline cursor-pointer font-medium"
                    >
                      Open Events Catalog →
                    </button>
                  </div>

                  <div className="space-y-2">
                    {pendingEvents.map((pEvt) => (
                      <div
                        key={pEvt.id}
                        className="p-3 rounded-lg bg-[var(--panel-bg)] border border-[var(--panel-border)] flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-[var(--text-primary)] block truncate">{pEvt.title}</span>
                          <span className="text-[11px] text-[var(--text-sec-70)] block truncate">
                            {pEvt.organizer} · {pEvt.sessions?.length || 0} sessions
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {onApproveEvent && (
                            <button
                              type="button"
                              onClick={() => onApproveEvent(pEvt.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs cursor-pointer shadow transition-colors flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve & Publish</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={onNavigateToSessionsList}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#172B3A] dark:text-[#F1F5F9] border border-slate-200 dark:border-slate-700 text-xs cursor-pointer transition-colors"
                          >
                            Inspect
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-[var(--panel-border)] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">Recent Registrations</span>
                  <button
                    type="button"
                    onClick={onNavigateToRegistrants}
                    className="text-[var(--primary-accent)] hover:underline cursor-pointer font-medium"
                  >
                    View all ({registrants.length}) →
                  </button>
                </div>

                <div className="divide-y divide-[var(--panel-border-subtle)] rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] overflow-hidden shadow-xs">
                  {registrants.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="No registrations yet"
                      description="Participant registrations will appear here once submitted."
                      actionLabel="Explore Sessions"
                      onAction={onNavigateToSessionsList || onNavigateToRegistrants}
                    />
                  ) : (
                    registrants.slice(0, 5).map((reg) => (
                      <div key={reg.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <span className="font-medium text-[var(--text-primary)] block truncate">
                            {reg.name} {reg.primaryEmail ? `(${reg.primaryEmail})` : ''}
                          </span>
                          <span className="text-[11px] text-[var(--text-secondary)] truncate block">
                            {reg.sessionTitle}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-semibold ${
                              reg.status === 'approved'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                : reg.status === 'rejected' || reg.status === 'cancelled'
                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {reg.backendStatus || reg.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {(currentRole === 'student' || currentRole === 'guest') && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[var(--panel-border)]">
                {(
                  [
                    { id: 'available', label: 'Available Sessions', count: sessions.length, icon: Calendar },
                    { id: 'registrations', label: 'My Registrations', count: myRegistrations.length, icon: ClipboardList },
                    { id: 'payments', label: 'My Payments', count: myRegistrations.length, icon: CreditCard },
                    { id: 'certificates', label: 'My Certificates', count: myCertificates.length, icon: Award },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = studentTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStudentTab(tab.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-[var(--accent-15)] text-[var(--primary-accent)] border border-[var(--accent-30)] font-semibold shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-10)]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                      <span
                        className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
                          isActive
                            ? 'bg-[var(--primary-accent)] text-white'
                            : 'bg-[var(--panel-bg)] text-[var(--text-secondary)] border border-[var(--panel-border)]'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {studentTab === 'registrations' && (
                <div className="glass-panel p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-[#172B3A] dark:text-[#F1F5F9]">My Registrations</h3>
                      <p className="text-xs text-[var(--text-sec-70)]">
                        View your session registrations and current enrollment status.
                      </p>
                    </div>
                    {onNavigateToRegistrants && myRegistrations.length > 0 && (
                      <button
                        type="button"
                        onClick={onNavigateToRegistrants}
                        className="text-xs text-[var(--primary-accent)] hover:underline cursor-pointer"
                      >
                        Manage Registrations →
                      </button>
                    )}
                  </div>

                  {myRegistrations.length === 0 ? (
                    <EmptyState
                      icon={ClipboardList}
                      title="No registrations yet"
                      description="You have not registered for any sessions yet."
                      actionLabel="Browse Available Sessions"
                      onAction={() => setStudentTab('available')}
                    />
                  ) : (
                    <div className="space-y-3">
                      {myRegistrations.map((reg) => (
                        <div
                          key={reg.id}
                          className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <h4 className="text-sm font-semibold text-[#172B3A] dark:text-[#F1F5F9] truncate">
                              {reg.sessionTitle}
                            </h4>
                            <p className="text-xs text-[var(--text-sec-70)]">
                              Submitted: {new Date(reg.submittedAt).toLocaleDateString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                                reg.status === 'approved'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                                  : reg.status === 'rejected' || reg.status === 'cancelled'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                                  : 'bg-amber-950 text-amber-300 border border-amber-500/50'
                              }`}
                            >
                              {reg.backendStatus || reg.status}
                            </span>

                            {onNavigateToSession && (
                              <button
                                type="button"
                                onClick={() => onNavigateToSession(reg.sessionId)}
                                className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs text-[var(--primary-accent)] font-medium cursor-pointer"
                              >
                                View Session
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {studentTab === 'payments' && (
                <div className="glass-panel p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-[#172B3A] dark:text-[#F1F5F9]">Payment & Receipt Status</h3>
                      <p className="text-xs text-[var(--text-sec-70)]">
                        Track fee verification and upload receipts from the registrations portal.
                      </p>
                    </div>
                    {onNavigateToRegistrants && (
                      <button
                        type="button"
                        onClick={onNavigateToRegistrants}
                        className="text-xs text-[var(--primary-accent)] hover:underline cursor-pointer"
                      >
                        Open Payments & Receipts →
                      </button>
                    )}
                  </div>

                  {myRegistrations.length === 0 ? (
                    <EmptyState
                      icon={CreditCard}
                      title="No payment records"
                      description="Payment statuses for your registered sessions will appear here."
                    />
                  ) : (
                    <div className="space-y-3">
                      {myRegistrations.map((reg) => (
                        <div
                          key={reg.id}
                          className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            reg.status === 'rejected'
                              ? 'bg-rose-950/25 border-rose-500/40'
                              : 'bg-white/[0.03] border-white/[0.08]'
                          }`}
                        >
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-[#172B3A] dark:text-[#F1F5F9]">
                                {reg.sessionTitle}
                              </h4>
                              {reg.status === 'rejected' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/30 text-rose-200 border border-rose-400/50 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-rose-300" />
                                  Action Required
                                </span>
                              )}
                            </div>

                            {reg.status === 'rejected' && reg.receiptRejectedReason && (
                              <p className="text-xs text-rose-200">
                                Rejection reason: {reg.receiptRejectedReason}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                                reg.status === 'approved'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                                  : reg.status === 'pending'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                                  : 'bg-rose-950 text-rose-300 border border-rose-500/50'
                              }`}
                            >
                              {reg.backendStatus || reg.status}
                            </span>

                            {onNavigateToRegistrants && (
                              <button
                                type="button"
                                onClick={onNavigateToRegistrants}
                                className="px-3 py-1.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 text-xs font-medium text-white cursor-pointer"
                              >
                                Manage Receipt
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {studentTab === 'certificates' && (
                <div className="glass-panel p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-[#172B3A] dark:text-[#F1F5F9]">My Certificates</h3>
                    {onNavigateToCertificates && (
                      <button
                        type="button"
                        onClick={onNavigateToCertificates}
                        className="text-xs text-[var(--primary-accent)] hover:underline cursor-pointer"
                      >
                        Open Certificate Portal →
                      </button>
                    )}
                  </div>

                  {myCertificates.length === 0 ? (
                    <EmptyState
                      icon={Award}
                      title="No certificates issued yet"
                      description="Earned certificates will appear here once issued."
                    />
                  ) : (
                    <div className="space-y-3">
                      {myCertificates.map((cert) => (
                        <div
                          key={cert.id}
                          className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Award className="w-4 h-4 text-amber-500 dark:text-amber-300" />
                              <h4 className="text-sm font-semibold text-[#172B3A] dark:text-[#F1F5F9]">
                                {cert.sessionTitle}
                              </h4>
                            </div>
                            <p className="text-xs text-[var(--text-sec-70)]">
                              ID: <span className="font-mono text-[#172B3A] dark:text-[#F1F5F9] font-medium">{cert.verificationCode}</span> • Issued: {cert.issueDate}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={onNavigateToCertificates}
                            className="px-4 py-2 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 text-xs font-medium text-white cursor-pointer shadow"
                          >
                            View Certificate
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {((currentRole !== 'student' && currentRole !== 'guest') || studentTab === 'available') && (
            <section id="upcoming-sessions-section" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[var(--primary-accent)]" />
                  <h3 className="font-poppins font-semibold text-[18px] sm:text-[20px] text-[#172B3A] dark:text-[#F1F5F9]">
                    {currentRole === 'guest' || currentRole === 'student' ? 'Available Sessions' : 'Scheduled Sessions'}
                  </h3>
                  {onNavigateToSessionsList && (
                    <button
                      type="button"
                      onClick={onNavigateToSessionsList}
                      className="text-xs font-inter text-[var(--primary-accent)] hover:underline ml-2 hidden sm:inline cursor-pointer"
                    >
                      View all ({sessions.length}) →
                    </button>
                  )}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-[#64748B] dark:text-[#A8B5C7] absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="Search sessions..."
                    className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs text-[#172B3A] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0F766E] dark:focus:border-[#2DD4BF] transition-colors"
                  />
                </div>
              </div>

              {filteredSessions.length === 0 ? (
                <div className="glass-panel p-12 text-center space-y-3 rounded-2xl">
                  <Inbox className="w-10 h-10 text-[var(--text-sec-60)] mx-auto" />
                  <p className="font-inter text-sm text-[#172B3A] dark:text-[#F1F5F9] font-medium">No sessions found</p>
                  <p className="font-inter text-xs text-[var(--text-sec-70)]">
                    {filterQuery.trim()
                      ? `No sessions match "${filterQuery}".`
                      : 'No sessions are currently scheduled.'}
                  </p>
                </div>
              ) : (
                <div
                  id="sessions-cards-grid"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6"
                >
                  {filteredSessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onClick={(s) => {
                        if (onNavigateToSession) {
                          onNavigateToSession(s.id);
                        } else {
                          setSelectedSession(s);
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {selectedSession && (
            <SessionDetailModal
              session={selectedSession}
              currentRole={currentRole}
              onClose={() => setSelectedSession(null)}
              onAction={(msg) => {
                onNotify(msg);
                setSelectedSession(null);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};
