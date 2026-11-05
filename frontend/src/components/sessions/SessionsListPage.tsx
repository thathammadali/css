import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Calendar,
  MapPin,
  Users,
  Search,
  Filter,
  Layers,
  ArrowUpRight,
  User,
  Video,
  ExternalLink,
} from 'lucide-react';
import { SessionItem, DashboardRole, SessionStatus } from '../../types';

interface SessionsListPageProps {
  sessions: SessionItem[];
  currentRole: DashboardRole;
  onBackToHome: () => void;
  onSelectSession: (session: SessionItem) => void;
  onNavigateToCreate: () => void;
  onSwitchToEventsView?: () => void;
  isLoading?: boolean;
}

import { EmptyState } from '../EmptyState';
import { SkeletonState } from '../SkeletonState';
import MeetingLinks from '../MeetingLinks';

export const SessionsListPage: React.FC<SessionsListPageProps> = ({
  sessions,
  currentRole,
  onBackToHome,
  onSelectSession,
  onNavigateToCreate,
  onSwitchToEventsView,
  isLoading = false,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | SessionStatus>('all');

  const canCreateSession = currentRole === 'super_admin' || currentRole === 'admin';

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      s.location.toLowerCase().includes(filterQuery.toLowerCase()) ||
      s.society.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (s.wing && s.wing.toLowerCase().includes(filterQuery.toLowerCase()));

    const matchesStatus = selectedStatus === 'all' || s.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const getBadgeStyle = (status: SessionStatus) => {
    switch (status) {
      case 'open':
        return {
          label: 'Open',
          classes: 'bg-[var(--accent-15)] text-[var(--primary-accent)] border border-[var(--accent-30)]',
          dot: 'bg-[var(--primary-accent)]',
        };
      case 'closing_soon':
        return {
          label: 'Closing soon',
          classes: 'bg-[var(--accent-15)] text-[var(--primary-accent)] border border-[var(--accent-30)]',
          dot: 'bg-[var(--primary-accent)] animate-pulse',
        };
      case 'closed':
        return {
          label: 'Closed',
          classes: 'bg-[var(--accent-15)] text-[var(--primary-accent)] border border-[var(--accent-30)] opacity-75',
          dot: 'bg-[var(--primary-accent)] opacity-60',
        };
    }
  };

  return (
    <div id="sessions-list-page" className="relative w-full space-y-6 animate-fadeIn">
      {/* ========================================================
          TOP SUBHEADER: Back Arrow + "Sessions" Title + Desktop "+ New session"
         ======================================================== */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-white/[0.10]">
        <div className="flex items-center gap-3">
          <button
            id="btn-back-to-home"
            type="button"
            onClick={onBackToHome}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)]"
            aria-label="Back to home dashboard"
            title="Back to home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h2 className="font-poppins font-medium text-[22px] sm:text-[24px] text-white leading-tight">
              Sessions
            </h2>
            <span className="text-xs font-inter text-[var(--text-sec-70)]">
              Browse society sessions, workshops, and symposiums
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSwitchToEventsView && (
            <button
              type="button"
              onClick={onSwitchToEventsView}
              className="px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-white text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
              <span>Events Catalog</span>
            </button>
          )}

          {/* Desktop "+ New session" button (Super Admin or Admin only) */}
          {canCreateSession && (
            <button
              id="btn-desktop-new-session"
              type="button"
              onClick={onNavigateToCreate}
              className="hidden sm:inline-flex items-center gap-2 px-4 h-[42px] rounded-[16px] bg-[var(--primary-accent)] hover:brightness-110 active:scale-[0.99] text-white font-inter font-medium text-[13px] transition-all cursor-pointer shadow-lg select-none"
            >
              <Plus className="w-4 h-4" />
              <span>New session</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.05] border border-white/[0.12] backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-filter-sessions"
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search by title, location, society, or wing..."
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-xs sm:text-[13px] text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[var(--primary-accent)]"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'open', 'closing_soon', 'closed'] as const).map((statusKey) => (
            <button
              key={statusKey}
              type="button"
              onClick={() => setSelectedStatus(statusKey)}
              className={`px-3 py-1 rounded-lg text-xs font-inter capitalize transition-colors cursor-pointer shrink-0 ${
                selectedStatus === statusKey
                  ? 'bg-[var(--primary-accent)] text-white font-medium shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {statusKey === 'closing_soon' ? 'Closing soon' : statusKey}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================
          SESSIONS CARDS GRID
          Single column on mobile, 2-3 column grid on desktop
         ======================================================== */}
      {isLoading ? (
        <SkeletonState variant="cards" count={6} />
      ) : filteredSessions.length > 0 ? (
        <div
          id="sessions-grid-container"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5"
        >
          {filteredSessions.map((session) => {
            const badge = getBadgeStyle(session.status);
            return (
              <div
                key={session.id}
                id={`session-item-${session.id}`}
                onClick={() => onSelectSession(session)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectSession(session);
                  }
                }}
                className="glass-panel-interactive group flex flex-col justify-between p-5 rounded-2xl cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)]"
              >
                <div>
                  {/* Top row: Wing / Society + Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-inter uppercase tracking-wider text-[var(--primary-accent)] font-medium bg-[var(--accent-15)] border border-[var(--accent-30)] px-2 py-0.5 rounded-lg truncate max-w-[65%]">
                      {session.wing || session.society}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-inter font-medium leading-normal shrink-0 ${badge.classes}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  {/* Parent Event Tag */}
                  {session.parentEventTitle && (
                    <div className="flex items-center gap-1.5 text-[11px] font-inter text-[var(--text-sec-70)] mb-1 truncate">
                      <Layers className="w-3 h-3 text-[var(--primary-accent)] shrink-0" />
                      <span className="truncate">Event: {session.parentEventTitle}</span>
                    </div>
                  )}

                  {/* Title */}
                  <h3 className="font-poppins font-medium text-[16px] sm:text-[17px] text-white leading-snug group-hover:text-white transition-colors mb-2 line-clamp-2">
                    {session.title}
                  </h3>

                  {/* Optional Speaker */}
                  {session.speaker && (
                    <div className="flex items-center gap-1.5 text-xs text-white/90 mb-1.5">
                      <User className="w-3.5 h-3.5 text-[var(--primary-accent)] shrink-0" />
                      <span className="font-medium truncate">{session.speaker}</span>
                    </div>
                  )}

                  {/* Date & Time */}
                  <div className="flex items-center gap-2 text-[13px] font-inter text-[var(--text-secondary)] mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[var(--primary-accent)] shrink-0" />
                    <span className="truncate">
                      {session.date} · {session.time}
                    </span>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-2 text-[13px] font-inter text-[var(--text-secondary)]">
                    <MapPin className="w-3.5 h-3.5 text-[var(--primary-accent)] shrink-0" />
                    <span className="truncate">{session.location}</span>
                  </div>
                </div>

                {/* Card Footer: Capacity & Click-to-open */}
                <div className="mt-4 pt-3 border-t border-white/[0.10] flex items-center justify-between gap-2 text-[12px] font-inter">
                  <div className="flex items-center gap-1.5 text-[var(--text-sec-80)] truncate min-w-0">
                    <Users className="w-3.5 h-3.5 text-[var(--primary-accent)] shrink-0" />
                    <span className="truncate">
                      {session.registered_count !== undefined
                        ? `${session.registered_count} registered${session.totalSeats ? ` · ${session.totalSeats} seats` : ''}`
                        : session.capacity || 'Open attendance'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <MeetingLinks session={session} compact />

                    <span className="inline-flex items-center gap-1 text-[var(--primary-accent)] font-medium group-hover:translate-x-0.5 transition-transform">
                      <span>Details</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Calendar}
          title="No sessions found"
          description={
            filterQuery || selectedStatus !== 'all'
              ? 'No sessions match your search keywords or filter criteria.'
              : 'There are no sessions scheduled at this time.'
          }
          actionLabel={canCreateSession ? '+ New Session' : (filterQuery || selectedStatus !== 'all' ? 'Clear Filters' : undefined)}
          onAction={
            canCreateSession
              ? onNavigateToCreate
              : () => {
                  setFilterQuery('');
                  setSelectedStatus('all');
                }
          }
          secondaryActionLabel={canCreateSession && (filterQuery || selectedStatus !== 'all') ? 'Clear Filters' : undefined}
          onSecondaryAction={() => {
            setFilterQuery('');
            setSelectedStatus('all');
          }}
        />
      )}

      {/* ========================================================
          MOBILE FLOATING "+ New session" BUTTON (Head or Admin only)
          Bottom-right on mobile, solid primary, rounded
         ======================================================== */}
      {canCreateSession && (
        <button
          id="btn-mobile-floating-new-session"
          type="button"
          onClick={onNavigateToCreate}
          className="sm:hidden fixed bottom-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-[var(--primary-accent)] hover:brightness-110 active:scale-95 text-white font-inter font-medium text-[13px] shadow-[0_8px_20px_var(--accent-40)] cursor-pointer select-none"
          aria-label="Create new session"
        >
          <Plus className="w-5 h-5" />
          <span>New session</span>
        </button>
      )}
    </div>
  );
};
