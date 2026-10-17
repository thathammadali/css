/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Megaphone,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { SessionComment, DashboardRole } from '../../types';
import { EmptyState } from '../EmptyState';
import { SkeletonState } from '../SkeletonState';

interface SessionCommentsSectionProps {
  comments?: SessionComment[];
  currentRole: DashboardRole;
  currentUserName?: string;
  onAddComment: (comment: SessionComment) => void;
  onNavigateToAuth: () => void;
  onNotify: (msg: string) => void;
  isLoading?: boolean;
}

const DEFAULT_INITIAL_COMMENTS: SessionComment[] = [
  {
    id: 'comm-seed-1',
    authorName: 'Alex Morgan',
    authorRole: 'admin',
    avatarInitials: 'AM',
    content:
      'Welcome everyone! Please make sure to download the prerequisite slides and software environments beforehand. Let us know if you run into any setup questions.',
    timestamp: 'Yesterday at 4:30 PM',
    isAnnouncement: true,
  },
  {
    id: 'comm-seed-2',
    authorName: 'Jordan Lee',
    authorRole: 'student',
    avatarInitials: 'JL',
    content:
      'Looking forward to the keynote! Will hardware kits be distributed at the entrance or inside the lab?',
    timestamp: '2 hours ago',
    isAnnouncement: false,
  },
];

export const SessionCommentsSection: React.FC<SessionCommentsSectionProps> = ({
  comments,
  currentRole,
  currentUserName,
  onAddComment,
  onNavigateToAuth,
  onNotify,
  isLoading = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [isAnnouncementToggle, setIsAnnouncementToggle] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [commentSuccess, setCommentSuccess] = useState('');

  const isGuest = currentRole === 'guest';
  const isSuperAdminOrAdmin = currentRole === 'super_admin' || currentRole === 'admin';

  // Use provided comments or fall back to default seed when not provided
  const displayComments = comments !== undefined ? comments : DEFAULT_INITIAL_COMMENTS;

  const getAuthorInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getAuthorRoleLabel = (role: DashboardRole): string => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'student':
        return 'Student';
      default:
        return 'Guest';
    }
  };

  const handlePostSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) {
      setCommentError('Comment cannot be empty.');
      return;
    }
    setCommentError('');

    const author =
      currentUserName ||
      (currentRole === 'super_admin'
        ? 'Prof. Dean Taylor'
        : currentRole === 'admin'
        ? 'Alex Morgan'
        : 'Jordan Lee');

    const newComment: SessionComment = {
      id: `comment-${Date.now()}`,
      authorName: author,
      authorRole: currentRole,
      avatarInitials: getAuthorInitials(author),
      content: inputText.trim(),
      timestamp: 'Just now',
      isAnnouncement: isSuperAdminOrAdmin && isAnnouncementToggle,
    };

    onAddComment(newComment);
    setInputText('');
    setIsAnnouncementToggle(false);
    setCommentSuccess('Comment posted successfully!');
    onNotify('Comment posted to discussion.');
    setTimeout(() => {
      setCommentSuccess('');
    }, 2500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePostSubmit();
    }
  };

  return (
    <div
      id="session-comments-card"
      className="p-5 sm:p-6 rounded-2xl bg-white/[0.08] border border-white/[0.16] backdrop-blur-md space-y-4 shadow-xl flex flex-col"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[var(--primary-accent)]" />
          <h4 className="font-poppins font-medium text-[16px] text-white">
            Announcements & Discussion
          </h4>
        </div>
        <span className="text-[11px] font-inter text-[var(--text-sec-70)] bg-white/[0.06] border border-white/[0.10] px-2 py-0.5 rounded-full">
          {displayComments.length}
        </span>
      </div>

      {/* Vertical list of comment bubbles (scrollable if many) */}
      {isLoading ? (
        <SkeletonState variant="list" count={3} />
      ) : displayComments.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No comments yet"
          description="Start the discussion, post an update, or ask a question for this session."
          actionLabel="Write first comment"
          onAction={() => {
            const input = document.getElementById('input-comment-text');
            input?.focus();
          }}
        />
      ) : (
        <div
          id="comments-feed-list"
          className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1 select-text scrollbar-thin"
        >
          {displayComments.map((item) => {
            const isPrivileged = item.authorRole === 'super_admin' || item.authorRole === 'admin';

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border transition-colors ${
                  item.isAnnouncement
                    ? 'bg-[var(--accent-15)] border-[var(--accent-40)] shadow-sm'
                    : 'bg-white/[0.04] hover:bg-white/[0.06] border-white/[0.08]'
                }`}
              >
                {/* Header row: Avatar + Name + Badges + Timestamp */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-inter font-medium shrink-0 border ${
                        isPrivileged
                          ? 'bg-[var(--primary-accent)] text-white border-white/20'
                          : 'bg-white/[0.15] text-[var(--text-secondary)] border-white/10'
                      }`}
                    >
                      {item.avatarInitials}
                    </div>

                    <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-inter font-medium text-white truncate">
                        {item.authorName}
                      </span>
                      {item.isAnnouncement && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-inter font-medium bg-[var(--accent-30)] text-teal-200 border border-[var(--accent-40)]">
                          <Megaphone className="w-2.5 h-2.5" />
                          Announcement
                        </span>
                      )}
                      {isPrivileged && !item.isAnnouncement && (
                        <span className="text-[10px] font-inter px-1.5 py-0.2 rounded bg-white/[0.08] text-[var(--text-secondary)]">
                          {getAuthorRoleLabel(item.authorRole)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timestamp in muted secondary tone */}
                  <span className="text-[11px] font-inter text-[var(--text-sec-70)] shrink-0">
                    {item.timestamp}
                  </span>
                </div>

                {/* Comment text */}
                <p className="font-inter text-xs sm:text-[13px] text-white/90 leading-relaxed pl-9 whitespace-pre-wrap">
                  {item.content}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Fixed bottom row: Input + Post */}
      <div className="pt-2 border-t border-white/[0.10] mt-auto">
        {commentSuccess && (
          <div className="mb-2 p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{commentSuccess}</span>
          </div>
        )}

        <form onSubmit={handlePostSubmit} className="space-y-2">
          {isSuperAdminOrAdmin && (
            <div className="flex items-center justify-between text-[11px] font-inter text-[var(--text-sec-80)] px-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnnouncementToggle}
                  onChange={(e) => setIsAnnouncementToggle(e.target.checked)}
                  className="rounded border-white/20 text-[var(--primary-accent)] focus:ring-0 cursor-pointer"
                />
                <span>Mark as official announcement</span>
              </label>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <input
                id="input-comment-text"
                type="text"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (commentError) setCommentError('');
                }}
                onKeyDown={handleKeyDown}
                placeholder="Write a comment or question..."
                className={`flex-1 h-10 px-3.5 rounded-xl bg-white/[0.06] border text-xs text-white placeholder-white/40 focus:outline-none transition-all ${
                  commentError ? 'border-rose-500 focus:border-rose-400' : 'border-white/[0.14] focus:border-[var(--primary-accent)]'
                }`}
              />
              <button
                id="btn-post-comment"
                type="submit"
                disabled={!inputText.trim()}
                className="h-10 px-4 rounded-xl bg-[var(--primary-accent)] hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-inter font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shrink-0"
              >
                <span>Post</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            {commentError && (
              <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{commentError}</span>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
