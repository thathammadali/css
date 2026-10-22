/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Screen = 'landing' | 'login' | 'signup' | 'dashboard' | 'sessions' | 'about' | 'verify';

export type UserRole = 'super_admin' | 'admin' | 'student' | 'guest';

export type DashboardRole = 'super_admin' | 'admin' | 'student' | 'guest';

export type NavTab =
  | 'home'
  | 'sessions'
  | 'session-room'
  | 'form-builder'
  | 'registrants'
  | 'certificates'
  | 'tasks'
  | 'about'
  | 'profile'
  | 'reviews'
  | 'users';

export type EventStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'PUBLISHED'
  | 'UPCOMING'
  | 'REGISTRATION_CLOSED'
  | 'LIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ARCHIVED';

export type SessionStatus = 'open' | 'closing_soon' | 'closed';

export type SessionDeliveryStatus = 'UPCOMING' | 'LIVE' | 'COMPLETED';

export interface RoomPermissions {
  allowChat: boolean;
  allowShareScreen: boolean;
  allowUnmute: boolean;
  allowRaiseHand: boolean;
  allowCamera: boolean;
}

export type RegistrationLifecycleStatus =
  | 'NOT_REGISTERED'
  | 'FORM_IN_PROGRESS'
  | 'SUBMITTED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_REJECTED'
  | 'CONFIRMED'
  | 'WAITLISTED'
  | 'CANCELLED'
  | 'ATTENDED'
  | 'ELIGIBLE_FOR_CERTIFICATE'
  | 'CERTIFICATE_ISSUED';

export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'number'
  | 'phone'
  | 'dropdown'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'file';

export interface FormFieldValidation {
  pattern?: string;
  patternErrorMessage?: string;
  minLength?: number;
  maxLength?: number;
  minVal?: number;
  maxVal?: number;
}

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[]; // For dropdown, radio, checkbox
  defaultValue?: string;
  order?: number;
  validation?: FormFieldValidation;
}

export interface RegistrationFormConfig {
  id: string;
  version: number;
  sessionId?: string;
  eventId?: string;
  formName: string;
  description?: string;
  fields: FormField[];
  updatedAt: string;
  isPublished?: boolean;
  isArchived?: boolean;
}

export interface SessionResource {
  id?: string;
  name: string;
  size: string;
  type: string;
  url?: string;
  category?: 'slides' | 'pdf' | 'notes' | 'link';
  isPublic?: boolean;
}

export interface SessionComment {
  id: string;
  authorName: string;
  authorRole: DashboardRole;
  avatarInitials: string;
  content: string;
  timestamp: string;
  isAnnouncement?: boolean;
}

export interface SessionTask {
  id: string;
  sessionId: string;
  sessionTitle?: string;
  title: string;
  description: string;
  dueDate: string;
  points?: number;
  submissionsCount?: number;
  maxPoints?: number;
  requiredForCertificate?: boolean;
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  studentName: string;
  studentRoll: string;
  studentEmail?: string;
  submittedAt: string;
  contentOrUrl: string;
  status: 'submitted' | 'graded';
  grade?: string;
  feedback?: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  participantId: string;
  participantName: string;
  participantEmail: string;
  rollNumber?: string;
  joinTimestamp: string;
  leaveTimestamp?: string;
  durationMinutes: number;
  thresholdMet: boolean;
  verifiedBy?: string;
  verificationStatus?: AttendanceVerificationStatus;
}

export type SessionRecordingStatus = 'idle' | 'recording' | 'processing' | 'available' | 'failed' | 'none';
export type AttendanceVerificationStatus = 'in_session' | 'pending_verification' | 'verified' | 'below_duration';

