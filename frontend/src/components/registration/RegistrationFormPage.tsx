/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  UploadCloud,
  FileCheck,
  X,
  Send,
  Receipt,
  CheckCircle2,
  User,
  Phone,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  SessionItem,
  DashboardRole,
  RegistrantItem,
  RegistrationFormConfig,
} from '../../types';
import { getSessionCapacity } from '../../utils/capacityHelper';
import { storageService } from '../../services/storageService';
import { registrationApi } from '../../services/registrationApi';
import { authApi } from '../../services/apiClient';
import { PaymentDetailsCard } from './PaymentDetailsCard';
import {
  INVALID_EMAIL_MESSAGE,
  INVALID_NAME_MESSAGE,
  INVALID_PHONE_MESSAGE,
  INVALID_RECEIPT_TYPE_MESSAGE,
  isValidEmail,
  isValidName,
  isValidPhone,
  isValidRollNumber,
  normalizePhone,
  validateReceiptFile,
  phoneChars,
  digitsOnly,
} from '../../utils/validators';

interface RegistrationFormPageProps {
  session?: SessionItem | null;
  formConfig: RegistrationFormConfig;
  currentRole: DashboardRole;
  onBack: () => void;
  onSubmitSuccess: (registrant: RegistrantItem) => void | Promise<void>;
  onNotify: (msg: string) => void;
  onGoToAuth: (mode: 'login' | 'signup') => void;
}

