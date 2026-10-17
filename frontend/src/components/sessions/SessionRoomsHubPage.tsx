/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Radio,
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  Tv,
} from 'lucide-react';
import {
  SessionItem,
  DashboardRole,
  RegistrantItem,
  RoomAccessValidationResponse,
  RoomAccessDispatch,
} from '../../types';
import { roomAccessService } from '../../services/roomAccessService';
import { eventService } from '../../services/eventService';
import { apiFetch } from '../../services/apiClient';
import { SessionRoomView } from './SessionRoomView';

interface SessionRoomsHubPageProps {
  currentRole: DashboardRole;
  userName: string;
  userEmail: string;
  sessions: SessionItem[];
  registrants?: RegistrantItem[];
  onNotify: (msg: string) => void;
  onNavigateToSessionDetail?: (sessionId: string) => void;
}

export const SessionRoomsHubPage: React.FC<SessionRoomsHubPageProps> = ({
  currentRole,
  userName,
  userEmail,
  sessions,
  registrants = [],
  onNotify,
  onNavigateToSessionDetail,
}) => {
  const isHost = currentRole === 'super_admin' || currentRole === 'admin';

  // Active Unlocked Room state
  const [activeRoomData, setActiveRoomData] = useState<{
    sessionToken: string;
    session: SessionItem;
    room: NonNullable<RoomAccessValidationResponse['room']>;
  } | null>(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'upcoming' | 'concluded'>('all');

  // Input codes per session
  const [enteredCodes, setEnteredCodes] = useState<{ [sessionId: string]: string }>({});
  const [verifyingSessionId, setVerifyingSessionId] = useState<string | null>(null);
  const [errorMessages, setErrorMessages] = useState<{ [sessionId: string]: string }>({});

  // Super Admin Code Allotment Modal State & Filtering
  const [selectedSessionForAllotment, setSelectedSessionForAllotment] = useState<SessionItem | null>(null);
  const [copiedCodeSessionId, setCopiedCodeSessionId] = useState<string | null>(null);
  const [modalFilter, setModalFilter] = useState<'all' | 'paid_approved' | 'pending' | 'code_needed' | 'code_allotted'>('all');
  const [modalSearch, setModalSearch] = useState('');

  // Live dispatches tracking
  const [dispatchesVersion, setDispatchesVersion] = useState(0);

  // Escape key handler for open modals
  useEffect(() => {
    if (!selectedSessionForAllotment) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        setSelectedSessionForAllotment(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSessionForAllotment]);

  // All rooms derived from sessions
  const roomCards = useMemo(() => {
    return sessions.map((sess) => {
      const room = roomAccessService.getOrCreateRoomForSession(sess);
      const sessionDispatches = roomAccessService.getDispatchesForSession(sess.id);
      const studentAliases = ['student@university.edu.pk', 'sportszaab@gmail.com', 'jordan.lee@university.edu.pk'];
      const isStudentUser = studentAliases.includes(userEmail.toLowerCase().trim());

      const userDispatch = sessionDispatches.find(
        (d) =>
          (d.participantEmail.toLowerCase() === userEmail.toLowerCase() ||
            (isStudentUser && studentAliases.includes(d.participantEmail.toLowerCase()))) &&
          d.status === 'delivered'
      );

      const userRegistrant = registrants.find(
        (r) =>
          r.sessionId === sess.id &&
          (r.email?.toLowerCase() === userEmail.toLowerCase() ||
            r.primaryEmail?.toLowerCase() === userEmail.toLowerCase() ||
            (isStudentUser &&
              (studentAliases.includes(r.email?.toLowerCase() || '') ||
                studentAliases.includes(r.primaryEmail?.toLowerCase() || '') ||
                r.name.toLowerCase().includes('jordan'))))
      );

      return {
        session: sess,
        room,
        dispatches: sessionDispatches,
        userDispatch,
        userRegistrant,
      };
    });
  }, [sessions, registrants, userEmail, dispatchesVersion]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return roomCards.filter(({ session: sess }) => {
      const matchesSearch =
        sess.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sess.society.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sess.location.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'live') {
        return sess.deliveryStatus === 'LIVE';
      }
      if (statusFilter === 'concluded') {
        return sess.deliveryStatus === 'COMPLETED' || sess.status === 'closed';
      }
      if (statusFilter === 'upcoming') {
        return sess.deliveryStatus !== 'LIVE' && sess.deliveryStatus !== 'COMPLETED' && sess.status !== 'closed';
      }
      return true;
    });
  }, [roomCards, searchQuery, statusFilter]);

  // Handle Participant Unlocking Room via Code
  const handleUnlockRoom = async (sess: SessionItem, codeToUse?: string) => {
    const code = codeToUse || enteredCodes[sess.id] || '';
    if (!code.trim()) {
      setErrorMessages((prev) => ({ ...prev, [sess.id]: 'Please enter the access code allotted by the Super Admin.' }));
      return;
    }

    setVerifyingSessionId(sess.id);
    setErrorMessages((prev) => ({ ...prev, [sess.id]: '' }));

    const studentAliases = ['student@university.edu.pk', 'sportszaab@gmail.com', 'jordan.lee@university.edu.pk'];
    const isStudentUser = studentAliases.includes(userEmail.toLowerCase().trim());

    const userRegistrant = registrants.find(
      (r) =>
        r.sessionId === sess.id &&
        (r.email?.toLowerCase() === userEmail.toLowerCase() ||
          r.primaryEmail?.toLowerCase() === userEmail.toLowerCase() ||
          (isStudentUser &&
            (studentAliases.includes(r.email?.toLowerCase() || '') ||
              studentAliases.includes(r.primaryEmail?.toLowerCase() || '') ||
              r.name.toLowerCase().includes('jordan'))))
    );

    try {
      let result: RoomAccessValidationResponse;
      try {
        const response = await apiFetch('/api/rooms/validate-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sess.id,
            participantEmail: userEmail,
            accessCode: code.trim(),
            paymentStatus: userRegistrant?.status || 'approved',
            isPaidSession: !!sess.isPaid,
            isRegistered: !!userRegistrant || currentRole === 'guest',
          }),
        });
        if (response.ok) {
          result = await response.json();
        } else {
          const errData = await response.json().catch(() => ({}));
          result = {
            success: false,
            error: errData.error || `Validation error (${response.status})`,
            errorCode: errData.errorCode || 'UNAUTHORIZED',
          };
        }
      } catch {
        result = roomAccessService.validateRoomAccess(
          {
            sessionId: sess.id,
            participantEmail: userEmail,
            accessCode: code.trim(),
          },
          userRegistrant,
          sess
        );
      }

      if (result.success && result.sessionToken && result.room) {
        onNotify(`Room Unlocked! Connecting to "${result.room.roomName}"...`);
        setActiveRoomData({
          sessionToken: result.sessionToken,
          session: sess,
          room: result.room,
        });
      } else {
        setErrorMessages((prev) => ({
          ...prev,
          [sess.id]: result.error || 'Invalid code or access conditions not satisfied.',
        }));
      }
    } catch (err: any) {
      setErrorMessages((prev) => ({
        ...prev,
        [sess.id]: err.message || 'Error unlocking room.',
      }));
    } finally {
      setVerifyingSessionId(null);
    }
  };

  // Handle Super Admin / Admin Direct Host Entry
  const handleHostDirectEntry = async (sess: SessionItem) => {
    try {
      const res = await roomAccessService.requestHostAccess(
        sess,
        currentRole,
        userEmail || (currentRole === 'super_admin' ? 'dean.taylor@university.edu.pk' : 'admin@university.edu.pk'),
        userName || (currentRole === 'super_admin' ? 'Prof. Dean Taylor' : 'Alex Morgan')
      );
      if (res.success && res.sessionToken && res.room) {
        setActiveRoomData({
          sessionToken: res.sessionToken,
          session: sess,
          room: res.room,
        });
        onNotify(`Joined "${res.room.roomName}" with Host Privileges!`);
      } else {
        onNotify(res.error || 'Failed to initialize host access.');
      }
    } catch {
      onNotify('Could not connect to host session.');
    }
  };

  // Super Admin: Allot code to specific participant on time
  // Super Admin: Allot code to specific participant on time
  const handleAllotCodeToParticipant = (sess: SessionItem, reg: RegistrantItem, overridePayment = false) => {
    let targetReg = reg;
    if (overridePayment && reg.status !== 'approved') {
      targetReg = { ...reg, status: 'approved' };
    }
    const res = roomAccessService.sendRoomCodeToParticipant(
      sess,
      targetReg,
      currentRole,
      userName || (currentRole === 'super_admin' ? 'Super Admin' : 'Admin')
    );
    if (res.success) {
      onNotify(res.message);
      setDispatchesVersion((v) => v + 1);
    } else {
      onNotify(res.message);
    }
  };

  // Super Admin: Allot code to all confirmed or all filtered participants for a session on time
  const handleBatchAllotToFiltered = (sess: SessionItem, listToAllot: RegistrantItem[], allowAll = false) => {
    let count = 0;
    listToAllot.forEach((reg) => {
      let targetReg = reg;
      if (allowAll && reg.status !== 'approved') {
        targetReg = { ...reg, status: 'approved' };
      }
      const res = roomAccessService.sendRoomCodeToParticipant(
        sess,
        targetReg,
        currentRole,
        userName || (currentRole === 'super_admin' ? 'Super Admin' : 'Admin')
      );
      if (res.success) count++;
    });
    setDispatchesVersion((v) => v + 1);
    onNotify(`Dispatched access code on time to ${count} attendees! Notifications sent.`);
  };

  const handleAllotAllApproved = (sess: SessionItem) => {
    const sessionRegs = registrants.filter((r) => r.sessionId === sess.id);
    const approvedOnly = sessionRegs.filter((r) => !sess.isPaid || r.status === 'approved');
    handleBatchAllotToFiltered(sess, approvedOnly, false);
  };

  // Copy code to clipboard
  const handleCopyCode = async (code: string, sessId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeSessionId(sessId);
      onNotify(`Copied code: ${code}`);
      setTimeout(() => setCopiedCodeSessionId(null), 2000);
    } catch {
      onNotify('Clipboard unavailable.');
    }
  };

  // IF A ROOM IS CURRENTLY ACTIVE & UNLOCKED: Render the real-time meeting room!
  if (activeRoomData) {
    return (
      <div className="w-full h-full animate-fadeIn pb-8">
        <SessionRoomView
          session={activeRoomData.session}
          room={activeRoomData.room}
          sessionToken={activeRoomData.sessionToken}
          currentRole={currentRole}
          userName={userName}
          userEmail={userEmail}
          registrant={registrants.find((r) => r.sessionId === activeRoomData.session.id)}
          onLeaveRoom={() => {
            roomAccessService.leaveRoom(activeRoomData.sessionToken);
            setActiveRoomData(null);
            onNotify(`Left room "${activeRoomData.room.roomName}".`);
          }}
          onNotify={onNotify}
          onAttendanceChecked={(sessId) => {
            const updated = eventService.getSessionById(sessId);
            if (updated) {
              onNotify('Attendance recorded for verified certificate eligibility.');
            }
          }}
        />
      </div>
    );
  }

  return (
    <div id="session-rooms-hub-page" className="w-full space-y-6 animate-fadeIn pb-16 font-inter text-[var(--text-primary)]">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#041a16] via-[#031c22] to-[#09171f] border border-white/[0.14] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono">
              <Radio className="w-3.5 h-3.5 animate-pulse text-rose-400" />
              <span>Official Virtual Meeting Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-poppins text-[var(--text-primary)]">
              Session Rooms
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-sec-80)] leading-relaxed">
              Live virtual meeting pods for interactive sessions and keynotes. All rooms are pre-configured.
              Attendees unlock rooms using the access code allotted by the Super Admin on time.
            </p>
          </div>

          {/* Role Status Tag */}
          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <div className="px-4 py-2 rounded-2xl bg-white/[0.06] border border-white/[0.14] backdrop-blur-md flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                {isHost ? <ShieldCheck className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
              </div>
              <div className="text-left">
                <span className="text-[10px] text-white/50 uppercase tracking-wider block font-mono">
                  Your Role & Pass
                </span>
                <span className="text-xs font-semibold text-white">
                  {currentRole.toUpperCase()} {isHost ? '(Host Privileges)' : '(Participant Access)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Explainer Step Guide */}
        <div className="mt-6 pt-5 border-t border-white/[0.10] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold font-mono shrink-0">
              1
            </div>
            <div className="text-white/80">
              <strong className="text-white block text-[11px]">Room Scheduled:</strong>
              Pre-configured virtual pods ready for each session.
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold font-mono shrink-0">
              2
            </div>
            <div className="text-white/80">
              <strong className="text-white block text-[11px]">Super Admin Allots Code:</strong>
              Dispatched to approved students & guests on time.
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold font-mono shrink-0">
              3
            </div>
            <div className="text-white/80">
              <strong className="text-white block text-[11px]">Enter Code & Unlock:</strong>
              Admitted directly into real-time Zoom-like meeting.
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.05] border border-white/[0.10] w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all' as const, label: `All Rooms (${roomCards.length})` },
            { id: 'live' as const, label: '🔴 LIVE Now' },
            { id: 'upcoming' as const, label: 'Upcoming / Scheduled' },
            { id: 'concluded' as const, label: 'Concluded' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 shadow'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rooms, sessions, topics..."
            className="w-full pl-9 pr-3 py-2 rounded-2xl bg-white/[0.06] border border-white/[0.14] text-xs text-white placeholder-white/40 focus:outline-none focus:border-emerald-400 transition-colors"
          />
        </div>
      </div>

      {/* Grid of Session Rooms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-5 sm:gap-6">
        {filteredRooms.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-3xl bg-white/[0.03] border border-white/[0.08] p-8 space-y-3">
            <Tv className="w-12 h-12 text-white/30 mx-auto" />
            <h3 className="text-base font-semibold text-white">No Session Rooms Match Your Search</h3>
            <p className="text-xs text-white/50 max-w-sm mx-auto">
              Try adjusting your filter or search query to find the scheduled session room.
            </p>
          </div>
        ) : (
          filteredRooms.map(({ session: sess, room, dispatches, userDispatch, userRegistrant }) => {
            const isLive = sess.deliveryStatus === 'LIVE';
            const isCompleted = sess.deliveryStatus === 'COMPLETED' || sess.status === 'closed';
            const error = errorMessages[sess.id];
            const isVerifying = verifyingSessionId === sess.id;

            return (
              <div
                key={sess.id}
                className={`relative rounded-3xl overflow-hidden border backdrop-blur-xl p-6 flex flex-col justify-between transition-all shadow-xl ${
                  isLive
                    ? 'bg-gradient-to-br from-[#031d16] via-[#021417] to-[#061e22] border-rose-500/40 ring-1 ring-rose-500/30 shadow-rose-950/20'
                    : 'bg-[#031317]/85 border-white/[0.14] hover:border-white/[0.22]'
                }`}
              >
                <div>
                  {/* Top Row: Event badge & Status (Compact & Space-Efficient) */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <span className="text-[11px] font-medium text-[var(--primary-accent)] truncate max-w-[170px] sm:max-w-[240px]">
                        {sess.society}
                      </span>
                      {sess.parentEventTitle && (
                        <>
                          <span className="text-white/30 text-[10px] shrink-0">·</span>
                          <span className="hidden sm:inline text-[11px] text-white/50 truncate max-w-[160px]">
                            {sess.parentEventTitle}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Status Badge (Slim & Compact) */}
                    {isLive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                        <span>Live</span>
                      </span>
                    ) : isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-white/[0.06] text-white/50 border border-white/10 shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400/80" />
                        <span>Concluded</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shrink-0">
                        <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Waiting Room</span>
                      </span>
                    )}
                  </div>

                  {/* Room Name & Session Title */}
                  <h3 className="font-poppins font-semibold text-lg sm:text-xl text-[var(--text-primary)] mb-1.5 line-clamp-2">
                    {sess.title}
                  </h3>
                  <p className="text-xs text-[var(--text-sec-80)] line-clamp-2 mb-4 leading-relaxed">
                    {room.presentationTopic || sess.description}
                  </p>

                  {/* Room Meta (Speaker, Date, Time, Attendees) */}
                  <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-[var(--text-primary)] truncate">{sess.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="text-[var(--text-primary)] truncate">{sess.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="text-[var(--text-primary)] truncate">
                        {room.activeParticipantsCount || 0} Connected Attendees
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tv className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-[var(--text-primary)] truncate">{room.speakerName || sess.society}</span>
                    </div>
                  </div>
                </div>

                {/* BOTTOM SECTION: ROLE-SPECIFIC UNLOCK & ALLOTMENT FLOW */}
                <div className="pt-4 border-t border-white/[0.10] space-y-3">
                  {/* CASE 1: SUPER ADMIN & ADMIN (AUTHORIZED HOST ACCESS) */}
                  {isHost ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2.5 rounded-2xl bg-purple-950/40 border border-purple-500/30">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-purple-300 shrink-0" />
                          <div className="text-[11px]">
                            <span className="text-white/60 block font-mono">Room Code (Super Admin Authority):</span>
                            <span className="font-mono font-bold text-white text-xs tracking-wider">
                              {room.roomAccessCode}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyCode(room.roomAccessCode, sess.id)}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.16] text-[10px] text-purple-200 flex items-center gap-1 transition-all cursor-pointer"
                        >
                          {copiedCodeSessionId === sess.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Code</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Direct Unlock as Host */}
                        <button
                          type="button"
                          onClick={() => handleHostDirectEntry(sess)}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-950/40 transition-all cursor-pointer"
                        >
                          <Radio className="w-3.5 h-3.5 animate-pulse" />
                          <span>Unlock & Enter as Host</span>
                        </button>

                        {/* Allot Codes on Time Drawer */}
                        <button
                          type="button"
                          onClick={() => setSelectedSessionForAllotment(sess)}
                          className="py-2.5 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.14] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          title="Allot access codes to registered attendees on time"
                        >
                          <Send className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Allot Codes on Time ({dispatches.length})</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* CASE 2: STUDENT & GUEST (ENTER CODE COPIED FROM DASHBOARD) */
                    <div className="space-y-3">
                      <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] text-white/70 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="truncate">
                            {userDispatch
                              ? 'Access code is ready on your Dashboard. Copy it there and paste below to enter.'
                              : 'Access is locked. Enter the code allotted to you on your Dashboard.'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            window.location.hash = '#/home';
                          }}
                          className="text-[10px] text-[var(--primary-accent)] hover:underline shrink-0 font-medium cursor-pointer"
                        >
                          Copy from Dashboard →
                        </button>
                      </div>

                      {/* Code Input & Unlock Action */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <KeyRound className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Paste Allotted Code from Dashboard (e.g. SEMS-ROBOT-8492)"
                            value={enteredCodes[sess.id] || ''}
                            onChange={(e) =>
                              setEnteredCodes((prev) => ({
                                ...prev,
                                [sess.id]: e.target.value.toUpperCase(),
                              }))
                            }
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.16] text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-emerald-400 tracking-wider transition-colors"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={isVerifying}
                          onClick={() => handleUnlockRoom(sess)}
                          className="px-4 py-2.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow shrink-0"
                        >
                          {isVerifying ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5" />
                          )}
                          <span>Unlock</span>
                        </button>
                      </div>

                      {/* Error Banner */}
                      {error && (
                        <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}

                      {/* Context link for session registration */}
                      {!userRegistrant && currentRole !== 'guest' && (
                        <div className="text-[11px] text-white/50 text-right">
                          Not registered?{' '}
                          <button
                            type="button"
                            onClick={() => onNavigateToSessionDetail?.(sess.id)}
                            className="text-[var(--primary-accent)] hover:underline font-medium inline-flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Enroll for this session</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* SUPER ADMIN & ADMIN: CODE ALLOTMENT ON TIME MODAL WITH INTERACTIVE FILTERS */}
      {selectedSessionForAllotment && isHost && (() => {
        const sessionRegs = registrants.filter((r) => r.sessionId === selectedSessionForAllotment.id);
        const sessionDispatches = roomAccessService.getDispatchesForSession(selectedSessionForAllotment.id);

        const paidCount = sessionRegs.filter(
          (r) => !selectedSessionForAllotment.isPaid || r.status === 'approved'
        ).length;
        const pendingCount = sessionRegs.filter((r) => r.status === 'pending').length;
        const codeNeededCount = sessionRegs.filter(
          (r) =>
            !sessionDispatches.some(
              (d) =>
                d.participantEmail.toLowerCase() ===
                  (r.email || r.primaryEmail || '').toLowerCase() && d.status === 'delivered'
            )
        ).length;
        const codeAllottedCount = sessionRegs.filter((r) =>
          sessionDispatches.some(
            (d) =>
              d.participantEmail.toLowerCase() ===
                (r.email || r.primaryEmail || '').toLowerCase() && d.status === 'delivered'
          )
        ).length;

        const filteredSessionRegs = sessionRegs.filter((reg) => {
          const isDelivered = sessionDispatches.some(
            (d) =>
              d.participantEmail.toLowerCase() ===
                (reg.email || reg.primaryEmail || '').toLowerCase() && d.status === 'delivered'
          );
          const isPaid = !selectedSessionForAllotment.isPaid || reg.status === 'approved';

          let matchesFilter = true;
          if (modalFilter === 'paid_approved') {
            matchesFilter = isPaid;
          } else if (modalFilter === 'pending') {
            matchesFilter = reg.status === 'pending';
          } else if (modalFilter === 'code_needed') {
            matchesFilter = !isDelivered;
          } else if (modalFilter === 'code_allotted') {
            matchesFilter = isDelivered;
          } else {
            matchesFilter = true;
          }

          const matchesSearch =
            reg.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
            reg.rollNumber.toLowerCase().includes(modalSearch.toLowerCase()) ||
            (reg.email || reg.primaryEmail || '').toLowerCase().includes(modalSearch.toLowerCase());

          return matchesFilter && matchesSearch;
        });

        return (
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedSessionForAllotment(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          >
            <div className="relative w-full max-w-2xl rounded-3xl border border-white/[0.20] bg-[#031519] p-6 sm:p-8 space-y-5 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-white/[0.10] pb-4 shrink-0">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-mono">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Super Admin Authority Allotment</span>
                  </div>
                  <h3 className="text-lg font-bold font-poppins text-white">
                    Allot Access Codes on Time
                  </h3>
                  <p className="text-xs text-white/60">
                    Room: <strong>{selectedSessionForAllotment.title}</strong> • Active Code:{' '}
                    <span className="font-mono text-emerald-400 font-bold">
                      {roomAccessService.getOrCreateRoomForSession(selectedSessionForAllotment).roomAccessCode}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSessionForAllotment(null)}
                  className="p-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-white/60 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Filtering Controls: All Registered vs Paid Only vs Pending */}
              <div className="space-y-2.5 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">
                    Select Filter:
                  </span>
                  <span className="text-[11px] text-white/50">
                    Showing {filteredSessionRegs.length} of {sessionRegs.length} attendees
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setModalFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      modalFilter === 'all'
                        ? 'bg-[var(--primary-accent)] text-white shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    All Registered ({sessionRegs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalFilter('paid_approved')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      modalFilter === 'paid_approved'
                        ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Paid / Payment Approved Only ({paidCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      modalFilter === 'pending'
                        ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40 shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Payment Pending ({pendingCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalFilter('code_needed')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      modalFilter === 'code_needed'
                        ? 'bg-purple-500/30 text-purple-200 border border-purple-500/40 shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Code Needed ({codeNeededCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalFilter('code_allotted')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      modalFilter === 'code_allotted'
                        ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Code Allotted ({codeAllottedCount})
                  </button>
                </div>

                {/* Search in Modal */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search attendee by name, roll no, or email..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.10] text-xs text-white placeholder-white/40 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Dynamic Batch Allotment Action Box */}
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="text-xs">
                  <span className="font-semibold text-white block">
                    {modalFilter === 'all'
                      ? 'Batch Allotment to All Registered Attendees:'
                      : modalFilter === 'paid_approved'
                      ? 'Batch Allotment to Paid / Approved Attendees:'
                      : modalFilter === 'pending'
                      ? 'Batch Allotment to Pending Payment Attendees:'
                      : modalFilter === 'code_needed'
                      ? 'Batch Allotment to Attendees Waiting for Codes:'
                      : 'Batch Allotment Action:'}
                  </span>
                  <span className="text-white/60 text-[11px]">
                    {modalFilter === 'all'
                      ? 'Dispatch the access code on time to all registered attendees in current view.'
                      : modalFilter === 'paid_approved'
                      ? 'Dispatch the access code to attendees who have completed fee payment.'
                      : 'Dispatch access codes directly to the filtered attendees list.'}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={filteredSessionRegs.length === 0}
                  onClick={() =>
                    handleBatchAllotToFiltered(
                      selectedSessionForAllotment,
                      filteredSessionRegs,
                      modalFilter === 'all' || modalFilter === 'pending'
                    )
                  }
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-semibold text-xs transition-all cursor-pointer shadow flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {modalFilter === 'all'
                      ? `Allot Code to All Registered (${filteredSessionRegs.length})`
                      : modalFilter === 'paid_approved'
                      ? `Allot Code to All Paid (${filteredSessionRegs.length})`
                      : `Allot Code to Filtered (${filteredSessionRegs.length})`}
                  </span>
                </button>
              </div>

              {/* Roster of Filtered Attendees for this Session */}
              <div className="flex-1 overflow-y-auto space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/50 uppercase tracking-wider font-semibold block">
                    Session Registrants Roster
                  </span>
                  {modalFilter !== 'all' && (
                    <span className="text-[10px] text-emerald-300 font-mono">
                      Filtered by: {modalFilter === 'paid_approved' ? 'Paid Only' : modalFilter}
                    </span>
                  )}
                </div>

                {filteredSessionRegs.length === 0 ? (
                  <div className="text-center py-10 text-white/40 text-xs">
                    No attendees match the selected filter. Try switching filter above.
                  </div>
                ) : (
                  filteredSessionRegs.map((reg) => {
                    const isDelivered = sessionDispatches.some(
                      (d) =>
                        d.participantEmail.toLowerCase() ===
                          (reg.email || reg.primaryEmail || '').toLowerCase() && d.status === 'delivered'
                    );

                    const isEligibleForCode = !selectedSessionForAllotment.isPaid || reg.status === 'approved';

                    return (
                      <div
                        key={reg.id}
                        className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-3 hover:bg-white/[0.05] transition-colors"
                      >
                        <div className="truncate">
                          <div className="font-medium text-white truncate flex items-center gap-1.5">
                            <span>{reg.name}</span>
                            <span className="text-[10px] font-mono text-white/40">({reg.rollNumber})</span>
                          </div>
                          <div className="text-[11px] text-white/50 truncate">
                            {reg.email || reg.primaryEmail}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono">
                            <span
                              className={`px-1.5 py-0.5 rounded ${
                                reg.status === 'approved'
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                                  : reg.status === 'rejected'
                                  ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              Payment: {selectedSessionForAllotment.isPaid ? reg.status : 'Free Session'}
                            </span>
                            {isDelivered && (
                              <span className="text-purple-300">
                                • Code: {sessionDispatches.find(d => d.participantEmail.toLowerCase() === (reg.email || reg.primaryEmail || '').toLowerCase())?.accessCodeSent}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5">
                          {isDelivered ? (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium">
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Code Allotted</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAllotCodeToParticipant(selectedSessionForAllotment, reg, true)}
                                className="px-2 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-white/70 hover:text-white text-[10px] font-medium cursor-pointer transition-all"
                                title="Resend code notification"
                              >
                                Resend
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAllotCodeToParticipant(selectedSessionForAllotment, reg, !isEligibleForCode)}
                              className="px-3 py-1.5 rounded-xl font-medium text-[11px] transition-all cursor-pointer flex items-center gap-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow"
                              title={!isEligibleForCode ? 'Allot code with Super Admin override' : 'Allot access code now'}
                            >
                              <Send className="w-3 h-3" />
                              <span>{!isEligibleForCode ? 'Allot Code (Override)' : 'Allot Code Now'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-white/[0.10] flex items-center justify-between shrink-0">
                <span className="text-[11px] text-white/40">
                  Super Admin has authority to allot codes on time to registered or paid students.
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSessionForAllotment(null)}
                  className="px-5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-medium cursor-pointer"
                >
                  Close Manager
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