export interface SessionItem {
  id: string;
  eventId: string;
  parentEventTitle?: string;
  title: string;
  society: string;
  date: string;
  time: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  location: string;
  meetingUrl?: string;
  meeting_link?: string | null;
  speaker?: string | null;
  registered_count?: number;
  isOnline?: boolean;
  meetingDetails?: string;
  status: SessionStatus;
  capacity?: string;
  totalSeats?: number;
  seatsRemaining?: number;
  category?: string;
  description?: string;
  wing?: string;
  registrationRequired?: boolean;
  registrationDeadline?: string;
  paymentDeadline?: string;
  isPaid?: boolean;
  amount?: number;
  resources?: SessionResource[];
  comments?: SessionComment[];
  tasks?: SessionTask[];
  registeredRoleRelevance?: string;
  assignmentRequired?: boolean;
  assignmentTitle?: string;
  minAttendanceMinutes?: number;
  deliveryStatus?: SessionDeliveryStatus;
  recordingStatus?: SessionRecordingStatus;
  recordingUrl?: string;
  recordingDuration?: string;
  meetingSummary?: string;
  attendanceCount?: number;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  category: string;
  organizer: string;
  status: EventStatus;
  bannerUrl?: string;
  sessions: SessionItem[];
  registrationDeadline: string;
  paymentDeadline?: string;
  isPaid: boolean;
  feeAmount: number;
  createdBy: string;
  createdAt: string;
  publishedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export interface RegistrantItem {
  id: string;
  name: string;
  rollNumber: string;
  email?: string;
  primaryEmail?: string;
  secondaryEmail?: string;
  phone?: string;
  institutionAffiliation?: string;
  isGuest?: boolean;
  department?: string;
  wing?: string;
  sessionId: string;
  sessionTitle: string;
  eventId?: string;
  amount: string;
  isPaid?: boolean;
  receiptFileName?: string;
  receiptFileSize?: string;
  receiptPreviewUrl?: string;
  receiptRejectedReason?: string;
  status: PaymentStatus;
  lifecycleStatus?: RegistrationLifecycleStatus;
  formVersionUsed?: number;
  submittedAt: string;
  avatarInitials: string;
  customResponses?: Record<string, string>;
  isWaitlisted?: boolean;
  waitlistPosition?: number;
  attendanceCompleted?: boolean;
  assignmentCompleted?: boolean;
  certificateEligible?: boolean;
  certificateId?: string;
}

export interface GuestRegistrationPayload {
  name: string;
  primaryEmail: string;
  phone: string;
  institutionAffiliation: string;
  sessionId: string;
  receiptFile?: { name: string; size: string; dataUrl: string };
  customResponses?: Record<string, string>;
}

// ==========================================
// SESSION ROOM & ACCESS MANAGEMENT MODELS
// ==========================================
export type RoomStatus = 'active' | 'revoked' | 'locked';

export interface SessionRoom {
  id: string; // Unique Room ID (e.g., "room-sess-1" or "SEMS-RM-101")
  sessionId: string; // References Session
  sessionTitle: string;
  roomName: string; // e.g. "Main Engineering Hall A-102 (Live Virtual Pod)"
  roomAccessCode: string; // Server-authoritative Unique Access Code (e.g. "SEMS-AI-9482")
  status: RoomStatus;
  capacity?: number;
  activeParticipantsCount?: number;
  meetingUrl?: string;
  presentationTopic?: string;
  speakerName?: string;
  createdAt: string;
  updatedAt: string;
  deliveryStatus?: SessionDeliveryStatus;
  isLive?: boolean;
  isLocked?: boolean;
  isRecording?: boolean;
  recordingUrl?: string;
  recordingDuration?: string;
  meetingSummary?: string;
  permissions?: RoomPermissions;
}

export interface RoomAccessDispatch {
  id: string;
  roomId: string;
  sessionId: string;
  participantEmail: string;
  participantName: string;
  accessCodeSent: string;
  sentAt: string;
  sentBy: string;
  status: 'delivered' | 'revoked';
}

export interface RoomAccessValidationPayload {
  sessionId: string;
  participantEmail: string;
  accessCode: string;
}

export interface RoomAccessValidationResponse {
  success: boolean;
  sessionToken?: string;
  room?: {
    id: string;
    sessionId: string;
    sessionTitle: string;
    roomName: string;
    status: RoomStatus;
    meetingUrl?: string;
    speakerName?: string;
    presentationTopic?: string;
    deliveryStatus?: SessionDeliveryStatus;
    isLive?: boolean;
    isLocked?: boolean;
    isRecording?: boolean;
  };
  error?: string;
  errorCode?:
    | 'NOT_REGISTERED'
    | 'PAYMENT_PENDING'
    | 'PAYMENT_REQUIRED'
    | 'INVALID_CODE'
    | 'CODE_REVOKED'
    | 'ROOM_LOCKED'
    | 'UNAUTHORIZED';
}

export interface EligibilityCheckDetail {
  passed: boolean;
  message: string;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  checks: {
    registrationConfirmed: boolean;
    paymentApproved: boolean;
    attendanceCompleted: boolean;
    assignmentCompleted: boolean;
  };
  details: {
    registration: EligibilityCheckDetail;
    payment: EligibilityCheckDetail;
    attendance: EligibilityCheckDetail;
    assignment: EligibilityCheckDetail;
  };
}

export interface NotificationItem {
  id: string;
  type:
    | 'registration_submitted'
    | 'registration_approved'
    | 'payment_pending'
    | 'payment_approved'
    | 'payment_rejected'
    | 'room_code_sent'
    | 'room_code_revoked'
    | 'certificate_issued'
    | 'certificate_revoked'
    | 'event_submitted'
    | 'event_published'
    | 'event_rejected'
    | 'assignment_submitted'
    | 'task_assigned'
    | 'role_updated'
    | 'account_status'
    | 'announcement';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  linkTab?: NavTab;
  recipientEmail?: string;
  recipientRole?: DashboardRole;
  entityId?: string;
}

export type CertificateStatus = 'pending_approval' | 'approved' | 'rejected' | 'revoked';

export type CertificateTemplateStyle =
  | 'classic_ivory'
  | 'modern_tech'
  | 'royal_navy'
  | 'ornate_image_frame'
  | 'modern_vector_frame'
  | 'minimal_monochrome'
  | 'emerald_executive'
  | 'crimson_heritage'
  | 'sapphire_vector';

export type CertificateTemplateFormat = 'html' | 'image';

export interface CertificateSignatory {
  name: string;
  title: string;
  role: 'admin' | 'super_admin';
  approved: boolean;
  signedAt?: string;
}

export interface CertificateTemplateConfig {
  id: string;
  name: string;
  version: number;
  format: CertificateTemplateFormat;
  style: CertificateTemplateStyle;
  customTitle?: string;
  customSubtitle?: string;
  backgroundImageUrl?: string;
  accentColor?: string;
  signatoryName: string;
  signatoryTitle: string;
  officerSignatoryName?: string;
  officerSignatoryTitle?: string;
  adminSignatoryName: string;
  adminSignatoryTitle: string;
  updatedAt: string;
}

export interface CertificateItem {
  id: string;
  verificationCode: string; // e.g. SEMS-2026-XXXXXX
  title: string;
  sessionTitle: string;
  eventName?: string;
  recipientName: string;
  recipientRoll: string;
  recipientEmail?: string;
  recipientPrimaryEmail?: string;
  recipientSecondaryEmail?: string;
  issueDate: string;
  societyWing?: string;
  isValid: boolean;
  status: CertificateStatus;
  templateStyle?: CertificateTemplateStyle;
  templateFormat?: CertificateTemplateFormat;
  templateVersion?: number;
  customTitle?: string;
  customSubtitle?: string;
  grade?: string;
  signatories?: CertificateSignatory[];
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  revocationReason?: string;
  revokedAt?: string;
  revokedBy?: string;
  generatedAutomatically?: boolean;
  generationError?: boolean;
}

export interface ThemeSwatch {
  id: string;
  name: string;
  number: number;
  primary: string;
  secondary: string;
  background: string;
  unlocked: boolean;
  bgStart: string;
  bgEnd: string;
  accent: string;
  secondaryText: string;
  mode?: 'light' | 'dark';
  vibe?: string;
  category?: string;
  swatchColors?: string[];
  sidebarBg?: string;
  topbarBg?: string;
  sidebarBorder?: string;
  topbarBorder?: string;
}

export interface StatCardData {
  label: string;
  value: string | number;
  subtext?: string;
  highlight?: boolean;
}

export interface AuthUser {
  name: string;
  email: string;
  primaryEmail?: string;
  secondaryEmail?: string;
  role: UserRole;
  isLoggedIn: boolean;
  department?: string;
  rollNumber?: string;
  phone?: string;
  institutionAffiliation?: string;
  isBackendConnected?: boolean;
  authMode?: 'remote' | 'offline_mock';
}

export interface FormErrors {
  [key: string]: string;
}

export type SessionsSubScreen =
  | 'events'
  | 'event-detail'
  | 'event-create'
  | 'list'
  | 'detail'
  | 'create'
  | 'edit'
  | 'register';

export interface UserAccount {
  id: string;
  name: string;
  primaryEmail: string;
  secondaryEmail: string;
  role: DashboardRole;
  department: string;
  rollNumber?: string;
  institutionAffiliation?: string;
  status: 'active' | 'suspended';
  createdAt: string;
  lastActive: string;
  password?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actor: string;
  actorRole: string;
  target: string;
  timestamp: string;
  details: string;
  result: 'SUCCESS' | 'REJECTED' | 'FAILED';
}
