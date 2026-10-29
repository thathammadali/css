/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  RegistrantItem,
  SessionItem,
  EventItem,
  AttendanceRecord,
  TaskSubmission,
  CertificateItem,
  EligibilityResult,
  EligibilityCheckDetail,
} from '../types';
import { INITIAL_ATTENDANCE_RECORDS } from '../data/mockAttendance';
import { INITIAL_TASK_SUBMISSIONS } from '../data/mockSubmissions';
import { INITIAL_SESSIONS } from '../data/mockSessions';
import { eventService } from './eventService';

const ATTENDANCE_STORAGE_KEY = 'sems_attendance_records';
const SUBMISSIONS_STORAGE_KEY = 'sems_task_submissions';

export const eligibilityService = {
  /**
   * Retrieves authoritative attendance records.
   */
  getAttendanceRecords(): AttendanceRecord[] {
    try {
      const stored = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // Safe fallback
    }
    return INITIAL_ATTENDANCE_RECORDS;
  },

  /**
   * Saves attendance records to authoritative storage.
   */
  saveAttendanceRecords(records: AttendanceRecord[]): void {
    try {
      localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(records));
    } catch {
      // Safe fallback
    }
  },

  /**
   * Retrieves authoritative task submissions.
   */
  getTaskSubmissions(): TaskSubmission[] {
    try {
      const stored = localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // Safe fallback
    }
    return INITIAL_TASK_SUBMISSIONS;
  },

  /**
   * Saves task submissions to authoritative storage.
   */
  saveTaskSubmissions(submissions: TaskSubmission[]): void {
    try {
      localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(submissions));
    } catch {
      // Safe fallback
    }
  },

  /**
   * Centralized SEMS Certificate Eligibility Engine.
   *
   * Authoritative Rule:
   * Eligible =
   *    Confirmed Registration
   *    AND
   *    Payment Approved (if event/session requires payment; free events automatically pass)
   *    AND
   *    Required Attendance / Participation Completed
   *    AND
   *    Required Assignment Completed On Time (if assignment exists; auto-pass if none)
   *
   * Certificate eligibility must NOT be determined merely by a generic status === 'approved'.
   */
  evaluateCertificateEligibility(
    registrant: RegistrantItem,
    context?: {
      session?: SessionItem;
      event?: EventItem;
      attendanceRecords?: AttendanceRecord[];
      submissions?: TaskSubmission[];
    }
  ): EligibilityResult {
    const taskSubmissions = context?.submissions || this.getTaskSubmissions();

    // Auto-resolve session if not explicitly provided
    let session = context?.session;
    if (!session && registrant.sessionId) {
      session = INITIAL_SESSIONS.find((s) => s.id === registrant.sessionId);
    }

    // Auto-resolve parent event if not explicitly provided
    let event = context?.event;
    if (!event && session?.eventId) {
      event = eventService.getEventById(session.eventId) || undefined;
    }

    // -----------------------------------------------------------------------
    // CHECK 1: Confirmed Registration
    // -----------------------------------------------------------------------
    let registrationConfirmed = false;
    let registrationMessage = '';

    if (registrant.lifecycleStatus) {
      // Authoritative lifecycle status model evaluation
      const confirmedLifecycleStates = [
        'CONFIRMED',
        'ATTENDED',
        'ELIGIBLE_FOR_CERTIFICATE',
        'CERTIFICATE_ISSUED',
      ];

      if (confirmedLifecycleStates.includes(registrant.lifecycleStatus)) {
        registrationConfirmed = true;
        registrationMessage = 'Registration is confirmed and active on official roster.';
      } else if (registrant.lifecycleStatus === 'CANCELLED') {
        registrationConfirmed = false;
        registrationMessage = 'Registration was cancelled.';
      } else if (registrant.lifecycleStatus === 'PAYMENT_PENDING') {
        registrationConfirmed = false;
        registrationMessage = 'Registration is pending fee payment verification.';
      } else if (registrant.lifecycleStatus === 'PAYMENT_REJECTED') {
        registrationConfirmed = false;
        registrationMessage = 'Registration payment slip was rejected.';
      } else {
        registrationConfirmed = false;
        registrationMessage = 'Registration is pending administrative confirmation.';
      }
    } else {
      // Fallback for objects without explicit lifecycleStatus:
      // Rejects unconfirmed, pending, or rejected registrations
      if (registrant.status === 'rejected') {
        registrationConfirmed = false;
        registrationMessage = 'Registration was rejected.';
      } else if (registrant.status === 'pending') {
        registrationConfirmed = false;
        registrationMessage = 'Registration is pending approval.';
      } else if (registrant.status === 'approved') {
        registrationConfirmed = true;
        registrationMessage = 'Registration is confirmed on official session roster.';
      } else {
        registrationConfirmed = false;
        registrationMessage = 'Registration is not confirmed.';
      }
    }

    // -----------------------------------------------------------------------
    // CHECK 2: Payment Approval
    // -----------------------------------------------------------------------
    let paymentApproved = false;
    let paymentMessage = '';

    const isPaidEvent =
      event?.isPaid === true ||
      session?.isPaid === true ||
      registrant.isPaid === true ||
      (typeof registrant.amount === 'string' &&
        !registrant.amount.toLowerCase().includes('free') &&
        !registrant.amount.includes('Rs. 0') &&
        !registrant.amount.includes('PKR 0'));

    if (!isPaidEvent) {
      // Free events automatically satisfy payment requirement
      paymentApproved = true;
      paymentMessage = 'Free admission event — fee payment not required.';
    } else {
      // Paid event requires explicit payment approval
      if (
        registrant.status === 'approved' ||
        registrant.lifecycleStatus === 'PAYMENT_APPROVED' ||
        registrant.lifecycleStatus === 'CONFIRMED' ||
        registrant.lifecycleStatus === 'ATTENDED' ||
        registrant.lifecycleStatus === 'ELIGIBLE_FOR_CERTIFICATE' ||
        registrant.lifecycleStatus === 'CERTIFICATE_ISSUED'
      ) {
        paymentApproved = true;
        paymentMessage = 'Fee payment slip verified and approved by administration.';
      } else if (registrant.status === 'rejected' || registrant.lifecycleStatus === 'PAYMENT_REJECTED') {
        paymentApproved = false;
        paymentMessage = `Payment slip rejected (${registrant.receiptRejectedReason || 'Resubmission required'}).`;
      } else {
        paymentApproved = false;
        paymentMessage = 'Fee payment slip is awaiting manual review in verification queue.';
      }
    }

    // -----------------------------------------------------------------------
    // CHECK 3: Attendance / Participation Requirement
    // Attendance is authoritative on the backend registration record.
    // -----------------------------------------------------------------------
    const attendanceCompleted = registrant.attended === true;
    const attendanceMessage = attendanceCompleted
      ? 'Required attendance completed.'
      : 'No verified session attendance record logged in official attendance registry.';

    // -----------------------------------------------------------------------
    // CHECK 4: Required Assignment Completed On Time
    // -----------------------------------------------------------------------
    let assignmentCompleted = false;
    let assignmentMessage = '';

    const tasks = session?.tasks || [];
    const explicitRequired = tasks.filter((t) => t.requiredForCertificate === true);
    const requiredTasks =
      explicitRequired.length > 0
        ? explicitRequired
        : (session?.assignmentRequired ? tasks : []);

    if (requiredTasks.length === 0) {
      // No mandatory assignment required
      assignmentCompleted = true;
      assignmentMessage = 'No mandatory practical assignment required for this session.';
    } else {
      let allOnTime = true;
      let missingTaskName = '';
      let lateTaskName = '';
      let lateDetails = '';

      for (const t of requiredTasks) {
        const submission = taskSubmissions.find((sub) => {
          const matchTask = sub.taskId === t.id;
          const matchUser =
            (registrant.email && sub.studentEmail?.toLowerCase() === registrant.email.toLowerCase()) ||
            (registrant.primaryEmail && sub.studentEmail?.toLowerCase() === registrant.primaryEmail.toLowerCase()) ||
            (registrant.rollNumber && sub.studentRoll?.toLowerCase() === registrant.rollNumber.toLowerCase()) ||
            (sub.studentName?.toLowerCase() === registrant.name?.toLowerCase());
          return matchTask && matchUser;
        });

        if (!submission) {
          allOnTime = false;
          missingTaskName = t.title;
          break;
        }

        // On-time check
        if (t.dueDate) {
          let deadlineTime: number;
          if (/^\d{4}-\d{2}-\d{2}$/.test(t.dueDate)) {
            deadlineTime = new Date(`${t.dueDate}T23:59:59.999Z`).getTime();
          } else {
            deadlineTime = new Date(t.dueDate).getTime();
          }

          const submissionTime = new Date(submission.submittedAt).getTime();
          if (!isNaN(submissionTime) && !isNaN(deadlineTime) && submissionTime > deadlineTime) {
            allOnTime = false;
            lateTaskName = t.title;
            lateDetails = `submitted on ${new Date(submission.submittedAt).toLocaleDateString()}, deadline was ${t.dueDate}`;
            break;
          }
        }
      }

      if (missingTaskName) {
        assignmentCompleted = false;
        assignmentMessage = `Required assignment "${missingTaskName}" not submitted.`;
      } else if (lateTaskName) {
        assignmentCompleted = false;
        assignmentMessage = `Assignment "${lateTaskName}" was submitted past the deadline (${lateDetails}).`;
      } else {
        assignmentCompleted = true;
        assignmentMessage = 'All required practical assignments completed and submitted on time.';
      }
    }

    // -----------------------------------------------------------------------
    // Composite Eligibility Evaluation
    // -----------------------------------------------------------------------
    const eligible =
      registrationConfirmed &&
      paymentApproved &&
      attendanceCompleted &&
      assignmentCompleted;

    const reasons: string[] = [];
    if (!registrationConfirmed) reasons.push(registrationMessage);
    if (!paymentApproved) reasons.push(paymentMessage);
    if (!attendanceCompleted) reasons.push(attendanceMessage);
    if (!assignmentCompleted) reasons.push(assignmentMessage);

    const details: {
      registration: EligibilityCheckDetail;
      payment: EligibilityCheckDetail;
      attendance: EligibilityCheckDetail;
      assignment: EligibilityCheckDetail;
    } = {
      registration: { passed: registrationConfirmed, message: registrationMessage },
      payment: { passed: paymentApproved, message: paymentMessage },
      attendance: { passed: attendanceCompleted, message: attendanceMessage },
      assignment: { passed: assignmentCompleted, message: assignmentMessage },
    };

    return {
      eligible,
      reasons,
      checks: {
        registrationConfirmed,
        paymentApproved,
        attendanceCompleted,
        assignmentCompleted,
      },
      details,
    };
  },

  /**
   * Multi-Session Event Eligibility Evaluation.
   * For parent events with multiple nested sessions: evaluates that the attendee
   * participated in all required sessions of the parent event.
   */
  evaluateEventEligibility(
    registrant: RegistrantItem,
    event: EventItem,
    context?: {
      attendanceRecords?: AttendanceRecord[];
      submissions?: TaskSubmission[];
    }
  ): EligibilityResult {
    const sessions = event.sessions || [];
    if (sessions.length <= 1) {
      return this.evaluateCertificateEligibility(registrant, {
        event,
        session: sessions[0],
        attendanceRecords: context?.attendanceRecords,
        submissions: context?.submissions,
      });
    }

    // Multi-session event: evaluate every nested session
    let allSessionsPassed = true;
    const sessionFailures: string[] = [];
    const aggregatedChecks = {
      registrationConfirmed: true,
      paymentApproved: true,
      attendanceCompleted: true,
      assignmentCompleted: true,
    };

    for (const sess of sessions) {
      const sessResult = this.evaluateCertificateEligibility(registrant, {
        event,
        session: sess,
        attendanceRecords: context?.attendanceRecords,
        submissions: context?.submissions,
      });

      if (!sessResult.checks.registrationConfirmed) aggregatedChecks.registrationConfirmed = false;
      if (!sessResult.checks.paymentApproved) aggregatedChecks.paymentApproved = false;
      if (!sessResult.checks.attendanceCompleted) {
        aggregatedChecks.attendanceCompleted = false;
        sessionFailures.push(`Session "${sess.title}": attendance not completed.`);
      }
      if (!sessResult.checks.assignmentCompleted) {
        aggregatedChecks.assignmentCompleted = false;
        sessionFailures.push(`Session "${sess.title}": assignment requirement missing.`);
      }

      if (!sessResult.eligible) {
        allSessionsPassed = false;
      }
    }

    const eligible = allSessionsPassed;
    const reasons: string[] = [];
    if (!aggregatedChecks.registrationConfirmed) reasons.push('Event registration is not confirmed.');
    if (!aggregatedChecks.paymentApproved) reasons.push('Event fee payment has not been verified.');
    if (!aggregatedChecks.attendanceCompleted) reasons.push(...sessionFailures.filter((f) => f.includes('attendance')));
    if (!aggregatedChecks.assignmentCompleted) reasons.push(...sessionFailures.filter((f) => f.includes('assignment')));

    return {
      eligible,
      reasons: reasons.length > 0 ? reasons : ['All multi-session event criteria met.'],
      checks: aggregatedChecks,
      details: {
        registration: {
          passed: aggregatedChecks.registrationConfirmed,
          message: aggregatedChecks.registrationConfirmed
            ? 'Registration confirmed for event.'
            : 'Event registration not confirmed.',
        },
        payment: {
          passed: aggregatedChecks.paymentApproved,
          message: aggregatedChecks.paymentApproved
            ? 'Event payment approved.'
            : 'Event fee payment pending approval.',
        },
        attendance: {
          passed: aggregatedChecks.attendanceCompleted,
          message: aggregatedChecks.attendanceCompleted
            ? `Attendance verified across all ${sessions.length} sessions.`
            : sessionFailures.filter((f) => f.includes('attendance')).join('; ') || 'Attendance incomplete.',
        },
        assignment: {
          passed: aggregatedChecks.assignmentCompleted,
          message: aggregatedChecks.assignmentCompleted
            ? 'All multi-session assignments submitted on time.'
            : sessionFailures.filter((f) => f.includes('assignment')).join('; ') || 'Assignments incomplete.',
        },
      },
    };
  },

  /**
   * Certificate Issuance Gate:
   * Evaluates eligibility and duplicate/idempotency protection.
   */
  canIssueCertificate(
    registrant: RegistrantItem,
    existingCertificates: CertificateItem[],
    context?: {
      session?: SessionItem;
      event?: EventItem;
      attendanceRecords?: AttendanceRecord[];
      submissions?: TaskSubmission[];
    }
  ): {
    allowed: boolean;
    reason?: string;
    eligibility: EligibilityResult;
  } {
    const eligibility = this.evaluateCertificateEligibility(registrant, context);

    // 1. Idempotency & Duplicate Check
    const targetSessionTitle = context?.session?.title || registrant.sessionTitle;
    const alreadyIssued = existingCertificates.some((c) => {
      const matchRoll =
        Boolean(registrant.rollNumber) &&
        Boolean(c.recipientRoll) &&
        c.recipientRoll.toLowerCase() === registrant.rollNumber.toLowerCase();
      const matchEmail =
        Boolean(registrant.email) &&
        Boolean(c.recipientEmail) &&
        Boolean(c.recipientEmail && registrant.email && c.recipientEmail.toLowerCase() === registrant.email.toLowerCase());
      const matchSession =
        Boolean(targetSessionTitle) &&
        Boolean(c.sessionTitle) &&
        c.sessionTitle.toLowerCase() === targetSessionTitle.toLowerCase();

      return (matchRoll || matchEmail) && matchSession && c.status !== 'revoked';
    });

    if (alreadyIssued) {
      return {
        allowed: false,
        reason: `A certificate has already been issued to ${registrant.name} for "${targetSessionTitle}". Duplicate issuance is blocked.`,
        eligibility,
      };
    }

    // 2. Eligibility Gate
    if (!eligibility.eligible) {
      return {
        allowed: false,
        reason: `Participant is not eligible for certificate: ${eligibility.reasons.join('; ')}`,
        eligibility,
      };
    }

    return {
      allowed: true,
      eligibility,
    };
  },

  /**
   * Records or updates verified attendance for a student participant.
   */
  recordAttendance(params: {
    sessionId: string;
    participantId: string;
    participantName: string;
    participantEmail?: string;
    rollNumber?: string;
    durationMinutes?: number;
    verifiedBy?: string;
  }): AttendanceRecord {
    const records = this.getAttendanceRecords();
    const duration = params.durationMinutes ?? 180;
    const existingIndex = records.findIndex(
      (r) =>
        r.sessionId === params.sessionId &&
        (r.participantId === params.participantId ||
          (params.participantEmail && r.participantEmail?.toLowerCase() === params.participantEmail.toLowerCase()) ||
          (params.rollNumber && r.rollNumber?.toLowerCase() === params.rollNumber.toLowerCase()))
    );

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      sessionId: params.sessionId,
      participantId: params.participantId,
      participantName: params.participantName,
      participantEmail: params.participantEmail || '',
      rollNumber: params.rollNumber || '',
      joinTimestamp: new Date().toISOString(),
      leaveTimestamp: new Date(Date.now() + duration * 60000).toISOString(),
      durationMinutes: duration,
      thresholdMet: true,
      verifiedBy: params.verifiedBy || 'Session Admin',
    };

    if (existingIndex >= 0) {
      records[existingIndex] = { ...records[existingIndex], ...newRecord };
    } else {
      records.push(newRecord);
    }

    this.saveAttendanceRecords(records);
    return newRecord;
  },

  /**
   * Submits practical task / assignment for a student and saves it.
   */
  submitTask(params: {
    taskId: string;
    studentName: string;
    studentRoll?: string;
    studentEmail?: string;
    contentOrUrl: string;
    feedback?: string;
  }): TaskSubmission {
    const submissions = this.getTaskSubmissions();
    const existingIndex = submissions.findIndex(
      (s) =>
        s.taskId === params.taskId &&
        ((params.studentRoll && s.studentRoll?.toLowerCase() === params.studentRoll.toLowerCase()) ||
          (params.studentEmail && s.studentEmail?.toLowerCase() === params.studentEmail.toLowerCase()) ||
          s.studentName.toLowerCase() === params.studentName.toLowerCase())
    );

    const newSub: TaskSubmission = {
      id: `sub-${Date.now()}`,
      taskId: params.taskId,
      studentName: params.studentName,
      studentRoll: params.studentRoll || '',
      studentEmail: params.studentEmail || '',
      submittedAt: new Date().toISOString(),
      contentOrUrl: params.contentOrUrl,
      status: 'submitted',
      grade: 'Submitted (Pending Review)',
      feedback: params.feedback || 'Submitted on-time via Student Portal.',
    };

    if (existingIndex >= 0) {
      submissions[existingIndex] = { ...submissions[existingIndex], ...newSub };
    } else {
      submissions.push(newSub);
    }

    this.saveTaskSubmissions(submissions);
    return newSub;
  },
};
