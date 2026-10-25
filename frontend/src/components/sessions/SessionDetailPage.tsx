import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  ClipboardList,
  ShieldCheck,
  Edit3,
  Lock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Layers,
  Award,
  Check,
  CheckSquare,
  Video,
  Tag,
  ExternalLink,
  KeyRound,
  Radio,
  Download,
} from 'lucide-react';
import {
  SessionItem,
  DashboardRole,
  SessionStatus,
  SessionResource,
  SessionComment,
  SessionTask,
  RegistrantItem,
  RoomAccessValidationResponse,
} from '../../types';
import { SessionResourcesSection } from './SessionResourcesSection';
import { SessionCommentsSection } from './SessionCommentsSection';
import { SessionTasksSection } from './SessionTasksSection';
import { RoomCodeInputDialog } from './RoomCodeInputDialog';
import { SessionRoomView } from './SessionRoomView';
import { SessionRoomAdminPanel } from './SessionRoomAdminPanel';
import { roomAccessService } from '../../services/roomAccessService';
import { eventService } from '../../services/eventService';
import { INITIAL_REGISTRANTS } from '../../data/mockRegistrations';
import { INITIAL_ATTENDANCE_RECORDS } from '../../data/mockAttendance';
import { eligibilityService } from '../../services/eligibilityService';
import { getSessionCapacity } from '../../utils/capacityHelper';
import MeetingLinks from '../MeetingLinks';

interface SessionDetailPageProps {
  session: SessionItem;
  currentRole: DashboardRole;
  isRegistered?: boolean;
  currentUserEmail?: string;
  currentUserName?: string;
  registrant?: RegistrantItem;
  onBack: () => void;
  onNavigateToAuth: () => void;
  onOpenRegistration?: (session: SessionItem) => void;
  parentEventTitle?: string;
  parentEventId?: string;
  onNavigateToParentEvent?: (eventId: string) => void;
  onEditSession?: (session: SessionItem) => void;
  onUpdateSession?: (updatedSession: SessionItem) => void;
  onNotify: (msg: string) => void;
}

