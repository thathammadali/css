/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventItem, SessionItem, EventStatus, DashboardRole, SessionRecordingStatus } from '../types';
import { DEMO_MODE } from '../config';
import { INITIAL_EVENTS } from '../data/mockEvents';
import { notificationService } from './notificationService';
import { eventsApi } from './apiClient';

const EVENTS_STORAGE_KEY = 'sems_events_data';

export const eventService = {
  /**
   * Retrieves the authoritative Event hierarchy.
   * Ensures every child session has its parent eventId and parentEventTitle populated.
   */
  getEvents(): EventItem[] {
    try {
      const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
      if (stored) {
        const parsed: EventItem[] = JSON.parse(stored);
        // Guarantee referential integrity across sessions
        return parsed.map((evt) => ({
          ...evt,
          sessions: (evt.sessions || []).map((s) => ({
            ...s,
            eventId: evt.id,
            parentEventTitle: evt.title,
          })),
        }));
      }
    } catch {
      // Fallback to initial events
    }

    if (!DEMO_MODE) return [];

    // Initialize with verified INITIAL_EVENTS
    return INITIAL_EVENTS.map((evt) => ({
      ...evt,
      sessions: evt.sessions.map((s) => ({
        ...s,
        eventId: evt.id,
        parentEventTitle: evt.title,
      })),
    }));
  },

  /** Pull live events from the backend into the local cache the screens read. Returns false if offline. */
  async refreshFromBackend(): Promise<boolean> {
    const live = await eventsApi.fetchLive();
    if (!live) {
      console.warn('[SEMS] Live events refresh failed; showing cached data.');
      return false;
    }
    this.saveEvents(live);
    return true;
  },

  /**
   * Authoritative persistence of events and their child sessions.
   * Single source of truth.
   */
  saveEvents(events: EventItem[]): void {
    try {
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
    } catch {
      // Safe fallback
    }
  },

  /**
   * Derived flat collection of all sessions across all events.
   * Guarantees sessions are always derived from their parent events.
   */
  getAllSessions(): SessionItem[] {
    const events = this.getEvents();
    return events.flatMap((e) => e.sessions);
  },

  /**
   * Filters events according to user role:
   * - Super Admin & Admin: Can view all events including DRAFT and PENDING_APPROVAL.
   * - Student & Guest: Can only discover PUBLISHED, UPCOMING, or LIVE events.
   */
  getVisibleEvents(role: DashboardRole): EventItem[] {
    const events = this.getEvents();
    if (role === 'super_admin' || role === 'admin') {
      return events;
    }
    return events.filter(
      (e) => e.status === 'PUBLISHED' || e.status === 'UPCOMING' || e.status === 'LIVE'
    );
  },

  /**
   * Derived collection of visible sessions respecting Event lifecycle visibility.
   */
  getVisibleSessions(role: DashboardRole): SessionItem[] {
    return this.getVisibleEvents(role).flatMap((e) => e.sessions);
  },

  /**
   * Look up a specific event by ID.
   */
  getEventById(eventId: string): EventItem | undefined {
    return this.getEvents().find((e) => e.id === eventId);
  },

  /**
   * Look up a session and its parent event by session ID.
   */
  getSessionById(sessionId: string): { session: SessionItem; event: EventItem } | undefined {
    const events = this.getEvents();
    for (const evt of events) {
      const match = evt.sessions.find((s) => s.id === sessionId);
      if (match) {
        return { session: match, event: evt };
      }
    }
    return undefined;
  },

  /**
   * Creates a new Event with strict lifecycle enforcement:
   * - ADMIN: Event is strictly saved as 'PENDING_APPROVAL' (cannot directly publish).
   * - SUPER ADMIN: Can directly publish ('PUBLISHED') or save as 'DRAFT'.
   */
  createEvent(
    eventData: Omit<EventItem, 'id' | 'createdAt'>,
    creatorRole: DashboardRole,
    creatorEmail: string
  ): EventItem {
    const events = this.getEvents();
    const eventId = `evt-${Date.now()}`;

    // Role-governed status assignment
    let initialStatus: EventStatus;
    if (creatorRole === 'super_admin') {
      initialStatus = eventData.status || 'PUBLISHED';
    } else {
      // Admin-created events MUST go through Super Admin review
      initialStatus = 'PENDING_APPROVAL';
    }

    const newEvent: EventItem = {
      ...eventData,
      id: eventId,
      status: initialStatus,
      createdBy: creatorEmail,
      createdAt: new Date().toISOString(),
      sessions: (eventData.sessions || []).map((s) => ({
        ...s,
        eventId: eventId,
        parentEventTitle: eventData.title,
      })),
      publishedAt: initialStatus === 'PUBLISHED' ? new Date().toISOString() : undefined,
      approvedBy: initialStatus === 'PUBLISHED' ? creatorEmail : undefined,
    };

    const updated = [newEvent, ...events];
    this.saveEvents(updated);

    // Notify Super Admin if pending approval, or broadcast if published directly
    if (initialStatus === 'PENDING_APPROVAL') {
      notificationService.addNotification({
        recipientRole: 'super_admin',
        type: 'event_submitted',
        title: 'Event Submitted for Review',
        message: `Admin ${creatorEmail} created event "${newEvent.title}". Requires Super Admin review before publishing.`,
        linkTab: 'sessions',
        entityId: `evt-pending-${newEvent.id}`,
      });
    } else if (initialStatus === 'PUBLISHED') {
      notificationService.addNotification({
        type: 'event_published',
        title: 'New Campus Event Published',
        message: `Official campus event "${newEvent.title}" is now open for session enrollments.`,
        linkTab: 'sessions',
        entityId: `evt-broadcast-${newEvent.id}`,
      });
    }

    return newEvent;
  },

  /**
   * Updates an existing event.
   * If updater is an Admin, they CANNOT directly publish the event.
   */
  updateEvent(
    eventId: string,
    updates: Partial<EventItem>,
    updaterRole: DashboardRole
  ): EventItem | null {
    const events = this.getEvents();
    const index = events.findIndex((e) => e.id === eventId);
    if (index === -1) return null;

    const currentEvent = events[index];
    const sanitizedUpdates = { ...updates };

    // Prevent Admin from bypassing publication approval
    const wasPending = currentEvent.status === 'PENDING_APPROVAL';
    if (updaterRole === 'admin' && sanitizedUpdates.status === 'PUBLISHED') {
      sanitizedUpdates.status = 'PENDING_APPROVAL';
    }

    const updatedEvent: EventItem = {
      ...currentEvent,
      ...sanitizedUpdates,
      // If title changed, update parentEventTitle in child sessions
      sessions: (sanitizedUpdates.sessions || currentEvent.sessions).map((s) => ({
        ...s,
        eventId: currentEvent.id,
        parentEventTitle: sanitizedUpdates.title || currentEvent.title,
      })),
    };

    events[index] = updatedEvent;
    this.saveEvents(events);

    // If an Admin submitted updates for review, notify Super Admin
    if (updatedEvent.status === 'PENDING_APPROVAL' && !wasPending) {
      notificationService.addNotification({
        recipientRole: 'super_admin',
        type: 'event_submitted',
        title: 'Event Revision Submitted',
        message: `Event "${updatedEvent.title}" was updated and submitted for Super Admin review.`,
        linkTab: 'sessions',
        entityId: `evt-rev-${updatedEvent.id}-${Date.now()}`,
      });
    }

    return updatedEvent;
  },

  /**
   * Super Admin approval gate:
   * ONLY Super Admin can approve an Event for publication.
   */
  approveEvent(
    eventId: string,
    approverRole: DashboardRole,
    approverEmail: string
  ): EventItem | null {
    if (approverRole !== 'super_admin') {
      console.error('Unauthorized: Only Super Admin can approve events for publication.');
      return null;
    }

    const events = this.getEvents();
    const index = events.findIndex((e) => e.id === eventId);
    if (index === -1) return null;

    const approvedEvent: EventItem = {
      ...events[index],
      status: 'PUBLISHED',
      approvedBy: approverEmail,
      publishedAt: new Date().toISOString(),
      rejectionReason: undefined,
    };

    events[index] = approvedEvent;
    this.saveEvents(events);

    // Notify event creator/organizer
    if (approvedEvent.createdBy) {
      notificationService.addNotification({
        recipientEmail: approvedEvent.createdBy,
        type: 'event_published',
        title: 'Event Approved & Published',
        message: `Your event "${approvedEvent.title}" has been approved by Super Admin and is now live for registration.`,
        linkTab: 'sessions',
        entityId: `evt-approved-${approvedEvent.id}`,
      });
    }

    // Broadcast announcement
    notificationService.addNotification({
      type: 'event_published',
      title: 'New Campus Event Published',
      message: `Official campus event "${approvedEvent.title}" is now open for session enrollments.`,
      linkTab: 'sessions',
      entityId: `evt-broadcast-${approvedEvent.id}`,
    });

    return approvedEvent;
  },

  /**
   * Super Admin rejection with feedback:
   * Sets event status back to DRAFT with a recorded reason.
   */
  rejectEvent(eventId: string, reason: string, rejecterRole: DashboardRole): EventItem | null {
    if (rejecterRole !== 'super_admin') {
      console.error('Unauthorized: Only Super Admin can reject/return events.');
      return null;
    }

    const events = this.getEvents();
    const index = events.findIndex((e) => e.id === eventId);
    if (index === -1) return null;

    const rejectedEvent: EventItem = {
      ...events[index],
      status: 'DRAFT',
      rejectionReason: reason,
    };

    events[index] = rejectedEvent;
    this.saveEvents(events);

    // Notify event creator/organizer with rejection feedback
    if (rejectedEvent.createdBy) {
      notificationService.addNotification({
        recipientEmail: rejectedEvent.createdBy,
        type: 'event_rejected',
        title: 'Event Returned for Revision',
        message: `Event "${rejectedEvent.title}" was returned for revision by Super Admin. Feedback: ${reason.trim()}.`,
        linkTab: 'sessions',
        entityId: `evt-rejected-${rejectedEvent.id}-${Date.now()}`,
      });
    }

    return rejectedEvent;
  },

  /**
   * Creates and adds a new Session to a specific parent Event.
   * Guarantees NO orphan sessions can exist.
   */
  addSessionToEvent(
    eventId: string,
    sessionData: Omit<SessionItem, 'id' | 'eventId'>
  ): { event: EventItem; session: SessionItem } | null {
    const events = this.getEvents();
    const eventIndex = events.findIndex((e) => e.id === eventId);
    if (eventIndex === -1) {
      console.error(`Cannot create session: Parent event "${eventId}" not found.`);
      return null;
    }

    const parentEvent = events[eventIndex];
    const newSessionId = `sess-${Date.now()}`;
    const newSession: SessionItem = {
      ...sessionData,
      id: newSessionId,
      eventId: parentEvent.id,
      parentEventTitle: parentEvent.title,
      society: sessionData.society || parentEvent.organizer,
    };

    const updatedEvent: EventItem = {
      ...parentEvent,
      sessions: [...parentEvent.sessions, newSession],
    };

    events[eventIndex] = updatedEvent;
    this.saveEvents(events);
    return { event: updatedEvent, session: newSession };
  },

  /**
   * Updates an existing session within its parent event.
   */
  updateSessionInEvent(
    sessionId: string,
    updatedSession: SessionItem
  ): { event: EventItem; session: SessionItem } | null {
    const events = this.getEvents();
    for (let i = 0; i < events.length; i++) {
      const evt = events[i];
      const sIndex = evt.sessions.findIndex((s) => s.id === sessionId);
      if (sIndex !== -1) {
        const verifiedSession: SessionItem = {
          ...updatedSession,
          id: sessionId,
          eventId: evt.id,
          parentEventTitle: evt.title,
        };

        const updatedSessions = [...evt.sessions];
        updatedSessions[sIndex] = verifiedSession;

        const updatedEvent: EventItem = {
          ...evt,
          sessions: updatedSessions,
        };

        events[i] = updatedEvent;
        this.saveEvents(events);
        return { event: updatedEvent, session: verifiedSession };
      }
    }
    return null;
  },

  /**
   * Removes a session from its parent event.
   */
  deleteSessionFromEvent(sessionId: string): boolean {
    const events = this.getEvents();
    for (let i = 0; i < events.length; i++) {
      const evt = events[i];
      const sIndex = evt.sessions.findIndex((s) => s.id === sessionId);
      if (sIndex !== -1) {
        const updatedSessions = evt.sessions.filter((s) => s.id !== sessionId);
        events[i] = { ...evt, sessions: updatedSessions };
        this.saveEvents(events);
        return true;
      }
    }
    return false;
  },

  /**
   * Starts live session delivery (Admin / Super Admin only).
   * Transition: Event -> Session -> Session Delivery becomes LIVE.
   */
  startSessionDelivery(
    sessionId: string,
    actorRole: DashboardRole,
    actorName: string
  ): { event: EventItem; session: SessionItem } | null {
    if (actorRole !== 'super_admin' && actorRole !== 'admin') {
      console.error('Unauthorized: Only Super Admin and Admin can start session delivery.');
      return null;
    }

    const events = this.getEvents();
    for (let i = 0; i < events.length; i++) {
      const evt = events[i];
      const sIndex = evt.sessions.findIndex((s) => s.id === sessionId);
      if (sIndex !== -1) {
        const targetSession = evt.sessions[sIndex];
        const updatedSession: SessionItem = {
          ...targetSession,
          deliveryStatus: 'LIVE',
          status: 'open',
        };

        const updatedSessions = [...evt.sessions];
        updatedSessions[sIndex] = updatedSession;

        const updatedEvent: EventItem = {
          ...evt,
          status: evt.status === 'PUBLISHED' || evt.status === 'UPCOMING' ? 'LIVE' : evt.status,
          sessions: updatedSessions,
        };

        events[i] = updatedEvent;
        this.saveEvents(events);

        notificationService.addNotification({
          recipientEmail: 'all',
          type: 'announcement',
          title: `🎙️ Session LIVE: ${updatedSession.title}`,
          message: `The virtual meeting room for "${updatedSession.title}" is now broadcasting LIVE! Join now with your room access credentials.`,
          linkTab: 'sessions',
          entityId: `delivery-live-${updatedSession.id}`,
        });

        return { event: updatedEvent, session: updatedSession };
      }
    }
    return null;
  },

  /**
   * Concludes session delivery (Admin / Super Admin only).
   * Transition: Session Delivery becomes COMPLETED / HELD, unlocking recording, resources, and summary.
   */
  endSessionDelivery(
    sessionId: string,
    actorRole: DashboardRole,
    actorName: string,
    recordingInfo?: { recordingStatus?: SessionRecordingStatus; recordingUrl?: string; recordingDuration?: string; meetingSummary?: string }
  ): { event: EventItem; session: SessionItem } | null {
    if (actorRole !== 'super_admin' && actorRole !== 'admin') {
      console.error('Unauthorized: Only Super Admin and Admin can conclude session delivery.');
      return null;
    }

    const events = this.getEvents();
    for (let i = 0; i < events.length; i++) {
      const evt = events[i];
      const sIndex = evt.sessions.findIndex((s) => s.id === sessionId);
      if (sIndex !== -1) {
        const targetSession = evt.sessions[sIndex];
        const recUrl = recordingInfo?.recordingUrl ? recordingInfo.recordingUrl.trim() : undefined;
        const recDur = recordingInfo?.recordingDuration ? recordingInfo.recordingDuration.trim() : undefined;
        const summary =
          recordingInfo?.meetingSummary?.trim() ||
          `Interactive delivery concluded for "${targetSession.title}". The keynote presentation, live demonstration, and attendee Q&A session have been archived.`;

        const updatedSession: SessionItem = {
          ...targetSession,
          deliveryStatus: 'COMPLETED',
          status: 'closed',
          recordingStatus: recordingInfo?.recordingStatus || (recUrl ? 'available' : 'none'),
          recordingUrl: recUrl,
          recordingDuration: recDur,
          meetingSummary: summary,
        };

        const updatedSessions = [...evt.sessions];
        updatedSessions[sIndex] = updatedSession;

        // Check if all sessions in this event are completed
        const allCompleted = updatedSessions.every((s) => s.deliveryStatus === 'COMPLETED' || s.status === 'closed');
        const updatedEvent: EventItem = {
          ...evt,
          status: allCompleted ? 'COMPLETED' : evt.status,
          sessions: updatedSessions,
        };

        events[i] = updatedEvent;
        this.saveEvents(events);

        notificationService.addNotification({
          recipientEmail: 'all',
          type: 'announcement',
          title: `🏁 Session Concluded: ${updatedSession.title}`,
          message: recUrl
            ? `The virtual meeting for "${updatedSession.title}" has concluded. The HD recording and summary are now accessible.`
            : `The virtual meeting for "${updatedSession.title}" has concluded. Session summary has been archived.`,
          linkTab: 'sessions',
          entityId: `delivery-completed-${updatedSession.id}`,
        });

        return { event: updatedEvent, session: updatedSession };
      }
    }
    return null;
  },

  /**
   * Updates recording status and URL for a session.
   */
  updateSessionRecording(
    sessionId: string,
    recordingUrl?: string,
    duration?: string,
    status: 'idle' | 'recording' | 'processing' | 'available' | 'failed' | 'none' = 'available'
  ): SessionItem | null {
    const events = this.getEvents();
    for (let i = 0; i < events.length; i++) {
      const evt = events[i];
      const sIndex = evt.sessions.findIndex((s) => s.id === sessionId);
      if (sIndex !== -1) {
        const targetSession = evt.sessions[sIndex];
        const updatedSession: SessionItem = {
          ...targetSession,
          recordingStatus: status,
          recordingUrl: recordingUrl ? recordingUrl.trim() : undefined,
          recordingDuration: duration ? duration.trim() : targetSession.recordingDuration,
        };
        evt.sessions[sIndex] = updatedSession;
        events[i] = { ...evt };
        this.saveEvents(events);
        return updatedSession;
      }
    }
    return null;
  },
};
