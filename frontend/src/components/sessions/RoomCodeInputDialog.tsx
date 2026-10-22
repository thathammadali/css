/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  KeyRound,
  X,
  AlertCircle,
  ShieldCheck,
  Lock,
  Info,
} from 'lucide-react';
import { SessionItem, RegistrantItem, RoomAccessValidationResponse } from '../../types';
import { roomAccessService } from '../../services/roomAccessService';
import { apiFetch } from '../../services/apiClient';
import { useModalDismiss } from '../../hooks/useModalDismiss';

interface RoomCodeInputDialogProps {
  session: SessionItem;
  currentUserEmail: string;
  registrant?: RegistrantItem;
  isOpen: boolean;
  onClose: () => void;
  onAuthorized: (data: { sessionToken: string; room: NonNullable<RoomAccessValidationResponse['room']> }) => void;
  onNotify: (msg: string) => void;
}

export const RoomCodeInputDialog: React.FC<RoomCodeInputDialogProps> = ({
  session,
  currentUserEmail,
  registrant,
  isOpen,
  onClose,
  onAuthorized,
  onNotify,
}) => {
  const [accessCode, setAccessCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { handleBackdropClick } = useModalDismiss({
    isOpen,
    onClose,
  });

  if (!isOpen) return null;

  // Retrieve sanitized room info (does not expose code)
  const room = roomAccessService.getOrCreateRoomForSession(session);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      setErrorMessage('Please enter the Room Access Code.');
      return;
    }

    setErrorMessage(null);
    setIsVerifying(true);

    try {
      // 1. Try real backend API call first
      let result: RoomAccessValidationResponse;

      try {
        const response = await apiFetch('/api/rooms/validate-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.id,
            participantEmail: currentUserEmail,
            accessCode: accessCode.trim(),
            paymentStatus: registrant?.status || 'approved',
            isPaidSession: !!session.isPaid,
            isRegistered: !!registrant,
          }),
        });

        if (response.ok) {
          result = await response.json();
        } else {
          const errData = await response.json().catch(() => ({}));
          result = {
            success: false,
            error: errData.error || `Server returned error (${response.status})`,
            errorCode: errData.errorCode || 'UNAUTHORIZED',
          };
        }
      } catch {
        // Fallback to backend-authoritative service instance if fetch fails in offline sandbox
        result = roomAccessService.validateRoomAccess(
          {
            sessionId: session.id,
            participantEmail: currentUserEmail,
            accessCode: accessCode.trim(),
          },
          registrant,
          session
        );
      }

      if (result.success && result.sessionToken && result.room) {
        onNotify(`Access granted to ${result.room.roomName}!`);
        onAuthorized({
          sessionToken: result.sessionToken,
          room: result.room,
        });
        onClose();
      } else {
        setErrorMessage(
          result.error ||
            'Access Denied: Invalid access code or registration conditions not met.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during validation.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setAccessCode(text.trim().toUpperCase());
      }
    } catch {
      // Clipboard read fallback
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="room-code-dialog-title"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
    >
      <div
        className="relative w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#111C2D] shadow-2xl p-6 sm:p-8"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-[#64748B] dark:text-[#A8B5C7] hover:text-[#172B3A] dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-[#0F766E] dark:text-[#2DD4BF]">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3
              id="room-code-dialog-title"
              className="text-lg font-poppins font-semibold text-[#172B3A] dark:text-[#F1F5F9] tracking-tight"
            >
              Enter Session Room
            </h3>
            <span className="text-xs font-mono text-[#0F766E] dark:text-[#2DD4BF] block font-medium">
              Room ID: {room.id}
            </span>
          </div>
        </div>

        {/* Room & Session Context Card */}
        <div className="mb-5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
          <div className="text-xs text-[#64748B] dark:text-[#A8B5C7] uppercase tracking-wider font-semibold">
            Target Session Room
          </div>
          <div className="text-sm font-semibold text-[#172B3A] dark:text-[#F1F5F9] line-clamp-1">
            {room.roomName}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#64748B] dark:text-[#A8B5C7]">
            <span className="truncate max-w-[240px]">{session.title}</span>
            <span>•</span>
            <span className="text-teal-700 dark:text-teal-400 font-medium">
              {session.isPaid ? `Rs. ${session.amount} (Paid)` : 'Free Session'}
            </span>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-semibold">Validation Denied</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Verification Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="input-room-access-code"
                className="block text-xs font-medium text-[#172B3A] dark:text-[#F1F5F9]"
              >
                Room Access Code
              </label>
              <button
                type="button"
                onClick={handlePasteCode}
                className="text-[11px] text-[#0F766E] dark:text-[#2DD4BF] hover:underline transition-colors cursor-pointer font-medium"
              >
                Paste Code
              </button>
            </div>
            <div className="relative">
              <input
                id="input-room-access-code"
                type="text"
                autoFocus
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value.toUpperCase());
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="e.g. SEMS-ROBOT-8492"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 focus:border-[#0F766E] dark:focus:border-[#2DD4BF] focus:outline-none text-[#172B3A] dark:text-[#F1F5F9] placeholder-slate-400 dark:placeholder-slate-500 text-base font-mono font-bold tracking-widest uppercase transition-all shadow-inner"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#64748B] dark:text-[#A8B5C7]">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            {errorMessage && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-inter flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </p>
            )}
            <p className="text-[11px] text-[#64748B] dark:text-[#A8B5C7] flex items-center gap-1.5 pt-1">
              <Info className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>
                Enter the unique code sent to your notifications or email after payment verification.
              </span>
            </p>
          </div>

          {/* Validation Checklist / Help */}
          <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/50 text-[11px] text-[#172B3A] dark:text-[#A8B5C7] space-y-1">
            <div className="font-semibold text-[#0F766E] dark:text-[#2DD4BF]">Validation Requirements:</div>
            <ul className="list-disc list-inside space-y-0.5 text-[#64748B] dark:text-[#A8B5C7]">
              <li>Must be registered as a confirmed participant.</li>
              {session.isPaid && <li>Payment status must be marked "Approved".</li>}
              <li>Access code must match the session room and be active.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-inter text-[#172B3A] dark:text-[#F1F5F9] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying || !accessCode.trim()}
              className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] active:scale-95 disabled:opacity-50 text-xs font-inter font-medium text-white transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Validating...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify & Enter Room</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
