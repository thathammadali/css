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

  // Submission loading & error state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Dynamic form responses map
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    let activeUser: any = null;
    try {
      const raw = localStorage.getItem('sems_active_session');
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
    const maxBytes = 5 * 1024 * 1024; // 5 MB per specification
    if (file.size > maxBytes) {
      setErrors((prev) => ({ ...prev, receipt: 'Receipt file exceeds 5 MB maximum allowed size.' }));
      onNotify('File too large: Maximum 5 MB per receipt upload.');
      return;
    }

    const validExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (!validExtensions.includes(ext)) {
      setErrors((prev) => ({ ...prev, receipt: 'Invalid format. Allowed: PDF, JPG, JPEG, PNG.' }));
      onNotify('Invalid file type: Please upload a JPG, PNG, or PDF slip.');
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
      if (!guestName.trim()) newErrors.guestName = 'Full name is mandatory.';
      if (!guestEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
        newErrors.guestEmail = 'Valid primary contact email is mandatory.';
      }
      if (guestSecondaryEmail.trim()) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestSecondaryEmail.trim())) {
          newErrors.guestSecondaryEmail = 'Please enter a valid secondary email address.';
        } else if (guestSecondaryEmail.trim().toLowerCase() === guestEmail.trim().toLowerCase()) {
          newErrors.guestSecondaryEmail = 'Secondary email must differ from primary email.';
        }
      }
      if (!guestPhone.trim()) newErrors.guestPhone = 'Phone number is mandatory.';
      if (!guestInstitution.trim()) newErrors.guestInstitution = 'Institutional affiliation is mandatory.';
    }

    formConfig.fields.forEach((field) => {
      // Don't duplicate guest fields if covered above
      if (isGuest && (field.id === 'f-name' || field.id === 'f-email' || field.id === 'f-phone')) {
        return;
      }
      const val = formValues[field.id]?.trim() || '';
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

    if (!isWaitlistMode && session?.isPaid && !receiptFile) {
      newErrors.receipt = 'Please upload your payment receipt before submitting.';
    }

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

      let registration = await registrationApi.register(session.id);
      if (session.isPaid && receiptUploadFile) {
        registration = await registrationApi.uploadReceipt(registration.id, receiptUploadFile);
      }
      await onSubmitSuccess(registration);
      onNotify(
        session.isPaid
          ? 'Registration submitted. Your payment is pending admin review.'
          : 'Registration confirmed! Admission seat successfully reserved.'
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
                    session?.isPaid
                      ? ' Your payment slip is pending review by Admins. Once approved, your seat will be confirmed.'
                      : ' Your seat is confirmed. Check your email for session details.'
                  }`}
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.12] text-[11px] font-mono text-white/60">
              <span>💾 Local Record</span>
              <span>•</span>
              <span>Slip safely cached in IndexedDB</span>
            </div>
          </div>
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
                      onChange={(e) => setGuestEmail(e.target.value)}
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
                      onChange={(e) => setGuestSecondaryEmail(e.target.value)}
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
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+92 300 1234567"
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
            <div className="space-y-4">
              <span className="font-poppins text-xs font-semibold uppercase tracking-wider text-[var(--primary-accent)] block">
                Session Questionnaire
              </span>

              {formConfig.fields.map((field) => {
                // If guest already filled top fields, skip redundant duplicates
                if (isGuest && (field.id === 'f-name' || field.id === 'f-email' || field.id === 'f-phone')) {
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
                        onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
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
                        onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
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

            {/* Manual Payment Receipt Upload (Strict 5 MB Constraint) */}
            {session?.isPaid && (
              <div className="space-y-3 pt-3 border-t border-white/[0.10]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-amber-300" />
                    <span className="font-poppins text-xs font-semibold text-white">
                      Payment Verification Slip <span className="text-rose-400">*</span>
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-sec-60)]">
                    Max 5 MB • PDF, JPG, PNG
                  </span>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.[0]) handleFileSelection(e.dataTransfer.files[0]);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-[var(--primary-accent)] bg-[var(--accent-15)]'
                      : errors.receipt
                      ? 'border-rose-500/50 bg-rose-950/20'
                      : 'border-white/[0.15] bg-white/[0.03] hover:border-white/[0.30]'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileSelection(e.target.files[0]);
                    }}
                    className="hidden"
                  />

                  {isCompressing ? (
                    <div className="flex flex-col items-center justify-center py-2 space-y-2">
                      <div className="w-6 h-6 border-2 border-[var(--primary-accent)] border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-white font-medium">Optimizing receipt image client-side...</p>
                      <p className="text-[11px] text-[var(--primary-accent)]">Compressing to lightweight offline format</p>
                    </div>
                  ) : receiptFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                      <div className="text-left text-xs font-inter">
                        <span className="text-white font-medium block truncate max-w-[200px] sm:max-w-xs">
                          {receiptFile.name}
                        </span>
                        <span className="text-emerald-400 text-[11px] block font-mono">
                          {receiptFile.size} • Offline Cached
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReceiptFile(null);
                        }}
                        className="p-1 rounded-lg text-rose-400 hover:bg-rose-950/40 ml-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <UploadCloud className="w-7 h-7 text-[var(--primary-accent)] mx-auto mb-1" />
                      <p className="text-xs text-white font-medium">Click to upload transfer slip or drag & drop</p>
                      <p className="text-[11px] text-[var(--text-sec-60)]">Bank deposit, EasyPaisa, or JazzCash receipt</p>
                    </div>
                  )}
                </div>
                {errors.receipt && <p className="text-[11px] text-rose-300 font-inter">{errors.receipt}</p>}
              </div>
            )}

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
                className="px-6 py-2.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 text-xs font-semibold text-white shadow-lg cursor-pointer flex items-center gap-2"
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
