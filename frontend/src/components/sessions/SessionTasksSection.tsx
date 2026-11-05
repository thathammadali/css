import React from 'react';
import { SessionTask, DashboardRole } from '../../types';

export interface SessionTasksSectionProps {
  tasks?: SessionTask[];
  currentRole: DashboardRole;
  onAddTask?: (newTask: SessionTask) => void;
  onNotify: (msg: string) => void;
  isLoading?: boolean;
}

export const SessionTasksSection: React.FC<SessionTasksSectionProps> = () => null;
