/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`glass-card p-8 sm:p-12 rounded-2xl border border-[var(--panel-border)] text-center space-y-4 max-w-md mx-auto my-4 animate-fadeIn ${className}`}
      role="status"
    >
      <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--accent-15)] border border-[var(--accent-30)] flex items-center justify-center text-[var(--primary-accent)] shadow-xs">
        <Icon className="w-7 h-7" aria-hidden="true" />
      </div>

      <div className="space-y-1.5">
        <h3 className="font-poppins font-medium text-base sm:text-lg text-[var(--text-primary)]">
          {title}
        </h3>
        <p className="font-inter text-xs sm:text-[13px] text-[var(--text-secondary)] leading-relaxed">
          {description}
        </p>
      </div>

      {(actionLabel || secondaryActionLabel) && (
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-[var(--primary-accent)] hover:brightness-105 active:scale-[0.98] text-white font-inter font-medium text-xs sm:text-sm transition-all cursor-pointer shadow-xs inline-flex items-center gap-2"
            >
              {ActionIcon && <ActionIcon className="w-4 h-4" />}
              <span>{actionLabel}</span>
            </button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="px-4 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-[var(--panel-bg)] hover:bg-[var(--accent-10)] active:scale-[0.98] text-[var(--text-primary)] font-inter font-medium text-xs sm:text-sm border border-[var(--panel-border)] transition-colors cursor-pointer"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
