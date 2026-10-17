import React from 'react';

export interface SemsLogoProps {
  className?: string;
  compact?: boolean;
}

export const SemsLogo: React.FC<SemsLogoProps> = ({ className = '', compact = false }) => {
  return (
    <div
      id="sems-brand-header"
      className={`flex items-center gap-2 select-none ${className}`}
    >
      {/* Minimal modern society/community connection logo glyph with rich accent styling */}
      <div
        className="relative flex items-center justify-center w-8 h-8 rounded-xl border shrink-0 shadow-sm transition-transform hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, var(--primary-accent) 0%, rgba(var(--primary-accent-rgb), 0.7) 100%)',
          borderColor: 'rgba(255, 255, 255, 0.25)',
        }}
      >
        <svg
          className="w-4 h-4 text-white drop-shadow-xs"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Interlocking community nodes representing society, events & connection */}
          <circle cx="12" cy="7" r="3" />
          <circle cx="6" cy="17" r="2.5" />
          <circle cx="18" cy="17" r="2.5" />
          <path d="M8.5 15.5L10.5 9.5" />
          <path d="M15.5 15.5L13.5 9.5" />
          <path d="M8.5 17h7" />
        </svg>
      </div>

      {/* SEMS Wordmark - theme-aware contrast */}
      <div className="flex flex-col leading-none">
        <span
          className="font-poppins font-bold text-[17px] tracking-tight whitespace-nowrap"
          style={{ color: 'var(--text-primary)' }}
        >
          SEMS
        </span>
        {!compact && (
          <span
            className="font-inter text-[9.5px] uppercase tracking-wider font-semibold mt-0.5"
            style={{ color: 'var(--primary-accent)' }}
          >
            Session Management
          </span>
        )}
      </div>
    </div>
  );
};
