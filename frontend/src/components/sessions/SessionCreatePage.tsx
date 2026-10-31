/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Save,
  Layers,
  Video,
  Users,
  Plus,
  Tag,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { SessionItem, DashboardRole, EventItem } from '../../types';
import { isIntegerInRange, isMoney } from '../../utils/validators';

interface SessionCreatePageProps {
  currentRole: DashboardRole;
  initialSession?: SessionItem | null;
  availableEvents?: EventItem[];
  preselectedEventId?: string;
  onBack: () => void;
  onSave: (session: SessionItem) => void;
  onNotify: (msg: string) => void;
}

const PAYMENT_METHODS = ['Bank transfer', 'JazzCash', 'Easypaisa', 'Other'];

const PREDEFINED_SESSION_CATEGORIES = [
  'Technical Workshop',
  'Hands-on Lab',
  'Seminar & Keynote',
  'Hackathon & Competition',
  'Guest Lecture',
  'Competitive Programming',
  'Career & Industry Panel',
  'Project Exhibition',
  'Networking Session',
  'General Session',
];

const TIMEZONES = [
  'PKT (UTC+5:00)',
  'UTC (UTC+0:00)',
  'EST (UTC-5:00)',
  'CST (UTC-6:00)',
  'PST (UTC-8:00)',
  'GMT (UTC+0:00)',
  'IST (UTC+5:30)',
  'SGT (UTC+8:00)',
  'AEST (UTC+10:00)',
];

const SESSION_TIMEZONE = 'Asia/Karachi';

