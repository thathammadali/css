import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Inbox,
  Filter,
  Search,
  Award,
  CreditCard,
  ClipboardList,
  CheckSquare,
  ArrowRight,
  Sparkles,
  Check,
  X,
  Eye,
  FileText,
  Plus,
  FileCode2,
  Users,
  Radio,
  KeyRound,
  Copy,
  GraduationCap,
  UserCheck,
  CheckCheck,
  UploadCloud,
  AlertCircle,
  Clock,
  FileCheck,
  Unlock,
} from 'lucide-react';
import { DashboardRole, SessionItem, RegistrantItem, CertificateItem, EventItem } from '../types';
import { ROLE_STATS, ROLE_GREETINGS } from '../data/mockSessions';
import { SessionCard } from './SessionCard';
import { DashboardSkeleton } from './DashboardSkeleton';
import { SessionDetailModal } from './SessionDetailModal';
import { EmptyState } from './EmptyState';
import { eligibilityService } from '../services/eligibilityService';
import { roomAccessService } from '../services/roomAccessService';
import { notificationService } from '../services/notificationService';
import { storageService } from '../services/storageService';
import { StudentActivityChart } from './dashboard/StudentActivityChart';
import { RegistrationJourneyTimeline } from './dashboard/RegistrationJourneyTimeline';
import { GuestDigitalPassModal } from './dashboard/GuestDigitalPassModal';
import { SubmitTaskModal } from './dashboard/SubmitTaskModal';

interface HomeDashboardProps {
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
  onNavigateToSessionRooms?: () => void;
  onNavigateToEvents?: () => void;
  onNavigateToFormBuilder?: () => void;
  onNavigateToRegistrants?: () => void;
  onNavigateToCertificates?: () => void;
  onNavigateToUsers?: () => void;
  onNavigateToCreateSession?: () => void;
  onUpdateRegistrants?: (updated: RegistrantItem[]) => void;
  onApproveEvent?: (eventId: string) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  currentRole,
  events = [],
  sessions = [],
  registrants = [],
  certificates = [],
  currentUserEmail,
  currentUserName,
  onSelectRole,
  onNotify,
  onNavigateToAuth,
  onNavigateToSession,
  onNavigateToSessionsList,
  onNavigateToSessionRooms,
  onNavigateToEvents,
  onNavigateToFormBuilder,
  onNavigateToRegistrants,
  onNavigateToCertificates,
  onNavigateToUsers,
  onNavigateToCreateSession,
  onUpdateRegistrants,
  onApproveEvent,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  // Student Dashboard Sub-tabs
  const [studentTab, setStudentTab] = useState<
    'available' | 'registrations' | 'payments' | 'certificates' | 'tasks'
  >('available');

  // Receipt modal for admin quick review
  const [inspectReceipt, setInspectReceipt] = useState<RegistrantItem | null>(null);
  const [isCodeCopied, setIsCodeCopied] = useState(false);
  const [copiedDispatchId, setCopiedDispatchId] = useState<string | null>(null);

  // Student Re-upload Receipt State (Group 2 Workflow)
  const [resubmitTarget, setResubmitTarget] = useState<RegistrantItem | null>(null);
  const [newReceiptFile, setNewReceiptFile] = useState<File | null>(null);
  const [receiptUploadError, setReceiptUploadError] = useState<string | null>(null);
  const [resubmitRemarks, setResubmitRemarks] = useState('');
  const [isResubmitting, setIsResubmitting] = useState(false);

  // Group 4: Digital Pass & Task Submission State
  const [digitalPassTarget, setDigitalPassTarget] = useState<RegistrantItem | null>(null);
  const [submitTaskTarget, setSubmitTaskTarget] = useState<{
    taskId: string;
    taskTitle: string;
    sessionTitle: string;
    dueDate?: string;
  } | null>(null);
  const [, setTimelineRefresh] = useState(0);

