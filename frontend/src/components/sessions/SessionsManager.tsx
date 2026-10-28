/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  SessionItem,
  EventItem,
  DashboardRole,
  SessionsSubScreen,
  RegistrantItem,
  RegistrationFormConfig,
} from '../../types';
import { eventService } from '../../services/eventService';
import { eventsApi } from '../../services/apiClient';
import { EventsListPage } from '../events/EventsListPage';
import { EventDetailPage } from '../events/EventDetailPage';
import { EventCreatePage } from '../events/EventCreatePage';
import { SessionsListPage } from './SessionsListPage';
import { SessionDetailPage } from './SessionDetailPage';
import { SessionCreatePage } from './SessionCreatePage';
import { RegistrationFormPage } from '../registration/RegistrationFormPage';

interface SessionsManagerProps {
  currentRole: DashboardRole;
  events: EventItem[];
  sessions: SessionItem[];
  formConfig: RegistrationFormConfig;
  registeredSessionIds?: string[];
  currentUserEmail?: string;
  currentUserName?: string;
  registrants?: RegistrantItem[];
  onUpdateEvents: (updatedEvents: EventItem[]) => void;
  onRegisterNewParticipant?: (registrant: RegistrantItem) => void | Promise<void>;
  onReloadRegistrants?: () => Promise<void>;
  onNavigateHome: () => void;
  onNavigateToAuth: (mode?: 'login' | 'signup') => void;
  onNotify: (msg: string) => void;
  initialSelectedSessionId?: string | null;
  initialSelectedEventId?: string | null;
  initialSubScreen?: SessionsSubScreen;
}