function formatDateForInput(value: string | undefined, timezone: string): string {
  const text = String(value ?? '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(parsed);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatTimeForInput(value: string | undefined, timezone: string): string {
  const text = String(value ?? '').trim();
  if (/^\d{2}:\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed);
}

export const SessionCreatePage: React.FC<SessionCreatePageProps> = ({
  currentRole,
  initialSession,
  availableEvents = [],
  preselectedEventId,
  onBack,
  onSave,
  onNotify,
}) => {
  const initialSessionTimezone = String(initialSession?.timezone ?? '');
  const initialTimezone = TIMEZONES.includes(initialSessionTimezone)
    ? initialSessionTimezone
    : 'PKT (UTC+5:00)';
  const initialLinks = initialSession?.meeting_links ?? [];
  const hasInitialLocation = Boolean(
    String(initialSession?.location ?? '').trim() &&
      String(initialSession?.location ?? '').trim().toLowerCase() !== 'tba'
  );
  const hasInitialLinks = initialLinks.length > 0 || Boolean(initialSession?.meetingUrl);

  const [selectedEventId, setSelectedEventId] = useState<string>(
    String(initialSession?.eventId ?? preselectedEventId ?? availableEvents[0]?.id ?? '')
  );
  const [title, setTitle] = useState(String(initialSession?.title ?? ''));
  const [description, setDescription] = useState(String(initialSession?.description ?? ''));
  const [date, setDate] = useState(() =>
    formatDateForInput(initialSession?.startTime || initialSession?.date, SESSION_TIMEZONE)
  );
  const [startTime, setStartTime] = useState(
    () =>
      formatTimeForInput(
        initialSession?.startTime || initialSession?.time?.split(/[–-]/)[0],
        SESSION_TIMEZONE
      ) || '14:00'
  );
  const [endTime, setEndTime] = useState(
    () =>
      formatTimeForInput(
        initialSession?.endTime || initialSession?.time?.split(/[–-]/)[1],
        SESSION_TIMEZONE
      ) || '17:30'
  );
  const [timezone, setTimezone] = useState(initialTimezone);

  // Delivery Mode: In-Person / Online / Hybrid
  const [deliveryMode, setDeliveryMode] = useState<'in_person' | 'online' | 'hybrid'>(
    initialSession
      ? hasInitialLocation && hasInitialLinks
        ? 'hybrid'
        : hasInitialLinks
        ? 'online'
        : 'in_person'
      : 'in_person'
  );
  const [location, setLocation] = useState(
    String(initialSession?.location ?? 'Engineering Hall A-102')
  );
  type LinkRow = { url: string; label: string; isPublic: boolean };
  const [linkRows, setLinkRows] = useState<LinkRow[]>(() => {
    const existing: LinkRow[] = initialSession?.meeting_links?.length
      ? initialSession.meeting_links.map((l) => ({
          url: String(l.url ?? ''),
          label: String(l.label ?? ''),
          isPublic: Boolean(l.public),
        }))
      : initialSession?.meetingUrl
      ? [{ url: String(initialSession.meetingUrl), label: '', isPublic: false }]
      : [];
    return existing.length ? existing : [{ url: '', label: '', isPublic: false }];
  });
  const meetingUrl = linkRows[0]?.url || '';
  const [meetingDetails, setMeetingDetails] = useState(
    String(initialSession?.meetingDetails ?? '')
  );

  // Category selection & Custom Category support
  const parentEvt = availableEvents.find((e) => e.id === (initialSession?.eventId || preselectedEventId));
  const initialCategoryVal = String(
    initialSession?.category ?? parentEvt?.category ?? 'Technical Workshop'
  );
  const isInitiallyCustom = !PREDEFINED_SESSION_CATEGORIES.includes(initialCategoryVal);

  const [category, setCategory] = useState(isInitiallyCustom ? 'Custom' : initialCategoryVal);
  const [isCustomCategory, setIsCustomCategory] = useState(isInitiallyCustom);
  const [customCategoryInput, setCustomCategoryInput] = useState(
    isInitiallyCustom ? initialCategoryVal : ''
  );

  // Capacity / Seats
  const [totalSeats, setTotalSeats] = useState<number>(initialSession?.totalSeats || 60);

  // Society / Organizer
  const [society, setSociety] = useState(
    String(
      initialSession?.society ??
      (parentEvt?.organizer || 'Robotics & AI Society')
    )
  );

  // Registration & Payment controls
  const [registrationRequired, setRegistrationRequired] = useState(
    initialSession?.registrationRequired !== undefined ? initialSession.registrationRequired : true
  );
  const [registrationDeadline, setRegistrationDeadline] = useState(
    String(initialSession?.registrationDeadline ?? '')
  );
  const [paymentRequired, setPaymentRequired] = useState(
    initialSession?.isPaid !== undefined ? initialSession.isPaid : false
  );
  const [amount, setAmount] = useState<number>(initialSession?.amount || 500);

  // New sessions start from the payment details of another paid session in the same event.
  const findSiblingPaymentDetails = (eventId: string) =>
    availableEvents
      .find((e) => e.id === eventId)
      ?.sessions.find((s) => s.isPaid && s.paymentDetails?.accountNumber)?.paymentDetails;
  const [prefill] = useState(() => (initialSession ? undefined : findSiblingPaymentDetails(selectedEventId)));
  const [paymentMethod, setPaymentMethod] = useState(
    initialSession?.paymentDetails?.method || prefill?.method || PAYMENT_METHODS[0]
  );
  const [accountTitle, setAccountTitle] = useState(
    initialSession?.paymentDetails?.accountTitle || prefill?.accountTitle || ''
  );
  const [accountNumber, setAccountNumber] = useState(
    initialSession?.paymentDetails?.accountNumber || prefill?.accountNumber || ''
  );
  const [paymentInstructions, setPaymentInstructions] = useState(
    initialSession?.paymentDetails?.instructions || prefill?.instructions || ''
  );

  // Inline validation errors
  const [errors, setErrors] = useState<{
    eventId?: string;
    title?: string;
    date?: string;
    location?: string;
    meetingUrl?: string;
    category?: string;
    amount?: string;
    accountTitle?: string;
    accountNumber?: string;
    paymentInstructions?: string;
    capacity?: string;
  }>({});

  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState('');

  const validate = () => {
    const newErrors: {
      eventId?: string;
      title?: string;
      date?: string;
      location?: string;
      meetingUrl?: string;
      category?: string;
      amount?: string;
      accountTitle?: string;
      accountNumber?: string;
      paymentInstructions?: string;
      capacity?: string;
    } = {};

    if (!selectedEventId.trim()) {
      newErrors.eventId = 'Parent event is required. Standalone sessions are not permitted.';
    }
    if (title.trim().length < 3 || title.trim().length > 200) {
      newErrors.title = 'Session title must be between 3 and 200 characters.';
    }
    if (!date.trim() || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
      newErrors.date = 'Session date must be valid.';
    }
    if (startTime && endTime && endTime <= startTime) {
      newErrors.date = 'Session end time must be after the start time.';
    }
    if (
      registrationRequired &&
      registrationDeadline &&
      Number.isNaN(new Date(`${registrationDeadline}T00:00:00`).getTime())
    ) {
      newErrors.date = 'Registration deadline must be a valid date.';
    }

    if (deliveryMode !== 'online' && (!location.trim() || location.trim().length > 200)) {
      newErrors.location = 'Physical venue / room location is required.';
    }
    if (deliveryMode !== 'in_person') {
      const filled = linkRows.filter((r) => r.url.trim());
      if (filled.length === 0) {
        newErrors.meetingUrl = 'At least one meeting link (Zoom, Meet, YouTube, Teams) is required.';
      } else if (filled.some((r) => !/^https?:\/\//i.test(r.url.trim()))) {
        newErrors.meetingUrl = 'Every link must start with http:// or https://';
      }
    }

    if (isCustomCategory && !customCategoryInput.trim()) {
      newErrors.category = 'Please enter a name for the custom category.';
    }

    if (paymentRequired && (!isMoney(amount) || amount <= 0)) {
      newErrors.amount = 'Fee must be from 0 to 1,000,000 with at most 2 decimals.';
    }
    if (paymentRequired) {
      const accountTitleValue = accountTitle.trim();
      const accountNumberValue = accountNumber.trim();
      if (!accountTitleValue) {
        newErrors.accountTitle = 'Please enter the account title where students should send payment.';
      } else if (accountTitleValue.length > 100) {
        newErrors.accountTitle = 'Account title must be 100 characters or fewer.';
      }
      if (!accountNumberValue) {
        newErrors.accountNumber = 'Please enter the account number where students should send payment.';
      } else if (accountNumberValue.length > 34) {
        newErrors.accountNumber = 'Account number must be 34 characters or fewer.';
      } else if (!/^[A-Za-z0-9 -]+$/.test(accountNumberValue)) {
        newErrors.accountNumber = 'Account number can only contain letters, digits, spaces and dashes.';
      }
      if (paymentInstructions.trim().length > 500) {
        newErrors.paymentInstructions = 'Payment instructions must be 500 characters or fewer.';
      }
    }
    if (!isIntegerInRange(totalSeats, 1, 100000)) {
      newErrors.capacity = 'Capacity must be a whole number from 1 to 100,000.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);
    if (isSubmitting) return; // Prevent double submission
    setSubmitError(null);

    // 1. Form validation first
    if (!validate()) {
      onNotify('Please correct the highlighted fields before saving.');
      return;
    }

    // 2. Submit / loading state
    setIsSubmitting(true);

    const formattedTime = `${String(startTime ?? '')} – ${String(endTime ?? '')}`;
    const parentEvent = availableEvents.find((evt) => evt.id === selectedEventId);
    const resolvedCategory = isCustomCategory
      ? String(customCategoryInput ?? '').trim()
      : String(category ?? parentEvent?.category ?? 'General Session').trim();

    const isOnlineMode = deliveryMode === 'online' || deliveryMode === 'hybrid';
    const computedLocation = deliveryMode === 'online'
      ? (String(meetingDetails ?? '').trim()
        ? `Online (${String(meetingDetails ?? '').trim()})`
        : 'Virtual Session')
      : String(location ?? '').trim();
    const safeTitle = String(title ?? '').trim();
    const safeDescription = String(description ?? '').trim();
    const safeDate = String(date ?? '').trim();
    const safeStartTime = String(startTime ?? '').trim();
    const safeEndTime = String(endTime ?? '').trim();
    const safeTimezone = String(timezone ?? '').trim();
    const safeMeetingUrl = String(meetingUrl ?? '').trim();
    const safeRegistrationDeadline = String(registrationDeadline ?? '').trim();
    const safeSociety = String(society ?? '').trim();

    const newSession: SessionItem = {
      id: initialSession?.id || `sess-${Date.now()}`,
      eventId: selectedEventId,
      parentEventTitle: parentEvent?.title || initialSession?.parentEventTitle || 'Campus Event',
      title: safeTitle,
      description: safeDescription || 'No description provided.',
      date: safeDate,
      time: formattedTime,
      startTime: safeStartTime,
      endTime: safeEndTime,
      timezone: safeTimezone,
      location: computedLocation,
      isOnline: isOnlineMode,
      meetingUrl: isOnlineMode ? safeMeetingUrl : undefined,
      meeting_links: isOnlineMode
        ? linkRows
            .filter((r) => String(r.url ?? '').trim())
            .map((r) => ({
              platform: 'other' as const,
              label: String(r.label ?? '').trim() || null,
              url: String(r.url ?? '').trim(),
              public: r.isPublic,
            }))
        : undefined,
      meetingDetails: isOnlineMode ? String(meetingDetails ?? '').trim() : undefined,
      society: safeSociety || parentEvent?.organizer || 'University Society',
      status: initialSession?.status || 'open',
      capacity: `0 / ${totalSeats} slots filled`,
      totalSeats: Number(totalSeats) || 60,
      seatsRemaining: Number(totalSeats) || 60,
      category: resolvedCategory,
      registrationRequired: registrationRequired,
      registrationDeadline: safeRegistrationDeadline || undefined,
      isPaid: paymentRequired,
      amount: paymentRequired ? Number(amount) : 0,
      paymentDetails: paymentRequired
        ? {
            method: paymentMethod,
            accountTitle: accountTitle.trim(),
            accountNumber: accountNumber.trim(),
            instructions: paymentInstructions.trim() || undefined,
          }
        : undefined,
      resources: initialSession?.resources || [
        {
          id: `res-${Date.now()}`,
          name: `${safeTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_agenda.pdf`,
          size: '1.2 MB',
          type: 'pdf',
          category: 'pdf',
          isPublic: true,
        },
      ],
      tasks: initialSession?.tasks || [],
      comments: initialSession?.comments || [],
    };

    // 3. Save operation executed and awaited
    try {
      await Promise.resolve(onSave(newSession));

      // 4. Success result ONLY after save operation completes
      setSubmitSuccess(
        initialSession
          ? 'Session updated successfully! Redirecting...'
          : 'Session scheduled successfully! Redirecting...'
      );
    } catch (err: any) {
      console.error('Failed to save session:', err);
      setSubmitError(err?.message || 'Failed to save session. Form inputs preserved. Please try again.');
      onNotify('Error saving session: ' + (err?.message || 'Please retry.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="session-create-page" className="w-full space-y-6 animate-fadeIn pb-12">
      {/* Subheader */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.10]">
        <div className="flex items-center gap-3">
          <button
            id="btn-back-from-create"
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)]"
            aria-label="Back to sessions list"
            title="Back to sessions"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-poppins font-medium text-[22px] sm:text-[24px] text-white leading-tight">
              {initialSession ? 'Edit Session' : 'Schedule New Session'}
            </h2>
            <span className="text-xs font-inter text-[var(--text-sec-80)]">
              {initialSession
                ? 'Update session schedule, meeting details, and registration parameters'
                : 'Configure dedicated session schedule, venue, capacity, and intake rules'}
            </span>
          </div>
        </div>

        <span className="text-xs font-inter text-[var(--primary-accent)] bg-[var(--accent-15)] border border-[var(--accent-30)] px-3 py-1 rounded-full capitalize">
          {currentRole} Console
        </span>
      </div>

      {/* Glass Card Form */}
      <div className="w-full max-w-4xl xl:max-w-5xl mx-auto">
        <form
          id="form-new-session"
          onSubmit={handleSubmit}
          noValidate
          className="glass-panel p-6 sm:p-8 rounded-2xl space-y-6"
        >
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
          {/* 0. Parent Event Selection (Required - Prevents Orphan Sessions) */}
          <div className="space-y-1.5 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.10]">
            <label
              htmlFor="parent-event-select"
              className="flex items-center justify-between text-xs sm:text-[13px] font-medium text-white"
            >
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[var(--primary-accent)]" />
                <span>Parent Event Association</span>
                <span className="text-rose-400">*</span>
              </span>
              <span className="text-[11px] text-[var(--text-sec-70)]">
                Required — sessions belong to parent events
              </span>
            </label>

            {availableEvents.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                No events currently exist. Please create a parent event first.
              </div>
            ) : (
              <select
                id="parent-event-select"
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  const found = availableEvents.find((evt) => evt.id === e.target.value);
                  if (found) {
                    setSociety(found.organizer);
                    if (!isCustomCategory) {
                      setCategory(found.category);
                    }
                  }
                  if (hasSubmitted) {
                    setErrors((prev) => ({
                      ...prev,
                      eventId: e.target.value ? undefined : 'Parent event is required.',
                    }));
                  }
                }}
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-white/[0.15] text-xs sm:text-[13px] text-white focus:outline-none focus:border-[var(--primary-accent)] focus:ring-1 focus:ring-[var(--primary-accent)]"
              >
                <option value="" disabled>
                  -- Select Parent Event --
                </option>
                {availableEvents.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title} ({evt.organizer}) · [{evt.status}]
                  </option>
                ))}
              </select>
            )}

            {errors.eventId && (
              <p className="flex items-center gap-1 text-xs text-rose-300 font-inter pt-0.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.eventId}</span>
              </p>
            )}
          </div>

          {/* 1. Session Title */}
          <div className="space-y-1.5">
            <label
              htmlFor="session-title"
              className="block font-inter text-xs sm:text-[13px] font-medium text-white"
            >
              Session Title <span className="text-rose-400">*</span>
            </label>
            <input
              id="session-title"
              type="text"
              value={title}
              minLength={3}
              maxLength={200}
              onChange={(e) => {
                setTitle(e.target.value);
                if (hasSubmitted) {
                  setErrors((prev) => ({
                    ...prev,
                    title: e.target.value.trim() ? undefined : 'Session title is required.',
                  }));
                }
              }}
              placeholder="e.g. AI & Machine Learning Hands-on Bootcamp"
              className={`w-full h-11 px-3.5 rounded-xl bg-black/30 border text-[14px] text-white placeholder-white/35 focus:outline-none transition-colors ${
                errors.title
                  ? 'border-rose-400 focus:ring-1 focus:ring-rose-400 bg-rose-950/20'
                  : 'border-white/[0.15] focus:border-[var(--primary-accent)] focus:ring-1 focus:ring-[var(--primary-accent)]'
              }`}
            />
            {errors.title && (
              <p className="flex items-center gap-1 text-xs text-rose-300 font-inter pt-0.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.title}</span>
              </p>
            )}
          </div>

          {/* 2. Category with Custom Category Creation Support (Issue 5) */}
          <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-[13px] font-medium text-white flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
                <span>Session Category</span>
                <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCustomCategory(!isCustomCategory);
                  if (!isCustomCategory && !customCategoryInput) {
                    setCustomCategoryInput('');
                  }
                }}
                className="text-xs text-[var(--primary-accent)] hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isCustomCategory ? 'Use Pre-defined List' : 'Add Custom Category'}</span>
              </button>
            </div>

            {isCustomCategory ? (
              <div className="space-y-1">
                <input
                  type="text"
                  value={customCategoryInput}
                  onChange={(e) => setCustomCategoryInput(e.target.value)}
                  placeholder="Enter new custom category (e.g. Quantum Computing & Cryptography)"
                  className="w-full h-11 px-3.5 rounded-xl bg-black/30 border border-white/[0.15] text-[14px] text-white placeholder-white/35 focus:outline-none focus:border-[var(--primary-accent)] focus:ring-1 focus:ring-[var(--primary-accent)]"
                />
                <p className="text-[11px] text-[var(--text-sec-70)]">
                  Organizers can create any relevant custom category without being restricted to fixed categories.
                </p>
              </div>
            ) : (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-white/[0.15] text-xs sm:text-[13px] text-white focus:outline-none focus:border-[var(--primary-accent)] focus:ring-1 focus:ring-[var(--primary-accent)]"
              >
                {PREDEFINED_SESSION_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
            {errors.category && (
              <p className="text-xs text-rose-300 font-inter pt-0.5">{errors.category}</p>
            )}
          </div>

          {/* 3. Hosting Society Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="session-society"
              className="block font-inter text-xs sm:text-[13px] font-medium text-white"
            >
              Hosting Society / Department
            </label>
            <input
              id="session-society"
              type="text"
              value={society}
              onChange={(e) => setSociety(e.target.value)}
              placeholder="e.g. Robotics & AI Society"
              className="w-full h-11 px-3.5 rounded-xl bg-black/30 border border-white/[0.15] text-[14px] text-white focus:outline-none focus:border-[var(--primary-accent)] focus:ring-1 focus:ring-[var(--primary-accent)] transition-colors"
            />
          </div>

          {/* 4. Scheduling & Timezone Row (Issue 6) */}
          <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <span className="text-xs uppercase font-semibold tracking-wider text-[var(--primary-accent)] block">
              Session Scheduling & Timezone
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Date */}
              <div className="space-y-1.5 sm:col-span-1">
                <label
                  htmlFor="session-date"
                  className="block font-inter text-xs font-medium text-white"
                >
                  Date <span className="text-rose-400">*</span>
                </label>
                <input
                  id="session-date"
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (hasSubmitted) {
                      setErrors((prev) => ({
                        ...prev,
                        date: e.target.value.trim() ? undefined : 'Session date is required.',
                      }));
                    }
                  }}
                  className={`w-full h-11 px-3 rounded-xl bg-black/30 border text-[13px] text-white focus:outline-none transition-colors scheme-dark ${
                    errors.date
                      ? 'border-rose-400 focus:ring-1 focus:ring-rose-400 bg-rose-950/20'
                      : 'border-white/[0.15] focus:border-[var(--primary-accent)] focus:ring-1 focus:ring-[var(--primary-accent)]'
                  }`}
                />
              </div>

              {/* Start Time */}
              <div className="space-y-1.5 sm:col-span-1">
                <label
                  htmlFor="session-start-time"
                  className="block font-inter text-xs font-medium text-white"
                >
                  Start Time
                </label>
                <input
                  id="session-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-black/30 border border-white/[0.15] text-[13px] text-white focus:outline-none focus:border-[var(--primary-accent)] focus:ring-1 focus:ring-[var(--primary-accent)] transition-colors scheme-dark"
                />
              </div>

              {/* End Time */}
              <div className="space-y-1.5 sm:col-span-1">
                <label
                  htmlFor="session-end-time"
                  className="block font-inter text-xs font-medium text-white"
                >
                  End Time
                </label>
                <input
                  id="session-end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-black/30 border border-white/[0.15] text-[13px] text-white focus:outline-none focus:border-[var(--primary-accent)] focus:ring-1 focus:ring-[var(--primary-accent)] transition-colors scheme-dark"
                />
              </div>

              {/* Timezone */}
              <div className="space-y-1.5 sm:col-span-1">
                <label
                  htmlFor="session-timezone"
                  className="block font-inter text-xs font-medium text-white"
                >
                  Timezone
                </label>
                <select
                  id="session-timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full h-11 px-2.5 rounded-xl bg-slate-900 border border-white/[0.15] text-[12px] text-white focus:outline-none focus:border-[var(--primary-accent)] focus:ring-1 focus:ring-[var(--primary-accent)]"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {errors.date && (
              <p className="text-xs text-rose-300 font-inter pt-0.5">{errors.date}</p>
            )}
          </div>

          {/* 5. Location / Online Meeting Information (Issue 6) */}
          <div className="space-y-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold tracking-wider text-[var(--primary-accent)]">
                Venue & Online Meeting Details
              </span>
              <div className="flex rounded-lg bg-black/40 p-0.5 border border-white/[0.10]">
                <button
                  type="button"
                  onClick={() => setDeliveryMode('in_person')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    deliveryMode === 'in_person'
                      ? 'bg-[var(--primary-accent)] text-white shadow'
                      : 'text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  In-Person
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMode('online')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    deliveryMode === 'online'
                      ? 'bg-[var(--primary-accent)] text-white shadow'
                      : 'text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  Online
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMode('hybrid')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    deliveryMode === 'hybrid'
                      ? 'bg-[var(--primary-accent)] text-white shadow'
                      : 'text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  Hybrid
                </button>
              </div>
            </div>

            {/* In-Person Venue Field */}
            {deliveryMode !== 'online' && (
              <div className="space-y-1.5">
                <label
                  htmlFor="session-location"
                  className="block font-inter text-xs sm:text-[13px] font-medium text-white"
                >
                  Physical Venue / Hall Location <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[var(--text-sec-70)] absolute left-3.5 top-3.5" />
                  <input
                    id="session-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Engineering Hall A-102, Turing Lab"
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-black/30 border border-white/[0.15] text-[14px] text-white focus:outline-none focus:border-[var(--primary-accent)] focus:ring-1 focus:ring-[var(--primary-accent)]"
                  />
                </div>
                {errors.location && (
                  <p className="text-xs text-rose-300 font-inter pt-0.5">{errors.location}</p>
                )}
              </div>
            )}

            {/* Online Meeting Details */}
            {deliveryMode !== 'in_person' && (
              <div className="space-y-3 pt-1 border-t border-white/[0.06]">
                <div className="space-y-2">
                  <label className="block font-inter text-xs sm:text-[13px] font-medium text-white">
                    Online meeting links (Zoom / Google Meet / YouTube / Teams) <span className="text-rose-400">*</span>
                  </label>
                  {linkRows.map((row, idx) => (
                    <div key={idx} className="space-y-1.5 rounded-xl border border-white/[0.1] bg-black/20 p-2.5">
                      <div className="relative">
                        <Video className="w-4 h-4 text-[var(--text-sec-70)] absolute left-3.5 top-3.5" />
                        <input
                          type="url"
                          value={row.url}
                          onChange={(e) =>
                            setLinkRows((rows) => rows.map((r, i) => (i === idx ? { ...r, url: e.target.value } : r)))
                          }
                          placeholder={idx === 0 ? 'https://meet.google.com/xyz-abcd-efg' : 'https://youtube.com/live/...'}
                          className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-black/30 border border-white/[0.15] text-[14px] text-white focus:outline-none focus:border-[var(--primary-accent)] focus:ring-1 focus:ring-[var(--primary-accent)]"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          type="text"
                          value={row.label}
                          maxLength={60}
                          onChange={(e) =>
                            setLinkRows((rows) => rows.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)))
                          }
                          placeholder="Button label (optional), e.g. Live stream"
                          className="flex-1 min-w-[160px] h-9 px-3 rounded-lg bg-black/30 border border-white/[0.15] text-[13px] text-white"
                        />
                        <label className="inline-flex items-center gap-1.5 text-xs text-white cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.isPublic}
                            onChange={(e) =>
                              setLinkRows((rows) => rows.map((r, i) => (i === idx ? { ...r, isPublic: e.target.checked } : r)))
                            }
                          />
                          Visible to everyone
                        </label>
                        {linkRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setLinkRows((rows) => rows.filter((_, i) => i !== idx))}
                            className="text-xs text-rose-300 hover:text-rose-200"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {linkRows.length < 5 && (
                    <button
                      type="button"
                      onClick={() => setLinkRows((rows) => [...rows, { url: '', label: '', isPublic: false }])}
                      className="text-xs font-medium text-[var(--primary-accent)] hover:underline"
                    >
                      + Add another link
                    </button>
                  )}
                  {errors.meetingUrl && (
                    <p className="text-xs text-rose-300 font-inter pt-0.5">{errors.meetingUrl}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="session-meeting-details"
                    className="block font-inter text-xs sm:text-[13px] font-medium text-white"
                  >
                    Meeting Passcode / Access Instructions (Optional)
                  </label>
                  <input
                    id="session-meeting-details"
                    type="text"
                    value={meetingDetails}
                    onChange={(e) => setMeetingDetails(e.target.value)}
                    placeholder="Passcode or access instructions"
                    className="w-full h-11 px-3.5 rounded-xl bg-black/30 border border-white/[0.15] text-[14px] text-white focus:outline-none focus:border-[var(--primary-accent)] focus:ring-1 focus:ring-[var(--primary-accent)]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 6. Capacity & Seats (Issue 6) */}
          <div className="space-y-1.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <label
              htmlFor="session-seats"
              className="flex items-center justify-between text-xs sm:text-[13px] font-medium text-white"
            >
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[var(--primary-accent)]" />
                <span>Maximum Capacity / Seat Limit</span>
              </span>
              <span className="text-[11px] font-mono text-[var(--primary-accent)]">
                {totalSeats} Seats Total
              </span>
            </label>
            <input
              id="session-seats"
              type="number"
              min={1}
              max={100000}
              step={1}
              value={totalSeats}
              onChange={(e) => setTotalSeats(Number(e.target.value))}
              className="w-full h-11 px-3.5 rounded-xl bg-black/30 border border-white/[0.15] text-[14px] text-white focus:outline-none focus:border-[var(--primary-accent)] focus:ring-1 focus:ring-[var(--primary-accent)]"
            />
            {errors.capacity && <p className="text-[11px] text-rose-300">{errors.capacity}</p>}
            <p className="text-[11px] text-[var(--text-sec-70)]">
              Defines admission capacity. System will display available seats and block over-enrollment.
            </p>
          </div>

          {/* 7. Description & Curriculum Details */}
          <div className="space-y-1.5">
            <label
              htmlFor="session-description"
              className="block font-inter text-xs sm:text-[13px] font-medium text-white"
            >
              Curriculum, Description & Prerequisites
            </label>
            <textarea
              id="session-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline session curriculum, speakers, key takeaways, and prerequisites..."
              className="w-full p-3 rounded-xl bg-black/30 border border-white/[0.15] text-[14px] text-white placeholder-white/35 focus:outline-none focus:border-[var(--primary-accent)] focus:ring-1 focus:ring-[var(--primary-accent)] transition-colors resize-y"
            />
          </div>

          {/* 8. Registration & Payment Controls (Issue 6) */}
          <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.10] space-y-4">
            <span className="text-xs uppercase font-semibold tracking-wider text-[var(--primary-accent)] block">
              Admission & Payment Requirements
            </span>

            {/* Registration Required Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-white block">Registration Required?</span>
                <span className="text-xs text-[var(--text-sec-70)]">
                  Participants must register and reserve seats before attending
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={registrationRequired}
                  onChange={(e) => setRegistrationRequired(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-accent)]"></div>
              </label>
            </div>

            {/* Registration Deadline Date Picker */}
            {registrationRequired && (
              <div className="pt-2 border-t border-white/[0.06] space-y-1.5 animate-fadeIn">
                <label
                  htmlFor="session-deadline"
                  className="block font-inter text-xs font-medium text-white"
                >
                  Registration Deadline (Optional)
                </label>
                <input
                  id="session-deadline"
                  type="date"
                  value={registrationDeadline}
                  onChange={(e) => setRegistrationDeadline(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-black/30 border border-white/[0.15] text-[13px] text-white focus:outline-none focus:border-[var(--primary-accent)] scheme-dark"
                />
              </div>
            )}

            {/* Payment Required Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
              <div>
                <span className="text-sm font-medium text-white block">Payment Required?</span>
                <span className="text-xs text-[var(--text-sec-70)]">
                  Session requires ticket/seat fee receipt submission
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentRequired}
                  onChange={(e) => setPaymentRequired(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-accent)]"></div>
              </label>
            </div>

            {/* Payment Amount Input */}
            {paymentRequired && (
              <div className="pt-2 space-y-1.5 animate-fadeIn">
                <label
                  htmlFor="session-amount"
                  className="block font-inter text-xs font-medium text-white"
                >
                  Registration Fee (Rs.) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-xs font-semibold text-[var(--text-sec-70)]">
                    Rs.
                  </span>
                  <input
                    id="session-amount"
                    type="number"
                    min={0}
                    step={50}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="500"
                    className="w-full h-11 pl-12 pr-3.5 rounded-xl bg-black/40 border border-white/20 text-sm text-white focus:outline-none focus:border-[var(--primary-accent)]"
                  />
                </div>
                {errors.amount && (
                  <p className="text-xs text-rose-300 font-inter pt-0.5">{errors.amount}</p>
                )}
              </div>
            )}

            {/* Payment account details */}
            {paymentRequired && (
              <div className="pt-2 space-y-3 animate-fadeIn">
                <span className="block font-inter text-xs font-medium text-white">Payment details</span>
                <div className="space-y-1.5">
                  <label htmlFor="session-payment-method" className="block font-inter text-xs text-[var(--text-sec-70)]">
                    Payment method
                  </label>
                  <select
                    id="session-payment-method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/20 text-sm text-white focus:outline-none focus:border-[var(--primary-accent)]"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method} className="bg-slate-900">{method}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="session-account-title" className="block font-inter text-xs text-[var(--text-sec-70)]">
                    Account title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="session-account-title"
                    type="text"
                    maxLength={100}
                    value={accountTitle}
                    onChange={(e) => setAccountTitle(e.target.value)}
                    placeholder="e.g. Robotics & AI Society"
                    className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/20 text-sm text-white focus:outline-none focus:border-[var(--primary-accent)]"
                  />
                  {errors.accountTitle && (
                    <p className="text-xs text-rose-300 font-inter pt-0.5">{errors.accountTitle}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="session-account-number" className="block font-inter text-xs text-[var(--text-sec-70)]">
                    Account number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="session-account-number"
                    type="text"
                    maxLength={34}
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 0300-1234567 or PK36 SCBL 0000 0011 2345 6702"
                    className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/20 text-sm text-white focus:outline-none focus:border-[var(--primary-accent)]"
                  />
                  {errors.accountNumber && (
                    <p className="text-xs text-rose-300 font-inter pt-0.5">{errors.accountNumber}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="session-payment-instructions" className="block font-inter text-xs text-[var(--text-sec-70)]">
                    Instructions (optional)
                  </label>
                  <textarea
                    id="session-payment-instructions"
                    rows={3}
                    maxLength={500}
                    value={paymentInstructions}
                    onChange={(e) => setPaymentInstructions(e.target.value)}
                    placeholder="e.g. Write your roll number in the payment reference."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/20 text-sm text-white focus:outline-none focus:border-[var(--primary-accent)]"
                  />
                  {errors.paymentInstructions && (
                    <p className="text-xs text-rose-300 font-inter pt-0.5">{errors.paymentInstructions}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Submit Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button
              id="btn-save-session"
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-[48px] rounded-xl bg-[var(--primary-accent)] hover:brightness-110 active:scale-[0.99] text-white font-inter font-medium text-[14px] transition-all cursor-pointer shadow-lg shadow-[var(--primary-accent)]/20 flex items-center justify-center gap-2 select-none disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Session...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{initialSession ? 'Update Session' : 'Save & Publish Session'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={onBack}
              className="h-[48px] px-6 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.16] text-[var(--text-secondary)] hover:text-white font-inter text-[14px] transition-all cursor-pointer select-none disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
