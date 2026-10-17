/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, Home, Calendar } from 'lucide-react';
import { DashboardRole } from '../types';

export interface AccessDeniedPageProps {
  currentRole: DashboardRole;
  requiredRole?: string;
  onNavigateHome: () => void;
  onNavigateSessions: () => void;
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({
  currentRole,
  requiredRole = 'Administrator',
  onNavigateHome,
  onNavigateSessions,
}) => {
  const roleDisplay = currentRole
    ? currentRole.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Guest';

  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center p-4 animate-fadeIn">
      <div className="glass-panel max-w-md w-full p-8 rounded-2xl text-center space-y-5 border border-white/[0.16] shadow-2xl backdrop-blur-xl">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="font-poppins font-semibold text-2xl text-white">
            You don’t have access
          </h2>
          <p className="font-inter text-xs text-[var(--text-sec-80)] leading-relaxed">
            This area requires {requiredRole} privileges. You are currently signed in as{' '}
            <span className="font-semibold text-white">{roleDisplay}</span>.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onNavigateHome}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 active:scale-95 text-white font-inter text-xs font-medium transition-all shadow-lg cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </button>
          <button
            type="button"
            onClick={onNavigateSessions}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] active:scale-95 border border-white/[0.16] text-white font-inter text-xs font-medium transition-all cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Browse Sessions</span>
          </button>
        </div>
      </div>
    </div>
  );
};