export const SessionsManager: React.FC<SessionsManagerProps> = ({
  currentRole,
  events,
  sessions,
  formConfig,
  registeredSessionIds = [],
  currentUserEmail,
  currentUserName,
  registrants,
  onUpdateEvents,
  onRegisterNewParticipant,
  onReloadRegistrants,
  onNavigateHome,
  onNavigateToAuth,
  onNotify,
  initialSelectedSessionId,
  initialSelectedEventId,
  initialSubScreen,
}) => {
  const [subScreen, setSubScreen] = useState<SessionsSubScreen>(
    initialSubScreen || (initialSelectedSessionId ? 'detail' : 'events')
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    initialSelectedEventId || (events[0]?.id || null)
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    initialSelectedSessionId || null
  );

  const [editingSession, setEditingSession] = useState<SessionItem | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [sessionParentEventId, setSessionParentEventId] = useState<string | undefined>(undefined);

  // Active selections
  const selectedEvent =
    events.find((e) => e.id === selectedEventId) || events[0] || null;

  const selectedSession =
    sessions.find((s) => s.id === selectedSessionId) ||
    selectedEvent?.sessions?.[0] ||
    sessions[0] ||
    null;

  // Sync selection with external / pasted URL
  useEffect(() => {
    if (initialSelectedSessionId) {
      setSelectedSessionId(initialSelectedSessionId);
      const targetSession = sessions.find((s) => s.id === initialSelectedSessionId);
      if (targetSession?.eventId) {
        setSelectedEventId(targetSession.eventId);
      }
      setSubScreen('detail');
    } else if (initialSelectedEventId) {
      setSelectedEventId(initialSelectedEventId);
      setSelectedSessionId(null);
      setSubScreen('event-detail');
    } else {
      setSelectedSessionId(null);
      setSubScreen((prev) => (prev === 'detail' || prev === 'register' ? 'events' : prev));
    }
  }, [initialSelectedSessionId, initialSelectedEventId, sessions]);

  // Navigation handlers
  const handleSelectEvent = (event: EventItem) => {
    setSelectedEventId(event.id);
    setSubScreen('event-detail');
  };

  const handleSelectSession = (session: SessionItem) => {
    setSelectedSessionId(session.id);
    if (session.eventId) {
      setSelectedEventId(session.eventId);
    }
    setSubScreen('detail');
    if (window.location.hash !== `#/sessions/${session.id}`) {
      window.location.hash = `#/sessions/${session.id}`;
    }
  };

  const handleNavigateToCreateEvent = () => {
    setEditingEvent(null);
    setSubScreen('event-create');
  };

  const handleNavigateToEditEvent = (event: EventItem) => {
    setEditingEvent(event);
    setSubScreen('event-create');
  };

  const handleNavigateToCreateSession = (targetEvent?: EventItem) => {
    setEditingSession(null);
    setSessionParentEventId(targetEvent?.id || selectedEventId || undefined);
    setSubScreen('create');
  };

  const handleNavigateToEditSession = (session: SessionItem) => {
    setEditingSession(session);
    setSessionParentEventId(session.eventId);
    setSubScreen('create');
  };

  const handleOpenRegistration = (session: SessionItem) => {
    if (currentRole === 'guest') {
      onNotify('Please sign in before registering for a session.');
      onNavigateToAuth('login');
      return;
    }
    setSelectedSessionId(session.id);
    setSubScreen('register');
  };

  const handleRegistrationSuccess = async (registrant: RegistrantItem) => {
    if (onRegisterNewParticipant) {
      await onRegisterNewParticipant(registrant);
    } else if (onReloadRegistrants) {
      await onReloadRegistrants();
    }
    onNotify(
      `Registration submitted for "${selectedSession?.title || 'Session'}".`
    );
    setSubScreen('detail');
  };

  // Event persistence actions
  const handleSaveEvent = async (
    eventData: Omit<EventItem, 'id' | 'createdAt'>,
    existingEventId?: string
  ) => {
    try {
      if (existingEventId) {
        const patch: Record<string, unknown> = {
          title: eventData.title,
          description: eventData.description ?? null,
          category: eventData.category ?? null,
          organizer: eventData.organizer ?? null,
          capacity: eventData.capacity ?? null,
          registration_deadline: eventData.registrationDeadline || null,
          fee_amount: eventData.isPaid ? Number(eventData.feeAmount ?? 0) : 0,
          location_type: eventData.locationType ?? 'on_campus',
        };
        const updated = await eventsApi.updateEvent(existingEventId, patch);
        await eventService.refreshFromBackend();
        onUpdateEvents(eventService.getEvents());
        onNotify(`Event "${updated.title}" updated.`);
        setSelectedEventId(updated.id);
        setSubScreen('event-detail');
        return;
      }

      const created = await eventsApi.createEvent({
        title: eventData.title,
        description: eventData.description,
        category: eventData.category,
        organizer: eventData.organizer,
        capacity: eventData.capacity ?? null,
        registrationDeadline: eventData.registrationDeadline
          ? eventData.registrationDeadline.replace(/Z$/, '+05:00')
          : undefined,
        feeAmount: eventData.isPaid ? Number(eventData.feeAmount ?? 0) : 0,
        locationType: eventData.locationType ?? 'on_campus',
      });
      await eventService.refreshFromBackend();
      onUpdateEvents(eventService.getEvents());
      onNotify(
        currentRole === 'super_admin'
          ? `Event "${created.title}" published!`
          : `Event "${created.title}" submitted for Super Admin publication approval.`
      );
      setSelectedEventId(created.id);
      setSubScreen('event-detail');
    } catch (error) {
      throw error;
    }
  };

  const handleApproveEvent = async (eventId: string) => {
    if (currentRole !== 'super_admin') {
      onNotify('Unauthorized: Only Super Admin can approve events for publication.');
      return;
    }

    try {
      const approved = await eventsApi.publishEvent(eventId);
      await eventService.refreshFromBackend();
      onUpdateEvents(eventService.getEvents());
      onNotify(`Event "${approved.title}" approved and published to campus!`);
    } catch (error: any) {
      onNotify(error?.message || 'Failed to publish event.');
      throw error;
    }
  };

  // Session persistence actions (Strictly tied to parent events)
  const handleSaveSession = async (newOrUpdatedSession: SessionItem) => {
    const targetEventId = newOrUpdatedSession.eventId || selectedEventId;
    if (!targetEventId) {
      onNotify('Error: Session must belong to a parent event.');
      return;
    }

    const dateValue = newOrUpdatedSession.date || '';
    const startValue = newOrUpdatedSession.startTime || newOrUpdatedSession.time?.split('–')[0]?.trim() || '14:00';
    const endValue = newOrUpdatedSession.endTime || newOrUpdatedSession.time?.split('–')[1]?.trim() || '17:30';
    const startsAt = `${dateValue}T${startValue}:00+05:00`;
    const endsAt = `${dateValue}T${endValue}:00+05:00`;
    const meetingLinks = newOrUpdatedSession.meeting_links?.map((link) => ({
      url: link.url,
      label: link.label ?? undefined,
      platform: link.platform,
      public: !!link.public,
    }));

    try {
      const existingSession = sessions.find((s) => s.id === newOrUpdatedSession.id);
      if (existingSession) {
        const updated = await eventsApi.updateSession(targetEventId, newOrUpdatedSession.id, {
          title: newOrUpdatedSession.title,
          starts_at: startsAt,
          ends_at: endsAt,
          timezone: 'Asia/Karachi',
          location: newOrUpdatedSession.location || null,
          capacity: newOrUpdatedSession.totalSeats ?? null,
          ...(meetingLinks !== undefined ? { meeting_links: meetingLinks } : {}),
          speaker: newOrUpdatedSession.speaker || null,
        });
        await eventService.refreshFromBackend();
        onUpdateEvents(eventService.getEvents());
        onNotify(`Session "${updated.title}" updated.`);
      } else {
        const created = await eventsApi.createSession(targetEventId, {
          title: newOrUpdatedSession.title,
          startsAt: startsAt,
          endsAt: endsAt,
          timezone: 'Asia/Karachi',
          location: newOrUpdatedSession.location || undefined,
          capacity: newOrUpdatedSession.totalSeats ?? null,
          meetingLinks,
          speaker: newOrUpdatedSession.speaker || undefined,
        });
        await eventService.refreshFromBackend();
        onUpdateEvents(eventService.getEvents());
        onNotify(`New session "${created.title}" added to event.`);
      }

      setSelectedSessionId(newOrUpdatedSession.id);
      setSelectedEventId(targetEventId);
      setSubScreen('detail');
    } catch (error) {
      throw error;
    }
  };

  // =========================================================================
  // SUB-SCREEN RENDERING
  // =========================================================================

  // 1. Session Registration Screen
  if (subScreen === 'register' && selectedSession) {
    return (
      <RegistrationFormPage
        session={selectedSession}
        formConfig={formConfig}
        currentRole={currentRole}
        onBack={() => setSubScreen('detail')}
        onSubmitSuccess={handleRegistrationSuccess}
        onNotify={onNotify}
        onGoToAuth={onNavigateToAuth}
      />
    );
  }

  // 2. Session Detail Screen
  if (subScreen === 'detail' && selectedSession) {
    const parentEvent = events.find((e) => e.id === selectedSession.eventId);
    return (
      <SessionDetailPage
        session={selectedSession}
        currentRole={currentRole}
        isRegistered={registeredSessionIds.includes(selectedSession.id)}
        currentUserEmail={currentUserEmail}
        currentUserName={currentUserName}
        registrants={registrants}
        registrant={registrants?.find(
          (r) =>
            r.sessionId === selectedSession.id &&
            (r.email === currentUserEmail ||
              r.primaryEmail === currentUserEmail ||
              (currentUserEmail?.includes('jordan') && r.name.toLowerCase().includes('jordan')))
        )}
        parentEventTitle={parentEvent?.title}
        parentEventId={parentEvent?.id}
        onNavigateToParentEvent={(evtId) => {
          setSelectedEventId(evtId);
          setSubScreen('event-detail');
        }}
        onBack={() => {
          if (window.location.hash.startsWith('#/sessions/')) {
            window.location.hash = '#/sessions';
          }
          if (selectedEventId) {
            setSubScreen('event-detail');
          } else {
            setSubScreen('list');
          }
        }}
        onNavigateToAuth={() => onNavigateToAuth('login')}
        onOpenRegistration={handleOpenRegistration}
        onEditSession={handleNavigateToEditSession}
        onUpdateSession={handleSaveSession}
        onNotify={onNotify}
      />
    );
  }

  // 3. Session Create/Edit Screen (Requires Parent Event)
  if (subScreen === 'create') {
    return (
      <SessionCreatePage
        currentRole={currentRole}
        initialSession={editingSession}
        availableEvents={events}
        preselectedEventId={sessionParentEventId}
        onBack={() => {
          if (selectedSessionId) {
            setSubScreen('detail');
          } else if (selectedEventId) {
            setSubScreen('event-detail');
          } else {
            setSubScreen('events');
          }
        }}
        onSave={handleSaveSession}
        onNotify={onNotify}
      />
    );
  }

  // 4. Event Detail Screen (Shows parent event and its child sessions)
  if (subScreen === 'event-detail' && selectedEvent) {
    return (
      <EventDetailPage
        event={selectedEvent}
        currentRole={currentRole}
        currentUserEmail={currentUserEmail}
        onBack={() => setSubScreen('events')}
        onSelectSession={handleSelectSession}
        onAddSessionToEvent={handleNavigateToCreateSession}
        onEditEvent={handleNavigateToEditEvent}
        onApproveEvent={handleApproveEvent}
        onNotify={onNotify}
      />
    );
  }

  // 5. Event Create/Edit Screen
  if (subScreen === 'event-create') {
    return (
      <EventCreatePage
        currentRole={currentRole}
        currentUserEmail={currentUserEmail}
        initialEvent={editingEvent}
        onBack={() => setSubScreen(selectedEventId ? 'event-detail' : 'events')}
        onSave={handleSaveEvent}
        onNotify={onNotify}
      />
    );
  }

  // 6. Flat Sessions List Screen
  if (subScreen === 'list') {
    return (
      <SessionsListPage
        sessions={sessions}
        currentRole={currentRole}
        onBackToHome={onNavigateHome}
        onSelectSession={handleSelectSession}
        onNavigateToCreate={() => handleNavigateToCreateSession()}
        onSwitchToEventsView={() => setSubScreen('events')}
      />
    );
  }

  // 7. Events Catalog Screen (Default Parent Entity View)
  return (
    <EventsListPage
      events={events}
      currentRole={currentRole}
      onBackToHome={onNavigateHome}
      onSelectEvent={handleSelectEvent}
      onNavigateToCreateEvent={handleNavigateToCreateEvent}
      onSwitchToSessionsView={() => setSubScreen('list')}
    />
  );
};
