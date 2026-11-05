import React from 'react';
import { SessionComment, DashboardRole } from '../../types';

export interface SessionCommentsSectionProps {
  comments?: SessionComment[];
  currentRole: DashboardRole;
  currentUserName?: string;
  onAddComment: (comment: SessionComment) => void;
  onNavigateToAuth: () => void;
  onNotify: (msg: string) => void;
  isLoading?: boolean;
}

export const SessionCommentsSection: React.FC<SessionCommentsSectionProps> = () => null;