export const SessionDetailPage: React.FC<SessionDetailPageProps> = ({
  session,
  currentRole,
  isRegistered = false,
  currentUserEmail,
  currentUserName,
  registrant,
  onBack,
  onNavigateToAuth,
  onOpenRegistration,
  parentEventTitle,
  parentEventId,
  onNavigateToParentEvent,
  onEditSession,
  onUpdateSession,
  onNotify,
}) => {
  const [registered, setRegistered] = useState(isRegistered);

  // Synchronize registered status when prop changes or user navigates between sessions
  useEffect(() => {
    setRegistered(isRegistered);
  }, [isRegistered, session.id]);

  const [activeTab, setActiveTab] = useState<
    'details' | 'resources' | 'tasks' | 'discussion' | 'attendance' | 'room-governance'
  >('details');

  // Room access states (authoritative in-memory, never LocalStorage)
  const [isRoomCodeModalOpen, setIsRoomCodeModalOpen] = useState(false);
  const [activeRoomData, setActiveRoomData] = useState<{
    sessionToken: string;
    room: NonNullable<RoomAccessValidationResponse['room']>;
  } | null>(null);

  // Derive registrant if not passed explicitly
  const effectiveRegistrant =
    registrant ||
    INITIAL_REGISTRANTS.find(
      (r) =>
        r.sessionId === session.id &&
        (r.email === currentUserEmail ||
          r.primaryEmail === currentUserEmail ||
          (currentUserEmail?.includes('jordan') && r.name.toLowerCase().includes('jordan')))
    );

  const room = roomAccessService.getOrCreateRoomForSession(session);
  const capacityInfo = getSessionCapacity(session);
  const isSessionClosed = session.status === 'closed';
  const isPaidSession = !!session.isPaid;
  const isWaitlisted =
    registered &&
    (effectiveRegistrant?.lifecycleStatus === 'WAITLISTED' || effectiveRegistrant?.isWaitlisted);
  const isPaymentPending = !isWaitlisted && isPaidSession && effectiveRegistrant?.status === 'pending';
  const isPaymentRejected = !isWaitlisted && isPaidSession && effectiveRegistrant?.status === 'rejected';
  const isRegistrationPending =
    !isWaitlisted &&
    registered &&
    (effectiveRegistrant?.lifecycleStatus === 'FORM_IN_PROGRESS' ||
      effectiveRegistrant?.lifecycleStatus === 'SUBMITTED');
  const isRoomLocked = room.status === 'revoked' || room.status === 'locked';

  const sessionRegistrants = INITIAL_REGISTRANTS.filter(
    (r) => r.sessionId === session.id
  );

  const getBadgeStyle = (status: SessionStatus) => {
    if (session.deliveryStatus === 'LIVE') {
      return {
        label: 'LIVE NOW in Virtual Room',
        classes: 'bg-rose-500/25 text-rose-300 border border-rose-500/40 shadow-lg shadow-rose-950/40',
        dot: 'bg-rose-500 animate-ping',
      };
    }
    if (session.deliveryStatus === 'COMPLETED' || status === 'closed') {
      return {
        label: 'Session Concluded (Archived)',
        classes: 'bg-white/10 text-white/70 border border-white/20 opacity-80',
        dot: 'bg-emerald-400',
      };
    }
    switch (status) {
      case 'open':
        return {
          label: 'Open for Registration',
          classes: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
          dot: 'bg-emerald-400',
        };
      case 'closing_soon':
        return {
          label: 'Closing Soon',
          classes: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
          dot: 'bg-amber-400 animate-pulse',
        };
      default:
        return {
          label: 'Session Concluded',
          classes: 'bg-white/10 text-white/70 border border-white/20 opacity-75',
          dot: 'bg-white/50',
        };
    }
  };

  const badge = getBadgeStyle(session.status);
  const isGuest = currentRole === 'guest';
  const isSuperAdminOrAdmin = currentRole === 'super_admin' || currentRole === 'admin';

  const defaultResources: SessionResource[] = [
    {
      id: 'res-def-1',
      name: `${session.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_agenda.pdf`,
      size: '1.4 MB',
      type: 'pdf',
      category: 'pdf',
      isPublic: true,
    },
    {
      id: 'res-def-2',
      name: 'lecture_slides_and_notes.pdf',
      size: '3.8 MB',
      type: 'pdf',
      category: 'slides',
      isPublic: false,
    },
  ];

  const [resourcesList, setResourcesList] = useState<SessionResource[]>(
    session.resources && session.resources.length > 0
      ? session.resources
      : defaultResources
  );

  const [tasksList, setTasksList] = useState<SessionTask[]>(
    session.tasks && session.tasks.length > 0
      ? session.tasks
      : [
          {
            id: 'task-def-1',
            sessionId: session.id,
            title: 'Task 01: Setup & Environment Checklist',
            description: 'Download lab files, configure workstation dependencies, and review preliminary slides.',
            dueDate: session.date,
            points: 50,
          },
        ]
  );

  const [commentsList, setCommentsList] = useState<SessionComment[]>(
    session.comments || []
  );

  const handleRegisterClick = () => {
    if (onOpenRegistration) {
      onOpenRegistration(session);
      return;
    }
    setRegistered(true);
    onNotify(`Successfully registered for "${session.title}"!`);
  };

  const handleAddResource = (newRes: SessionResource) => {
    const updated = [newRes, ...resourcesList];
    setResourcesList(updated);
    if (onUpdateSession) {
      onUpdateSession({
        ...session,
        resources: updated,
      });
    }
  };

  const handleAddTask = (newTask: SessionTask) => {
    const updated = [newTask, ...tasksList];
    setTasksList(updated);
    if (onUpdateSession) {
      onUpdateSession({
        ...session,
        tasks: updated,
      });
    }
  };

  const handleAddComment = (newComment: SessionComment) => {
    const updated = [newComment, ...commentsList];
    setCommentsList(updated);
    if (onUpdateSession) {
      onUpdateSession({
        ...session,
        comments: updated,
      });
    }
  };

  const handleEnterAsHost = async () => {
    try {
      const res = await roomAccessService.requestHostAccess(
        session,
        currentRole,
        currentUserEmail || (currentRole === 'super_admin' ? 'dean.taylor@university.edu.pk' : 'admin@university.edu.pk'),
        currentUserName || (currentRole === 'super_admin' ? 'Prof. Dean Taylor' : 'Alex Morgan')
      );
      if (res.success && res.sessionToken && res.room) {
        setActiveRoomData({
          sessionToken: res.sessionToken,
          room: res.room,
        });
        onNotify(`Joined "${res.room.roomName}" with Host Privileges!`);
      } else {
        onNotify(res.error || 'Failed to initialize host access.');
      }
    } catch {
      onNotify('Could not connect to host session.');
    }
  };

  if (activeRoomData) {
    return (
      <SessionRoomView
        session={session}
        room={activeRoomData.room}
        sessionToken={activeRoomData.sessionToken}
        currentRole={currentRole}
        userName={
          currentUserName ||
          (currentRole === 'super_admin'
            ? 'Prof. Dean Taylor'
            : currentRole === 'admin'
            ? 'Alex Morgan'
            : 'Jordan Lee')
        }
        userEmail={currentUserEmail || 'participant@university.edu.pk'}
        registrant={effectiveRegistrant}
        onLeaveRoom={() => {
          roomAccessService.leaveRoom(activeRoomData.sessionToken);
          setActiveRoomData(null);
          // Refresh session to reflect any delivery status updates from the meeting
          const updated = eventService.getSessionById(session.id);
          if (updated && onUpdateSession) {
            onUpdateSession(updated.session);
          }
          onNotify(`Left room "${activeRoomData.room.roomName}".`);
        }}
        onAttendanceChecked={(sessId) => {
          if (effectiveRegistrant) {
            effectiveRegistrant.attendanceCompleted = true;
          }
          const updated = eventService.getSessionById(sessId);
          if (updated && onUpdateSession) {
            onUpdateSession(updated.session);
          }
        }}
        onNotify={onNotify}
      />
    );
  }

  return (
    <div id="session-detail-page" className="w-full space-y-6 animate-fadeIn pb-16">
      {/* Subheader */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-white/[0.10]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            id="btn-back-to-sessions-list"
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)]"
            title="Back to sessions"
            aria-label="Back to sessions list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            {session.eventId && (
              <div className="flex items-center gap-1.5 text-xs font-inter mb-0.5">
                <span className="text-[var(--text-sec-70)]">Event:</span>
                <button
                  type="button"
                  onClick={() => onNavigateToParentEvent?.(session.eventId)}
                  className="text-[var(--primary-accent)] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer truncate max-w-[280px] sm:max-w-md"
                  title="View Parent Event"
                >
                  <Layers className="w-3 h-3 shrink-0" />
                  <span className="truncate">{session.parentEventTitle || parentEventTitle || session.eventId}</span>
                  <span className="text-[10px] text-white/40 shrink-0">({session.eventId})</span>
                  <span className="text-[10px] bg-white/[0.08] hover:bg-white/[0.14] px-1.5 py-0.5 rounded text-white/80 shrink-0 ml-1">
                    ← Parent Event
                  </span>
                </button>
              </div>
            )}
            <h2 className="font-poppins font-semibold text-xl sm:text-2xl text-white truncate">
              {session.title}
            </h2>
            <div className="flex items-center gap-2 text-xs font-inter text-[var(--text-sec-80)]">
              <span>{session.society}</span>
              <span>•</span>
              <span className="text-[var(--primary-accent)]">Session in {session.parentEventTitle || parentEventTitle || 'Event'}</span>
            </div>
          </div>
        </div>

        {/* Admin / Super Admin edit action */}
        {isSuperAdminOrAdmin && onEditSession && (
          <button
            type="button"
            onClick={() => onEditSession(session)}
            className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/20 text-xs font-medium text-white flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Edit Session</span>
          </button>
        )}
      </div>

      {/* Main Hero Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl space-y-6">
        {/* Badges & Meta Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-inter font-medium leading-none ${badge.classes}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              <span>{badge.label}</span>
            </span>

            {session.isPaid ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-inter font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <DollarSign className="w-3 h-3" />
                <span>Ticket: Rs. {session.amount}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-inter font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span>Free Admission</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {session.category && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-inter font-medium bg-[var(--accent-15)] text-[var(--primary-accent)] border border-[var(--accent-30)]">
                <Tag className="w-3 h-3" />
                <span>{session.category}</span>
              </span>
            )}
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded border ${
                capacityInfo.isCapacityFull
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                  : 'bg-white/[0.04] text-[var(--text-sec-70)] border-white/[0.08]'
              }`}
            >
              {capacityInfo.isCapacityFull
                ? `Capacity Full · ${capacityInfo.capacityLabel}`
                : capacityInfo.capacityLabel}
            </span>
          </div>
        </div>

        {/* Date, Time, Location Grid (with timezone and online meeting support) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-20)] border border-[var(--accent-30)] flex items-center justify-center text-[var(--primary-accent)] shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-sec-70)] block">
                Session Date
              </span>
              <span className="text-sm font-medium text-white">{session.date}</span>
              {session.registrationDeadline && (
                <span className="text-[10px] text-amber-300/90 block font-mono">
                  Deadline: {session.registrationDeadline}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-20)] border border-[var(--accent-30)] flex items-center justify-center text-[var(--primary-accent)] shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-sec-70)] block">
                Time Window
              </span>
              <span className="text-sm font-medium text-white">{session.time}</span>
              <span className="text-[10px] text-[var(--text-sec-70)] block font-mono">
                {session.timezone || 'PKT (UTC+5:00)'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-20)] border border-[var(--accent-30)] flex items-center justify-center text-[var(--primary-accent)] shrink-0">
              {session.isOnline ? <Video className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-sec-70)] block">
                {session.isOnline ? 'Online / Hybrid Meeting' : 'Physical Venue'}
              </span>
              <span className="text-sm font-medium text-white">{session.location}</span>
              <MeetingLinks session={session} className="mt-1" />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <h4 className="font-poppins font-medium text-sm text-white">About This Session</h4>
          <p className="text-sm font-inter text-[var(--text-sec-80)] leading-relaxed">
            {session.description ||
              'Hands-on practical workshop. Learn state-of-the-art frameworks, complete interactive challenges, and qualify for a verified session certificate.'}
          </p>
        </div>

        {/* Enrollment / Registration Action Callout */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[var(--accent-10)] border border-[var(--accent-25)]">
          <div className="space-y-0.5 text-center sm:text-left">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--primary-accent)] block">
              {isSuperAdminOrAdmin ? 'Host / Session Management' : 'Registration Status'}
            </span>
            <p className="text-sm text-white font-medium">
              {isSuperAdminOrAdmin
                ? session.deliveryStatus === 'LIVE'
                  ? '🎙️ Meeting is currently LIVE! Host broadcasting active.'
                  : 'Authorized Session Host privileges granted for this room.'
                : isWaitlisted
                ? `⏳ You are on the Waitlist (Queue #${effectiveRegistrant?.waitlistPosition || 1})`
                : registered
                ? '✓ You are enrolled for this session'
                : capacityInfo.isCapacityFull
                ? `⚠️ Regular seats are full (${capacityInfo.capacityLabel}). Priority Waitlist is open.`
                : session.isPaid
                ? `Registration Open • Fee: Rs. ${session.amount}`
                : 'Registration Open • Free Admission'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            {isSuperAdminOrAdmin ? (
              /* Authorized Host Direct Access */
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <span className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
                  <span>Authorized Session Host</span>
                </span>

                <button
                  id="btn-host-enter-room"
                  type="button"
                  onClick={handleEnterAsHost}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white font-inter font-semibold text-xs sm:text-sm transition-all cursor-pointer shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2"
                  title="Enter virtual meeting room with full Host / Admin privileges"
                >
                  <Radio className="w-4 h-4 text-purple-200 animate-pulse" />
                  <span>
                    {session.deliveryStatus === 'LIVE'
                      ? 'Join Live Room as Host'
                      : 'Launch Virtual Meeting Room'}
                  </span>
                </button>
              </div>
            ) : !registered ? (
              <button
                type="button"
                onClick={handleRegisterClick}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-inter font-medium text-sm transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-2 ${
                  capacityInfo.isCapacityFull
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-white shadow-amber-950/40'
                    : 'bg-[var(--primary-accent)] hover:brightness-110 text-white shadow-[var(--primary-accent)]/20'
                }`}
              >
                {capacityInfo.isCapacityFull ? (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Join Priority Waitlist</span>
                  </>
                ) : (
                  <>
                    <ClipboardList className="w-4 h-4" />
                    <span>Register for Session</span>
                  </>
                )}
              </button>
            ) : isWaitlisted ? (
              <div className="flex flex-col sm:items-end gap-1">
                <span className="px-3.5 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center justify-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Waitlisted · Queue Position #{effectiveRegistrant?.waitlistPosition || 1}</span>
                </span>
                <span className="text-[11px] text-[var(--text-sec-70)]">
                  You will be auto-notified if an enrolled seat becomes available
                </span>
              </div>
            ) : isSessionClosed || session.deliveryStatus === 'COMPLETED' ? (
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-2 rounded-xl bg-white/10 text-white/70 border border-white/20 text-xs font-semibold flex items-center justify-center gap-1.5">
                  <span>🏁 Session Concluded (Recording Available Below)</span>
                </span>
              </div>
            ) : isRegistrationPending ? (
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>Registration Pending Confirmation</span>
                </span>
              </div>
            ) : isPaymentPending ? (
              <div className="flex flex-col sm:items-end gap-1">
                <span className="px-3.5 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Payment Pending Verification</span>
                </span>
                <span className="text-[11px] font-mono text-amber-200/80">
                  Room access locked until payment is approved
                </span>
              </div>
            ) : isPaymentRejected ? (
              <div className="flex flex-col sm:items-end gap-1">
                <span className="px-3.5 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>Payment Slip Rejected</span>
                </span>
                <span className="text-[11px] text-rose-200/80">
                  Please resubmit your receipt in My Registrations
                </span>
              </div>
            ) : isRoomLocked ? (
              <div className="flex flex-col sm:items-end gap-1">
                <span className="px-3.5 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1.5">
                  <Lock className="w-4 h-4 text-rose-400" />
                  <span>Room Access Not Available</span>
                </span>
                <span className="text-[11px] text-rose-200/80">
                  Access code currently locked or revoked by host
                </span>
              </div>
            ) : (
              /* Participant is eligible! Payment approved (or free) and room active */
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <span className="px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enrolled & Confirmed</span>
                </span>

                <button
                  id="btn-enter-session-room"
                  type="button"
                  onClick={() => setIsRoomCodeModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-inter font-medium text-xs sm:text-sm transition-all cursor-pointer shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2"
                  title="Enter the live session room using unique access code"
                >
                  <KeyRound className="w-4 h-4 text-purple-200" />
                  <span>Enter Session Room</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs for Resources, Tasks, Discussion, Attendance, and Room Governance */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-white/[0.10] pb-2 overflow-x-auto">
          {[
            { id: 'details' as const, label: 'Overview' },
            { id: 'resources' as const, label: `Resources (${resourcesList.length})` },
            { id: 'tasks' as const, label: `Tasks (${tasksList.length})` },
            { id: 'discussion' as const, label: `Discussion & Announcements (${commentsList.length})` },
            ...(isSuperAdminOrAdmin
              ? [
                  { id: 'attendance' as const, label: `Attendance & Eligibility (${sessionRegistrants.length})` },
                  { id: 'room-governance' as const, label: 'Room Access & Codes' },
                ]
              : []),
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[var(--accent-20)] text-[var(--primary-accent)] border border-[var(--accent-40)]'
                  : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            {registered && (
              <div className="p-4 rounded-xl bg-[var(--accent-10)] border border-[var(--accent-25)] space-y-2.5">
                <div className="flex items-center gap-2 text-white font-medium text-xs sm:text-sm">
                  <Award className="w-4 h-4 text-[var(--primary-accent)]" />
                  <span>SEMS Certificate Eligibility Requirements for this Session</span>
                </div>
                <p className="text-xs text-[var(--text-sec-80)]">
                  To qualify for an official signed certificate, complete all 4 requirements:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>1. Registration Confirmed</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>2. Fee {session.isPaid ? 'Approved' : 'Free Pass'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>3. Attendance Logged</span>
                  </div>
                  <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-200 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>4. Task On Time</span>
                  </div>
                </div>
              </div>
            )}

            <h4 className="font-poppins font-medium text-white text-base">Key Highlights</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm text-[var(--text-sec-80)]">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                <span className="font-semibold text-white block">Verified Credentials:</span>
                <p>Attendees who complete the session deliverables receive an official SEMS verified certificate with a unique verification code.</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                <span className="font-semibold text-white block">Society Guidelines:</span>
                <p>All participants must abide by campus code of conduct and submit deliverables before the deadline.</p>
              </div>
            </div>

            {/* Post-Session Recording & Executive Highlights (Strict truthful state governance) */}
            {(() => {
              const recStatus = session.recordingStatus || (session.recordingUrl ? 'available' : 'none');
              const isSessionFinished = session.deliveryStatus === 'COMPLETED' || session.status === 'closed';

              if (recStatus === 'available' && session.recordingUrl) {
                return (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-[#05161a] to-black/80 border border-purple-500/30 space-y-4 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/[0.08]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                          <Video className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-poppins font-semibold text-white text-sm">
                              Session Recording & Executive Highlights
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Available
                            </span>
                          </div>
                          <p className="text-[11px] text-purple-300/80 font-mono">
                            Archived HD 1080p {session.recordingDuration ? `• Duration: ${session.recordingDuration}` : '• Verified Stream'}
                          </p>
                        </div>
                      </div>

                      <a
                        href={session.recordingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.preventDefault();
                          onNotify(`Opening HD session playback stream: ${session.recordingUrl}`);
                        }}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Watch Recording</span>
                      </a>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-2 text-xs">
                      <span className="font-semibold text-purple-300 uppercase tracking-wider text-[11px] block">
                        Session Takeaways & AI Executive Summary:
                      </span>
                      <p className="text-white/90 leading-relaxed">
                        {session.meetingSummary ||
                          `Keynote session "${session.title}" conducted successfully by ${session.society}. Live interactive discussions, code demonstrations, and attendee Q&A have been finalized and recorded for credential verification.`}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-emerald-300">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Live Delivery Finished</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Attendance Logs Exported</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 text-purple-200">
                          <span>Recording Verified Ready</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              if (recStatus === 'processing') {
                return (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/30 via-[#0a181b] to-black/80 border border-amber-500/30 space-y-3 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 animate-spin">
                          <Radio className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-poppins font-semibold text-white text-sm">
                              Cloud Recording Processing
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                              Encoding 1080p Stream
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-200/80">
                            The meeting stream is currently being transcoded and rendered by the cloud media pipeline.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled
                        className="px-4 py-2 rounded-xl bg-white/10 text-white/40 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed border border-white/10"
                      >
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing Video...</span>
                      </button>
                    </div>
                  </div>
                );
              }

              if (recStatus === 'failed') {
                return (
                  <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 text-rose-200">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Recording Unavailable: Cloud stream capture failed or was aborted during live transmission.</span>
                    </div>
                  </div>
                );
              }

              if (isSessionFinished) {
                return (
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07] flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 text-white/60">
                      <Video className="w-4 h-4 text-white/40 shrink-0" />
                      <span>No cloud recording available for this session (concluded without live archive).</span>
                    </div>
                  </div>
                );
              }

              return null;
            })()}
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="glass-panel p-6 rounded-2xl">
            {/* Notice for guests */}
            {isGuest && (
              <div className="p-3 mb-4 rounded-xl bg-blue-500/15 border border-blue-500/30 text-xs text-blue-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-blue-300" />
                <span>Guests can freely download public resources. Member-exclusive slides and datasets unlock after student login.</span>
              </div>
            )}
            <SessionResourcesSection
              resources={resourcesList}
              currentRole={currentRole}
              onAddResource={handleAddResource}
              onNotify={onNotify}
            />
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="glass-panel p-6 rounded-2xl">
            <SessionTasksSection
              tasks={tasksList}
              currentRole={currentRole}
              onAddTask={handleAddTask}
              onNotify={onNotify}
            />
          </div>
        )}

        {activeTab === 'discussion' && (
          <div className="glass-panel p-6 rounded-2xl">
            <SessionCommentsSection
              comments={commentsList}
              currentRole={currentRole}
              onAddComment={handleAddComment}
              onNotify={onNotify}
              onNavigateToAuth={onNavigateToAuth}
            />
          </div>
        )}

        {/* SEMS Phase 3: Attendance & Eligibility Tab */}
        {activeTab === 'attendance' && isSuperAdminOrAdmin && (
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h4 className="font-poppins font-medium text-white text-base">
                  Session Attendance & Eligibility Roster
                </h4>
                <p className="text-xs text-[var(--text-sec-70)]">
                  Authoritative session participation logs and certificate qualification status for {session.title}.
                </p>
              </div>
            </div>

            {/* Mobile Screens (sm:hidden): Responsive Cards View */}
            <div className="sm:hidden space-y-3">
              {sessionRegistrants.length === 0 ? (
                <div className="py-6 text-center text-white/50 text-xs rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  No attendees registered for this session yet.
                </div>
              ) : (
                sessionRegistrants.map((reg) => {
                  const elig = eligibilityService.evaluateCertificateEligibility(reg, { session });
                  const att = INITIAL_ATTENDANCE_RECORDS.find(
                    (a) =>
                      a.sessionId === session.id &&
                      (a.participantId === reg.id ||
                        (reg.email && a.participantEmail.toLowerCase() === reg.email.toLowerCase()))
                  );

                  return (
                    <div
                      key={reg.id}
                      className="p-3.5 rounded-2xl glass-panel border border-white/[0.12] space-y-2.5 shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-poppins font-medium text-white text-sm truncate">
                            {reg.name}
                          </div>
                          <div className="text-[11px] font-mono text-[var(--text-sec-70)] truncate">
                            {reg.rollNumber} • {reg.email || 'Participant'}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            elig.eligible
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                              : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                          }`}
                        >
                          {elig.eligible ? '✓ Eligible' : 'Ineligible'}
                        </span>
                      </div>

                      {/* 4 Status Checkpoints Grid */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-xl bg-black/30 border border-white/[0.06]">
                        <div className="flex items-center justify-between">
                          <span className="text-white/60">Reg:</span>
                          <span
                            className={`font-medium ${
                              elig.checks.registrationConfirmed ? 'text-emerald-300' : 'text-amber-300'
                            }`}
                          >
                            {reg.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/60">Payment:</span>
                          <span
                            className={`font-medium ${
                              elig.checks.paymentApproved ? 'text-emerald-300' : 'text-rose-300'
                            }`}
                          >
                            {session.isPaid ? reg.status : 'Free'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between col-span-2 pt-1 border-t border-white/[0.04]">
                          <span className="text-white/60">Attendance:</span>
                          {att ? (
                            att.verificationStatus === 'verified' || att.thresholdMet ? (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-medium">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Verified Present ({att.durationMinutes}m)</span>
                              </span>
                            ) : att.verificationStatus === 'pending_verification' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300 font-medium">
                                <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
                                <span>Verification Pending ({att.durationMinutes}m est.)</span>
                              </span>
                            ) : att.verificationStatus === 'in_session' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-medium">
                                <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                                <span>In Session ({att.durationMinutes}m live)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-300 font-medium">
                                <AlertCircle className="w-3 h-3 text-rose-400" />
                                <span>Below Required Duration ({att.durationMinutes}m)</span>
                              </span>
                            )
                          ) : (
                            <span className="text-white/40 italic">Not logged</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between col-span-2 pt-1 border-t border-white/[0.04]">
                          <span className="text-white/60">Task Assignment:</span>
                          <span
                            className={`font-medium ${
                              elig.checks.assignmentCompleted ? 'text-emerald-300' : 'text-rose-300'
                            }`}
                          >
                            {elig.checks.assignmentCompleted ? 'On Time' : 'Missing/Late'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop & Tablet Screens (hidden sm:block): Full Tabular Format */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.04] border-b border-white/[0.08] text-[var(--text-sec-70)] font-medium">
                  <tr>
                    <th className="py-2.5 px-3">Participant</th>
                    <th className="py-2.5 px-3">Registration</th>
                    <th className="py-2.5 px-3">Payment</th>
                    <th className="py-2.5 px-3">Logged Attendance</th>
                    <th className="py-2.5 px-3">Assignment</th>
                    <th className="py-2.5 px-3">SEMS Eligibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {sessionRegistrants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-white/50">
                        No attendees registered for this session yet.
                      </td>
                    </tr>
                  ) : (
                    sessionRegistrants.map((reg) => {
                      const elig = eligibilityService.evaluateCertificateEligibility(reg, { session });
                      const att = INITIAL_ATTENDANCE_RECORDS.find(
                        (a) =>
                          a.sessionId === session.id &&
                          (a.participantId === reg.id ||
                            (reg.email && a.participantEmail.toLowerCase() === reg.email.toLowerCase()))
                      );

                      return (
                        <tr key={reg.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-3">
                            <div className="font-medium text-white">{reg.name}</div>
                            <div className="text-[11px] font-mono text-white/50">{reg.rollNumber}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                elig.checks.registrationConfirmed
                                  ? 'bg-emerald-950 text-emerald-300'
                                  : 'bg-amber-950 text-amber-300'
                              }`}
                            >
                              {reg.status}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                elig.checks.paymentApproved
                                  ? 'bg-emerald-950 text-emerald-300'
                                  : 'bg-rose-950 text-rose-300'
                              }`}
                            >
                              {session.isPaid ? reg.status : 'Free'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {att ? (
                              att.verificationStatus === 'verified' || att.thresholdMet ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-medium">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    <span>Verified Present</span>
                                  </span>
                                  <div className="text-[10px] font-mono text-emerald-300/80">
                                    {att.durationMinutes}m • by {att.verifiedBy || 'Session Host'}
                                  </div>
                                </div>
                              ) : att.verificationStatus === 'pending_verification' ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300 font-medium">
                                    <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
                                    <span>Verification Pending</span>
                                  </span>
                                  <div className="text-[10px] font-mono text-amber-300/80">
                                    Est. {att.durationMinutes}m logged
                                  </div>
                                </div>
                              ) : att.verificationStatus === 'in_session' ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-medium">
                                    <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                                    <span>In Session</span>
                                  </span>
                                  <div className="text-[10px] font-mono text-cyan-300/80">
                                    {att.durationMinutes}m live tracking
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-300 font-medium">
                                    <AlertCircle className="w-3 h-3 text-rose-400" />
                                    <span>Below Duration</span>
                                  </span>
                                  <div className="text-[10px] font-mono text-rose-300/80">
                                    {att.durationMinutes}m logged
                                  </div>
                                </div>
                              )
                            ) : (
                              <span className="text-white/40 italic">No attendance log</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                elig.checks.assignmentCompleted
                                  ? 'bg-emerald-950 text-emerald-300'
                                  : 'bg-rose-950 text-rose-300'
                              }`}
                            >
                              {elig.checks.assignmentCompleted ? 'On Time' : 'Missing/Late'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                                elig.eligible
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                                  : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                              }`}
                            >
                              {elig.eligible ? '✓ Eligible' : 'Ineligible'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Room Access & Governance (Admin / Super Admin) */}
        {activeTab === 'room-governance' && isSuperAdminOrAdmin && (
          <SessionRoomAdminPanel
            session={session}
            currentRole={currentRole}
            actorName={
              currentUserName ||
              (currentRole === 'super_admin' ? 'Prof. Dean Taylor' : 'Alex Morgan')
            }
            onNotify={onNotify}
          />
        )}
      </div>

      {/* Room Access Code Input Dialog */}
      <RoomCodeInputDialog
        session={session}
        currentUserEmail={
          currentUserEmail ||
          (currentRole === 'guest'
            ? 'sarah.connor@industrytech.io'
            : currentRole === 'student'
            ? 'student@university.edu.pk'
            : 'admin@university.edu.pk')
        }
        registrant={effectiveRegistrant}
        isOpen={isRoomCodeModalOpen}
        onClose={() => setIsRoomCodeModalOpen(false)}
        onAuthorized={(authData) => {
          setActiveRoomData(authData);
        }}
        onNotify={onNotify}
      />
    </div>
  );
};
