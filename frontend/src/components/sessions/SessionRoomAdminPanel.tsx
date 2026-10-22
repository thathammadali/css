/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  RefreshCw,
  Lock,
  Copy,
  Check,
  Eye,
  EyeOff,
  Send,
  Radio,
  FileCheck,
} from 'lucide-react';
import { SessionItem, DashboardRole, SessionRoom } from '../../types';
import { roomAccessService } from '../../services/roomAccessService';
import { apiFetch } from '../../services/apiClient';
import { ConfirmDialog } from '../ConfirmDialog';

interface SessionRoomAdminPanelProps {
  session: SessionItem;
  currentRole: DashboardRole;
  actorName: string;
  onNotify: (msg: string) => void;
  onUpdateRoom?: () => void;
}

export const SessionRoomAdminPanel: React.FC<SessionRoomAdminPanelProps> = ({
  session,
  currentRole,
  actorName,
  onNotify,
  onUpdateRoom,
}) => {
  const [room, setRoom] = useState<SessionRoom>(() =>
    roomAccessService.getOrCreateRoomForSession(session)
  );
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'regenerate' | 'revoke' | null>(null);

  const dispatches = roomAccessService.getDispatchesForSession(session.id);
  const isAdmin = currentRole === 'super_admin' || currentRole === 'admin';

  if (!isAdmin) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.roomAccessCode);
      setCopied(true);
      onNotify(`Copied Room Code: ${room.roomAccessCode}`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onNotify('Clipboard copy unavailable.');
    }
  };

  const handleRegenerateCode = () => {
    setConfirmAction('regenerate');
  };

  const executeRegenerateCode = async () => {
    setConfirmAction(null);
    setIsProcessing(true);
    try {
      // Call backend API or service
      let res: any;
      try {
        const response = await apiFetch(`/api/sessions/${session.id}/room/regenerate-code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': currentRole,
          },
        });
        if (response.ok) {
          res = await response.json();
        }
      } catch {
        // Fallback
      }

      if (!res || !res.success) {
        res = roomAccessService.regenerateRoomCode(session.id, currentRole, actorName);
      }

      if (res.success && res.room) {
        setRoom(res.room);
        onNotify(res.message);
        onUpdateRoom?.();
      } else {
        onNotify(res.message || 'Failed to regenerate code.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevokeCode = () => {
    setConfirmAction('revoke');
  };

  const executeRevokeCode = async () => {
    setConfirmAction(null);
    setIsProcessing(true);
    try {
      let res: any;
      try {
        const response = await apiFetch(`/api/sessions/${session.id}/room/revoke-code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': currentRole,
          },
        });
        if (response.ok) {
          res = await response.json();
        }
      } catch {
        // Fallback
      }

      if (!res || !res.success) {
        res = roomAccessService.revokeRoomAccess(session.id, currentRole, actorName);
      }

      if (res.success && res.room) {
        setRoom(res.room);
        onNotify(res.message);
        onUpdateRoom?.();
      } else {
        onNotify(res.message || 'Failed to revoke room access.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      id="session-room-admin-governance-panel"
      className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.14] space-y-4 backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.10]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-poppins font-semibold text-sm sm:text-base text-white">
                Session Room Access Governance
              </h4>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                  room.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}
              >
                {room.status}
              </span>
            </div>
            <p className="text-xs text-[var(--text-sec-70)]">
              Room ID: <span className="font-mono text-purple-300">{room.id}</span> • {room.roomName}
            </p>
          </div>
        </div>

        {/* Quick Admin Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRegenerateCode}
            disabled={isProcessing}
            className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.18] text-xs font-inter text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Regenerate a new unique access code and revoke previous code"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>Regenerate Code</span>
          </button>

          {room.status === 'active' && (
            <button
              type="button"
              onClick={handleRevokeCode}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs font-inter transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Lock room and revoke all access"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Revoke / Lock</span>
            </button>
          )}
        </div>
      </div>

      {/* Access Code Box */}
      <div className="p-4 rounded-xl bg-black/40 border border-white/[0.10] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-[var(--text-sec-70)] font-semibold block">
            Authoritative Room Access Code (Confidential)
          </span>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-lg font-mono font-bold tracking-widest text-emerald-300 select-all">
              {showCode ? room.roomAccessCode : '••••••••••••••••'}
            </span>
            <button
              type="button"
              onClick={() => setShowCode(!showCode)}
              className="p-1 rounded-lg text-white/60 hover:text-white transition-colors cursor-pointer"
              title={showCode ? 'Mask code' : 'Reveal code'}
            >
              {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyCode}
          className="px-4 py-2 rounded-xl bg-white/[0.10] hover:bg-white/[0.18] border border-white/[0.20] text-xs font-inter font-medium text-white flex items-center gap-1.5 transition-all cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy Access Code'}</span>
        </button>
      </div>

      {/* Dispatched Access Codes History Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-white/90 flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dispatched Participant Access Codes ({dispatches.length})</span>
          </span>
          <span className="text-[11px] text-white/50">
            Automated system notifications delivered to confirmed attendees
          </span>
        </div>

        {dispatches.length > 0 ? (
          <div>
            {/* Mobile Screens (sm:hidden): Responsive Cards View */}
            <div className="sm:hidden space-y-2.5">
              {dispatches.map((disp) => (
                <div
                  key={disp.id}
                  className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-2 font-inter text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-white truncate">
                        {disp.participantName}
                      </div>
                      <div className="text-[11px] font-mono text-white/70 truncate">
                        {disp.participantEmail}
                      </div>
                    </div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono shrink-0 ${
                        disp.status === 'delivered'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {disp.status}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-black/40 border border-white/[0.06] flex items-center justify-between">
                    <span className="text-[11px] text-white/60">Issued Code:</span>
                    <span className="font-mono text-emerald-300 font-bold tracking-wider">
                      {disp.accessCodeSent}
                    </span>
                  </div>

                  <div className="text-[10px] text-white/50 flex items-center justify-between pt-1 border-t border-white/[0.04]">
                    <span>Sent: {disp.sentAt}</span>
                    <span>By: {disp.sentBy}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop & Tablet Screens (hidden sm:block): Full Tabular Format */}
            <div className="hidden sm:block overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full text-left text-xs font-inter">
                <thead className="bg-white/[0.04] text-[var(--text-sec-70)] border-b border-white/[0.08]">
                  <tr>
                    <th className="py-2 px-3">Participant</th>
                    <th className="py-2 px-3">Email</th>
                    <th className="py-2 px-3">Code Issued</th>
                    <th className="py-2 px-3">Sent At</th>
                    <th className="py-2 px-3">Dispatched By</th>
                    <th className="py-2 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {dispatches.map((disp) => (
                    <tr key={disp.id} className="hover:bg-white/[0.02]">
                      <td className="py-2 px-3 font-medium text-white">{disp.participantName}</td>
                      <td className="py-2 px-3 font-mono text-white/70">{disp.participantEmail}</td>
                      <td className="py-2 px-3 font-mono text-emerald-300 font-bold">{disp.accessCodeSent}</td>
                      <td className="py-2 px-3 text-white/60">{disp.sentAt}</td>
                      <td className="py-2 px-3 text-white/70">{disp.sentBy}</td>
                      <td className="py-2 px-3 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono ${
                            disp.status === 'delivered'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {disp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-white/50 italic p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            No access codes dispatched yet for this session. Use the "Send Room Code" action in Payment Review or participant manager once payment is confirmed.
          </p>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmAction !== null}
        title={
          confirmAction === 'regenerate'
            ? 'Regenerate Room Code'
            : 'Revoke Room Access'
        }
        message={
          confirmAction === 'regenerate'
            ? `Are you sure you want to regenerate the access code for "${room.roomName}"? Existing participant tokens will be revoked.`
            : `Are you sure you want to REVOKE room access for "${room.roomName}"? This will lock the room and deny all entries.`
        }
        confirmText={
          confirmAction === 'regenerate' ? 'Regenerate Code' : 'Revoke Access'
        }
        variant={confirmAction === 'regenerate' ? 'warning' : 'danger'}
        isProcessing={isProcessing}
        onConfirm={
          confirmAction === 'regenerate' ? executeRegenerateCode : executeRevokeCode
        }
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
};
