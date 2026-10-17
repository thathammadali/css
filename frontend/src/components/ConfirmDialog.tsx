/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { useModalDismiss } from '../hooks/useModalDismiss';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isProcessing = false,
  onConfirm,
  onCancel,
}) => {
  const { handleBackdropClick } = useModalDismiss({
    isOpen,
    onClose: onCancel,
  });

  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-[var(--panel-border)] overflow-hidden glass-card shadow-2xl p-6 sm:p-7"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="absolute top-5 right-5 p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-10)] transition-colors cursor-pointer disabled:opacity-50"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Icon */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
              isDanger
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                : isWarning
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-[var(--accent-15)] border-[var(--accent-30)] text-[var(--primary-accent)]'
            }`}
          >
            {isDanger ? (
              <AlertTriangle className="w-6 h-6" />
            ) : isWarning ? (
              <ShieldAlert className="w-6 h-6" />
            ) : (
              <AlertCircle className="w-6 h-6" />
            )}
          </div>
          <div className="pr-6">
            <h3
              id="confirm-dialog-title"
              className="text-lg font-poppins font-semibold text-[var(--text-primary)] tracking-tight"
            >
              {title}
            </h3>
            <p
              id="confirm-dialog-desc"
              className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed"
            >
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[var(--panel-border)]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl bg-[var(--panel-bg)] hover:bg-[var(--accent-10)] border border-[var(--panel-border)] text-xs font-inter text-[var(--text-primary)] transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`px-5 py-2.5 rounded-xl text-xs font-inter font-semibold text-white tracking-wide transition-all shadow-sm cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-500'
                : isWarning
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-[var(--primary-accent)] hover:brightness-105'
            }`}
          >
            {isProcessing && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
