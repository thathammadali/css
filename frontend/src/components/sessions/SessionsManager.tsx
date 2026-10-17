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
  onRegisterNewParticipant?: (registrant: RegistrantItem) => void;
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
    setSelectedSessionId(session.id);
    setSubScreen('register');
  };

  const handleRegistrationSuccess = (registrant: RegistrantItem) => {
    if (onRegisterNewParticipant) {
      onRegisterNewParticipant(registrant);
    }
    onNotify(
      `Registration submitted for "${selectedSession?.title || 'Session'}". Receipt sent for review.`
    );
    setSubScreen('detail');
  };

  // Event persistence actions
  const handleSaveEvent = (
    eventData: Omit<EventItem, 'id' | 'createdAt'>,
    existingEventId?: string
  ) => {
    if (existingEventId) {
      const updated = eventService.updateEvent(existingEventId, eventData, currentRole);
      if (updated) {
        onUpdateEvents(eventService.getEvents());
        onNotify(`Event "${updated.title}" updated.`);
        setSelectedEventId(updated.id);
        setSubScreen('event-detail');
      }
    } else {
      const created = eventService.createEvent(
        eventData,
        currentRole,
        currentUserEmail || 'admin@university.edu.pk'
      );
      onUpdateEvents(eventService.getEvents());
      onNotify(
        currentRole === 'super_admin'
          ? `Event "${created.title}" published!`
          : `Event "${created.title}" submitted for Super Admin publication approval.`
      );
      setSelectedEventId(created.id);
      setSubScreen('event-detail');
    }
  };

  const handleApproveEvent = (eventId: string) => {
    const approved = eventService.approveEvent(
      eventId,
      currentRole,
      currentUserEmail || 'superadmin@university.edu.pk'
    );
    if (approved) {
      onUpdateEvents(eventService.getEvents());
      onNotify(`Event "${approved.title}" approved and published to campus!`);
    } else {
      onNotify('Unauthorized: Only Super Admin can approve events for publication.');
    }
  };

  const handleRejectEvent = (eventId: string, reason: string) => {
    const rejected = eventService.rejectEvent(eventId, reason, currentRole);
    if (rejected) {
      onUpdateEvents(eventService.getEvents());
      onNotify(`Event "${rejected.title}" returned to draft.`);
    } else {
      onNotify('Unauthorized: Only Super Admin can reject events.');
    }
  };

  // Session persistence actions (Strictly tied to parent events)
  const handleSaveSession = (newOrUpdatedSession: SessionItem) => {
    const targetEventId = newOrUpdatedSession.eventId || selectedEventId;
    if (!targetEventId) {
      onNotify('Error: Session must belong to a parent event.');
      return;
    }

    const existingSession = sessions.find((s) => s.id === newOrUpdatedSession.id);
    if (existingSession) {
      const res = eventService.updateSessionInEvent(
        newOrUpdatedSession.id,
        newOrUpdatedSession
      );
      if (res) {
        onUpdateEvents(eventService.getEvents());
        onNotify(`Session "${newOrUpdatedSession.title}" updated.`);
      }
    } else {
      const res = eventService.addSessionToEvent(
        targetEventId,
        newOrUpdatedSession
      );
      if (res) {
        onUpdateEvents(eventService.getEvents());
        onNotify(`New session "${newOrUpdatedSession.title}" added to event.`);
      }
    }

    setSelectedSessionId(newOrUpdatedSession.id);
    setSelectedEventId(targetEventId);
    setSubScreen('detail');
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
        onRejectEvent={handleRejectEvent}
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
