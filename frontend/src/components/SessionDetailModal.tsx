import React from 'react';
import { X, Calendar, Clock, MapPin, Users, Building, ShieldCheck } from 'lucide-react';
import { SessionItem, DashboardRole } from '../types';
import { useModalDismiss } from '../hooks/useModalDismiss';

interface SessionDetailModalProps {
  session: SessionItem | null;
  currentRole: DashboardRole;
  onClose: () => void;
  onAction: (message: string) => void;
}

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  session,
  currentRole,
  onClose,
  onAction,
}) => {
  const { handleBackdropClick } = useModalDismiss({
    isOpen: !!session,
    onClose,
  });

  if (!session) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-session-title"
      onClick={handleBackdropClick}
    >
      <div
        className="glass-card w-full max-w-lg rounded-2xl p-6 border border-[var(--panel-border)] text-[var(--text-primary)] shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-10)] transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Category & Society */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-inter uppercase tracking-wider text-[var(--primary-accent)] font-medium bg-[var(--accent-15)] border border-[var(--accent-30)] px-2 py-0.5 rounded-lg">
            {session.society}
          </span>
          <span className="text-xs text-[var(--text-secondary)]">·</span>
          <span className="text-xs text-[var(--text-secondary)]">{session.category || 'Workshop'}</span>
        </div>

        {/* Title */}
        <h2
          id="modal-session-title"
          className="font-poppins font-medium text-[20px] text-[var(--text-primary)] leading-snug mb-4 pr-8"
        >
          {session.title}
        </h2>

        {/* Meta Grid */}
        <div className="space-y-2.5 p-4 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] mb-4 text-[13px] font-inter shadow-xs">
          <div className="flex items-center gap-2.5 text-[var(--text-secondary)]">
            <Calendar className="w-4 h-4 text-[var(--primary-accent)] shrink-0" />
            <span className="text-[var(--text-primary)] font-medium">{session.date}</span>
          </div>
          <div className="flex items-center gap-2.5 text-[var(--text-secondary)]">
            <Clock className="w-4 h-4 text-[var(--primary-accent)] shrink-0" />
            <span>{session.time}</span>
          </div>
          <div className="flex items-center gap-2.5 text-[var(--text-secondary)]">
            <MapPin className="w-4 h-4 text-[var(--primary-accent)] shrink-0" />
            <span>{session.location}</span>
          </div>
          <div className="flex items-center gap-2.5 text-[var(--text-secondary)]">
            <Users className="w-4 h-4 text-[var(--primary-accent)] shrink-0" />
            <span>{session.capacity}</span>
          </div>
        </div>

        {/* Description */}
        <p className="font-inter text-[14px] text-[var(--text-secondary)] leading-relaxed mb-6">
          {session.description ||
            'Detailed overview of the curriculum, agenda, prerequisites, and required materials for attendees.'}
        </p>

        {/* Call to action based on role */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          {currentRole === 'guest' || currentRole === 'student' ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onAction(`Seat status updated for "${session.title}".`);
              }}
              className="flex-1 h-[44px] rounded-xl bg-[var(--primary-accent)] text-white font-inter font-medium text-[14px] flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Manage / Register for session</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onAction(`Roster and venue checklist for "${session.title}" opened.`);
              }}
              className="flex-1 h-[44px] rounded-xl bg-[var(--primary-accent)] text-white font-inter font-medium text-[14px] flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
            >
              <Building className="w-4 h-4" />
              <span>Manage session roster</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="h-[44px] px-4 rounded-xl bg-[var(--panel-bg)] hover:bg-[var(--accent-10)] border border-[var(--panel-border)] text-[var(--text-primary)] font-inter text-[14px] transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
