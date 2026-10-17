/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Server,
  Copy,
  Check,
  ExternalLink,
  Wifi,
  WifiOff,
  RefreshCw,
  X,
  ShieldCheck,
  KeyRound,
  FileCode,
  AlertCircle,
} from 'lucide-react';
import {
  getPreviewOrigin,
  getApiBaseUrl,
  setApiBaseUrl,
  authApi,
} from '../services/apiClient';

interface BackendConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify?: (msg: string) => void;
}

export const BackendConnectionModal: React.FC<BackendConnectionModalProps> = ({
  isOpen,
  onClose,
  onNotify,
}) => {
  const [origin, setOrigin] = useState('');
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const [tunnelUrl, setTunnelUrlInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    if (isOpen) {
      setOrigin(getPreviewOrigin());
      setTunnelUrlInput(getApiBaseUrl());
      setStatusMessage(null);
      setIsConnected(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyOrigin = async () => {
    try {
      await navigator.clipboard.writeText(origin);
      setCopiedOrigin(true);
      onNotify?.('Copied preview origin to clipboard!');
      setTimeout(() => setCopiedOrigin(false), 2000);
    } catch {
      onNotify?.('Clipboard copy unavailable.');
    }
  };

  const handleSaveTunnelUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setApiBaseUrl(tunnelUrl);
    onNotify?.('Tunnel URL updated successfully.');
    handleTestConnection();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setStatusMessage('Pinging backend endpoint...');
    try {
      const res = await authApi.checkHealth();
      setIsConnected(res.ok);
      setStatusMessage(res.statusText);
      if (res.ok) {
        onNotify?.('Backend connection verified!');
      }
    } catch (err: any) {
      setIsConnected(false);
      setStatusMessage(`Error: ${err?.message || 'Connection failed'}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="backend-tunnel-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-[#10192A] border border-slate-200 dark:border-[#1E2E48] shadow-2xl p-6 sm:p-7 space-y-5 text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1E2E48]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 id="backend-tunnel-modal-title" className="font-poppins font-semibold text-base sm:text-lg">
                Backend Tunnel & CORS Configuration
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connect your cloud preview to your local/cloud backend tunnel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Exact Preview Origin (Send to Backend Engineer) */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070B14] border border-slate-200 dark:border-[#1E2E48] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <span>1. Your Preview Origin (Send for CORS)</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
              Scheme + Host Only
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={origin || 'Determining origin...'}
              className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-[#10192A] border border-slate-300 dark:border-[#1E2E48] font-mono text-xs select-all text-slate-800 dark:text-slate-200 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyOrigin}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all shrink-0 shadow-sm"
            >
              {copiedOrigin ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedOrigin ? 'Copied!' : 'Copy Origin'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
            Copy and send this exact URL to your backend developer to whitelist in FastAPI / Express CORS middleware.
          </p>
        </div>

        {/* Section 2: Public Tunnel URL Input */}
        <form onSubmit={handleSaveTunnelUrl} className="p-4 rounded-xl bg-slate-50 dark:bg-[#070B14] border border-slate-200 dark:border-[#1E2E48] space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="tunnel-url-input" className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              2. Public Tunnel URL (VITE_API_BASE_URL)
            </label>
            {isConnected !== null && (
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                  isConnected
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-500/30'
                }`}
              >
                {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                <span>{isConnected ? 'ONLINE' : 'UNREACHABLE'}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="tunnel-url-input"
              type="url"
              placeholder="e.g. https://xxxx.ngrok-free.app or https://api.yourdomain.com"
              value={tunnelUrl}
              onChange={(e) => setTunnelUrlInput(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-[#10192A] border border-slate-300 dark:border-[#1E2E48] text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium cursor-pointer transition-all shrink-0"
            >
              Save URL
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !tunnelUrl}
              className="px-3 py-2 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-40 shrink-0"
              title="Test Tunnel Health"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>Test</span>
            </button>
          </div>

          {statusMessage && (
            <p className={`text-[11px] font-mono ${isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {statusMessage}
            </p>
          )}
        </form>

        {/* Section 3: Technical Protocol Verification */}
        <div className="p-3.5 rounded-xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800/40 text-xs space-y-1.5">
          <div className="font-semibold text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Configured Protocols & Specifications</span>
          </div>
          <ul className="space-y-1 text-slate-600 dark:text-slate-300 text-[11px] list-disc pl-4">
            <li>
              <strong>Ngrok Header:</strong> <code className="font-mono text-cyan-700 dark:text-cyan-300">ngrok-skip-browser-warning: true</code> is automatically attached to every fetch call.
            </li>
            <li>
              <strong>Login Flow:</strong> Form-urlencoded (<code className="font-mono text-cyan-700 dark:text-cyan-300">username = email, password</code>), parses <code className="font-mono text-cyan-700 dark:text-cyan-300">{`{ access_token, token_type }`}</code>, followed by <code className="font-mono text-cyan-700 dark:text-cyan-300">GET /auth/me</code> with Bearer token.
            </li>
            <li>
              <strong>Signup:</strong> JSON payload sent to backend registration endpoint.
            </li>
            <li>
              <strong>Offline Resilience:</strong> If tunnel is inactive, automatically falls back to local prototype accounts so development is never blocked.
            </li>
          </ul>
        </div>

        {/* Modal Action Footer */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-medium text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
