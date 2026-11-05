import React from 'react';
import { ExternalLink, Video } from 'lucide-react';
import { MeetingLink } from '../types';

type LinkSource = {
  meeting_links?: MeetingLink[];
  meeting_link?: string | null;
  meetingUrl?: string;
};

const PLATFORM_NAME: Record<MeetingLink['platform'], string> = {
  zoom: 'Zoom',
  meet: 'Google Meet',
  youtube: 'YouTube',
  teams: 'Microsoft Teams',
  other: 'meeting',
};

/** All links for a session; falls back to the single legacy link. Only http(s) URLs are shown. */
export function getSessionLinks(session: LinkSource): MeetingLink[] {
  let links: MeetingLink[] = [];
  if (session.meeting_links && session.meeting_links.length > 0) {
    links = session.meeting_links;
  } else {
    const single = session.meeting_link || session.meetingUrl;
    if (single) links = [{ platform: 'other', url: single, public: false }];
  }
  return links.filter((link) => /^https?:\/\//i.test(link.url));
}

export default function MeetingLinks({
  session,
  compact = false,
  className = '',
}: {
  session: LinkSource;
  /** compact: first link only plus a "+N" count (for cards). Default shows every link. */
  compact?: boolean;
  className?: string;
}) {
  const links = getSessionLinks(session);
  if (links.length === 0) return null;
  const shown = compact ? links.slice(0, 1) : links;
  const extra = links.length - shown.length;
  const pad = compact ? 'px-2 py-0.5' : 'px-2.5 py-1';

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {shown.map((link, index) => {
        const label = link.label?.trim() || `Join ${PLATFORM_NAME[link.platform]}`;
        return (
          <a
            key={`${link.url}-${index}`}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className={`inline-flex items-center gap-1 ${pad} rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-white text-[11px] font-medium transition-all`}
            title={`Open ${label}`}
          >
            <Video className="w-3 h-3 text-emerald-400" />
            <span>{label}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
          </a>
        );
      })}
      {extra > 0 && (
        <span
          className="text-[10px] font-medium text-emerald-300/80"
          title={`${extra} more link(s) on the session page`}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
