/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Calendar,
  Search,
  Filter,
  ArrowRight,
  Building,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { EventItem, DashboardRole, EventStatus } from '../../types';

interface EventsListPageProps {
  events: EventItem[];
  currentRole: DashboardRole;
  onBackToHome: () => void;
  onSelectEvent: (event: EventItem) => void;
  onNavigateToCreateEvent: () => void;
  onSwitchToSessionsView?: () => void;
  isLoading?: boolean;
}

import { EmptyState } from '../EmptyState';
import { SkeletonState } from '../SkeletonState';

export const EventsListPage: React.FC<EventsListPageProps> = ({
  events,
  currentRole,
  onBackToHome,
  onSelectEvent,
  onNavigateToCreateEvent,
  onSwitchToSessionsView,
  isLoading = false,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | EventStatus>('all');

  const canCreateEvent = currentRole === 'super_admin' || currentRole === 'admin';
  const isSuperAdmin = currentRole === 'super_admin';

  // Filter events according to search and status
  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      e.organizer.toLowerCase().includes(filterQuery.toLowerCase()) ||
      e.category.toLowerCase().includes(filterQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(filterQuery.toLowerCase());

    const matchesStatus = selectedStatus === 'all' || e.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: EventStatus) => {
    switch (status) {
      case 'PUBLISHED':
        return {
          label: 'Published',
          classes: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
          dot: 'bg-emerald-400',
        };
      case 'UPCOMING':
        return {
          label: 'Upcoming',
          classes: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
          dot: 'bg-blue-400',
        };
      case 'PENDING_APPROVAL':
        return {
          label: 'Pending Approval',
          classes: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
          dot: 'bg-amber-400 animate-pulse',
        };
      case 'DRAFT':
        return {
          label: 'Draft',
          classes: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
          dot: 'bg-slate-400',
        };
      case 'LIVE':
        return {
          label: 'Live Now',
          classes: 'bg-red-500/20 text-red-300 border border-red-500/30',
          dot: 'bg-red-400 animate-pulse',
        };
      case 'COMPLETED':
        return {
          label: 'Concluded',
          classes: 'bg-white/10 text-white/60 border border-white/20',
          dot: 'bg-white/40',
        };
      default:
        return {
          label: status,
          classes: 'bg-white/10 text-white/70 border border-white/20',
          dot: 'bg-white/40',
        };
    }
  };

  const pendingCount = events.filter((e) => e.status === 'PENDING_APPROVAL').length;

  return (
    <div id="events-list-page" className="w-full space-y-6 animate-fadeIn pb-12">
      {/* Top Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.10]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToHome}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-poppins font-medium text-[22px] sm:text-[24px] text-white leading-tight">
                Campus Events
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.08] text-white/70 border border-white/10">
                {filteredEvents.length} Total
              </span>
            </div>
            <p className="text-xs font-inter text-[var(--text-sec-70)]">
              Parent event catalog · Each event hosts scheduled hands-on sessions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {onSwitchToSessionsView && (
            <button
              type="button"
              onClick={onSwitchToSessionsView}
              className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Flat Sessions View</span>
            </button>
          )}

          {canCreateEvent && (
            <button
              type="button"
              onClick={onNavigateToCreateEvent}
              className="px-4 py-2 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 text-white text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 shadow-lg shadow-[var(--primary-accent)]/20"
            >
              <Plus className="w-4 h-4" />
              <span>{isSuperAdmin ? 'Create Event' : 'Propose Event'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Super Admin Pending Approval Alert */}
      {isSuperAdmin && pendingCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-amber-200">
                {pendingCount} Event{pendingCount > 1 ? 's' : ''} Awaiting Super Admin Publication Approval
              </p>
              <p className="text-[11px] sm:text-xs text-amber-300/70">
                Events proposed by society administrators remain unpublished until reviewed and approved by Super Admin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedStatus('PENDING_APPROVAL')}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-medium cursor-pointer shrink-0 border border-amber-500/30"
          >
            Review Pending
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.05] border border-white/[0.12] backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search events by title, society, or category..."
            className="w-full h-9 pl-9 pr-8 rounded-xl bg-white/[0.06] border border-white/[0.12] text-xs sm:text-[13px] text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[var(--primary-accent)]"
          />
          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer text-xs"
              title="Clear Search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(canCreateEvent
            ? (['all', 'PUBLISHED', 'UPCOMING', 'PENDING_APPROVAL', 'DRAFT'] as const)
            : (['all', 'PUBLISHED', 'UPCOMING'] as const)
          ).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1 rounded-lg text-xs font-inter transition-colors cursor-pointer shrink-0 ${
                selectedStatus === st
                  ? 'bg-[var(--primary-accent)] text-white font-medium shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {st === 'all'
                ? 'All'
                : st === 'PENDING_APPROVAL'
                ? 'Pending Review'
                : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <SkeletonState variant="cards" count={6} />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No events found"
          description={
            filterQuery || selectedStatus !== 'all'
              ? 'No campus events match your search keywords or filter criteria.'
              : 'There are no campus events published at this time.'
          }
          actionLabel={canCreateEvent ? '+ New Event' : (filterQuery || selectedStatus !== 'all' ? 'Reset Filters' : undefined)}
          onAction={
            canCreateEvent
              ? onNavigateToCreateEvent
              : () => {
                  setFilterQuery('');
                  setSelectedStatus('all');
                }
          }
          secondaryActionLabel={canCreateEvent && (filterQuery || selectedStatus !== 'all') ? 'Reset Filters' : undefined}
          onSecondaryAction={() => {
            setFilterQuery('');
            setSelectedStatus('all');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredEvents.map((evt) => {
            const badge = getStatusBadge(evt.status);
            const sessionCount = evt.sessions?.length || 0;

            return (
              <div
                key={evt.id}
                onClick={() => onSelectEvent(evt)}
                className="glass-panel-interactive rounded-2xl overflow-hidden flex flex-col group cursor-pointer border border-white/[0.10] hover:border-[var(--primary-accent)] transition-all"
              >
                {/* Banner Header if available */}
                {evt.bannerUrl && (
                  <div className="relative h-40 w-full overflow-hidden bg-black/40">
                    <img
                      src={evt.bannerUrl}
                      alt={evt.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e1726] via-transparent to-black/30" />
                    <div className="absolute top-3 right-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium backdrop-blur-md ${badge.classes}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-4">
                      <span className="text-[11px] font-medium text-white/80 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-md">
                        {evt.category}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    {!evt.bannerUrl && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-[var(--primary-accent)] uppercase tracking-wider">
                          {evt.category}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${badge.classes}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </div>
                    )}

                    <h3 className="font-poppins font-medium text-lg text-white group-hover:text-[var(--primary-accent)] transition-colors line-clamp-2">
                      {evt.title}
                    </h3>

                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                      {evt.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-[var(--text-sec-80)]">
                    <div className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
                      <span className="truncate max-w-[150px]">{evt.organizer}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-white/90 font-medium">
                        {sessionCount} {sessionCount === 1 ? 'Session' : 'Sessions'}
                      </span>
                      <span className="font-medium text-white">
                        {evt.isPaid ? `Rs. ${evt.feeAmount}` : 'Free'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-xs text-[var(--text-sec-70)]">
                    <span>
                      Deadline:{' '}
                      {new Date(evt.registrationDeadline).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[var(--primary-accent)] font-medium group-hover:translate-x-1 transition-transform">
                      View Sessions <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
