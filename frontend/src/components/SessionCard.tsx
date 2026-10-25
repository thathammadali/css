import React from 'react';
import { Calendar, MapPin, Users, ArrowUpRight, User, Video, ExternalLink } from 'lucide-react';
import { SessionItem, SessionStatus } from '../types';
import { getSessionCapacity } from '../utils/capacityHelper';
import MeetingLinks from './MeetingLinks';

interface SessionCardProps {
  session: SessionItem;
  onClick: (session: SessionItem) => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({ session, onClick }) => {
  const capacityInfo = getSessionCapacity(session);

  const getBadgeStyle = (status: SessionStatus) => {
    if (session.deliveryStatus === 'LIVE') {
      return {
        label: 'LIVE NOW',
        classes: 'bg-rose-500/25 text-rose-300 border border-rose-500/40 animate-pulse font-bold',
        dot: 'bg-rose-500 animate-ping',
      };
    }
    if (session.deliveryStatus === 'COMPLETED') {
      return {
        label: 'Completed',
        classes: 'bg-white/10 text-white/70 border border-white/20 opacity-75',
        dot: 'bg-emerald-400',
      };
    }
    if (capacityInfo.isCapacityFull) {
      return {
        label: 'Full (Waitlist)',
        classes: 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold',
        dot: 'bg-amber-400',
      };
    }
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
      default:
        return {
          label: 'Closed',
          classes: 'bg-[var(--accent-15)] text-[var(--primary-accent)] border border-[var(--accent-30)] opacity-75',
          dot: 'bg-[var(--primary-accent)] opacity-60',
        };
    }
  };

  const badge = getBadgeStyle(session.status);

  return (
    <div
      id={`session-card-${session.id}`}
      onClick={() => onClick(session)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(session);
        }
      }}
      className="glass-panel-interactive group relative flex flex-col justify-between p-5 rounded-2xl cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)]"
    >
      {/* Top row: Category tag & Status Badge */}
      <div>
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

        {/* Title */}
        <h3 className="font-poppins font-medium text-[16px] sm:text-[17px] text-[var(--text-primary)] leading-snug group-hover:text-[var(--primary-accent)] transition-colors mb-2 line-clamp-2">
          {session.title}
        </h3>

        {/* Optional Speaker */}
        {session.speaker && (
          <div className="flex items-center gap-2 text-[12px] font-inter text-[var(--text-secondary)] mb-1.5">
            <User className="w-3.5 h-3.5 text-[var(--primary-accent)] shrink-0" />
            <span className="truncate font-medium text-[var(--text-primary)]">
              {session.speaker}
            </span>
          </div>
        )}

        {/* Date & Time line */}
        <div className="flex items-center gap-2 text-[13px] font-inter text-[var(--text-secondary)] mb-1.5">
          <Calendar className="w-3.5 h-3.5 text-[var(--primary-accent)] shrink-0" />
          <span className="truncate">{session.date} · {session.time}</span>
        </div>

        {/* Location line */}
        <div className="flex items-center gap-2 text-[13px] font-inter text-[var(--text-secondary)]">
          <MapPin className="w-3.5 h-3.5 text-[var(--primary-accent)] shrink-0" />
          <span className="truncate">{session.location}</span>
        </div>
      </div>

      {/* Footer information & action hint */}
      <div className="mt-4 pt-3 border-t border-[var(--panel-border)] flex items-center justify-between gap-2 text-[12px] font-inter">
        <div className="flex items-center gap-1.5 text-[var(--text-secondary)] truncate min-w-0">
          <Users className={`w-3.5 h-3.5 shrink-0 ${capacityInfo.isCapacityFull ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--primary-accent)]'}`} />
          <span className={`truncate ${capacityInfo.isCapacityFull ? 'text-amber-700 dark:text-amber-300 font-medium' : ''}`}>
            {session.registered_count !== undefined
              ? `${session.registered_count} registered${session.totalSeats ? ` · ${session.totalSeats} seats` : ''}`
              : capacityInfo.isCapacityFull
              ? `Full (${capacityInfo.capacityLabel})`
              : capacityInfo.capacityLabel}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <MeetingLinks session={session} compact />

          <span className="inline-flex items-center gap-1 text-[var(--primary-accent)] font-medium group-hover:translate-x-0.5 transition-transform">
            <span>View</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
};
