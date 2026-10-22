/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface SkeletonStateProps {
  variant?: 'cards' | 'table' | 'list';
  count?: number;
  className?: string;
}

export const SkeletonState: React.FC<SkeletonStateProps> = ({
  variant = 'cards',
  count = 3,
  className = '',
}) => {
  if (variant === 'table') {
    return (
      <div className={`w-full glass-panel rounded-2xl p-5 space-y-4 animate-pulse border border-white/[0.08] ${className}`} aria-busy="true">
        {/* Table header skeleton */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="h-4 w-32 bg-white/[0.12] rounded-lg" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 bg-white/[0.08] rounded-xl" />
            <div className="h-8 w-28 bg-white/[0.08] rounded-xl" />
          </div>
        </div>

        {/* Table row skeletons */}
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-white/[0.10] shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="h-4 w-2/5 bg-white/[0.12] rounded" />
                  <div className="h-3 w-1/3 bg-white/[0.06] rounded" />
                </div>
              </div>
              <div className="hidden sm:block h-3.5 w-24 bg-white/[0.08] rounded" />
              <div className="h-6 w-16 bg-white/[0.10] rounded-full" />
              <div className="h-7 w-20 bg-white/[0.08] rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={`w-full space-y-3 animate-pulse ${className}`} aria-busy="true">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-1">
                <div className="w-8 h-8 rounded-lg bg-white/[0.10] shrink-0" />
                <div className="space-y-1 flex-1">
                  <div className="h-4 w-1/2 bg-white/[0.12] rounded" />
                  <div className="h-3 w-1/3 bg-white/[0.06] rounded" />
                </div>
              </div>
              <div className="h-5 w-16 bg-white/[0.10] rounded-full" />
            </div>
            <div className="h-3 w-3/4 bg-white/[0.06] rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Cards variant (matches DashboardSkeleton grid)
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 animate-pulse ${className}`} aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4 border border-white/[0.08]"
        >
          <div className="flex items-center justify-between">
            <div className="h-3.5 w-24 bg-white/[0.10] rounded" />
            <div className="h-5 w-16 bg-white/[0.12] rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="h-5 w-4/5 bg-white/[0.15] rounded" />
            <div className="h-3.5 w-3/5 bg-white/[0.08] rounded" />
            <div className="h-3.5 w-2/5 bg-white/[0.08] rounded" />
          </div>
          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <div className="h-3.5 w-24 bg-white/[0.08] rounded" />
            <div className="h-4 w-12 bg-white/[0.12] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};
