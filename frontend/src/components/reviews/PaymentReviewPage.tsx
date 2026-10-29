/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getFeeStatus } from '../../utils/feeStatus';
import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  X,
  Filter,
  Search,
  Eye,
  AlertTriangle,
  AlertCircle,
  UploadCloud,
  FileText,
  Award,
  CheckCircle2,
  XCircle,
  Info,
  Clock,
  CheckSquare,
  Square,
  RotateCcw,
} from 'lucide-react';
import {
  RegistrantItem,
  DashboardRole,
  PaymentStatus,
  SessionItem,
} from '../../types';
import { eligibilityService } from '../../services/eligibilityService';
import { eventService } from '../../services/eventService';
import { registrationApi } from '../../services/registrationApi';
import { validateReceiptFile } from '../../utils/validators';

interface PaymentReviewPageProps {
  currentRole: DashboardRole;
  registrants: RegistrantItem[];
  currentUserEmail?: string;
  currentUserName?: string;
  onReloadRegistrants?: () => Promise<void>;
  onBack: () => void;
  onSelectRole?: (role: DashboardRole) => void;
  onNotify: (msg: string) => void;
  onNavigateToSession?: (sessionId: string) => void;
  isLoading?: boolean;
}

import { EmptyState } from '../EmptyState';
import { SkeletonState } from '../SkeletonState';