  // Universal Escape key listener for all modals in HomeDashboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (inspectReceipt) setInspectReceipt(null);
        else if (resubmitTarget) setResubmitTarget(null);
        else if (digitalPassTarget) setDigitalPassTarget(null);
        else if (submitTaskTarget) setSubmitTaskTarget(null);
        else if (selectedSession) setSelectedSession(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectReceipt, resubmitTarget, digitalPassTarget, submitTaskTarget, selectedSession]);

  const handleCheckInAttendance = (reg: RegistrantItem) => {
    eligibilityService.recordAttendance({
      sessionId: reg.sessionId,
      participantId: reg.id,
      participantName: reg.name,
      participantEmail: reg.email || reg.primaryEmail,
      rollNumber: reg.rollNumber,
      durationMinutes: 180,
      verifiedBy: 'Self Check-in (Session Room)',
    });
    onNotify(`Attendance logged for "${reg.sessionTitle}"! Milestone 3 satisfied.`);
    setTimelineRefresh((v) => v + 1);
  };

  const handleConfirmResubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resubmitTarget || !onUpdateRegistrants) return;
    if (!newReceiptFile) {
      onNotify('Please select a payment receipt image or document.');
      return;
    }

    setIsResubmitting(true);
    try {
      // Compress client-side to avoid localStorage quota crash
      const compressed = await storageService.compressImage(newReceiptFile);

      // Save permanently to IndexedDB
      await storageService.saveFile({
        key: `receipt_${resubmitTarget.id}`,
        dataUrl: compressed.dataUrl,
        fileName: newReceiptFile.name,
        fileSize: compressed.compressedSize,
        mimeType: compressed.mimeType,
        createdAt: Date.now(),
      });

      const fileName = newReceiptFile.name;
      const previewUrl = compressed.dataUrl;
      const fileSizeStr = `${Math.round(compressed.compressedSize / 1024)} KB`;

      const updated = registrants.map((r) =>
        r.id === resubmitTarget.id
          ? {
              ...r,
              status: 'pending' as const,
              lifecycleStatus: 'PAYMENT_PENDING' as const,
              receiptFileName: fileName,
              receiptFileSize: fileSizeStr,
              receiptPreviewUrl: previewUrl,
              submittedAt: 'Just now (Resubmitted)',
              receiptRejectedReason: undefined,
              resubmitNote: resubmitRemarks.trim() || undefined,
            }
          : r
      );
      onUpdateRegistrants(updated);

      notificationService.addNotification({
        type: 'payment_pending',
        title: 'Payment Receipt Resubmitted',
        message: `${resubmitTarget.name} (${resubmitTarget.rollNumber}) has re-uploaded a corrected payment slip for "${resubmitTarget.sessionTitle}". Ready for admin verification.`,
        linkTab: 'registrants',
        recipientRole: 'admin',
        entityId: `resubmit-${resubmitTarget.id}-${Date.now()}`,
      });

      onNotify(
        `Receipt for "${resubmitTarget.sessionTitle}" successfully resubmitted (${fileSizeStr} offline cached).`
      );
      setResubmitTarget(null);
      setNewReceiptFile(null);
      setReceiptUploadError(null);
      setResubmitRemarks('');
    } catch (err) {
      console.warn('Receipt resubmission error:', err);
      onNotify('Failed to process receipt image. Please try again.');
    } finally {
      setIsResubmitting(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [currentRole]);

  const stats = ROLE_STATS[currentRole] || [];
  const greeting = ROLE_GREETINGS[currentRole];

  const filteredSessions = sessions.filter(
    (s) =>
      s.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      s.location.toLowerCase().includes(filterQuery.toLowerCase()) ||
      s.society.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const myRegistrations = registrants.filter((r) => {
    const emailNorm = (currentUserEmail || (currentRole === 'student' ? 'student@university.edu.pk' : 'guest@university.edu.pk')).toLowerCase().trim();
    const nameNorm = (currentUserName || '').toLowerCase().trim();
    const matchesUser =
      (r.email && r.email.toLowerCase().trim() === emailNorm) ||
      (r.primaryEmail && r.primaryEmail.toLowerCase().trim() === emailNorm) ||
      (r.secondaryEmail && r.secondaryEmail.toLowerCase().trim() === emailNorm) ||
      (nameNorm && r.name.toLowerCase().trim() === nameNorm);

    if (matchesUser) return true;

    // Demo student Jordan Lee identity (Roll No: 2024-CS-42) - ONLY runs if the logged-in user IS Jordan or demo student
    const isJordanUser =
      !currentUserEmail ||
      currentUserEmail.toLowerCase().trim() === 'student@university.edu.pk' ||
      currentUserEmail.toLowerCase().trim() === 'jordan.lee@university.edu.pk' ||
      currentUserEmail.toLowerCase().trim() === 'sportszaab@gmail.com' ||
      nameNorm === 'jordan lee';

    if (currentRole === 'student' && isJordanUser) {
      const studentAliases = [
        'student@university.edu.pk',
        'jordan.lee@university.edu.pk',
        'sportszaab@gmail.com',
      ];
      const isJordanEmail =
        (r.email && studentAliases.includes(r.email.toLowerCase().trim())) ||
        (r.primaryEmail && studentAliases.includes(r.primaryEmail.toLowerCase().trim())) ||
        (r.secondaryEmail && studentAliases.includes(r.secondaryEmail.toLowerCase().trim()));

      const isJordanRoll =
        r.rollNumber === '2024-CS-42' ||
        r.rollNumber === '2024-CS-042' ||
        r.rollNumber === 'FA23-BCS-042';

      const isJordanName = r.name.toLowerCase().trim() === 'jordan lee';

      return isJordanEmail || isJordanRoll || isJordanName;
    }

    const isSarahUser =
      !currentUserEmail ||
      currentUserEmail.toLowerCase().trim() === 'sarah.connor@industrytech.io' ||
      currentUserEmail.toLowerCase().trim() === 'sarahconnor.ai@gmail.com' ||
      nameNorm.includes('sarah');

    if (currentRole === 'guest' && isSarahUser) {
      return (
        r.isGuest ||
        r.email?.toLowerCase().trim() === 'sarah.connor@industrytech.io' ||
        r.secondaryEmail?.toLowerCase().trim() === 'sarahconnor.ai@gmail.com' ||
        (r.name.toLowerCase().includes('sarah') && r.name.toLowerCase().includes('connor'))
      );
    }
    return false;
  });

  // Check if student has allotted room codes
  const effectiveEmail = currentUserEmail || (currentRole === 'student' ? 'student@university.edu.pk' : '');
  const activeDispatches = useMemo(() => {
    if (!effectiveEmail && currentRole !== 'student') return [];
    const all = roomAccessService.getAllDispatches();
    const norm = (effectiveEmail || 'student@university.edu.pk').toLowerCase().trim();
    const studentAliases = ['student@university.edu.pk', 'sportszaab@gmail.com', 'jordan.lee@university.edu.pk'];
    const isStudent = studentAliases.includes(norm) || currentRole === 'student';
    return all.filter((d) => {
      const dEmail = d.participantEmail.toLowerCase().trim();
      return dEmail === norm || (isStudent && studentAliases.includes(dEmail));
    });
  }, [effectiveEmail, currentRole]);

  // Admin: Calculate how many paid attendees need a room code
  const paidPendingCodeCount = useMemo(() => {
    return registrants.filter(
      (r) =>
        (r.status === 'approved' || r.amount?.includes('Free') || r.amount === '0') &&
        !roomAccessService.getDispatchForParticipant(
          r.sessionId,
          r.email || r.primaryEmail || ''
        )
    ).length;
  }, [registrants]);

  const handleQuickStatusChange = (id: string, newStatus: 'approved' | 'rejected') => {
    if (!onUpdateRegistrants) return;
    const target = registrants.find((r) => r.id === id);
    const updated = registrants.map((r) => (r.id === id ? { ...r, status: newStatus } : r));
    onUpdateRegistrants(updated);
    onNotify(
      `Registration for ${target?.name || 'student'} ${newStatus === 'approved' ? 'approved' : 'rejected'}.`
    );
  };

  const getStatIcon = (idx: number) => {
    switch (idx) {
      case 0:
        return <Calendar className="w-5 h-5 text-[var(--primary-accent)]" />;
      case 1:
        return <Users className="w-5 h-5 text-emerald-400" />;
      case 2:
        return <CreditCard className="w-5 h-5 text-cyan-400" />;
      case 3:
      default:
        return <Award className="w-5 h-5 text-amber-300" />;
    }
  };

  return (
    <div id="home-dashboard-view" className="w-full space-y-6 sm:space-y-8 pb-16">
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6 sm:space-y-8 animate-fadeIn">
          {/* ========================================================
              TOP GREETING SECTION WITH ACADEMIC PROFILE TOUCH
             ======================================================== */}
          {/* ========================================================
              TOP GREETING SECTION WITH ACADEMIC RESTRAINED DESIGN
             ======================================================== */}
          <section id="role-greeting-section" className="glass-card p-5 sm:p-6 rounded-2xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
              <div className="flex items-start sm:items-center gap-4">
                {currentRole === 'student' ? (
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-[var(--accent-15)] border border-[var(--primary-accent)]/30 flex items-center justify-center font-poppins font-semibold text-base text-[var(--primary-accent)]">
                      JL
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[var(--panel-bg)] flex items-center justify-center" title="Active Online">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    </span>
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
                      {currentRole === 'super_admin'
                        ? 'Super Admin Authority'
                        : currentRole === 'admin'
                        ? 'Society Administrator'
                        : currentRole === 'student'
                        ? 'Enrolled Scholar'
                        : 'External Participant'}
                    </span>
                    {currentRole === 'student' && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                        <span>Roll:</span>
                        <strong className="font-mono text-[var(--text-primary)]">2024-CS-042</strong>
                      </span>
                    )}
                  </div>
                  <h2 className="font-poppins font-semibold text-2xl sm:text-3xl text-[var(--text-primary)] tracking-tight leading-tight">
                    {greeting.title}
                  </h2>
                  <p className="font-inter font-normal text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-xl">
                    {currentRole === 'student'
                      ? 'Department of Computer Science & Robotics · Semester 5 · Verified Scholar'
                      : greeting.subtitle}
                  </p>
                </div>
              </div>

              {/* Right Side Stats / Actions */}
              <div className="flex items-center gap-3 shrink-0">
                {currentRole === 'student' ? (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xs shadow-xs">
                    <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-[10px] text-[var(--text-secondary)] font-medium">Society Status</span>
                      <span className="font-semibold text-[var(--text-primary)]">Active Member</span>
                    </div>
                  </div>
                ) : (currentRole === 'super_admin' || currentRole === 'admin') && onNavigateToCreateSession ? (
                  <button
                    type="button"
                    onClick={onNavigateToCreateSession}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-105 active:scale-[0.98] text-white font-medium text-xs sm:text-sm cursor-pointer shadow-sm transition-all shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Session</span>
                  </button>
                ) : null}
              </div>
            </div>
          </section>



          {/* ========================================================
              KEY STAT CARDS - RESTRAINED ENTERPRISE SURFACES
             ======================================================== */}
          <section
            id="role-stat-cards"
            aria-label="Key role statistics"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className={`glass-card-interactive p-4 sm:p-5 rounded-2xl flex flex-col justify-between space-y-2.5 ${
                  stat.highlight
                    ? 'ring-1 ring-[var(--primary-accent)]'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-inter text-xs text-[var(--text-secondary)] font-medium uppercase tracking-wider">
                    {stat.label}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent-15)] border border-[var(--accent-30)] flex items-center justify-center text-[var(--primary-accent)]">
                    {getStatIcon(idx)}
                  </div>
                </div>
                <div>
                  <span className="block font-poppins font-semibold text-2xl sm:text-3xl text-[var(--text-primary)] tracking-tight leading-tight">
                    {stat.value}
                  </span>
                  {stat.subtext && (
                    <span className="block font-inter text-[11px] text-[var(--text-secondary)] mt-1 truncate">
                      {stat.subtext}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </section>

          {/* ========================================================
              STUDENT LEARNING & ATTENDANCE ANALYTICS GRAPH (USER REQUESTED)
             ======================================================== */}
          {(currentRole === 'student' || currentRole === 'guest') && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Interactive SVG Area Graph & Attendance Bars */}
              <div className="lg:col-span-8">
                <StudentActivityChart
                  sessions={sessions}
                  registrants={registrants}
                  currentUserEmail={currentUserEmail}
                  currentUserName={currentUserName}
                />
              </div>

              {/* Dedicated Session Codes Card (User Requested: Heading "Codes" with all allotted codes) */}
              <div className="lg:col-span-4 p-5 sm:p-6 rounded-2xl glass-card flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  {/* Header: "Codes" */}
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--panel-border)] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-[var(--accent-15)] text-[var(--primary-accent)]">
                        <KeyRound className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="font-poppins font-semibold text-base text-[var(--text-primary)] leading-tight">
                          Codes
                        </h4>
                        <span className="text-[11px] text-[var(--text-secondary)]">
                          Allotted Session Access Codes
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-medium bg-[var(--accent-15)] text-[var(--primary-accent)] border border-[var(--accent-30)]">
                      {activeDispatches.length} {activeDispatches.length === 1 ? 'Code' : 'Codes'}
                    </span>
                  </div>

                  {/* Sessions with Codes List */}
                  {activeDispatches.length > 0 ? (
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {activeDispatches.map((dispatch) => {
                        const matchedSession = sessions.find((s) => s.id === dispatch.sessionId);
                        const matchedRoom = roomAccessService.getAllRooms().find((r) => r.sessionId === dispatch.sessionId);
                        const sessionTitle = matchedSession?.title || matchedRoom?.sessionTitle || 'Scheduled Session';
                        const dateStr = matchedSession?.date ? `${matchedSession.date} · ${matchedSession.time}` : 'Oct 15 · 14:00 - 17:00';
                        const locationStr = matchedSession?.location || matchedRoom?.roomName || 'Virtual Pod Alpha';
                        const speakerStr = matchedRoom?.speakerName || matchedSession?.society || 'Dr. Aris Vance (Director)';
                        const isCopied = copiedDispatchId === dispatch.id;

                        return (
                          <div
                            key={dispatch.id}
                            className="p-3.5 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] space-y-2.5 transition-all hover:border-[var(--primary-accent)]/40 shadow-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h5 className="font-poppins font-semibold text-xs sm:text-sm text-[var(--text-primary)] leading-snug line-clamp-1">
                                  {sessionTitle}
                                </h5>
                                <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                                  {speakerStr} · {locationStr}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[var(--text-secondary)]">Schedule:</span>
                              <span className="text-emerald-400 font-mono font-medium">{dateStr}</span>
                            </div>

                            {/* Allotted Code Box */}
                            <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--accent-15)] border border-[var(--accent-30)]">
                              <div className="flex items-center gap-2 min-w-0">
                                <KeyRound className="w-3.5 h-3.5 text-[var(--primary-accent)] shrink-0" />
                                <span className="font-mono font-bold text-xs sm:text-sm text-[var(--text-primary)] tracking-wider truncate select-all">
                                  {dispatch.accessCodeSent}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(dispatch.accessCodeSent);
                                  setCopiedDispatchId(dispatch.id);
                                  setTimeout(() => setCopiedDispatchId(null), 2000);
                                  onNotify(`Copied code: ${dispatch.accessCodeSent}`);
                                }}
                                className="px-2 py-1 rounded bg-[var(--panel-bg)] hover:bg-[var(--panel-border)] border border-[var(--panel-border)] text-[10px] font-medium text-[var(--text-primary)] flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                                title="Copy Room Access Code"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-400">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Enter / Unlock Button for this session */}
                            <button
                              type="button"
                              onClick={onNavigateToSessionRooms}
                              className="w-full py-2 rounded-lg bg-[var(--primary-accent)] hover:brightness-105 active:scale-[0.98] text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Enter Virtual Room</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] space-y-2">
                      <KeyRound className="w-8 h-8 text-[var(--text-secondary)]/50 mx-auto" />
                      <p className="text-xs font-medium text-[var(--text-primary)]">No Session Codes Allotted Yet</p>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
                        Once your session registration and fee verification are approved, the Super Admin will allocate your access code here.
                      </p>
                    </div>
                  )}
                </div>

                {activeDispatches.length > 0 && (
                  <button
                    type="button"
                    onClick={onNavigateToSessionRooms}
                    className="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.12] text-white font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <span>View All Live Session Rooms</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              LIVE SESSION ROOMS BANNER (VIRTUAL PODS - ADMIN / GUEST)
             ======================================================== */}
          {currentRole !== 'student' && (
            <div className="glass-card p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-[var(--primary-accent)]">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-15)] border border-[var(--accent-30)] flex items-center justify-center text-[var(--primary-accent)] shrink-0">
                  <Radio className="w-5 h-5 text-[var(--primary-accent)]" />
                </div>
                <div>
                  <h4 className="font-poppins font-semibold text-[var(--text-primary)] text-sm sm:text-base flex items-center gap-2">
                    <span>Session Rooms (Live Virtual Pods)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                      LIVE HUB
                    </span>
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Unlock and enter virtual meeting rooms using room access codes allotted by system administrators.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onNavigateToSessionRooms}
                className="px-4 py-2 rounded-xl bg-[var(--primary-accent)] hover:brightness-105 active:scale-[0.98] text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <span>Open Session Rooms</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ========================================================
              ADMIN & SUPER ADMIN COMMAND CENTRE
             ======================================================== */}
          {(currentRole === 'super_admin' || currentRole === 'admin') && (
            <div className="glass-card p-5 sm:p-6 rounded-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
                <h3 className="font-poppins font-medium text-base text-[var(--text-primary)] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span>
                    {currentRole === 'super_admin'
                      ? 'Super Admin Governance Centre'
                      : 'Admin Management Hub'}
                  </span>
                </h3>
                <span className="text-xs font-medium text-[var(--primary-accent)]">
                  {currentRole === 'super_admin' ? 'System Authority' : 'Operational Management'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <button
                  type="button"
                  onClick={onNavigateToCreateSession}
                  className="p-3.5 rounded-xl bg-[var(--panel-bg)] hover:bg-[var(--accent-10)] border border-[var(--panel-border)] hover:border-[var(--primary-accent)] text-left space-y-1 cursor-pointer transition-all group"
                >
                  <Calendar className="w-5 h-5 text-[var(--primary-accent)] group-hover:scale-105 transition-transform" />
                  <p className="text-xs font-semibold text-[var(--text-primary)]">New Event</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">Propose & schedule</p>
                </button>

                <button
                  type="button"
                  onClick={onNavigateToFormBuilder}
                  className="p-3.5 rounded-xl bg-[var(--panel-bg)] hover:bg-[var(--accent-10)] border border-[var(--panel-border)] hover:border-[var(--primary-accent)] text-left space-y-1 cursor-pointer transition-all group"
                >
                  <FileCode2 className="w-5 h-5 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform" />
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Form Builder</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">Schema V1/V2</p>
                </button>

                <button
                  type="button"
                  onClick={onNavigateToRegistrants}
                  className="p-3.5 rounded-xl bg-[var(--panel-bg)] hover:bg-[var(--accent-10)] border border-[var(--panel-border)] hover:border-[var(--primary-accent)] text-left space-y-1 cursor-pointer transition-all group"
                >
                  <Users className="w-5 h-5 text-teal-600 dark:text-teal-400 group-hover:scale-105 transition-transform" />
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Fee Slips</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">Review receipts</p>
                </button>

                <button
                  type="button"
                  onClick={onNavigateToCertificates}
                  className="p-3.5 rounded-xl bg-[var(--panel-bg)] hover:bg-[var(--accent-10)] border border-[var(--panel-border)] hover:border-[var(--primary-accent)] text-left space-y-1 cursor-pointer transition-all group"
                >
                  <Award className="w-5 h-5 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform" />
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Certificates</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">Bulk CSV & templates</p>
                </button>

                {currentRole === 'super_admin' && onNavigateToUsers && (
                  <button
                    type="button"
                    onClick={onNavigateToUsers}
                    className="p-3.5 rounded-xl bg-[var(--accent-15)] hover:bg-[var(--accent-25)] border border-[var(--primary-accent)]/30 text-left space-y-1 cursor-pointer transition-all group col-span-2 sm:col-span-1"
                  >
                    <Users className="w-5 h-5 text-[var(--primary-accent)] group-hover:scale-105 transition-transform" />
                    <p className="text-xs font-semibold text-[var(--text-primary)]">Users & Roles</p>
                    <p className="text-[11px] text-[var(--primary-accent)]">Governance & audits</p>
                  </button>
                )}
              </div>

              {/* Code Allotment Quick Action Banner for Admin */}
              <div className="p-4 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-15)] border border-[var(--accent-30)] flex items-center justify-center text-[var(--primary-accent)] shrink-0">
                    <KeyRound className="w-5 h-5 text-[var(--primary-accent)]" />
                  </div>
                  <div>
                    <h4 className="font-poppins font-semibold text-[var(--text-primary)] text-xs sm:text-sm flex items-center gap-2">
                      <span>Room Code Allotment & Review</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--accent-20)] text-[var(--primary-accent)] border border-[var(--accent-30)]">
                        {paidPendingCodeCount > 0 ? `${paidPendingCodeCount} Paid Need Codes` : 'All Paid Dispatched'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Admin/Super Admin filtered view se paid students ko filter karke room code alot karein taake notifications foran send hon.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onNavigateToRegistrants}
                  className="px-3.5 py-2 rounded-xl bg-[var(--primary-accent)] hover:brightness-105 active:scale-[0.98] text-white font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs shrink-0"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Allocate Codes (Filtered)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Events Awaiting Super Admin Publication Approval */}
              {currentRole === 'super_admin' && events.some((e) => e.status === 'PENDING_APPROVAL') && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      Events Awaiting Super Admin Publication Approval:
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
                    {events
                      .filter((e) => e.status === 'PENDING_APPROVAL')
                      .map((pEvt) => (
                        <div
                          key={pEvt.id}
                          className="p-3 rounded-lg bg-[var(--panel-bg)] border border-[var(--panel-border)] flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-[var(--text-primary)] block truncate">{pEvt.title}</span>
                            <span className="text-[11px] text-[var(--text-sec-70)] block truncate">
                              Proposed by {pEvt.createdBy} · {pEvt.organizer} · {pEvt.sessions?.length || 0} sessions
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

              {/* Pending Approvals Table Preview */}
              <div className="pt-2 border-t border-[var(--panel-border)] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">Recent Registrations Awaiting Verification:</span>
                  <button
                    type="button"
                    onClick={onNavigateToRegistrants}
                    className="text-[var(--primary-accent)] hover:underline cursor-pointer font-medium"
                  >
                    View all in Registrants →
                  </button>
                </div>

                <div className="divide-y divide-[var(--panel-border-subtle)] rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] overflow-hidden shadow-xs">
                  {registrants.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="No registrations found"
                      description="Student and attendee registrations will appear here once submitted."
                      actionLabel="Explore Sessions"
                      onAction={onNavigateToSessionsList || onNavigateToRegistrants}
                    />
                  ) : (
                    registrants.slice(0, 3).map((reg) => (
                    <div key={reg.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <span className="font-medium text-[var(--text-primary)] block truncate">
                          {reg.name} ({reg.rollNumber})
                        </span>
                        <span className="text-[11px] text-[var(--text-secondary)] truncate block">
                          {reg.sessionTitle} • {reg.amount}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {reg.receiptFileName && (
                          <button
                            type="button"
                            onClick={() => setInspectReceipt(reg)}
                            className="px-2 py-1 rounded-lg bg-[var(--accent-10)] hover:bg-[var(--accent-20)] text-xs text-[var(--primary-accent)] flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Receipt</span>
                          </button>
                        )}

                        {reg.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(reg.id, 'approved')}
                              className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center cursor-pointer shadow-xs"
                              title="Approve"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(reg.id, 'rejected')}
                              className="w-7 h-7 rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center cursor-pointer shadow-xs"
                              title="Reject"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold ${
                              reg.status === 'approved'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {reg.status}
                          </span>
                        )}
                      </div>
                    </div>
                  )))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              PARTICIPANT DASHBOARD SUB-TABS (Student & Guest)
             ======================================================== */}
          {(currentRole === 'student' || currentRole === 'guest') && (
            <div className="space-y-4">
              {/* Tab Navigation Pill Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[var(--panel-border)]">
                {(
                  [
                    { id: 'available', label: 'Available Sessions', count: sessions.length, icon: Calendar },
                    { id: 'registrations', label: 'My Registrations', count: myRegistrations.length, icon: ClipboardList },
                    { id: 'payments', label: 'My Payments', count: myRegistrations.length, icon: CreditCard },
                    { id: 'certificates', label: 'My Certificates', count: certificates.length, icon: Award },
                    { id: 'tasks', label: 'Tasks & Homework', count: 2, icon: CheckSquare },
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

              {/* Sub-Tab 1: My Registrations */}
              {studentTab === 'registrations' && (
                <div className="glass-panel p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-[#172B3A] dark:text-[#F1F5F9]">Your Registered Sessions & Progress</h3>
                      <p className="text-xs text-[var(--text-sec-70)]">
                        Track your 5-stage participant journey from registration to verified certificate conferral.
                      </p>
                    </div>
                  </div>

                  {myRegistrations.length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                      <p className="text-xs text-[var(--text-sec-70)]">No registered sessions found.</p>
                      <button
                        type="button"
                        onClick={() => setStudentTab('available')}
                        className="px-4 py-2 rounded-xl bg-[var(--primary-accent)] text-white text-xs font-semibold cursor-pointer"
                      >
                        Browse Available Sessions
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myRegistrations.map((reg) => {
                        const sess = sessions.find((s) => s.id === reg.sessionId);
                        return (
                          <RegistrationJourneyTimeline
                            key={reg.id}
                            registrant={reg}
                            session={sess}
                            currentRole={currentRole}
                            onOpenDigitalPass={(r) => setDigitalPassTarget(r)}
                            onOpenSubmitTask={(taskId, taskTitle) =>
                              setSubmitTaskTarget({
                                taskId,
                                taskTitle,
                                sessionTitle: reg.sessionTitle,
                                dueDate: sess?.tasks?.[0]?.dueDate || 'Oct 20, 2026',
                              })
                            }
                            onOpenResubmitSlip={(r) => {
                              setResubmitTarget(r);
                              setNewReceiptFile(null);
                              setResubmitRemarks('');
                            }}
                            onNavigateToCertificates={onNavigateToCertificates}
                            onCheckInAttendance={handleCheckInAttendance}
                            onNotify={onNotify}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Tab 2: My Payments */}
              {studentTab === 'payments' && (
                <div className="glass-panel p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-[#172B3A] dark:text-[#F1F5F9]">Your Payment & Receipt History</h3>
                      <p className="text-xs text-[var(--text-sec-70)]">
                        Track fee vouchers, bank slips, and payment verification statuses.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {myRegistrations.map((reg) => (
                      <div
                        key={reg.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          reg.status === 'rejected'
                            ? 'bg-rose-950/25 border-rose-500/40 shadow-lg shadow-rose-950/30'
                            : 'bg-white/[0.03] border border-white/[0.08]'
                        }`}
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-[#172B3A] dark:text-[#F1F5F9]">{reg.sessionTitle}</h4>
                            {reg.status === 'rejected' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/30 text-rose-200 border border-rose-400/50 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-rose-300" />
                                Action Required
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-[var(--text-sec-70)]">
                            Amount: <strong>{reg.amount}</strong> • Voucher: <span className="font-mono text-[#64748B] dark:text-[#A8B5C7]">{reg.receiptFileName || 'receipt.pdf'}</span>
                          </p>

                          {/* Rejection Reason Feedback */}
                          {reg.status === 'rejected' && reg.receiptRejectedReason && (
                            <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-500/30 text-xs text-rose-200 space-y-0.5">
                              <span className="font-semibold text-rose-300 block text-[11px]">Admin Feedback / Rejection Reason:</span>
                              <p className="text-rose-100/90">{reg.receiptRejectedReason}</p>
                            </div>
                          )}

                          <p className="text-[11px] text-[var(--text-sec-60)]">
                            {reg.status === 'rejected'
                              ? '⚠️ Slip was rejected by Admin. Click "Re-upload Receipt" to upload a corrected screenshot or slip.'
                              : reg.status === 'approved'
                              ? '✓ Verified by Admin. Your seat and room access are officially confirmed.'
                              : 'Admin verifies bank receipts manually before confirming seat.'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                              reg.status === 'approved'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                                : reg.status === 'pending'
                                ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                                : 'bg-rose-950 text-rose-300 border border-rose-500/50'
                            }`}
                          >
                            Payment: {reg.status}
                          </span>

                          {/* Single-Click Re-upload Receipt Button for Rejected Slips */}
                          {reg.status === 'rejected' && (
                            <button
                              type="button"
                              onClick={() => {
                                setResubmitTarget(reg);
                                setNewReceiptFile(null);
                                setResubmitRemarks('');
                              }}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:brightness-110 text-white text-xs font-semibold cursor-pointer shadow-md shadow-rose-950/40 transition-all active:scale-95"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                              <span>Re-upload Slip</span>
                            </button>
                          )}

                          {/* Inspect Slip Modal Trigger */}
                          {reg.receiptFileName && (
                            <button
                              type="button"
                              onClick={() => setInspectReceipt(reg)}
                              className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs text-[var(--primary-accent)] flex items-center gap-1 cursor-pointer"
                              title="Inspect Receipt Document"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Inspect</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-Tab 3: My Certificates */}
              {studentTab === 'certificates' && (
                <div className="glass-panel p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-[#172B3A] dark:text-[#F1F5F9]">Your Earned Certificates</h3>
                    {onNavigateToCertificates && (
                      <button
                        type="button"
                        onClick={onNavigateToCertificates}
                        className="text-xs text-[var(--primary-accent)] hover:underline"
                      >
                        Open Certificate Portal →
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {certificates.map((cert) => (
                      <div
                        key={cert.id}
                        className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-500 dark:text-amber-300" />
                            <h4 className="text-sm font-semibold text-[#172B3A] dark:text-[#F1F5F9]">{cert.sessionTitle}</h4>
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

                  {/* SEMS Phase 3: Active Session Eligibility Progress */}
                  <div className="pt-4 border-t border-white/[0.08] space-y-3">
                    <h4 className="text-sm font-semibold text-[#172B3A] dark:text-[#F1F5F9]">
                      Enrolled Session Eligibility Checklist
                    </h4>
                    <p className="text-xs text-[var(--text-sec-70)]">
                      Certificates are issued automatically once Confirmed Registration, Payment Approval, Attendance, and Assignment are all satisfied.
                    </p>

                    <div className="space-y-2.5">
                      {myRegistrations.map((reg) => {
                        const elig = eligibilityService.evaluateCertificateEligibility(reg);

                        return (
                          <div
                            key={`elig-${reg.id}`}
                            className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2.5 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-[#172B3A] dark:text-[#F1F5F9]">{reg.sessionTitle}</span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                                  elig.eligible
                                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                                    : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                                }`}
                              >
                                {elig.eligible ? '✓ 4/4 Requirements Complete' : 'Requirements Pending'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                              <div
                                className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                                  elig.checks.registrationConfirmed
                                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                                    : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                                }`}
                              >
                                {elig.checks.registrationConfirmed ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-rose-400" />}
                                <span>Registration</span>
                              </div>

                              <div
                                className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                                  elig.checks.paymentApproved
                                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                                    : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                                }`}
                              >
                                {elig.checks.paymentApproved ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-rose-400" />}
                                <span>Payment</span>
                              </div>

                              <div
                                className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                                  elig.checks.attendanceCompleted
                                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                                    : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                                }`}
                              >
                                {elig.checks.attendanceCompleted ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-rose-400" />}
                                <span>Attendance</span>
                              </div>

                              <div
                                className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                                  elig.checks.assignmentCompleted
                                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                                    : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                                }`}
                              >
                                {elig.checks.assignmentCompleted ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-rose-400" />}
                                <span>Assignment</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-Tab 4: Tasks & Homework */}
              {studentTab === 'tasks' && (
                <div className="glass-panel p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-[#172B3A] dark:text-[#F1F5F9]">Society Tasks & Practical Homework</h3>
                      <p className="text-xs text-[var(--text-sec-70)]">
                        Completing required practical assignments unlocks official verified certificate eligibility.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        id: 'task-1',
                        sessionId: 'sess-1',
                        sessionTitle: 'Annual Robotics Symposium 2026',
                        title: 'Setup ROS2 Humble Workspace & Linux Bridge',
                        dueDate: '2026-10-20',
                        weight: 'Core Practical Milestone (Mandatory)',
                      },
                      {
                        id: 'task-2',
                        sessionId: 'sess-2',
                        sessionTitle: 'AI & Computer Vision Bootcamp',
                        title: 'Fine-tuning MobileNet & Confusion Matrix',
                        dueDate: '2026-11-05',
                        weight: 'Technical Engagement Milestone (Mandatory)',
                      },
                      {
                        id: 'task-3',
                        sessionId: 'sess-3',
                        sessionTitle: 'UI/UX Design Systems Workshop',
                        title: 'Component Tokenization & Dark Mode Tokens',
                        dueDate: '2026-11-12',
                        weight: 'Design System Practical',
                      },
                    ].map((taskItem) => {
                      const allSubmissions = eligibilityService.getTaskSubmissions();
                      const mySub = allSubmissions.find(
                        (sub) =>
                          sub.taskId === taskItem.id &&
                          ((currentUserEmail && sub.studentEmail?.toLowerCase() === currentUserEmail.toLowerCase()) ||
                            (myRegistrations[0]?.rollNumber && sub.studentRoll?.toLowerCase() === myRegistrations[0].rollNumber.toLowerCase()) ||
                            (currentUserName && sub.studentName?.toLowerCase() === currentUserName.toLowerCase()))
                      );

                      return (
                        <div
                          key={taskItem.id}
                          className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-[var(--primary-accent)] uppercase">
                                {taskItem.id.toUpperCase()}
                              </span>
                              <span className="text-[11px] text-purple-700 dark:text-purple-300 font-mono font-medium">
                                Due: {taskItem.dueDate}
                              </span>
                            </div>
                            <h4 className="text-sm font-semibold text-[#172B3A] dark:text-[#F1F5F9]">{taskItem.title}</h4>
                            <p className="text-xs text-[var(--text-sec-70)]">
                              {taskItem.sessionTitle} &bull; <span className="text-amber-700 dark:text-amber-200 font-medium">{taskItem.weight}</span>
                            </p>

                            {mySub && (
                              <div className="pt-1.5 flex items-center gap-2 text-xs">
                                <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1 font-medium">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Submitted {mySub.grade ? `(${mySub.grade})` : ''}</span>
                                </span>
                                {mySub.contentOrUrl && (
                                  <span className="font-mono text-[11px] text-[#64748B] dark:text-[#A8B5C7] truncate max-w-xs">
                                    {mySub.contentOrUrl}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setSubmitTaskTarget({
                                  taskId: taskItem.id,
                                  taskTitle: taskItem.title,
                                  sessionTitle: taskItem.sessionTitle,
                                  dueDate: taskItem.dueDate,
                                })
                              }
                              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-xs flex items-center gap-1.5 transition-all ${
                                mySub
                                  ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#172B3A] dark:text-[#F1F5F9] border border-slate-200 dark:border-slate-700'
                                  : 'bg-[#0F766E] hover:bg-[#115E59] text-white'
                              }`}
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span>{mySub ? 'Update Solution' : 'Submit Solution'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              PUBLIC / AVAILABLE SESSIONS LISTING
             ======================================================== */}
          {((currentRole !== 'student' && currentRole !== 'guest') || studentTab === 'available') && (
            <section id="upcoming-sessions-section" className="space-y-4">
              {/* Header + Search/Filter Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[var(--primary-accent)]" />
                  <h3 className="font-poppins font-semibold text-[18px] sm:text-[20px] text-[#172B3A] dark:text-[#F1F5F9]">
                    {(currentRole === 'guest' || currentRole === 'student')
                      ? 'Available Sessions'
                      : 'Scheduled Sessions'}
                  </h3>
                  {onNavigateToSessionsList && (
                    <button
                      type="button"
                      onClick={onNavigateToSessionsList}
                      className="text-xs font-inter text-[var(--primary-accent)] hover:underline ml-2 hidden sm:inline"
                    >
                      View all ({sessions.length}) →
                    </button>
                  )}
                </div>

                {/* Quick Search */}
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

              {/* Cards Grid */}
              {filteredSessions.length === 0 ? (
                <div className="glass-panel p-12 text-center space-y-3 rounded-2xl">
                  <Inbox className="w-10 h-10 text-[var(--text-sec-60)] mx-auto" />
                  <p className="font-inter text-sm text-[#172B3A] dark:text-[#F1F5F9] font-medium">No sessions found</p>
                  <p className="font-inter text-xs text-[var(--text-sec-70)]">
                    No sessions match "{filterQuery}".
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

          {/* Quick Modal fallback for session view */}
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

          {/* Receipt inspection modal */}
          {inspectReceipt && (
            <div
              onClick={(e) => {
                if (e.target === e.currentTarget) setInspectReceipt(null);
              }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
            >
              <div
                className="w-full max-w-md p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#111C2D] space-y-4 shadow-2xl"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="font-poppins font-semibold text-[#172B3A] dark:text-[#F1F5F9] text-base">
                    Receipt Verification
                  </h4>
                  <button
                    type="button"
                    onClick={() => setInspectReceipt(null)}
                    className="p-1 rounded-lg text-[#64748B] dark:text-[#A8B5C7] hover:text-[#172B3A] dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 text-xs font-inter text-[#172B3A] dark:text-[#F1F5F9]">
                  <p><strong className="text-[#64748B] dark:text-[#A8B5C7]">Student:</strong> {inspectReceipt.name} ({inspectReceipt.rollNumber})</p>
                  <p><strong className="text-[#64748B] dark:text-[#A8B5C7]">Session:</strong> {inspectReceipt.sessionTitle}</p>
                  <p><strong className="text-[#64748B] dark:text-[#A8B5C7]">Fee:</strong> {inspectReceipt.amount}</p>
                  <p><strong className="text-[#64748B] dark:text-[#A8B5C7]">File:</strong> {inspectReceipt.receiptFileName || 'receipt.pdf'}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <FileText className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="text-xs text-[#172B3A] dark:text-[#F1F5F9] font-medium">Transaction Verified Document</p>
                  <span className="text-[10px] font-mono text-[#0F766E] dark:text-[#2DD4BF] font-semibold">PKR-TRX-AUTH-PASS</span>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      handleQuickStatusChange(inspectReceipt.id, 'approved');
                      setInspectReceipt(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs cursor-pointer shadow-xs transition-colors"
                  >
                    Approve Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleQuickStatusChange(inspectReceipt.id, 'rejected');
                      setInspectReceipt(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs cursor-pointer shadow-xs transition-colors"
                  >
                    Reject Payment
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Student Re-upload Receipt Modal (Group 2 Workflow) */}
          {resubmitTarget && (
            <div
              onClick={(e) => {
                if (e.target === e.currentTarget) setResubmitTarget(null);
              }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
            >
              <div
                className="w-full max-w-lg p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#111C2D] space-y-4 shadow-2xl relative"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-poppins font-semibold text-[#172B3A] dark:text-[#F1F5F9] text-base">
                        Re-upload Payment Slip
                      </h4>
                      <p className="text-xs text-[#64748B] dark:text-[#A8B5C7]">
                        {resubmitTarget.sessionTitle}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setResubmitTarget(null);
                      setNewReceiptFile(null);
                      setReceiptUploadError(null);
                      setResubmitRemarks('');
                    }}
                    className="p-1.5 rounded-lg text-[#64748B] dark:text-[#A8B5C7] hover:text-[#172B3A] dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {resubmitTarget.receiptRejectedReason && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Reason for Rejection</span>
                    </div>
                    <p className="text-xs text-rose-800 dark:text-rose-200 pl-5">
                      {resubmitTarget.receiptRejectedReason}
                    </p>
                  </div>
                )}

                <form onSubmit={handleConfirmResubmitReceipt} className="space-y-4">
                  <div className="space-y-1.5 text-xs text-[#172B3A] dark:text-[#F1F5F9]">
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-[#64748B] dark:text-[#A8B5C7]">Student</span>
                      <span className="font-medium text-[#172B3A] dark:text-[#F1F5F9]">{resubmitTarget.name} ({resubmitTarget.rollNumber})</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-[#64748B] dark:text-[#A8B5C7]">Required Amount</span>
                      <span className="font-medium text-emerald-700 dark:text-emerald-400 font-mono">{resubmitTarget.amount}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#64748B] dark:text-[#A8B5C7]">Previous Voucher</span>
                      <span className="font-mono text-[#64748B] dark:text-[#A8B5C7]">{resubmitTarget.receiptFileName || 'receipt.pdf'}</span>
                    </div>
                  </div>

                  {/* Upload Drop Zone */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#172B3A] dark:text-[#F1F5F9]">
                      Upload Corrected Receipt (PNG, JPG, or PDF max 5MB)
                    </label>
                    <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#0F766E] dark:hover:border-[#2DD4BF] rounded-xl cursor-pointer bg-slate-50/60 dark:bg-slate-900/30 transition-all">
                      <UploadCloud className="w-8 h-8 text-[#0F766E] dark:text-[#2DD4BF] mb-2" />
                      {newReceiptFile ? (
                        <div className="text-center space-y-1">
                          <span className="text-xs font-semibold text-[#172B3A] dark:text-[#F1F5F9] block">
                            {newReceiptFile.name}
                          </span>
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                            Ready to submit ({(newReceiptFile.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                      ) : (
                        <div className="text-center space-y-0.5">
                          <span className="text-xs font-medium text-[#172B3A] dark:text-[#F1F5F9]">
                            Click or drag new slip here
                          </span>
                          <p className="text-[10px] text-[#64748B] dark:text-[#A8B5C7]">
                            Clear photo or scanned PDF of bank deposit / payment receipt
                          </p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const validExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
                            const ext = file.name.split('.').pop()?.toLowerCase() || '';
                            if (!validExtensions.includes(ext)) {
                              setReceiptUploadError('Invalid format. Allowed files: PDF, JPG, or PNG.');
                              setNewReceiptFile(null);
                              onNotify('Invalid format: Please upload a PDF, JPG, or PNG receipt.');
                              return;
                            }
                            if (file.size > 5 * 1024 * 1024) {
                              setReceiptUploadError('Receipt file exceeds 5 MB maximum allowed size.');
                              setNewReceiptFile(null);
                              onNotify('File too large: Maximum 5 MB allowed.');
                              return;
                            }
                            setReceiptUploadError(null);
                            setNewReceiptFile(file);
                          }
                        }}
                      />
                    </label>
                    {receiptUploadError && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-inter mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{receiptUploadError}</span>
                      </p>
                    )}
                  </div>

                  {/* Optional Student Remarks */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-[#172B3A] dark:text-[#F1F5F9]">
                      Note for Admin (Optional)
                    </label>
                    <input
                      type="text"
                      value={resubmitRemarks}
                      onChange={(e) => setResubmitRemarks(e.target.value)}
                      placeholder="e.g. Uploaded high-resolution slip with clear TRX ID"
                      className="w-full h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs text-[#172B3A] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0F766E] dark:focus:border-[#2DD4BF]"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setResubmitTarget(null);
                        setNewReceiptFile(null);
                        setReceiptUploadError(null);
                        setResubmitRemarks('');
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-[#172B3A] dark:text-[#F1F5F9] font-medium cursor-pointer transition-colors border border-slate-200 dark:border-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newReceiptFile || isResubmitting}
                      className="flex-1 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] disabled:opacity-50 disabled:cursor-not-allowed text-xs text-white font-medium cursor-pointer shadow-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      {isResubmitting ? (
                        <span>Submitting...</span>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Submit Corrected Slip</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Group 4: Official Digital Event Pass / E-Ticket Modal */}
          {digitalPassTarget && (
            <GuestDigitalPassModal
              isOpen={true}
              registrant={digitalPassTarget}
              session={sessions.find((s) => s.id === digitalPassTarget.sessionId)}
              onClose={() => setDigitalPassTarget(null)}
              onNotify={onNotify}
            />
          )}

          {/* Group 4: Practical Task & Assignment Submission Modal */}
          {submitTaskTarget && (
            <SubmitTaskModal
              isOpen={true}
              taskId={submitTaskTarget.taskId}
              taskTitle={submitTaskTarget.taskTitle}
              sessionTitle={submitTaskTarget.sessionTitle}
              dueDate={submitTaskTarget.dueDate}
              studentName={currentUserName || myRegistrations[0]?.name || 'Enrolled Student'}
              studentRoll={myRegistrations[0]?.rollNumber || '2024-CS-01'}
              studentEmail={currentUserEmail || myRegistrations[0]?.email}
              onClose={() => setSubmitTaskTarget(null)}
              onSubmitSuccess={() => {
                setTimelineRefresh((v) => v + 1);
              }}
              onNotify={onNotify}
            />
          )}
        </div>
      )}
    </div>
  );
};