export const RegistrationFormPage: React.FC<RegistrationFormPageProps> = ({
  session,
  formConfig,
  currentRole,
  onBack,
  onSubmitSuccess,
  onNotify,
  onGoToAuth,
}) => {
  const isGuest = currentRole === 'guest';
  const capacityInfo = getSessionCapacity(session);
  const isWaitlistMode = capacityInfo.isCapacityFull;
  const [step, setStep] = useState<'form' | 'review' | 'confirmed'>('form');

  // Guest Specific Mandatory & Optional Fields
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestSecondaryEmail, setGuestSecondaryEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestInstitution, setGuestInstitution] = useState('');
  const [institution, setInstitution] = useState(() => {
    try {
      const raw = sessionStorage.getItem('sems_active_session');
      return raw ? String(JSON.parse(raw)?.institution ?? '') : '';
    } catch {
      return '';
    }
  });

  // Submission loading & error state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Dynamic form responses map
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    let activeUser: any = null;
    try {
      const raw = sessionStorage.getItem('sems_active_session');
      if (raw) activeUser = JSON.parse(raw);
    } catch {
      // safe fallback
    }

    const defaults: Record<string, string> = {};
    formConfig.fields.forEach((field) => {
      if (field.id === 'f-name' && currentRole === 'student') {
        defaults[field.id] = activeUser?.name || '';
      } else if (field.id === 'f-roll' && currentRole === 'student') {
        defaults[field.id] = activeUser?.rollNumber || '';
      } else if (field.id === 'f-email' && currentRole === 'student') {
        defaults[field.id] = activeUser?.primaryEmail || activeUser?.email || '';
      } else if (field.id === 'f-secondary-email' && currentRole === 'student') {
        defaults[field.id] = activeUser?.secondaryEmail || '';
      } else if (field.id === 'f-dept' && currentRole === 'student') {
        defaults[field.id] = activeUser?.department || (field.defaultValue || '');
      } else if (field.id === 'f-phone' && currentRole === 'student') {
        defaults[field.id] = activeUser?.phone || '';
      } else if (field.defaultValue) {
        defaults[field.id] = field.defaultValue;
      } else {
        defaults[field.id] = '';
      }
    });
    return defaults;
  });

  // Receipt file upload state for paid sessions (max 5 MB)
  const [receiptFile, setReceiptFile] = useState<{
    name: string;
    size: string;
    previewUrl?: string;
    originalBytes?: number;
    compressedBytes?: number;
    mimeType?: string;
  } | null>(null);
  const [receiptUploadFile, setReceiptUploadFile] = useState<File | null>(null);
  const [registeredItem, setRegisteredItem] = useState<RegistrantItem | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelection = async (file: File) => {
    const fileError = validateReceiptFile(file);
    if (fileError) {
      setErrors((prev) => ({ ...prev, receipt: fileError }));
      onNotify(fileError);
      return;
    }

    setIsCompressing(true);
    setReceiptUploadFile(file);
    try {
      // Client-side Canvas downscaling: shrinks 2-10MB mobile photos to ~80-160KB
      const compressed = await storageService.compressImage(file);

      setReceiptFile({
        name: file.name,
        size: formatFileSize(compressed.compressedSize),
        previewUrl: compressed.dataUrl,
        originalBytes: compressed.originalSize,
        compressedBytes: compressed.compressedSize,
        mimeType: compressed.mimeType,
      });

      if (compressed.originalSize > compressed.compressedSize * 1.5) {
        onNotify(
          `Receipt optimized: ${formatFileSize(compressed.originalSize)} -> ${formatFileSize(
            compressed.compressedSize
          )} (Offline-safe)`
        );
      }
    } catch (err) {
      console.warn('Image compression fallback:', err);
      // Fallback to FileReader DataURL
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setReceiptFile({
          name: file.name,
          size: formatFileSize(file.size),
          previewUrl: dataUrl,
          originalBytes: file.size,
          compressedBytes: file.size,
        });
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
    }

    if (errors.receipt) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.receipt;
        return copy;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (isGuest) {
      if (!isValidName(guestName)) newErrors.guestName = INVALID_NAME_MESSAGE;
      if (!isValidEmail(guestEmail)) {
        newErrors.guestEmail = INVALID_EMAIL_MESSAGE;
      }
      if (guestSecondaryEmail.trim()) {
        if (!isValidEmail(guestSecondaryEmail)) {
          newErrors.guestSecondaryEmail = 'Please enter a valid secondary email address.';
        } else if (guestSecondaryEmail.trim().toLowerCase() === guestEmail.trim().toLowerCase()) {
          newErrors.guestSecondaryEmail = 'Secondary email must differ from primary email.';
        }
      }
      if (!isValidPhone(guestPhone)) newErrors.guestPhone = INVALID_PHONE_MESSAGE;
      if (!guestInstitution.trim()) newErrors.guestInstitution = 'Institutional affiliation is mandatory.';
    } else if (institution.trim().length > 150) {
      newErrors.institution = 'Institution must be 150 characters or fewer.';
    }

    formConfig.fields.forEach((field) => {
      // Don't duplicate guest fields if covered above
      if (isGuest && (field.id === 'f-name' || field.id === 'f-email' || field.id === 'f-phone')) {
        return;
      }
      const val = formValues[field.id]?.trim() || '';
      if (field.type === 'file') return;
      if (field.required && !val) {
        newErrors[field.id] = `${field.label} is required.`;
        return;
      }

      if (val && field.validation) {
        const v = field.validation;
        if (v.minLength && val.length < v.minLength) {
          newErrors[field.id] = `${field.label} must be at least ${v.minLength} characters.`;
          return;
        }
        if (field.id === 'f-name' && val && !isValidName(val)) newErrors[field.id] = INVALID_NAME_MESSAGE;
        if (field.id === 'f-email' && val && !isValidEmail(val)) newErrors[field.id] = INVALID_EMAIL_MESSAGE;
        if (field.id === 'f-phone' && val && !isValidPhone(val)) newErrors[field.id] = INVALID_PHONE_MESSAGE;
        if (field.id === 'f-roll' && val && !isValidRollNumber(val)) {
          newErrors[field.id] = 'Roll number must be 3 to 15 digits, for example 24004376045.';
        }
        if (v.maxLength && val.length > v.maxLength) {
          newErrors[field.id] = `${field.label} cannot exceed ${v.maxLength} characters.`;
          return;
        }
        if (field.type === 'number') {
          const num = parseFloat(val);
          if (isNaN(num)) {
            newErrors[field.id] = `${field.label} must be a valid number.`;
            return;
          }
          if (v.minVal !== undefined && num < v.minVal) {
            newErrors[field.id] = `${field.label} must be at least ${v.minVal}.`;
            return;
          }
          if (v.maxVal !== undefined && num > v.maxVal) {
            newErrors[field.id] = `${field.label} cannot exceed ${v.maxVal}.`;
            return;
          }
        }
        if (v.pattern) {
          try {
            const regex = new RegExp(v.pattern);
            if (!regex.test(val)) {
              newErrors[field.id] = v.patternErrorMessage || `${field.label} does not match required format.`;
              return;
            }
          } catch {
            // ignore
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      onNotify('Please complete all required fields and review errors.');
      return;
    }
    setStep('review');
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return; // Prevent double-click submission
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (!session?.id) {
        throw new Error('Session is unavailable.');
      }

      if (!isGuest) {
        await authApi.updateProfile({
          phone: normalizePhone(formValues['f-phone'] || ''),
          rollNumber: formValues['f-roll']?.trim() || '',
          department: formValues['f-dept']?.trim() || '',
          institution: institution.trim(),
        });
      }
      const registration = await registrationApi.register(session.id);
      setRegisteredItem(registration);
      await onSubmitSuccess(registration);
      onNotify(
        registration.backendStatus === 'CONFIRMED'
          ? 'You are registered. Your seat is confirmed.'
          : 'Registered. Upload your payment receipt. Your seat is confirmed only after an admin approves it.'
      );
      // Success achieved: now transition to confirmed screen
      setStep('confirmed');
    } catch (err: any) {
      console.error('Registration submission error:', err);
      setSubmitError(err?.message || 'Failed to submit registration. Please try again.');
      onNotify('Submission failed: ' + (err?.message || 'Please retry.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadReceipt = async () => {
    if (!registeredItem || !receiptUploadFile) return;
    const fileError = validateReceiptFile(receiptUploadFile);
    if (fileError) {
      setErrors((prev) => ({ ...prev, receipt: fileError }));
      onNotify(fileError);
      return;
    }
    setIsUploadingReceipt(true);
    try {
      const updated = await registrationApi.uploadReceipt(registeredItem.id, receiptUploadFile);
      setRegisteredItem(updated);
      setReceiptUploadFile(null);
      setReceiptFile(null);
      onNotify(
        updated.backendStatus === 'PAYMENT_PENDING'
          ? 'Receipt uploaded. Your seat is confirmed only after an admin approves it.'
          : 'Receipt uploaded.'
      );
      await onSubmitSuccess(updated);
    } catch (error: any) {
      onNotify(error?.message || 'Failed to upload receipt.');
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  return (
    <div id="registration-form-page" className="w-full space-y-6 animate-fadeIn pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.10]">
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
            <h2 className="font-poppins font-semibold text-2xl text-white">
              Event Registration
            </h2>
            <span className="text-xs font-inter text-[var(--text-sec-80)]">
              {session?.title || 'Society Session Registration'} • Schema V{formConfig.version || 1}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isWaitlistMode ? (
            <span className="text-xs font-semibold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Waitlist Mode (Queue #{capacityInfo.waitlistCount + 1})</span>
            </span>
          ) : isGuest ? (
            <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 px-2.5 py-0.5 rounded-full">
              Guest Registration (No Login Required)
            </span>
          ) : null}
          {session?.isPaid ? (
            <span className="text-xs font-medium text-amber-300 bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-full">
              Fee: PKR {session.amount} {isWaitlistMode ? '(Pay on confirmation)' : ''}
            </span>
          ) : (
            <span className="text-xs font-medium text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full">
              Free Admission
            </span>
          )}
        </div>
      </div>

      {/* Multi-Step Wizard Content */}
      {step === 'confirmed' ? (
        <div className="max-w-xl mx-auto glass-panel p-8 rounded-2xl text-center space-y-5 animate-fadeIn">
          <div className={`w-16 h-16 rounded-full border mx-auto flex items-center justify-center ${
            isWaitlistMode
              ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
              : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
          }`}>
            {isWaitlistMode ? <Clock className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
          </div>
          <div className="space-y-1.5">
            <h3 className="text-2xl font-poppins font-semibold text-white">
              {isWaitlistMode ? 'Waitlist Registration Recorded!' : 'Registration Submitted!'}
            </h3>
            <p className="text-xs text-[var(--text-sec-80)] leading-relaxed max-w-md mx-auto">
              {isWaitlistMode
                ? `You have been placed on the Priority Waitlist for "${session?.title}" at Queue Position #${capacityInfo.waitlistCount + 1}. If an enrolled attendee withdraws or their payment fails verification, you will receive an instant notification to confirm your seat.`
                : `Your registration for "${session?.title}" has been recorded under Schema V${formConfig.version || 1}.${
                    registeredItem?.backendStatus === 'PAYMENT_PENDING'
                      ? ' Registered. Upload your payment receipt. Your seat is confirmed only after an admin approves it.'
                      : ' You are registered. Your seat is confirmed.'
                  }`}
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.12] text-[11px] font-mono text-white/60">
              <span>Backend registration status: {registeredItem?.backendStatus || 'UNKNOWN'}</span>
              <span>•</span>
              <span>No local registration record</span>
            </div>
          </div>
          {session?.isPaid && registeredItem?.backendStatus === 'PAYMENT_PENDING' && (
            <div className="space-y-2 text-left border-t border-white/[0.1] pt-4">
              <PaymentDetailsCard details={session?.paymentDetails} isPaid={session?.isPaid} />
              <label className="block text-xs font-medium text-white">Upload payment receipt</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleFileSelection(file);
                }}
                className="block w-full text-xs text-white/70"
              />
              {errors.receipt && <p className="text-[11px] text-rose-300">{errors.receipt}</p>}
              <button
                type="button"
                disabled={!receiptUploadFile || isUploadingReceipt}
                onClick={handleUploadReceipt}
                className="px-4 py-2 rounded-xl bg-[var(--primary-accent)] text-xs text-white disabled:opacity-50"
              >
                {isUploadingReceipt ? 'Uploading...' : 'Upload receipt'}
              </button>
            </div>
          )}
          <div className="pt-2">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 text-white font-medium text-xs shadow cursor-pointer"
            >
              Return to Session
            </button>
          </div>
        </div>
      ) : step === 'review' ? (
        /* Review Step */
        <div className="max-w-2xl mx-auto glass-panel p-6 sm:p-8 rounded-2xl space-y-6 animate-fadeIn">
          <div className="border-b border-white/[0.10] pb-3">
            <span className="text-[11px] font-mono text-[var(--primary-accent)] uppercase">Step 2 of 2</span>
            <h3 className="font-poppins font-semibold text-xl text-white">Review Registration Details</h3>
            <p className="text-xs text-[var(--text-sec-70)]">
              Please double check all submitted information before final transmission.
            </p>
          </div>

          <div className="space-y-3 text-xs font-inter">
            <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-2">
              <span className="font-semibold text-white block uppercase text-[11px] text-[var(--primary-accent)]">
                Participant Details
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-white/50 block">Name:</span>
                  <span className="text-white font-medium">{isGuest ? guestName : formValues['f-name']}</span>
                </div>
                <div>
                  <span className="text-white/50 block">Email:</span>
                  <span className="text-white font-mono">{isGuest ? guestEmail : formValues['f-email']}</span>
                </div>
                {isGuest && guestSecondaryEmail && (
                  <div>
                    <span className="text-white/50 block">Secondary Email:</span>
                    <span className="text-white font-mono">{guestSecondaryEmail}</span>
                  </div>
                )}
                <div>
                  <span className="text-white/50 block">Phone:</span>
                  <span className="text-white font-mono">{isGuest ? guestPhone : formValues['f-phone']}</span>
                </div>
                <div>
                  <span className="text-white/50 block">Affiliation:</span>
                  <span className="text-white">{isGuest ? guestInstitution : formValues['f-dept']}</span>
                </div>
              </div>
            </div>

            {submitError && (
              <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {session?.isPaid && receiptFile && (
              <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between">
                <div>
                  <span className="text-white/50 block">Payment Receipt Uploaded:</span>
                  <span className="text-white font-mono">{receiptFile.name} ({receiptFile.size})</span>
                </div>
                <span className="text-[11px] text-amber-300 font-medium">PKR {session.amount} Pending Review</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/[0.10]">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setStep('form')}
              className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs text-white cursor-pointer disabled:opacity-50"
            >
              ← Back to Edit
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinalSubmit}
              className={`px-6 py-2.5 rounded-xl font-semibold text-xs text-white shadow-lg cursor-pointer flex items-center gap-2 disabled:opacity-60 ${
                isWaitlistMode
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 shadow-amber-950/40'
                  : 'bg-[var(--primary-accent)] hover:brightness-110'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{isWaitlistMode ? 'Confirm & Join Priority Waitlist' : 'Confirm & Submit Registration'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Form Input Step */
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleProceedToReview} noValidate className="glass-panel p-6 sm:p-8 rounded-2xl space-y-6">
            {/* Session Info Bar */}
            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.10] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs uppercase font-mono text-[var(--primary-accent)] tracking-wider">
                  Target Session
                </span>
                <h3 className="text-base font-semibold text-white">{session?.title}</h3>
                <p className="text-xs text-[var(--text-sec-80)] mt-0.5">
                  {session?.date} • {session?.time} • {session?.location}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs text-[var(--text-sec-70)] block">Required Fee</span>
                <span className="text-sm font-bold text-white">
                  {session?.isPaid ? `PKR ${session.amount}` : 'Free'}
                </span>
              </div>
            </div>

            {/* Waitlist Notice Banner */}
            {isWaitlistMode && (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-semibold text-amber-200 block text-sm">
                    ⚠️ Regular Seats Filled — Priority Waitlist Open
                  </span>
                  <p className="text-amber-100/80 leading-relaxed">
                    All regular seats for <strong>"{session?.title}"</strong> are currently occupied ({capacityInfo.capacityLabel}). Submitting this registration places you on the <strong>Priority Waitlist (Queue #{capacityInfo.waitlistCount + 1})</strong>. If an enrolled attendee withdraws or their payment is rejected, your seat will be automatically confirmed.
                  </p>
                </div>
              </div>
            )}

            {/* If GUEST: Mandatory Guest Fields as confirmed by project owner */}
            {isGuest && (
              <div className="space-y-4 p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30">
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-cyan-400" />
                    <span className="font-poppins font-medium text-xs text-white">Guest Attendee Identity</span>
                  </div>
                  <span className="text-[10px] text-cyan-300 font-mono">No Account Required</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-white font-medium mb-1">
                      Full Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Dr. Sarah Connor"
                      className={`w-full h-10 px-3 rounded-xl bg-white/[0.06] border text-white focus:outline-none ${
                        errors.guestName ? 'border-rose-400' : 'border-white/[0.15]'
                      }`}
                    />
                    {errors.guestName && <p className="text-[11px] text-rose-300 mt-0.5">{errors.guestName}</p>}
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-1">
                      Primary Contact Email <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => {
                        const value = e.target.value;
                        setGuestEmail(value);
                        setErrors((prev) => {
                          const next = { ...prev };
                          if (value.trim() && !isValidEmail(value)) next.guestEmail = INVALID_EMAIL_MESSAGE;
                          else delete next.guestEmail;
                          return next;
                        });
                      }}
                      onBlur={() => {
                        if (!isValidEmail(guestEmail)) {
                          setErrors((prev) => ({ ...prev, guestEmail: INVALID_EMAIL_MESSAGE }));
                        }
                      }}
                      maxLength={254}
                      placeholder="guest@organization.com"
                      className={`w-full h-10 px-3 rounded-xl bg-white/[0.06] border text-white focus:outline-none ${
                        errors.guestEmail ? 'border-rose-400' : 'border-white/[0.15]'
                      }`}
                    />
                    {errors.guestEmail && <p className="text-[11px] text-rose-300 mt-0.5">{errors.guestEmail}</p>}
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-1">
                      Secondary / Personal Email <span className="text-white/40 text-[10px] font-normal">(Optional)</span>
                    </label>
                    <input
                      type="email"
                      value={guestSecondaryEmail}
                      onChange={(e) => {
                        const value = e.target.value;
                        setGuestSecondaryEmail(value);
                        setErrors((prev) => {
                          const next = { ...prev };
                          if (value.trim() && !isValidEmail(value)) next.guestSecondaryEmail = INVALID_EMAIL_MESSAGE;
                          else delete next.guestSecondaryEmail;
                          return next;
                        });
                      }}
                      onBlur={() => {
                        if (guestSecondaryEmail.trim() && !isValidEmail(guestSecondaryEmail)) {
                          setErrors((prev) => ({ ...prev, guestSecondaryEmail: INVALID_EMAIL_MESSAGE }));
                        }
                      }}
                      placeholder="e.g. personal.backup@gmail.com"
                      className={`w-full h-10 px-3 rounded-xl bg-white/[0.06] border text-white focus:outline-none ${
                        errors.guestSecondaryEmail ? 'border-rose-400' : 'border-white/[0.15]'
                      }`}
                    />
                    {errors.guestSecondaryEmail ? (
                      <p className="text-[11px] text-rose-300 mt-0.5">{errors.guestSecondaryEmail}</p>
                    ) : (
                      <p className="text-[10px] text-white/40 mt-0.5">Separate recovery address if needed</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-1">
                      Phone Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(phoneChars(e.target.value))}
                      maxLength={11}
                      inputMode="numeric"
                      placeholder="03001234567"
                      className={`w-full h-10 px-3 rounded-xl bg-white/[0.06] border text-white focus:outline-none ${
                        errors.guestPhone ? 'border-rose-400' : 'border-white/[0.15]'
                      }`}
                    />
                    {errors.guestPhone && <p className="text-[11px] text-rose-300 mt-0.5">{errors.guestPhone}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-white font-medium mb-1">
                      Institutional Affiliation / Company <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={guestInstitution}
                      onChange={(e) => setGuestInstitution(e.target.value)}
                      placeholder="e.g. NUST / Tech Labs Ltd"
                      className={`w-full h-10 px-3 rounded-xl bg-white/[0.06] border text-white focus:outline-none ${
                        errors.guestInstitution ? 'border-rose-400' : 'border-white/[0.15]'
                      }`}
                    />
                    {errors.guestInstitution && <p className="text-[11px] text-rose-300 mt-0.5">{errors.guestInstitution}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Form Questions */}
            {!isGuest && (
              <div className="space-y-1.5 text-xs">
                <label className="block font-inter font-medium text-white">
                  Institution
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(event) => setInstitution(event.target.value)}
                  maxLength={150}
                  autoComplete="organization"
                  className="w-full h-10 px-3 rounded-xl bg-white/[0.06] border border-white/[0.15] text-white focus:outline-none focus:border-[var(--primary-accent)]"
                />
              </div>
            )}

            <div className="space-y-4">
              <span className="font-poppins text-xs font-semibold uppercase tracking-wider text-[var(--primary-accent)] block">
                Session Questionnaire
              </span>

              {formConfig.fields.map((field) => {
                // If guest already filled top fields, skip redundant duplicates
                if (field.type === 'file' || (isGuest && (field.id === 'f-name' || field.id === 'f-email' || field.id === 'f-phone'))) {
                  return null;
                }

                return (
                  <div key={field.id} className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <label className="block font-inter font-medium text-white">
                        {field.label} {field.required && <span className="text-rose-400">*</span>}
                      </label>
                      {field.validation?.maxLength && (
                        <span className="text-[10px] font-mono text-[var(--text-sec-60)]">
                          {(formValues[field.id] || '').length} / {field.validation.maxLength}
                        </span>
                      )}
                    </div>

                    {field.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        value={formValues[field.id] || ''}
                        onChange={(e) => {
                          const value =
                            field.id === 'f-phone'
                              ? phoneChars(e.target.value)
                              : field.id === 'f-roll'
                              ? digitsOnly(e.target.value)
                              : e.target.value;
                          setFormValues({ ...formValues, [field.id]: value });
                          if (field.type === 'email') {
                            setErrors((prev) => {
                              const next = { ...prev };
                              if (value.trim() && !isValidEmail(value)) next[field.id] = INVALID_EMAIL_MESSAGE;
                              else delete next[field.id];
                              return next;
                            });
                          }
                        }}
                        onBlur={() => {
                          const value = (formValues[field.id] || '').trim();
                          if (field.type === 'email' && value && !isValidEmail(value)) {
                            setErrors((prev) => ({ ...prev, [field.id]: INVALID_EMAIL_MESSAGE }));
                          }
                        }}
                        inputMode={field.id === 'f-phone' ? 'tel' : field.id === 'f-roll' ? 'numeric' : undefined}
                        readOnly={!isGuest && (field.id === 'f-name' || field.id === 'f-email')}
                        placeholder={field.placeholder}
                        maxLength={field.validation?.maxLength}
                        className={`w-full p-3 rounded-xl bg-white/[0.06] border text-white focus:outline-none focus:border-[var(--primary-accent)] resize-none ${
                          errors[field.id] ? 'border-rose-400' : 'border-white/[0.15]'
                        }`}
                      />
                    ) : field.type === 'dropdown' ? (
                      <select
                        value={formValues[field.id] || field.options?.[0] || ''}
                        onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
                        className={`w-full h-10 px-3 rounded-xl bg-white/[0.06] border text-white focus:outline-none ${
                          errors[field.id] ? 'border-rose-400' : 'border-white/[0.15]'
                        }`}
                      >
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt} className="bg-slate-900">
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                        value={formValues[field.id] || ''}
                        onChange={(e) => {
                          const value =
                            field.id === 'f-phone'
                              ? phoneChars(e.target.value)
                              : field.id === 'f-roll'
                              ? digitsOnly(e.target.value)
                              : e.target.value;
                          setFormValues({ ...formValues, [field.id]: value });
                        }}
                        inputMode={field.id === 'f-phone' ? 'tel' : field.id === 'f-roll' ? 'numeric' : undefined}
                        readOnly={!isGuest && (field.id === 'f-name' || field.id === 'f-email')}
                        placeholder={field.placeholder}
                        maxLength={field.validation?.maxLength}
                        className={`w-full h-10 px-3 rounded-xl bg-white/[0.06] border text-white focus:outline-none ${
                          errors[field.id] ? 'border-rose-400' : 'border-white/[0.15]'
                        }`}
                      />
                    )}
                    {errors[field.id] && <p className="text-[11px] text-rose-300">{errors[field.id]}</p>}
                    {field.helpText && !errors[field.id] && (
                      <p className="text-[11px] text-[var(--text-sec-60)]">{field.helpText}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Next Step Button */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.10]">
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || Object.values(errors).some(Boolean)}
                className="px-6 py-2.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 text-xs font-semibold text-white shadow-lg cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Continue to Review</span>
                <span>→</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
