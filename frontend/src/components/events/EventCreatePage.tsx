/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  AlertCircle,
  Save,
  Image,
  UploadCloud,
  X,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { EventItem, DashboardRole, EventStatus } from '../../types';

const PREDEFINED_CATEGORIES = [
  'Robotics & Hardware',
  'Design & Media',
  'Cloud & DevOps',
  'Cybersecurity',
  'AI & Machine Learning',
  'Finance & FinTech',
  'Literary & Oratory',
  'General Campus',
];

interface EventCreatePageProps {
  currentRole: DashboardRole;
  currentUserEmail?: string;
  initialEvent?: EventItem | null;
  onBack: () => void;
  onSave: (event: Omit<EventItem, 'id' | 'createdAt'>, eventId?: string) => void;
  onNotify: (msg: string) => void;
}

export const EventCreatePage: React.FC<EventCreatePageProps> = ({
  currentRole,
  currentUserEmail,
  initialEvent,
  onBack,
  onSave,
  onNotify,
}) => {
  const isSuperAdmin = currentRole === 'super_admin';

  const [title, setTitle] = useState(initialEvent?.title || '');
  const [description, setDescription] = useState(initialEvent?.description || '');
  
  // Category state (support pre-defined or custom category)
  const initialCat = initialEvent?.category || 'Robotics & Hardware';
  const isInitialPredefined = PREDEFINED_CATEGORIES.includes(initialCat);
  const [category, setCategory] = useState(initialCat);
  const [isCustomCategory, setIsCustomCategory] = useState(!isInitialPredefined);
  const [customCategoryInput, setCustomCategoryInput] = useState(!isInitialPredefined ? initialCat : '');

  const [organizer, setOrganizer] = useState(initialEvent?.organizer || 'Robotics & AI Society');

  // Banner state: not required; supports image URL or PNG file upload
  const [bannerUrl, setBannerUrl] = useState(initialEvent?.bannerUrl || '');
  const [bannerPreview, setBannerPreview] = useState<string | null>(initialEvent?.bannerUrl || null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  const [registrationDeadline, setRegistrationDeadline] = useState(
    initialEvent?.registrationDeadline
      ? initialEvent.registrationDeadline.split('T')[0]
      : '2026-10-31'
  );

  // Payment deadline alongside registration deadline
  const [paymentDeadline, setPaymentDeadline] = useState(
    initialEvent?.paymentDeadline
      ? initialEvent.paymentDeadline.split('T')[0]
      : '2026-11-02'
  );

  const [isPaid, setIsPaid] = useState(initialEvent?.isPaid || false);
  const [feeAmount, setFeeAmount] = useState<number>(initialEvent?.feeAmount || 500);

  // Status selection (Only Super Admin can select directly)
  const [status, setStatus] = useState<EventStatus>(
    initialEvent?.status || (isSuperAdmin ? 'PUBLISHED' : 'PENDING_APPROVAL')
  );

  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    category?: string;
    organizer?: string;
    feeAmount?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onNotify('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setBannerUrl(dataUrl);
      setBannerPreview(dataUrl);
      onNotify('Banner image uploaded successfully!');
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const newErrors: {
      title?: string;
      description?: string;
      category?: string;
      organizer?: string;
      feeAmount?: string;
    } = {};

    if (!title.trim()) newErrors.title = 'Event title is required.';
    if (!description.trim()) newErrors.description = 'Event description is required.';
    
    const effectiveCategory = isCustomCategory ? customCategoryInput.trim() : category.trim();
    if (!effectiveCategory) newErrors.category = 'Event category is required.';
    
    if (!organizer.trim()) newErrors.organizer = 'Organizer society name is required.';
    if (isPaid && (feeAmount <= 0 || isNaN(feeAmount))) {
      newErrors.feeAmount = 'Valid fee amount required for paid events.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submission
    setSubmitError(null);

    // 1. Form validation first
    if (!validate()) {
      onNotify('Please complete all required fields.');
      return;
    }

    // 2. Submit/loading state
    setIsSubmitting(true);

    // Role-enforced status
    const effectiveStatus: EventStatus = isSuperAdmin ? status : 'PENDING_APPROVAL';
    const effectiveCategory = isCustomCategory ? customCategoryInput.trim() : category.trim();

    const eventPayload: Omit<EventItem, 'id' | 'createdAt'> = {
      title: title.trim(),
      description: description.trim(),
      category: effectiveCategory,
      organizer: organizer.trim(),
      status: effectiveStatus,
      bannerUrl: bannerUrl.trim() || undefined,
      registrationDeadline: `${registrationDeadline}T23:59:59Z`,
      paymentDeadline: isPaid && paymentDeadline ? `${paymentDeadline}T23:59:59Z` : undefined,
      isPaid,
      feeAmount: isPaid ? Number(feeAmount) : 0,
      createdBy: initialEvent?.createdBy || currentUserEmail || 'admin@university.edu.pk',
      sessions: initialEvent?.sessions || [],
      publishedAt: effectiveStatus === 'PUBLISHED' ? new Date().toISOString() : undefined,
      approvedBy: effectiveStatus === 'PUBLISHED' ? currentUserEmail : undefined,
    };

    // 3. Save operation executed and awaited
    try {
      await Promise.resolve(onSave(eventPayload, initialEvent?.id));

      // 4. Success result ONLY after save succeeds
      setSubmitSuccess(
        isSuperAdmin
          ? 'Event published successfully! Redirecting...'
          : 'Event submitted for Super Admin publication approval! Redirecting...'
      );
    } catch (err: any) {
      console.error('Failed to save event:', err);
      setSubmitError(err?.message || 'Failed to save event. Form inputs preserved. Please try again.');
      onNotify('Error saving event: ' + (err?.message || 'Please retry.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="event-create-page" className="w-full space-y-6 animate-fadeIn pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.10]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-poppins font-medium text-[22px] sm:text-[24px] text-white leading-tight">
              {initialEvent ? 'Edit Campus Event' : 'Propose New Campus Event'}
            </h2>
            <p className="text-xs font-inter text-[var(--text-sec-70)]">
              {initialEvent
                ? 'Update parent event details, registration rules, and categories'
                : 'Define a parent event entity. Multiple sessions can be scheduled inside it.'}
            </p>
          </div>
        </div>

        <span className="text-xs px-3 py-1 rounded-full bg-[var(--accent-15)] border border-[var(--accent-30)] text-[var(--primary-accent)]">
          {isSuperAdmin ? 'Super Admin Console' : 'Admin Console'}
        </span>
      </div>

      {/* Role Approval Notice Banner */}
      {!isSuperAdmin && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-semibold text-amber-200">
              Institutional Super Admin Approval Policy
            </h4>
            <p className="text-[11px] sm:text-xs text-amber-300/80 leading-relaxed">
              Events created by Administrators are saved in <span className="font-bold text-white">Pending Approval</span> status. Once submitted, an institutional Super Admin will inspect the event and approve it for campus-wide publication.
            </p>
          </div>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6 w-full max-w-4xl xl:max-w-5xl mx-auto">
        {submitError && (
          <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs sm:text-sm flex items-center gap-2.5 shadow-lg animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="font-medium">{submitError}</span>
          </div>
        )}

        {submitSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5 shadow-lg animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-medium">{submitSuccess}</span>
          </div>
        )}
        <div className="glass-panel p-6 sm:p-7 rounded-2xl space-y-5 border border-white/[0.10]">
          {/* Event Title */}
          <div>
            <label className="block text-xs font-medium text-white mb-1.5">
              Event Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. National Robotics & Autonomous Systems Summit 2026"
              className="w-full h-11 px-3.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[var(--primary-accent)]"
            />
            {errors.title && <p className="text-[11px] text-red-400 mt-1">{errors.title}</p>}
          </div>

          {/* Category & Organizer Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-white">
                  Category <span className="text-red-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomCategory(!isCustomCategory);
                    if (!isCustomCategory && !customCategoryInput) {
                      setCustomCategoryInput('');
                    }
                  }}
                  className="text-[11px] text-[var(--primary-accent)] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isCustomCategory ? 'Use Existing List' : '+ Custom Category'}</span>
                </button>
              </div>

              {isCustomCategory ? (
                <div>
                  <input
                    type="text"
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    placeholder="Enter new custom category (e.g. AgriTech & Biotech)"
                    className="w-full h-11 px-3.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[var(--primary-accent)]"
                  />
                  <p className="text-[10px] text-[var(--text-sec-70)] mt-1">
                    Custom category will be applied to this event and its child sessions.
                  </p>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-white/[0.12] text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--primary-accent)]"
                >
                  {PREDEFINED_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
              {errors.category && (
                <p className="text-[11px] text-red-400 mt-1">{errors.category}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-white mb-1.5">
                Hosting Society / Club <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
                placeholder="e.g. Robotics & AI Society"
                className="w-full h-11 px-3.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[var(--primary-accent)]"
              />
              {errors.organizer && (
                <p className="text-[11px] text-red-400 mt-1">{errors.organizer}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-white mb-1.5">
              Event Description & Objectives <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the parent event scope, participating speakers, key workshops, and who should attend..."
              rows={4}
              className="w-full p-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[var(--primary-accent)] leading-relaxed"
            />
            {errors.description && (
              <p className="text-[11px] text-red-400 mt-1">{errors.description}</p>
            )}
          </div>

          {/* Banner URL / PNG Upload (Optional - Document specifies banner is not required) */}
          <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-white flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
                <span>Event Banner Image (Optional)</span>
              </label>
              <span className="text-[10px] text-emerald-400/90 font-mono">
                PNG, JPG or Web URL
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={bannerUrl.startsWith('data:') ? 'Image uploaded from file (PNG/JPG)' : bannerUrl}
                onChange={(e) => {
                  setBannerUrl(e.target.value);
                  setBannerPreview(e.target.value);
                }}
                disabled={bannerUrl.startsWith('data:')}
                placeholder="Paste Image URL (https://...)"
                className="flex-1 h-10 px-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[var(--primary-accent)] disabled:opacity-75"
              />

              <input
                ref={bannerFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => bannerFileInputRef.current?.click()}
                className="h-10 px-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-xs text-white flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
                <span>Upload PNG / File</span>
              </button>

              {bannerPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setBannerUrl('');
                    setBannerPreview(null);
                    if (bannerFileInputRef.current) bannerFileInputRef.current.value = '';
                  }}
                  className="h-10 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs flex items-center justify-center cursor-pointer shrink-0"
                  title="Remove banner"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {bannerPreview && (
              <div className="mt-2 relative rounded-lg overflow-hidden border border-white/10 max-h-36">
                <img
                  src={bannerPreview}
                  alt="Event Banner Preview"
                  className="w-full h-32 object-cover"
                />
              </div>
            )}
            <p className="text-[10px] text-[var(--text-sec-60)]">
              Banner is completely optional. If left blank, a high-contrast themed banner will be generated automatically.
            </p>
          </div>

          {/* Registration Deadline, Payment Deadline & Fee Structure */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.08]">
            <div>
              <label className="block text-xs font-medium text-white mb-1.5">
                Registration Deadline <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--primary-accent)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white mb-1.5">
                Event Participation Fee
              </label>
              <div className="flex items-center gap-3 h-11">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-white">
                  <input
                    type="checkbox"
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                    className="w-4 h-4 rounded text-[var(--primary-accent)] focus:ring-[var(--primary-accent)]"
                  />
                  <span>Requires Registration Fee</span>
                </label>

                {isPaid && (
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/50">
                      Rs.
                    </span>
                    <input
                      type="number"
                      value={feeAmount}
                      onChange={(e) => setFeeAmount(Number(e.target.value))}
                      min={0}
                      step={50}
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--primary-accent)]"
                    />
                  </div>
                )}
              </div>
              {errors.feeAmount && (
                <p className="text-[11px] text-red-400 mt-1">{errors.feeAmount}</p>
              )}
            </div>

            {/* Payment Slip Submission Deadline (Issue 8) */}
            {isPaid && (
              <div className="sm:col-span-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <label className="block text-xs font-medium text-amber-200 mb-1.5">
                  Payment Slip Submission Deadline
                </label>
                <input
                  type="date"
                  value={paymentDeadline}
                  onChange={(e) => setPaymentDeadline(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-white/[0.06] border border-amber-400/30 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--primary-accent)]"
                />
                <p className="text-[10px] text-amber-300/80 mt-1">
                  Enrolled attendees must upload and verify their bank/EasyPaisa receipt before this date.
                </p>
              </div>
            )}
          </div>

          {/* Super Admin Status Override (Super Admin Only) */}
          {isSuperAdmin && (
            <div className="pt-2 border-t border-white/[0.08]">
              <label className="block text-xs font-medium text-white mb-1.5">
                Super Admin Lifecycle Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EventStatus)}
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-white/[0.12] text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--primary-accent)]"
              >
                <option value="PUBLISHED">Published (Immediately live for campus)</option>
                <option value="UPCOMING">Upcoming (Scheduled future event)</option>
                <option value="DRAFT">Draft (Internal planning)</option>
              </select>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs sm:text-sm text-white font-medium cursor-pointer transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 text-xs sm:text-sm text-white font-semibold cursor-pointer shadow-lg shadow-[var(--primary-accent)]/20 transition-all flex items-center gap-2 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Event...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{initialEvent ? 'Save Changes' : isSuperAdmin ? 'Publish Event' : 'Submit for Approval'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
