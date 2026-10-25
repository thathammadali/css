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

interface SessionCreatePageProps {
  currentRole: DashboardRole;
  initialSession?: SessionItem | null;
  availableEvents?: EventItem[];
  preselectedEventId?: string;
  onBack: () => void;
  onSave: (session: SessionItem) => void;
  onNotify: (msg: string) => void;
}

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

export const SessionCreatePage: React.FC<SessionCreatePageProps> = ({
  currentRole,
  initialSession,
  availableEvents = [],
  preselectedEventId,
  onBack,
  onSave,
  onNotify,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialSession?.eventId || preselectedEventId || (availableEvents[0]?.id || '')
  );
  const [title, setTitle] = useState(initialSession?.title || '');
  const [description, setDescription] = useState(initialSession?.description || '');
  const [date, setDate] = useState(initialSession?.date || '');
  const [startTime, setStartTime] = useState(
    initialSession?.time ? initialSession.time.split('–')[0]?.trim() : '14:00'
  );
  const [endTime, setEndTime] = useState(
    initialSession?.time ? initialSession.time.split('–')[1]?.trim() : '17:30'
  );
  const [timezone, setTimezone] = useState(initialSession?.timezone || 'PKT (UTC+5:00)');

  // Delivery Mode: In-Person / Online / Hybrid
  const [deliveryMode, setDeliveryMode] = useState<'in_person' | 'online' | 'hybrid'>(
    initialSession?.isOnline && !initialSession.location ? 'online' : initialSession?.isOnline ? 'hybrid' : 'in_person'
  );
  const [location, setLocation] = useState(initialSession?.location || 'Engineering Hall A-102');
  const [meetingUrl, setMeetingUrl] = useState(initialSession?.meetingUrl || '');
  const [meetingDetails, setMeetingDetails] = useState(initialSession?.meetingDetails || '');

  // Category selection & Custom Category support
  const parentEvt = availableEvents.find((e) => e.id === (initialSession?.eventId || preselectedEventId));
  const initialCategoryVal = initialSession?.category || parentEvt?.category || 'Technical Workshop';
  const isInitiallyCustom = !PREDEFINED_SESSION_CATEGORIES.includes(initialCategoryVal);

  const [category, setCategory] = useState(isInitiallyCustom ? 'Custom' : initialCategoryVal);
  const [isCustomCategory, setIsCustomCategory] = useState(isInitiallyCustom);
  const [customCategoryInput, setCustomCategoryInput] = useState(isInitiallyCustom ? initialCategoryVal : '');

  // Capacity / Seats
  const [totalSeats, setTotalSeats] = useState<number>(initialSession?.totalSeats || 60);

  // Society / Organizer
  const [society, setSociety] = useState(
    initialSession?.society ||
      (parentEvt?.organizer || 'Robotics & AI Society')
  );

  // Registration & Payment controls
  const [registrationRequired, setRegistrationRequired] = useState(
    initialSession?.registrationRequired !== undefined ? initialSession.registrationRequired : true
  );
  const [registrationDeadline, setRegistrationDeadline] = useState(
    initialSession?.registrationDeadline || ''
  );
  const [paymentRequired, setPaymentRequired] = useState(
    initialSession?.isPaid !== undefined ? initialSession.isPaid : false
  );
  const [amount, setAmount] = useState<number>(initialSession?.amount || 500);

  // Inline validation errors
  const [errors, setErrors] = useState<{
    eventId?: string;
    title?: string;
    date?: string;
    location?: string;
    meetingUrl?: string;
    category?: string;
    amount?: string;
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
    } = {};

    if (!selectedEventId.trim()) {
      newErrors.eventId = 'Parent event is required. Standalone sessions are not permitted.';
    }
    if (!title.trim()) {
      newErrors.title = 'Session title is required.';
    }
    if (!date.trim()) {
      newErrors.date = 'Session date is required.';
    }

    if (deliveryMode !== 'online' && !location.trim()) {
      newErrors.location = 'Physical venue / room location is required.';
    }
    if (deliveryMode !== 'in_person' && !meetingUrl.trim()) {
      newErrors.meetingUrl = 'Online meeting link (Zoom, Meet, Teams) is required.';
    }

    if (isCustomCategory && !customCategoryInput.trim()) {
      newErrors.category = 'Please enter a name for the custom category.';
    }

    if (paymentRequired && (amount <= 0 || isNaN(amount))) {
      newErrors.amount = 'Please enter a valid registration fee amount.';
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

    const formattedTime = `${startTime} – ${endTime}`;
    const parentEvent = availableEvents.find((evt) => evt.id === selectedEventId);
    const resolvedCategory = isCustomCategory
      ? customCategoryInput.trim()
      : category || parentEvent?.category || 'General Session';

    const isOnlineMode = deliveryMode === 'online' || deliveryMode === 'hybrid';
    const computedLocation = deliveryMode === 'online'
      ? (meetingDetails ? `Online (${meetingDetails})` : 'Virtual Session')
      : location.trim();

    const newSession: SessionItem = {
      id: initialSession?.id || `sess-${Date.now()}`,
      eventId: selectedEventId,
      parentEventTitle: parentEvent?.title || initialSession?.parentEventTitle || 'Campus Event',
      title: title.trim(),
      description: description.trim() || 'No description provided.',
      date: date.trim(),
      time: formattedTime,
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      timezone: timezone.trim(),
      location: computedLocation,
      isOnline: isOnlineMode,
      meetingUrl: isOnlineMode ? meetingUrl.trim() : undefined,
      meetingDetails: isOnlineMode ? meetingDetails.trim() : undefined,
      society: society.trim() || parentEvent?.organizer || 'University Society',
      status: initialSession?.status || 'open',
      capacity: `0 / ${totalSeats} slots filled`,
      totalSeats: Number(totalSeats) || 60,
      seatsRemaining: Number(totalSeats) || 60,
      category: resolvedCategory,
      registrationRequired: registrationRequired,
      registrationDeadline: registrationDeadline.trim() || undefined,
      isPaid: paymentRequired,
      amount: paymentRequired ? Number(amount) : 0,
      resources: initialSession?.resources || [
        {
          id: `res-${Date.now()}`,
          name: `${title.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}_agenda.pdf`,
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
                <span>{isCustomCategory ? 'Use Pre-defined List' : '+ Add Custom Category'}</span>
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
                <div className="space-y-1.5">
                  <label
                    htmlFor="session-meeting-url"
                    className="block font-inter text-xs sm:text-[13px] font-medium text-white"
                  >
                    Online Meeting URL (Zoom / Google Meet / Teams) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Video className="w-4 h-4 text-[var(--text-sec-70)] absolute left-3.5 top-3.5" />
                    <input
                      id="session-meeting-url"
                      type="url"
                      value={meetingUrl}
                      onChange={(e) => setMeetingUrl(e.target.value)}
                      placeholder="https://meet.google.com/xyz-abcd-efg"
                      className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-black/30 border border-white/[0.15] text-[14px] text-white focus:outline-none focus:border-[var(--primary-accent)] focus:ring-1 focus:ring-[var(--primary-accent)]"
                    />
                  </div>
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
              min={5}
              max={1000}
              step={5}
              value={totalSeats}
              onChange={(e) => setTotalSeats(Number(e.target.value))}
              className="w-full h-11 px-3.5 rounded-xl bg-black/30 border border-white/[0.15] text-[14px] text-white focus:outline-none focus:border-[var(--primary-accent)] focus:ring-1 focus:ring-[var(--primary-accent)]"
            />
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
                  Registration Fee (in PKR / Rs.) <span className="text-rose-400">*</span>
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