export const PaymentReviewPage: React.FC<PaymentReviewPageProps> = ({
  currentRole,
  registrants,
  currentUserEmail,
  currentUserName,
  onReloadRegistrants,
  onBack,
  onNotify,
  onNavigateToSession,
  isLoading = false,
}) => {
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'paid_approved' | 'pending' | 'rejected'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<RegistrantItem | null>(null);
  const [receiptObjectUrl, setReceiptObjectUrl] = useState<string | null>(null);
  const [selectedRegistrantIds, setSelectedRegistrantIds] = useState<string[]>([]);
  const [attendanceOverrides, setAttendanceOverrides] = useState<Record<string, boolean>>({});
  const [attendanceUpdatingIds, setAttendanceUpdatingIds] = useState<string[]>([]);

  // Rejection reason modal state
  const [rejectingItem, setRejectingItem] = useState<RegistrantItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Resubmission modal state (for students/guests)
  const [resubmittingItem, setResubmittingItem] = useState<RegistrantItem | null>(null);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [replacementError, setReplacementError] = useState<string | null>(null);
  const resubmitFileInputRef = useRef<HTMLInputElement>(null);

  // Eligibility inspection modal state
  const [inspectingEligibility, setInspectingEligibility] = useState<{
    registrant: RegistrantItem;
    result: ReturnType<typeof eligibilityService.evaluateCertificateEligibility>;
  } | null>(null);

  const canReview = currentRole === 'super_admin' || currentRole === 'admin';
  // Escape key handler for all PaymentReviewPage modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (selectedReceipt) setSelectedReceipt(null);
        else if (rejectingItem) setRejectingItem(null);
        else if (resubmittingItem) setResubmittingItem(null);
        else if (inspectingEligibility) setInspectingEligibility(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedReceipt, rejectingItem, resubmittingItem, inspectingEligibility]);

  useEffect(() => {
    let active = true;
    if (!selectedReceipt) {
      setReceiptObjectUrl(null);
      return () => undefined;
    }

    registrationApi
      .openReceipt(selectedReceipt.id)
      .then((blob) => {
        if (active) setReceiptObjectUrl(URL.createObjectURL(blob));
      })
      .catch((error: any) => {
        if (active) onNotify(error?.message || 'Failed to open receipt.');
      });

    return () => {
      active = false;
      setReceiptObjectUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    };
  }, [selectedReceipt, onNotify]);

  const toggleSelectAll = (list: RegistrantItem[]) => {
    if (selectedRegistrantIds.length === list.length && list.length > 0) {
      setSelectedRegistrantIds([]);
    } else {
      setSelectedRegistrantIds(list.map((r) => r.id));
    }
  };

  const toggleSelectRegistrant = (id: string) => {
    setSelectedRegistrantIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const renderStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-inter font-medium bg-amber-950/70 text-amber-300 border border-amber-500/50">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
            <span>Pending Review</span>
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-inter font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-500/50">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
            <span>Confirmed</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-inter font-medium bg-rose-950/70 text-rose-300 border border-rose-500/50">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f87171]" />
            <span>Rejected</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-inter font-medium bg-white/10 text-white/60 border border-white/20">
            <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
            <span>Cancelled</span>
          </span>
        );
    }
  };

  const handleApprove = async (registrant: RegistrantItem) => {
    if (!canReview) return;
    try {
      await registrationApi.approve(registrant.id);
      await onReloadRegistrants?.();
      onNotify('Payment approved.');
    } catch (error: any) {
      onNotify(error?.message || 'Failed to approve payment.');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    const reason = rejectionReason.trim();
    if (reason.length < 3 || reason.length > 300) {
      onNotify('Rejection reason must be between 3 and 300 characters.');
      return;
    }
    try {
      await registrationApi.reject(rejectingItem.id, reason);
      await onReloadRegistrants?.();
      onNotify('Payment rejected.');
      setRejectingItem(null);
      setRejectionReason('');
    } catch (error: any) {
      onNotify(error?.message || 'Failed to reject payment.');
    }
  };

  const handleConfirmResubmission = async () => {
    if (!resubmittingItem || !replacementFile) return;

    const fileError = validateReceiptFile(replacementFile);
    if (fileError) {
      onNotify(fileError);
      return;
    }

    try {
      await registrationApi.uploadReceipt(resubmittingItem.id, replacementFile);
      await onReloadRegistrants?.();
      onNotify('Replacement receipt submitted for review.');
    } catch (err: any) {
      onNotify(err?.message || 'Failed to upload replacement receipt.');
    } finally {
      setResubmittingItem(null);
      setReplacementFile(null);
    }
  };

  const handleCancel = async (registrant: RegistrantItem) => {
    try {
      await registrationApi.cancel(registrant.id);
      await onReloadRegistrants?.();
      onNotify(`Registration for "${registrant.sessionTitle}" cancelled.`);
    } catch (error: any) {
      onNotify(error?.message || 'Failed to cancel registration.');
    }
  };

  const handleAttendanceChange = async (registrant: RegistrantItem, attended: boolean) => {
    if (!canReview || registrant.backendStatus !== 'CONFIRMED') return;

    setAttendanceUpdatingIds((current) => [...current, registrant.id]);
    try {
      const updated = await registrationApi.setAttendance(registrant.id, attended);
      setAttendanceOverrides((current) => ({
        ...current,
        [registrant.id]: updated.attended === true,
      }));
      onNotify(`Attendance ${attended ? 'marked' : 'cleared'}.`);
    } catch (error: any) {
      onNotify(error?.message || 'Failed to update attendance.');
    } finally {
      setAttendanceUpdatingIds((current) => current.filter((id) => id !== registrant.id));
    }
  };

  // Strictly isolate registrations: students and guests see ONLY their own records
  const accessibleRegistrants: RegistrantItem[] = useMemo(() => {
    if (canReview) {
      return registrants;
    }

    const emailLower = (
      currentUserEmail ||
      (currentRole === 'student' ? 'student@university.edu.pk' : 'guest@university.edu.pk')
    ).toLowerCase().trim();
    const nameLower = (currentUserName || (currentRole === 'student' ? 'jordan lee' : '')).toLowerCase().trim();
    const isStudentRole = currentRole === 'student';
    const isGuestRole = currentRole === 'guest';

    const isJordanUser =
      !currentUserEmail ||
      currentUserEmail.toLowerCase().trim() === 'student@university.edu.pk' ||
      currentUserEmail.toLowerCase().trim() === 'jordan.lee@university.edu.pk' ||
      currentUserEmail.toLowerCase().trim() === 'sportszaab@gmail.com' ||
      nameLower === 'jordan lee';

    const isSarahUser =
      !currentUserEmail ||
      currentUserEmail.toLowerCase().trim() === 'sarah.connor@industrytech.io' ||
      currentUserEmail.toLowerCase().trim() === 'sarahconnor.ai@gmail.com' ||
      nameLower.includes('sarah');

    return registrants.filter((r: RegistrantItem) => {
      // 1. Direct email or full name match
      const matchesDirectEmail =
        (r.email && r.email.toLowerCase().trim() === emailLower) ||
        (r.primaryEmail && r.primaryEmail.toLowerCase().trim() === emailLower) ||
        (r.secondaryEmail && r.secondaryEmail.toLowerCase().trim() === emailLower);

      if (matchesDirectEmail) return true;

      const matchesDirectName = nameLower && r.name.toLowerCase().trim() === nameLower;
      if (matchesDirectName) return true;

      // 2. Demo student Jordan Lee identity (Roll No: 2024-CS-42 / 2024-CS-042 / FA23-BCS-042)
      // ONLY runs if the logged-in user IS Jordan or demo student
      if (isStudentRole && isJordanUser) {
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

      // 3. Demo guest identity (Dr. Sarah Connor) - ONLY if the logged-in user is Sarah or demo guest
      if (isGuestRole && isSarahUser) {
        return (
          r.isGuest ||
          r.email?.toLowerCase().trim() === 'sarah.connor@industrytech.io' ||
          r.secondaryEmail?.toLowerCase().trim() === 'sarahconnor.ai@gmail.com' ||
          (r.name.toLowerCase().includes('sarah') && r.name.toLowerCase().includes('connor'))
        );
      }

      return false;
    });
  }, [registrants, canReview, currentUserEmail, currentUserName, currentRole]);

  const filteredRegistrants: RegistrantItem[] = useMemo(() => {
    return accessibleRegistrants.filter((r: RegistrantItem) => {
      let matchesFilter = true;
      const isPaidOrFree = r.status === 'approved' || r.amount?.includes('Free') || r.amount === '0';
      switch (filterStatus) {
        case 'paid_approved':
          matchesFilter = isPaidOrFree;
          break;
        case 'pending':
          matchesFilter = r.status === 'pending';
          break;
        case 'rejected':
          matchesFilter = r.status === 'rejected';
          break;
        case 'all':
        default:
          matchesFilter = true;
          break;
      }

      const matchesSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.sessionTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.rollNumber.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [accessibleRegistrants, filterStatus, searchQuery]);

  return (
    <div id="payment-review-page" className="w-full space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.10]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-poppins font-semibold text-2xl text-white">
              {canReview ? 'Registrants & Payment Review' : 'My Registration Status'}
            </h1>
            <p className="text-xs font-inter text-[var(--text-sec-80)] mt-0.5">
              {canReview
                ? 'Verify payment receipts and track certificate eligibility.'
                : 'Track your registered sessions and fee payment confirmation status.'}
            </p>
          </div>
        </div>
      </div>

      {/* Search, Filter Pills & Bulk Action Bar */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-[var(--primary-accent)] text-white shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              All Registered ({accessibleRegistrants.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('paid_approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                filterStatus === 'paid_approved'
                  ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Paid / Approved Only ({accessibleRegistrants.filter((r) => r.status === 'approved' || r.amount?.includes('Free') || r.amount === '0').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                filterStatus === 'pending'
                  ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40 shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Payment Pending ({accessibleRegistrants.filter((r) => r.status === 'pending').length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search attendee, roll no, session..."
              className="w-full h-10 pl-9 pr-8 rounded-xl bg-white/[0.05] border border-white/[0.12] text-xs text-white placeholder-white/40 focus:outline-none focus:border-[var(--primary-accent)]"
            />
            <p className="text-[11px] text-white/50 text-right">{rejectionReason.length} / 300</p>
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
        </div>

      </div>

      {/* Registrations List Section */}
      {isLoading ? (
        <SkeletonState variant="table" count={5} />
      ) : filteredRegistrants.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No registrations found"
          description={
            searchQuery
              ? `No attendee records match the search query "${searchQuery}".`
              : 'No registrations or payment verification records match the selected status filter.'
          }
          actionLabel="Reset Filters"
          onAction={() => {
            setSearchQuery('');
            setFilterStatus('all');
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* Mobile Screens (sm:hidden): Clean Visual Card Layout */}
          <div className="sm:hidden space-y-3">
            {filteredRegistrants.map((reg) => {
              const eligibility = eligibilityService.evaluateCertificateEligibility(reg);
              const passedChecks = [
                eligibility.checks.registrationConfirmed,
                eligibility.checks.paymentApproved,
                eligibility.checks.attendanceCompleted,
                eligibility.checks.assignmentCompleted,
              ].filter(Boolean).length;

              const allSessions = eventService.getAllSessions();
              const session =
                allSessions.find((s) => s.id === reg.sessionId) ||
                ({
                  id: reg.sessionId,
                  title: reg.sessionTitle,
                  eventId: reg.eventId || 'evt-1',
                  society: 'University Society',
                  date: '2026-10-15',
                  time: '14:00 – 17:30',
                  location: 'Main Engineering Hall A-102',
                  status: 'open',
                  isPaid:
                    reg.amount &&
                    !reg.amount.includes('0') &&
                    !reg.amount.toLowerCase().includes('free'),
                  amount: reg.amount && !reg.amount.includes('0') ? 500 : 0,
                } as SessionItem);

              const isSessionClosed = session.status === 'closed';
              const isPaidSession =
                !!session.isPaid ||
                (reg.amount &&
                  !reg.amount.includes('0') &&
                  !reg.amount.toLowerCase().includes('free'));
              const isRegistrationPending =
                reg.lifecycleStatus === 'FORM_IN_PROGRESS' ||
                reg.lifecycleStatus === 'SUBMITTED';

              return (
                <div
                  key={reg.id}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3 shadow-md"
                >
                  {/* Top Bar: Name, Roll No & Fee Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-poppins font-medium text-white text-sm flex items-center gap-2">
                        <span>{reg.name}</span>
                        {reg.rollNumber && (
                          <span className="font-mono text-[10px] text-cyan-300 bg-white/[0.06] px-1.5 py-0.5 rounded">
                            {reg.rollNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--text-sec-70)] mt-0.5">
                        {reg.department || 'Undergraduate Member'} • {reg.email || reg.primaryEmail}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-white/[0.08] text-white font-mono text-xs font-semibold shrink-0">
                      {getFeeStatus(reg, !!isPaidSession).label}
                    </span>
                  </div>

                  {/* Session Title & Society */}
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs">
                    <span className="text-white font-medium block line-clamp-1">{reg.sessionTitle}</span>
                    <span className="text-[11px] text-[var(--text-sec-60)] block mt-0.5">
                      {session.society} • {session.date} ({session.time})
                    </span>
                  </div>

                  {/* Status & Slip row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                    <div>{renderStatusBadge(reg.status)}</div>
                    {reg.receiptFileName ? (
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(reg)}
                        className="flex items-center gap-1 text-cyan-300 hover:underline font-mono text-[11px] py-1 px-2 rounded-lg bg-cyan-950/40 border border-cyan-500/30 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Slip</span>
                      </button>
                    ) : (
                      <span className="text-white/40 text-[11px] italic">No slip needed</span>
                    )}
                  </div>

                  {/* Rejection Reason notice if rejected */}
                  {reg.status === 'rejected' && reg.receiptRejectedReason && (
                    <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-500/30 text-xs text-rose-200">
                      <strong>Rejection Note:</strong> {reg.receiptRejectedReason}
                    </div>
                  )}

                  {/* Eligibility Badge */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/[0.06] text-xs">
                    <span className="text-[11px] text-[var(--text-sec-60)]">Certificate:</span>
                    <button
                      type="button"
                      onClick={() => setInspectingEligibility({ registrant: reg, result: eligibility })}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                        eligibility.eligible
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                          : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                      }`}
                    >
                      <Award className="w-3 h-3" />
                      <span>{eligibility.eligible ? 'Eligible (4/4)' : `Pending (${passedChecks}/4)`}</span>
                    </button>
                  </div>

                  {/* Mobile Actions Toolbar */}
                  <div className="pt-2 border-t border-white/[0.08]">
                    {canReview ? (
                      <div className="space-y-2">
                        {reg.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleApprove(reg)}
                              className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer transition-all active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingItem(reg);
                                setRejectionReason('');
                              }}
                              className="flex-1 py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : reg.status === 'rejected' ? (
                          <div className="text-center text-xs text-rose-300 font-medium py-1">
                            Rejected • Waiting for Student Resubmission
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      /* Student / Guest Mobile Actions */
                      <div>
                        {reg.status === 'rejected' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setResubmittingItem(reg);
                              setReplacementFile(null);
                            }}
                            className="w-full py-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer transition-all active:scale-95"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Re-upload Payment Slip</span>
                          </button>
                        ) : isSessionClosed ? (
                          <div className="text-center text-xs text-white/50 py-1">Session Closed</div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop & Tablet Screens (hidden sm:block): Full Tabular Format */}
          <div className="hidden sm:block glass-panel rounded-2xl overflow-hidden border border-white/[0.08]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.04] border-b border-white/[0.08] text-[var(--text-sec-70)] font-medium">
                  <tr>
                    {canReview && (
                      <th className="py-3 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={
                            selectedRegistrantIds.length === filteredRegistrants.length &&
                            filteredRegistrants.length > 0
                          }
                          onChange={() => toggleSelectAll(filteredRegistrants)}
                          className="rounded accent-[var(--primary-accent)] cursor-pointer"
                          title="Select / Deselect All Filtered"
                        />
                      </th>
                    )}
                    <th className="py-3 px-4">Attendee</th>
                    <th className="py-3 px-4">Session & Fee</th>
                    <th className="py-3 px-4">Receipt Slip</th>
                    <th className="py-3 px-4">Status & Schema</th>
                    <th className="py-3 px-4">Attended</th>
                    <th className="py-3 px-4">Certificate Eligibility</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filteredRegistrants.map((reg) => {
                  const eligibility = eligibilityService.evaluateCertificateEligibility(reg);
                  const passedChecks = [
                    eligibility.checks.registrationConfirmed,
                    eligibility.checks.paymentApproved,
                    eligibility.checks.attendanceCompleted,
                    eligibility.checks.assignmentCompleted,
                  ].filter(Boolean).length;

                  const allSessions = eventService.getAllSessions();
                  const session =
                    allSessions.find((s) => s.id === reg.sessionId) ||
                    ({
                      id: reg.sessionId,
                      title: reg.sessionTitle,
                      eventId: reg.eventId || 'evt-1',
                      society: 'University Society',
                      date: '2026-10-15',
                      time: '14:00 – 17:30',
                      location: 'Main Engineering Hall A-102',
                      status: 'open',
                      isPaid:
                        reg.amount &&
                        !reg.amount.includes('0') &&
                        !reg.amount.toLowerCase().includes('free'),
                      amount: reg.amount && !reg.amount.includes('0') ? 500 : 0,
                    } as SessionItem);

                  const isSessionClosed = session.status === 'closed';
                  const isPaidSession =
                    !!session.isPaid ||
                    (reg.amount &&
                      !reg.amount.includes('0') &&
                      !reg.amount.toLowerCase().includes('free'));
                  const isPaymentPending = reg.backendStatus === 'PAYMENT_PENDING';
                  const isPaymentRejected = reg.backendStatus === 'PAYMENT_REJECTED';
                  const isRegistrationPending =
                    reg.lifecycleStatus === 'FORM_IN_PROGRESS' ||
                    reg.lifecycleStatus === 'SUBMITTED';

                  return (
                    <tr
                      key={reg.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        selectedRegistrantIds.includes(reg.id) ? 'bg-purple-950/20' : ''
                      }`}
                    >
                      {canReview && (
                        <td className="py-3.5 px-3">
                          <input
                            type="checkbox"
                            checked={selectedRegistrantIds.includes(reg.id)}
                            onChange={() => toggleSelectRegistrant(reg.id)}
                            className="rounded accent-[var(--primary-accent)] cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="py-3.5 px-4">
                        <div className="font-poppins font-medium text-white flex items-center gap-2">
                          <span>{reg.name}</span>
                          {reg.isGuest && (
                            <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded font-mono">
                              Guest
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-[var(--text-sec-70)]">
                          {reg.rollNumber} • {reg.primaryEmail || reg.email}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-white font-medium">{reg.sessionTitle}</div>
                        <div className="text-[11px] text-amber-300 font-mono">
                          {getFeeStatus(reg, !!isPaidSession).label}
                        </div>
                        {onNavigateToSession && (
                          <button
                            type="button"
                            onClick={() => onNavigateToSession(reg.sessionId)}
                            className="text-[11px] text-[var(--primary-accent)] hover:underline inline-flex items-center gap-1 mt-0.5 cursor-pointer font-medium"
                          >
                            <span>Open Session Page →</span>
                          </button>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {reg.receiptFileName ? (
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(reg)}
                            className="flex items-center gap-1.5 text-cyan-300 hover:text-cyan-200 hover:underline cursor-pointer font-mono text-[11px]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[140px]">{reg.receiptFileName}</span>
                          </button>
                        ) : (
                          <span className="text-white/40 text-[11px] italic">
                            {reg.backendStatus === 'PAYMENT_PENDING' || reg.backendStatus === 'PAYMENT_REJECTED'
                              ? 'No receipt uploaded'
                              : 'No slip required / free'}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 space-y-1">
                        <div>{renderStatusBadge(reg.status)}</div>
                        <div className="text-[10px] font-mono text-white/50">
                          Schema V{reg.formVersionUsed || 1}
                        </div>
                        {reg.status === 'rejected' && reg.receiptRejectedReason && (
                          <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-500/30 text-[11px] text-rose-200">
                            <strong>Reason:</strong> {reg.receiptRejectedReason}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {reg.backendStatus === 'CONFIRMED' ? (
                          <label className="inline-flex items-center gap-2 text-[11px] text-white/70">
                            <input
                              type="checkbox"
                              checked={attendanceOverrides[reg.id] ?? reg.attended === true}
                              disabled={attendanceUpdatingIds.includes(reg.id)}
                              onChange={(event) => handleAttendanceChange(reg, event.target.checked)}
                              className="rounded accent-[var(--primary-accent)] cursor-pointer disabled:cursor-wait"
                              aria-label={`Mark ${reg.name} as attended`}
                            />
                            <span>{(attendanceOverrides[reg.id] ?? reg.attended === true) ? 'Yes' : 'No'}</span>
                          </label>
                        ) : (
                          <span className="text-white/40">-</span>
                        )}
                      </td>

                      {/* SEMS Phase 3: Centralized Eligibility Column */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => setInspectingEligibility({ registrant: reg, result: eligibility })}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:scale-105 border ${
                            eligibility.eligible
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                              : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                          }`}
                          title="Click to inspect 4-point SEMS eligibility details"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>{eligibility.eligible ? 'Eligible (4/4)' : `Ineligible (${passedChecks}/4)`}</span>
                          <Info className="w-3 h-3 opacity-60" />
                        </button>
                        <div className="text-[10px] text-[var(--text-sec-60)] mt-0.5 max-w-[180px] truncate">
                          {eligibility.eligible ? 'Ready for certificate' : eligibility.reasons[0] || 'Requirements pending'}
                        </div>
                      </td>

                    <td className="py-3.5 px-4 text-right">
                      {canReview ? (
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="flex items-center justify-end gap-1.5">
                            {reg.status !== 'approved' && (
                              <button
                                type="button"
                                onClick={() => handleApprove(reg)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs cursor-pointer flex items-center gap-1 shadow"
                                title="Approve fee receipt & confirm registration"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve Payment</span>
                              </button>
                            )}

                            {reg.status !== 'rejected' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingItem(reg);
                                  setRejectionReason('');
                                }}
                                className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs cursor-pointer flex items-center gap-1"
                                title="Reject receipt with reason (allows resubmission)"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            )}
                          </div>

                        </div>
                      ) : (
                        /* Student & Guest View in My Registrations */
                        <div className="flex flex-col items-end gap-1.5">
                          {reg.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => handleCancel(reg)}
                              className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-white/80 text-xs cursor-pointer"
                            >
                              Cancel Registration
                            </button>
                          )}
                          {isSessionClosed ? (
                            /* State 1: Session Completed */
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-inter font-medium bg-white/10 text-white/60 border border-white/20">
                              <span>🏁 Session Completed</span>
                            </span>
                          ) : isRegistrationPending ? (
                            /* State 2: Registration Pending */
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-inter font-medium bg-amber-950/70 text-amber-300 border border-amber-500/40">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Registration Pending</span>
                            </span>
                          ) : isPaymentPending ? (
                            /* State 3: Payment Pending (Paid session, payment under review) */
                            <div className="text-right space-y-0.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-inter font-medium bg-amber-950/70 text-amber-300 border border-amber-500/40">
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                <span>Payment Pending</span>
                              </span>
                              <span className="block text-[10px] text-amber-200/70">
                                Access becomes available after verification
                              </span>
                              {!reg.receiptFileName && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setResubmittingItem(reg);
                                    setReplacementFile(null);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-[var(--primary-accent)] text-white text-xs font-medium cursor-pointer"
                                >
                                  Upload receipt
                                </button>
                              )}
                            </div>
                          ) : isPaymentRejected ? (
                            /* State 4: Payment Rejected */
                            <div className="flex flex-col items-end gap-1.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-inter font-medium bg-rose-950/70 text-rose-300 border border-rose-500/40">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                <span>Payment Rejected</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setResubmittingItem(reg);
                                  setReplacementFile(null);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[var(--primary-accent)] hover:brightness-110 text-white text-xs font-medium cursor-pointer shadow"
                              >
                                Resubmit Slip
                              </button>
                            </div>
                          ) : null}
                        </div>
                      )}
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

      {/* Private Receipt Inspection Modal */}
      {selectedReceipt && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedReceipt(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
        >
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 space-y-4 border border-white/[0.15]">
            <div className="flex items-center justify-between border-b border-white/[0.10] pb-3">
              <div>
                <h3 className="font-poppins font-medium text-base text-white">Private Payment Receipt Inspection</h3>
                <p className="text-xs text-[var(--text-sec-70)]">
                  {selectedReceipt.name} • {selectedReceipt.sessionTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="p-1.5 rounded-xl text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-white/[0.10] bg-black/40 max-h-[360px] flex items-center justify-center p-2">
              {receiptObjectUrl ? (
                <img
                  src={receiptObjectUrl}
                  alt="Payment Receipt Slip"
                  className="max-h-[340px] w-auto object-contain rounded-lg"
                />
              ) : (
                <div className="p-8 text-center text-xs text-white/50">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-white/40" />
                  <span>Document stored privately in protected storage</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.10]">
              <span className="text-[11px] font-mono text-[var(--text-sec-60)]">
                Fee: {getFeeStatus(selectedReceipt, true).label}
              </span>
              <div className="flex items-center gap-2">
                {receiptObjectUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(receiptObjectUrl, '_blank', 'noopener,noreferrer')}
                    className="px-4 py-2 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 text-xs text-white cursor-pointer"
                  >
                    Open Receipt
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingItem && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setRejectingItem(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
        >
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 space-y-4 border border-rose-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-poppins font-medium text-base text-white">Specify Rejection Reason</h3>
                <p className="text-xs text-[var(--text-sec-70)]">
                  Participant will see this reason and may resubmit their slip.
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block text-white font-medium">Rejection Reason <span className="text-rose-400">*</span></label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value.slice(0, 300))}
                placeholder="e.g. Transaction ID was truncated; deposited amount does not match session fee (PKR 500)."
                className="w-full p-3 rounded-xl bg-white/[0.06] border border-white/[0.15] text-white focus:outline-none focus:border-rose-400 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.10]">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.08] text-xs text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white cursor-pointer shadow"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Resubmission Modal */}
      {resubmittingItem && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setResubmittingItem(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
        >
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 space-y-4 border border-white/[0.15]">
            <h3 className="font-poppins font-medium text-base text-white">Resubmit Payment Verification Slip</h3>
            <p className="text-xs text-[var(--text-sec-70)]">
              Upload a clear bank transfer or mobile voucher receipt (max 5 MB).
            </p>

            <div
              onClick={() => resubmitFileInputRef.current?.click()}
              className="p-6 rounded-2xl border-2 border-dashed border-white/20 hover:border-white/40 text-center cursor-pointer space-y-1"
            >
              <input
                type="file"
                ref={resubmitFileInputRef}
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const fileError = validateReceiptFile(file);
                    if (fileError) {
                      setReplacementError(fileError);
                      setReplacementFile(null);
                      onNotify(fileError);
                      return;
                    }
                    setReplacementError(null);
                    setReplacementFile(file);
                  }
                }}
                className="hidden"
              />
              <UploadCloud className="w-7 h-7 mx-auto text-[var(--primary-accent)]" />
              <p className="text-xs text-white font-medium">
                {replacementFile ? replacementFile.name : 'Click to select replacement receipt file'}
              </p>
              <p className="text-[11px] text-[var(--text-sec-60)]">PDF, JPG, PNG up to 5 MB</p>
            </div>
            {replacementError && (
              <p className="text-[11px] text-rose-300 font-inter flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{replacementError}</span>
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.10]">
              <button
                type="button"
                onClick={() => setResubmittingItem(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.08] text-xs text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!replacementFile}
                onClick={handleConfirmResubmission}
                className="px-5 py-2 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 disabled:opacity-40 text-xs font-semibold text-white cursor-pointer"
              >
                Submit Replacement
              </button>
            </div>
          </div>
        </div>
      )}
      {/* SEMS Phase 3: Eligibility Inspection Modal */}
      {inspectingEligibility && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectingEligibility(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
        >
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 space-y-4 border border-white/[0.15]">
            <div className="flex items-center justify-between border-b border-white/[0.10] pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  inspectingEligibility.result.eligible
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-poppins font-semibold text-white text-base">
                    SEMS Certificate Eligibility Breakdown
                  </h3>
                  <p className="text-xs text-[var(--text-sec-70)]">
                    {inspectingEligibility.registrant.name} • {inspectingEligibility.registrant.rollNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingEligibility(null)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs">
              <div className="font-medium text-white mb-0.5">
                Target Session: {inspectingEligibility.registrant.sessionTitle}
              </div>
              <div className="text-[11px] text-[var(--text-sec-70)]">
                Authoritative SEMS Rule: Confirmed Registration + Approved Payment + Attendance Logged + On-Time Assignment
              </div>
            </div>

            {/* 4 Checklist Items */}
            <div className="space-y-2 text-xs">
              {/* Check 1 */}
              <div className={`p-3 rounded-xl border flex items-start gap-3 ${
                inspectingEligibility.result.checks.registrationConfirmed
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}>
                {inspectingEligibility.result.checks.registrationConfirmed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-white">1. Confirmed Registration</div>
                  <div className="text-[11px] opacity-80">
                    {inspectingEligibility.result.details.registration.message}
                  </div>
                </div>
              </div>

              {/* Check 2 */}
              <div className={`p-3 rounded-xl border flex items-start gap-3 ${
                inspectingEligibility.result.checks.paymentApproved
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}>
                {inspectingEligibility.result.checks.paymentApproved ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-white">2. Fee Payment Approval</div>
                  <div className="text-[11px] opacity-80">
                    {inspectingEligibility.result.details.payment.message}
                  </div>
                </div>
              </div>

              {/* Check 3 */}
              <div className={`p-3 rounded-xl border flex items-start gap-3 ${
                inspectingEligibility.result.checks.attendanceCompleted
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}>
                {inspectingEligibility.result.checks.attendanceCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-white">3. Attendance & Participation</div>
                  <div className="text-[11px] opacity-80">
                    {inspectingEligibility.result.details.attendance.message}
                  </div>
                </div>
              </div>

              {/* Check 4 */}
              <div className={`p-3 rounded-xl border flex items-start gap-3 ${
                inspectingEligibility.result.checks.assignmentCompleted
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}>
                {inspectingEligibility.result.checks.assignmentCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-white">4. Required Assignment Completed On Time</div>
                  <div className="text-[11px] opacity-80">
                    {inspectingEligibility.result.details.assignment.message}
                  </div>
                </div>
              </div>
            </div>

            {/* Overall Verdict Banner matching SEMS Phase 3 specification */}
            <div className={`p-3.5 rounded-xl border text-xs ${
              inspectingEligibility.result.eligible
                ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/60 text-rose-300'
            }`}>
              <div className="flex items-center justify-between font-semibold">
                <span className="text-white">Certificate Eligibility Status:</span>
                <span
                  className={`px-2.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                    inspectingEligibility.result.eligible
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {inspectingEligibility.result.eligible ? 'Status: ELIGIBLE' : 'Status: NOT ELIGIBLE'}
                </span>
              </div>
              <div className="text-[11px] opacity-90 mt-1.5 leading-relaxed">
                {inspectingEligibility.result.eligible
                  ? 'Candidate satisfies all 4 verified criteria and is fully eligible for official credential issuance in Certificate Governance.'
                  : `Ineligibility Reasons: ${inspectingEligibility.result.reasons.join('; ')}`}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/[0.10]">
              <button
                type="button"
                onClick={() => setInspectingEligibility(null)}
                className="px-5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
