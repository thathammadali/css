import React from 'react';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div id="dashboard-skeleton-loader" className="w-full space-y-6 animate-pulse" aria-busy="true">
      {/* Greeting Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-56 sm:w-72 bg-white/[0.12] rounded-xl" />
        <div className="h-4 w-72 sm:w-96 bg-white/[0.06] rounded-lg" />
      </div>

      {/* Stat Cards Skeleton (2 on mobile, 4 on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="glass-panel p-4 sm:p-5 rounded-2xl space-y-3"
          >
            <div className="h-3.5 w-20 bg-white/[0.10] rounded" />
            <div className="h-8 w-14 bg-white/[0.15] rounded-lg" />
            <div className="h-3 w-28 bg-white/[0.06] rounded" />
          </div>
        ))}
      </div>

      {/* Section Header Skeleton */}
      <div className="flex items-center justify-between pt-2">
        <div className="h-5 w-40 bg-white/[0.12] rounded-lg" />
        <div className="h-4 w-20 bg-white/[0.06] rounded" />
      </div>

      {/* Sessions Grid Skeleton (1 col mobile, 2-3 col desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass-panel p-5 rounded-2xl space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-white/[0.10] rounded" />
              <div className="h-5 w-16 bg-white/[0.12] rounded-full" />
            </div>
            <div className="h-5 w-4/5 bg-white/[0.15] rounded" />
            <div className="h-3.5 w-3/5 bg-white/[0.08] rounded" />
            <div className="h-3.5 w-2/5 bg-white/[0.08] rounded" />
            <div className="pt-3 border-t border-white/[0.06] flex justify-between">
              <div className="h-3 w-24 bg-white/[0.08] rounded" />
              <div className="h-3 w-10 bg-white/[0.12] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
