/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock,
  Award,
  CreditCard,
  ClipboardList,
  CheckSquare,
  Ticket,
  ChevronDown,
  ChevronUp,
  Radio,
  FileCheck,
  UploadCloud,
  ExternalLink,
} from 'lucide-react';
import { RegistrantItem, SessionItem, DashboardRole } from '../../types';
import { eligibilityService } from '../../services/eligibilityService';

interface RegistrationJourneyTimelineProps {
  registrant: RegistrantItem;
  session?: SessionItem;
  currentRole: DashboardRole;
  onOpenDigitalPass: (reg: RegistrantItem) => void;
  onOpenSubmitTask?: (taskId: string, taskTitle: string) => void;
  onOpenResubmitSlip?: (reg: RegistrantItem) => void;
  onNavigateToCertificates?: () => void;
  onCheckInAttendance?: (reg: RegistrantItem) => void;
  onNotify: (msg: string) => void;
}

export const RegistrationJourneyTimeline: React.FC<RegistrationJourneyTimelineProps> = ({
  registrant,
  session,
  currentRole,
  onOpenDigitalPass,
  onOpenSubmitTask,
  onOpenResubmitSlip,
  onNavigateToCertificates,
  onCheckInAttendance,
  onNotify,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Evaluate real-time eligibility checks
  const eligibility = eligibilityService.evaluateCertificateEligibility(registrant, { session });
  const isPaid = registrant.isPaid || (registrant.amount && !registrant.amount.toLowerCase().includes('free'));
  const isPaymentApproved = eligibility.checks.paymentApproved;
  const isPaymentRejected = registrant.status === 'rejected' || registrant.lifecycleStatus === 'PAYMENT_REJECTED';
  const isAttendanceDone = eligibility.checks.attendanceCompleted;
  const isAssignmentDone = eligibility.checks.assignmentCompleted;
  const isCertificateReady = eligibility.eligible;

  // Stages calculation
  const stages = [
    {
      id: 'registered',
      title: 'Registration Form',
      subtitle: `Submitted: ${registrant.submittedAt || 'Recorded'}`,
      isDone: true,
      isInProgress: false,
      isFailed: false,
      icon: ClipboardList,
    },
    {
      id: 'payment',
      title: isPaid ? 'Fee Verification' : 'Admission Cleared',
      subtitle: isPaid
        ? isPaymentApproved
          ? 'Slip Approved by Admin'
          : isPaymentRejected
          ? `Rejected: ${registrant.receiptRejectedReason || 'Slip error'}`
          : 'Under Manual Review'
        : 'Free Admission (Automatic Pass)',
      isDone: isPaymentApproved,
      isInProgress: isPaid && !isPaymentApproved && !isPaymentRejected,
      isFailed: isPaymentRejected,
      icon: CreditCard,
    },
    {
      id: 'attendance',
      title: 'Session Attendance',
      subtitle: isAttendanceDone
        ? 'Verified Attendance Logged (Threshold Met)'
        : 'Attend Session Pod or Complete Check-in',
      isDone: isAttendanceDone,
      isInProgress: isPaymentApproved && !isAttendanceDone,
      isFailed: false,
      icon: Radio,
    },
    {
      id: 'assignment',
      title: 'Practical Assignment',
      subtitle: isAssignmentDone
        ? 'Assignment Submitted On Time'
        : 'Submit Practical Homework / Project',
      isDone: isAssignmentDone,
      isInProgress: isAttendanceDone && !isAssignmentDone,
      isFailed: false,
      icon: CheckSquare,
    },
    {
      id: 'certificate',
      title: 'Verified Certificate',
      subtitle: isCertificateReady
        ? 'All 4/4 Criteria Satisfied & Conferred'
        : 'Issued Upon Completing All Milestones',
      isDone: isCertificateReady,
      isInProgress: isAssignmentDone && !isCertificateReady,
      isFailed: false,
      icon: Award,
    },
  ];

  const completedCount = stages.filter((s) => s.isDone).length;
  const percentage = Math.round((completedCount / stages.length) * 100);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5 space-y-4">
      {/* Top Header Row with Title and Percentage */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-poppins font-semibold text-white text-sm sm:text-base">
              {registrant.sessionTitle}
            </span>
            {registrant.isWaitlisted && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Waitlist #{registrant.waitlistPosition || 1}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-sec-70)]">
            Roll / ID: <span className="font-mono text-white/90">{registrant.rollNumber || 'GUEST'}</span> &bull; Stage {completedCount} of 5 Complete ({percentage}%)
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Digital Pass / E-Ticket Button */}
          <button
            type="button"
            onClick={() => onOpenDigitalPass(registrant)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Digital Pass (E-Ticket)</span>
          </button>

          {/* Toggle Expand Stepper Details */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse Stepper' : 'Expand Detailed Progress'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Modern Progress Bar */}
      <div className="w-full h-2 rounded-full bg-white/[0.08] overflow-hidden">
        <div
          style={{ width: `${percentage}%` }}
          className={`h-full transition-all duration-500 rounded-full ${
            percentage === 100
              ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
              : percentage >= 60
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
              : 'bg-gradient-to-r from-amber-500 to-orange-500'
          }`}
        />
      </div>

      {/* Visual 5-Step Stepper Line */}
      <div className="grid grid-cols-5 gap-1 pt-1">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <div key={stage.id} className="flex flex-col items-center text-center space-y-1.5 relative">
              {/* Stepper Circle Icon */}
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                  stage.isDone
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30'
                    : stage.isFailed
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse'
                    : stage.isInProgress
                    ? 'bg-amber-500/30 border-2 border-amber-400 text-amber-300 animate-pulse'
                    : 'bg-white/[0.06] text-white/30 border border-white/10'
                }`}
              >
                {stage.isDone ? (
                  <CheckCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                ) : stage.isFailed ? (
                  <AlertCircle className="w-4 h-4" />
                ) : stage.isInProgress ? (
                  <Clock className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3 h-3" />
                )}
              </div>

              {/* Step Title */}
              <span
                className={`text-[10px] sm:text-[11px] font-medium truncate max-w-full ${
                  stage.isDone
                    ? 'text-white'
                    : stage.isFailed
                    ? 'text-rose-300 font-semibold'
                    : stage.isInProgress
                    ? 'text-amber-300 font-semibold'
                    : 'text-white/40'
                }`}
              >
                {stage.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Expanded Detailed Milestone View */}
      {isExpanded && (
        <div className="pt-3 border-t border-white/[0.08] space-y-3 animate-fadeIn text-xs">
          {stages.map((stage, i) => (
            <div
              key={`detail-${stage.id}`}
              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                stage.isDone
                  ? 'bg-emerald-950/20 border-emerald-500/25 text-emerald-200'
                  : stage.isFailed
                  ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                  : stage.isInProgress
                  ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                  : 'bg-white/[0.02] border-white/[0.06] text-white/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-mono text-[10px] text-white/80 shrink-0">
                  {i + 1}
                </span>
                <div>
                  <span className="font-semibold text-white block">{stage.title}</span>
                  <span className="text-[11px] opacity-80">{stage.subtitle}</span>
                </div>
              </div>

              {/* Contextual Action Buttons for this Stage */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Stage 2 Action: Re-upload slip if rejected */}
                {stage.id === 'payment' && stage.isFailed && onOpenResubmitSlip && (
                  <button
                    type="button"
                    onClick={() => onOpenResubmitSlip(registrant)}
                    className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Re-upload Slip</span>
                  </button>
                )}

                {/* Stage 3 Action: Check-in attendance */}
                {stage.id === 'attendance' && !stage.isDone && onCheckInAttendance && (
                  <button
                    type="button"
                    onClick={() => onCheckInAttendance(registrant)}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Check-in to Session</span>
                  </button>
                )}

                {/* Stage 4 Action: Submit assignment */}
                {stage.id === 'assignment' && !stage.isDone && onOpenSubmitTask && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenSubmitTask(
                        session?.tasks?.[0]?.id || 'task-1',
                        session?.tasks?.[0]?.title || 'Practical Workshop Assignment'
                      )
                    }
                    className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Submit Assignment</span>
                  </button>
                )}

                {/* Stage 5 Action: View Certificate */}
                {stage.id === 'certificate' && stage.isDone && onNavigateToCertificates && (
                  <button
                    type="button"
                    onClick={onNavigateToCertificates}
                    className="px-3 py-1 rounded-lg bg-[var(--primary-accent)] hover:brightness-110 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>View Certificate</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
