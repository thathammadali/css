/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Building,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowRight,
  Edit3,
  User,
  Users,
  Video,
  ExternalLink,
} from 'lucide-react';
import { EventItem, SessionItem, DashboardRole, EventStatus } from '../../types';
import MeetingLinks from '../MeetingLinks';

interface EventDetailPageProps {
  event: EventItem;
  currentRole: DashboardRole;
  currentUserEmail?: string;
  onBack: () => void;
  onSelectSession: (session: SessionItem) => void;
  onAddSessionToEvent: (event: EventItem) => void;
  onEditEvent?: (event: EventItem) => void;
  onApproveEvent: (eventId: string) => void;
  onRejectEvent: (eventId: string, reason: string) => void;
  onNotify: (msg: string) => void;
}

export const EventDetailPage: React.FC<EventDetailPageProps> = ({
  event,
  currentRole,
  currentUserEmail,
  onBack,
  onSelectSession,
  onAddSessionToEvent,
  onEditEvent,
  onApproveEvent,
  onRejectEvent,
  onNotify,
}) => {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Escape key handler for reject modal
  useEffect(() => {
    if (!showRejectModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        setShowRejectModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showRejectModal]);

  const isSuperAdmin = currentRole === 'super_admin';
  const isAdmin = currentRole === 'admin';
  const canManage = isSuperAdmin || isAdmin;

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
      default:
        return {
          label: status,
          classes: 'bg-white/10 text-white/70 border border-white/20',
          dot: 'bg-white/40',
        };
    }
  };

  const badge = getStatusBadge(event.status);

  const handleApprove = () => {
    onApproveEvent(event.id);
    onNotify(`Event "${event.title}" is now officially published!`);
  };

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      onNotify('Please provide a reason for returning this event to draft.');
      return;
    }
    onRejectEvent(event.id, rejectReason.trim());
    setShowRejectModal(false);
    onNotify(`Event "${event.title}" returned to draft.`);
  };

  return (
    <div id="event-detail-page" className="w-full space-y-6 animate-fadeIn pb-16">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.10]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Back to events catalog"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-sec-70)]">Event</span>
              <span className="text-xs text-white/40">/</span>
              <span className="text-xs text-[var(--primary-accent)] font-medium truncate max-w-[200px] sm:max-w-md">
                {event.title}
              </span>
            </div>
            <h2 className="font-poppins font-medium text-[22px] sm:text-[24px] text-white leading-tight">
              {event.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canManage && onEditEvent && (
            <button
              type="button"
              onClick={() => onEditEvent(event)}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Event</span>
            </button>
          )}

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${badge.classes}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
        </div>
      </div>

      {/* Super Admin Approval Gate Banner */}
      {event.status === 'PENDING_APPROVAL' && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-amber-200">
                Super Admin Publication Approval Required
              </h4>
              <p className="text-xs text-amber-300/80 leading-relaxed">
                This event was created by <span className="font-semibold text-white">{event.createdBy}</span>.
                It is hidden from students and public guests until approved by a Super Administrator.
              </p>
            </div>
          </div>

          {isSuperAdmin ? (
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleApprove}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-md transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Publish to Campus</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-white hover:text-red-200 text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4 text-red-400" />
                <span>Return to Draft with Feedback</span>
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-amber-300/70 italic">
              Awaiting institutional Super Admin review. Admins cannot self-approve publication.
            </p>
          )}
        </div>
      )}

      {/* Rejection / Draft reason notice */}
      {event.status === 'DRAFT' && event.rejectionReason && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-200 space-y-1">
          <span className="font-semibold flex items-center gap-1.5 text-red-300">
            <AlertCircle className="w-4 h-4" />
            Super Admin Feedback / Changes Requested:
          </span>
          <p className="pl-5 text-white/90">{event.rejectionReason}</p>
        </div>
      )}

      {/* Main Event Overview Card */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/[0.10]">
        {event.bannerUrl && (
          <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-black/40">
            <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e1726] via-transparent to-black/30" />
          </div>
        )}

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-white/[0.08] text-xs">
            <div>
              <span className="text-[var(--text-sec-70)] block mb-1">Society Organizer</span>
              <span className="font-medium text-white flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
                {event.organizer}
              </span>
            </div>

            <div>
              <span className="text-[var(--text-sec-70)] block mb-1">Event Category</span>
              <span className="font-medium text-white">{event.category}</span>
            </div>

            <div>
              <span className="text-[var(--text-sec-70)] block mb-1">Registration Fee</span>
              <span className="font-medium text-white">
                {event.isPaid ? `Rs. ${event.feeAmount}` : 'Free of Charge'}
              </span>
            </div>

            <div>
              <span className="text-[var(--text-sec-70)] block mb-1">Registration Deadline</span>
              <span className="font-medium text-white">
                {new Date(event.registrationDeadline).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            {event.paymentDeadline && (
              <div>
                <span className="text-[var(--text-sec-70)] block mb-1">Payment Slip Deadline</span>
                <span className="font-medium text-amber-300">
                  {new Date(event.paymentDeadline).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-poppins font-medium text-base text-white">About this Event</h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>
        </div>
      </div>

      {/* Sessions Hierarchy Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <h3 className="font-poppins font-medium text-lg text-white">
              Scheduled Sessions ({event.sessions?.length || 0})
            </h3>
            <span className="text-xs text-[var(--text-sec-70)]">
              Hands-on labs, workshops, and tracks under {event.title}
            </span>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={() => onAddSessionToEvent(event)}
              className="px-3.5 py-1.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 text-white text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Session to this Event</span>
            </button>
          )}
        </div>

        {(!event.sessions || event.sessions.length === 0) ? (
          <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-2">
            <Calendar className="w-8 h-8 text-white/30 mx-auto" />
            <p className="text-xs sm:text-sm text-white font-medium">
              No sessions scheduled for this event yet.
            </p>
            {canManage && (
              <button
                type="button"
                onClick={() => onAddSessionToEvent(event)}
                className="mt-2 text-xs text-[var(--primary-accent)] hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add the first session
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {event.sessions.map((sess, idx) => (
              <div
                key={sess.id}
                onClick={() => onSelectSession(sess)}
                className="glass-panel-interactive p-5 rounded-2xl border border-white/[0.10] hover:border-[var(--primary-accent)] transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-medium text-[var(--primary-accent)]">
                      Session {idx + 1}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/80 capitalize">
                      {sess.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h4 className="font-poppins font-medium text-base text-white group-hover:text-[var(--primary-accent)] transition-colors">
                    {sess.title}
                  </h4>

                  {/* Optional Speaker */}
                  {sess.speaker && (
                    <div className="flex items-center gap-1.5 text-xs text-white/90">
                      <User className="w-3.5 h-3.5 text-[var(--primary-accent)] shrink-0" />
                      <span className="font-medium truncate">{sess.speaker}</span>
                    </div>
                  )}

                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                    {sess.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/[0.06] space-y-2 text-xs text-[var(--text-sec-80)]">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-white/50" />
                      {sess.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-white/50" />
                      {sess.time}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 truncate max-w-[180px]">
                      <MapPin className="w-3.5 h-3.5 text-white/50" />
                      {sess.location}
                    </span>

                    {sess.registered_count !== undefined && (
                      <span className="flex items-center gap-1 text-white/80 shrink-0">
                        <Users className="w-3 h-3 text-[var(--primary-accent)]" />
                        <span>{sess.registered_count} registered</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                    <MeetingLinks session={sess} />

                    <span className="ml-auto text-[var(--primary-accent)] font-medium inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Session Details <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRejectModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
        >
          <div className="w-full max-w-md p-6 rounded-2xl glass-panel border border-white/20 space-y-4">
            <h3 className="font-poppins font-semibold text-lg text-white">
              Return Event to Draft
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Specify the reasons or required adjustments for the society administrator before this event can be approved.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Please clarify venue capacity, attach laboratory curriculum, and fix the registration fee."
              rows={4}
              className="w-full p-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[var(--primary-accent)]"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white cursor-pointer shadow"
              >
                Return to Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
